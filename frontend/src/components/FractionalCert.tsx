import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { getFractionalInfo, fractionalizeCertificate} from "../BlockchainServices/Hooks";
import { contractAddressFractionalCertificateToken } from "../BlockchainServices/core";

interface FractionInfo {
  nftAddress: string;
  tokenId: bigint;
  totalFractions: bigint;
  owner: string;
}

interface FractionalizationFormData {
  certificateContractAddress: string;
  certificateTokenId: string;
  tokenName: string;
  tokenSymbol: string;
  totalFractions: string;
}

const FractionalCert = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [fractionInfo, setFractionInfo] = useState<FractionInfo | null>(null);
  const [error, setError] = useState("");
  const [txStatus, setTxStatus] = useState("");
  const [isFractionalized, setIsFractionalized] = useState<boolean | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [formData, setFormData] = useState<FractionalizationFormData>({
    certificateContractAddress: "",
    certificateTokenId: "",
    tokenName: "",
    tokenSymbol: "",
    totalFractions: "100"
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Check if the user is the owner of the contract
  const isOwner = fractionInfo && address && fractionInfo.owner.toLowerCase() === address.toLowerCase();

  // Fetch fraction info and check NFT approval status
  const fetchFractionInfo = useCallback(async () => {
    if (!publicClient || !address) {
      setError("Public client not available or wallet not connected");
      return;
    }

    setIsLoading(true);
    setError("");
    setTxStatus("Fetching certificate information...");
    setActionInProgress("fetch");
    
    try {
      // Use the getFractionalInfo hook
      const info = await getFractionalInfo() as unknown as Record<string, unknown>;
      
      // Extract the relevant info from the response
      const nftInfo = {
        nftAddress: info.nftAddress as string,
        tokenId: BigInt(info.tokenId as string),
        totalFractions: BigInt(info.totalFractions as string),
        owner: info.owner as string
      };
      
      setFractionInfo(nftInfo);
      setIsFractionalized(!!info.isActive);

      // Check approval status if user is owner and not yet fractionalized
      if (nftInfo.owner.toLowerCase() === address.toLowerCase() && !info.isActive) {
        try {
          const approved = await publicClient.readContract({
            address: nftInfo.nftAddress as `0x${string}`,
            abi: [
              {
                inputs: [
                  { name: "owner", type: "address" },
                  { name: "operator", type: "address" }
                ],
                name: "isApprovedForAll",
                outputs: [{ name: "", type: "bool" }],
                stateMutability: "view",
                type: "function"
              }
            ],
            functionName: "isApprovedForAll",
            args: [address, contractAddressFractionalCertificateToken]
          }) as boolean;
          setIsApproved(approved);
        } catch (approvalErr) {
          console.error("Error checking approval status:", approvalErr);
          setIsApproved(false);
        }
      }

      setTxStatus("");
    } catch (err: unknown) {
      setError("Failed to fetch fraction info: " + (err instanceof Error ? err.message : String(err)));
      console.error(err);
    } finally {
      setIsLoading(false);
      setActionInProgress(null);
    }
  }, [publicClient, address]);

  // Function to approve the NFT contract to transfer tokens
  const approveNFT = async () => {
    if (!walletClient || !address || !fractionInfo) {
      setError("Wallet not connected or fraction info not available");
      return;
    }

    setTxStatus("Approving NFT transfer...");
    setIsLoading(true);
    setActionInProgress("approve");
    setError("");

    try {
      if (!publicClient) {
        setError("Public client not available");
        return;
      }
      
      const { request } = await publicClient.simulateContract({
        address: fractionInfo.nftAddress as `0x${string}`,
        abi: [
          {
            inputs: [
              { name: "operator", type: "address" },
              { name: "approved", type: "bool" }
            ],
            name: "setApprovalForAll",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "setApprovalForAll",
        args: [contractAddressFractionalCertificateToken, true],
        account: address,
      });
      
      const txHash = await walletClient.writeContract(request);
      setTxStatus(`Approval transaction sent: ${txHash}. Waiting for confirmation...`);
      
      // Wait for transaction confirmation
      if (!publicClient) {
        setError("Public client not available");
        return;
      }
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      if (receipt.status === 'success') {
        setTxStatus("Approval confirmed! You can now fractionalize the certificate.");
        setIsApproved(true);
      } else {
        setTxStatus("Approval transaction failed. Please try again.");
      }
      
    } catch (err: unknown) {
      setTxStatus("");
      setError(`Error during approval: ${err instanceof Error ? err.message : String(err)}`);
      console.error(err);
    } finally {
      setIsLoading(false);
      setActionInProgress(null);
    }
  };

  // Function to fractionalize the certificate
  const fractionalize = async () => {
    if (!walletClient || !address || !fractionInfo) {
      setError("Wallet not connected or fraction info not available");
      return;
    }

    // Safety checks
    if (!isOwner) {
      setError("Only the contract owner can fractionalize this certificate");
      return;
    }

    if (isFractionalized) {
      setError("Certificate is already fractionalized");
      return;
    }

    if (!isApproved) {
      setError("You must approve the NFT transfer first");
      return;
    }

    setTxStatus("Sending fractionalization transaction...");
    setIsLoading(true);
    setActionInProgress("fractionalize");
    setError("");

    try {
      // Use the fractionalizeCertificate hook with the correct parameters
      const tokenId = Number(fractionInfo.tokenId);
      const txHash = await fractionalizeCertificate(walletClient, tokenId, address);
      
      setTxStatus(`Fractionalization transaction sent: ${txHash}. Waiting for confirmation...`);
      
      // Wait for transaction confirmation
      if (!publicClient) {
        setError("Public client not available");
        return;
      }
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      if (receipt.status === 'success') {
        setTxStatus("Certificate successfully fractionalized!");
        // Refresh data
        fetchFractionInfo();
      } else {
        setTxStatus("Fractionalization transaction failed. Please try again.");
      }
      
    } catch (err: unknown) {
      setTxStatus("");
      setError(`Error during fractionalization: ${err instanceof Error ? err.message : String(err)}`);
      console.error(err);
    } finally {
      setIsLoading(false);
      setActionInProgress(null);
    }
  };

  // Function to deploy a new fractionalization contract
  const deployAndFractionalize = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletClient || !address) {
      setError("Wallet not connected");
      return;
    }

    setTxStatus("Preparing to deploy fractionalization contract...");
    setIsLoading(true);
    setActionInProgress("deploy");
    setError("");

    try {
      // This would be the deployment transaction for a new FractionalCertificateToken contract
      // In a real implementation, you would need to use walletClient to deploy the contract
      
      // Example using a factory contract pattern:
      // const { request } = await publicClient.simulateContract({
      //   address: factoryContractAddress as `0x${string}`,
      //   abi: factoryContractABI,
      //   functionName: "deployFractionalCertificate",
      //   args: [
      //     BigInt(formData.totalFractions),
      //     formData.tokenName,
      //     formData.tokenSymbol,
      //     formData.certificateContractAddress as `0x${string}`,
      //     BigInt(formData.certificateTokenId)
      //   ],
      //   account: address,
      // });
      // 
      // const txHash = await walletClient.writeContract(request);
      
      // For demo purposes, simulate successful deployment
      setTimeout(() => {
        setTxStatus("Contract deployed! Now you need to approve and fractionalize the certificate.");
        setIsLoading(false);
        setActionInProgress(null);
        
        // In a real implementation, you would get the new contract address from the event
        // and update the UI accordingly
      }, 2000);
      
    } catch (err: unknown) {
      setTxStatus("");
      setError(`Error during deployment: ${err instanceof Error ? err.message : String(err)}`);
      console.error(err);
      setIsLoading(false);
      setActionInProgress(null);
    }
  };

  // Load data on initial render
  useEffect(() => {
    if (publicClient && address) {
      fetchFractionInfo();
    }
  }, [publicClient, address, fetchFractionInfo]);

  return (
    <div className="p-6 mt-10 font-sans border rounded shadow bg-white">
      <h2 className="text-2xl font-bold mb-6">📦 Fractional Certificate Manager</h2>
      
      {/* Connection Status */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">
        <p className="text-sm">
          {address ? 
            `Connected: ${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 
            "Please connect your wallet to interact with this component"}
        </p>
      </div>
      
      {/* Deployment and Fractionalization Form */}
      <div className="mb-8 p-4 border rounded bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">Create New Fractionalized Certificate</h3>
        
        <form onSubmit={deployAndFractionalize} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Certificate Contract Address</label>
            <input
              type="text"
              name="certificateContractAddress"
              value={formData.certificateContractAddress}
              onChange={handleInputChange}
              placeholder="0x..."
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Certificate Token ID</label>
            <input
              type="text"
              name="certificateTokenId"
              value={formData.certificateTokenId}
              onChange={handleInputChange}
              placeholder="1"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Token Name</label>
              <input
                type="text"
                name="tokenName"
                value={formData.tokenName}
                onChange={handleInputChange}
                placeholder="Green Energy Certificate Fraction"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Token Symbol</label>
              <input
                type="text"
                name="tokenSymbol"
                value={formData.tokenSymbol}
                onChange={handleInputChange}
                placeholder="GECF"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Fractions</label>
            <input
              type="number"
              name="totalFractions"
              value={formData.totalFractions}
              onChange={handleInputChange}
              min="1"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            className={`w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 ${
              isLoading || !address
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500"
            }`}
            disabled={isLoading || !address}
          >
            {actionInProgress === "deploy" ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                Deploying...
              </span>
            ) : (
              "🚀 Deploy & Prepare Fractionalization"
            )}
          </button>
        </form>
      </div>
      
      {/* Existing Contract Interaction */}
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">Existing Contract Information</h3>
        
        <button
          onClick={fetchFractionInfo}
          className={`w-full mb-4 px-4 py-2 rounded-md focus:outline-none focus:ring-2 ${
            isLoading || !address
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
          }`}
          disabled={isLoading || !address}
        >
          {actionInProgress === "fetch" ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
              Loading...
            </span>
          ) : (
            "🔍 Get Fraction Info"
          )}
        </button>
        
        {fractionInfo && (
          <div className="space-y-2 p-4 bg-white rounded border mb-4">
            <p><strong>NFT Address:</strong> <span className="font-mono text-sm">{fractionInfo.nftAddress}</span></p>
            <p><strong>Token ID:</strong> {fractionInfo.tokenId.toString()}</p>
            <p><strong>Total Fractions:</strong> {fractionInfo.totalFractions.toString()}</p>
            <p><strong>Owner:</strong> <span className="font-mono text-sm">{fractionInfo.owner}</span></p>
            <p><strong>Your Address:</strong> <span className="font-mono text-sm">{address}</span></p>
            <p><strong>Is Owner:</strong> {isOwner ? "✅ Yes" : "❌ No"}</p>
            
            <div className="flex flex-col gap-1 mt-2">
              <p>
                <strong>Status:</strong> {isFractionalized ? (
                  <span className="text-green-600">✅ Fractionalized</span>
                ) : isFractionalized === false ? (
                  <span className="text-orange-500">⏳ Not Fractionalized</span>
                ) : (
                  <span className="text-gray-500">Unknown</span>
                )}
              </p>
              
              {isFractionalized === false && (
                <p>
                  <strong>NFT Approval:</strong> {isApproved ? (
                    <span className="text-green-600">✅ Approved</span>
                  ) : (
                    <span className="text-orange-500">❌ Not Approved</span>
                  )}
                </p>
              )}
              
              {!isOwner && <p className="text-orange-500">Note: Only the owner can fractionalize this certificate</p>}
            </div>
          </div>
        )}
        
        {/* Action Buttons Section */}
        {fractionInfo && isOwner && (
          <div className="flex flex-col gap-4">
            {/* Approve NFT Button - Always visible when needed */}
            {!isApproved && isFractionalized === false && (
              <button
                onClick={approveNFT}
                className={`w-full px-4 py-3 rounded-md focus:outline-none focus:ring-2 ${
                  isLoading
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500"
                }`}
                disabled={isLoading}
              >
                {actionInProgress === "approve" ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                    Approving...
                  </span>
                ) : (
                  "👍 Approve NFT Transfer"
                )}
              </button>
            )}
            
            {/* Fractionalize Button */}
            <button
              onClick={fractionalize}
              disabled={isLoading || isFractionalized === true || !isApproved}
              className={`w-full px-4 py-3 rounded-md focus:outline-none focus:ring-2 ${
                !isLoading && isFractionalized === false && isApproved
                  ? "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {actionInProgress === "fractionalize" ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                  Fractionalizing...
                </span>
              ) : (
                "🔐 Fractionalize Certificate"
              )}
            </button>
            
            {/* Guidance Message */}
            {!isApproved && isFractionalized === false && (
              <p className="text-sm text-yellow-700 mt-2">
                ℹ️ You need to approve the contract to transfer your NFT before fractionalizing
              </p>
            )}
            
            {isApproved && isFractionalized === false && (
              <p className="text-sm text-green-700 mt-2">
                ✅ Approval complete! You can now fractionalize your certificate
              </p>
            )}
            
            {isFractionalized && (
              <p className="text-sm text-blue-700 mt-2">
                🎉 This certificate has been successfully fractionalized
              </p>
            )}
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {txStatus && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">
          <p className="text-sm">{txStatus}</p>
        </div>
      )}
      
      {isLoading && !actionInProgress && (
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}
    </div>
  );
};

export default FractionalCert;
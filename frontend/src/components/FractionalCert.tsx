import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import {contractAddressFractionalCertificateToken , contractABIFractionalCertificateToken } from "../BlockchainServices/core"; 

interface FractionInfo {
  nftAddress: string;
  tokenId: bigint;
  totalFractions: bigint;
  owner: string;
}

const FractionalCert = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [fractionInfo, setFractionInfo] = useState<FractionInfo | null>(null);
  const [error, setError] = useState("");
  const [txStatus, setTxStatus] = useState("");

  const fetchFractionInfo = async () => {
    if (!publicClient) {
      setError("Public client not available");
      return;
    }

    try {
      const result = await publicClient.readContract({
        address: contractAddressFractionalCertificateToken as `0x${string}`,
        abi: contractABIFractionalCertificateToken,
        functionName: "getFractionInfo",
      }) as [string, bigint, bigint, string];

      setFractionInfo({
        nftAddress: result[0],
        tokenId: result[1],
        totalFractions: result[2],
        owner: result[3]
      });
      setError("");
    } catch (err: unknown) {
      setError("Failed to fetch fraction info");
      console.error(err);
    }
  };

  const fractionalize = async () => {
    if (!publicClient || !walletClient) {
      setError("Wallet or public client not available");
      return;
    }

    setTxStatus("Sending transaction...");
    try {
      const { request } = await publicClient.simulateContract({
        address: contractAddressFractionalCertificateToken as `0x${string}`,
        abi: contractABIFractionalCertificateToken,
        functionName: "fractionalizeCertificate",
        account: address,
      });

      const txHash = await walletClient.writeContract(request);
      setTxStatus(`Transaction sent: ${txHash}`);
    } catch (err: unknown) {
      setTxStatus("Error during transaction.");
      console.error(err);
    }
  };

  return (
    <div className="p-6 mt-10 font-sans border rounded shadow">
      <h2 className="text-xl font-bold mb-4">📦 Fractional Certificate Viewer</h2>

      <button
        onClick={fetchFractionInfo}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
      >
        Get Fraction Info
      </button>

      {fractionInfo && (
        <div className="mb-4">
          <p><strong>NFT Address:</strong> {fractionInfo.nftAddress}</p>
          <p><strong>Token ID:</strong> {fractionInfo.tokenId.toString()}</p>
          <p><strong>Total Fractions:</strong> {fractionInfo.totalFractions.toString()}</p>
          <p><strong>Owner:</strong> {fractionInfo.owner}</p>
        </div>
      )}

      {error && <p className="text-red-500">{error}</p>}

      <button
        onClick={fractionalize}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        🔐 Fractionalize Certificate (Owner only)
      </button>

      {txStatus && <p className="mt-2 text-sm text-gray-600">{txStatus}</p>}
    </div>
  );
};

export default FractionalCert;
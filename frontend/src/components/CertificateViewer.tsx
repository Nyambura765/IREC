import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { getCertificateDetails, mintCertificate, getWalletClient} from "../BlockchainServices/Hooks"; 

// This should match what's returned from your Hooks file
interface CertificateDetails {
  facilityName: string;
  energySource: string;
  productionDate: number; // Unix timestamp in seconds
  expiryDate: number;
  energyAmount: bigint;
  owner: string;
}

// New interface for minting form data
interface MintFormData {
  recipient: string;
  baseURI: string;
  facilityName: string;
  energySource: string;
  productionDate: string; // Will be converted to timestamp
  expiryDate: string; // Will be converted to timestamp
  newItemId: string;
}

const CertificateViewer = () => {
  const { address, isConnected } = useAccount();
  const [tokenId, setTokenId] = useState<string>("");
  const [details, setDetails] = useState<CertificateDetails | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mintSuccess, setMintSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"view" | "mint">("view");
  
  // State for mint form
  const [mintForm, setMintForm] = useState<MintFormData>({
    recipient: "",
    baseURI: "",
    facilityName: "",
    energySource: "",
    productionDate: "",
    expiryDate: "",
    newItemId: ""
  });
  
  // Add debugging for component lifecycle
  useEffect(() => {
    console.log("CertificateViewer mounted or updated");
    
    // Log when component unmounts to see if it's getting removed unexpectedly
    return () => {
      console.log("CertificateViewer unmounting");
    };
  }, []);
  
  // Log when details change
  useEffect(() => {
    console.log("Details state changed:", details);
  }, [details]);

  // Pre-fill recipient with connected wallet address
  useEffect(() => {
    if (address && isConnected) {
      setMintForm(prev => ({
        ...prev,
        recipient: address
      }));
    }
  }, [address, isConnected]);

  const handleFetch = async (e?: React.MouseEvent) => {
    // Prevent any default behaviors
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!address || !tokenId) {
      setError("Please connect your wallet and enter a valid token ID");
      return;
    }

    setError("");
    setLoading(true);
    console.log("Starting fetch for token:", tokenId);
    
    try {
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }
      
      console.log("Calling getCertificateDetails with:", Number(tokenId), address);
      const result = await getCertificateDetails(Number(tokenId));
      
      // Handle potential format issues
      if (!result) {
        throw new Error("No data returned");
      }
      
      setDetails(result);
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch certificate");
      setDetails(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleMintInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMintForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle mint certificate submission
  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError("");
    setMintSuccess("");
    setLoading(true);
    
    try {
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }
      
      // Convert dates to timestamps (seconds)
      const productionTimestamp = Math.floor(new Date(mintForm.productionDate).getTime() / 1000);
      const expiryTimestamp = Math.floor(new Date(mintForm.expiryDate).getTime() / 1000);
      
      // Validate form data
      if (!mintForm.recipient || !mintForm.facilityName || !mintForm.energySource || 
          !mintForm.productionDate || !mintForm.expiryDate || !mintForm.newItemId) {
        throw new Error("All fields are required");
      }
      
      if (expiryTimestamp <= productionTimestamp) {
        throw new Error("Expiry date must be after production date");
      }
      
      console.log("Minting certificate with data:", {
        ...mintForm,
        productionDate: productionTimestamp,
        expiryDate: expiryTimestamp,
        newItemId: Number(mintForm.newItemId)
      });
      
            const walletClient = await getWalletClient; 
      if (!walletClient) {
        throw new Error("Failed to retrieve wallet client");
      }

      const result = await mintCertificate(
        
        mintForm.recipient,
        mintForm.baseURI,
        mintForm.facilityName,
        mintForm.energySource,
        productionTimestamp,
        expiryTimestamp,
        Number(mintForm.newItemId)
      );
      
      console.log("Mint result:", result);
      setMintSuccess(`Certificate #${mintForm.newItemId} successfully minted!`);
      
      // Reset form
      setMintForm({
        recipient: address || "",
        baseURI: "",
        facilityName: "",
        energySource: "",
        productionDate: "",
        expiryDate: "",
        newItemId: ""
      });
      
    } catch (err) {
      console.error("Mint error:", err);
      setError(err instanceof Error ? err.message : "Failed to mint certificate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 font-sans">
      <h1 className="text-2xl font-bold mb-4">🔖 IReC Certificate Manager</h1>

      {!isConnected && (
        <p className="text-amber-600 mb-4">Please connect your wallet to view or mint certificates</p>
      )}

      {isConnected && (
        <>
          {/* Tab navigation */}
          <div className="border-b mb-6">
            <nav className="flex space-x-4 mb-2">
              <button 
                onClick={() => setActiveTab("view")}
                className={`pb-2 px-4 ${activeTab === "view" ? "border-b-2 border-green-600 text-green-600 font-medium" : "text-gray-500"}`}
              >
                View Certificate
              </button>
              <button 
                onClick={() => setActiveTab("mint")}
                className={`pb-2 px-4 ${activeTab === "mint" ? "border-b-2 border-green-600 text-green-600 font-medium" : "text-gray-500"}`}
              >
                Mint Certificate
              </button>
            </nav>
          </div>

          {/* View certificate tab */}
          {activeTab === "view" && (
            <div>
              <div className="mt-4">
                <input
                  type="number"
                  placeholder="Enter Token ID"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  className="p-2 border rounded mr-2"
                />
                <button
                  onClick={(e) => handleFetch(e)}
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-green-400"
                  type="button"
                >
                  {loading ? "Loading..." : "Fetch Certificate"}
                </button>
              </div>

              {details && (
                <div className="mt-6 p-4 border rounded shadow bg-white">
                  <h2 className="text-xl font-semibold mb-4">Certificate Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <p><strong>Facility:</strong> {details.facilityName || 'N/A'}</p>
                    <p><strong>Energy Source:</strong> {details.energySource || 'N/A'}</p>
                    <p><strong>Production Date:</strong> {details.productionDate ? new Date(details.productionDate * 1000).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Expiry Date:</strong> {details.expiryDate ? new Date(details.expiryDate * 1000).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Energy Amount (Wh):</strong> {details.energyAmount ? details.energyAmount.toString() : 'N/A'}</p>
                    <p><strong>Owner:</strong> {details.owner || 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mint certificate tab */}
          {activeTab === "mint" && (
            <div className="mt-4">
              <h2 className="text-xl font-semibold mb-4">Mint New Certificate</h2>
              
              <form onSubmit={handleMint} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Recipient Address</label>
                    <input
                      type="text"
                      name="recipient"
                      value={mintForm.recipient}
                      onChange={handleMintInputChange}
                      placeholder="0x..."
                      className="p-2 border rounded w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Base URI</label>
                    <input
                      type="text"
                      name="baseURI"
                      value={mintForm.baseURI}
                      onChange={handleMintInputChange}
                      placeholder="ipfs://"
                      className="p-2 border rounded w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Facility Name</label>
                    <input
                      type="text"
                      name="facilityName"
                      value={mintForm.facilityName}
                      onChange={handleMintInputChange}
                      placeholder="Solar Farm Alpha"
                      className="p-2 border rounded w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Energy Source</label>
                    <select
                      name="energySource"
                      value={mintForm.energySource}
                      onChange={handleMintInputChange}
                      className="p-2 border rounded w-full"
                      required
                    >
                      <option value="">Select Energy Source</option>
                      <option value="Solar">Solar</option>
                      <option value="Wind">Wind</option>
                      <option value="Hydro">Hydro</option>
                      <option value="Biomass">Biomass</option>
                      <option value="Geothermal">Geothermal</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Production Date</label>
                    <input
                      type="date"
                      name="productionDate"
                      value={mintForm.productionDate}
                      onChange={handleMintInputChange}
                      className="p-2 border rounded w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Expiry Date</label>
                    <input
                      type="date"
                      name="expiryDate"
                      value={mintForm.expiryDate}
                      onChange={handleMintInputChange}
                      className="p-2 border rounded w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Token ID</label>
                    <input
                      type="number"
                      name="newItemId"
                      value={mintForm.newItemId}
                      onChange={handleMintInputChange}
                      placeholder="Unique Token ID"
                      className="p-2 border rounded w-full"
                      required
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-green-400"
                  >
                    {loading ? "Processing..." : "Mint Certificate"}
                  </button>
                </div>
              </form>
              
              {mintSuccess && (
                <div className="mt-4 p-3 bg-green-100 text-green-800 rounded border border-green-300">
                  {mintSuccess}
                </div>
              )}
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-800 rounded border border-red-300">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CertificateViewer;
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { getCertificateDetails } from "../BlockchainServices/Hooks"; 

// This should match what's returned from your Hooks file
interface CertificateDetails {
  facilityName: string;
  energySource: string;
  productionDate: number; // Unix timestamp in seconds
  expiryDate: number;
  energyAmount: bigint;
  owner: string;
}

const CertificateViewer = () => {
  const { address, isConnected } = useAccount();
  const [tokenId, setTokenId] = useState<string>("");
  const [details, setDetails] = useState<CertificateDetails | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
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
    
    // In your handleFetch function
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
}
  }

  return (
    <div className="p-6 font-sans">
      <h1 className="text-2xl font-bold mb-4">🔖 IReC Certificate Viewer</h1>

      {!isConnected && (
        <p className="text-amber-600 mb-4">Please connect your wallet to view certificates</p>
      )}

      {/* Wrap in div to prevent form behavior */}
      <div>
        {isConnected && (
          <div className="mt-6">
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
              type="button" // Explicitly set as button type
            >
              {loading ? "Loading..." : "Fetch Certificate"}
            </button>
          </div>
        )}

        {error && <p className="text-red-600 mt-4">{error}</p>}

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
    </div>
  );
};

export default CertificateViewer;
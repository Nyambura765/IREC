
import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { contractAddressIREC, contractABIIREC } from "../BlockchainServices/core"; 
 

const CertificateViewer = () => {
  const { address, isConnected } = useAccount();
  const [tokenId, setTokenId] = useState<string>("");
  interface CertificateDetails {
    facility: string;
    source: string;
    productionDate: number;
    expiryDate: number;
    energy: bigint;
    owner: string;
  }

  const [details, setDetails] = useState<CertificateDetails | null>(null);
  const [error, setError] = useState("");

  const publicClient = usePublicClient();

  const handleFetch = async () => {
    setError("");
    try {
      if (!publicClient) {
        setError("Public client is not available");
        return;
      }

      const result = await publicClient.readContract({
        address: contractAddressIREC as `0x${string}`,
        abi: contractABIIREC,
        functionName: "getCertificateDetails",
        args: [BigInt(tokenId)],
        account: address,
      });

      setDetails(result as CertificateDetails);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Error fetching certificate");
      } else {
        setError("An unknown error occurred");
      }
      setDetails(null);
    }
  };

  return (
    <div className="p-6 font-sans">
      <h1 className="text-2xl font-bold mb-4">🔖 IReC Certificate Viewer</h1>

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
            onClick={handleFetch}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Fetch Certificate
          </button>
        </div>
      )}

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {details && (
        <div className="mt-6 p-4 border rounded shadow">
          <h2 className="text-xl font-semibold">Certificate Details</h2>
          <p><strong>Facility:</strong> {details.facility}</p>
          <p><strong>Source:</strong> {details.source}</p>
          <p><strong>Production Date:</strong> {new Date(details.productionDate * 1000).toLocaleDateString()}</p>
          <p><strong>Expiry Date:</strong> {new Date(details.expiryDate * 1000).toLocaleDateString()}</p>
          <p><strong>Energy (Wh):</strong> {details.energy.toString()}</p>
          <p><strong>Owner:</strong> {details.owner}</p>
        </div>
      )}
    </div>
  );
};

export default CertificateViewer;

import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import {contractAddressMarketplace, contractABIMarketplace } from "../BlockchainServices/core";

const Marketplace = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [pricePerToken, setPricePerToken] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");

  interface ListingInfo {
    seller: string;
    pricePerToken: bigint;
    amountAvailable: bigint;
  }

  const [listingInfo, setListingInfo] = useState<ListingInfo | null>(null);
  const [txStatus, setTxStatus] = useState("");

  const listTokens = async () => {
    setTxStatus("Listing tokens...");
    try {
      if (!publicClient) {
        setTxStatus("Public client is not available.");
        return;
      }

        if (!walletClient) {
            setTxStatus("Wallet client is not available.");
            return;
        }

      const { request } = await publicClient.simulateContract({
        address: contractAddressMarketplace as `0x${string}`,
        abi: contractABIMarketplace,
        functionName: "listTokens",
        args: [tokenAddress, BigInt(amount), BigInt(pricePerToken)],
        account: address,
      });

      const txHash = await walletClient.writeContract(request);
      setTxStatus(`Listed successfully! Tx: ${txHash}`);
    } catch (err) {
      console.error(err);
      setTxStatus("Listing failed.");
    }
  };

  const buyTokens = async () => {
    setTxStatus("Processing purchase...");
    try {
      if (!publicClient || !walletClient || !address) {
        setTxStatus("Client or account not available.");
        return;
      }
      
      const totalCost = BigInt(pricePerToken) * BigInt(amount);
      const { request } = await publicClient.simulateContract({
        address: contractAddressMarketplace as `0x${string}`,
        abi: contractABIMarketplace,
        functionName: "buyTokens",
        args: [tokenAddress, sellerAddress, BigInt(amount)],
        value: totalCost,
        account: address,
      });

      const txHash = await walletClient.writeContract(request);
      setTxStatus(`Purchase complete! Tx: ${txHash}`);
    } catch (err) {
      console.error(err);
      setTxStatus("Purchase failed.");
    }
  };

  const getListing = async () => {
    try {
      if (!publicClient) {
        setTxStatus("Public client is not available.");
        return;
      }

      const result = await publicClient.readContract({
        address: contractAddressMarketplace as `0x${string}`,
        abi: contractABIMarketplace,
        functionName: "getListing",
        args: [tokenAddress, sellerAddress],
      });

      setListingInfo(result as ListingInfo);
      setTxStatus("");
    } catch (err) {
      console.error(err);
      setTxStatus("Failed to get listing info.");
    }
  };

  const cancelListing = async () => {
    setTxStatus("Cancelling listing...");
    try {
      if (!publicClient || !walletClient || !address) {
        setTxStatus("Client or account not available.");
        return;
      }
      
      const { request } = await publicClient.simulateContract({
        address: contractAddressMarketplace as `0x${string}`,
        abi: contractABIMarketplace,
        functionName: "cancelListing",
        args: [tokenAddress],
        account: address,
      });

      const txHash = await walletClient.writeContract(request);
      setTxStatus(`Listing cancelled! Tx: ${txHash}`);
    } catch (err) {
      console.error(err);
      setTxStatus("Cancellation failed.");
    }
  };

  return (
    <div className="p-6 mt-10 font-sans border rounded shadow">
      <h2 className="text-xl font-bold mb-4">🛒 Marketplace Interface</h2>

      <div className="space-y-2">
        <input
          className="border p-2 w-full"
          type="text"
          placeholder="ERC20 Token Address"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
        />
        <input
          className="border p-2 w-full"
          type="text"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className="border p-2 w-full"
          type="text"
          placeholder="Price Per Token (wei)"
          value={pricePerToken}
          onChange={(e) => setPricePerToken(e.target.value)}
        />
        <input
          className="border p-2 w-full"
          type="text"
          placeholder="Seller Address (for viewing/buying)"
          value={sellerAddress}
          onChange={(e) => setSellerAddress(e.target.value)}
        />

        <div className="flex flex-wrap gap-2 mt-4">
          <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={listTokens}>
            📥 List Tokens
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={getListing}>
            🔍 Get Listing Info
          </button>
          <button className="bg-yellow-600 text-white px-4 py-2 rounded" onClick={buyTokens}>
            🛒 Buy Tokens
          </button>
          <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={cancelListing}>
            ❌ Cancel Listing
          </button>
        </div>
      </div>

      {listingInfo && (
        <div className="mt-4 text-sm bg-gray-100 p-4 rounded">
          <p><strong>Seller:</strong> {listingInfo.seller}</p>
          <p><strong>Price per token:</strong> {listingInfo.pricePerToken.toString()} wei</p>
          <p><strong>Amount available:</strong> {listingInfo.amountAvailable.toString()}</p>
        </div>
      )}

      {txStatus && <p className="mt-4 text-gray-700">{txStatus}</p>}
    </div>
  );
};

export default Marketplace;
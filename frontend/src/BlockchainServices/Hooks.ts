import { createPublicClient, createWalletClient, custom, http } from "viem";
import { sepolia } from 'viem/chains';
import type { WalletClient } from 'viem';
import { contractABIIREC, contractAddressIREC, contractABIMarketplace, contractAddressMarketplace, contractAddressFractionalCertificateToken, contractABIFractionalCertificateToken } from "./core";

export {};


interface CertificateDetails {
    
    tokenId: bigint;
    owner: string;
    facility: string;
    source: string;
}

// Set up public client
export const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`${import.meta.env.VITE_SEPOLIA_RPC_URL}`)
});

// Define return type for wallet client
interface WalletClientResult {
    walletClient: WalletClient;
    address: string;
}

// Type guard to check for ethereum provider
function hasEthereumProvider(window: Window): boolean {
    return window.ethereum !== undefined;
}

// Get the wallet client using browser wallet
export async function getWalletClient(): Promise<WalletClientResult> {
    if (!hasEthereumProvider(window)) {
        throw new Error('Please install MetaMask or another web3 wallet');
    }

    const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum)
    });

    const [address] = await walletClient.requestAddresses(); 
    console.log('Connected Address: ', address);

    return { walletClient, address };
}

// Function to get certificate details
export async function getCertificateDetails(tokenId: number, address: string): Promise<CertificateDetails> {
    const result = await publicClient.readContract({
        address: contractAddressIREC as `0x${string}`,
        abi: contractABIIREC,
        functionName: "getCertificateDetails",
        args: [BigInt(tokenId)],
        account: address as `0x${string}`,
    }) as CertificateDetails;
    
    return result;
}

// Mint certificate function
export async function mintCertificate(
    walletClient: WalletClient, 
    tokenId: number, 
    address: string
): Promise<`0x${string}`> {
    const result = await walletClient.writeContract({
        address: contractAddressIREC as `0x${string}`,
        abi: contractABIIREC,
        functionName: "mintCertificate",
        args: [BigInt(tokenId), address],
        chain: sepolia,
        account: address as `0x${string}`,
    });
    return result;
}

// List certificate function
export async function listCertificate(
    walletClient: WalletClient, 
    tokenId: number, 
    address: string
): Promise<`0x${string}`> {
    const result = await walletClient.writeContract({
        address: contractAddressMarketplace as `0x${string}`,
        abi: contractABIMarketplace,
        functionName: "listCertificate",
        args: [BigInt(tokenId), address],
        chain: sepolia,
        account: address as `0x${string}`,
    });
    return result;
}

// Buy certificate function
export async function buyCertificate(
    walletClient: WalletClient, 
    tokenId: number, 
    address: string
): Promise<`0x${string}`> {
    const result = await walletClient.writeContract({
        address: contractAddressMarketplace as `0x${string}`,
        abi: contractABIMarketplace,
        functionName: "buyCertificate",
        args: [BigInt(tokenId), address],
        chain: sepolia,
        account: address as `0x${string}`,
    });
    return result;
}

// Fractionalize certificate function
export async function fractionalizeCertificate(
    walletClient: WalletClient, 
    tokenId: number, 
    address: string
): Promise<`0x${string}`> {
    const result = await walletClient.writeContract({
        address: contractAddressFractionalCertificateToken as `0x${string}`,
        abi: contractABIFractionalCertificateToken,
        functionName: "fractionalizeCertificate",
        args: [BigInt(tokenId), address],
        chain: sepolia,
        account: address as `0x${string}`,
    });
    return result;
}
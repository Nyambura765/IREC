# I-REC Certificate Fractionalization

This project demonstrates the fractionalization of International Renewable Energy Certificates (I-RECs) using blockchain technology, making renewable energy certificates more accessible to smaller buyers.

## Project Overview

This prototype enables users to:
- View I-REC certificates (represented as NFTs)
- Fractionalize certificates into smaller, tradable tokens
- Purchase fractions of certificates
- Track ownership of fractions

The solution uses a combination of ERC-721 (for the whole certificate) and ERC-20 (for the fractions) smart contracts deployed on the Sepolia testnet.

## Smart Contract Architecture

The project consists of three main smart contracts:

1. **IRECCertificate.sol** - An ERC-721 implementation representing whole I-REC certificates
2. **FractionalIREC.sol** - An ERC-20 implementation representing fractions of certificates
3. **Marketplace.sol** - A marketplace for listing ,purchasing and selling tokens
Smart Contracts Architecture
The platform consists of three main contracts:
## 1. IReCCertificate.sol
This is an ERC-721 NFT contract that represents renewable energy certificates.
# Key Features:

Creates verifiable certificates as non-fungible tokens (NFTs)
Each certificate represents 1 MWh of renewable energy production
Stores detailed metadata about the energy production:

Facility name
Energy source (e.g., solar, wind, hydro)
Production date
Expiry date
Energy amount (fixed at 1 MWh per certificate)


Includes certificate minting, burning, and data retrieval functions
Only the contract owner can mint new certificates

# How it works:

Energy producers (or authorized issuers) mint certificates for verified renewable energy production
Each certificate has a unique ID and contains verifiable production data
Certificate owners can query full details about their certificates
Certificates can be transferred or burned when the energy credit is claimed

## 2. FractionalCertificateToken.sol
This ERC-20 contract enables the fractionalization of I-REC certificates into smaller, fungible tokens.
# Key Features:

Locks an I-REC certificate NFT inside the contract
Issues a specified number of ERC-20 tokens representing fractional ownership
Provides a way to make renewable energy certificates more accessible and liquid
Uses OpenZeppelin's ERC20Permit for gasless approvals

# How it works:

The contract owner provides the I-REC certificate NFT contract address and token ID
The owner specifies the total number of fractions to create
When fractionalization is triggered, the NFT is locked in the contract
ERC-20 tokens are minted to the owner, who can then distribute or sell them
Each token represents a fractional claim to the underlying I-REC certificate

## 3. Marketplace.sol
This contract facilitates the buying and selling of fractional certificate tokens.
# Key Features:

Allows sellers to list their fractional tokens at a specified price
Enables buyers to purchase fractional tokens with ETH
Includes listing management, purchases, and cancellations
Implements security features like reentrancy protection

# How it works:

Sellers list their fractional tokens, setting a price per token and the amount to sell
Buyers can purchase any amount of the listed tokens by sending the required ETH
The contract facilitates the exchange of tokens and ETH between parties
Sellers can cancel their listings if needed

Usage Flow

Certificate Creation:

An authorized issuer (contract owner) mints a new I-REC certificate NFT for verified renewable energy production
The certificate contains all relevant metadata about the energy production


Fractionalization:

The certificate owner creates a new FractionalCertificateToken contract
The owner specifies how many ERC-20 tokens to mint (e.g., 1,000 tokens for 1 MWh)
The I-REC certificate is locked in the contract, and the owner receives all fractional tokens


Marketplace Trading:

Fractional token holders can list their tokens on the marketplace
Buyers can purchase any amount of listed tokens, making small-scale renewable energy investment possible
Transactions occur directly between buyers and sellers, with the marketplace facilitating the exchange

### Key Features

- Each whole certificate represents 1 MWh of renewable energy
- Certificates can be fractionalized into up to 1,000 units (0.001 MWh each)
- Metadata includes renewable energy source, generation date, and location
- Owner authentication for fractionalization operations
- Full transparency of fractional ownership

## Deployed Contracts

- **IRECCertificate Contract**: `0x0a59e43821a9fad62162C5Ae4854D9759696E37B`
- **FractionalIREC Contract**: `0xB699bF620DA506529ace78E4F8A842B6D5c27B90`
- **Marketplace contract**: `0x00e75e5C7458985B24b350359Ca4f8b1e80A71E1`

## Technical Stack

- **Smart Contracts**: Solidity (v0.8.20)
- **Development Framework**: Hardhat
- **Front-end**: React+TypeScript with vite and Viem +Wagmi + RainbowKit
- **Styling**: Tailwind CSS
- **Testing**: Chai and Mocha

## Setup and Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MetaMask wallet configured for Sepolia testnet

### Installation Steps

1. Clone the repository:
   ```
   git clone https://github.com/Nyambura765/IREC.git
   cd irec
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add:
   ```
   PRIVATE_KEY=your_wallet_private_key
   SEPOLIA_RPC_URL=your_sepolia_rpc_endpoint
   ```

4. Compile the smart contracts:
   ```
   npx hardhat compile
   ```

5. Deploy to Sepolia testnet:
   ```
   npx hardhat run scripts/deploy.js --network sepolia

   ```

   ![Image](https://github.com/user-attachments/assets/18a83a05-9cd2-4768-9b09-5d444ede3fb4)
   ![Image](https://github.com/user-attachments/assets/1dd16f29-f181-4304-84af-554aed94b211)

6. Start the front-end application:
   ```
   npm run start
   ```

7. Navigate to `http://localhost:5173` in your browser

## Using the Application

1. **Connect your wallet**: Click "Connect Wallet" to connect your MetaMask to the application.

2. **View certificates**: Browse available I-REC certificates, each showing its energy source, generation date, and location.

3. **Fractionalize a certificate**: If you own a certificate, you can fractionalize it by clicking "Fractionalize" and specifying how many fractions to create.

4. **Buy fractions**: Browse available fractions and purchase them with your Sepolia ETH.



## Testing

Run the test suite with:
```
npx hardhat test
```

The tests cover:
- Certificate creation
- Fractionalization process
- Ownership tracking
- Transfer mechanisms

![Image](https://github.com/user-attachments/assets/fe5164d9-33e5-4eb9-873a-234546a7ef18)
![Image](https://github.com/user-attachments/assets/ebe8f4cb-9889-4505-93c2-b03c10e6b21a)
![Image](https://github.com/user-attachments/assets/00a8e741-97b3-4c8f-864e-32f207d1b699)

## Development Challenges

During development, several challenges were addressed:

1. **Certificate-Fraction Relationship**: Maintaining the relationship between the original certificate and its fractions required careful design of the smart contracts.

2. **Metadata Management**: Ensuring certificate metadata remained accessible to fraction owners.

3. **Gas Optimization**: Balancing functionality with gas efficiency for affordability.

4. **UI/UX Simplicity**: Making complex blockchain operations accessible to non-technical users.



## License

MIT

## Contact

For questions or support, please contact: nyambuarfavour765@gmail.com
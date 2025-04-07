// SPDX-License-Identifier: MIT
const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment of Green Energy Certificate System...");

  // Get the contract factories
  const IReCCertificate = await ethers.getContractFactory("IReCCertificate");
  const FractionalCertificateToken = await ethers.getContractFactory("FractionalCertificateToken");
  const Marketplace = await ethers.getContractFactory("Marketplace");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  
  // Display account balance before deployment
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} ETH`);

  // Step 1: Deploy IReCCertificate contract
  console.log("\nStep 1: Deploying IReCCertificate contract...");
  const certificateName = "Green Energy Certificate";
  const certificateSymbol = "GEC";
  const baseURI = "https://api.greenenergy.example/metadata/";
  
  const iReCCertificate = await IReCCertificate.deploy(
    certificateName,
    certificateSymbol,
    baseURI,
    { gasLimit: 3000000 }
  );
  await iReCCertificate.waitForDeployment();
  console.log(`IReCCertificate deployed to: ${await iReCCertificate.getAddress()}`);

  // Step 2: Mint a certificate with enhanced error handling
  console.log("\nStep 2: Minting a sample certificate...");
  const facilityName = "Solar Farm Alpha";
  const energySource = "Solar";
  const productionDate = Math.floor(Date.now() / 1000); // Current timestamp
  const expiryDate = Math.floor(Date.now() / 1000) + 31536000; // One year from now
  const certificateTokenId = 1; // First certificate ID
  
  console.log("Mint parameters:", {
    to: deployer.address,
    tokenURI: `certificate-${certificateTokenId}`,
    facilityName,
    energySource,
    productionDate,
    expiryDate,
    certificateTokenId
  });

  let certificateMinted = false;
  try {
    const mintTx = await iReCCertificate.mintCertificate(
      deployer.address,
      `certificate-${certificateTokenId}`,
      facilityName,
      energySource,
      productionDate,
      expiryDate,
      certificateTokenId,
      { gasLimit: 500000 }
    );
    console.log("Mint transaction sent:", mintTx.hash);
    const receipt = await mintTx.wait();
    console.log("Mint transaction receipt status:", receipt.status);
    console.log(`Certificate minted with ID: ${certificateTokenId}`);
    certificateMinted = true;
  } catch (error) {
    console.error("Mint transaction failed:", error.shortMessage || error.message);
    console.log("Skipping minting, continuing with deployment...");
  }

  // Proceed with deployment only if certificate was minted or skip related steps
  let fractionalToken, marketplace;
  
  // Step 3: Deploy FractionalCertificateToken for the minted certificate
  if (certificateMinted) {
    console.log("\nStep 3: Deploying FractionalCertificateToken contract...");
    const fractionTokenName = "Fractional Solar Certificate";
    const fractionTokenSymbol = "FSC";
    const totalFractions = ethers.parseEther("1000"); // 1000 fractions with 18 decimals
    
    try {
      fractionalToken = await FractionalCertificateToken.deploy(
        totalFractions,
        fractionTokenName,
        fractionTokenSymbol,
        await iReCCertificate.getAddress(),
        certificateTokenId,
        { gasLimit: 3000000 }
      );
      await fractionalToken.waitForDeployment();
      console.log(`FractionalCertificateToken deployed to: ${await fractionalToken.getAddress()}`);
    } catch (error) {
      console.error("FractionalCertificateToken deployment failed:", error.shortMessage || error.message);
      console.log("Skipping to Marketplace deployment...");
    }
  } else {
    console.log("\nSkipping FractionalCertificateToken deployment (certificate not minted)");
  }

  // Step 4: Deploy Marketplace contract (proceed regardless of previous steps)
  console.log("\nStep 4: Deploying Marketplace contract...");
  try {
    marketplace = await Marketplace.deploy(deployer.address, { gasLimit: 3000000 });
    await marketplace.waitForDeployment();
    console.log(`Marketplace deployed to: ${await marketplace.getAddress()}`);
  } catch (error) {
    console.error("Marketplace deployment failed:", error.shortMessage || error.message);
    console.log("Exiting deployment process...");
    return;
  }

  // Continue with fractionalization only if both certificate was minted and fractional token deployed
  if (certificateMinted && fractionalToken) {
    // Step 5: Approve and fractionalize the certificate
    console.log("\nStep 5: Approving and fractionalizing the certificate...");
    try {
      // Approve the FractionalCertificateToken contract to transfer the NFT
      const approveTx = await iReCCertificate.approve(
        await fractionalToken.getAddress(), 
        certificateTokenId,
        { gasLimit: 200000 }
      );
      await approveTx.wait();
      console.log("Certificate approved for fractionalization");
      
      // Fractionalize the certificate
      const fractionalizeTx = await fractionalToken.fractionalizeCertificate({ gasLimit: 300000 });
      await fractionalizeTx.wait();
      console.log("Certificate successfully fractionalized");

      // Step 6: List some fractions on the marketplace (for demonstration)
      console.log("\nStep 6: Preparing to list fractions on marketplace...");
      // Amount to list (50% of total supply)
      const totalFractions = ethers.parseEther("1000");
      const amountToList = totalFractions / 2n;
      const pricePerToken = ethers.parseEther("0.0001"); // 0.0001 ETH per token
      
      // Approve marketplace to transfer fractional tokens
      const tokenApproveTx = await fractionalToken.approve(
        await marketplace.getAddress(), 
        amountToList,
        { gasLimit: 200000 }
      );
      await tokenApproveTx.wait();
      console.log(`Approved marketplace to transfer ${ethers.formatEther(amountToList)} fractional tokens`);
      
      // List tokens on marketplace
      const listTx = await marketplace.listTokens(
        await fractionalToken.getAddress(),
        amountToList,
        pricePerToken,
        { gasLimit: 300000 }
      );
      await listTx.wait();
      console.log(`Listed ${ethers.formatEther(amountToList)} fractional tokens at ${ethers.formatEther(pricePerToken)} ETH each`);
    } catch (error) {
      console.error("Error in fractionalization or listing process:", error.shortMessage || error.message);
    }
  } else {
    console.log("\nSkipping fractionalization and listing (prerequisites not met)");
  }

  // Verify contracts on etherscan (if not on local network)
  try {
    const network = await ethers.provider.getNetwork();
    if (network.name !== "hardhat" && network.name !== "localhost") {
      console.log("\nWaiting for block confirmations before verification...");
      
      // Wait for 5 more blocks for confirmation
      await new Promise(r => setTimeout(r, 60000)); // Wait approx 1 min (5 blocks)
      
      console.log("Verifying contracts on Etherscan...");
      
      // Verify IReCCertificate
      await hre.run("verify:verify", {
        address: await iReCCertificate.getAddress(),
        constructorArguments: [certificateName, certificateSymbol, baseURI],
      });
      
      // Verify FractionalCertificateToken if deployed
      if (fractionalToken) {
        await hre.run("verify:verify", {
          address: await fractionalToken.getAddress(),
          constructorArguments: [
            ethers.parseEther("1000"),
            "Fractional Solar Certificate",
            "FSC",
            await iReCCertificate.getAddress(),
            certificateTokenId
          ],
        });
      }
      
      // Verify Marketplace
      await hre.run("verify:verify", {
        address: await marketplace.getAddress(),
        constructorArguments: [deployer.address],
      });
    }
  } catch (error) {
    console.error("Verification error:", error.shortMessage || error.message);
  }

  // Output deployment summary
  console.log("\nDeployment Summary:");
  console.log("------------------");
  console.log(`IReCCertificate:           ${await iReCCertificate.getAddress()}`);
  if (fractionalToken) {
    console.log(`FractionalCertificateToken: ${await fractionalToken.getAddress()}`);
  } else {
    console.log("FractionalCertificateToken: Not deployed");
  }
  console.log(`Marketplace:               ${await marketplace.getAddress()}`);
  console.log("------------------");
  
  // Output contract addresses in JSON format for easy copying
  const deploymentInfo = {
    iRecCertificate: await iReCCertificate.getAddress(),
    marketplace: await marketplace.getAddress(),
  };
  
  if (fractionalToken) {
    deploymentInfo.fractionalToken = await fractionalToken.getAddress();
  }
  
  if (certificateMinted) {
    deploymentInfo.deployedCertificateId = certificateTokenId;
  }
  
  console.log("\nContract addresses in JSON format:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);

});
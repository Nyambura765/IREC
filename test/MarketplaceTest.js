const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", function () {
  let IReCCertificate;
  let irecCertificate;
  let FractionalCertificateToken;
  let fractionalToken;
  let Marketplace;
  let marketplace;
  let owner;
  let seller;
  let buyer;
  let addrs;

  // Test data
  const certName = "I-REC Certificate";
  const certSymbol = "IREC";
  const baseURI = "https://irec.example.com/metadata/";
  const facilityName = "Solar Farm Alpha";
  const energySource = "Solar";
  const productionDate = Math.floor(Date.now() / 1000);
  const expiryDate = Math.floor(Date.now() / 1000) + 31536000; // One year from now
  const certTokenId = 1;
  
  // Fractional token data
  const fractionName = "Fractional Solar Certificate";
  const fractionSymbol = "FSC";
  
  // Reduce token amounts to avoid balance issues
  const totalFractions = ethers.parseEther("10"); // 10 tokens with 18 decimals
  const listingAmount = ethers.parseEther("5"); // List 5 tokens
  const pricePerToken = ethers.parseUnits("0.0000001", "gwei"); // Price in gwei (0.0000001 ETH)
  const purchaseAmount = ethers.parseEther("1"); // Buy 2 tokens

  beforeEach(async function () {
    // Get signers
    [owner, seller, buyer, ...addrs] = await ethers.getSigners();

    // Deploy I-REC Certificate contract
    IReCCertificate = await ethers.getContractFactory("IReCCertificate");
    irecCertificate = await IReCCertificate.deploy(certName, certSymbol, baseURI);
    await irecCertificate.waitForDeployment();

    // Mint an I-REC certificate to seller
    await irecCertificate.mintCertificate(
      seller.address,
      "token1",
      facilityName,
      energySource,
      productionDate,
      expiryDate,
      certTokenId
    );

    // Deploy FractionalCertificateToken contract
    FractionalCertificateToken = await ethers.getContractFactory("FractionalCertificateToken");
    fractionalToken = await FractionalCertificateToken.connect(seller).deploy(
      totalFractions,
      fractionName,
      fractionSymbol,
      await irecCertificate.getAddress(),
      certTokenId
    );
    await fractionalToken.waitForDeployment();

    // Approve and fractionalize the certificate
    await irecCertificate.connect(seller).approve(await fractionalToken.getAddress(), certTokenId);
    await fractionalToken.connect(seller).fractionalizeCertificate();

    // Deploy Marketplace contract
    Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy(owner.address);
    await marketplace.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await marketplace.owner()).to.equal(owner.address);
    });
  });

  describe("Listing tokens", function () {
    it("Should allow seller to list tokens", async function () {
      // Approve marketplace to spend tokens
      await fractionalToken.connect(seller).approve(await marketplace.getAddress(), listingAmount);

      // List tokens
      const tx = await marketplace.connect(seller).listTokens(
        await fractionalToken.getAddress(),
        listingAmount,
        pricePerToken
      );

      // Check the listing is created correctly
      const listing = await marketplace.getListing(await fractionalToken.getAddress(), seller.address);
      expect(listing.sellerAddress).to.equal(seller.address);
      expect(listing.pricePerToken).to.equal(pricePerToken);
      expect(listing.amountAvailable).to.equal(listingAmount);

      // Check event emission
      await expect(tx)
        .to.emit(marketplace, "Listed")
        .withArgs(await fractionalToken.getAddress(), seller.address, listingAmount, pricePerToken);
    });

    it("Should revert if amount or price is zero", async function () {
      await fractionalToken.connect(seller).approve(await marketplace.getAddress(), listingAmount);

      await expect(
        marketplace.connect(seller).listTokens(await fractionalToken.getAddress(), 0, pricePerToken)
      ).to.be.revertedWith("Invalid inputs");

      await expect(
        marketplace.connect(seller).listTokens(await fractionalToken.getAddress(), listingAmount, 0)
      ).to.be.revertedWith("Invalid inputs");
    });

    it("Should revert if marketplace is not approved", async function () {
      // No approval given
      await expect(
        marketplace.connect(seller).listTokens(await fractionalToken.getAddress(), listingAmount, pricePerToken)
      ).to.be.revertedWith("Marketplace not approved");
    });

    it("Should revert if seller has insufficient balance", async function () {
      // Approve marketplace
      await fractionalToken.connect(seller).approve(await marketplace.getAddress(), ethers.parseEther("20"));

      // Try to list more than total supply
      await expect(
        marketplace.connect(seller).listTokens(
          await fractionalToken.getAddress(),
          ethers.parseEther("11"), // One more than total supply
          pricePerToken
        )
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Buying tokens", function () {
    beforeEach(async function () {
      // Approve marketplace and list tokens
      await fractionalToken.connect(seller).approve(await marketplace.getAddress(), listingAmount);
      await marketplace.connect(seller).listTokens(
        await fractionalToken.getAddress(),
        listingAmount,
        pricePerToken
      );
    });

    it("Should allow buyer to purchase tokens", async function () {
      const totalCost = BigInt(pricePerToken) * BigInt(purchaseAmount);
      const sellerInitialBalance = await ethers.provider.getBalance(seller.address);
      const buyerInitialTokenBalance = await fractionalToken.balanceOf(buyer.address);

      // Buy tokens
      const tx = await marketplace.connect(buyer).buyTokens(
        await fractionalToken.getAddress(),
        seller.address,
        purchaseAmount,
        { value: totalCost }
      );

      // Check token balances
      expect(await fractionalToken.balanceOf(buyer.address)).to.equal(buyerInitialTokenBalance + purchaseAmount);

      // Check listing was updated
      const listing = await marketplace.getListing(await fractionalToken.getAddress(), seller.address);
      expect(listing.amountAvailable).to.equal(listingAmount - purchaseAmount);

      // Verify seller received payment
      const sellerFinalBalance = await ethers.provider.getBalance(seller.address);
      // Use a rough comparison due to potential gas fee variations
      expect(sellerFinalBalance > sellerInitialBalance).to.be.true;

      // Check event emission
      await expect(tx)
        .to.emit(marketplace, "Purchased")
        .withArgs(await fractionalToken.getAddress(), buyer.address, purchaseAmount, totalCost);
    });

    it("Should revert if trying to buy more than available", async function () {
      const excessAmount = listingAmount + ethers.parseEther("0.1");
      
      // We need to calculate cost first
      const totalCost = BigInt(pricePerToken) * BigInt(excessAmount);

      await expect(
        marketplace.connect(buyer).buyTokens(
          await fractionalToken.getAddress(),
          seller.address,
          excessAmount,
          { value: totalCost }
        )
      ).to.be.revertedWith("Not enough tokens listed");
    });

    it("Should revert if insufficient ETH sent", async function () {
      const totalCost = BigInt(pricePerToken) * BigInt(purchaseAmount);
      const insufficientAmount = totalCost - 1n;

      await expect(
        marketplace.connect(buyer).buyTokens(
          await fractionalToken.getAddress(),
          seller.address,
          purchaseAmount,
          { value: insufficientAmount }
        )
      ).to.be.revertedWith("Insufficient ETH sent");
    });
  });

  describe("Cancelling listings", function () {
    beforeEach(async function () {
      // Approve marketplace and list tokens
      await fractionalToken.connect(seller).approve(await marketplace.getAddress(), listingAmount);
      await marketplace.connect(seller).listTokens(
        await fractionalToken.getAddress(),
        listingAmount,
        pricePerToken
      );
    });

    it("Should allow seller to cancel listing", async function () {
      const tx = await marketplace.connect(seller).cancelListing(await fractionalToken.getAddress());

      // Check listing was deleted
      const listing = await marketplace.getListing(await fractionalToken.getAddress(), seller.address);
      expect(listing.amountAvailable).to.equal(0);

      // Check event emission
      await expect(tx)
        .to.emit(marketplace, "ListingCancelled")
        .withArgs(await fractionalToken.getAddress(), seller.address);
    });

    it("Should revert if no listing exists", async function () {
      // Cancel first
      await marketplace.connect(seller).cancelListing(await fractionalToken.getAddress());

      // Try to cancel again
      await expect(
        marketplace.connect(seller).cancelListing(await fractionalToken.getAddress())
      ).to.be.revertedWith("No listing to cancel");
    });

    it("Should only allow seller to cancel their own listing", async function () {
      // Another address tries to cancel
      await expect(
        marketplace.connect(buyer).cancelListing(await fractionalToken.getAddress())
      ).to.be.revertedWith("No listing to cancel");
    });
  });

  describe("Viewing listings", function () {
    beforeEach(async function () {
      // Approve marketplace and list tokens
      await fractionalToken.connect(seller).approve(await marketplace.getAddress(), listingAmount);
      await marketplace.connect(seller).listTokens(
        await fractionalToken.getAddress(),
        listingAmount,
        pricePerToken
      );
    });

    it("Should return correct listing information", async function () {
      const listing = await marketplace.getListing(await fractionalToken.getAddress(), seller.address);
      
      expect(listing.sellerAddress).to.equal(seller.address);
      expect(listing.pricePerToken).to.equal(pricePerToken);
      expect(listing.amountAvailable).to.equal(listingAmount);
    });

    it("Should return empty listing for non-existent listings", async function () {
      const listing = await marketplace.getListing(await fractionalToken.getAddress(), buyer.address);
      
      expect(listing.sellerAddress).to.equal(ethers.ZeroAddress);
      expect(listing.pricePerToken).to.equal(0);
      expect(listing.amountAvailable).to.equal(0);
    });
  });
});
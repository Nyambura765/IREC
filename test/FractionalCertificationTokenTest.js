const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FractionalCertificateToken", function () {
  let IReCCertificate;
  let irecCertificate;
  let FractionalCertificateToken;
  let fractionalToken;
  let owner;
  let user1;
  let user2;
  let addrs;

  // Test data
  const certName = "I-REC Certificate";
  const certSymbol = "IREC";
  const baseURI = "https://irec.example.com/metadata/";
  const facilityName = "Wind Farm Beta";
  const energySource = "Wind";
  const productionDate = Math.floor(Date.now() / 1000);
  const expiryDate = Math.floor(Date.now() / 1000) + 31536000; // One year from now
  const certTokenId = 1;
  
  // Fractional token data
  const fractionName = "Fractional Wind Certificate";
  const fractionSymbol = "FWC";
  const totalFractions = ethers.parseEther("1000"); // 1000 tokens with 18 decimals

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, ...addrs] = await ethers.getSigners();

    // Deploy I-REC Certificate contract
    IReCCertificate = await ethers.getContractFactory("IReCCertificate");
    irecCertificate = await IReCCertificate.deploy(certName, certSymbol, baseURI);
    await irecCertificate.waitForDeployment();

    // Mint an I-REC certificate
    await irecCertificate.mintCertificate(
      owner.address,
      "token1",
      facilityName,
      energySource,
      productionDate,
      expiryDate,
      certTokenId
    );

    // Deploy FractionalCertificateToken contract
    FractionalCertificateToken = await ethers.getContractFactory("FractionalCertificateToken");
    fractionalToken = await FractionalCertificateToken.deploy(
      totalFractions,
      fractionName,
      fractionSymbol,
      await irecCertificate.getAddress(),
      certTokenId
    );
    await fractionalToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await fractionalToken.owner()).to.equal(owner.address);
    });

    it("Should set the correct name and symbol", async function () {
      expect(await fractionalToken.name()).to.equal(fractionName);
      expect(await fractionalToken.symbol()).to.equal(fractionSymbol);
    });

    it("Should mint the correct number of tokens to owner", async function () {
      expect(await fractionalToken.totalSupply()).to.equal(totalFractions);
      expect(await fractionalToken.balanceOf(owner.address)).to.equal(totalFractions);
    });

    it("Should store the certificate contract and token ID correctly", async function () {
      expect(await fractionalToken.iRecCertificateContract()).to.equal(await irecCertificate.getAddress());
      expect(await fractionalToken.certificateTokenId()).to.equal(certTokenId);
    });

    it("Should initialize with fractionalized state as false", async function () {
      expect(await fractionalToken.isFractionalized()).to.equal(false);
    });
  });

  describe("Fractionalizing certificate", function () {
    it("Should fractionalize the certificate successfully", async function () {
      // Approve the fractional contract to transfer the certificate
      await irecCertificate.approve(await fractionalToken.getAddress(), certTokenId);

      // Fractionalize the certificate
      const tx = await fractionalToken.fractionalizeCertificate();

      // Certificate should be transferred to fractional contract
      expect(await irecCertificate.ownerOf(certTokenId)).to.equal(await fractionalToken.getAddress());
      
      // isFractionalized should be set to true
      expect(await fractionalToken.isFractionalized()).to.equal(true);

      // Check event emission
      await expect(tx)
        .to.emit(fractionalToken, "CertificateFractionalized")
        .withArgs(certTokenId, totalFractions, owner.address);
    });

    it("Should revert if called by non-owner", async function () {
      await irecCertificate.approve(await fractionalToken.getAddress(), certTokenId);
      
      await expect(
        fractionalToken.connect(user1).fractionalizeCertificate()
      ).to.be.revertedWithCustomError(fractionalToken, "OwnableUnauthorizedAccount");
    });

    it("Should revert if certificate is already fractionalized", async function () {
      // Approve and fractionalize first time
      await irecCertificate.approve(await fractionalToken.getAddress(), certTokenId);
      await fractionalToken.fractionalizeCertificate();
      
      // Try to fractionalize again
      await expect(
        fractionalToken.fractionalizeCertificate()
      ).to.be.revertedWith("Certificate already fractionalized");
    });

    it("Should revert if not approved to transfer the certificate", async function () {
      // No approval given
      await expect(
        fractionalToken.fractionalizeCertificate()
      ).to.be.reverted; // Will revert with ERC721 transfer error
    });
  });

  describe("Token transfers", function () {
    beforeEach(async function () {
      // Approve and fractionalize
      await irecCertificate.approve(await fractionalToken.getAddress(), certTokenId);
      await fractionalToken.fractionalizeCertificate();
    });

    it("Should allow transfers of fractional tokens", async function () {
      const transferAmount = ethers.parseEther("100"); // 100 tokens
      
      await fractionalToken.transfer(user1.address, transferAmount);
      
      expect(await fractionalToken.balanceOf(user1.address)).to.equal(transferAmount);
      expect(await fractionalToken.balanceOf(owner.address)).to.equal(totalFractions - transferAmount);
    });

    it("Should allow approval and transferFrom of fractional tokens", async function () {
      const approvalAmount = ethers.parseEther("250"); // 250 tokens
      
      await fractionalToken.approve(user1.address, approvalAmount);
      expect(await fractionalToken.allowance(owner.address, user1.address)).to.equal(approvalAmount);
      
      await fractionalToken.connect(user1).transferFrom(owner.address, user2.address, approvalAmount);
      
      expect(await fractionalToken.balanceOf(user2.address)).to.equal(approvalAmount);
      expect(await fractionalToken.balanceOf(owner.address)).to.equal(totalFractions - approvalAmount);
    });
  });

  describe("getFractionInfo", function () {
    it("Should return the correct fraction information", async function () {
      const fractionInfo = await fractionalToken.getFractionInfo();
      
      expect(fractionInfo.nftAddress).to.equal(await irecCertificate.getAddress());
      expect(fractionInfo.tokenId).to.equal(certTokenId);
      expect(fractionInfo.totalFractions).to.equal(totalFractions);
      expect(fractionInfo.ownerAddress).to.equal(owner.address);
    });
  });

  describe("ERC20Permit functionality", function () {
    it("Should support permit function for gasless approvals", async function () {
      const permitAmount = ethers.parseEther("500");
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      // This would typically involve signing a permit message
      // For testing purposes, we can verify the function exists
      expect(fractionalToken.permit).to.be.a('function');
    });
  });

  describe("ERC721Holder compatibility", function () {
    it("Should properly receive ERC721 tokens", async function () {
      // Mint another certificate
      const newTokenId = 2;
      await irecCertificate.mintCertificate(
        owner.address,
        "token2",
        facilityName,
        energySource,
        productionDate,
        expiryDate,
        newTokenId
      );

      // Send directly to the fractional contract (should not revert thanks to ERC721Holder)
      await irecCertificate.safeTransferFrom(
        owner.address, 
        await fractionalToken.getAddress(), 
        newTokenId
      );

      // Verify the fractional contract now owns the token
      expect(await irecCertificate.ownerOf(newTokenId)).to.equal(await fractionalToken.getAddress());
    });
  });
});
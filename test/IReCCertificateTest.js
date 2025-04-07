const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IReCCertificate", function () {
  let IReCCertificate;
  let irecCertificate;
  let owner;
  let recipient;
  let addr2;
  let addrs;
  
  // Test data
  const name = "I-REC Certificate";
  const symbol = "IREC";
  const baseURI = "https://irec.example.com/metadata/";
  const facilityName = "Solar Farm Alpha";
  const energySource = "Solar";
  const productionDate = Math.floor(Date.now() / 1000); // Current timestamp
  const expiryDate = Math.floor(Date.now() / 1000) + 31536000; // One year from now
  const tokenId = 1;

  beforeEach(async function () {
    // Get signers
    [owner, recipient, addr2, ...addrs] = await ethers.getSigners();

    // Deploy contract
    IReCCertificate = await ethers.getContractFactory("IReCCertificate");
    irecCertificate = await IReCCertificate.deploy(name, symbol, baseURI);
    await irecCertificate.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await irecCertificate.owner()).to.equal(owner.address);
    });

    it("Should set the correct name and symbol", async function () {
      expect(await irecCertificate.name()).to.equal(name);
      expect(await irecCertificate.symbol()).to.equal(symbol);
    });
  });

  describe("Base URI", function () {
    it("Should set the base URI correctly", async function () {
      const newBaseURI = "https://new.irec.example.com/metadata/";
      await irecCertificate.setBaseURI(newBaseURI);
      
      // There's no direct getter for baseURI in the contract, 
      // so we mint a token and check its tokenURI
      await irecCertificate.mintCertificate(
        recipient.address,
        "token1",
        facilityName,
        energySource,
        productionDate,
        expiryDate,
        tokenId
      );
      
      expect(await irecCertificate.tokenURI(tokenId)).to.equal(newBaseURI + "token1");
    });

    it("Should only allow owner to set base URI", async function () {
      await expect(
        irecCertificate.connect(addr2).setBaseURI("https://hacked.com/")
      ).to.be.revertedWithCustomError(irecCertificate, "OwnableUnauthorizedAccount");
    });
  });

  describe("Minting certificates", function () {
    it("Should mint a certificate correctly", async function () {
      const tx = await irecCertificate.mintCertificate(
        recipient.address,
        "token1",
        facilityName,
        energySource,
        productionDate,
        expiryDate,
        tokenId
      );

      // Check ownership
      expect(await irecCertificate.ownerOf(tokenId)).to.equal(recipient.address);
      
      // Check certificate data
      const certData = await irecCertificate.certificates(tokenId);
      expect(certData.facilityName).to.equal(facilityName);
      expect(certData.energySource).to.equal(energySource);
      expect(certData.productionDate).to.equal(productionDate);
      expect(certData.expiryDate).to.equal(expiryDate);
      expect(certData.energyAmount).to.equal(1000000); // 1 MWh = 1,000,000 Wh
      
      // Check event emission
      await expect(tx)
        .to.emit(irecCertificate, "CertificateMinted")
        .withArgs(tokenId, recipient.address, 1000000);
    });

    it("Should only allow owner to mint certificates", async function () {
      await expect(
        irecCertificate.connect(addr2).mintCertificate(
          recipient.address,
          "token1",
          facilityName,
          energySource,
          productionDate,
          expiryDate,
          tokenId
        )
      ).to.be.revertedWithCustomError(irecCertificate, "OwnableUnauthorizedAccount");
    });
  });

  describe("Getting certificate details", function () {
    beforeEach(async function () {
      await irecCertificate.mintCertificate(
        recipient.address,
        "token1",
        facilityName,
        energySource,
        productionDate,
        expiryDate,
        tokenId
      );
    });

    it("Should return correct certificate details for the owner", async function () {
      const details = await irecCertificate.connect(recipient).getCertificateDetails(tokenId);
      
      expect(details.facilityName).to.equal(facilityName);
      expect(details.energySource).to.equal(energySource);
      expect(details.productionDate).to.equal(productionDate);
      expect(details.expiryDate).to.equal(expiryDate);
      expect(details.energyAmount).to.equal(1000000);
      expect(details.owner).to.equal(recipient.address);
    });

    it("Should revert when non-owner requests certificate details", async function () {
      await expect(
        irecCertificate.connect(addr2).getCertificateDetails(tokenId)
      ).to.be.revertedWith("Certificate does not exist");
    });
  });

  describe("Burning certificates", function () {
    beforeEach(async function () {
      await irecCertificate.mintCertificate(
        recipient.address,
        "token1",
        facilityName,
        energySource,
        productionDate,
        expiryDate,
        tokenId
      );
    });

    it("Should burn a certificate correctly", async function () {
      const tx = await irecCertificate.connect(recipient).burnCertificate(tokenId);
      
      // Check event emission
      await expect(tx)
        .to.emit(irecCertificate, "CertificateBurned")
        .withArgs(tokenId, recipient.address, 1000000);
      
      // Check that token no longer exists
      await expect(irecCertificate.ownerOf(tokenId)).to.be.reverted;
      
      // Certificate data should be deleted
      const certData = await irecCertificate.certificates(tokenId);
      expect(certData.facilityName).to.equal("");
      expect(certData.energyAmount).to.equal(0);
    });

    it("Should only allow token owner to burn certificates", async function () {
      await expect(
        irecCertificate.connect(addr2).burnCertificate(tokenId)
      ).to.be.revertedWith("IReCCertificate: caller is not owner nor approved");
    });
  });

  describe("ERC721 compliance", function () {
    beforeEach(async function () {
      await irecCertificate.mintCertificate(
        recipient.address,
        "token1",
        facilityName,
        energySource,
        productionDate,
        expiryDate,
        tokenId
      );
    });

    it("Should support ERC721 interface", async function () {
      // ERC721 interface ID: 0x80ac58cd
      const isERC721 = await irecCertificate.supportsInterface("0x80ac58cd");
      expect(isERC721).to.be.true;
    });

    it("Should allow transfers of certificates", async function () {
      await irecCertificate.connect(recipient).transferFrom(recipient.address, addr2.address, tokenId);
      expect(await irecCertificate.ownerOf(tokenId)).to.equal(addr2.address);
    });
  });
});
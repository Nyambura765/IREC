// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
/**
 * @title IReCCertificate
 * @dev Contract for creating I-REC certificates as NFTs (ERC-721)
 */
contract IReCCertificate is ERC721URIStorage, Ownable {
    
    // Certificate metadata
    struct CertificateData {
        string facilityName;
        string energySource;
        uint256 productionDate;
        uint256 expiryDate;
        uint256 energyAmount; // in Wh (1 MWh = 1,000,000 Wh)
    }
    
    mapping(uint256 => CertificateData) public certificates;
    mapping(uint256 => address) private tokenIdOwner;
    
    // Events
    event CertificateMinted(uint256 tokenId, address owner, uint256 energyAmount);
    event CertificateBurned(uint256 tokenId, address burner, uint256 energyAmount);
    event CertificateDetailsUpdated(uint256 tokenId);

    

    
    string private baseURIValue;

    constructor(string memory name, string memory symbol, string memory initialBaseURI) ERC721(name, symbol) Ownable(msg.sender) {
        baseURIValue = initialBaseURI;
    }

    /**
     * @dev Override the _baseURI() function from ERC721
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURIValue;
    }

    /**
     * @dev Function to update the base URI if needed
     */
    function setBaseURI(string memory newBaseURI) public onlyOwner {
        baseURIValue = newBaseURI;
    }

    /**
     * @dev Creates a new I-REC certificate as an NFT
     */
    function mintCertificate(
        address recipient,
        string memory baseURI,
        string memory facilityName,
        string memory energySource,
        uint256 productionDate,
        uint256 expiryDate,
        uint256 newItemId
    ) public onlyOwner returns (uint256) {
        
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, baseURI);
        
        // Store certificate data (1 MWh = 1,000,000 Wh)
        certificates[newItemId] = CertificateData({
            facilityName: facilityName,
            energySource: energySource,
            productionDate: productionDate,
            expiryDate: expiryDate,
            energyAmount: 1000000 // 1 MWh in Wh
        });

        // Store token ID to the certificate data
        tokenIdOwner[newItemId] = recipient;
        
        emit CertificateMinted(newItemId, recipient, 1000000);
        
        return newItemId;
    }
    
    /**
     * @dev Burns (destroys) an I-REC certificate
     * @param tokenId The ID of the token to burn
     * Requirements:
     * - The caller must own the token or be an approved operator
     */
    function burnCertificate(uint256 tokenId) public {
        require(msg.sender == tokenIdOwner[tokenId], "IReCCertificate: caller is not owner nor approved");
        
        // Get certificate data before burning for the event
        uint256 energyAmount = certificates[tokenId].energyAmount;
        
        // Delete certificate data
        delete certificates[tokenId];
        
        // Burn the token
        _burn(tokenId);
        
        // Emit burn event
        emit CertificateBurned(tokenId, msg.sender, energyAmount);
    }

    /**
     * @dev Returns the complete details of a certificate
     * @param tokenId The ID of the certificate to query
     */
    function getCertificateDetails(uint256 tokenId) public view returns (
        string memory facilityName,
        string memory energySource,
        uint256 productionDate,
        uint256 expiryDate,
        uint256 energyAmount,
        address owner
    ) {
        require(tokenIdOwner[tokenId] != address(0), "Certificate does not exist");
        
        CertificateData memory certData = certificates[tokenId];
        
        return (
            certData.facilityName,
            certData.energySource,
            certData.productionDate,
            certData.expiryDate,
            certData.energyAmount,
            ownerOf(tokenId)
        );
    }
}
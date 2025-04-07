// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";


contract FractionalCertificateToken is ERC20, Ownable, ERC20Permit, ERC721Holder {

    // The IReCCertificate NFT contract (ERC-721)
    IERC721 public immutable iRecCertificateContract;

    
    uint256 public immutable certificateTokenId;
    bool public isFractionalized;

    // Event emitted when NFT is locked and fractions minted
    event CertificateFractionalized(uint256 tokenId, uint256 totalFractions, address indexed initiator);

    constructor(
        uint256 totalFractions,
        string memory tokenName,
        string memory tokenSymbol,
        address certificateContractAddress,
        uint256 certificateTokenId_
    ) ERC20(tokenName, tokenSymbol) ERC20Permit(tokenName) Ownable(msg.sender) {
        iRecCertificateContract = IERC721(certificateContractAddress);
        certificateTokenId = certificateTokenId_;

        _mint(msg.sender, totalFractions);
    }

    /**
     * @dev Locks the NFT (green energy certificate) inside this contract to fractionalize it.
     */
    function fractionalizeCertificate() external onlyOwner {
        require(!isFractionalized, "Certificate already fractionalized");

        // Transfer certificate NFT to this contract (lock)
        iRecCertificateContract.safeTransferFrom(msg.sender, address(this), certificateTokenId);

        isFractionalized = true;

        emit CertificateFractionalized(certificateTokenId, totalSupply(), msg.sender);
    }

    /**
     * @dev Returns information about the fractionalized certificate
     */
    function getFractionInfo() external view returns (
        address nftAddress,
        uint256 tokenId,
        uint256 totalFractions,
        address ownerAddress
    ) {
        return (
            address(iRecCertificateContract),
            certificateTokenId,
            totalSupply(),
            owner()
        );
    }
}

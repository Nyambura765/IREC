// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./FractionalCertificateToken.sol";
import  "./IReCCertificate.sol";


contract Marketplace is Ownable, ReentrancyGuard  {
    struct Listing {
        address seller;
        uint256 pricePerToken; // in wei
        uint256 amountAvailable;
    }

    // Mapping: ERC20 token address => seller => Listing
    mapping(address => mapping(address => Listing)) public listings;

    event Listed(address indexed token, address indexed seller, uint256 amount, uint256 pricePerToken);
    event Purchased(address indexed token, address indexed buyer, uint256 amount, uint256 totalCost);
    event Withdrawn(address indexed seller, uint256 amount);
    event ListingCancelled(address indexed token, address indexed seller);
    // Constructor 
    constructor(address initialOwner) Ownable(initialOwner) {}


    /**
     * @dev Seller lists their fractional tokens
     */
    function listTokens(
        address tokenAddress,
        uint256 amount,
        uint256 pricePerToken
    ) external {
        require(amount > 0 && pricePerToken > 0, "Invalid inputs");

        IERC20 token = IERC20(tokenAddress);
        require(token.allowance(msg.sender, address(this)) >= amount, "Marketplace not approved");
        require(token.balanceOf(msg.sender) >= amount, "Insufficient balance");

        listings[tokenAddress][msg.sender] = Listing(msg.sender, pricePerToken, amount);

        emit Listed(tokenAddress, msg.sender, amount, pricePerToken);
    }

    /**
     * @dev Buyer buys `amountToBuy` of fractional tokens
     */
    function buyTokens(address tokenAddress, address seller, uint256 amountToBuy) external payable nonReentrant {
        Listing storage item = listings[tokenAddress][seller];
        require(item.amountAvailable >= amountToBuy, "Not enough tokens listed");
        
        uint256 totalCost = item.pricePerToken * amountToBuy;
        require(msg.value >= totalCost, "Insufficient ETH sent");

        // Transfer ERC20 tokens from seller to buyer
        IERC20(tokenAddress).transferFrom(item.seller, msg.sender, amountToBuy);

        // Reduce the listing's available amount
        item.amountAvailable -= amountToBuy;

        // Send ETH to seller
        (bool sent, ) = payable(item.seller).call{value: totalCost}("");
        require(sent, "ETH transfer failed");

        emit Purchased(tokenAddress, msg.sender, amountToBuy, totalCost);
    }

    /**
     * @dev Cancel listing
     */
    function cancelListing(address tokenAddress) external {
        Listing storage item = listings[tokenAddress][msg.sender];
        require(item.amountAvailable > 0, "No listing to cancel");

        delete listings[tokenAddress][msg.sender];

        emit ListingCancelled(tokenAddress, msg.sender);
    }

    /**
     * @dev Returns listing details for UI
     */
    function getListing(address tokenAddress, address seller) external view returns (
        address sellerAddress,
        uint256 pricePerToken,
        uint256 amountAvailable
    ) {
        Listing memory l = listings[tokenAddress][seller];
        return (l.seller, l.pricePerToken, l.amountAvailable);
    }
}

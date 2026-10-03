// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts@5.0.2/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts@5.0.2/token/common/ERC2981.sol";
import "@openzeppelin/contracts@5.0.2/access/Ownable2Step.sol";
import "@openzeppelin/contracts@5.0.2/access/Ownable.sol";
import "@openzeppelin/contracts@5.0.2/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts@5.0.2/utils/Strings.sol";

/// @notice IDs 1..5000, with externally prepared immutable artwork metadata.
contract NazcaCats is ERC721, ERC2981, Ownable2Step, ReentrancyGuard {
    using Strings for uint256;
    uint256 public constant MAX_SUPPLY = 5000;
    uint256 public constant MAX_BATCH = 20;
    uint256 public totalMinted;
    uint256 public mintBaseValue;
    uint96 public constant FEE_BPS = 1000;
    address payable public immutable projectTreasury;
    bool public saleActive;
    bool public metadataFrozen;
    string public baseTokenURI;
    bytes32 public collectionManifestHash;

    error InvalidQuantity();
    error SoldOut();
    error SaleClosed();
    error WrongPayment();
    error InvalidURI();
    error Frozen();
    error WithdrawalFailed();
    error InvalidRecipient();
    event SaleConfigured(bool active, uint256 price);
    event MetadataConfigured(string baseURI, bytes32 manifestHash);
    event MetadataFrozen(string baseURI, bytes32 manifestHash);
    // ERC-4906 metadata update notification.
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

    constructor(address initialOwner, address payable treasury,
        string memory initialBaseURI, uint256 initialBaseValue)
        ERC721("Nazca Cats", "NAZCA") Ownable(initialOwner)
    {
        _validateURI(initialBaseURI);
        baseTokenURI = initialBaseURI;
        if (treasury == address(0)) revert InvalidRecipient();
        projectTreasury = treasury;
        mintBaseValue = initialBaseValue;
        _setDefaultRoyalty(initialOwner, FEE_BPS);
    }

    function mint(uint256 quantity) external payable nonReentrant {
        if (!saleActive) revert SaleClosed();
        if (quantity == 0 || quantity > MAX_BATCH) revert InvalidQuantity();
        if (msg.value != mintFee() * quantity) revert WrongPayment();
        _mintBatch(msg.sender, quantity);
    }

    /// @notice Owner allocations pay the same project fee and count toward the same cap.
    function ownerMint(address recipient, uint256 quantity) external payable onlyOwner nonReentrant {
        if (quantity == 0 || quantity > MAX_BATCH) revert InvalidQuantity();
        if (msg.value != mintFee() * quantity) revert WrongPayment();
        _mintBatch(recipient, quantity);
    }

    function _mintBatch(address recipient, uint256 quantity) private {
        if (recipient == address(0)) revert InvalidRecipient();
        uint256 first = totalMinted + 1;
        uint256 end = totalMinted + quantity;
        if (end > MAX_SUPPLY) revert SoldOut();
        // Reserve the entire batch before any receiver callback.
        totalMinted = end;
        for (uint256 id = first; id <= end; ++id) _safeMint(recipient, id);
    }

    /// @notice Art price is zero; only the 10% project fee is collected.
    /// @dev Round up to avoid silently waiving fees for tiny base values.
    function mintFee() public view returns (uint256) {
        return mintBaseValue / 10 + (mintBaseValue % 10 == 0 ? 0 : 1);
    }

    function configureSale(bool active, uint256 baseValue) external onlyOwner {
        saleActive = active;
        mintBaseValue = baseValue;
        emit SaleConfigured(active, baseValue);
    }

    /// @notice URI must end in '/'; tokenURI is base + decimal ID + '.json'.
    function configureMetadata(string calldata uri, bytes32 manifestHash) external onlyOwner {
        if (metadataFrozen) revert Frozen();
        _validateURI(uri);
        baseTokenURI = uri;
        collectionManifestHash = manifestHash;
        emit MetadataConfigured(uri, manifestHash);
        if (totalMinted > 0) emit BatchMetadataUpdate(1, totalMinted);
    }

    /// @notice Irreversible. The hash commits to the manifest but does not validate images on chain.
    function freezeMetadata() external onlyOwner {
        if (metadataFrozen) revert Frozen();
        if (collectionManifestHash == bytes32(0)) revert InvalidURI();
        metadataFrozen = true;
        emit MetadataFrozen(baseTokenURI, collectionManifestHash);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat(baseTokenURI, tokenId.toString(), ".json");
    }

    function withdraw() external nonReentrant {
        (bool ok,) = projectTreasury.call{value: address(this).balance}("");
        if (!ok) revert WithdrawalFailed();
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981)
        returns (bool)
    {
        return interfaceId == 0x49064906 || super.supportsInterface(interfaceId);
    }

    function _validateURI(string memory uri) private pure {
        bytes memory value = bytes(uri);
        if (value.length == 0 || value[value.length - 1] != bytes1('/')) revert InvalidURI();
    }
}

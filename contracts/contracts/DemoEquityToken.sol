// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Supply} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {ERC1155Pausable} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DemoEquityToken
 * @notice Token de DEMONSTRATION multi-actifs (ERC-1155). Chaque identifiant
 *         de token correspond a un actif du catalogue (1 = dAAPL, 2 = dMSFT,
 *         6 = dMC.PA, 11 = d7203.T, ...), ce qui evite de deployer un contrat
 *         ERC-20 par action.
 *
 *         CE TOKEN N'EST PAS UNE ACTION. Il ne confere aucun droit de
 *         propriete, de vote ou de dividende sur une entreprise cotee, et ne
 *         constitue pas un instrument financier. Reseau de test uniquement.
 *
 * @dev    Base exclusivement sur OpenZeppelin 5.x (aucune cryptographie
 *         maison) : ERC1155 + Supply (suivi des quantites emises par actif,
 *         utilise pour le rapprochement reserves/tokens) + Pausable (arret
 *         d'urgence) + AccessControl (roles operes par le back-office).
 */
contract DemoEquityToken is ERC1155, ERC1155Supply, ERC1155Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Avertissement permanent, lisible on-chain.
    string public constant DISCLAIMER =
        "Demo token - not a share, not a financial instrument, no ownership rights. Testnet only.";

    string public constant name = "Demo Tokenized Equities";
    string public constant symbol = "dEQT";

    event Minted(address indexed to, uint256 indexed id, uint256 amount, address indexed operator);
    event Burned(address indexed from, uint256 indexed id, uint256 amount, address indexed operator);

    constructor(string memory uri_, address admin) ERC1155(uri_) {
        require(admin != address(0), "DemoEquityToken: admin is zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    /**
     * @notice Emet `amount` tokens `id` directement vers le wallet du client.
     * @dev    Reserve au back-office (MINTER_ROLE). L'idempotence est geree
     *         hors chaine (cle unique en base) ; le contrat reste minimal.
     */
    function mint(address to, uint256 id, uint256 amount, bytes memory data)
        external
        onlyRole(MINTER_ROLE)
    {
        require(amount > 0, "DemoEquityToken: amount is zero");
        _mint(to, id, amount, data);
        emit Minted(to, id, amount, _msgSender());
    }

    /**
     * @notice Detruit `amount` tokens `id` depuis le wallet `from` (rachat /
     *         vente cote demandee par le detenteur).
     * @dev    Reserve au back-office (MINTER_ROLE), sans approbation
     *         prealable du detenteur : symetrique du mint, qui cree deja des
     *         tokens directement dans le wallet du client sans son
     *         intervention on-chain. Coherent avec le modele de confiance
     *         deja en place (le back-office est deja custodial de fait pour
     *         l'emission).
     */
    function burnFrom(address from, uint256 id, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
    {
        require(amount > 0, "DemoEquityToken: amount is zero");
        _burn(from, id, amount);
        emit Burned(from, id, amount, _msgSender());
    }

    /// @notice Emission par lots (operations d'administration).
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        external
        onlyRole(MINTER_ROLE)
    {
        _mintBatch(to, ids, amounts, data);
    }

    /// @notice Met a jour l'URI des metadonnees ({id} substitue par le token id).
    function setURI(string memory newUri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newUri);
    }

    /// @notice Gel d'urgence de tous les transferts.
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // --- Overrides requis par l'heritage multiple (OpenZeppelin 5.x) ---

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155, ERC1155Supply, ERC1155Pausable)
    {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

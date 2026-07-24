/**
 * Configuration Hardhat (JavaScript pur — évite la dépendance ts-node, source
 * d'incompatibilités selon la version de Node).
 */
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Clé du DÉPLOYEUR — jamais une clé d'utilisateur. Sur mainnet elle détient de
// vrais fonds (gas) et devient admin/minter du contrat : clé dédiée, jamais
// réutilisée, stockée hors du dépôt.
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.24",
    // OpenZeppelin 5.x utilise l'opcode mcopy (EVM Cancun). Base (mainnet, via
    // l'upgrade Ecotone) et les testnets Base/Ethereum Sepolia le supportent.
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  networks: {
    base: {
      url: process.env.RPC_URL || "https://mainnet.base.org",
      chainId: 8453,
      accounts,
    },
    baseSepolia: {
      url: process.env.RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts,
    },
    sepolia: {
      url: process.env.RPC_URL || "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts,
    },
  },
};

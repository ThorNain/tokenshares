/**
 * Configuration Hardhat (JavaScript pur — évite la dépendance ts-node, source
 * d'incompatibilités selon la version de Node).
 */
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Clé du DÉPLOYEUR — testnet uniquement, jamais une clé détenant des fonds
// réels, jamais une clé d'utilisateur.
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.24",
    // OpenZeppelin 5.x utilise l'opcode mcopy (EVM Cancun). Base Sepolia et
    // Ethereum Sepolia le supportent.
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  networks: {
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

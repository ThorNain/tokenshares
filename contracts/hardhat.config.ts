import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Clé du DEPLOYEUR — testnet uniquement, jamais une clé détenant des fonds
// réels, jamais une clé d'utilisateur.
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    baseSepolia: {
      url: process.env.RPC_URL ?? "https://sepolia.base.org",
      chainId: 84532,
      accounts,
    },
    sepolia: {
      url: process.env.RPC_URL ?? "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts,
    },
  },
};

export default config;

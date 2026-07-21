/**
 * Déploiement du contrat DemoEquityToken sur un testnet EVM (JavaScript pur).
 *
 *   cd contracts
 *   npm install
 *   cp .env.example .env   # RPC_URL + DEPLOYER_PRIVATE_KEY (testnet !)
 *   npm run deploy:base-sepolia
 */
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("Aucun signataire : renseignez DEPLOYER_PRIVATE_KEY dans contracts/.env");
  }
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Déploiement avec le compte : ${deployer.address}`);
  console.log(`Solde : ${ethers.formatEther(balance)} ETH`);

  const metadataUri =
    process.env.TOKEN_METADATA_URI || "https://example.test/api/token-metadata/{id}.json";
  const factory = await ethers.getContractFactory("DemoEquityToken");
  const contract = await factory.deploy(metadataUri, deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("");
  console.log("DEPLOYED_ADDRESS=" + address);
  console.log("");
  console.log("À reporter dans le .env de l'application :");
  console.log(`  BLOCKCHAIN_PROVIDER="viem"`);
  console.log(`  TOKEN_CONTRACT_ADDRESS="${address}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

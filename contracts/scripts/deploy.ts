/**
 * Déploiement du contrat DemoEquityToken sur un testnet EVM.
 *
 *   cd contracts
 *   npm install
 *   cp .env.example .env   # renseigner RPC_URL + DEPLOYER_PRIVATE_KEY (testnet !)
 *   npm run deploy:base-sepolia
 *
 * Reporter ensuite l'adresse affichée dans le .env de l'application
 * (TOKEN_CONTRACT_ADDRESS) avec BLOCKCHAIN_PROVIDER=viem.
 */
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("Aucun signataire : renseignez DEPLOYER_PRIVATE_KEY dans contracts/.env");
  }
  console.log(`Déploiement avec le compte : ${deployer.address}`);
  console.log(`Solde : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

  const metadataUri = process.env.TOKEN_METADATA_URI ?? "https://example.test/api/token-metadata/{id}.json";
  const factory = await ethers.getContractFactory("DemoEquityToken");
  const contract = await factory.deploy(metadataUri, deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("");
  console.log("✅ DemoEquityToken déployé :", address);
  console.log("");
  console.log("À reporter dans le .env de l'application :");
  console.log(`  BLOCKCHAIN_PROVIDER="viem"`);
  console.log(`  TOKEN_CONTRACT_ADDRESS="${address}"`);
  console.log(`  MINTER_PRIVATE_KEY="<clé du wallet minter testnet>"`);
  console.log("");
  console.log(
    "Rappel : le déployeur possède DEFAULT_ADMIN_ROLE et MINTER_ROLE. Pour utiliser un wallet minter distinct : contract.grantRole(MINTER_ROLE, <adresse>).",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

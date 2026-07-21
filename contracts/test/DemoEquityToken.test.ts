import { expect } from "chai";
import { ethers } from "hardhat";

describe("DemoEquityToken", () => {
  async function deploy() {
    const [admin, user, attacker] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("DemoEquityToken");
    const contract = await factory.deploy("https://example.test/{id}.json", admin.address);
    await contract.waitForDeployment();
    return { contract, admin, user, attacker };
  }

  it("émet des tokens vers le wallet du client et suit la supply", async () => {
    const { contract, user } = await deploy();
    await contract.mint(user.address, 1, 3, "0x");
    expect(await contract.balanceOf(user.address, 1)).to.equal(3n);
    expect(await contract["totalSupply(uint256)"](1)).to.equal(3n);
  });

  it("refuse le mint sans MINTER_ROLE", async () => {
    const { contract, attacker, user } = await deploy();
    await expect(
      contract.connect(attacker).mint(user.address, 1, 1, "0x"),
    ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
  });

  it("refuse un mint de quantité nulle", async () => {
    const { contract, user } = await deploy();
    await expect(contract.mint(user.address, 1, 0, "0x")).to.be.revertedWith(
      "DemoEquityToken: amount is zero",
    );
  });

  it("bloque les transferts en pause", async () => {
    const { contract, admin, user } = await deploy();
    await contract.mint(user.address, 2, 1, "0x");
    await contract.pause();
    await expect(
      contract.connect(user).safeTransferFrom(user.address, admin.address, 2, 1, "0x"),
    ).to.be.revertedWithCustomError(contract, "EnforcedPause");
    await contract.unpause();
    await contract.connect(user).safeTransferFrom(user.address, admin.address, 2, 1, "0x");
    expect(await contract.balanceOf(admin.address, 2)).to.equal(1n);
  });

  it("expose l'avertissement de démonstration on-chain", async () => {
    const { contract } = await deploy();
    expect(await contract.DISCLAIMER()).to.contain("not a share");
  });

  it("détruit des tokens depuis le wallet du client (vente) et met à jour la supply", async () => {
    const { contract, user } = await deploy();
    await contract.mint(user.address, 3, 5, "0x");
    await contract.burnFrom(user.address, 3, 2);
    expect(await contract.balanceOf(user.address, 3)).to.equal(3n);
    expect(await contract["totalSupply(uint256)"](3)).to.equal(3n);
  });

  it("refuse le burn sans MINTER_ROLE", async () => {
    const { contract, attacker, user } = await deploy();
    await contract.mint(user.address, 3, 2, "0x");
    await expect(
      contract.connect(attacker).burnFrom(user.address, 3, 1),
    ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
  });

  it("refuse un burn de quantité nulle", async () => {
    const { contract, user } = await deploy();
    await contract.mint(user.address, 3, 2, "0x");
    await expect(contract.burnFrom(user.address, 3, 0)).to.be.revertedWith(
      "DemoEquityToken: amount is zero",
    );
  });

  it("refuse de brûler plus que le solde détenu", async () => {
    const { contract, user } = await deploy();
    await contract.mint(user.address, 3, 1, "0x");
    await expect(contract.burnFrom(user.address, 3, 2)).to.be.reverted;
  });
});

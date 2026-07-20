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
});

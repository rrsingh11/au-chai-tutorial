const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Faucet', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContractAndSetVariables() {
    const Faucet = await ethers.getContractFactory('Faucet');
    const depositEther = ethers.utils.parseEther("10.0")
    const faucet = await Faucet.deploy({value: depositEther});
    // const faucet = await Faucet.deploy();

    let withdrawAmount = ethers.utils.parseUnits("1", "ether");
    const [owner, signer2] = await ethers.getSigners();
    const provider = ethers.getDefaultProvider()

    return { faucet, owner, withdrawAmount, signer2, provider };
  }

  it('should deploy and set the owner correctly', async function () {
    const { faucet, owner } = await loadFixture(deployContractAndSetVariables);

    expect(await faucet.owner()).to.equal(owner.address);
  });

  it('should only transfer withdrawls above 0.1ETH', async function() {
    const { faucet, withdrawAmount } = await loadFixture(deployContractAndSetVariables);
    await expect(faucet.withdraw(withdrawAmount)).to.be.reverted;
  })

  it("only the owner should withdraw all", async function () {
    const { faucet, signer2 } = await loadFixture(deployContractAndSetVariables);

    await expect(faucet.connect(signer2).withdrawAll()).to.be.reverted;
  });

  it('only owner can destoy the faucet ', async function() {
    const { faucet, owner, signer2} = await loadFixture(deployContractAndSetVariables);
    await expect(faucet.connect(signer2).destroyFaucet()).to.be.reverted;
  })
  it('should check destroyFaucet work properly', async function() {
    const { faucet, owner, provider} = await loadFixture(deployContractAndSetVariables);
    const tx1 = await faucet.connect(owner).destroyFaucet();
    // await expect(faucet.connect(signer2).destroyFaucet()).to.be.reverted;
    expect(await provider.getCode(faucet.address)).to.equal('0x')
  })

  it("should return funds to the owner when selfdestruct is called", async function () {
    const { faucet, owner } = await loadFixture(deployContractAndSetVariables);

    // getBalance is a function of the Ether.js blockchain provider object
    let provider = ethers.getDefaultProvider();
    const balanceBefore = await faucet.provider.getBalance(owner.address);
    const balanceContractBefore = await faucet.provider.getBalance(
      faucet.address
    );

    const tx = await faucet.destroyFaucet();
    const txReceipt = await tx.wait(1);
    const { gasUsed, effectiveGasPrice } = txReceipt;
    const gasCost = gasUsed.mul(effectiveGasPrice);

    const balanceContractAfter = await faucet.provider.getBalance(
      faucet.address
    );

    const balanceAfter = await faucet.provider.getBalance(owner.address);

    expect(balanceAfter.toString() > balanceBefore.toString()).to.be.true;

    expect(balanceContractAfter.toString()).to.equal("0");

    expect(balanceContractBefore.add(balanceBefore).toString()).to.equal(
      balanceAfter.add(gasCost).toString()
    );
  });
});
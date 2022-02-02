const { expect } = require("chai");
const { ethers } = require("hardhat");

const { parseUnits } = ethers.utils;

describe("MockExchange", () => {
  let deployer;
  let user;
  let exchange;
  let tokenA;
  let tokenB;

  beforeEach(async () => {
    [deployer, user] = await ethers.getSigners();
    const exchangeFactory = await ethers.getContractFactory(
      "MockExchange",
      deployer
    );
    const tokenAFactory = await ethers.getContractFactory("TokenA", deployer);
    const tokenBFactory = await ethers.getContractFactory("TokenB", deployer);
    tokenA = await tokenAFactory.deploy();
    tokenB = await tokenBFactory.deploy();
    exchange = await exchangeFactory.deploy(tokenA.address, tokenB.address);
    await tokenA.mint(exchange.address, parseUnits("1000000", 18));
    await tokenB.mint(exchange.address, parseUnits("1000000", 18));
  });

  describe("#swap()", () => {
    it("should be possible to swap from one token to the other", async () => {
      const from = tokenA;
      const to = tokenB;

      expect(await exchange.from()).to.equal(from.address);
      expect(await exchange.to()).to.equal(to.address);

      await from.mint(user.address, parseUnits("1000000", 18));
      const fromBalance = await from.balanceOf(user.address);

      const amount = parseUnits("12345", 18);
      await from.connect(user).approve(exchange.address, amount);

      expect(await from.balanceOf(user.address)).to.equal(fromBalance);
      expect(await to.balanceOf(user.address)).to.equal(0);

      const received = parseUnits("24690", 18);

      await expect(
        exchange.connect(user).swap(from.address, to.address, amount)
      )
        .to.emit(exchange, "Swap")
        .withArgs(user.address, from.address, to.address, amount, received);

      expect(await from.balanceOf(user.address)).to.equal(
        fromBalance.sub(amount)
      );
      expect(await to.balanceOf(user.address)).to.equal(received);
    });
  });
});

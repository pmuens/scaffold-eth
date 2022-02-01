const { expect } = require("chai");
const { ethers } = require("hardhat");

const { parseUnits } = ethers.utils;

describe("MockExchange", () => {
  let deployer;
  let user;
  let exchange;
  let tkn6;
  let tkn18;

  beforeEach(async () => {
    [deployer, user] = await ethers.getSigners();
    const exchangeFactory = await ethers.getContractFactory(
      "MockExchange",
      deployer
    );
    const tkn6Factory = await ethers.getContractFactory("TKN6", deployer);
    const tkn18Factory = await ethers.getContractFactory("TKN18", deployer);
    tkn6 = await tkn6Factory.deploy();
    tkn18 = await tkn18Factory.deploy();
    exchange = await exchangeFactory.deploy(tkn6.address, tkn18.address);
    await tkn6.mint(exchange.address, parseUnits("1000000", 6));
    await tkn18.mint(exchange.address, parseUnits("1000000", 18));
  });

  describe("#swap()", () => {
    it("should be possible to swap from one token to the other (TKN-6 -> TKN-18)", async () => {
      const from = tkn6;
      const to = tkn18;

      expect(await exchange.from()).to.equal(from.address);
      expect(await exchange.to()).to.equal(to.address);

      await from.mint(user.address, parseUnits("1000000", 6));
      const fromBalance = await from.balanceOf(user.address);

      const amount = parseUnits("12345", 6);
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

    it("should be possible to swap in the reverse direction (TKN-18 -> TKN-6)", async () => {
      const from = tkn18;
      const to = tkn6;

      await exchange.changeDirection();

      expect(await exchange.from()).to.equal(from.address);
      expect(await exchange.to()).to.equal(to.address);

      await from.mint(user.address, parseUnits("1000000", 18));
      const fromBalance = await from.balanceOf(user.address);

      const amount = parseUnits("12345", 18);
      await from.connect(user).approve(exchange.address, amount);

      expect(await from.balanceOf(user.address)).to.equal(fromBalance);
      expect(await to.balanceOf(user.address)).to.equal(0);

      const received = parseUnits("24690", 6);

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

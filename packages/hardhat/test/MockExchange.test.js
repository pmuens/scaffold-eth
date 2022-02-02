const { expect } = require("chai");
const { ethers } = require("hardhat");

const { parseUnits } = ethers.utils;

describe("MockExchange", () => {
  let deployer;
  let user;
  let tokenFactory;
  let exchangeFactory;

  beforeEach(async () => {
    [deployer, user] = await ethers.getSigners();
    tokenFactory = await ethers.getContractFactory("Token", deployer);
    exchangeFactory = await ethers.getContractFactory("MockExchange", deployer);
  });

  describe("#swap()", () => {
    it("should be possible to swap from one token to the other", async () => {
      const from = await tokenFactory.deploy("Token A", "TKN-A", 18);
      const to = await tokenFactory.deploy("Token B", "TKN-B", 18);
      const exchange = await exchangeFactory.deploy(from.address, to.address);

      await from.mint(exchange.address, parseUnits("1000000", 18));
      await to.mint(exchange.address, parseUnits("1000000", 18));

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

    it("should be possible to swap tokens with different decimals (6 -> 18)", async () => {
      const tokenA = await tokenFactory.deploy("Token A", "TKN-A", 6);
      const tokenB = await tokenFactory.deploy("Token B", "TKN-B", 18);
      const exchange = await exchangeFactory.deploy(
        tokenA.address,
        tokenB.address
      );

      await tokenA.mint(exchange.address, parseUnits("1000000", 6));
      await tokenB.mint(exchange.address, parseUnits("1000000", 18));

      expect(await exchange.from()).to.equal(tokenA.address);
      expect(await exchange.to()).to.equal(tokenB.address);

      await tokenA.mint(user.address, parseUnits("1000000", 6));
      const tokenABalance = await tokenA.balanceOf(user.address);

      const amount = parseUnits("12345", 6);
      await tokenA.connect(user).approve(exchange.address, amount);

      expect(await tokenA.balanceOf(user.address)).to.equal(tokenABalance);
      expect(await tokenB.balanceOf(user.address)).to.equal(0);

      const received = parseUnits("24690", 18);

      await expect(
        exchange.connect(user).swap(tokenA.address, tokenB.address, amount)
      )
        .to.emit(exchange, "Swap")
        .withArgs(
          user.address,
          tokenA.address,
          tokenB.address,
          amount,
          received
        );

      expect(await tokenA.balanceOf(user.address)).to.equal(
        tokenABalance.sub(amount)
      );
      expect(await tokenB.balanceOf(user.address)).to.equal(received);
    });

    it("should be possible to swap tokens with different decimals (18 -> 6)", async () => {
      const tokenA = await tokenFactory.deploy("Token A", "TKN-A", 18);
      const tokenB = await tokenFactory.deploy("Token B", "TKN-B", 6);
      const exchange = await exchangeFactory.deploy(
        tokenA.address,
        tokenB.address
      );

      await tokenA.mint(exchange.address, parseUnits("1000000", 18));
      await tokenB.mint(exchange.address, parseUnits("1000000", 6));

      expect(await exchange.from()).to.equal(tokenA.address);
      expect(await exchange.to()).to.equal(tokenB.address);

      await tokenA.mint(user.address, parseUnits("1000000", 18));
      const tokenABalance = await tokenA.balanceOf(user.address);

      const amount = parseUnits("12345", 18);
      await tokenA.connect(user).approve(exchange.address, amount);

      expect(await tokenA.balanceOf(user.address)).to.equal(tokenABalance);
      expect(await tokenB.balanceOf(user.address)).to.equal(0);

      const received = parseUnits("24690", 6);

      await expect(
        exchange.connect(user).swap(tokenA.address, tokenB.address, amount)
      )
        .to.emit(exchange, "Swap")
        .withArgs(
          user.address,
          tokenA.address,
          tokenB.address,
          amount,
          received
        );

      expect(await tokenA.balanceOf(user.address)).to.equal(
        tokenABalance.sub(amount)
      );
      expect(await tokenB.balanceOf(user.address)).to.equal(received);
    });
  });
});

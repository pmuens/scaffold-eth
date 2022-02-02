const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

const { parseUnits } = ethers.utils;

describe("DCA", () => {
  let deployer;
  let user;
  let alice;
  let bob;
  let carol;
  let keeper;
  let dca;
  let exchange;
  let tokenA;
  let tokenB;

  beforeEach(async () => {
    [deployer, user, alice, bob, carol, keeper] = await ethers.getSigners();
    // Get contract factories
    const dcaFactory = await ethers.getContractFactory("DCA", deployer);
    const exchangeFactory = await ethers.getContractFactory(
      "MockExchange",
      deployer
    );
    const tokenAFactory = await ethers.getContractFactory("TokenA", deployer);
    const tokenBFactory = await ethers.getContractFactory("TokenB", deployer);
    // Deploy contracts
    tokenA = await tokenAFactory.deploy();
    tokenB = await tokenBFactory.deploy();
    exchange = await exchangeFactory.deploy(tokenA.address, tokenB.address);
    dca = await dcaFactory.deploy(
      tokenA.address,
      tokenB.address,
      exchange.address
    );
    // Seed exchange with funds
    await tokenA.mint(exchange.address, parseUnits("1000000", 18));
    await tokenB.mint(exchange.address, parseUnits("1000000", 18));
    // Seed users with funds
    await tokenA.mint(user.address, parseUnits("1000000", 18));
    await tokenB.mint(user.address, parseUnits("1000000", 18));
    await tokenA.mint(alice.address, parseUnits("1000000", 18));
    await tokenB.mint(alice.address, parseUnits("1000000", 18));
    await tokenA.mint(bob.address, parseUnits("1000000", 18));
    await tokenB.mint(bob.address, parseUnits("1000000", 18));
    await tokenA.mint(carol.address, parseUnits("1000000", 18));
    await tokenB.mint(carol.address, parseUnits("1000000", 18));
  });

  describe("#constructor()", () => {
    let dcaFactory;
    let tokenFactory;
    let exchangeFactory;

    beforeEach(async () => {
      dcaFactory = await ethers.getContractFactory("DCA", deployer);
      tokenFactory = await ethers.getContractFactory("Token", deployer);
      exchangeFactory = await ethers.getContractFactory(
        "MockExchange",
        deployer
      );
    });

    it('should revert when the "toSell" token doesn\'t have 18 decimals', async () => {
      const toSell = await tokenFactory.deploy("Token A", "TKN-A", 6);
      const toBuy = await tokenFactory.deploy("Token B", "TKN-B", 18);
      exchange = await exchangeFactory.deploy(toSell.address, toBuy.address);

      await expect(
        dcaFactory.deploy(toSell.address, toBuy.address, exchange.address)
      ).to.be.revertedWith("must have 18 decimals");
    });

    it('should revert when the "toBuy" token doesn\'t have 18 decimals', async () => {
      const toSell = await tokenFactory.deploy("Token A", "TKN-A", 18);
      const toBuy = await tokenFactory.deploy("Token B", "TKN-B", 6);
      exchange = await exchangeFactory.deploy(toSell.address, toBuy.address);

      await expect(
        dcaFactory.deploy(toSell.address, toBuy.address, exchange.address)
      ).to.be.revertedWith("must have 18 decimals");
    });
  });

  describe("#enter()", () => {
    it("should revert when the amount is 0", async () => {
      const amount = parseUnits("0", 6);
      const duration = 7;

      await expect(
        dca.connect(user).enter(amount, duration)
      ).to.be.revertedWith("Amount can't be 0");
    });

    it("should revert when the duration is 0", async () => {
      const amount = parseUnits("100", 6);
      const duration = 0;

      await expect(
        dca.connect(user).enter(amount, duration)
      ).to.be.revertedWith("Duration can't be 0");
    });

    it("should be possible to enter and create an allocation", async () => {
      // Contract deployment was today --> time-travel to one day in the future
      await dca.timeTravel();
      const today = (await dca.today()).toNumber();

      const amount = parseUnits("100", 6);
      const duration = 7;

      const total = amount.mul(duration);
      await tokenA.connect(user).approve(dca.address, total);

      const startDay = today;
      // Subtracting 1 given that we'll also swap on the `startDay`
      const endDay = startDay + duration - 1;

      await expect(dca.connect(user).enter(amount, duration))
        .to.emit(dca, "Enter")
        .withArgs(0, user.address, amount, startDay, endDay);

      expect(await tokenA.balanceOf(dca.address)).to.equal(total);
      expect(await dca.dailyAmount()).to.equal(amount);
      expect(await dca.removeAmount(endDay)).to.equal(amount);
      expect(await dca.nextAllocationId()).to.equal(1);
      expect(await dca.allocations(0)).to.deep.equal([
        BigNumber.from(0),
        amount,
        BigNumber.from(startDay),
        BigNumber.from(endDay),
        user.address,
      ]);
    });

    it("should increase the start day by one if the last execution was today", async () => {
      // Contract deployment was today --> time of last execution is today
      const today = (await dca.today()).toNumber();

      const amount = parseUnits("100", 6);
      const duration = 7;

      const total = amount.mul(duration);
      await tokenA.connect(user).approve(dca.address, total);

      const startDay = today + 1;
      // Subtracting 1 given that we'll also swap on the `startDay`
      const endDay = startDay + duration - 1;

      await expect(dca.connect(user).enter(amount, duration))
        .to.emit(dca, "Enter")
        .withArgs(0, user.address, amount, startDay, endDay);

      expect(await tokenA.balanceOf(dca.address)).to.equal(total);
      expect(await dca.dailyAmount()).to.equal(amount);
      expect(await dca.removeAmount(endDay)).to.equal(amount);
      expect(await dca.nextAllocationId()).to.equal(1);
      expect(await dca.allocations(0)).to.deep.equal([
        BigNumber.from(0),
        amount,
        BigNumber.from(startDay),
        BigNumber.from(endDay),
        user.address,
      ]);
    });

    it("should set the end day to the start day if the duration is 1 day", async () => {
      await dca.timeTravel();
      const today = (await dca.today()).toNumber();

      const amount = parseUnits("100", 6);
      const duration = 1;

      const total = amount.mul(duration);
      await tokenA.connect(user).approve(dca.address, total);

      const startDay = today;
      const endDay = startDay;

      await expect(dca.connect(user).enter(amount, duration))
        .to.emit(dca, "Enter")
        .withArgs(0, user.address, amount, startDay, endDay);

      expect(await tokenA.balanceOf(dca.address)).to.equal(total);
      expect(await dca.dailyAmount()).to.equal(amount);
      expect(await dca.removeAmount(endDay)).to.equal(amount);
      expect(await dca.nextAllocationId()).to.equal(1);
      expect(await dca.allocations(0)).to.deep.equal([
        BigNumber.from(0),
        amount,
        BigNumber.from(startDay),
        BigNumber.from(endDay),
        user.address,
      ]);
    });
  });

  describe("#swap()", () => {
    it("should revert when the function was already called that day", async () => {
      await expect(dca.connect(user).swap()).to.be.revertedWith(
        "Function already called today"
      );
    });

    it("should revert when there is nothing to sell", async () => {
      await dca.timeTravel();

      await expect(dca.connect(user).swap()).to.be.revertedWith(
        "Nothing to sell"
      );
    });

    it("should be possible perform a swap", async () => {
      // Approval + Enter
      const amount = parseUnits("100", 18);
      const duration = 7;

      const total = amount.mul(duration);
      await tokenA.connect(user).approve(dca.address, total);
      dca.connect(user).enter(amount, duration);

      // Time-travel 1 Day
      await dca.timeTravel();

      // NOTE: The `MockExchange` we're using always returns twice the amount of
      //  Token B for every Token A
      const toSellSold = amount;
      const toBuyBought = parseUnits("200", 18);
      const toBuyPrice = parseUnits("2", 18);

      await expect(dca.connect(keeper).swap())
        .to.emit(dca, "Swap")
        .withArgs(toSellSold, toBuyBought, toBuyPrice);

      const today = (await dca.today()).toNumber();
      expect(await dca.lastExecution()).to.equal(today);
      expect(await dca.dailyAmount()).to.equal(amount);
      expect(await dca.toBuyPriceCumulative(today)).to.equal(toBuyPrice);
    });

    it("should support skipped days between executions", async () => {
      // Alice: Approval + Enter
      const durationAlice = 3;
      const amountAlice = parseUnits("10", 18);
      const totalAlice = amountAlice.mul(durationAlice);

      await tokenA.connect(alice).approve(dca.address, totalAlice);
      await dca.connect(alice).enter(amountAlice, durationAlice);

      // Bob: Approval + Enter
      const durationBob = 2;
      const amountBob = parseUnits("20", 18);
      const totalBob = amountBob.mul(durationBob);

      await tokenA.connect(bob).approve(dca.address, totalBob);
      await dca.connect(bob).enter(amountBob, durationBob);

      // Carol: Approval + Enter
      const durationCarol = 1;
      const amountCarol = parseUnits("30", 18);
      const totalCarol = amountCarol.mul(durationCarol);

      await tokenA.connect(carol).approve(dca.address, totalCarol);
      await dca.connect(carol).enter(amountCarol, durationCarol);

      // Check the planned amount removals
      const tomorrow = (await dca.today()).toNumber() + 1;
      expect(await dca.removeAmount(tomorrow)).to.equal(amountCarol);
      expect(await dca.removeAmount(tomorrow + 1)).to.equal(amountBob);
      expect(await dca.removeAmount(tomorrow + 2)).to.equal(amountAlice);

      // Time-travel 3 Days
      await dca.timeTravel();
      await dca.timeTravel();
      await dca.timeTravel();

      // NOTE: The `MockExchange` we're using always returns twice the amount of
      //  Token B for every Token A
      const toSellSold = amountAlice.add(amountBob.add(amountCarol));
      const toBuyBought = parseUnits("120", 18);
      const toBuyPrice = parseUnits("2", 18);
      await expect(dca.connect(keeper).swap())
        .to.emit(dca, "Swap")
        .withArgs(toSellSold, toBuyBought, toBuyPrice);

      const today = (await dca.today()).toNumber();
      expect(await dca.lastExecution()).to.equal(today);
      expect(await dca.dailyAmount()).to.equal(0);
      expect(await dca.toBuyPriceCumulative(today)).to.equal(toBuyPrice);
    });
  });
});

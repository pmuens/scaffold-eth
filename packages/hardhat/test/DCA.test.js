const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

const { parseUnits } = ethers.utils;

describe("DCA", () => {
  let deployer;
  let user;
  let dca;
  let exchange;
  let tkn6;
  let tkn18;

  beforeEach(async () => {
    [deployer, user] = await ethers.getSigners();
    // Get contract factories
    const dcaFactory = await ethers.getContractFactory("DCA", deployer);
    const exchangeFactory = await ethers.getContractFactory(
      "MockExchange",
      deployer
    );
    const tkn6Factory = await ethers.getContractFactory("TKN6", deployer);
    const tkn18Factory = await ethers.getContractFactory("TKN18", deployer);
    // Deploy contracts
    tkn6 = await tkn6Factory.deploy();
    tkn18 = await tkn18Factory.deploy();
    exchange = await exchangeFactory.deploy(tkn6.address, tkn18.address);
    dca = await dcaFactory.deploy(
      tkn6.address,
      tkn18.address,
      exchange.address
    );
    // Seed exchange with funds
    await tkn6.mint(exchange.address, parseUnits("1000000", 6));
    await tkn18.mint(exchange.address, parseUnits("1000000", 18));
    // Seed user with funds
    await tkn6.mint(user.address, parseUnits("1000000", 6));
    await tkn18.mint(user.address, parseUnits("1000000", 18));
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
      await tkn6.connect(user).approve(dca.address, total);

      const startDay = today;
      // Subtracting 1 given that we'll also swap on the `startDay`
      const endDay = startDay + duration - 1;

      await expect(dca.connect(user).enter(amount, duration))
        .to.emit(dca, "Enter")
        .withArgs(0, user.address, amount, startDay, endDay);

      expect(await tkn6.balanceOf(dca.address)).to.equal(total);
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
      await tkn6.connect(user).approve(dca.address, total);

      const startDay = today + 1;
      // Subtracting 1 given that we'll also swap on the `startDay`
      const endDay = startDay + duration - 1;

      await expect(dca.connect(user).enter(amount, duration))
        .to.emit(dca, "Enter")
        .withArgs(0, user.address, amount, startDay, endDay);

      expect(await tkn6.balanceOf(dca.address)).to.equal(total);
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
      await tkn6.connect(user).approve(dca.address, total);

      const startDay = today;
      const endDay = startDay;

      await expect(dca.connect(user).enter(amount, duration))
        .to.emit(dca, "Enter")
        .withArgs(0, user.address, amount, startDay, endDay);

      expect(await tkn6.balanceOf(dca.address)).to.equal(total);
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
});

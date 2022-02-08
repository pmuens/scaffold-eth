const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

const { parseUnits } = ethers.utils;
const { AddressZero } = ethers.constants;

// NOTE: The `MockExchange` we're using always returns twice the amount of
//  Token B for every Token A

describe("DCA", () => {
  let deployer;
  let user;
  let keeper;
  let dca;
  let exchange;
  let tokenA;
  let tokenB;

  beforeEach(async () => {
    [deployer, user, keeper] = await ethers.getSigners();
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
      const amount = 0;
      const numSwaps = 7;

      await expect(
        dca.connect(user).enter(amount, numSwaps)
      ).to.be.revertedWith("Amount can't be 0");
    });

    it("should revert when the number of swaps is 0", async () => {
      const amount = parseUnits("100", 18);
      const numSwaps = 0;

      await expect(
        dca.connect(user).enter(amount, numSwaps)
      ).to.be.revertedWith("Number of swaps can't be 0");
    });

    it("should be possible to enter and create an allocation", async () => {
      const amount = parseUnits("100", 18);
      const numSwaps = 7;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);

      const startSwapNum = 1;
      const endSwapNum = 7;

      await expect(dca.connect(user).enter(amount, numSwaps))
        .to.emit(dca, "Enter")
        .withArgs(0, user.address, amount, startSwapNum, endSwapNum);

      expect(await tokenA.balanceOf(dca.address)).to.equal(total);
      expect(await dca.swapAmount()).to.equal(amount);
      expect(await dca.removeSwapAmount(endSwapNum)).to.equal(amount);
      expect(await dca.nextAllocationId()).to.equal(1);
      expect(await dca.allocations(0)).to.deep.equal([
        BigNumber.from(0),
        amount,
        BigNumber.from(startSwapNum),
        BigNumber.from(endSwapNum),
        user.address,
      ]);
    });

    it("should set the end swap number to the start swap number if the number of swaps is 1", async () => {
      const amount = parseUnits("100", 18);
      const numSwaps = 1;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);

      const startSwapNum = 1;
      const endSwapNum = 1;

      await expect(dca.connect(user).enter(amount, numSwaps))
        .to.emit(dca, "Enter")
        .withArgs(0, user.address, amount, startSwapNum, endSwapNum);

      expect(await tokenA.balanceOf(dca.address)).to.equal(total);
      expect(await dca.swapAmount()).to.equal(amount);
      expect(await dca.removeSwapAmount(endSwapNum)).to.equal(amount);
      expect(await dca.nextAllocationId()).to.equal(1);
      expect(await dca.allocations(0)).to.deep.equal([
        BigNumber.from(0),
        amount,
        BigNumber.from(startSwapNum),
        BigNumber.from(endSwapNum),
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
      const numSwaps = 7;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);
      await dca.connect(user).enter(amount, numSwaps);

      // Time-travel 1 Day
      await dca.timeTravel();

      const toSellSold = amount;
      const toBuyBought = parseUnits("200", 18);
      const toBuyPrice = parseUnits("2", 18);

      await expect(dca.connect(keeper).swap())
        .to.emit(dca, "Swap")
        .withArgs(toSellSold, toBuyBought, toBuyPrice);

      const swapNum = 1;
      const today = (await dca.today()).toNumber();
      expect(await dca.lastSwapNum()).to.equal(swapNum);
      expect(await dca.lastSwapDay()).to.equal(today);
      expect(await dca.swapAmount()).to.equal(amount);
      expect(await dca.toBuyPriceCumulative(swapNum)).to.equal(toBuyPrice);
    });

    it('should increment "lastSwapNum" by 1', async () => {
      // Approval + Enter
      const amount = parseUnits("100", 18);
      const numSwaps = 7;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);
      await dca.connect(user).enter(amount, numSwaps);

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();

      expect(await dca.lastSwapNum()).to.equal(3);
    });
  });

  describe("#toBuyBalance()", () => {
    it('should be possible to get the user\'s "toBuy" token balance', async () => {
      const allocationId = 0;

      // Approval + Enter
      const amount = parseUnits("100", 18);
      const numSwaps = 1;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);
      await dca.connect(user).enter(amount, numSwaps);

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();

      expect(await dca.toBuyBalance(allocationId)).to.equal(
        parseUnits("200", 18)
      );
    });

    it("should calculate the correct balance when no swap happened", async () => {
      const allocationId = 0;

      // Approval + Enter
      const amount = parseUnits("100", 18);
      const numSwaps = 2;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);
      await dca.connect(user).enter(amount, numSwaps);

      expect(await dca.toBuyBalance(allocationId)).to.equal(0);
    });

    it('should support balance calculations of "in progress" allocations', async () => {
      const allocationId = 0;

      // Approval + Enter
      const amount = parseUnits("100", 18);
      const numSwaps = 7;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);
      await dca.connect(user).enter(amount, numSwaps);

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();

      expect(await dca.toBuyBalance(allocationId)).to.equal(
        parseUnits("200", 18)
      );
    });

    it('should support balance calculations of "processed" allocations', async () => {
      const allocationId = 0;

      // Approval + Enter
      const amount = parseUnits("100", 18);
      const numSwaps = 2;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);
      await dca.connect(user).enter(amount, numSwaps);

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();

      expect(await dca.toBuyBalance(allocationId)).to.equal(
        parseUnits("400", 18)
      );
    });
  });

  describe("#toSellBalance()", () => {
    it('should be possible to get the user\'s "toSell" token balance', async () => {
      const allocationId = 0;

      // Approval + Enter
      const amount = parseUnits("100", 18);
      const numSwaps = 2;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);
      await dca.connect(user).enter(amount, numSwaps);

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();

      expect(await dca.toSellBalance(allocationId)).to.equal(
        parseUnits("100", 18)
      );
    });

    it("should calculate the correct balance when no swap happened", async () => {
      const allocationId = 0;

      // Approval + Enter
      const amount = parseUnits("100", 18);
      const numSwaps = 5;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);
      await dca.connect(user).enter(amount, numSwaps);

      expect(await dca.toSellBalance(allocationId)).to.equal(total);
    });

    it('should support balance calculations of "in progress" allocations', async () => {
      const allocationId = 0;

      // Approval + Enter
      const amount = parseUnits("100", 18);
      const numSwaps = 7;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);
      await dca.connect(user).enter(amount, numSwaps);

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();

      expect(await dca.toSellBalance(allocationId)).to.equal(
        parseUnits("500", 18)
      );
    });

    it('should support balance calculations of "processed" allocations', async () => {
      const allocationId = 0;

      // Approval + Enter
      const amount = parseUnits("100", 18);
      const numSwaps = 2;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);
      await dca.connect(user).enter(amount, numSwaps);

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();

      expect(await dca.toSellBalance(allocationId)).to.equal(0);
    });
  });

  describe("#exit()", () => {
    it("should revert when msg.sender is not the owner of the allocation", async () => {
      const allocationId = 0;

      await expect(dca.connect(user).exit(allocationId)).to.be.revertedWith(
        "Only owner"
      );
    });

    it("should be possible to exit and delete an allocation", async () => {
      const allocationId = 0;

      // Initial user balances
      const tokenABalance = await tokenA.balanceOf(user.address);
      const tokenBBalance = await tokenB.balanceOf(user.address);

      // Approval + Enter
      const amount = parseUnits("100", 18);
      const numSwaps = 7;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);
      await dca.connect(user).enter(amount, numSwaps);

      let lastSwapNum = 0;

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();
      lastSwapNum += 1;

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();
      lastSwapNum += 1;

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();
      lastSwapNum += 1;

      const endSwapNum = numSwaps;
      const swapsTotal = lastSwapNum;
      const mockExchangeMultiplier = 2;

      await expect(dca.connect(user).exit(allocationId))
        .to.emit(dca, "Exit")
        .withArgs(0, user.address, lastSwapNum);

      expect(await dca.swapAmount()).to.equal(0);
      expect(await dca.removeSwapAmount(endSwapNum)).to.equal(0);
      expect(await tokenA.balanceOf(dca.address)).to.equal(0);
      expect(await tokenB.balanceOf(dca.address)).to.equal(0);
      expect(await tokenA.balanceOf(user.address)).to.equal(
        tokenABalance.sub(amount.mul(swapsTotal))
      );
      expect(await tokenB.balanceOf(user.address)).to.equal(
        tokenBBalance.add(amount.mul(lastSwapNum).mul(mockExchangeMultiplier))
      );
      expect(await dca.allocations(allocationId)).to.deep.equal([
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
        AddressZero,
      ]);
    });

    it("should be possible to exit an allocation when no swap happened", async () => {
      const allocationId = 0;

      // Initial user balances
      const tokenABalance = await tokenA.balanceOf(user.address);
      const tokenBBalance = await tokenB.balanceOf(user.address);

      // Approval + Enter
      const amount = parseUnits("100", 18);
      const numSwaps = 5;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);
      await dca.connect(user).enter(amount, numSwaps);

      const lastSwapNum = 0;
      const endSwapNum = numSwaps;

      await expect(dca.connect(user).exit(allocationId))
        .to.emit(dca, "Exit")
        .withArgs(0, user.address, lastSwapNum);

      expect(await dca.swapAmount()).to.equal(0);
      expect(await dca.removeSwapAmount(endSwapNum)).to.equal(0);
      expect(await tokenA.balanceOf(dca.address)).to.equal(0);
      expect(await tokenB.balanceOf(dca.address)).to.equal(0);
      expect(await tokenA.balanceOf(user.address)).to.equal(tokenABalance);
      expect(await tokenB.balanceOf(user.address)).to.equal(tokenBBalance);
      expect(await dca.allocations(allocationId)).to.deep.equal([
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
        AddressZero,
      ]);
    });

    it('should be possible to exit "in progress" allocations', async () => {
      const allocationId = 0;

      // Initial user balances
      const tokenABalance = await tokenA.balanceOf(user.address);
      const tokenBBalance = await tokenB.balanceOf(user.address);

      // Approval + Enter
      const amount = parseUnits("100", 18);
      const numSwaps = 7;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);
      await dca.connect(user).enter(amount, numSwaps);

      let lastSwapNum = 0;

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();
      lastSwapNum += 1;

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();
      lastSwapNum += 1;

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();
      lastSwapNum += 1;

      const endSwapNum = numSwaps;
      const swapsTotal = lastSwapNum;
      const mockExchangeMultiplier = 2;

      await expect(dca.connect(user).exit(allocationId))
        .to.emit(dca, "Exit")
        .withArgs(0, user.address, lastSwapNum);

      expect(await dca.swapAmount()).to.equal(0);
      expect(await dca.removeSwapAmount(endSwapNum)).to.equal(0);
      expect(await tokenA.balanceOf(dca.address)).to.equal(0);
      expect(await tokenB.balanceOf(dca.address)).to.equal(0);
      expect(await tokenA.balanceOf(user.address)).to.equal(
        tokenABalance.sub(amount.mul(swapsTotal))
      );
      expect(await tokenB.balanceOf(user.address)).to.equal(
        tokenBBalance.add(amount.mul(lastSwapNum).mul(mockExchangeMultiplier))
      );
      expect(await dca.allocations(allocationId)).to.deep.equal([
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
        AddressZero,
      ]);
    });

    it('should be possible to exit "processed" allocations', async () => {
      const allocationId = 0;

      // Initial user balances
      const tokenABalance = await tokenA.balanceOf(user.address);
      const tokenBBalance = await tokenB.balanceOf(user.address);

      // Approval + Enter
      const amount = parseUnits("100", 18);
      const numSwaps = 3;

      const total = amount.mul(numSwaps);
      await tokenA.connect(user).approve(dca.address, total);
      await dca.connect(user).enter(amount, numSwaps);

      let lastSwapNum = 0;

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();
      lastSwapNum += 1;

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();
      lastSwapNum += 1;

      // Time-travel 1 Day
      await dca.timeTravel();
      await dca.connect(keeper).swap();
      lastSwapNum += 1;

      const swapsTotal = lastSwapNum;
      const mockExchangeMultiplier = 2;

      await expect(dca.connect(user).exit(allocationId))
        .to.emit(dca, "Exit")
        .withArgs(0, user.address, lastSwapNum);

      expect(await dca.swapAmount()).to.equal(0);
      expect(await tokenA.balanceOf(dca.address)).to.equal(0);
      expect(await tokenB.balanceOf(dca.address)).to.equal(0);
      expect(await tokenA.balanceOf(user.address)).to.equal(
        tokenABalance.sub(amount.mul(swapsTotal))
      );
      expect(await tokenB.balanceOf(user.address)).to.equal(
        tokenBBalance.add(amount.mul(lastSwapNum).mul(mockExchangeMultiplier))
      );
      expect(await dca.allocations(allocationId)).to.deep.equal([
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
        AddressZero,
      ]);
    });
  });
});

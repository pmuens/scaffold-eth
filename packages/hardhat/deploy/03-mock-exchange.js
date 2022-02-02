const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const tokenA = await ethers.getContract("TokenA", deployer);
  const tokenB = await ethers.getContract("TokenB", deployer);

  await deploy("MockExchange", {
    from: deployer,
    args: [tokenA.address, tokenB.address],
    log: true,
    waitConfirmations: 5,
  });

  const exchange = await ethers.getContract("MockExchange", deployer);

  // Seed exchange with funds
  await tokenA.mint(exchange.address, ethers.utils.parseUnits("1000000", 18));
  await tokenB.mint(exchange.address, ethers.utils.parseUnits("1000000", 18));
};
module.exports.tags = ["MockExchange"];

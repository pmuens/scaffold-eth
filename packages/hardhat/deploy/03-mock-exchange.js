const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const token6 = await ethers.getContract("TKN6", deployer);
  const token18 = await ethers.getContract("TKN18", deployer);

  await deploy("MockExchange", {
    from: deployer,
    args: [token6.address, token18.address],
    log: true,
    waitConfirmations: 5,
  });

  const exchange = await ethers.getContract("MockExchange", deployer);

  // Seed exchange with funds
  await token6.mint(exchange.address, ethers.utils.parseUnits("1000000", 6));
  await token18.mint(exchange.address, ethers.utils.parseUnits("1000000", 18));
};
module.exports.tags = ["MockExchange"];

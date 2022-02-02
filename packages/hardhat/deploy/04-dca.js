const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const toSell = await ethers.getContract("TokenA", deployer);
  const toBuy = await ethers.getContract("TokenB", deployer);
  const exchange = await ethers.getContract("MockExchange", deployer);

  await deploy("DCA", {
    from: deployer,
    args: [toSell.address, toBuy.address, exchange.address],
    log: true,
    waitConfirmations: 5,
  });
};
module.exports.tags = ["DCA"];

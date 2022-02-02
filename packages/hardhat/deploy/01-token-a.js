module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("TokenA", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 5,
  });
};
module.exports.tags = ["TokenA"];

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("TKN18", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 5,
  });
};
module.exports.tags = ["TKN18"];

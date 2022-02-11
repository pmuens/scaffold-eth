module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("Vault", {
    from: deployer,
    args: [0],
    log: true,
    waitConfirmations: 5,
  });
};

module.exports.tags = ["Vault"];

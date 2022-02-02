module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const name = "Token";
  const symbol = "TKN";
  const decimals = 18;

  await deploy("Token", {
    from: deployer,
    args: [name, symbol, decimals],
    log: true,
    waitConfirmations: 5,
  });
};
module.exports.tags = ["Token"];

module.exports = async function({
    getNamedAccounts,
    deployments
}) {
    const {
        deploy
    } = deployments;

    const {
        deployer
    } = await getNamedAccounts();

    await deploy("CoinFlip", {
        from: deployer,
        args: [],
        log: true
    });
}

module.exports.tags = ["CoinFlip"];
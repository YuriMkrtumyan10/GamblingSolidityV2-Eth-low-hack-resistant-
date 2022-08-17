require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");

const PRIVATE_KEY = "d7dfdab8333b00fb91b16652158fb82a88c2228f760c945824cc07b5f6ca08fe";
const ALCHEMY_API = "https://eth-goerli.g.alchemy.com/v2/bYmKgQQpeKUwJA3sf-FYoLgrT-FRZuza";
const ETHERSCAN_API = "8A6E18KUFHZSNMVG6XBMX3PIYWR8YQ14MK";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {

    },
    goerli: {
      url: ALCHEMY_API,
      accounts: [`0x${PRIVATE_KEY}`]
    },
  },
  namedAccounts: {
    deployer:{
      default: 0
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API
  },
  solidity: "0.8.9",
};
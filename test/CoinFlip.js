const {
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

describe("CoinFlip", function () {
    async function deployToken() {
        const [owner, caller, otherAccount] = await ethers.getSigners();
        const CoinFlip = await ethers.getContractFactory("CoinFlip");
        const coinflip = await CoinFlip.deploy();
        const tokenAddress = await coinflip.token();

        console.log("Token address is: ", tokenAddress);
        console.log("Token address is: ", coinflip.address);

        const token = await ethers.getContractAt("GameToken", tokenAddress);
        await token.mint(coinflip.address, 1000000);


        return { coinflip, tokenAddress, owner, caller, token, otherAccount };
    }

    describe("Initial State", () => {
        it("Should initialize with correct args: ", async () => {
            const { coinflip, owner, caller } = await loadFixture(deployToken);

            expect(await coinflip.minDepositAmount()).to.equal(100);
            expect(await coinflip.maxDepositAmount()).to.equal(ethers.BigNumber.from("1000000000000000000"));
            expect(await coinflip.coef()).to.equal(195);

        });
    });

    describe("Change Coefficient", () => {
        it("Should be able to change with correct args: ", async () => {
            const { coinflip, owner, caller } = await loadFixture(deployToken);
            await coinflip.changeCoef(10);

            expect(await coinflip.coef()).to.equal(10);
        });
    });

    describe("Bet Interval", () => {
        it("Should be able to set Min and Max bet amount: ", async () => {
            const { coinflip, owner, caller } = await loadFixture(deployToken);
            await coinflip.changeMaxMinBet(100, 10000);

            expect(await coinflip.maxDepositAmount()).to.equal(10000);
            expect(await coinflip.minDepositAmount()).to.equal(100);
        });

        it("Should revert a message when Min > Max: ", async () => {
            const { coinflip, owner, caller } = await loadFixture(deployToken);

            await expect(coinflip.changeMaxMinBet(10000, 100))
                .to.be.revertedWith('CoinFlip: Invalid Funds:');
        });
    });

    describe("Play", () => {
        //'ERC20: insufficient allowance' ERROR!!!!!!!!!!!!!!!!!!!!!!!!!!!
        xit("Should transfer money to the contract before playing: ", async () => {
            const { coinflip, tokenAddress, token, owner, caller } = await loadFixture(deployToken);
            await coinflip.mint(100);
            //await token.spendAllowance(owner.address, caller.address, 100);

            await coinflip.changeMaxMinBet(100, 1000);
            await coinflip.play(100, 1);

        });


        it("Should revert a message when msg.sender doesn't have enough funds: ", async () => {
            const { coinflip, owner, caller, token } = await loadFixture(deployToken);
            await token.mint(caller.address, 100);

            await expect(coinflip.connect(caller).play(10000, 1))
                .to.be.revertedWith('Not enough funds');
        });

        it("Should revert a message when msg.sender bets out of range: ", async () => {
            const { coinflip, owner, caller, token } = await loadFixture(deployToken);
            await token.mint(caller.address, 500);
            await coinflip.changeMaxMinBet(100, 200);

            await expect(coinflip.connect(caller).play(300, 1))
                .to.be.revertedWith('CoinFlip: bet should be in range');
            await expect(coinflip.connect(caller).play(10, 1))
                .to.be.revertedWith('CoinFlip: bet should be in range');
        });

        it("Should revert a message when the contract doesn't have enough funds to prize: ", async () => {
            const { coinflip, owner, caller, token } = await loadFixture(deployToken);
            await token.burn(coinflip.address, 1000000);
            await token.mint(caller.address, 500);

            await expect(coinflip.connect(caller).play(100, 1))
                .to.be.revertedWith('Not enough funds to prize it');
        });

        //alowance

    });

    //profit negative ask~~~~~
    describe("Withdraw", () => {
        xit("Should decrease profit ", async () => {
            const { coinflip, owner, tokenAddress, token, caller } = await loadFixture(deployToken);
            //error on Payable
            await coinflip.withdraw(100);

            await expect(() => coinflip.transfer(owner, 100))
                .to.changeTokenBalance(coinflip.address, owner.address, 100);
        });


        it("Should revert a message when there is not enough funds to withdraw ", async () => {
            const { coinflip, owner, caller } = await loadFixture(deployToken);

            await expect(coinflip.withdraw(10000000000000))
                .to.be.revertedWith('Not enough funds');
        });
    });


});


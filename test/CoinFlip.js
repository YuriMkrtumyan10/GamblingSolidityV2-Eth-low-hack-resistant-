const {
    loadFixture,
    mine,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect, assert } = require("chai");
const { ethers, config } = require("hardhat");


describe("CoinFlip", function () {
    async function deployToken() {

        const [owner, caller, croupier, otherAccount] = await ethers.getSigners();
        const CoinFlip = await ethers.getContractFactory("CoinFlip");
        const coinflip = await CoinFlip.deploy(croupier.address);
        console.log("Contract address is: ", coinflip.address);

        const tokenAddress = await coinflip.token();
        const token = await ethers.getContractAt("GameToken", tokenAddress);

        return { coinflip, croupier, owner, caller, token, otherAccount };
    }

    describe("Initial State", () => {
        it("Should initialize with correct args: ", async () => {
            const { coinflip, owner, caller, croupier } = await loadFixture(deployToken);

            expect(await coinflip.minDepositAmount()).to.equal(ethers.BigNumber.from("100"));
            expect(await coinflip.maxDepositAmount()).to.equal(ethers.BigNumber.from("1000000000000000000"));
            expect(await coinflip.coef()).to.equal(ethers.BigNumber.from("195"));
            expect(await coinflip.coef()).to.equal(ethers.BigNumber.from("195"));
            expect(await coinflip.croupier()).to.equal(croupier.address);
        });
    });

    describe("Change Coefficient", () => {
        it("Should be able to change with correct args: ", async () => {
            const { coinflip, owner } = await loadFixture(deployToken);

            await coinflip.changeCoef(ethers.BigNumber.from("195"));
            expect(await coinflip.coef()).to.equal(ethers.BigNumber.from("195"));
        });

        it("Should be in range > 100 and < 200: ", async () => {
            const { coinflip, owner, caller } = await loadFixture(deployToken);

            await expect(coinflip.changeCoef(ethers.BigNumber.from("1")))
                .to.be.revertedWith('Should be greater than 100, less than 200');

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
        it("Should create win game with correct args: ", async () => {
            const { coinflip, owner, croupier } = await loadFixture(deployToken);
            await mine(1);
            const choice = ethers.BigNumber.from("1");
            const seed = ethers.utils.formatBytes32String("game");


            await coinflip.play({ value: 50 }, seed, choice);
            const winGame = await coinflip.games(seed);
            const prize = 50 * coinflip.coef() / 100;


            expect(winGame.player, owner.address);
            expect(winGame.depositAmount, 1000);
            expect(winGame.choice, 1);
            expect(winGame.result, 1);
            expect(winGame.prize, prize);
            expect(winGame.status, 1);
        })
    })

    xdescribe("Play2", () => {

        it("Should create win game with correct args: ", async () => {
            const { coinflip, tokenAddress, token, owner, caller } = await loadFixture(deployToken);

            await mine(1);

            const choice = ethers.BigNumber.from("1");
            const depAmount = ethers.BigNumber.from("1000");
            const contractMinAmount = ethers.BigNumber.from("100000000000000000000");
            const callerMintAmount = ethers.BigNumber.from("1000");

            await coinflip.transferOwnership(caller.address);
            await token.mint(coinflip.address, contractMinAmount);
            await token.mint(caller.address, 1000);
            await token.connect(caller).approve(coinflip.address, callerMintAmount);
            await coinflip.connect(caller).play(depAmount, choice);

            const winGame = await coinflip.games(0);
            const prize = depAmount * coinflip.coef() / 100;
            console.log(winGame.player);

            expect(winGame.player, caller.address);
            expect(winGame.depositAmount, 1000);
            expect(winGame.choice, 1);
            expect(winGame.result, 1);
            expect(winGame.prize, prize);
            expect(winGame.status, 1);


            // console.log(`Game is ${winGame}`);


        });

        it("Should create lose game with correct args: ", async () => {
            const { coinflip, tokenAddress, token, owner, caller } = await loadFixture(deployToken);

            await mine(1);

            const choice = ethers.BigNumber.from("0");
            const depAmount = ethers.BigNumber.from("1000");
            const contractMinAmount = ethers.BigNumber.from("100000000000000000000");
            const callerMintAmount = ethers.BigNumber.from("1000");
            await coinflip.transferOwnership(caller.address);

            await token.mint(coinflip.address, contractMinAmount);
            await token.mint(caller.address, 1000);
            await token.connect(caller).approve(coinflip.address, callerMintAmount);
            console.log("Blaock number is :" + await ethers.provider.getBlockNumber());

            await coinflip.connect(caller).play(depAmount, choice);

            const loseGame = await coinflip.games(0);
            console.log(loseGame.player);

            expect(loseGame.player, caller.address);
            expect(loseGame.depositAmount, 1000);
            expect(loseGame.choice, choice);
            expect(loseGame.result, 1);
            expect(loseGame.prize, 0);
            expect(loseGame.status, 2);


            // console.log(`Game is ${winGame}`);


        });
        it("Should transfer correct amount when player wins: ", async () => {
            const { coinflip, tokenAddress, token, owner, caller } = await loadFixture(deployToken);
            await coinflip.transferOwnership(owner.address);

            await token.mint(coinflip.address, ethers.BigNumber.from("1000"));
            await token.mint(caller.address, ethers.BigNumber.from("500"));

            const depAmount = ethers.BigNumber.from("500");
            const coeff = await coinflip.coef();
            const winAmount = depAmount.mul(coeff).div(ethers.BigNumber.from("100"));
            await token.connect(caller).approve(coinflip.address, depAmount);

            await coinflip.changeMaxMinBet(ethers.BigNumber.from("100"), ethers.BigNumber.from("1000"));
            await coinflip.connect(caller).play(depAmount, 1);
            const game = await coinflip.connect(caller).upcomminggames(caller.address);

            await expect(() => coinflip.connect(owner).confirm(game))
                .to.changeTokenBalances(token, [coinflip, caller], [-winAmount, winAmount]);

        });
        //wins correct change Of balances :::Loses incorrect change of balances !!!!!!!!!!!!!!!!!!
        it("Should transfer correct amount when player loses: ", async () => {
            const { coinflip, tokenAddress, token, owner, caller } = await loadFixture(deployToken);
            await coinflip.transferOwnership(owner.address);

            await token.mint(coinflip.address, ethers.BigNumber.from("1000"));
            await token.mint(caller.address, ethers.BigNumber.from("500"));

            const depAmount = ethers.BigNumber.from("500");
            await token.connect(caller).approve(coinflip.address, depAmount);

            await coinflip.changeMaxMinBet(ethers.BigNumber.from("100"), ethers.BigNumber.from("1000"));

            await coinflip.connect(caller).play(depAmount, 0);
            const game = await coinflip.connect(caller).upcomminggames(caller.address);

            await expect(() => coinflip.connect(owner).confirm(game))
                .to.changeTokenBalances(token, [coinflip, caller], [depAmount, -depAmount]);

        });
        it("Should emit correct args whsen game is finished and player wins: ", async () => {
            const { coinflip, owner, caller, token } = await loadFixture(deployToken);
            await coinflip.transferOwnership(owner.address);

            await token.mint(coinflip.address, ethers.BigNumber.from("1000"));
            await token.mint(caller.address, ethers.BigNumber.from("500"));
            const depAmount = ethers.BigNumber.from("500");
            const coeff = await coinflip.coef();
            const winAmount = depAmount.mul(coeff).div(ethers.BigNumber.from("100"));
            const choice = ethers.BigNumber.from("0");
            await token.connect(caller).approve(coinflip.address, depAmount);
            await coinflip.connect(caller).play(depAmount, choice);

            const game = await coinflip.connect(caller).upcomminggames(caller.address);

            await expect(coinflip.connect(owner).confirm(game))
                .to.emit(coinflip, 'GameFinished')
                .withArgs(
                    caller.address,
                    depAmount,
                    choice,
                    0,
                    winAmount,
                    1
                );
        })

        it("Should emit correct args when game is finished and player loses: ", async () => {
            const { coinflip, owner, caller, token } = await loadFixture(deployToken);
            await coinflip.transferOwnership(owner.address);

            await token.mint(coinflip.address, ethers.BigNumber.from("1000"));
            await token.mint(caller.address, ethers.BigNumber.from("500"));
            const depAmount = ethers.BigNumber.from("500");
            const choice = ethers.BigNumber.from("1");
            await token.connect(caller).approve(coinflip.address, depAmount);
            await coinflip.connect(caller).play(depAmount, choice);

            const game = await coinflip.connect(caller).upcomminggames(caller.address);

            await expect(coinflip.connect(owner).confirm(game))
                .to.emit(coinflip, 'GameFinished')
                .withArgs(
                    caller.address,
                    depAmount,
                    choice,
                    0,
                    0,
                    2
                );
        })

        //requires

        it("Should revert a message when msg.sender doesn't have enough funds: ", async () => {
            const { coinflip, owner, caller, token } = await loadFixture(deployToken);
            await token.mint(caller.address, 100);
            await token.approve(coinflip.address, 10000);

            await expect(coinflip.connect(caller).play(10000, 1))
                .to.be.revertedWith('Not enough funds');
        });

        it("Should revert a message when msg.sender bets out of range: ", async () => {
            const { coinflip, owner, caller, token } = await loadFixture(deployToken);
            await token.mint(caller.address, 500);
            await coinflip.changeMaxMinBet(100, 200);
            await token.approve(coinflip.address, 10000);

            await expect(coinflip.connect(caller).play(300, 1))
                .to.be.revertedWith('CoinFlip: bet should be in range');
            await expect(coinflip.connect(caller).play(10, 1))
                .to.be.revertedWith('CoinFlip: bet should be in range');
        });

        it("Should revert a message when the contract doesn't have enough funds to prize: ", async () => {
            const { coinflip, owner, caller, token } = await loadFixture(deployToken);

            await token.approve(coinflip.address, 100000000);
            await token.burn(coinflip.address, 1000000);
            await token.mint(caller.address, 500);

            await expect(coinflip.connect(caller).play(100, 1))
                .to.be.revertedWith('Not enough funds to prize it');
        });
        it("Should revert a message when have invalid choice: ", async () => {
            const { coinflip, owner, caller, token } = await loadFixture(deployToken);
            const choice = ethers.BigNumber.from("3");
            const depAmount = ethers.BigNumber.from("1000");
            const contractMinAmount = ethers.BigNumber.from("100000000000000000000");
            const callerMintAmount = ethers.BigNumber.from("1000");

            await token.mint(coinflip.address, contractMinAmount);
            await token.mint(caller.address, 1000);
            await token.connect(caller).approve(coinflip.address, callerMintAmount);

            await expect(coinflip.connect(caller).play(depAmount, choice))
                .to.be.revertedWith('Coinflip: wrong choice');
        });
        it("Should revert a message when there is insufficient allowance: ", async () => {
            const { coinflip, owner, caller, token } = await loadFixture(deployToken);
            const choice = ethers.BigNumber.from("1");
            await coinflip.changeMaxMinBet(100, 10000);

            const depAmount = ethers.BigNumber.from("1000");
            const contractMinAmount = ethers.BigNumber.from("100000000000000");
            const callerMintAmount = ethers.BigNumber.from("10000");

            await token.mint(coinflip.address, contractMinAmount);
            await token.mint(caller.address, callerMintAmount);

            await token.connect(caller).approve(coinflip.address, 500);

            await expect(coinflip.connect(caller).play(depAmount, choice))
                .to.be.revertedWith('Not enough allowance');
        });


    });

    xdescribe("PlayWithEthereum", () => {
        it("Should be able to play with Ether", async () => {
            const { coinflip, owner, tokenAddress, token, caller } = await loadFixture(deployToken);

            await mine(1);

            const depAmount = { value: 10 }
            await coinflip.playWithEthereum(depAmount, 1);

            const winGame = await coinflip.games(0);
            const prize = depAmount * coinflip.coef() / 100;
            console.log(winGame.player);

            expect(winGame.player, caller.address);
            expect(winGame.depositAmount, 10);
            expect(winGame.choice, 1);
            expect(winGame.result, 1);
            expect(winGame.prize, prize);
            expect(winGame.status, 1);

        })
    })
    xdescribe("Withdraw", () => {
        xit("Should withdraw money from contract: ", async () => {
            const { coinflip, owner, tokenAddress, token, caller } = await loadFixture(deployToken);
            await coinflip.withdraw({ value: 200 });

            // await expect(() => token.transfer(coinflip.address, 100))
            //     .to.changeTokenBalance(token, coinflip, 100);

            await expect(token.transfer(owner.address, 200))
                .to.changeEtherBalances([coinflip, owner], [-200, 200]);
        });

        it("Should revert a message when there is not enough funds to withdraw ", async () => {
            const { coinflip, token, owner } = await loadFixture(deployToken);

            await owner.sendTransaction({to: coinflip.address, value: 1000});

            await expect(coinflip.withdraw({ value: 1000000000 }))
                .to.be.revertedWith('Not enough funds');
        });

    });


});


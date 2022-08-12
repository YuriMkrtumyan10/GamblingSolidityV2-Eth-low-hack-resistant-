// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import "hardhat/console.sol";
import "./GameToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// 1. Custom types struct/enum
// 2. state variables
// 3. data structures
// 4. events
// 5. constructor
// 6. modifiers
// 7. view/pure~
// 8. external
// 9. public
// 10. internal
// 11. private

contract CoinFlip is Ownable {
    //access control openzeppelin
    enum Status {
        PENDING,
        WIN,
        LOSE
    }

    struct Game {
        address player;
        uint256 depositAmount;
        uint256 choice;
        uint256 result;
        uint256 prize;
        Status status;
    }
    uint256 public coef;
    uint256 public totalGamesCount;
    uint256 public minDepositAmount;
    uint256 public maxDepositAmount;
    uint256 public profit;
    GameToken public token;

    mapping(uint256 => Game) games;

    event GameFinished(
        address indexed _player,
        uint256 _deposit,
        uint256 _choice,
        uint256 _result,
        uint256 _prize,
        Status indexed status
    );

    constructor() {
        minDepositAmount = 100;
        maxDepositAmount = 1 ether;
        token = new GameToken();
        coef = 195;
    }

    function changeCoef(uint256 _coef) external onlyOwner {
        coef = _coef;
    }

    function changeMaxMinBet(
        uint256 _minDepositAmount,
        uint256 _maxDepositAmount
    ) external onlyOwner {
        require(
            _minDepositAmount < _maxDepositAmount,
            "CoinFlip: Invalid Funds:"
        );
        maxDepositAmount = _maxDepositAmount;
        minDepositAmount = _minDepositAmount;
    }

    function play(uint256 _depositAmount, uint256 _choice) external payable {
        require(
            token.balanceOf(msg.sender) >= _depositAmount,
            "Not enough funds"
        );
        require(
            _depositAmount >= minDepositAmount &&
                _depositAmount <= maxDepositAmount,
            "CoinFlip: bet should be in range"
        );
        // require(
        //     token.allowance(msg.sender, address(this)) >= _depositAmount,
        //     "Not enough allowance"
        // );

        require(
            token.balanceOf(address(this)) >= (_depositAmount * coef) / 100,
            "Not enough funds to prize it"
        );
        token.transferFrom(msg.sender, address(this), _depositAmount);
        Game memory game = Game(
            msg.sender,
            _depositAmount,
            _choice,
            0,
            0,
            Status.PENDING
        );

        uint256 result = block.timestamp % 2; // 0 || 1

        if (result == _choice) {
            game.result = result;
            game.status = Status.WIN;
            game.prize = (_depositAmount * coef) / 100;
            token.transfer(game.player, game.prize);
            games[totalGamesCount] = game;
        } else {
            game.result = result;
            game.status = Status.LOSE;
            game.prize = 0;
            profit += game.depositAmount;
            games[totalGamesCount] = game;
        }
        totalGamesCount += 1;
        emit GameFinished(
            game.player,
            game.depositAmount,
            game.choice,
            game.result,
            game.prize,
            game.status
        );
    }

    function withdraw(uint256 _amount) external onlyOwner {
        require(token.balanceOf(address(this)) >= _amount, "Not enough funds");
        // require(
        //     games[totalGamesCount].status == Status.WIN,
        //     "Cant withdraww: Youre LOSER!!"
        // );
        //profit -= _amount;
        
        payable(msg.sender).transfer(_amount);
    }

    function mint(uint256 _amount) public {
        token.mint(msg.sender, _amount);
    }

    function burn(uint256 _amount) public {
        token.burn(msg.sender, _amount);
    }

}
// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import "hardhat/console.sol";
import "./GameToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

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

contract CoinFlip is AccessControl {
    enum Status {
        PENDING,
        WIN,
        LOSE
    }

    struct Game {
        uint256 id; // total games count
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
    address public croupier;
    GameToken public token;

    bytes32 public constant croupierRole = keccak256("CROPIER_ROLE");
    bytes32 public constant ownerRole = keccak256("OWNER_ROLE");

    mapping(bytes32 => Game) public games;
    mapping(address => Game) public upcomminggames;

    event GameCreated(address indexed _player, uint256 _choice, bytes32 _seed);

    event Confirmed(
        bytes32 _seed,
        address indexed _player,
        uint256 _result,
        uint256 _amount,
        uint256 _choice
    );

    constructor(address _croupier) {
        croupier = _croupier;
        minDepositAmount = 100;
        maxDepositAmount = 1 ether;
        token = new GameToken();
        coef = 195;

        _setupRole(croupierRole, croupier);
        _setupRole(ownerRole, msg.sender);
    }

    modifier uniqueSeed(bytes32 _seed) {
        require(games[_seed].id == 0, "CoinFlip: Seed not unique");
        _;
    }

    function changeCoef(uint256 _coef) external onlyRole(ownerRole) {
        require(
            _coef > 100 && _coef < 200,
            "Should be greater than 100, less than 200"
        );
        coef = _coef;
    }

    function changeMaxMinBet(
        uint256 _minDepositAmount,
        uint256 _maxDepositAmount
    ) external onlyRole(ownerRole) {
        require(
            _minDepositAmount < _maxDepositAmount,
            "CoinFlip: Invalid Funds:"
        );
        maxDepositAmount = _maxDepositAmount;
        minDepositAmount = _minDepositAmount;
    }

    function play(bytes32 _seed, uint256 _choice)
        external
        payable
        uniqueSeed(_seed)
        onlyRole(ownerRole)
    {
        require(msg.value > 0, "Deposit some Eth");
        require(_choice == 1 || _choice == 0, "Wrong choice");
        require(
            address(this).balance >= (msg.value * coef) / 100,
            "Not enough funds to prize"
        );
        require(
            msg.value >= minDepositAmount && msg.value <= maxDepositAmount,
            "CoinFlip: bet should be in range"
        );

        totalGamesCount++;

        games[_seed] = Game(
            totalGamesCount,
            msg.sender,
            msg.value,
            _choice,
            0,
            0,
            Status.PENDING
        );
    }

    function confirmEth(
        bytes32 _seed,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external payable onlyRole(croupierRole) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, _seed));
        require(
            ecrecover(prefixedHash, _v, _r, _s) == croupier,
            "Invalid sign"
        );

        Game storage game = games[_seed];
        uint256 result = block.number % 2;

        if (result == game.choice) {
            game.result = result;
            game.status = Status.WIN;
            game.prize = ((msg.value * coef) / 100);
            payable(game.player).transfer(game.prize);
        } else {
            game.result = result;
            game.status = Status.LOSE;
            profit += msg.value;
        }

        emit Confirmed(
            _seed,
            game.player,
            game.result,
            game.depositAmount,
            game.choice
        );
    }

    function playEthToken(uint256 _depositAmount, uint256 _choice)
        external
        payable
        onlyRole(ownerRole)
    {
        require(
            (token.balanceOf(msg.sender) >= _depositAmount) ||
                msg.sender.balance >= msg.value,
            "Not enough funds"
        );
        require(
            (msg.value > 0 && _depositAmount == 0) ||
                (_depositAmount > 0 && msg.value == 0)
        );
        require(
            (_depositAmount >= minDepositAmount &&
                _depositAmount <= maxDepositAmount) ||
                (msg.value >= minDepositAmount &&
                    msg.value <= maxDepositAmount),
            "CoinFlip: bet should be in range"
        );
        require(
            (token.balanceOf(address(this)) >= (_depositAmount * coef) / 100) ||
                ((address(this).balance) >= (msg.value * coef) / 100),
            "Not enough funds to prize it"
        );
        require(_choice == 0 || _choice == 1, "Coinflip: wrong choice");

        require(
            token.allowance(msg.sender, address(this)) >= _depositAmount ||
                token.allowance(msg.sender, address(this)) >= msg.value,
            "Not enough allowance"
        );

        // Game memory game = Game(
        //     totalGamesCount,
        //     msg.sender,
        //     _depositAmount,
        //     _choice,
        //     0,
        //     0,
        //     Status.PENDING
        // );

        // confirmEthToken(game);
    }

    function withdraw() external payable onlyRole(ownerRole) {
        require((address(this).balance) >= msg.value, "Not enough funds");
        payable(msg.sender).transfer(msg.value);
    }

    receive() external payable onlyRole(ownerRole) {}
}

// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.9;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract GameToken is ERC20("GameToken", "GT") {
    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount) public {
        _burn(_from, _amount);
    }

    function spendAllowance(address _owner,address _spender, uint256 _amount) public {
        _spendAllowance(_owner, _spender, _amount);
    }

}

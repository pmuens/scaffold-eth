//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    uint8 private decimals_;

    constructor(string memory name, string memory symbol, uint8 decimals__) ERC20(name, symbol) {
        decimals_ = decimals__;
    }

    function decimals() public view virtual override returns (uint8) {
        return decimals_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function faucet() external {
        uint256 amount = 10 * 10 ** uint256(decimals());
        _mint(msg.sender, amount);
    }

    function burn() external {
        uint256 amount = balanceOf(msg.sender);
        _burn(msg.sender, amount);
    }
}

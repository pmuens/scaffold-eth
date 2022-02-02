//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenA is ERC20 {
    constructor() ERC20("Token A", "TKN-A") {}

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function faucet() external {
        uint256 amount = 20 * 10 ** uint256(decimals());
        _mint(msg.sender, amount);
    }

    function burn() external {
        uint256 amount = balanceOf(msg.sender);
        _burn(msg.sender, amount);
    }
}

//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TKN18 is ERC20 {
    constructor() ERC20("Token with 18 Decimals", "TKN-18") {}

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn() external {
        uint256 amount = balanceOf(msg.sender);
        _burn(msg.sender, amount);
    }
}

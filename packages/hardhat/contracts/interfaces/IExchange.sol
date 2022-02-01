// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IExchange {
    event Swap(address indexed sender, IERC20 indexed from, IERC20 indexed to, uint256 amount, uint256 received);

    function swap(IERC20 from, IERC20 to, uint256 amount) external returns (uint256 received);
}
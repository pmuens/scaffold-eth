//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IExchange } from "./interfaces/IExchange.sol";

contract DCA {
    IERC20 public immutable toSell;
    IERC20 public immutable toBuy;
    IExchange public immutable exchange;

    constructor (IERC20 toSell_, IERC20 toBuy_ ,IExchange exchange_) {
        toSell = toSell_;
        toBuy = toBuy_;
        exchange = exchange_;
    }
}
//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { Token } from "./Token.sol";

contract TokenB is Token {
    constructor() Token("Token B", "TKN-B", 18) {}
}

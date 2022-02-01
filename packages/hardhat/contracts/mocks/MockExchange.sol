//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import { IExchange } from "../interfaces/IExchange.sol";

contract MockExchange is IExchange {
    IERC20Metadata public from;
    IERC20Metadata public to;

    constructor(IERC20Metadata from_, IERC20Metadata to_) {
        from = from_;
        to = to_;
    }

    function swap(IERC20, IERC20, uint256 amount) public override returns (uint256) {
        from.transferFrom(msg.sender, address(this), amount);

        uint256 multiplier = 2;
        uint256 received = multiplier * ((amount * 10 ** uint256(to.decimals())) / uint256(10 ** from.decimals()));

        to.transfer(msg.sender, received);

        emit Swap(msg.sender, from, to, amount, received);

        return received;
    }

    function changeDirection() external {
        IERC20Metadata stash = from;

        from = to;
        to = stash;
    }
}

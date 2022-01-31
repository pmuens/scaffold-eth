//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import { IExchange } from "./IExchange.sol";

contract MockExchange is IExchange {
    IERC20Metadata private from;
    IERC20Metadata private to;

    constructor(IERC20Metadata from_, IERC20Metadata to_) {
        from = from_;
        to = to_;
    }

    function swap(uint256 amount) public override returns (uint256) {
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

    function tokenFromAddress() external view returns (address) {
        return address(from);
    }

    function tokenFromSymbol() external view returns (string memory) {
        return from.symbol();
    }

    function tokenToAddress() external view returns (address) {
        return address(to);
    }

    function tokenToSymbol() external view returns (string memory) {
        return to.symbol();
    }
}

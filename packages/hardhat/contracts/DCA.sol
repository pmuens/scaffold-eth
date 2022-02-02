//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import { IExchange } from "./interfaces/IExchange.sol";

library Errors {
    string internal constant _AmountZero = "Amount can't be 0";
    string internal constant _DurationZero = "Duration can't be 0";
    string internal constant _EighteenDecimals = "Token must have 18 decimals";
}

contract DCA {
    struct Allocation {
        uint256 id;
        uint256 amount;
        uint256 startDay;
        uint256 endDay;
        address owner;
    }

    IERC20Metadata public immutable toSell;
    IERC20Metadata public immutable toBuy;
    IExchange public immutable exchange;

    uint256 public today;
    uint256 public dailyAmount;
    uint256 public lastExecution;
    uint256 public nextAllocationId;
    mapping(uint256 => uint256) public removeAmount;
    mapping(uint256 => Allocation) public allocations;

    event Enter(uint256 indexed id, address indexed sender, uint256 indexed amount, uint256 startDay, uint256 endDay);

    constructor (IERC20Metadata toSell_, IERC20Metadata toBuy_ ,IExchange exchange_) {
        require(toSell_.decimals() == 18, Errors._EighteenDecimals);
        require(toBuy_.decimals() == 18, Errors._EighteenDecimals);

        toSell = toSell_;
        toBuy = toBuy_;
        exchange = exchange_;
        lastExecution = _today();
    }

    function enter(uint256 amount, uint256 duration) external returns (uint256) {
        require(amount > 0, Errors._AmountZero);
        require(duration > 0, Errors._DurationZero);

        uint256 total = amount * duration;
        IERC20Metadata(toSell).transferFrom(msg.sender, address(this), total);

        uint256 startDay = _today();

        if (lastExecution == startDay) {
            startDay += 1;
        }

        // We have to subtract 1 from the `duration` given that we'll also swap
        //  on the `startDay`
        // If we have a duration of 1, the `endDay` should be the `startDay`
        // If we have a duration of 2, the `endDay` should be the `startDay` + 1
        // ...
        uint256 endDay = startDay + duration - 1;
        dailyAmount += amount;
        removeAmount[endDay] += amount;

        uint256 id = nextAllocationId;
        nextAllocationId++;

        allocations[id] = Allocation({ id: id, amount: amount, startDay: startDay, endDay: endDay, owner: msg.sender });

        emit Enter(id, msg.sender, amount, startDay, endDay);

        return id;
    }

    function timeTravel() external {
        today += 1;
    }

    function _today() private view returns (uint256) {
        // TODO: Use block timestamp in production
        // return block.timestamp / 1 days;
        return today;
    }
}
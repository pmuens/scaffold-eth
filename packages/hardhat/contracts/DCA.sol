//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import { IExchange } from "./interfaces/IExchange.sol";

library Errors {
    string internal constant _AmountZero = "Amount can't be 0";
    string internal constant _NothingToSell = "Nothing to sell";
    string internal constant _NumSwapsZero = "Number of swaps can't be 0";
    string internal constant _EighteenDecimals = "Token must have 18 decimals";
    string internal constant _FunctionCalledToday = "Function already called today";
}

contract DCA {
    struct Allocation {
        uint256 id;
        uint256 amount;
        uint256 startSwapNum;
        uint256 endSwapNum;
        address owner;
    }

    IERC20Metadata public immutable toSell;
    IERC20Metadata public immutable toBuy;
    IExchange public immutable exchange;

    uint256 public today;
    uint256 public swapAmount;
    uint256 public lastSwapNum;
    uint256 public lastSwapDay;
    uint256 public nextAllocationId;
    mapping(uint256 => uint256) public removeSwapAmount;
    mapping(uint256 => Allocation) public allocations;
    mapping(uint256 => uint256) public toBuyPriceCumulative;

    event Swap(uint256 indexed toSellSold, uint256 toBuyBought, uint256 toBuyPrice);
    event Enter(uint256 indexed id, address indexed sender, uint256 indexed amount, uint256 startSwapNum, uint256 endSwapNum);

    constructor (IERC20Metadata toSell_, IERC20Metadata toBuy_ ,IExchange exchange_) {
        require(toSell_.decimals() == 18, Errors._EighteenDecimals);
        require(toBuy_.decimals() == 18, Errors._EighteenDecimals);

        toSell = toSell_;
        toBuy = toBuy_;
        exchange = exchange_;
    }

    function enter(uint256 amount, uint256 numSwaps) external returns (uint256) {
        require(amount > 0, Errors._AmountZero);
        require(numSwaps > 0, Errors._NumSwapsZero);

        uint256 total = amount * numSwaps;
        IERC20Metadata(toSell).transferFrom(msg.sender, address(this), total);

        uint256 startSwapNum = lastSwapNum + 1;
        uint256 endSwapNum = lastSwapNum + numSwaps;

        swapAmount += amount;
        removeSwapAmount[endSwapNum] += amount;

        uint256 id = nextAllocationId;
        nextAllocationId++;

        allocations[id] = Allocation({
            id: id,
            amount: amount,
            startSwapNum: startSwapNum,
            endSwapNum: endSwapNum,
            owner: msg.sender
        });

        emit Enter(id, msg.sender, amount, startSwapNum, endSwapNum);

        return id;
    }

    function swap() external returns (uint256, uint256) {
        require(lastSwapDay < _today(), Errors._FunctionCalledToday);
        require(swapAmount > 0, Errors._NothingToSell);

        uint256 currentSwapNum = lastSwapNum + 1;

        toSell.approve(address(exchange), swapAmount);
        uint256 toBuyBought = exchange.swap(toSell, toBuy, swapAmount);
        uint256 toSellSold = swapAmount;

        uint256 toBuyPrice = (toBuyBought * 1e18) / toSellSold;

        toBuyPriceCumulative[currentSwapNum] += toBuyPriceCumulative[lastSwapNum] + toBuyPrice;

        swapAmount -= removeSwapAmount[currentSwapNum];

        lastSwapDay = _today();
        lastSwapNum += currentSwapNum;

        emit Swap(toSellSold, toBuyBought, toBuyPrice);

        return (toBuyBought, toBuyPrice);
    }

    function toBuyBalance(uint256 id) external view returns (uint256) {
        Allocation memory allocation = allocations[id];
        uint256 startPrice = toBuyPriceCumulative[allocation.startSwapNum - 1];
        uint256 endPrice = toBuyPriceCumulative[allocation.endSwapNum];
        if (allocation.endSwapNum > lastSwapNum) {
            endPrice = toBuyPriceCumulative[lastSwapNum];
        }
        uint256 cumulativePrice = endPrice - startPrice;
        return (cumulativePrice * allocation.amount) / 1e18;
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
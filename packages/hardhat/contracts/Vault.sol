// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract Vault {
    int256 public counter = 0;

    constructor(int256 value) {
        counter = value;
    }

    function increment() external returns (int256) {
        counter++;
        return counter;
    }

    function decrement() external returns (int256) {
        counter--;
        return counter;
    }
}

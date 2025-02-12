// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AIAgentWallet {
    address public owner;
    address public aiAgent;
    uint256 public dailyLimit;
    uint256 public dailySpent;
    uint256 public lastResetTime;
    bool public isLocked;
    
    mapping(address => bool) public whitelist;
    
    event TransactionExecuted(address to, uint256 value);
    event DailyLimitChanged(uint256 newLimit);
    event WalletLocked(bool locked);
    event WhitelistUpdated(address account, bool status);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyAIAgent() {
        require(msg.sender == aiAgent, "Only AI agent can call this function");
        _;
    }
    
    modifier notLocked() {
        require(!isLocked, "Wallet is locked");
        _;
    }
    
    constructor(address _aiAgent, uint256 _dailyLimit) {
        owner = msg.sender;
        aiAgent = _aiAgent;
        dailyLimit = _dailyLimit;
        lastResetTime = block.timestamp;
    }
    
    function executeTransaction(address to, uint256 value) external onlyAIAgent notLocked {
        require(whitelist[to] || value <= dailyLimit, "Transaction not allowed");
        require(value <= address(this).balance, "Insufficient balance");
        
        // Reset daily spent if 24 hours have passed
        if (block.timestamp >= lastResetTime + 24 hours) {
            dailySpent = 0;
            lastResetTime = block.timestamp;
        }
        
        require(dailySpent + value <= dailyLimit, "Daily limit exceeded");
        dailySpent += value;
        
        payable(to).transfer(value);
        emit TransactionExecuted(to, value);
    }
    
    function setDailyLimit(uint256 _limit) external onlyOwner {
        dailyLimit = _limit;
        emit DailyLimitChanged(_limit);
    }
    
    function toggleLock() external onlyOwner {
        isLocked = !isLocked;
        emit WalletLocked(isLocked);
    }
    
    function updateWhitelist(address account, bool status) external onlyOwner {
        whitelist[account] = status;
        emit WhitelistUpdated(account, status);
    }
    
    function setAIAgent(address _aiAgent) external onlyOwner {
        aiAgent = _aiAgent;
    }
    
    // Emergency withdrawal
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    receive() external payable {}
}

const { expect } = require("chai");
const { ethers } = require("hardhat");

before
describe("Crowd Fund", function () {

    let initCrowdFund;
    this.beforeEach(async function () {
        const InitCrowdFund = await ethers.getContractFactory("CrowdFund");
        initCrowdFund = await InitCrowdFund.deploy();
        await initCrowdFund.deployed();
    })
})
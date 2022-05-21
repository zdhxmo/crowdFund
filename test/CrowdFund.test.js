const { expect } = require("chai");
const CrowdFund = artifacts.require('CrowdFund');

const {
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

var Web3 = require('web3');
var web3 = new Web3('http://localhost:8545');
var BN = web3.utils.BN;

const getCurrentTime = require('./utils/time').getCurrentTime;

contract('CrowdFund', accounts => {
    it("creates a new project", async () => {
        const crowdfund = await CrowdFund.deployed();

        let time = await getCurrentTime();
        const totalDays = time + 30;
        const goal = new BN(10);

        const receipt = await crowdfund.createNewProject("project1", "project description is descriptive", "ipfs:url_hash", totalDays, goal, { from: accounts[0] });

        expectEvent(receipt, 'NewProjectCreated');
    });


    it('contributes to project', async () => {
        const crowdfund = await CrowdFund.deployed();

        const sendTx = new BN(1);
        let time = await getCurrentTime();
        const totalDays = time + 30;
        const goal = new BN(10);

        await crowdfund.createNewProject("project1", "project description is descriptive", "ipfs:url_hash", totalDays, goal, { from: accounts[0] });

        const fundsReceipt = await crowdfund.contributeFunds(1, { from: accounts[1], value: sendTx });

        expectEvent(fundsReceipt, 'FundsReceive');
    });
})


const { expect } = require("chai");
const CrowdFund = artifacts.require('CrowdFund');
const {
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
    time
} = require('@openzeppelin/test-helpers');
const { BigNumber, utils } = require("ethers");

contract('CrowdFund', accounts => {
    it("creates a new project", async () => {
        const crowdfund = await CrowdFund.deployed();
        const goal = BigNumber.from(1);
        const totalDays = await time.latest();

        const receipt = await crowdfund.createNewProject("project1", "project description is descriptive", "ipfs:url_hash", totalDays, goal, { from: accounts[0] });
        expectEvent(receipt, 'NewProjectCreated');
    });


    it('contributes to project', async () => {
        const crowdfund = await CrowdFund.deployed();
        const sendTx = utils.parseUnits("1.0", 17);

        const fundsReceipt = await crowdfund.contributeFunds(1, { from: accounts[1], value: sendTx });
        expectEvent(fundsReceipt, 'FundsReceive');
    });

    it('gives success if goal reached', async () => {
        const crowdfund = await CrowdFund.deployed();
        const sendTx = utils.parseUnits("9.0", 17);
        const fundsReceipt = await crowdfund.contributeFunds(1, { from: accounts[1], value: sendTx });

        expectEvent(fundsReceipt, 'FundsReceive');
        expectEvent(fundsReceipt, 'SuccessFundRaise');
    })

    // TODO: increase time and fail transaction
    /* it('fails contribution is deadline expired', async () => {
        const crowdfund = await CrowdFund.deployed();
        const goal = BigNumber.from(1);
        const totalDays = await time.latest();

        const receipt = await crowdfund.createNewProject("project2", "project description is descriptive", "ipfs:url_hash", totalDays, goal, { from: accounts[0] });
        expectEvent(receipt, 'NewProjectCreated');

        // const sendTx = utils.parseUnits("9.0", 10);
        // const fundsReceipt = await crowdfund.contributeFunds(2, { from: accounts[1], value: sendTx });
        // expectEvent(fundsReceipt, 'FundsReceive');

        // increase time
        await time.increaseTo(totalDays.add(time.duration.hours(1)));

        const sendTx2 = utils.parseUnits("9.0", 10);
        const fundsReceipt2 = await crowdfund.contributeFunds(2, { from: accounts[2], value: sendTx2 });
        expectRevert(fundsReceipt2, 'Contributions cannot be made to this project anymore.')
        // expectEvent(fundsReceipt2, 'ExpireFundraise')
    }) */
})


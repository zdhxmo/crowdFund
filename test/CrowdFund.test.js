const { expect } = require("chai");
const CrowdFund = artifacts.require('CrowdFund');
const {
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
    time
} = require('@openzeppelin/test-helpers');
const { BigNumber, utils } = require("ethers");

contract('CrowdFund', accounts => {
    beforeEach(async () => {
        initialDate = await time.latest();
        crowdfund = await CrowdFund.deployed();
        goal = BigNumber.from(1);
    })

    it("creates a new project", async () => {
        const receipt = await crowdfund.createNewProject("project1", "project description is descriptive", "ipfs:url_hash", initialDate, goal, { from: accounts[0] });
        expectEvent(receipt, 'NewProjectCreated');
    });


    it('contributes to project', async () => {
        const sendTx = utils.parseUnits("1.0", 17);

        const fundsReceipt = await crowdfund.contributeFunds(1, { from: accounts[1], value: sendTx });
        expectEvent(fundsReceipt, 'FundsReceive');
    });

    it('gives success if goal reached', async () => {
        const sendTx = utils.parseUnits("9.0", 17);
        const fundsReceipt = await crowdfund.contributeFunds(1, { from: accounts[1], value: sendTx });

        expectEvent(fundsReceipt, 'FundsReceive');
        expectEvent(fundsReceipt, 'SuccessFundRaise');
    })

    // TODO: increase time and fail transaction
/*     it('fails contribution is deadline expired', async () => {
        const receipt = await crowdfund.createNewProject("project2", "project description is descriptive", "ipfs:url_hash", initialDate, goal, { from: accounts[0] });
        expectEvent(receipt, 'NewProjectCreated');

        // increase time
        await time.increaseTo(initialDate.add(time.duration.years(10)));

        const sendTx2 = utils.parseUnits("1.0", 10);
        await expectRevert(crowdfund.contributeFunds(2, { from: accounts[2], value: sendTx2 }), 'Contributions cannot be made to this project anymore.')
    }) */


})


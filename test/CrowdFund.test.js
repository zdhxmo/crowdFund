const { expect } = require("chai");
const CrowdFund = artifacts.require('CrowdFund');
const {
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

contract('CrowdFund', accounts => {
    it("creates a new project", async () => {
        const con = await CrowdFund.deployed();
        const receipt = await con.createNewProject("project1", "project description is descriptive", "ipfs:url_hash", 30, 30000)
        expectEvent(receipt, 'NewProjectCreated')
    })
})
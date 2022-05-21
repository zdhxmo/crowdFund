const hre = require("hardhat");

async function main() {
    const InitCrowdFund = await hre.ethers.getContractFactory("CrowdFund");
    const initCrowdFund = await InitCrowdFund.deploy();
    await initCrowdFund.deployed();

    console.log("Crowd Fund initialized at:", initCrowdFund.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

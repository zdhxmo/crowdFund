// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/* container to hold all projects */
contract CrowdFund {
    using SafeMath for uint256;

    /* events */
    event NewProjectCreated(
        address contractAddress,
        address projectCreator,
        string projectTitle,
        string projectDesc,
        uint256 projectDeadline,
        uint256 goalAmount
    );

    /* state variables */
    Project[] public allCampaigns;
    mapping(address => Project) addressToProject;

    /** @dev Function to start a new project.
     * @param _name Name of the project
     * @param _description Project Description
     * @param _imageURL IPFS url of image
     * @param _projectDeadline Project deadline in days
     * @param _goal Project goal in wei
     */
    function startNewProject(
        string memory _name,
        string memory _description,
        string memory _imageURL,
        uint256 _projectDeadline,
        uint256 _goal
    ) public {
        uint256 raiseUntil = block.timestamp.add(_projectDeadline.mul(1 days));

        // instantiate new project
        Project newFR = new Project(
            msg.sender,
            _name,
            _description,
            _imageURL,
            raiseUntil,
            _goal
        );

        // push new project to mappings
        allCampaigns.push(newFR);
        addressToProject[address(newFR)] = newFR;

        // emit new project created event
        emit NewProjectCreated(
            address(newFR),
            msg.sender,
            _name,
            _description,
            raiseUntil,
            _goal
        );
    }
}

contract Project {
    /* events */

    /* state variables */
    enum State {
        Fundraise,
        Expire,
        Success
    }
    // address of the creator of project
    address creator;
    // name of the project
    string name;
    // description of the project
    string description;
    // IPFS url of project image
    string image;
    // end of fundraising date
    uint256 projectDeadline;
    // total amount that has been pledged until this point
    uint256 totalPledged;
    // total amount needed for a successful campaign
    uint256 goal;
    // current state of the fundraise
    State currentState;

    // initialize a new project
    constructor(
        address _creator,
        string memory _name,
        string memory _description,
        string memory _imageURL,
        uint256 _projectDeadline,
        uint256 _goal
    ) {
        creator = _creator;
        name = _name;
        description = _description;
        image = _imageURL;
        projectDeadline = _projectDeadline;
        totalPledged = 0;
        goal = _goal;
        currentState = State.Fundraise;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract CrowdFund {
    using SafeMath for uint256;

    /*===== Events =====*/
    event NewProjectCreated(
        uint256 indexed id,
        address projectCreator,
        string projectTitle,
        string projectDesc,
        uint256 projectDeadline,
        uint256 goalAmount
    );

    event ExpireFundraise(
        uint256 indexed id,
        string name,
        uint256 projectDeadline,
        uint256 goal
    );
    event SuccessFundRaise(
        uint256 indexed id,
        string name,
        uint256 projectDeadline,
        uint256 goal
    );
    event FundsReceive(
        uint256 indexed id,
        address contributor,
        uint256 amount,
        uint256 totalPledged,
        uint256 netDifference
    );

    /*===== State variables =====*/
    enum State {
        Fundraise,
        Expire,
        Success
    }

    struct Project {
        // project ID
        uint256 id;
        // address of the creator of project
        address creator;
        // name of the project
        string name;
        // description of the project
        string description;
        // IPFS url hash of project image
        string image;
        // end of fundraising date
        uint256 projectDeadline;
        // total amount that has been pledged until this point
        uint256 totalPledged;
        // total amount needed for a successful campaign
        uint256 goal;
        // how far from the goal
        uint256 netDiff;
        // current state of the fundraise
        State currentState;
    }

    uint256 public count;
    mapping(uint256 => Project) idToProject;
    // project id => contributor => contribution
    mapping(uint256 => mapping(address => uint256)) public contributions;

    /*===== Modifiers =====*/
    modifier checkState(uint256 _id, State _state) {
        Project memory newFR = idToProject[_id];
        require(
            newFR.currentState == _state,
            "Unmatching states. Invalid operation"
        );
        _;
    }

    /** @dev Function to start a new project.
     * @param _name Name of the project
     * @param _description Project Description
     * @param _imageURL IPFS url of image
     * @param _projectDeadline Project deadline in days
     * @param _goal Project goal in wei
     */
    function createNewProject(
        string memory _name,
        string memory _description,
        string memory _imageURL,
        uint256 _projectDeadline,
        uint256 _goal
    ) public {
        // update ID
        uint256 _count = count.add(1);

        // create new fundraise object
        Project memory newFR = Project({
            id: _count,
            creator: msg.sender,
            name: _name,
            description: _description,
            image: _imageURL,
            projectDeadline: _projectDeadline,
            totalPledged: 0,
            goal: _goal,
            netDiff: _goal,
            currentState: State.Fundraise
        });

        // update mapping of id to new project
        idToProject[_count] = newFR;

        // emit event
        emit NewProjectCreated(
            _count,
            msg.sender,
            _name,
            _description,
            _projectDeadline,
            _goal
        );
    }

    /** @dev Function to make a contribution to the project
     * @param _id Project ID where contributions are to be made
     */
    function contributeFunds(uint256 _id)
        public
        payable
        checkState(_id, State.Fundraise)
    {
        require(_id <= count, "Project ID out of range");

        // get project
        Project memory newFR = idToProject[_id];

        require(
            block.timestamp <= newFR.projectDeadline,
            "Contributions cannot be made to this project anymore."
        );

        // isolate contribution of this user for this project
        uint256 contribution = contributions[_id][msg.sender];
        // add to contribution
        contribution = contribution.add(msg.value);

        // increase total contributions pledged to the project
        newFR.totalPledged.add(msg.value);

        // reduce money left from the goal
        newFR.netDiff.sub(msg.value);

        // check if goal is reached -> success
        if (newFR.totalPledged >= newFR.goal) {
            newFR.currentState = State.Success;
            emit SuccessFundRaise(
                _id,
                newFR.name,
                newFR.projectDeadline,
                newFR.goal
            );
        }
        // if time has run out -> expire
        else if (block.timestamp > newFR.projectDeadline) {
            newFR.currentState = State.Expire;
            emit ExpireFundraise(
                _id,
                newFR.name,
                newFR.projectDeadline,
                newFR.goal
            );
        }

        emit FundsReceive(
            _id,
            msg.sender,
            msg.value,
            newFR.totalPledged,
            newFR.netDiff
        );
    }
}

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

    event NewWithdrawalRequest(
        uint256 indexed id,
        string description,
        uint256 amount
    );

    /*===== State variables =====*/
    address payable platformAdmin;

    enum State {
        Fundraise,
        Expire,
        Success
    }

    enum Withdrawal {
        Allow,
        Reject
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
        // number of depositors
        uint256 totalDepositors;
    }

    struct WithdrawalRequest {
        uint32 index;
        // purpose of withdrawal
        string description;
        // amount of withdrawal requested
        uint256 withdrawalAmount;
        // project owner address
        address recipient;
        // total votes received for request
        uint256 approvedVotes;
        // current state of the withdrawal request
        Withdrawal currentWithdrawalState;
    }

    // project states
    uint256 public projectCount;
    mapping(uint256 => Project) public idToProject;
    // project id => contributor => contribution
    mapping(uint256 => mapping(address => uint256)) public contributions;

    // withdrawal approvals
    // project id => approver => vote bool
    mapping(uint256 => mapping(address => bool)) approvals;
    // withdrawal requests
    mapping(uint256 => WithdrawalRequest) idToWithdrawalRequests;
    // project ID => withdrawal request Index
    mapping(uint256 => uint32) latestWithdrawalIndex;


    /*===== Modifiers =====*/
    modifier checkState(uint256 _id, State _state) {
        require(
            idToProject[_id].currentState == _state,
            "Unmatching states. Invalid operation"
        );
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == platformAdmin, "Unauthorized access. Only admin can use this function");
        _;
    }

    modifier onlyProjectOwner(uint256 _id) {
        require(msg.sender == idToProject[_id].creator, "Unauthorized access. Only project owner can use this function");
        _;
    }

    modifier onlyProjectDonor(uint256 _id) {
        require(contributions[_id][msg.sender] > 0, "Unauthorized access. Only project funders can use this function." );
        _;
    }

    modifier checkLatestWithdrawalIndex(uint256 _id, uint32 _withdrawalRequestIndex) {
        require(latestWithdrawalIndex[_id] == _withdrawalRequestIndex, "This is not the latest withdrawal request. Please check again and try later");
        _;
    }

    constructor() {
        platformAdmin = payable(msg.sender);
        projectCount = 0;
    }

    // make contract payable
    fallback() external payable {}

    receive() external payable {}


    /*===== Functions  =====*/

    /** @dev Function to start a new project.
     * @param _name Name of the project
     * @param _description Project Description
     * @param _imageURL IPFS url of image
     * @param _projectDeadlineDays Total days to end of fundraise
     * @param _goalEth Project goal in ETH
     */
    function createNewProject(
        string memory _name,
        string memory _description,
        string memory _imageURL,
        uint256 _projectDeadlineDays,
        uint256 _goalEth
    ) public {
        // update ID
        projectCount = projectCount.add(1);

        // calculate total seconds to project deadline
        uint256 _projectDeadline = _projectDeadlineDays * 86400;

        // log goal as wei
        uint256 _goal = _goalEth * 1e18;

        // create new fundraise object
        Project memory newFR = Project({
            id: projectCount,
            creator: msg.sender,
            name: _name,
            description: _description,
            image: _imageURL,
            projectDeadline: _projectDeadline + block.timestamp,
            totalPledged: 0,
            goal: _goal,
            netDiff: _goal,
            currentState: State.Fundraise,
            totalDepositors: 0
        });

        // update mapping of id to new project
        idToProject[projectCount] = newFR;

        // emit event
        emit NewProjectCreated(
            projectCount,
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
        require(_id <= projectCount, "Project ID out of range");

        require(
            block.timestamp <= idToProject[_id].projectDeadline,
            "Contributions cannot be made to this project anymore."
        );

        // add to contribution
        contributions[_id][msg.sender] += msg.value;

        // increase total contributions pledged to the project
        idToProject[_id].totalPledged += msg.value;

        // reduce money left from the goal
        idToProject[_id].netDiff -= msg.value;

        // add one to total number of depositors for this project
        idToProject[_id].totalDepositors.add(1);

        // set withdrawal approval to false
        approvals[_id][msg.sender] = false;

        // check if goal is reached within timeframe -> success
        if (
            idToProject[_id].totalPledged >= idToProject[_id].goal &&
            block.timestamp < idToProject[_id].projectDeadline
        ) {
            idToProject[_id].currentState = State.Success;
            emit SuccessFundRaise(
                _id,
                idToProject[_id].name,
                idToProject[_id].projectDeadline,
                idToProject[_id].goal
            );
        }

        emit FundsReceive(
            _id,
            msg.sender,
            msg.value,
            idToProject[_id].totalPledged,
            idToProject[_id].netDiff
        );
    }

    /** @dev Function to get refund on expired projects
     * @param _id Project ID
     */
    function getRefund(uint256 _id) public payable returns (bool) {
        require(
            block.timestamp > idToProject[_id].projectDeadline,
            "Project deadline hasn't been reached yet"
        );

        require(
            contributions[_id][msg.sender] > 0,
            "Not a contributor to this project"
        );

        // change project state
        endFundraise(_id);

        uint256 refundAmt = contributions[_id][msg.sender];

        // if money is transfered
        if (payable(msg.sender).send(refundAmt)) {
            // no more contributions to the project
            contributions[_id][msg.sender] = 0;
            // reduce total amount pledged to the project
            idToProject[_id].totalPledged -= refundAmt;
            idToProject[_id].netDiff += refundAmt;

            return true;
        }
    }

    /** @dev Function to end fundraise for a project - Admin or project owner only
     * @param _id Project ID
     */
    function endFundraise(uint256 _id) internal {
        idToProject[_id].currentState = State.Expire;
        emit ExpireFundraise(
            _id,
            idToProject[_id].name,
            idToProject[_id].projectDeadline,
            idToProject[_id].goal
        );
    }

    /**@dev Function to create a request for withdrawal of funds
    * @param _id Project ID
    * @param _requestNumber Index of the request
    * @param _description  Purpose of withdrawal
    * @param _amount Amount of withdrawal requested
    */
    function createWithdrawalRequest(
        uint256 _id,
        uint32 _requestNumber,
        string memory _description,
        uint256 _amount
    ) public onlyProjectOwner(_id) checkState(_id, State.Success){

        // create new withdrawal request
        WithdrawalRequest memory newWR = WithdrawalRequest({
            index: _requestNumber,
            description: _description,
            withdrawalAmount: _amount,
            // funds withdrawn to project owner
            recipient: idToProject[_id].creator,
            // initialized with no votes for request
            approvedVotes: 0,
            // state changes on quorum
            currentWithdrawalState: Withdrawal.Reject
        });

        // update project to request mapping
        idToWithdrawalRequests[_id] = newWR;
        
        latestWithdrawalIndex[_id] = _requestNumber;

        // emit event
        emit NewWithdrawalRequest(_id, _description, _amount);
    }

    /**@dev Function to approve withdrawal of funds
    * @param _id Project ID
    * @param _withdrawalRequestIndex Index of withdrawal request
    */
    function approveWithdrawalRequest(uint256 _id, uint32 _withdrawalRequestIndex) public view onlyProjectDonor(_id) checkState(_id, State.Success) checkLatestWithdrawalIndex(_id, _withdrawalRequestIndex){
        idToWithdrawalRequests[_id].approvedVotes.add(1);
    }

/**@dev Function to reject withdrawal of funds
    * @param _id Project ID
    * @param _withdrawalRequestIndex Index of withdrawal request
    */
    function rejectWithdrawalRequest(uint256 _id, uint32 _withdrawalRequestIndex) public view onlyProjectDonor(_id) checkState(_id, State.Success) checkLatestWithdrawalIndex(_id, _withdrawalRequestIndex){
        idToWithdrawalRequests[_id].approvedVotes.sub(1);
    }

    /**@dev Function to transfer funds to project creator
    * @param _id Project ID
    * @param _withdrawalRequestIndex Index of withdrawal request
    */
    function transferWithdrawalRequestFunds(uint256 _id, uint32 _withdrawalRequestIndex) public payable onlyProjectOwner(_id) checkLatestWithdrawalIndex(_id, _withdrawalRequestIndex) {

        // require quorum
        require(idToWithdrawalRequests[_id].approvedVotes > (idToProject[_id].totalDepositors).div(2), "More than half the total depositors need to approve withdrawal request" );

        // transfer funds to project creator
        payable(idToProject[_id].creator).transfer(idToWithdrawalRequests[_id].withdrawalAmount);

        // approved votes set to 0 for the next request cycle
        idToWithdrawalRequests[_id].approvedVotes = 0;
    }

    

    /*===== Blockchain get functions =====*/

    /** @dev Function to get project details
     * @param _id Project ID
     */
    function getProjectDetails(uint256 _id)
        public
        view
        returns (
            address creator,
            string memory name,
            string memory description,
            string memory image,
            uint256 projectDeadline,
            uint256 totalPledged,
            uint256 goal,
            uint256 netDiff,
            State currentState
        )
    {
        creator = idToProject[_id].creator;
        name = idToProject[_id].name;
        description = idToProject[_id].description;
        image = idToProject[_id].image;
        projectDeadline = idToProject[_id].projectDeadline;
        totalPledged = idToProject[_id].totalPledged;
        goal = idToProject[_id].goal;
        netDiff = idToProject[_id].netDiff;
        currentState = idToProject[_id].currentState;
    }
}

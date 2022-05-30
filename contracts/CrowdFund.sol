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
    
    event SuccessButContinueFundRaise(
        uint256 indexed id,
        string name,
        uint256 projectDeadline,
        uint256 goal
    );

    event FundsReceive(
        uint256 indexed id,
        address contributor,
        uint256 amount,
        uint256 totalPledged
    );

    event NewWithdrawalRequest(
        uint256 indexed id,
        string description,
        uint256 amount
    );

    event GenerateRefund(
        uint256 indexed id,
        address refundRequestUser,
        uint256 refundAmt
    );

    event ApproveRequest(uint256 indexed _id, uint32 _withdrawalRequestIndex);

    event RejectRequest(uint256 indexed _id, uint32 _withdrawalRequestIndex);

    event TransferRequestFunds(
        uint256 indexed _id,
        uint32 _withdrawalRequestIndex
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
        // end of fundraising date
        uint256 projectDeadline;
        // total amount that has been pledged until this point
        uint256 totalPledged;
        // total amount needed for a successful campaign
        uint256 goal;
        // number of depositors
        uint256 totalDepositors;
        // total funds withdrawn from project
        uint256 totalWithdrawn;
        // current state of the fundraise
        State currentState;
        // holds URL of IPFS upload
        string ipfsURL;
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
        // hash of the ipfs storage
        string ipfsHash;
    }

    // project states
    uint256 public projectCount;
    mapping(uint256 => Project) public idToProject;
    // project id => contributor => contribution
    mapping(uint256 => mapping(address => uint256)) public contributions;

    // withdrawal requests
    mapping(uint256 => WithdrawalRequest[]) public idToWithdrawalRequests;
    // project ID => withdrawal request Index
    mapping(uint256 => uint32) latestWithdrawalIndex;
    mapping(uint256 => mapping(address => uint8)) approvals;

    /*===== Modifiers =====*/
    modifier checkState(uint256 _id, State _state) {
        require(
            idToProject[_id].currentState == _state,
            "Unmatching states. Invalid operation"
        );
        _;
    }

    modifier onlyAdmin() {
        require(
            msg.sender == platformAdmin,
            "Unauthorized access. Only admin can use this function"
        );
        _;
    }

    modifier onlyProjectOwner(uint256 _id) {
        require(
            msg.sender == idToProject[_id].creator,
            "Unauthorized access. Only project owner can use this function"
        );
        _;
    }

    modifier onlyProjectDonor(uint256 _id) {
        require(
            contributions[_id][msg.sender] > 0,
            "Unauthorized access. Only project funders can use this function."
        );
        _;
    }

    modifier checkLatestWithdrawalIndex(
        uint256 _id,
        uint32 _withdrawalRequestIndex
    ) {
        require(
            latestWithdrawalIndex[_id] == _withdrawalRequestIndex,
            "This is not the latest withdrawal request. Please check again and try later"
        );
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
     * @param _projectDeadline Total days to end of fundraise
     * @param _goalEth Project goal in ETH
     */
    function createNewProject(
        string memory _name,
        string memory _description,
        uint256 _projectDeadline,
        uint256 _goalEth,
        string memory _ipfsURL
    ) public {
        // update ID
        projectCount += 1;

        // log goal as wei
        uint256 _goal = _goalEth * 1e18;

        // create new fundraise object
        Project memory newFR = Project({
            id: projectCount,
            creator: msg.sender,
            name: _name,
            description: _description,
            projectDeadline: _projectDeadline,
            totalPledged: 0,
            goal: _goal,
            currentState: State.Fundraise,
            totalDepositors: 0,
            totalWithdrawn: 0,
            ipfsURL: _ipfsURL
        });

        // update mapping of id to new project
        idToProject[projectCount] = newFR;

        // initiate total withdrawal requests 
        latestWithdrawalIndex[projectCount] = 0;

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
            msg.value > 0,
            "Invalid transaction. Please send valid amounts to the project"
        );

        require(
            block.timestamp <= idToProject[_id].projectDeadline,
            "Contributions cannot be made to this project anymore."
        );

        // add to contribution
        contributions[_id][msg.sender] += msg.value;

        // increase total contributions pledged to the project
        idToProject[_id].totalPledged += msg.value;

        // add one to total number of depositors for this project
        idToProject[_id].totalDepositors += 1;

        emit FundsReceive(
            _id,
            msg.sender,
            msg.value,
            idToProject[_id].totalPledged
        );
    }

    /** @dev Function to end fundraising drive
    * @param _id Project ID
    */
    function endContributionsExpire(uint256 _id) 
        public 
        onlyProjectDonor(_id)
        checkState(_id, State.Fundraise) 
        {
            require(
                block.timestamp > idToProject[_id].projectDeadline,
                "Contributions cannot be made to this project anymore."
            );

            idToProject[_id].currentState = State.Expire;
            emit ExpireFundraise(_id,
                idToProject[_id].name,
                idToProject[_id].projectDeadline,
                idToProject[_id].goal
            );
        }
    
    /** @dev Function to end fundraising drive with success is total pledged higher than goal. Irrespective of deadline
    * @param _id Project ID
    */
    function endContributionsSuccess(uint256 _id) 
        public 
        onlyProjectOwner(_id)
        checkState(_id, State.Fundraise) 
        {
            require(idToProject[_id].totalPledged >= idToProject[_id].goal, "Did not receive enough funds");

            idToProject[_id].currentState = State.Success;
            emit SuccessFundRaise(
                _id,
                idToProject[_id].name,
                idToProject[_id].projectDeadline,
                idToProject[_id].goal
            );                
        }

    /** @dev Function to get refund on expired projects
     * @param _id Project ID
     */
    function getRefund(uint256 _id)
        public
        payable
        onlyProjectDonor(_id)
        checkState(_id, State.Expire)
    {
        require(
            block.timestamp > idToProject[_id].projectDeadline,
            "Project deadline hasn't been reached yet"
        );

        uint256 refundAmt = contributions[_id][msg.sender];

        // if money is transfered
        if (payable(msg.sender).send(refundAmt)) {
            // no more contributions to the project from this user
            contributions[_id][msg.sender] = 0;
            // reduce total amount pledged to the project
            idToProject[_id].totalPledged -= refundAmt;
        }

        emit GenerateRefund(_id, msg.sender, refundAmt);
    }

    /** @dev Function to create a request for withdrawal of funds
    * @param _id Project ID
    * @param _requestNumber Index of the request
    * @param _description  Purpose of withdrawal
    * @param _amount Amount of withdrawal requested in Wei
    */
    function createWithdrawalRequest(
        uint256 _id,
        uint32 _requestNumber,
        string memory _description,
        uint256 _amount,
        string memory _url
    ) public onlyProjectOwner(_id) checkState(_id, State.Success){
        require(idToProject[_id].totalWithdrawn < idToProject[_id].totalPledged, "Insufficient funds");

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
            currentWithdrawalState: Withdrawal.Reject,
            ipfsHash: _url
        });

        // update project to request mapping
        idToWithdrawalRequests[_id].push(newWR);
        
        latestWithdrawalIndex[_id] += 1;

        // emit event
        emit NewWithdrawalRequest(_id, _description, _amount);
    }

    /** @dev Function to approve withdrawal of funds
    * @param _id Project ID
    * @param _withdrawalRequestIndex Index of withdrawal request
    */
    function approveWithdrawalRequest(
        uint256 _id,
        uint32 _withdrawalRequestIndex
    )
        public
        onlyProjectDonor(_id)
        checkState(_id, State.Success)
        checkLatestWithdrawalIndex(_id, _withdrawalRequestIndex)
    {
        require(approvals[_id][msg.sender] == 0, "Invalid operation. You have already approved this request");

        // get total withdrawal requests made
        uint256 _lastWithdrawal = latestWithdrawalIndex[_id];

        // iterate over all requests for this project
        for (uint256 i = 0; i < _lastWithdrawal; i++) {
            // if request number is equal to index
            if(i + 1 == _withdrawalRequestIndex) {
                // increment approval count
                idToWithdrawalRequests[_id][i].approvedVotes += 1;
            }
        }

        approvals[_id][msg.sender] += 1;
        emit ApproveRequest(_id, _withdrawalRequestIndex);
    }

    /** @dev Function to reject withdrawal of funds
     * @param _id Project ID
     * @param _withdrawalRequestIndex Index of withdrawal request
     */
    function rejectWithdrawalRequest(
        uint256 _id,
        uint32 _withdrawalRequestIndex
    )
        public
        onlyProjectDonor(_id)
        checkState(_id, State.Success)
        checkLatestWithdrawalIndex(_id, _withdrawalRequestIndex)
    {
        require(approvals[_id][msg.sender] == 0, "Invalid operation. You have already approved this request");

        // get total withdrawal requests made
        uint256 _lastWithdrawal = latestWithdrawalIndex[_id];

        // iterate over all requests for this project
        for (uint256 i = 0; i < _lastWithdrawal; i++) {
            // if request number is equal to index
            if(i + 1 == _withdrawalRequestIndex) {
                // increment approval count
                idToWithdrawalRequests[_id][i].approvedVotes -= 1;
            }
        }

        approvals[_id][msg.sender] -= 1;
        emit RejectRequest(_id, _withdrawalRequestIndex);
    }

    /** @dev Function to transfer funds to project creator
     * @param _id Project ID
     * @param _withdrawalRequestIndex Index of withdrawal request
     */
    function transferWithdrawalRequestFunds(
        uint256 _id,
        uint32 _withdrawalRequestIndex
    )
        public
        payable
        onlyProjectOwner(_id)
        checkLatestWithdrawalIndex(_id, _withdrawalRequestIndex)
    {
        // require quorum
        require(
            // _withdrawalRequestIndex - 1 to accomodate 0 start of arrays
            idToWithdrawalRequests[_id][_withdrawalRequestIndex - 1].approvedVotes >
                    (idToProject[_id].totalDepositors).div(2)
            ,
            "More than half the total depositors need to approve withdrawal request"
        );

        // platform fee - $1 for every $100 withdrawn
        uint256 platformFee = (idToWithdrawalRequests[_id][_withdrawalRequestIndex - 1].withdrawalAmount) / 100;
        platformAdmin.transfer(platformFee);

        // transfer remaining funds to project creator
        payable(idToProject[_id].creator).transfer(
            idToWithdrawalRequests[_id][_withdrawalRequestIndex - 1].withdrawalAmount - platformFee
        );

        // approved votes set to 0 for the next request cycle
        idToWithdrawalRequests[_id][_withdrawalRequestIndex - 1].approvedVotes = 0;

        idToProject[_id].totalWithdrawn += idToWithdrawalRequests[_id][_withdrawalRequestIndex - 1].withdrawalAmount;

        emit TransferRequestFunds(_id, _withdrawalRequestIndex);
    }

    /** @dev Function to update project IPFS hash on payment deposit
     * @param _id Project ID
     * @param _url new IPFS hash
     * @param _newPledged Amount pledged by contributor
     * *** IMPORTANT: find a way to make this functionality internal. This CANNOT be a public function in production
     */
    function updateProjectOnContribution(
        uint256 _id,
        string memory _url,
        uint256 _newPledged
    ) public {
        idToProject[_id].ipfsURL = _url;
        idToProject[_id].totalPledged += _newPledged;
    }

    /** @dev Function to update project IPFS hash on state change
     * @param _id Project ID
     * @param _url new IPFS hash
     * @param _state new state of the project
     * *** IMPORTANT: find a way to make this functionality internal. This CANNOT be a public function in production
     */
    function updateProjectOnStateChange(
        uint256 _id, 
        string memory _url, 
        State _state
    ) public {
        idToProject[_id].ipfsURL = _url;
        idToProject[_id].currentState = _state;
    }

    /** @dev Function to update withdrawal request IPFS hash and votes on state change
     * @param _id Project ID
     * @param _url new IPFS hash
     * @param _voteChange new state of the approval count
     * *** IMPORTANT: find a way to make this functionality internal. This CANNOT be a public function in production
     */
    function updateRequestState(uint256 _id, uint32 _withdrawalRequestIndex, string memory _url, uint256 _voteChange) public {
        idToWithdrawalRequests[_id][_withdrawalRequestIndex - 1].approvedVotes += _voteChange;
        idToWithdrawalRequests[_id][_withdrawalRequestIndex - 1].ipfsHash = _url;
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
            uint256 projectDeadline,
            uint256 totalPledged,
            uint256 goal,
            State currentState,
            string memory url
        )
    {
        creator = idToProject[_id].creator;
        name = idToProject[_id].name;
        description = idToProject[_id].description;
        projectDeadline = idToProject[_id].projectDeadline;
        totalPledged = idToProject[_id].totalPledged;
        goal = idToProject[_id].goal;
        currentState = idToProject[_id].currentState;
        url = idToProject[_id].ipfsURL;
    }

    function getAllProjects() public view returns (Project[] memory) {
        uint256 _projectCount = projectCount;

        Project[] memory projects = new Project[](_projectCount);
        for (uint256 i = 0; i < _projectCount; i++) {
            uint256 currentId = i + 1;
            Project storage currentItem = idToProject[currentId];
            projects[i] = currentItem;
        }
        return projects;
    }

    function getProjectURL(uint256 _id)
        public
        view
        returns (string memory url)
    {
        url = idToProject[_id].ipfsURL;
    }

    function getProjectCount() public view returns (uint256 count) {
        count = projectCount;
    }

    function getAllWithdrawalRequests(uint256 _id)
        public
        view
        returns (WithdrawalRequest[] memory)
    {
        uint256 _lastWithdrawal = latestWithdrawalIndex[_id];

        WithdrawalRequest[] memory withdrawals = new WithdrawalRequest[](
            _lastWithdrawal
        );
        for (uint256 i = 0; i < _lastWithdrawal; i++) {
            WithdrawalRequest storage currentRequest = idToWithdrawalRequests[_id][i];
            withdrawals[i] = currentRequest;
        }

        return withdrawals;
    }
}

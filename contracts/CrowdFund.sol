// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error CrowdFund__TransactionFailed();
error CrowdFund__Invalid();

contract CrowdFund is ReentrancyGuard {
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

    event PayCreator( uint256 indexed _id, uint32 _withdrawalRequestIndex, uint256 _amountTransfered);

    event PayPlatform(uint256 indexed _id, uint32 _withdrawalRequestIndex, uint256 _amountTransfered);

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
        address payable creator;
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
        // string ipfsURL;
    }

    struct WithdrawalRequest {
        uint32 index;
        // purpose of withdrawal
        string description;
        // amount of withdrawal requested
        uint256 withdrawalAmount;
        // project owner address
        address payable recipient;
        // total votes received for request
        uint256 approvedVotes;
        // current state of the withdrawal request
        Withdrawal currentWithdrawalState;
        // hash of the ipfs storage
        // string ipfsHash;
        // boolean to represent if amount has been withdrawn
        bool withdrawn;
    }

    mapping(address => uint) balances;

    // project states
    uint256 public projectCount;
    mapping(uint256 => Project) public idToProject;
    // project id => contributor => contribution
    mapping(uint256 => mapping(address => uint256)) public contributions;

    // withdrawal requests
    mapping(uint256 => WithdrawalRequest[]) public idToWithdrawalRequests;
    // project ID => withdrawal request Index
    mapping(uint256 => uint32) latestWithdrawalIndex;

    // project id => request number => address of contributors
    mapping(uint256 => mapping(uint32 => address[])) approvals;
    mapping(uint256 => mapping(uint32 => address[])) rejections;


    /*===== Modifiers =====*/
    modifier checkState(uint256 _id, State _state) {
        if(idToProject[_id].currentState != _state) {
            revert CrowdFund__Invalid();
        }
        _;
    }

    modifier onlyAdmin() {
        if(msg.sender != platformAdmin) {
            revert CrowdFund__Invalid();
        }
        _;
    }

    modifier onlyProjectOwner(uint256 _id) {
        if(msg.sender != idToProject[_id].creator) {
            revert CrowdFund__Invalid();
        }
        _;
    }

    modifier onlyProjectDonor(uint256 _id) {
        if(contributions[_id][msg.sender] < 0) {
            revert CrowdFund__Invalid();
        }
        _;
    }

    modifier checkLatestWithdrawalIndex(
        uint256 _id,
        uint32 _withdrawalRequestIndex
    ) {
        if(latestWithdrawalIndex[_id] != _withdrawalRequestIndex) {
            revert CrowdFund__Invalid();
        }
        _;
    }

    constructor() ReentrancyGuard() {
        platformAdmin = payable(msg.sender);
        projectCount = 0;
    }

    // make contract payable
    fallback() external payable {}
    receive() external payable {
        platformAdmin.transfer(msg.value);
    }
    

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
        uint256 _goalEth
    ) public {
        // update ID
        projectCount += 1;

        // log goal as wei
        uint256 _goal = _goalEth * 1e18;

        // create new fundraise object
        Project memory newFR = Project({
            id: projectCount,
            creator: payable(msg.sender),
            name: _name,
            description: _description,
            projectDeadline: _projectDeadline,
            totalPledged: 0,
            goal: _goal,
            currentState: State.Fundraise,
            totalDepositors: 0,
            totalWithdrawn: 0
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
        nonReentrant()
    {
        if(_id > projectCount) {
            revert CrowdFund__Invalid();
        }

        if(msg.value < 0) {
            revert CrowdFund__TransactionFailed();
        }

        if(block.timestamp > idToProject[_id].projectDeadline) {
            revert CrowdFund__TransactionFailed();
        }

        // transfer contributions to contract address
        balances[address(this)] += msg.value;

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
            // require(
            //     block.timestamp > idToProject[_id].projectDeadline,
            //     "Invalid request. Can only be called after project deadline is reached"
            // );

            if(block.timestamp < idToProject[_id].projectDeadline) {
                revert CrowdFund__TransactionFailed();
            }

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
            // require(idToProject[_id].totalPledged >= idToProject[_id].goal, "Did not receive enough funds");
            if(idToProject[_id].totalPledged < idToProject[_id].goal) {
                revert CrowdFund__TransactionFailed(); 
            }

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
        nonReentrant()
    {
        // require(
        //     block.timestamp > idToProject[_id].projectDeadline,
        //     "Project deadline hasn't been reached yet"
        // );
        if(block.timestamp < idToProject[_id].projectDeadline) {
            revert CrowdFund__Invalid();
        }

        address payable _contributor = payable(msg.sender);
        uint256 _amount = contributions[_id][msg.sender];
        (bool success, ) = _contributor.call{value: _amount}("");
        require(success, "Transaction failed. Please try again later.");
        emit GenerateRefund(_id, _contributor, _amount);

        // update project state
        idToProject[_id].totalPledged -= _amount;
        idToProject[_id].totalDepositors -= 1;
    }

    /** @dev Function to create a request for withdrawal of funds
    * @param _id Project ID
    * @param _requestNumber Index of the request
    * @param _description  Purpose of withdrawal
    * @param _amount Amount of withdrawal requested in ETH
    */
    function createWithdrawalRequest(
        uint256 _id,
        uint32 _requestNumber,
        string memory _description,
        uint256 _amount
    ) public onlyProjectOwner(_id) checkState(_id, State.Success){
        // require(idToProject[_id].totalWithdrawn < idToProject[_id].totalPledged, "Insufficient funds");
        // require(_requestNumber == latestWithdrawalIndex[_id] + 1, "Incorrect request number");

        if(idToProject[_id].totalWithdrawn > idToProject[_id].totalPledged) {
            revert CrowdFund__TransactionFailed();
        }
        if(_requestNumber != latestWithdrawalIndex[_id] + 1) {
            revert CrowdFund__Invalid();
        }

        // convert ETH to Wei units
        uint256 _withdraw = _amount * 1e18;

        // create new withdrawal request
        WithdrawalRequest memory newWR = WithdrawalRequest({
            index: _requestNumber,
            description: _description,
            withdrawalAmount: _withdraw,
            // funds withdrawn to project owner
            recipient: idToProject[_id].creator,
            // initialized with no votes for request
            approvedVotes: 0,
            // state changes on quorum
            currentWithdrawalState: Withdrawal.Reject,
            withdrawn: false
        });

        // update project to request mapping
        idToWithdrawalRequests[_id].push(newWR);
        
        latestWithdrawalIndex[_id] += 1;

        // emit event
        emit NewWithdrawalRequest(_id, _description, _amount);
    }

    /** @dev Function to check whether a given address has approved a specific request
    * @param _id Project ID
    * @param _withdrawalRequestIndex Index of the withdrawal request
    * @param _checkAddress Address of the request initiator
    */
    function _checkAddressInApprovalsIterator(
        uint256 _id,
        uint32 _withdrawalRequestIndex, 
        address _checkAddress
    )
        internal
        view 
        returns(bool approved) 
    {
        // iterate over the array specific to this id and withdrawal request
        for (uint256 i = 0; i < approvals[_id][_withdrawalRequestIndex - 1].length; i++) {
            // if address is in the array, return true
            if(approvals[_id][_withdrawalRequestIndex - 1][i] == _checkAddress) {
                approved = true;
            }
        }
    }

    /** @dev Function to check whether a given address has rejected a specific request
    * @param _id Project ID
    * @param _withdrawalRequestIndex Index of the withdrawal request
    * @param _checkAddress Address of the request initiator
    */
    function _checkAddressInRejectionIterator(
        uint256 _id,
        uint32 _withdrawalRequestIndex, 
        address _checkAddress
    ) 
        internal
        view
        returns(bool rejected) 
    {
        // iterate over the array specific to this id and withdrawal request
        for (uint256 i = 0; i < rejections[_id][_withdrawalRequestIndex - 1].length; i++) {
            // if address is in the array, return true
            if(rejections[_id][_withdrawalRequestIndex - 1][i] == _checkAddress) {
                rejected = true;
            }
        }
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
        // confirm msg.sender hasn't approved request yet
        // require(!_checkAddressInApprovalsIterator(_id, _withdrawalRequestIndex, msg.sender), 
        //         "Invalid operation. You have already approved this request");
        if(_checkAddressInApprovalsIterator(_id, _withdrawalRequestIndex, msg.sender)) {
            revert CrowdFund__Invalid();
        }

        if(_checkAddressInRejectionIterator(_id, _withdrawalRequestIndex, msg.sender)) {
            revert CrowdFund__Invalid();
        }

        // require(!_checkAddressInRejectionIterator(_id, _withdrawalRequestIndex, msg.sender), 
        //         "Invalid operation. You have rejected this request");

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

        // push msg.sender to approvals list for this request
        approvals[_id][_withdrawalRequestIndex - 1].push(msg.sender);
        
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
        // confirm user hasn't approved request
        // require(!_checkAddressInApprovalsIterator(_id, _withdrawalRequestIndex, msg.sender), 
        //         "Invalid operation. You have approved this request");
        // require(!_checkAddressInRejectionIterator(_id, _withdrawalRequestIndex, msg.sender), 
        //         "Invalid operation. You have already rejected this request");

        if(_checkAddressInApprovalsIterator(_id, _withdrawalRequestIndex, msg.sender)) {
            revert CrowdFund__Invalid();
        }

        if(_checkAddressInRejectionIterator(_id, _withdrawalRequestIndex, msg.sender)) {
            revert CrowdFund__Invalid();
        }
        // get total withdrawal requests made
        uint256 _lastWithdrawal = latestWithdrawalIndex[_id];

        // iterate over all requests for this project
        for (uint256 i = 0; i < _lastWithdrawal; i++) {
            // if request number is equal to index
            if(i + 1 == _withdrawalRequestIndex) {
                // if there hve been approvals, decrement
                if(idToWithdrawalRequests[_id][i].approvedVotes != 0) {
                    // decrement approval count
                    idToWithdrawalRequests[_id][i].approvedVotes -= 1;
                } 
                    // else if no one has approved request yet, keep approvals to 0
                else {
                    idToWithdrawalRequests[_id][i].approvedVotes == 0;
                }
            }
        }

        // add msg.sender to rejections list for this request
        rejections[_id][_withdrawalRequestIndex - 1].push(msg.sender);

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
        nonReentrant()
    {
        // require(
        //     // _withdrawalRequestIndex - 1 to accomodate 0 start of arrays
        //     idToWithdrawalRequests[_id][_withdrawalRequestIndex - 1].approvedVotes >
        //             (idToProject[_id].totalDepositors).div(2)
        //     ,
        //     "More than half the total depositors need to approve withdrawal request"
        // );

        if(idToWithdrawalRequests[_id][_withdrawalRequestIndex - 1].approvedVotes <
                    (idToProject[_id].totalDepositors).div(2)) {
            revert CrowdFund__TransactionFailed();
        }

        // require(idToWithdrawalRequests[_id][_withdrawalRequestIndex - 1].withdrawn == false, 
        //         "Withdrawal has laready been made for this request");

        if(idToWithdrawalRequests[_id][_withdrawalRequestIndex - 1].withdrawn == true) {
            revert CrowdFund__TransactionFailed();
        }
        // require(idToWithdrawalRequests[_id][_withdrawalRequestIndex - 1].withdrawalAmount < idToProject[_id].totalPledged, 
        //         "Insufficient funds");

        if(idToWithdrawalRequests[_id][_withdrawalRequestIndex - 1].withdrawalAmount > idToProject[_id].totalPledged) {
            revert CrowdFund__TransactionFailed();
        }
        
        WithdrawalRequest storage cRequest = idToWithdrawalRequests[_id][_withdrawalRequestIndex - 1];

        // flat 0.3% platform fee
        uint256 platformFee = (cRequest.withdrawalAmount.mul(3)).div(1000);
        (bool pfSuccess, ) = payable(platformAdmin).call{value: platformFee}("");
        require(pfSuccess, "Transaction failed. Please try again later.");
        emit PayPlatform(_id, _withdrawalRequestIndex, platformFee);
        
        // transfer funds to creator
        address payable _creator = idToProject[_id].creator;
        uint256 _amount = cRequest.withdrawalAmount - platformFee;
        (bool success, ) = _creator.call{value: _amount}("");
        require(success, "Transaction failed. Please try again later.");
        emit PayCreator(_id, _withdrawalRequestIndex, _amount);

        // update states
        cRequest.withdrawn = true;
        idToProject[_id].totalWithdrawn += cRequest.withdrawalAmount;

        emit TransferRequestFunds(_id, _withdrawalRequestIndex);
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
            uint256 totalDepositors,
            uint256 totalWithdrawn,
            State currentState

        )
    {
        creator = idToProject[_id].creator;
        name = idToProject[_id].name;
        description = idToProject[_id].description;
        projectDeadline = idToProject[_id].projectDeadline;
        totalPledged = idToProject[_id].totalPledged;
        goal = idToProject[_id].goal;
        totalDepositors = idToProject[_id].totalDepositors;
        totalWithdrawn = idToProject[_id].totalWithdrawn;
        currentState = idToProject[_id].currentState;
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

    function getContributions(uint256 _id, address _contributor) public view returns(uint256) {
        return contributions[_id][_contributor];
    }
}

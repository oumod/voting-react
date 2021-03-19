// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "./Ownable.sol";

/**
 * @title Voting
 * @author groupe 5 : yann, louisplessis, oudom
 * @notice Défi 1
 * @dev administrateur du vote = owner
 */
 contract Voting is Ownable {
    // Les différentes phases du vote se succèdant
    enum WorkflowStatus {
        RegisteringVoters, // 0
        ProposalsRegistrationStarted, // 1
        ProposalsRegistrationEnded, // 2
        VotingSessionStarted, // 3
        VotingSessionEnded, // 4
        VotesTallied // 5
    }

    event VoterRegistered(address voterAddress);
    event ProposalsRegistrationStarted();
    event ProposalsRegistrationEnded();
    event ProposalRegistered(uint proposalId);
    event VotingSessionStarted();
    event VotingSessionEnded();
    event Voted (address voter, uint proposalId);
    event VotesTallied();
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        bool hasProposed; // amélioration par rapport à l'énoncé
        uint votedProposalId;
    }

    struct Proposal {
        string description;
        uint voteCount;
    }

    // status du contrat
    WorkflowStatus public workflowStatus;
    // pour stocker les électeurs et leurs votes
    Voter[] private voters;
    // pour enregistrer les électeurs (adresse Ethereum => id, id commence à 1)
    mapping (address => uint) private whitelist;
    // pour enregistrer les propositions
    Proposal[] private proposals;
      // pour get all users in whitelist, impossible de return un mapping?
    address[] private whitelistArray;
    // index de la proposition ayant reçu le plus de votes, commence à 0
    uint public winningProposalId;

    modifier isWhitelisted() {
        require(whitelist[msg.sender] > 0, "Vous n\'etes pas inscrit !");
        _;
    }

    constructor() public {
        workflowStatus = WorkflowStatus.RegisteringVoters;
    }

   /**
    * @notice L'administrateur du vote enregistre une liste blanche d'électeurs identifiés par leur adresse Ethereum.
    */
    function register(address _address) public onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, "La phase d\'enregistrement des electeurs est terminee !");
        require(whitelist[msg.sender] == 0, "Adresse enregistree !");
        voters.push(Voter(true, false, false, 0));
        whitelistArray.push(_address);
        whitelist[_address] = voters.length;
        emit VoterRegistered(_address);
        
    }

    /**
     * @notice L'administrateur du vote commence la session d'enregistrement de la proposition.
     */
    function startProposalsRegistration() public  onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, "La phase d\'enregistrement des propositions ne peut etre demarree !");
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        emit ProposalsRegistrationStarted();
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    }

     /**
     * @notice Permet de récupérer la liste des propositions.
     */
    function getProposal() public  view returns (Proposal[] memory){
        require(workflowStatus != WorkflowStatus.RegisteringVoters, "La phase d\'enregistrement des propositions n\'a pas commence !");
        return proposals;
    }

      /**
     * @notice Permet de récupérer la liste des propositions.
     */
    function getWhitelist() public  view returns (address[] memory){
       // require(workflowStatus != WorkflowStatus.RegisteringVoters, "La phase d\'enregistrement des propositions n\'a pas commence !");
        return whitelistArray;
    }


    function getWorkflowStatus() public view returns (WorkflowStatus) {
         return workflowStatus;       
     }

    /**
     * @notice Les électeurs inscrits sont autorisés à enregistrer leurs propositions pendant que la session d'enregistrement est active.
     */
    function registerProposal(string memory _description) public isWhitelisted {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, "La phase d\'enregistrement des propositions n\'est pas en cours !");
        uint voterId = whitelist[msg.sender] - 1;
        require(voters[voterId].hasProposed == false, "Vous avez deja fait une proposition !");
        proposals.push(Proposal(_description, 0));
        voters[voterId].hasProposed = true;
        emit ProposalRegistered(proposals.length);
    }

    /**
     * @notice  L'administrateur de vote met fin à la session d'enregistrement des propositions.
     */
    function endProposalsRegistration() public  onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, "La phase d'enregistrement des propositions n'est pas en cours !");
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit ProposalsRegistrationEnded();
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
    }

    /**
     * @notice L'administrateur du vote commence la session de vote.
     */
    function startVotingSession() public  onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationEnded, "La session de vote ne peut etre demarree !");
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit VotingSessionStarted();
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);
    }

    /**
     * @notice Les électeurs inscrits votent pour leurs propositions préférées.
     */
    function vote(uint _proposalId) public isWhitelisted {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "La session de vote n'est pas en cours !");
        uint voterId = whitelist[msg.sender] - 1;
        require(voters[voterId].hasVoted == false, "Vous avez deja vote !");
        require(_proposalId < proposals.length , "Id de proposition invalide");
        voters[voterId].votedProposalId = _proposalId;
        voters[voterId].hasVoted = true;
        proposals[_proposalId].voteCount++;
        emit Voted(msg.sender, _proposalId);
    }

    /**
     * @notice L'administrateur du vote met fin à la session de vote.
     */
    function endVotingSession() public  onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "La session de vote n\'est pas en cours !");
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit VotingSessionEnded();
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    }

    /**
     * @notice L'administrateur du vote comptabilise les votes.
     */
    function tally() public onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionEnded, "La session de vote n\'est pas terminee !");
        uint maxVoteCount = 0;
        for (uint i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > maxVoteCount) {
                winningProposalId = i;
                maxVoteCount = proposals[i].voteCount;
            }
        }
        workflowStatus = WorkflowStatus.VotesTallied;
        emit VotesTallied();
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }
}
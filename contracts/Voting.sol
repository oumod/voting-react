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
    mapping (address => Voter) private whitelist;
    // pour enregistrer les propositions
    Proposal[] private proposals;
      // pour get all users in whitelist, impossible de return un mapping?
    address[] private whitelistArray;
    // index de la proposition ayant reçu le plus de votes, commence à 0
    uint public winningProposalId;

    modifier isWhitelisted() {
        require(whitelist[msg.sender].isRegistered, "Pas inscrit");
        _;
    }

   /**
    * @notice L'administrateur du vote enregistre une liste blanche d'électeurs identifiés par leur adresse Ethereum.
    */
    function register(address addr) external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, "Enregistrement des electeurs termine");
        require(!whitelist[msg.sender].isRegistered, "Adresse deja enregistree !");
        whitelistArray.push(addr);
        whitelist[addr] = Voter(true, false, false, 0);
        emit VoterRegistered(addr);
        
    }

    /**
     * @notice L'administrateur du vote commence la session d'enregistrement de la proposition.
     */
    function startProposalsRegistration() external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, "Enregistrement des propositions termine");
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        emit ProposalsRegistrationStarted();
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    }

     /**
     * @notice Permet de récupérer la liste des propositions.
     */
    function getProposal() external view returns (Proposal[] memory){
        require(workflowStatus != WorkflowStatus.RegisteringVoters, "Enregistrement des propositions pas en cours");
        return proposals;
    }

      /**
     * @notice Permet de récupérer la liste des propositions.
     */
    function getWhitelist() external view returns (address[] memory){
        return whitelistArray;
    }


    function getWorkflowStatus() external view returns (WorkflowStatus) {
         return workflowStatus;       
     }

    /**
     * @notice Les électeurs inscrits sont autorisés à enregistrer leurs propositions pendant que la session d'enregistrement est active.
     */
    function registerProposal(string memory description) external isWhitelisted {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, "Enregistrement des propositions pas en cours");
        require(!whitelist[msg.sender].hasProposed, "Proposition deja faite");
        proposals.push(Proposal(description, 0));
        whitelist[msg.sender].hasProposed = true;
        emit ProposalRegistered(proposals.length);
    }

    /**
     * @notice  L'administrateur de vote met fin à la session d'enregistrement des propositions.
     */
    function endProposalsRegistration() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, "Enregistrement des propositions pas en cours");
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit ProposalsRegistrationEnded();
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
    }

    /**
     * @notice L'administrateur du vote commence la session de vote.
     */
    function startVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationEnded, "Enregistrement des propositions pas terminee");
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit VotingSessionStarted();
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);
    }

    /**
     * @notice Les électeurs inscrits votent pour leurs propositions préférées.
     */
    function vote(uint proposalId) external isWhitelisted {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "Vote pas en cours");
        require(!whitelist[msg.sender].hasVoted, "Deja vote");
        require(proposalId < proposals.length , "Id de proposition invalide");
        whitelist[msg.sender].votedProposalId = proposalId;
        whitelist[msg.sender].hasVoted = true;
        proposals[proposalId].voteCount++;
        emit Voted(msg.sender, proposalId);
    }

    /**
     * @notice L'administrateur du vote met fin à la session de vote.
     */
    function endVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "Vote pas en cours");
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit VotingSessionEnded();
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    }

    /**
     * @notice L'administrateur du vote comptabilise les votes.
     */
    function tally() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionEnded, "Vote pas termine");
        uint maxVoteCount = 0;
        uint winningProposalIdLocal = 0;
        for (uint i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > maxVoteCount) {
                winningProposalIdLocal = i;
                maxVoteCount = proposals[i].voteCount;
            }
        }
        winningProposalId = winningProposalIdLocal;
        workflowStatus = WorkflowStatus.VotesTallied;
        emit VotesTallied();
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }
}
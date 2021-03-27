const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const Voting = artifacts.require("Voting");

contract("Voting", accounts => {
    const admin = accounts[0];
    const electeur1 = accounts[1];

    beforeEach(async () => {
        this.votingInstance = await Voting.new({ from: admin });
    });

    // Test de function getWhitelist() external view returns (address[] memory)
    it("getWhitelist() doit retourner un tableau vide", async () => {
        // GIVEN
        // Pas encore d'électeurs enregistrés

        // WHEN
        const whitelist = await this.votingInstance.getWhitelist();

        // THEN
        expect(whitelist.length).to.equal(0);
    });
    it("getWhitelist() doit retourner un tableau avec une adresse", async () => {
        // GIVEN
        await this.votingInstance.register(electeur1, { from: admin });

        // WHEN
        const whitelist = await this.votingInstance.getWhitelist();

        // THEN
        expect(whitelist.length).to.equal(1);
    });

    // Test de function getWorkflowStatus() external view returns (WorkflowStatus)
    it("getWorkflowStatus() doit retourner RegisteringVoters", async () => {
        // GIVEN
        // Etat initial

        // THEN
        expect(await this.votingInstance.getWorkflowStatus()).to.be.bignumber.equal(new BN(0));
    });
    it("getWorkflowStatus() doit retourner ProposalsRegistrationStarted", async () => {
        // GIVEN
        // WHEN
        await this.votingInstance.startProposalsRegistration({ from: admin });

        // THEN
        expect(await this.votingInstance.getWorkflowStatus()).to.be.bignumber.equal(new BN(1));
    });
    it("getWorkflowStatus() doit retourner ProposalsRegistrationEnded", async () => {
        // GIVEN
        // WHEN
        await this.votingInstance.startProposalsRegistration({ from: admin });
        await this.votingInstance.endProposalsRegistration({ from: admin });

        // THEN
        expect(await this.votingInstance.getWorkflowStatus()).to.be.bignumber.equal(new BN(2));
    });
    it("getWorkflowStatus() doit retourner VotingSessionStarted", async () => {
        // GIVEN
        // WHEN
        await this.votingInstance.startProposalsRegistration({ from: admin });
        await this.votingInstance.endProposalsRegistration({ from: admin });
        await this.votingInstance.startVotingSession({ from: admin });

        // THEN
        expect(await this.votingInstance.getWorkflowStatus()).to.be.bignumber.equal(new BN(3));
    });
    it("getWorkflowStatus() doit retourner VotingSessionEnded", async () => {
        // GIVEN
        // WHEN
        await this.votingInstance.startProposalsRegistration({ from: admin });
        await this.votingInstance.endProposalsRegistration({ from: admin });
        await this.votingInstance.startVotingSession({ from: admin });
        await this.votingInstance.endVotingSession({ from: admin });

        // THEN
        expect(await this.votingInstance.getWorkflowStatus()).to.be.bignumber.equal(new BN(4));
    });
    it("getWorkflowStatus() doit retourner VotesTallied", async () => {
        // GIVEN
        // WHEN
        await this.votingInstance.startProposalsRegistration({ from: admin });
        await this.votingInstance.endProposalsRegistration({ from: admin });
        await this.votingInstance.startVotingSession({ from: admin });
        await this.votingInstance.endVotingSession({ from: admin });
        await this.votingInstance.tally({ from: admin });

        // THEN
        expect(await this.votingInstance.getWorkflowStatus()).to.be.bignumber.equal(new BN(5));
    });

    // Test de `function registerProposal(string memory description) external isWhitelisted`
    it("registerProposal(description) doit revert si le sender n'est pas whitelisté", async () => {
        await expectRevert(this.votingInstance.registerProposal("proposition", { from: electeur1 }), "Pas inscrit");
    });
    it("registerProposal(description) doit revert si le workflow n'est pas au status ProposalsRegistrationStarted", async () => {
        // GIVEN
        // WHEN
        await this.votingInstance.register(electeur1, { from: admin });

        // THEN
        await expectRevert(this.votingInstance.registerProposal("proposition", { from: electeur1 }), "Enregistrement des propositions pas en cours");
    });
    it("registerProposal(description) doit émettre 1 évènement ProposalRegistered", async () => {
        // GIVEN
        await this.votingInstance.register(electeur1, { from: admin });
        await this.votingInstance.startProposalsRegistration({ from: admin });

        // WHEN
        const receipt = await this.votingInstance.registerProposal("proposition 1", { from: electeur1 });

        // THEN
        const proposals = await this.votingInstance.getProposal();
        expect(proposals.length).to.equal(1);
        expectEvent(receipt, 'ProposalRegistered', {
            proposalId: "1",
        });
    });
    it("registerProposal(description) doit revert si un électeur a déjà fait une proposition", async () => {
        // GIVEN
        await this.votingInstance.register(electeur1, { from: admin });
        await this.votingInstance.startProposalsRegistration({ from: admin });
        await this.votingInstance.registerProposal("proposition 1", { from: electeur1 });

        // WHEN
        // THEN
        await expectRevert(this.votingInstance.registerProposal("proposition 2", { from: electeur1 }), "Proposition deja faite");
    });

    // Test de `function endProposalsRegistration() external onlyAdmin`
    it("endProposalsRegistration() doit revert si le sender n'est pas l'admin", async () => {
        // GIVEN
        const sender = electeur1;

        // WHEN
        // THEN
        await expectRevert(this.votingInstance.endProposalsRegistration({ from: sender }), "Admin requis");
    });
    it("endProposalsRegistration() doit revert si le workflow n'est pas au status ProposalsRegistrationStarted", async () => {
        // GIVEN
        const status = await this.votingInstance.getWorkflowStatus();

        // WHEN
        expect(status).to.be.bignumber.not.equal(new BN(1));

        // THEN
        await expectRevert(this.votingInstance.endProposalsRegistration({ from: admin }), "Enregistrement des propositions pas en cours");
    });
    it("endProposalsRegistration() doit émettre 2 évènements, ProposalsRegistrationEnded et WorkflowStatusChange", async () => {
        // GIVEN
        await this.votingInstance.startProposalsRegistration({ from: admin });

        // WHEN
        const receipt = await this.votingInstance.endProposalsRegistration({ from: admin });

        // THEN
        expectEvent(receipt, 'ProposalsRegistrationEnded');
        expectEvent(receipt, 'WorkflowStatusChange', {
            previousStatus: "1",
            newStatus: "2"
        });
    });
});
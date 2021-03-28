const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const Voting = artifacts.require("Voting");

contract("Voting", accounts => {
    const admin = accounts[0];
    const electeur1 = accounts[1];

    beforeEach(async () => {
        this.votingInstance = await Voting.new({ from: admin });
    });

    // Test de function owner() external view returns(address)
    it("owner() retourne le owner (=admin)", async () => {
        // GIVEN
        const owner = admin;

        // WHEN
        const addr = await this.votingInstance.owner();

        // THEN
        expect(addr).to.equal(owner);
    });

    // function register(address register) external onlyAdmin
    it("register(addr) doit revert si le sender n'est pas l'admin", async () => {
        // GIVEN
        const sender = electeur1;
        const addr = admin;

        // WHEN
        // THEN
        await expectRevert(this.votingInstance.register(addr, { from: sender }), "Admin requis");
    });
    it("register(addr) doit revert si le workflow n'est pas au status RegisteringVoters", async () => {
        // GIVEN
        const sender = admin;
        const addr = admin;
        await this.votingInstance.startProposalsRegistration({ from: sender });
        const status = await this.votingInstance.getWorkflowStatus({ from: sender });

        // WHEN
        // THEN
        expect(status).to.be.bignumber.not.equal(new BN(0));
        await expectRevert(this.votingInstance.register(addr, { from: sender }), "Enregistrement des electeurs termine");
    });
    it("register(addr) doit revert si addr est déjà enregistrée", async () => {
        // GIVEN
        const sender = admin;
        const addr = admin;
        // Enregistrement de l'adresse de l'admun ne 1ère fois
        await this.votingInstance.register(addr, { from: sender })

        // WHEN
        // THEN
        await expectRevert(this.votingInstance.register(addr, { from: sender }), "Adresse deja enregistree !");
    });
    it("register(addr) doit ajouter addr dans la whitelisté et émettre 1 évènement VoterRegistered", async () => {
        // GIVEN
        const sender = admin;
        const addr = admin;

        // WHEN
        const receipt = await this.votingInstance.register(addr, { from: sender });

        // THEN
        const whitelist = await this.votingInstance.getWhitelist();
        expect(whitelist[0]).to.be.equal(addr);
        expectEvent(receipt, 'VoterRegistered', {
            voterAddress: addr
        });
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
            proposalId: "0",
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
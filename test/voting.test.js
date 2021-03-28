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

    // Test de `function startVotingSession() external onlyAdmin`
    it("startVotingSession() doit revert si le sender n'est pas l'admin", async () => {
        // GIVEN
        const sender = electeur1;

        // WHEN
        // THEN
        await expectRevert(this.votingInstance.startVotingSession({ from: sender }), "Admin requis");
    });
    it("startVotingSession() doit revert si le workflow n'est pas au status ProposalsRegistrationEnded", async () => {
        // GIVEN
        const status = await this.votingInstance.getWorkflowStatus();

        // WHEN
        expect(status).to.be.bignumber.not.equal(new BN(2));

        // THEN
        await expectRevert(this.votingInstance.startVotingSession({ from: admin }), "Enregistrement des propositions pas terminee");
    });
    it("startVotingSession() doit émettre 2 évènements, VotingSessionStarted et WorkflowStatusChange", async () => {
        // GIVEN
        await this.votingInstance.register(electeur1, { from: admin });
        await this.votingInstance.startProposalsRegistration({ from: admin });
        await this.votingInstance.registerProposal("proposition 1", { from: electeur1 });
        await this.votingInstance.endProposalsRegistration({ from: admin });

        // WHEN
        const receipt = await this.votingInstance.startVotingSession({ from: admin });

        // THEN
        expectEvent(receipt, 'VotingSessionStarted');
        expectEvent(receipt, 'WorkflowStatusChange', {
            previousStatus: "2",
            newStatus: "3"
        });
    });

    // Test de `function vote(uint proposalId) external isWhitelisted`
    it("vote(proposalId) doit revert si le sender n'est pas whitelisté", async () => {
        // GIVEN
        const sender = electeur1;
        const proposalId = 0;
        // Personne dans la whitelist

        // WHEN
        // THEN
        await expectRevert(this.votingInstance.vote(proposalId, { from: sender }), "Pas inscrit");
    });
    it("vote(proposalId) doit revert si le workflow n'est pas au status VotingSessionStarted", async () => {
        // GIVEN
        const sender = electeur1;
        const proposalId = 0;
        // sender enregistré
        await this.votingInstance.register(sender, { from: admin });
        // le workflow est au status initial

        // WHEN
        // THEN
        const status = await this.votingInstance.getWorkflowStatus();
        expect(status).to.be.bignumber.not.equal(new BN(3));
        await expectRevert(this.votingInstance.vote(proposalId, { from: sender }), "Vote pas en cours");
    });
    it("vote(proposalId) doit revert si le sender a déjà voté", async () => {
        // GIVEN
        const sender = electeur1;
        const proposalId = 0;
        await this.votingInstance.register(sender, { from: admin });
        await this.votingInstance.startProposalsRegistration({ from: admin });
        await this.votingInstance.registerProposal("proposition 1", { from: sender });
        await this.votingInstance.endProposalsRegistration({ from: admin });
        await this.votingInstance.startVotingSession({ from: admin });
        // sender vote une 1ère fois
        await this.votingInstance.vote(proposalId, { from: sender });

        // GIVEN
        // THEN
        // sender vote une 2ème fois
        await expectRevert(this.votingInstance.vote(proposalId, { from: sender }), "Deja vote");
    });
    it("vote(proposalId) doit revert proposalId est invalide", async () => {
        // GIVEN
        const sender = electeur1;
        const proposalId = 0;
        await this.votingInstance.register(sender, { from: admin });
        await this.votingInstance.startProposalsRegistration({ from: admin });
        // Pas de proposition, donc proposalId est invalide quelque soit sa valeur
        await this.votingInstance.endProposalsRegistration({ from: admin });
        await this.votingInstance.startVotingSession({ from: admin });

        // GIVEN
        // THEN
        await expectRevert(this.votingInstance.vote(proposalId, { from: sender }), "Id de proposition invalide");
    });
    it("vote(proposalId) doit incrémenter le nombre de votes pour proposalId et émettre 1 évènement Voted", async () => {
        // GIVEN
        const sender = electeur1;
        const proposalId = 0;
        await this.votingInstance.register(sender, { from: admin });
        await this.votingInstance.startProposalsRegistration({ from: admin });
        await this.votingInstance.registerProposal("proposition 1", { from: sender });
        await this.votingInstance.endProposalsRegistration({ from: admin });
        await this.votingInstance.startVotingSession({ from: admin });
        const voteCountBefore = (await this.votingInstance.getProposal())[0].voteCount;

        // WHEN
        const receipt = await this.votingInstance.vote(proposalId, { from: sender });

        // THEN
        const voteCountAfter = (await this.votingInstance.getProposal())[0].voteCount;
        expect(voteCountAfter).to.be.bignumber.equal(new BN(voteCountBefore + 1));
        expectEvent(receipt, 'Voted', {
            voter: sender,
            proposalId: new BN(proposalId)
        });
    });

    // Test de `function endVotingSession() external onlyAdmin`
    it("endVotingSession() doit revert si le sender n'est pas l'admin", async () => {
        // GIVEN
        const sender = electeur1;

        // WHEN
        // THEN
        await expectRevert(this.votingInstance.endVotingSession({ from: sender }), "Admin requis");
    });

    // Test de `function endVotingSession() external onlyAdmin`
    it("endVotingSession() doit revert si le sender n'est pas l'admin", async () => {
        // GIVEN
        const sender = electeur1;

        // WHEN
        // THEN
        await expectRevert(this.votingInstance.endVotingSession({ from: sender }), "Admin requis");
    });
    it("endVotingSession() doit revert si le workflow n'est pas au status VotingSessionStarted", async () => {
        // GIVEN
        const status = await this.votingInstance.getWorkflowStatus();

        // WHEN
        expect(status).to.be.bignumber.not.equal(new BN(3));

        // THEN
        await expectRevert(this.votingInstance.endVotingSession({ from: admin }), "Vote pas en cours");
    });
    it("endVotingSession() doit émettre 2 évènements, ProposalsRegistrationEnded et WorkflowStatusChange", async () => {
        // GIVEN
        await this.votingInstance.register(electeur1, { from: admin });
        await this.votingInstance.startProposalsRegistration({ from: admin });
        await this.votingInstance.registerProposal("proposition 1", { from: electeur1 });
        await this.votingInstance.endProposalsRegistration({ from: admin });
        await this.votingInstance.startVotingSession({ from: admin });
        await this.votingInstance.vote(0, { from: electeur1 });

        // WHEN
        const receipt = await this.votingInstance.endVotingSession({ from: admin });

        // THEN
        expectEvent(receipt, 'VotingSessionEnded');
        expectEvent(receipt, 'WorkflowStatusChange', {
            previousStatus: "3",
            newStatus: "4"
        });
    });

    // Test de `function endProposalsRegistration() external onlyAdmin`
    it("tally() doit revert si le sender n'est pas l'admin", async () => {
        // GIVEN
        const sender = electeur1;

        // WHEN
        // THEN
        await expectRevert(this.votingInstance.tally({ from: sender }), "Admin requis");
    });
    it("tally() doit revert si le workflow n'est pas au status VotingSessionEnded", async () => {
        // GIVEN
        // WHEN
        const status = await this.votingInstance.getWorkflowStatus();

        // THEN
        expect(status).to.be.bignumber.not.equal(new BN(5));
        await expectRevert(this.votingInstance.tally({ from: admin }), "Vote pas termine");
    });
    it("tally() doit déterminer la proposition gagnante, et émettre 2 évènements, VotesTallied et WorkflowStatusChange", async () => {
        // GIVEN
        await this.votingInstance.register(electeur1, { from: admin });
        await this.votingInstance.startProposalsRegistration({ from: admin });
        await this.votingInstance.registerProposal("proposition 1", { from: electeur1 });
        await this.votingInstance.endProposalsRegistration({ from: admin });
        await this.votingInstance.startVotingSession({ from: admin });
        await this.votingInstance.vote(0, { from: electeur1 });
        await this.votingInstance.endVotingSession({ from: admin });

        // WHEN
        const receipt = await this.votingInstance.tally({ from: admin });

        // THEN
        const winningProposalId = await this.votingInstance.winningProposalId();
        expect(winningProposalId).to.be.bignumber.equal(new BN(0));
        expectEvent(receipt, 'VotesTallied');
        expectEvent(receipt, 'WorkflowStatusChange', {
            previousStatus: "4",
            newStatus: "5"
        });
    });
});
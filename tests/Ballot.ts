import { expect } from "chai";
import { ethers } from "hardhat";
import { Ballot } from "../typechain-types";
import { randomInt } from "crypto";

const PROPOSALS = ["Proposal 1", "Proposal 2", "Proposal 3"];

function convertStringArrayToBytes32(array: string[]) {
  const bytes32Array = [];
  for (let index = 0; index < array.length; index++) {
    bytes32Array.push(ethers.utils.formatBytes32String(array[index]));
  }
  return bytes32Array;
}

describe("Ballot", function () {
  let ballotContract: Ballot;

  beforeEach(async function () {
    const ballotFactory = await ethers.getContractFactory("Ballot");
    ballotContract = await ballotFactory.deploy(
      convertStringArrayToBytes32(PROPOSALS)
    );
    await ballotContract.deployed();
  });

  describe("when the contract is deployed", function () {
    it("has the provided proposals", async function () {
      for (let index = 0; index < PROPOSALS.length; index++) {
        const proposal = await ballotContract.proposals(index);
        expect(ethers.utils.parseBytes32String(proposal.name)).to.eq(
          PROPOSALS[index]
        );
      }
    });

    it("has zero votes for all proposals", async function () {
      for (let index = 0; index < PROPOSALS.length; index++) {
        const proposal = await ballotContract.proposals(index);
        expect(proposal.voteCount).to.eq(0);
      }
    });

    it("sets the deployer address as chairperson", async function () {
      const accounts = await ethers.getSigners();
      const chairPerson = await ballotContract.chairperson();
      expect(chairPerson).to.equal(accounts[0].address);
    });

    it("sets the voting weight for the chairperson as 1", async function () {
      const chairPerson = await ballotContract.chairperson();
      expect((await ballotContract.voters(chairPerson)).weight).to.equal(1);
    });
  });

  describe("when the chairperson interacts with the giveRightToVote function in the contract", function () {
    it("gives right to vote for another address", async function () {
      const accounts = await ethers.getSigners();
      ballotContract.giveRightToVote(accounts[1].address);
      expect((await ballotContract.voters(accounts[1].address)).weight).to.equal(1);
    });

    it("can not give right to vote for someone that has voted", async function () {
      const accounts = await ethers.getSigners();
      ballotContract.giveRightToVote(accounts[1].address);

      await ballotContract
        .connect(accounts[1])
        .vote(0);

      expect((ballotContract.giveRightToVote(accounts[1].address))).to.be.revertedWith("The voter already voted.");
    });

    it("can not give right to vote for someone that has already voting rights", async function () {
            const accounts = await ethers.getSigners();
      ballotContract.giveRightToVote(accounts[1].address);
      expect(ballotContract.giveRightToVote(accounts[1].address)).to.be.reverted;
    });
  });

  describe("when the voter interact with the vote function in the contract", function () {
    it("should register the vote", async () => {
      const accounts = await ethers.getSigners();
      ballotContract.giveRightToVote(accounts[1].address);

      await ballotContract
        .connect(accounts[1])
        .vote(0);

      expect((await ballotContract.voters(accounts[1].address)).voted).to.be.true;
    });
  });

  describe("when the voter interact with the delegate function in the contract", function () {
    it("should transfer voting power", async () => {
      const accounts = await ethers.getSigners();
      await ballotContract.giveRightToVote(accounts[1].address);
      await ballotContract.giveRightToVote(accounts[2].address);
      
      expect(await ballotContract
        .connect(accounts[1])
        .delegate(accounts[2].address))
        .ok;
    });
  });

  describe("when the an attacker interact with the giveRightToVote function in the contract", function () {
    it("should revert", async () => {
      const accounts = await ethers.getSigners();

      expect(await ballotContract
        .connect(accounts[0])
        .giveRightToVote(accounts[2].address))
        .to.be.revertedWith("Only chairperson can give right to vote.");
    });
  });

  describe("when the an attacker interact with the vote function in the contract", function () {
    it("should revert", async () => {
      const accounts = await ethers.getSigners();

      expect(await ballotContract
        .connect(accounts[0])
        .vote(2))
        .to.be.revertedWith("Has no right to vote");
    });
  });

  describe("when the an attacker interact with the delegate function in the contract", function () {
    it("should revert", async () => {
      const accounts = await ethers.getSigners();

      await expect(ballotContract
        .delegate(accounts[0].address))
        .to.be.revertedWith("Self-delegation is disallowed.");
    });
  });

  describe("when someone interact with the winningProposal function before any votes are cast", function () {
    it("should return 0", async () => {
      expect((await ballotContract.winningProposal())).to.equal(0);
    });
  });

  describe("when someone interact with the winningProposal function after one vote is cast for the first proposal", function () {
    it("should return 0", async () => {
      const accounts = await ethers.getSigners();
      await ballotContract.vote(0);

      expect((await ballotContract.winningProposal())).to.equal(0);
    });
  });

  describe("when someone interact with the winnerName function before any votes are cast", function () {
    it("should return name of proposal 0", async () => {
      expect((ethers.utils.parseBytes32String(await ballotContract.winnerName()))).to.equal("Proposal 1");
    });
  });

  describe("when someone interact with the winnerName function after one vote is cast for the first proposal", function () {
    it("should return name of proposal 0", async () => {
      await ballotContract.vote(0);

      expect((ethers.utils.parseBytes32String(await ballotContract.winnerName()))).to.equal("Proposal 1");
    });
  });

  describe("when someone interact with the winningProposal function and winnerName after 5 random votes are cast for the proposals", function () {
    it("should return the name of the winner proposal", async () => {
      const accounts = await ethers.getSigners();
      let winnerName: String;
      let winningProposal;
      for (let i = 0; i < 4; i++) {
        await ballotContract
        .giveRightToVote(accounts[i+1].address);

        await ballotContract
        .connect(accounts[i+1])
        .vote(randomInt(3))
      } 

      winningProposal = PROPOSALS[(await ballotContract.winningProposal()).toNumber()];
      winnerName = ethers.utils.parseBytes32String(await ballotContract.winnerName());

      expect((winnerName)).to.equal(winningProposal);
    });
  });
});
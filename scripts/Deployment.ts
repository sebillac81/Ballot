import { ethers } from "hardhat";
import { Ballot__factory } from "../typechain-types";
import * as dotenv from 'dotenv';
dotenv.config();

function convertStringArrayToBytes32(array: string[]) {
    const bytes32Array = [];
    for (let index = 0; index < array.length; index++) {
      bytes32Array.push(ethers.utils.formatBytes32String(array[index]));
    }
    return bytes32Array;
  }

const ADDRESS = "0xc9d59a4D2d1FA4b4F3496b8d08EF43A122C89FBc";
// const PROPOSALS = ["Proposal 1", "Proposal 2", "Proposal 3"];

async function main() {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
    const provider = new ethers.providers.AlchemyProvider(
        "goerli",
        process.env.ALCHEMY_API_KEY
    );

    const signer = await wallet.connect(provider);
    const balance = await signer.getBalance();
    console.log(`Balance is ${balance} WEI`);

    const proposal = process.argv.slice(2);

    const ballotContractFactory = new Ballot__factory(signer);
    const ballotContract = await ballotContractFactory.deploy(
        proposal.map(ethers.utils.formatBytes32String)
    );
    const deployTxReceipt = await ballotContract.deployTransaction.wait();
    console.log({deployTxReceipt});
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

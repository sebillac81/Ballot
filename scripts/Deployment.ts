import { ethers } from "hardhat";
import { Ballot__factory } from "../typechain-types";
import * as dotenv from 'dotenv';
dotenv.config();

const ADDRESS = "0xc9d59a4D2d1FA4b4F3496b8d08EF43A122C89FBc";

async function main() {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
    const provider = new ethers.providers.InfuraProvider(
        "sepolia",
        process.env.INFURA_API_SECRET
    );

    const lastBlock = await  provider?.getBlock("latest");
    console.log(`Connected to the blocknumber ${lastBlock?.number}`)

    const signer = wallet.connect(provider);

    const price = await provider.getGasPrice();

    console.log(`Gas price is ${price}`);

    const balance = await signer.getBalance();
    console.log(`Balance is ${balance} WEI`);

    const proposal = process.argv.slice(2);
  
    const ballotContractFactory = new Ballot__factory(signer);

    const ballotContract = await ballotContractFactory.deploy(
        proposal.map(ethers.utils.formatBytes32String));

    const deployTxReceipt = ballotContract.deployTransaction.wait();
    console.log("The contract was deployed");
    
    const chairPerson = await ballotContract.chairperson();
    console.log(`The chairperson is: ${chairPerson}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

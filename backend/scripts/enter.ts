import {ethers} from 'hardhat';

async function main(){
    const raffle = await ethers.getContractAt(
        "Raffle",
        "0x78f34d01206BAaFA2EC869696B003ac210422b0d"
    )
    console.log("Entering Raffle...");

    const entranceFee = await raffle.getEntranceFee();
    // Masuk lotre bayar 0.01 ETH
    const tx = await raffle.enterRaffle({value: entranceFee});
    await tx.wait(1);

    console.log("Entered Raffle! Waiting for verification...")
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
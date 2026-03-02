import { ethers } from "hardhat";

async function main(){
    const raffle = await ethers.getContractAt(
        "Raffle",
        "0x78f34d01206BAaFA2EC869696B003ac210422b0d"
    )

    const players = await raffle.getNumberOfPlayers();

    console.log(`player total... ${players}`);
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
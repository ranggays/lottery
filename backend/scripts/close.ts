import { ethers } from "hardhat";

async function main(){
    // 1. Ambil Kontrak yang sudah di deploy
    const raffleAddress = "0x78f34d01206BAaFA2EC869696B003ac210422b0d";
    const raffle = await ethers.getContractAt(
        "Raffle",
        raffleAddress,
    )

    console.log("Mengecek status lotre...")

    // 2. Cek apakah sudah waktunya (UpkeepNeeded?)
    // Kita kirim "0x" (kosong) sebagai checkData
    const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
    console.log(`Apakah undian boleh dimulai (UpkeepNeeded)? ${upkeepNeeded}`);

    if (upkeepNeeded){
        console.log("Waktu habis! Memulai pengocokan (Requesting Random Words)...");

        // 3. Panggil performUpkeep untuk memicu Chainlink VRF
        const tx = await raffle.performUpkeep("0x");
        const txReceipt = await tx.wait(1);

        console.log("Request dikirim ke Chainlink VRF!");
        console.log("Tunggu 1-2 menit, lalu cek saldo pemenang di Etherscan");
        console.log("Transaction Hash:", tx.hash);
    } else {
        console.log("Belum waktunya atau belum ada pemain/saldo!");
        console.log("Pastikan interval waktu (30 detik) sudah lewat sejak deploy/enter terakhir");
    }
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
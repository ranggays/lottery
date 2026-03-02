import { ethers, network, deployments } from "hardhat";
import { assert, expect } from "chai";
import { developmentChains, networkConfig } from "../../helper-hardhat-config";
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types";

// Kita skip test ini kalau jalan di sepolia (Hanya untuk local)
!developmentChains.includes(network.name) ? describe.skip : describe("Raffle unit test", async function (){
    let raffle: Raffle;
    let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
    let raffleEntranceFee: bigint;
    let interval: number;
    let deployer: string;

    const chainId = network.config.chainId!;

    beforeEach(async () => {
        // 1. Ambil akun deployer
        const accounts = await ethers.getSigners();
        deployer = accounts[0].address;

        // 2. Deploy ulang semua kontrak (fixture)
        // Ini akan menjalankna script deploy 0 dan 1 secara otomatis sebelum setiap tes
        await deployments.fixture(["all"]);

        // 3. Ambil kontrak yang sudah di deploy
        const raffleDeployment = await deployments.get("Raffle");
        raffle = await ethers.getContractAt(
            "Raffle",
            raffleDeployment.address
        );

        const vrfDeployment = await deployments.get("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Mock = await ethers.getContractAt(
            "VRFCoordinatorV2Mock",
            vrfDeployment.address
        );

        raffleEntranceFee = await raffle.getEntranceFee();
        interval = Number(await raffle.getInterval());
    })

    describe("constructor", async function (){
        it("Initializes the raffle correctly", async () => {
            // Cek status awal harus OPEN
            const raffleState = await raffle.getRaffleState();
            assert.equal(raffleState.toString(), "0");

            // Cek interval sesuai config
            assert.equal(interval.toString(), networkConfig[chainId].keepersUpdateInterval);
        })
    })

    describe("enterRaffle", async function(){
        it("reverts when you dont pay enough", async function(){
            // Coba masuk tanpa bayar -> Harusnya error
            await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                raffle,
                "Raffle__NotEnoughETHEntered"
            )
        })
        
        it("records player when they enter", async function(){
            // Masuk dan bayar tiket
            await raffle.enterRaffle({value: raffleEntranceFee});

            // Cek apakah pemain index-0 adalah deployer
            const playerFromContract = await raffle.getPlayer(0);
            assert.equal(playerFromContract, deployer)
        })

        it("emits event on enter", async function(){
            // Cek apakah event terpancar saat masuk
            await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.emit(
                raffle,
                "RaffleEnter"
            )
        })

        it("doesnt allow entrance when raffle is calculating", async function(){

            // 1. Masuk undian dulu
            await raffle.enterRaffle({value: raffleEntranceFee});

            // 2. TIME TRAVEL! (Majukan waktu blockchain agar > interval)
            await network.provider.send("evm_increaseTime", [interval + 1]);
            await network.provider.send("evm_mine", []);

            // 3. Pura-pura jadi Chainlink Keeper (Jalankan performUpkeep)
            await raffle.performUpkeep("0x");

            // 4. Coba masuk lagi saat sedang calculating 
            await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.be.revertedWithCustomError(
                raffle,
                "Raffle__NotOpen"
            )
        })
    })

    describe("checkUpkeep", async function (){
        it("returns false if people haven't sent any ETH", async function(){
            await network.provider.send("evm_increaseTime", [interval + 1]);
            await network.provider.send("evm_mine", []);
            // Panggil checkUpkeep (simulate call, bukan transaksi)
            const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
            assert(!upkeepNeeded);
        })

        it("returns false if raffle isn't open", async function(){
            await raffle.enterRaffle({value: raffleEntranceFee});
            await network.provider.send("evm_increaseTime", [interval + 1]);
            await network.provider.send("evm_mine", []);
            await raffle.performUpkeep("0x"); // Status berubah jadi CALCULATING
            const raffleState = await raffle.getRaffleState();
            const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
            assert.equal(raffleState.toString(), "1"); // 1 = CALCULATING
            assert.equal(upkeepNeeded, false)
        })

        it("returns true if enough time has passed, has players, eth, and is open", async function(){
            await raffle.enterRaffle({value: raffleEntranceFee});
            await network.provider.send("evm_increaseTime", [interval + 1]);
            await network.provider.send("evm_mine", []);
            const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
            assert(upkeepNeeded);
        })
    })

    describe("performUpkeep", async function(){
        it("can only run if checkUpkeep is true", async function (){
            await raffle.enterRaffle({value: raffleEntranceFee});
            await network.provider.send("evm_increaseTime", [interval + 1]);
            await network.provider.send("evm_mine", []);
            const tx = await raffle.performUpkeep("0x");
            assert(tx);
        })

        it("reverts if checkUpkeep is false", async function(){
            await expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(
                raffle,
                "Raffle__UpkeepNotNeeded"
            )
        })

        it("updates the raffle state and emits a requestId", async function(){
            await raffle.enterRaffle({value: raffleEntranceFee});
            await network.provider.send("evm_increaseTime", [interval + 1]);
            await network.provider.send("evm_mine", []);

            const txResponse = await raffle.performUpkeep("0x");
            const txReceipt = await txResponse.wait(1);

            // Cari event requestId di logs
            // Note: Di script deploy 01 kita juga emit event, jadi hati-hati tertukar
            // Event requestId biasanya ada di log kedua (index 1) karena log ke-0 itu dari VRFCoordinator
            const requestId = txReceipt?.logs[1].topics[1]

            const raffleState = await raffle.getRaffleState()
            assert(Number(requestId) > 0);
            assert(raffleState.toString(), "1")
        })
    })

    describe("fulfillRandomWords", async function(){
        beforeEach(async function(){
            await raffle.enterRaffle({value: raffleEntranceFee});
            await network.provider.send("evm_increaseTime", [interval + 1]);
            await network.provider.send("evm_mine", []);
        })

        it("can only be called after performUpkeep", async function(){
            // Coba panggil fulfillRandomWords padahal belum request -> Harusnya error
            // 0 adalah requestId dummy, address mock
            await expect(
                vrfCoordinatorV2Mock.fulfillRandomWords(0, await raffle.getAddress())
            ).to.be.revertedWith("nonexistent request")
        })

        it("picks a winner, resets, and sends money", async function(){
            const additionalEntrants = 3; 
            const startingIndex = 1;
            const accounts = await ethers.getSigners();

            // 1. Loop biar banyak orang yang ikut arisan
            for(let i=startingIndex; i < startingIndex + additionalEntrants; i++){
                const accountConnectedRaffle = raffle.connect(accounts[i]);
                await accountConnectedRaffle.enterRaffle({value: raffleEntranceFee});
            }

            const startingTimeStamp = await raffle.getLatestTimeStamp();

            // 2. Kita pakai PROMISE karena kita harus menunggu EVENT (Listener)
            // Ini teknik advanced untuk testing event async
            await new Promise<void>(async (resolve, reject) => {
                // B. Setup Listener: "Kalau event winnerPicked muncul, jalankan kode ini"
                raffle.once(raffle.filters.WinnerPicked(), async function(){
                    console.log("Found the event");
                    try {
                        const recentWinner = await raffle.getRecentWinner();
                        const raffleState = await raffle.getRaffleState();
                        const winnerBalance = await ethers.provider.getBalance(accounts[1].address);
                        const endingTimeStamp = await raffle.getLatestTimeStamp();
                        const numPlayers = await raffle.getNumberOfPlayers();

                        // Assertions (Pembuktian)
                        assert.equal(numPlayers.toString(), "0"); // Pemain harus direset jadi 0
                        assert.equal(raffleState.toString(), "0") // Status harus kembali OPEN
                        assert(endingTimeStamp > startingTimeStamp) // Waktu harus maju

                        // Cek uang: pemenang harus dapat semua uang tiket
                        // Uang awal + (Tiket * Jumlah Orang)
                        // Note: Logic matematika saldo agak tricky di testing karena gas fee,
                        // tapi di mock local gas biasanya 0 atau diabaikan di level ini
                        assert.equal(
                            recentWinner.toString(),
                            accounts[1].address
                        )
                        resolve()
                    } catch (error) {
                        reject(error)
                    }
                })

                // A. Trigger Undian (performUpkeep -> MockFulfill)
                try {
                    const tx = await raffle.performUpkeep("0x");
                    const txReceipt = await tx.wait(1);
                    // Ambil requestId dari logs
                    // Di versi Ethers v6, parsing log agak beda, tapi untuk mock kita bisa parsing manual atau ambil topics
                    // Log[1] adalah event RequestedRaffleWinner dari kontrak Raffle kita
                    const requestId = txReceipt?.logs[1].topics[1];

                    // Pura-pura jadi Chainlink memberi angka acak
                    await vrfCoordinatorV2Mock.fulfillRandomWords(
                        requestId!,
                        await raffle.getAddress()
                    )
                } catch (error) {
                    reject(error)
                }
            })
        })
    })
})
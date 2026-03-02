import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { networkConfig, developmentChains } from "../helper-hardhat-config";
import { ethers, network } from "hardhat";
import verify from "../utils/verify";

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("2");

const deployRaffle: DeployFunction = async function (hre: HardhatRuntimeEnvironment){
    // const { deployements, getNamedAccounts, network} = hre;
    const { deployments, getNamedAccounts } = hre;
    const { deploy, log} = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId!;

    let vrfCoordinatorV2Address: string;
    let subscriptionId: string;

    // LOGIKA PEMILIHAN ALAMAT & SUBSCRIPTION
    if(developmentChains.includes(network.name)){
        // --- LOCALHOST / HARDHAT ---
        // 1. Ambil kontrak mock yang baru dideploy
        const vrfCoordinatorV2MockDeployment = await deployments.get("VRFCoordinatorV2Mock");
        const vrfCoordinatorV2Mock = await ethers.getContractAt(
            "VRFCoordinatorV2Mock",
            vrfCoordinatorV2MockDeployment.address
        );

        vrfCoordinatorV2Address = vrfCoordinatorV2MockDeployment.address;

        // 2. Buat Subscription Baru secara otomatis
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1);

        // Ambil ID Subscription dari event yang dipancarkan
        // (Di Mock Chainlink, eventnya ada di log index 0)
        // Di Ethers V6, kita harus parsing log event
        // Cara simpel untuk mock: ID-nya biasanya urut mulai dari 1
        subscriptionId = "1";

        // 3. Isi Saldo (Fund) Subscription
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2!;
        subscriptionId = networkConfig[chainId].subscriptionId!;
    }

    const entranceFee = networkConfig[chainId].raffleEntranceFee;
    const gasLane = networkConfig[chainId].gasLane;
    const callbackGasLimit = networkConfig[chainId].callbackGasLimit;
    const interval = "30";

    const args = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval
    ];

    log("Deploying Raffle...");
    const raffle = await deploy("Raffle", {
        from: deployer,
        log: true,
        args: args,
        waitConfirmations: 1,
    });

    // PENTING: Daftarkan Raffle sebagai Consumer di VRF (Hanya di Local)
    // Kalau di Sepolia, kita harus daftarkan manual di website Chainlink VRF
    if (developmentChains.includes(network.name)){
        const vrfCoordinatorV2MockDeployment = await deployments.get("VRFCoordinatorV2Mock");
        const vrfCoordinatorV2Mock = await ethers.getContractAt(
            "VRFCoordinatorV2Mock",
            vrfCoordinatorV2MockDeployment.address
        );
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
    }

    // VERIFIKASI (Hanya di Sepolia)
    if(!developmentChains.includes(network.name)){
        log("Verifying");
        await verify(raffle.address, args);
    }
}

export default deployRaffle;
deployRaffle.tags = ["all", "raffle"];
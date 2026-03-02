import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { developmentChains } from "../helper-hardhat-config";
import { ethers } from "hardhat";

const BASE_FEE = ethers.parseEther("0.25");
const GAS_PRICE_LINK = 1e9;

const deployMocks: DeployFunction = async function (hre: HardhatRuntimeEnvironment){
    const {deployments, getNamedAccounts, network } = hre;
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    if (developmentChains.includes(network.name)){
        log("Local network detected! Deploying mocks...");
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK]
        })
        log("Mocks Deployed");
    }
}

export default deployMocks;
deployMocks.tags = ["all", "mocks"];
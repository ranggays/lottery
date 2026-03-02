import { run } from "hardhat";

const verify = async (contractAddress: string, args: any[]) => {
    console.log("Verifying Contract...")
    try {
        await run("verify:verify", {
            address: contractAddress,
            consturctorArguments: args,
        })
    } catch (error: any) {
        if(error.message.toLowerCase().includes("already verified")){
            console.log("Already Verified!");
        }else{
            console.log(error);
        }
    }
}
export default verify;
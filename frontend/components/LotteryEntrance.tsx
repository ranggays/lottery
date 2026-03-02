import { useWeb3Contract } from "react-moralis";
import { abi, contractAddresses } from "../constants";
import { useMoralis } from "react-moralis";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useNotification } from "web3uikit";

export default function LotteryEntrance() {
    // Setup
    const { chainId: chainIdHex, isWeb3Enabled } = useMoralis();
    const chainId = parseInt(chainIdHex!).toString();
    // @ts-ignore
    const raffleAddress = chainId in contractAddresses ? contractAddresses[chainId][0] : null;
    const dispatch = useNotification();

    // State
    const [entranceFee, setEntranceFee] = useState("0");
    const [numPlayers, setNumplayers] = useState("0");
    const [recentWinner, setRecentWinner] = useState("0");

    // Contract Functions
    const { runContractFunction: enterRaffle, isLoading, isFetching } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "enterRaffle",
        params: {},
        msgValue: entranceFee
    });

    const { runContractFunction: getEntranceFee } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getEntranceFee",
        params: {},
    });

    const { runContractFunction: getNumberOfPlayers } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getNumberOfPlayers",
        params: {}
    });

    const { runContractFunction: getRecentWinner } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getRecentWinner",
        params: {},
    });

    const { runContractFunction: performUpkeep, isLoading: isLoadingUpkeep, isFetching: isFetchingUpkeep } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "performUpkeep",
        params: {
            performData: "0x"
        }
    });

    async function updateUI() {
        const entranceFeeFromCall = (await getEntranceFee()) as string;
        const numPlayersFromCall = (await getNumberOfPlayers()) as string;
        const recentWinnerFromCall = (await getRecentWinner()) as string;

        if (entranceFeeFromCall) {
            setEntranceFee(entranceFeeFromCall.toString());
        }
        if (numPlayersFromCall) {
            setNumplayers(numPlayersFromCall.toString());
        }
        if (recentWinnerFromCall) {
            setRecentWinner(recentWinnerFromCall.toString());
        }
    }

    useEffect(() => {
        if (isWeb3Enabled && raffleAddress) {
            updateUI();
        }
    }, [isWeb3Enabled, raffleAddress]);

    const handleSuccess = async (tx: any) => {
        await tx.wait(1);
        handleNewNotification(tx);
        updateUI();
    };

    const handleNewNotification = function (tx: any) {
        dispatch({
            type: "info",
            message: "Transaction Complete!",
            title: "Tx Notification",
            position: "topR",
        });
    };

    const handleErrorUpkeep = (error: any) => {
        console.log(error);
        if (error.message.includes("UpkeepNotNeeded")) {
            dispatch({
                type: "error",
                message: "Belum Waktunya / Tidak ada pemain / Saldo Kurang",
                title: "Gagal Kocok",
                position: "topR"
            });
        } else {
            dispatch({
                type: "error",
                message: "Lihat Console Untuk Detailnya",
                title: "Error",
                position: "topR"
            });
        }
    };

    return (
        <div className="min-h-screen bg-black relative">
            {/* Subtle grid overlay */}
            <div className="absolute inset-0 opacity-[0.015]" 
                 style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 80px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 80px)'}}>
            </div>

            <div className="relative container mx-auto px-6 py-16 max-w-5xl">
                {raffleAddress ? (
                    <div className="space-y-12">
                        {/* Hero Section */}
                        <div className="text-center space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                <span className="text-xs text-gray-400 font-medium">Live on Sepolia</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-bold text-white">
                                Decentralized Lottery
                            </h1>
                            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                                Powered by Chainlink VRF for provably fair randomness
                            </p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Entry Fee */}
                            <div className="border border-white/10 bg-white/2 p-6 rounded-lg hover:border-white/20 transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-gray-500 uppercase tracking-wider">Entry Fee</p>
                                    <p className="text-3xl font-bold text-white">
                                        {ethers.formatUnits(entranceFee, "ether")}
                                    </p>
                                    <p className="text-sm text-gray-400">ETH</p>
                                </div>
                            </div>

                            {/* Active Players */}
                            <div className="border border-white/10 bg-white/2 p-6 rounded-lg hover:border-white/20 transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-gray-500 uppercase tracking-wider">Active Players</p>
                                    <p className="text-3xl font-bold text-white">{numPlayers}</p>
                                    <p className="text-sm text-gray-400">Participants</p>
                                </div>
                            </div>

                            {/* Recent Winner */}
                            <div className="border border-white/10 bg-white/2 p-6 rounded-lg\
                            ]
                             hover:border-white/20 transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-gray-500 uppercase tracking-wider">Recent Winner</p>
                                    <p className="text-sm font-mono text-white">
                                        {recentWinner.substring(0, 6)}...{recentWinner.substring(recentWinner.length - 4)}
                                    </p>
                                    <a 
                                        href={`https://sepolia.etherscan.io/address/${recentWinner}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                                    >
                                        View on Etherscan
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Main Action Section */}
                        <div className="border border-white/10 bg-white/2 rounded-lg p-8 max-w-2xl mx-auto">
                            <h2 className="text-2xl font-bold text-white mb-6">Enter the Draw</h2>
                            
                            <div className="space-y-6">
                                {/* Fee Display */}
                                <div className="border border-white/10 bg-black/30 p-4 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-400">Entry Fee</span>
                                        <div className="text-right">
                                            <div className="text-xl font-bold text-white">
                                                {ethers.formatUnits(entranceFee, "ether")} ETH
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Enter Button */}
                                <button
                                    onClick={async () => {
                                        await enterRaffle({
                                            onSuccess: handleSuccess,
                                            onError: (error) => console.log(error),
                                        });
                                    }}
                                    disabled={isLoading || isFetching}
                                    className="w-full bg-white text-black py-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading || isFetching ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                            <span>Processing...</span>
                                        </div>
                                    ) : (
                                        "Buy Ticket"
                                    )}
                                </button>

                                {/* Admin Section */}
                                <div className="pt-6 border-t border-white/10">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-semibold text-white mb-2">Admin Controls</h3>
                                        <p className="text-xs text-gray-500">
                                            Manually trigger winner selection (requires 30s+ interval & active players)
                                        </p>
                                    </div>
                                    
                                    <button
                                        onClick={async () => {
                                            await performUpkeep({
                                                onSuccess: handleSuccess,
                                                onError: handleErrorUpkeep,
                                            });
                                        }}
                                        disabled={isLoadingUpkeep || isFetchingUpkeep}
                                        className="w-full border border-white/20 text-white py-3 rounded-lg font-semibold hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoadingUpkeep || isFetchingUpkeep ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                <span>Processing...</span>
                                            </div>
                                        ) : (
                                            "Pick Winner"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                                <span>Powered by</span>
                                <span className="text-white font-semibold">Chainlink VRF</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-md mx-auto text-center">
                        <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-red-500/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Wrong Network</h3>
                            <p className="text-gray-400 mb-4">
                                Please connect to Sepolia Testnet to continue
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// 1. IMPORT CHAINLINK VRF
// import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
// import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
// Import Baru: Automation (Keepers)
// import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed(); // Error baru kalau gagal kirim uang
//Baru
error Raffle__NotOpen(); // Error kalau mau masuk pas lagi ngocok
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/**
 * @title A sample Raffle Contract
 * @author Rangga Yovie (Following Patrick Collins)
 * @notice This contract is for creating an untamperable decentralized smart contract
 * @dev Implements Chainlink VRF v2
 */

// 2. INHERITANCE: Kontrak Kita adalah 'anak' dari VRFConsumerBaseV2
contract Raffle is VRFConsumerBaseV2Plus, AutomationCompatibleInterface {
    // Baru
    // Enum: Status Undian (Buka atau sedang menghitung)
    enum RaffleState {
        OPEN,
        CALCULATING
    }
    
    /* Type declarations */
    // (Tidak ada untuk saat ini)

    /* State Variables */
    uint256 private immutable i_entranceFee;
    // Kita simpan peserta di array address payable (karena kita akan kirim uang ke pemenang)
    address payable[] private s_players;

    // --- VARIABEL CHAINLINK VRF ---
    // VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane; // KeyHash (Seberapa mahal gas yang rela kita bayar)
    uint256 private immutable i_subscriptionId; // ID Langganan Chainlink kita
    uint32 private immutable i_callbackGasLimit; // Batas gas untuk fungsi callback
    uint16 private constant REQUEST_CONFIRMATIONS = 3; // Tunggu 3 blok biar aman
    uint32 private constant NUM_WORDS = 1; // Kita cuma butuh 1 angka acak

    // --- VARIABEL BARU UNTUK OTOMATISASI ---
    address private s_recentWinner;
    RaffleState private s_raffleState; // Status saat ini
    uint256 private s_lastTimeStamp; // Kapan terakhir undian jalan?
    uint256 private immutable i_interval; // Seberapa sering undian jalan? (detik)

    /* Events */
    // Event dipancarkan saat ada orang masuk lotre (bagus untuk frontend indexing)
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId); // Event saat minta acak
    event WinnerPicked(address indexed winner); // Event saat pemenang terpilih

    /* Errors */
    // error Raffle__NotEnoughETHEntered();

    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint256 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2Plus(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        // i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        i_interval = interval;
        s_lastTimeStamp = block.timestamp; // Set waktu awal
        s_raffleState = RaffleState.OPEN; // Set status awal: buka
    }

    // Fungsi untuk beli tiket
    function enterRaffle() public payable {
        // 1. Validasi: Apakah uangnya cukup?
        // Kita ganti require(msg.value > i_entranceFee, "Not enough ETH") dengan Custom Error
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughETHEntered();
        }

        // Tidak boleh masuk kalau lagi ngocok arisan
        if(s_raffleState != RaffleState.OPEN){
            revert Raffle__NotOpen();
        }

        // 2. Simpan pemain ke array
        // Kita casting msg.sender menjadi payable agar nanti bisa dikirimi hadiah
        s_players.push(payable(msg.sender));

        // 3. Emit Event
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev checkUpkeep adalah fungsi yang dipanggil oleh Chainlink Node (Off-chain).
     * Node akan bertanya: "Apakah sudah waktunya undian dijalankan?"
     * Syarat True:
     * 1. Waktu sudah lewat (time passed)
     * 2. Ada setidaknya 1 pemain & ada saldo ETH
     * 3. Status undian sedang OPEN
     */
    function checkUpkeep(
        bytes memory /* checkData */
    ) public view override returns(bool upkeepNeeded, bytes memory /* performData */){
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        // (Waktu Sekarang - Waktu Terakhir) > Interval ?
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = address(this).balance > 0;

        // upkeepNeeded bernilai TRUE jika SEMUA syarat terpenuhi
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        return (upkeepNeeded, "0x0");
    }

    /**
     * @dev performUpkeep adalah fungsi yang dijalankan kalau checkUpkeep = TRUE. 
     * Ini otomatis request angka acak
     */
    function performUpkeep(
        bytes calldata /* Perform Data */
    ) external override {
        // Cek lagi (validasi ganda) supaya gak bisa dipanggil manual sembarangan
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded){
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }

        // Ubah status jadi CALCULATING (Biar gak ada yang masuk lagi)
        s_raffleState = RaffleState.CALCULATING;

        // Request Randomness (Sama kayak kode sebelumnya)
        // uint256 requestId = i_vrfCoordinator.requestRandomWords(
        //     i_gasLane,
        //     i_subscriptionId,
        //     REQUEST_CONFIRMATIONS,
        //     i_callbackGasLimit,
        //     NUM_WORDS
        // );
        // Request baru
        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: i_gasLane,
                subId: i_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: i_callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
            })
        );
        emit RequestedRaffleWinner(requestId);
    }

    // --- FUNGSI BARU 1: REQUEST RANDOMNESS ---
    // Fungsi ini dipanggil untuk MEMULAI pengocokan
    // function requestRandomWinner() external {
    //     // Minta angka acak ke Chainlink Coordinator
    //     uint256 requestId = i_vrfCoordinator.requestRandomWords(
    //         i_gasLane,
    //         i_subscriptionId,
    //         REQUEST_CONFIRMATIONS,
    //         i_callbackGasLimit,
    //         NUM_WORDS
    //     );
    //     emit RequestedRaffleWinner(requestId);
    // }

    // --- FUNGSI BARU 2: FULFILL RANDOMNESS ---
    // Fungsi ini dipanggil OLEH CHAINLINK (Bukan oleh kita)
    // Chainlink akan mengirimkan angka acak lewat parameter 'randomWords'
    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] calldata randomWords
    ) internal override {
        // A. Tentukan Pemenang pakai Module (%)
        // Contoh: AngkaAcak 202, Pemain ada 10
        // 202 % 10 = sisa 2. Maka pemain index ke-2 yang menang.
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];

        s_recentWinner = recentWinner; // Simpan pemenang di variabel state

        // B. Reset Array Pemain (Kosongkan untuk ronde selanjutnya)
        s_players = new address payable[](0);

        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp; // Reset waktu timer

        // C. Kirim Uang ke Pemenang
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success){
            revert Raffle__TransferFailed();
        }

        emit WinnerPicked(recentWinner);
    }

    // Fungsi getter (View/Pure)
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address){ return s_recentWinner; }
    function getRaffleState() public view returns (RaffleState) {return s_raffleState; }
    function getNumWords() public pure returns (uint256) {return NUM_WORDS;}
    function getNumberOfPlayers() public view returns (uint256) {return s_players.length;}
    function getLatestTimeStamp() public view returns (uint256) {return s_lastTimeStamp;}
    function getRequestConfirmations() public pure returns (uint256) {return REQUEST_CONFIRMATIONS;}
    function getInterval() public view returns (uint256) {return i_interval;}
}
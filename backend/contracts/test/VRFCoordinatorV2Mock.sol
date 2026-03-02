// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

error InvalidSubscription();
error InsufficientBalance();
error MustBeSubOwner(address owner);

contract VRFCoordinatorV2Mock is VRFCoordinatorV2Interface {
    uint96 private immutable i_baseFee;
    uint96 private immutable i_gasPriceLink;

    error InvalidConsumer();

    event RandomWordsRequested(
        bytes32 indexed keyHash,
        uint256 requestId,
        uint256 preSeed,
        uint64 indexed subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        address indexed sender
    );
    event RandomWordsFulfilled(uint256 indexed requestId, uint256 outputSeed, uint96 payment, bool success);
    event SubscriptionCreated(uint64 indexed subId, address owner);
    event SubscriptionFunded(uint64 indexed subId, uint256 oldBalance, uint256 newBalance);
    event ConsumerAdded(uint64 indexed subId, address consumer);
    event ConsumerRemoved(uint64 indexed subId, address consumer);

    uint64 s_currentSubId;
    uint256 s_nextRequestId = 1;
    uint256 s_nextPreSeed = 100;

    struct Subscription {
        address owner;
        uint96 balance;
        address[] consumers;
    }

    mapping(uint64 => Subscription) s_subscriptions;
    mapping(uint256 => bytes32) s_requests; // requestId -> keyHash (dummy mapping for logic)
    mapping(uint256 => address) s_consumers; // requestId -> consumer address

    constructor(uint96 _baseFee, uint96 _gasPriceLink) {
        i_baseFee = _baseFee;
        i_gasPriceLink = _gasPriceLink;
    }

    function consumerIsAdded(uint64 _subId, address _consumer) public view returns (bool) {
        Subscription storage subscription = s_subscriptions[_subId];
        for (uint256 i = 0; i < subscription.consumers.length; i++) {
            if (subscription.consumers[i] == _consumer) {
                return true;
            }
        }
        return false;
    }

    function fulfillRandomWords(uint256 _requestId, address _consumer) external {
        fulfillRandomWordsWithOverride(_requestId, _consumer, new uint256[](0));
    }

    // Fungsi RAHASIA untuk Testing: Kita bisa tentukan sendiri angka acaknya lewat parameter _words
    function fulfillRandomWordsWithOverride(
        uint256 _requestId,
        address _consumer,
        uint256[] memory _words
    ) public {
        if(s_requests[_requestId] == bytes32(0)){
            revert("nonexistent request");
        }
        
        uint256[] memory words = new uint256[](1); // Default 1 angka
        
        if (_words.length > 0) {
            words = _words;
        } else {
            // Kalau tidak ada input, kita buat angka pseudo-random
            words[0] = uint256(keccak256(abi.encode(_requestId, block.timestamp)));
        }

        // Panggil fungsi rawFulfillRandomWords di contract Raffle (Consumer)
        // Ini mensimulasikan Chainlink mengirim data balik
        VRFConsumerBaseV2(_consumer).rawFulfillRandomWords(_requestId, words);

        emit RandomWordsFulfilled(_requestId, words[0], 0, true);
    }

    // --- FUNGSI STANDAR CHAINLINK VRF (MOCK) ---

    function createSubscription() external override returns (uint64 _subId) {
        s_currentSubId++;
        s_subscriptions[s_currentSubId] = Subscription({owner: msg.sender, balance: 0, consumers: new address[](0)});
        emit SubscriptionCreated(s_currentSubId, msg.sender);
        return s_currentSubId;
    }

    function fundSubscription(uint64 _subId, uint96 _amount) external {
        if (s_subscriptions[_subId].owner == address(0)) {
            revert InvalidSubscription();
        }
        uint96 oldBalance = s_subscriptions[_subId].balance;
        s_subscriptions[_subId].balance += _amount;
        emit SubscriptionFunded(_subId, oldBalance, oldBalance + _amount);
    }

    function addConsumer(uint64 _subId, address _consumer) external override {
        if (s_subscriptions[_subId].owner == address(0)) {
            revert InvalidSubscription();
        }
        if (consumerIsAdded(_subId, _consumer)) {
            return;
        }
        s_subscriptions[_subId].consumers.push(_consumer);
        emit ConsumerAdded(_subId, _consumer);
    }

    function removeConsumer(uint64 _subId, address _consumer) external override {
        Subscription storage subscription = s_subscriptions[_subId];
        if (subscription.owner == address(0)) {
            revert InvalidSubscription();
        }
        // Mock logic sederhana: tidak benar-benar menghapus array agar hemat baris
        emit ConsumerRemoved(_subId, _consumer);
    }

    function requestRandomWords(
        bytes32 _keyHash,
        uint64 _subId,
        uint16 _minimumRequestConfirmations,
        uint32 _callbackGasLimit,
        uint32 _numWords
    ) external override returns (uint256 requestId) {
        if (s_subscriptions[_subId].owner == address(0)) {
            revert InvalidSubscription();
        }
        // Validasi sederhana
        requestId = s_nextRequestId++;
        uint256 preSeed = s_nextPreSeed++;

        s_requests[requestId] = _keyHash;
        s_consumers[requestId] = msg.sender; // Simpan siapa yang request (Raffle)

        emit RandomWordsRequested(
            _keyHash,
            requestId,
            preSeed,
            _subId,
            _minimumRequestConfirmations,
            _callbackGasLimit,
            _numWords,
            msg.sender
        );
        return requestId;
    }

    // Fungsi dummy agar interface terpenuhi (tidak dipakai di tutorial)
    function getSubscription(uint64 _subId)
        external
        view
        override
        returns (
            uint96 balance,
            uint64 reqCount,
            address owner,
            address[] memory consumers
        )
    {
        if (s_subscriptions[_subId].owner == address(0)) {
            revert InvalidSubscription();
        }
        return (s_subscriptions[_subId].balance, 0, s_subscriptions[_subId].owner, s_subscriptions[_subId].consumers);
    }

    function getRequestConfig() external pure override returns(uint16, uint32, bytes32[] memory){
        bytes32[] memory keyHashes;
        return (3, 2000000, keyHashes);
    }

    function requestSubscriptionOwnerTransfer(uint64 _subId, address _newOwner) external override pure {}
    function acceptSubscriptionOwnerTransfer(uint64 _subId) external override pure {}
    function cancelSubscription(uint64 _subId, address _to) external override pure {}
    function pendingRequestExists(uint64 _subId) external override pure returns (bool) { return false; }
}
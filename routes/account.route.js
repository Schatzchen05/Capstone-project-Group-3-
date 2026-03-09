const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const { getBalance, 
    verifyAccount, 
    fundWallet, 
    transferMoney, 
    getTransactionHistory, 
    setTransactionPin,
    getTransactionDetail,
    getBanks,
    checkTransactionStatus
} = require('../controllers/account.controller');

// Check own balance
router.get('/balance', auth, getBalance);

// Verify someone else's account number (for transfers)
router.get('/verify/:accountNumber', auth, verifyAccount);

// fund wallet (for testing, in production this would be via a payment gateway)
router.post('/fund', auth, fundWallet);

// Transfer money to another account
router.post('/transfer', auth, transferMoney);

// Get all transactions
router.get('/transactions', auth, getTransactionHistory);
// Set transaction PIN
router.post('/set-pin', auth, setTransactionPin);

// Get transaction details
router.get('/transactions/:id', auth, getTransactionDetail);

// Get list of banks
router.get('/banks', auth, getBanks);

// routes/account.route.js
router.get('/transaction/status/:reference', auth, checkTransactionStatus);

module.exports = router;
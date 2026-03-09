const mongoose = require('mongoose');
const Account = require('../models/account.model');
const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');
const bcrypt = require('bcryptjs');
const axios = require('axios');



// 1. Check own balance
const getBalance = async (req, res) => {
    try {
        const account = await Account.findOne({ userId: req.user._id });

        if (!account) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        res.status(200).json({
            accountNumber: account.accountNumber,
            balance: account.balance,
            currency: account.currency
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Verify another user's account (Name Enquiry)
// This is used before a transfer to make sure the phone number is correct
const verifyAccount = async (req, res) => {
    try {
        const { accountNumber } = req.params;
        const account = await Account.findOne({ accountNumber }).populate('userId', 'firstName lastName');

        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }

        res.status(200).json({
            accountNumber: account.accountNumber,
            accountName: `${account.userId.firstName} ${account.userId.lastName}`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Fund Wallet (For testing, we can just add money to the wallet. In production, this would be via a payment gateway)
const fundWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Please provide a valid amount" });
        }

        const account = await Account.findOne({ userId: req.user._id });

        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }

        // Update the balance
        account.balance = Number(account.balance) + Number(amount);
        await account.save();

        // Creating a record so it shows in history
        await Transaction.create({
            senderId: req.user._id, // Or receiverId, since you're receiving money
            amount: amount,
            type: 'deposit',
            status: 'success',
            reference: `FUND-${Date.now()}`,
            bankName: "Internal Deposit"
        });

        // 2. Format the response so it looks like money (e.g., 5000.00)
        res.status(200).json({
            success: true,
            message: "Wallet funded successfully",
            newBalance: Number(account.balance).toFixed(2) // This makes it 5000.00
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Transfer Money (This is a more complex operation that involves multiple steps and should be atomic)
const transferMoney = async (req, res) => {
    const { amount, recipientAccountNumber, bankName, pin } = req.body;

    try {
        // 1. Get the Sender and their Account
        const sender = await User.findById(req.user.id);
        const senderAccount = await Account.findOne({ userId: req.user.id });

        // 2. Security Check: PIN (compare plain text pin with hashed pin)
        const isPinMatch = await bcrypt.compare(pin.toString(), sender.transactionPin.toString());
        if (!isPinMatch) {
            return res.status(401).json({ success: false, message: "Invalid PIN" });
        }

        // 3. Balance Check
        if (senderAccount.balance < amount) {
            return res.status(400).json({ success: false, message: "Insufficient funds" });
        }

        // 4. GENERATE UNIQUE REFERENCE NUMBER
        // Format: DIGI-TX-1707684000-1234
        const reference = `DIGI-TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        let transactionType = 'transfer'; // Default to withdrawal for external banks

        // 5. Determine if it's DIGI_PAY to DIGI_PAY or External
        // Note: Make sure "Digi-Pay" matches the 'name' in your getBanks list
        if (bankName === "Digi-Pay Internal" || bankName === "Digi-Pay") {
            const recipientAccount = await Account.findOne({ accountNumber: recipientAccountNumber });
            
            if (!recipientAccount) {
                return res.status(404).json({ success: false, message: "Recipient account not found on Digi-Pay" });
            }

            // Move money internally (Debit sender, Credit receiver)
            senderAccount.balance -= Number(amount);
            recipientAccount.balance += Number(amount);
            
            await senderAccount.save();
            await recipientAccount.save();
            
            transactionType = 'transfer';
        } else {
            // Move money externally (Only Debit sender)
            senderAccount.balance -= Number(amount);
            await senderAccount.save();
        }

        // 6. Create the Official Receipt (Transaction Record)
        const receipt = await Transaction.create({
            senderId: sender._id, // Use senderId to match your Model
            amount,
            recipientAccountNumber,
            bankName,
            type: transactionType,
            status: 'success',
            reference: reference
        });

        // 7. Final Response (Detailed Receipt)
        res.status(200).json({
            success: true,
            message: "Transaction Successful",
            data: {
                reference: receipt.reference,
                status: receipt.status,
                amount: Number(receipt.amount).toLocaleString(),
                bank: receipt.bankName,
                recipient: receipt.recipientAccountNumber,
                type: receipt.type,
                date: receipt.createdAt
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Get Transaction History (for the logged-in user)
const getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // 1. Define the query 
        const query = {
            $or: [
                { senderId: userId },
                { receiverId: userId },
                { userId: userId } // This catches any old ones saved with the wrong name
            ]
        };

        // 2. Find transactions
        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('senderId', 'first_name last_name phone')
            .populate('receiverId', 'first_name last_name phone'); // Fixed name here too

        // 3. Count using the same query
        const total = await Transaction.countDocuments(query);

        res.status(200).json({
            success: true,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            },
            data: transactions
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


//Set Transaction PIN
const setTransactionPin = async (req, res) => {
    try {
        const { pin } = req.body;
        const userId = req.user.id; // From your 'protect' middleware

        // 1. Validation: 4 digits
        if (!/^\d{4}$/.test(pin)) {
            return res.status(400).json({ message: "PIN must be 4 digits" });
        }

        // 2. Hash the PIN
        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(pin.toString(), salt);

        // 3. Update the User record
        await User.findByIdAndUpdate(userId, {
            transactionPin: hashedPin,
            hasPin: true
        });

        res.status(200).json({ 
            success: true, 
            message: "Transaction PIN created successfully." 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// 6. Get Transaction Detail (for a specific transaction)
const getTransactionDetail = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id)
            .populate('userId', 'first_name last_name phone')
            .populate('recipientId', 'first_name last_name phone');

        if (!transaction) return res.status(404).json({ message: "Transaction not found" });

        res.status(200).json({ success: true, data: transaction });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 7. Get Banks (For the transfer form, we need to show a list of banks. We can fetch this from Paystack)
const getBanks = async (req, res) => {
    try {
        // Fetch live banks from Paystack
        const response = await axios.get('https://api.paystack.co/bank?country=nigeria');
        
        // We take their list and add "Digi-Pay" to the top 
        // so users can still transfer internally
        const externalBanks = response.data.data.map(bank => ({
            name: bank.name,
            slug: bank.slug
        }));

        const allBanks = [
            { name: "Digi-Pay", slug: "digi-pay" },
            ...externalBanks
        ];

        res.status(200).json({
            success: true,
            message: "Banks fetched successfully",
            data: allBanks
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch bank list" });
    }
};

// 8. Check Transaction Status using the unique reference number.
const checkTransactionStatus = async (req, res) => {
    try {
        const { reference } = req.params; // Get reference from the URL

        // Find the transaction and populate user details to show who sent it
        const transaction = await Transaction.findOne({ reference })
            .populate('userId', 'first_name last_name email phone');

        if (!transaction) {
            return res.status(404).json({ 
                success: false, 
                message: "Transaction not found. Please check the reference ID." 
            });
        }

        // Return a clean "Receipt" view
        res.status(200).json({
            success: true,
            data: {
                reference: transaction.reference,
                sender: `${transaction.userId.first_name} ${transaction.userId.last_name}`,
                amount: transaction.amount,
                bank: transaction.bankName,
                recipient: transaction.recipientAccountNumber,
                status: transaction.status, // success, pending, or failed
                type: transaction.type,
                date: transaction.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


module.exports = { getBalance, 
    verifyAccount, 
    fundWallet, 
    transferMoney, 
    getTransactionHistory, 
    getTransactionDetail,
    setTransactionPin,
    getBanks,
    checkTransactionStatus

};

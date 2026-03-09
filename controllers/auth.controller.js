const User = require('../models/user.model');
const Account = require('../models/account.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendMail = require('../utils/sendMail.util');



//
const register = async (req, res) => {
    try {
        const { first_name, last_name, username, email, phone, gender, password } = req.body;

        // 1. Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email/phone already exists." });
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Create User (Save to DB later, but here is the logic)
        const newUser = new User({
            first_name,
            last_name,
            username,
            email,
            phone,
            gender,
            password: hashedPassword
        });

        const savedUser = await newUser.save();

        // 4. IMMEDIATELY Create the Wallet (Account)
        // Using phone number as account number 
        const newAccount = new Account({
            userId: savedUser._id,
            accountNumber: savedUser.phone,
            balance: 0.00
        });

        await newAccount.save();

        res.status(201).json({
            success: true,
            message: "User and Wallet created successfully.",
            userId: savedUser._id
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


//
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find user
        const user = await User.findOne({ email });

        if (!user) return res.status(401).json({ message: "Invalid credentials." });

        // 2. Check if account is active
        if (!user.isActive) return res.status(403).json({ message: "Account is deactivated." });

        // 3. Verify Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // NOTE: Here you could increment a 'failedAttempts' counter in the DB 
            // to lock the account for 24 hours if it reaches 10.
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // 4. Generate JWT
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.status(200).json({
            success: true,
            token,
            user: { id: user._id, name: user.name, phone: user.phone }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


//
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "User not found" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordOTP = otp;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; 
        await user.save();

        // Send the actual email
        const message = `Your password reset OTP is ${otp}.\n It expires in 10 minutes. If you did not request this, \nplease ignore this email.`;

        try {
            await sendMail({
                email: user.email,
                subject: 'Password Reset OTP',
                message
            });

            res.status(200).json({ success: true, message: "OTP sent to your email" });
        } catch (err) {
            user.resetPasswordOTP = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            return res.status(500).json({ message: "Email could not be sent" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
//
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        // 1. Find user with valid OTP and check expiry
        const user = await User.findOne({
            email,
            resetPasswordOTP: otp,
            resetPasswordExpires: { $gt: Date.now() } // Must be greater than "now"
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // 2. Hash the new password
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(newPassword, salt);

        // 3. Clear the OTP fields so they can't be used again
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).json({ 
            success: true, 
            message: "Password reset successful. Please login with your new password." 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
module.exports = { register, login, forgotPassword, resetPassword };
const User = require('../models/user.model');



// Get current user profile
const getProfile = async (req, res) => {
    res.status(200).json(req.user);
};

// Update Profile & KYC
const updateProfile = async (req, res) => {
    try {
        const {first_name, last_name, address, idType, idNumber } = req.body;

        const updatedData = {
            first_name,
            last_name,
            address,
            'kycDetails.idType': idType,
            'kycDetails.idNumber': idNumber,
        };

        // If ID details are provided, we could set status to 'verified' 
        // (In a real app, this would be 'pending' until an admin checks it)
        if (idType && idNumber) {
            updatedData.kycStatus = 'verified';
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updatedData },
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json({ message: "Profile updated successfully", user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getProfile, updateProfile };
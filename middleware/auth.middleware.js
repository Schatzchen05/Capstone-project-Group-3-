const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const auth = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Fetch user and attach to request (excluding password)
            req.user = await User.findById(decoded.id).select('-password');
            
            if (!req.user) {
                return res.status(401).json({ message: "User no longer exists" });
            }

            next();
        } catch (error) {
            return res.status(401).json({ message: "Not authorized, token expired or invalid" });
        }
    } else {
        return res.status(401).json({ message: "No token, authorization denied" });
    }
};

module.exports = { auth };
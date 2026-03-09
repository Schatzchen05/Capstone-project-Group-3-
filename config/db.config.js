const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const connect = await mongoose.connect(process.env.DATABASE_URL);
        console.log(`MongoDB connected: ${connect.connection.host}`);

    }catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1); // Exit with failure
    }
};

module.exports = connectDB;
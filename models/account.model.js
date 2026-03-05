const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
    unique: true 
  },
  accountNumber: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  balance: { 
    type: mongoose.Schema.Types.Decimal128, 
    default: 0.00 
  },
  currency: { type: String, default: "NGN" },
  status: { type: String, enum: ["active", "frozen"], default: "active" }
}, { timestamps: true });

module.exports = mongoose.model("Account", AccountSchema);
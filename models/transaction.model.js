const mongoose = require('mongoose');


const TransactionSchema = new mongoose.Schema(
  {
    senderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
    },
    receiverId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      
    },
    amount: { 
      type: mongoose.Schema.Types.Decimal128, 
      required: true 
    },
    type: { 
      type: String, 
      enum: ['transfer', 'deposit', 'withdrawal', 'reversal'], 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['pending', 'success', 'failed'], 
      default: 'pending' 
    },
    reference: { 
      type: String, 
      unique: true, 
      
    }, 
    bankName: { 
      type: String
      
    },
    description: { type: String },
    
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", TransactionSchema);
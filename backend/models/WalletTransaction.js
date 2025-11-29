const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletTransactionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['CREDIT', 'DEBIT'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    
    razorpayPaymentId: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      index: true,
    },
    reason: {
      type: String,
      enum: ['ADD_MONEY', 'GAME_JOIN', 'REFUND', 'ADJUSTMENT'],
      required: true,
    },
    
    game: {
      type: Schema.Types.ObjectId,
      ref: 'Game',
    },
    description: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);


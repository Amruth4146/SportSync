const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const razorpay = require('../config/razorpay');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/create-order', auth, async (req, res) => {
  if (!razorpay) {
    return res.status(503).json({
      message: 'Wallet top-up is temporarily unavailable. Missing Razorpay credentials.',
    });
  }
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        message: 'Amount must be a positive number',
      });
    }

    
    if (amount < 1) {
      return res.status(400).json({
        message: 'Minimum amount is ₹1',
      });
    }

    
    const amountInPaise = Math.round(amount * 100);

    
    
    const rawReceipt = `wallet_${userId}_${Date.now()}`;
    const receipt = rawReceipt.slice(0, 40);

    
    const options = {
      amount: amountInPaise, 
      currency: 'INR',
      receipt: receipt,
      notes: {
        userId: userId.toString(),
        type: 'WALLET_TOPUP',
      },
    };

    const order = await razorpay.orders.create(options);

    
    res.json({
      orderId: order.id,
      amount: amount, 
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID, 
      receipt: order.receipt,
    });
  } catch (err) {
    console.error('Error creating Razorpay order:', err);
    res.status(500).json({
      message: 'Failed to create payment order',
      error: err.message,
    });
  }
});

router.post('/verify-and-credit', auth, async (req, res) => {
  if (!razorpay) {
    return res.status(503).json({
      message: 'Wallet top-up is temporarily unavailable. Missing Razorpay credentials.',
    });
  }
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Missing Razorpay payment details',
      });
    }

    
    
    
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Invalid payment signature',
      });
    }

    
    let payment;
    try {
      payment = await razorpay.payments.fetch(razorpay_payment_id);
      
      
      if (payment.status !== 'captured') {
        await session.abortTransaction();
        return res.status(400).json({
          message: `Payment not captured. Status: ${payment.status}`,
        });
      }

      
      if (payment.order_id !== razorpay_order_id) {
        await session.abortTransaction();
        return res.status(400).json({
          message: 'Order ID mismatch',
        });
      }
    } catch (razorpayErr) {
      console.error('Error fetching payment from Razorpay:', razorpayErr);
      
    }

    
    
    const amountInPaise = payment ? payment.amount : null;
    const amountInRupees = amountInPaise ? amountInPaise / 100 : null;

    
    let finalAmount = amountInRupees;
    if (!finalAmount) {
      try {
        const order = await razorpay.orders.fetch(razorpay_order_id);
        finalAmount = order.amount / 100; 
      } catch (orderErr) {
        await session.abortTransaction();
        return res.status(400).json({
          message: 'Could not verify payment amount',
        });
      }
    }

    
    
    const existingTransaction = await WalletTransaction.findOne({
      razorpayPaymentId: razorpay_payment_id,
    }).session(session);

    if (existingTransaction) {
      
      await session.commitTransaction();
      const user = await User.findById(userId).session(session);
      return res.json({
        message: 'Payment already processed',
        walletBalance: user.walletBalance,
        amountCredited: existingTransaction.amount,
      });
    }

    
    
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'User not found' });
    }

    
    const walletTransaction = new WalletTransaction({
      user: userId,
      type: 'CREDIT',
      amount: finalAmount,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      reason: 'ADD_MONEY',
      description: `Wallet top-up via Razorpay - Order: ${razorpay_order_id}`,
    });

    
    user.walletBalance += finalAmount;

    
    await walletTransaction.save({ session });
    await user.save({ session });

    
    await session.commitTransaction();

    res.json({
      message: 'Wallet credited successfully',
      walletBalance: user.walletBalance,
      amountCredited: finalAmount,
    });
  } catch (err) {
    
    await session.abortTransaction();

    
    if (err.code === 11000 && err.keyPattern?.razorpayPaymentId) {
      
      const user = await User.findById(req.user.id);
      const existingTransaction = await WalletTransaction.findOne({
        razorpayPaymentId: req.body.razorpay_payment_id,
      });

      return res.json({
        message: 'Payment already processed',
        walletBalance: user.walletBalance,
        amountCredited: existingTransaction?.amount || 0,
      });
    }

    console.error('Error verifying and crediting wallet:', err);
    res.status(500).json({
      message: 'Failed to credit wallet',
      error: err.message,
    });
  } finally {
    session.endSession();
  }
});

router.get('/balance', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('walletBalance');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      walletBalance: user.walletBalance || 0,
    });
  } catch (err) {
    console.error('Error fetching wallet balance:', err);
    res.status(500).json({ message: 'Failed to fetch wallet balance' });
  }
});

router.get('/transactions', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); 
    const skip = (page - 1) * limit;

    
    const transactions = await WalletTransaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('game', 'teamName gameType')
      .lean();

    
    const total = await WalletTransaction.countDocuments({ user: userId });

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

const Game = require('../models/Game');

router.get('/game/:gameId/status', auth, async (req, res) => {
  try {
    const { gameId } = req.params;

    const game = await Game.findById(gameId).populate('players', 'name email');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Find all successful payment transactions for this game
    const transactions = await WalletTransaction.find({
      game: gameId,
      type: 'DEBIT',
      reason: 'GAME_JOIN',
    });

    // Create a map of userIds who have paid
    const paidUserIds = new Set(transactions.map((t) => t.user.toString()));
    const transactionMap = transactions.reduce((acc, t) => {
      acc[t.user.toString()] = t;
      return acc;
    }, {});

    const amountPerPlayer =
      game.turfPrice && game.teamSize
        ? (game.turfPrice / game.teamSize).toFixed(2)
        : 0;

    const playersStatus = game.players.map((player) => {
      const isPaid = paidUserIds.has(player._id.toString());
      const transaction = transactionMap[player._id.toString()];

      return {
        userId: player._id,
        name: player.name,
        email: player.email,
        status: isPaid ? 'paid' : 'pending',
        paidAt: transaction ? transaction.createdAt : null,
        amount: transaction ? transaction.amount : 0,
      };
    });

    res.json({
      gameId: game._id,
      totalPrice: game.turfPrice || 0,
      amountPerPlayer,
      players: playersStatus,
    });
  } catch (err) {
    console.error('Error fetching game payment status:', err);
    res.status(500).json({ message: 'Failed to fetch payment status' });
  }
});

module.exports = router;


const express = require('express');
const Wallet = require('../models/Wallet');
const Game = require('../models/Game');
const auth = require('../middleware/auth');

const router = express.Router();

const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId });
  }
  return wallet;
};

router.get('/me', auth, async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user.id);
    res.json({
      balance: wallet.balance,
      transactions: wallet.transactions.slice(-10).reverse(),
      payments: wallet.payments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch wallet' });
  }
});

router.post('/topup', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    const wallet = await getOrCreateWallet(req.user.id);
    wallet.balance += Number(amount);
    wallet.transactions.push({
      type: 'topup',
      amount: Number(amount),
      description: 'Wallet top-up',
    });

    await wallet.save();
    res.json({ message: 'Wallet funded successfully', balance: wallet.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to top-up wallet' });
  }
});

router.post('/pay-game', auth, async (req, res) => {
  try {
    const { gameId, totalPrice } = req.body;
    if (!gameId) {
      return res.status(400).json({ message: 'gameId is required' });
    }

    const game = await Game.findById(gameId).populate('players', 'name email');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (!game.players.some((p) => p._id.toString() === req.user.id)) {
      return res.status(403).json({ message: 'You are not part of this game' });
    }

    if (game.players.length === 0) {
      return res.status(400).json({ message: 'No players in this game yet' });
    }

    if (!game.turfPrice || game.turfPrice <= 0) {
      if (!totalPrice || totalPrice <= 0) {
        return res.status(400).json({
          message: 'totalPrice is required the first time payments are made for this game',
        });
      }
      game.turfPrice = Number(totalPrice);
      await game.save();
    }

    const share = Number((game.turfPrice / game.players.length).toFixed(2));
    const wallet = await getOrCreateWallet(req.user.id);

    const existingPayment = wallet.payments.find(
      (payment) => payment.game && payment.game.toString() === game.id
    );

    if (existingPayment && existingPayment.status === 'paid') {
      return res.json({ message: 'You have already paid for this game', share });
    }

    if (wallet.balance < share) {
      return res.status(400).json({
        message: 'Insufficient wallet balance. Please top-up to continue',
        required: share,
        balance: wallet.balance,
      });
    }

    wallet.balance -= share;
    wallet.transactions.push({
      type: 'payment',
      amount: share,
      description: `Payment for ${game.teamName}`,
      game: game._id,
    });

    if (existingPayment) {
      existingPayment.status = 'paid';
      existingPayment.amount = share;
      existingPayment.paidAt = new Date();
    } else {
      wallet.payments.push({
        game: game._id,
        amount: share,
        status: 'paid',
        paidAt: new Date(),
      });
    }

    await wallet.save();
    res.json({
      message: 'Payment successful',
      share,
      balance: wallet.balance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to process payment' });
  }
});

router.get('/game/:gameId/status', auth, async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = await Game.findById(gameId).populate('players', 'name email');

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const playerIds = game.players.map((player) => player._id);
    const wallets = await Wallet.find({ user: { $in: playerIds } }).lean();
    const walletMap = new Map(
      wallets.map((wallet) => [wallet.user.toString(), wallet])
    );

    const amountPerPlayer =
      game.turfPrice && game.players.length
        ? Number((game.turfPrice / game.players.length).toFixed(2))
        : null;

    const players = game.players.map((player) => {
      const wallet = walletMap.get(player._id.toString());
      const payment = wallet?.payments?.find(
        (p) => p.game && p.game.toString() === game.id
      );

      return {
        userId: player._id,
        name: player.name,
        email: player.email,
        amountDue: amountPerPlayer,
        status: payment?.status || 'pending',
        paidAt: payment?.paidAt || null,
      };
    });

    res.json({
      gameId: game.id,
      teamName: game.teamName,
      totalPrice: game.turfPrice || null,
      amountPerPlayer,
      players,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch payment status' });
  }
});

module.exports = router;


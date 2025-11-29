const express = require('express');
const mongoose = require('mongoose');
const Game = require('../models/Game');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const {
      teamName,
      teamSize,
      gameType,
      turfLocation,
      turfDateTime,
      turfPrice,  
      geoLocation,
    } = req.body;

    if (!teamName || !teamSize || !gameType || !turfLocation || !turfDateTime) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const gameData = {
      teamName,
      teamSize,
      gameType,
      turfLocation,
      turfDateTime: new Date(turfDateTime),
      players: [req.user.id],
      createdBy: req.user.id,
      captain: req.user.id,
    };

    if (turfPrice !== undefined && turfPrice !== null && turfPrice !== '') {
      const price = parseFloat(turfPrice);
      if (!isNaN(price) && price >= 0) {
        gameData.turfPrice = price;
      }
    }

    if (geoLocation && geoLocation.coordinates && Array.isArray(geoLocation.coordinates)) {
      if (geoLocation.coordinates.length === 2) {
        gameData.geoLocation = {
          type: 'Point',
          coordinates: geoLocation.coordinates,
        };
      }
    }

    const game = await Game.create(gameData);

    res.status(201).json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { gameType, location, date } = req.query;

    const query = {
      isOpen: true,
      status: 'upcoming',
      availableSpots: { $gt: 0 },
    };

    if (gameType) query.gameType = gameType;
    if (location) query.turfLocation = new RegExp(location, 'i');
    if (date) {
      const day = new Date(date);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      query.turfDateTime = { $gte: day, $lt: nextDay };
    }

    const games = await Game.find(query).populate('players', 'name email');
    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/mine', auth, async (req, res) => {
  try {
    const games = await Game.find({ players: req.user.id });
    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/auto-join', auth, async (req, res) => {
  try {
    const { gameType, location, date } = req.body || {};

    const query = {
      isOpen: true,
      status: 'upcoming',
      availableSpots: { $gt: 0 },
      players: { $ne: req.user.id },
    };

    if (gameType) query.gameType = gameType;
    if (location) query.turfLocation = new RegExp(location, 'i');
    if (date) {
      const day = new Date(date);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      query.turfDateTime = { $gte: day, $lt: nextDay };
    }

    const game = await Game.findOne(query).sort({ turfDateTime: 1 });

    if (!game) {
      return res
        .status(404)
        .json({ message: 'No suitable game found to auto-join' });
    }

    game.players.push(req.user.id);
    await game.save();

    res.json({
      message: 'Auto-joined a game successfully',
      game,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/players', auth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('players', 'name email')
      .populate('captain', 'name email');

    if (!game) return res.status(404).json({ message: 'Game not found' });

    res.json({
      gameId: game._id,
      teamName: game.teamName,
      captain: game.captain,
      players: game.players,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/add-player', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    
    const isCreator = game.createdBy.toString() === req.user.id;
    const isCaptain = game.captain && game.captain.toString() === req.user.id;

    if (!isCreator && !isCaptain) {
      return res.status(403).json({ message: 'Not allowed to add players' });
    }

    if (game.players.some((p) => p.toString() === userId)) {
      return res.status(400).json({ message: 'User already in this game' });
    }

    if (game.availableSpots <= 0) {
      return res.status(400).json({ message: 'No spots left' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    game.players.push(user._id);
    await game.save();

    res.json({ message: 'Player added', game });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/kick/:playerId', auth, async (req, res) => {
  try {
    const { id, playerId } = req.params;

    const game = await Game.findById(id);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    const isCreator = game.createdBy.toString() === req.user.id;
    const isCaptain = game.captain && game.captain.toString() === req.user.id;

    if (!isCreator && !isCaptain) {
      return res.status(403).json({ message: 'Not allowed to kick players' });
    }

    if (playerId === game.createdBy.toString()) {
      return res
        .status(400)
        .json({ message: 'Cannot remove the game creator' });
    }

    const before = game.players.length;
    game.players = game.players.filter(
      (p) => p.toString() !== playerId
    );

    if (game.players.length === before) {
      return res.status(400).json({ message: 'Player not in this game' });
    }

    if (game.captain && game.captain.toString() === playerId) {
      game.captain = null;
    }

    await game.save();
    res.json({ message: 'Player removed from game', game });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/join', auth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    if (!game.isOpen || game.availableSpots <= 0) {
      return res.status(400).json({ message: 'No spots available' });
    }

    if (game.players.some((p) => p.toString() === req.user.id)) {
      return res.status(400).json({ message: 'Already joined' });
    }

    game.players.push(req.user.id);
    await game.save();

    res.json({ message: 'Joined game successfully', game });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/leave', auth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    const before = game.players.length;
    game.players = game.players.filter(
      (p) => p.toString() !== req.user.id
    );

    if (game.players.length === before) {
      return res.status(400).json({ message: 'You are not in this game' });
    }

    if (game.captain && game.captain.toString() === req.user.id) {
      game.captain = null;
    }

    await game.save();
    res.json({ message: 'Left game successfully', game });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, maxDistance, sport } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        message: 'lat and lng query parameters are required',
      });
    }

    const latitude = parseFloat(lat);
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        message: 'Invalid latitude. Must be a number between -90 and 90',
      });
    }

    const longitude = parseFloat(lng);
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        message: 'Invalid longitude. Must be a number between -180 and 180',
      });
    }

    const maxDist = maxDistance ? parseFloat(maxDistance) : 5000;
    if (isNaN(maxDist) || maxDist <= 0) {
      return res.status(400).json({
        message: 'maxDistance must be a positive number (in meters)',
      });
    }

    const geoQuery = {
      isOpen: true,
      status: 'upcoming',
      availableSpots: { $gt: 0 },
      'geoLocation.coordinates': { $exists: true, $ne: null },
    };

    if (sport) {
      geoQuery.gameType = sport;
    }

    const games = await Game.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          distanceField: 'distance',
          spherical: true,
          maxDistance: maxDist,
          query: geoQuery,
        },
      },
      {
        $limit: 50,
      },
      {
        $lookup: {
          from: 'users',
          localField: 'players',
          foreignField: '_id',
          as: 'playersData',
        },
      },
      {
        $project: {
          teamName: 1,
          teamSize: 1,
          gameType: 1,
          turfLocation: 1,
          turfDateTime: 1,
          turfPrice: 1,
          geoLocation: 1,
          players: 1,
          playersData: {
            _id: 1,
            name: 1,
            email: 1,
          },
          captain: 1,
          availableSpots: 1,
          isOpen: 1,
          status: 1,
          createdBy: 1,
          distance: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    res.json({
      success: true,
      count: games.length,
      games: games.map((game) => ({
        ...game,
        distanceKm: (game.distance / 1000).toFixed(2),
        distanceMeters: Math.round(game.distance),
      })),
    });
  } catch (err) {
    console.error('Error finding nearby games:', err);
    res.status(500).json({
      message: 'Failed to find nearby games',
      error: err.message,
    });
  }
});

router.post('/:id/join-with-wallet', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.id;
    const gameId = req.params.id;

    
    const game = await Game.findById(gameId).session(session);
    if (!game) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Game not found' });
    }

    
    if (!game.isOpen || game.availableSpots <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'No spots available in this game' });
    }

    
    const isAlreadyPlayer = game.players.some(
      (playerId) => playerId.toString() === userId
    );
    if (isAlreadyPlayer) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'You are already part of this game' });
    }

    
    
    
    let perPlayerPrice = 0;
    
    if (game.turfPrice && game.turfPrice > 0) {
      
      perPlayerPrice = Number((game.turfPrice / game.teamSize).toFixed(2));
    } else {
      
      
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Game price not set. Please contact game organizer.',
      });
    }

    if (perPlayerPrice <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid game price' });
    }

    
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'User not found' });
    }

    
    const walletBalance = user.walletBalance || 0;
    if (walletBalance < perPlayerPrice) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Insufficient wallet balance',
        required: perPlayerPrice,
        currentBalance: walletBalance,
        shortfall: (perPlayerPrice - walletBalance).toFixed(2),
      });
    }

    
    
    user.walletBalance -= perPlayerPrice;
    await user.save({ session });

    
    const walletTransaction = new WalletTransaction({
      user: userId,
      type: 'DEBIT',
      amount: perPlayerPrice,
      reason: 'GAME_JOIN',
      game: gameId,
      description: `Payment for joining game: ${game.teamName}`,
    });
    await walletTransaction.save({ session });

    
    game.players.push(userId);
    
    
    game.availableSpots = game.teamSize - game.players.length;
    game.isOpen = game.availableSpots > 0 && game.status === 'upcoming';

    await game.save({ session });

    
    await session.commitTransaction();

    res.json({
      message: 'Joined game using wallet',
      walletBalance: user.walletBalance,
      amountDeducted: perPlayerPrice,
      game: {
        id: game._id,
        teamName: game.teamName,
        players: game.players.length,
        availableSpots: game.availableSpots,
      },
    });
  } catch (err) {
    
    await session.abortTransaction();
    console.error('Error joining game with wallet:', err);
    res.status(500).json({
      message: 'Failed to join game',
      error: err.message,
    });
  } finally {
    session.endSession();
  }
});

module.exports = router;

const express = require('express');
const Turf = require('../models/Turf');

const router = express.Router();

router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, maxDistance } = req.query;

    
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

    
    
    
    const turfs = await Turf.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude], 
          },
          distanceField: 'distance', 
          spherical: true, 
          maxDistance: maxDist, 
          query: {
            
            
          },
        },
      },
      {
        $limit: 50, 
      },
      {
        $project: {
          
          name: 1,
          location: 1,
          city: 1,
          pricePerHour: 1,
          geoLocation: 1,
          distance: 1, 
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    res.json({
      success: true,
      count: turfs.length,
      turfs: turfs.map((turf) => ({
        ...turf,
        
        distanceKm: (turf.distance / 1000).toFixed(2),
        
        distanceMeters: Math.round(turf.distance),
      })),
    });
  } catch (err) {
    console.error('Error finding nearby turfs:', err);
    res.status(500).json({
      message: 'Failed to find nearby turfs',
      error: err.message,
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const turfs = await Turf.find();
    res.json(turfs);
  } catch (err) {
    console.error('Error fetching turfs:', err);
    res.status(500).json({ message: 'Failed to fetch turfs' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, location, city, pricePerHour, geoLocation } = req.body;

    if (!name || !location) {
      return res.status(400).json({ message: 'name and location are required' });
    }

    const turf = await Turf.create({
      name,
      location,
      city,
      pricePerHour: pricePerHour || 0,
      geoLocation: geoLocation || undefined,
    });

    res.status(201).json(turf);
  } catch (err) {
    console.error('Error creating turf:', err);
    res.status(500).json({ message: 'Failed to create turf', error: err.message });
  }
});

module.exports = router;


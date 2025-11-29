import React, { useState } from 'react';
import { gamesAPI, getCurrentLocation } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CreateGame({ onClose, onGameCreated }) {
  const [formData, setFormData] = useState({
    teamName: '',
    teamSize: '',
    gameType: '',
    turfLocation: '',
    turfDateTime: '',
    turfPrice: '',
    latitude: '',
    longitude: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const { isAuthenticated } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setError('Please log in to create a game');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const gameData = {
        teamName: formData.teamName,
        teamSize: parseInt(formData.teamSize),
        gameType: formData.gameType,
        turfLocation: formData.turfLocation,
        turfDateTime: formData.turfDateTime,
        turfPrice: formData.turfPrice ? parseFloat(formData.turfPrice) : 0,
      };

      if (formData.latitude && formData.longitude) {
        const lat = parseFloat(formData.latitude);
        const lng = parseFloat(formData.longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          gameData.geoLocation = {
            type: 'Point',
            coordinates: [lng, lat],
          };
        }
      }
      
      await gamesAPI.create(gameData);
      alert('Game created successfully!');
      onClose();
      if (onGameCreated) onGameCreated();
    } catch (err) {
      setError(err.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUseMyLocation = async () => {
    try {
      setGettingLocation(true);
      setError('');
      
      const location = await getCurrentLocation();
      
      setFormData({
        ...formData,
        latitude: location.lat.toString(),
        longitude: location.lng.toString(),
      });
      
      if (!formData.turfLocation) {
        setFormData(prev => ({  
          ...prev,
          turfLocation: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
        }));
      }
    } catch (err) {
      setError('Unable to get your location: ' + err.message);
    } finally {
      setGettingLocation(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Create New Game</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Team Name
            </label>
            <input
              type="text"
              name="teamName"
              value={formData.teamName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Team Size
            </label>
            <input
              type="number"
              name="teamSize"
              value={formData.teamSize}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Total Turf Price (₹)
            </label>
            <input
              type="number"
              name="turfPrice"
              value={formData.turfPrice}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="Enter total price"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {formData.turfPrice && formData.teamSize && (
              <div className="mt-2 p-3 bg-indigo-500/20 border border-indigo-500 rounded-md">
                <p className="text-sm text-gray-300">
                  <span className="font-medium">Price per player:</span>{' '}
                  <span className="text-indigo-400 font-semibold">
                    ₹{((parseFloat(formData.turfPrice) || 0) / parseInt(formData.teamSize)).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Total: ₹{parseFloat(formData.turfPrice).toFixed(2)} ÷ {formData.teamSize} players
                </p>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Game Type
            </label>
            <select
              name="gameType"
              value={formData.gameType}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select game type</option>
              <option value="football">Football</option>
              <option value="cricket">Cricket</option>
              <option value="basketball">Basketball</option>
              <option value="badminton">Badminton</option>
              <option value="tennis">Tennis</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Turf Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="turfLocation"
                value={formData.turfLocation}
                onChange={handleChange}
                required
                placeholder="Enter location name or address"
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={gettingLocation}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50 whitespace-nowrap"
                title="Use your current GPS location"
              >
                {gettingLocation ? 'Getting Location...' : 'Use Location'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Click "Use Location" to automatically set coordinates from your GPS
            </p>
            {(formData.latitude && formData.longitude) && (
              <p className="mt-1 text-xs text-green-400">
                ✓ Location set: {formData.latitude}, {formData.longitude}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Date & Time
            </label>
            <input
              type="datetime-local"
              name="turfDateTime"
              value={formData.turfDateTime}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


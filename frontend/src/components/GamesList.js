import React, { useState, useEffect } from 'react';
import { gamesAPI, walletAPI, getCurrentLocation } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import CreateGame from './CreateGame';

export default function GamesList() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [turfPriceInput, setTurfPriceInput] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paying, setPaying] = useState(false);
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [filters, setFilters] = useState({
    gameType: '',
    location: '',
    date: '',
  });
  const { isAuthenticated, user } = useAuth();
  const { balance, payForGame } = useWallet();

  useEffect(() => {
    loadGames();
  }, [filters]);

  const loadGames = async () => {
    try {
      setLoading(true);
      const data = await gamesAPI.getAll(filters);
      setGames(data);
      setError('');
      setIsNearbyMode(false);
    } catch (err) {
      setError(err.message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const findNearbyGames = async () => {
    try {
      setLoadingLocation(true);
      setError('');
      
      const location = await getCurrentLocation();
      
      setLoading(true);
      const response = await gamesAPI.getNearby(
        location.lat, 
        location.lng, 
        10000, 
        filters.gameType || null
      );
      setGames(response.games || []);
      setIsNearbyMode(true);
    } catch (err) {
      setError(err.message || 'Failed to find nearby games');
      alert(err.message || 'Unable to get your location. Please allow location access.');
    } finally {
      setLoading(false);
      setLoadingLocation(false);
    }
  };

  const handleCreateGameClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowCreateGame(true);
  };

  const handleJoin = async (gameId, e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      alert('Please log in to join a game');
      return;
    }

    try {
      await gamesAPI.join(gameId);
      alert('Successfully joined the game!');
      loadGames();
    } catch (err) {
      alert(err.message || 'Failed to join game');
    }
  };

  const handleGameClick = async (gameId) => {
    if (!isAuthenticated) {
      alert('Please log in to view team members');
      return;
    }

    try {
      setLoadingPlayers(true);
      const [teamData, walletData] = await Promise.all([
        gamesAPI.getPlayers(gameId),
        walletAPI.getPaymentStatus(gameId),
      ]);

      setSelectedGame({
        teamName: teamData.teamName,
        captain: teamData.captain,
        gameId,
      });
      setPlayers(walletData.players || []);
      setPaymentStatus({
        totalPrice: walletData.totalPrice,
        amountPerPlayer: walletData.amountPerPlayer,
      });
      setTurfPriceInput(walletData.totalPrice || '');
      setPaymentError('');
    } catch (err) {
      alert(err.message || 'Failed to load team members');
    } finally {
      setLoadingPlayers(false);
    }
  };

  const closeModal = () => {
    setSelectedGame(null);
    setPlayers([]);
    setPaymentStatus(null);
    setTurfPriceInput('');
    setPaymentError('');
  };

  const refreshPaymentStatus = async (gameId) => {
    const walletData = await walletAPI.getPaymentStatus(gameId);
    setPlayers(walletData.players || []);
    setPaymentStatus({
      totalPrice: walletData.totalPrice,
      amountPerPlayer: walletData.amountPerPlayer,
    });
    setTurfPriceInput(walletData.totalPrice || '');
  };

  const handlePayShare = async () => {
    if (!selectedGame) return;
    const numericPrice = Number(turfPriceInput);
    if (!paymentStatus?.amountPerPlayer && (!numericPrice || numericPrice <= 0)) {
      setPaymentError('Enter total turf price to split before paying.');
      return;
    }

    try {
      setPaying(true);
      setPaymentError('');
      await payForGame({
        gameId: selectedGame.gameId,
        totalPrice: paymentStatus?.amountPerPlayer ? undefined : numericPrice,
      });
      await refreshPaymentStatus(selectedGame.gameId);
      alert('Payment successful');
    } catch (err) {
      setPaymentError(err.message || 'Failed to process payment');
    } finally {
      setPaying(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const myPayment = players.find((player) => player.userId === user?.id);
  const alreadyPaid = myPayment?.status === 'paid';

  return (
    <div className="bg-gray-900 min-h-screen pt-24 pb-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 relative z-10">
          <h2 className="text-3xl font-bold text-white">
            {isNearbyMode ? 'Games Near You' : 'Find Games'}
          </h2>
          <div className="flex gap-3">
            <button
              onClick={findNearbyGames}
              disabled={loadingLocation}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-white font-semibold py-2 px-4 rounded-md transition"
            >
              {loadingLocation ? 'Getting location...' : 'Nearby'}
            </button>
            {isAuthenticated ? (
            <button
              type="button"
              onClick={handleCreateGameClick}
              className="bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition cursor-pointer relative z-50"
              style={{ position: 'relative', zIndex: 100 }}
            >
              Create Game
            </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  alert('Please log in to create a game');
                }}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-4 rounded-md transition cursor-pointer relative z-50 pointer-events-auto"
                style={{ position: 'relative', zIndex: 50 }}
              >
                Log in to Create Game
              </button>
            )}
            {isNearbyMode && (
              <button
                onClick={loadGames}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md transition"
              >
                Show All
              </button>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Game Type
              </label>
              <select
                value={filters.gameType}
                onChange={(e) => setFilters({ ...filters, gameType: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Types</option>
                <option value="football">Football</option>
                <option value="cricket">Cricket</option>
                <option value="basketball">Basketball</option>
                <option value="badminton">Badminton</option>
                <option value="tennis">Tennis</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Location
              </label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                placeholder="Search location..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Date
              </label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading games...</div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-400">
            {error}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            No games found. Try adjusting your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <div
                key={game._id}
                onClick={() => handleGameClick(game._id)}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-indigo-500 transition cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-white">{game.teamName}</h3>
                  <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded">
                    {game.gameType}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-400 mb-4">
                  <p>
                    <span className="font-medium text-gray-300">Location:</span>{' '}
                    {game.turfLocation}
                  </p>
                  {isNearbyMode && game.distanceKm && (
                    <p>
                      <span className="font-medium text-gray-300">Distance:</span>{' '}
                      <span className="text-green-400">{game.distanceKm} km away</span>
                    </p>
                  )}
                  <p>
                    <span className="font-medium text-gray-300">Date & Time:</span>{' '}
                    {formatDate(game.turfDateTime)}
                  </p>
                  <p>
                    <span className="font-medium text-gray-300">Players:</span>{' '}
                    {game.players?.length || 0} / {game.teamSize}
                  </p>
                  <p>
                    <span className="font-medium text-gray-300">Spots Left:</span>{' '}
                    {game.availableSpots}
                  </p>
                </div>

                <button
                  onClick={(e) => handleJoin(game._id, e)}
                  disabled={!game.isOpen || game.availableSpots <= 0}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-2 px-4 rounded-md transition"
                >
                  {game.availableSpots > 0 ? 'Join Game' : 'Full'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateGame && (
        <CreateGame
          onClose={() => setShowCreateGame(false)}
          onGameCreated={() => {
            setShowCreateGame(false);
            loadGames();
          }}
        />
      )}

      {selectedGame && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 px-4"
          onClick={closeModal}
        >
          <div
            className="bg-gray-800 rounded-2xl p-6 w-full max-w-2xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Team</p>
                <h2 className="text-2xl font-bold text-white">{selectedGame.teamName}</h2>
                {selectedGame.captain && (
                  <p className="text-sm text-gray-400 mt-1">
                    Captain: <span className="text-white">{selectedGame.captain.name}</span>
                  </p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {loadingPlayers ? (
              <div className="text-center text-gray-400 py-8">Loading members...</div>
            ) : (
              <>
                <div className="bg-gray-900 rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Total turf price</p>
                    {paymentStatus?.totalPrice ? (
                      <p className="text-white text-lg font-semibold">
                        ₹{Number(paymentStatus.totalPrice).toFixed(2)}
                      </p>
                    ) : (
                      <div className="flex gap-2 mt-1">
                        <input
                          type="number"
                          min="1"
                          value={turfPriceInput}
                          onChange={(e) => setTurfPriceInput(e.target.value)}
                          placeholder="Enter price"
                          className="w-full px-3 py-1.5 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-400">Amount per player</p>
                    <p className="text-white text-lg font-semibold">
                      {paymentStatus?.amountPerPlayer
                        ? `₹${Number(paymentStatus.amountPerPlayer).toFixed(2)}`
                        : 'Pending'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Your wallet balance</p>
                    <p className="text-white text-lg font-semibold">₹{Number(balance || 0).toFixed(2)}</p>
                  </div>
                </div>

                {paymentError && <p className="text-red-400 text-sm mb-2">{paymentError}</p>}

                <div className="flex justify-between items-center mb-3">
                  <p className="text-gray-300 font-semibold">
                    Payment status ({players.length} players)
                  </p>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-gray-400">
                      Your status:{' '}
                      <span className={alreadyPaid ? 'text-green-400' : 'text-yellow-400'}>
                        {alreadyPaid ? 'Paid' : 'Pending'}
                      </span>
                    </p>
                    <button
                      onClick={handlePayShare}
                      disabled={paying || !players.length || alreadyPaid}
                      className="px-4 py-2 rounded-md bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold transition"
                    >
                      {paying ? 'Processing...' : 'Pay my share'}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 text-left border-b border-gray-700">
                        <th className="py-2">Player</th>
                        <th className="py-2">Email</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Paid at</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-gray-500 py-4">
                            No players found
                          </td>
                        </tr>
                      ) : (
                        players.map((player) => (
                          <tr
                            key={player.userId}
                            className={`border-b border-gray-800 ${
                              player.userId === user?.id ? 'bg-gray-900/60' : ''
                            }`}
                          >
                            <td className="py-2 text-white">{player.name}</td>
                            <td className="py-2 text-gray-400">{player.email}</td>
                            <td className="py-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  player.status === 'paid'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}
                              >
                                {player.status === 'paid' ? 'Paid' : 'Pending'}
                              </span>
                            </td>
                            <td className="py-2 text-gray-500 text-xs">
                              {player.paidAt
                                ? new Date(player.paidAt).toLocaleString()
                                : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
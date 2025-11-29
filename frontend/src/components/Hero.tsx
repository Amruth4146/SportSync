import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { gamesAPI, getCurrentLocation } from '../services/api';

export default function Hero() {
  const { isAuthenticated, user, logout } = useAuth()
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const handleGameClick = async (gameId) => {
    if (!isAuthenticated) {
      alert('Please log in to view team members');
      return;
    }

    try {
      setLoadingPlayers(true);
      const data = await gamesAPI.getPlayers(gameId);
      setPlayers(data.players || []);
      setSelectedGame(data);
    } catch (err) {
      alert(err.message || 'Failed to load team members');
    } finally {
      setLoadingPlayers(false);
    }
  };
  const loadGames = async () => {
    try {
      setLoading(true);
      const data = await gamesAPI.getAll({});
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
      const response = await gamesAPI.getNearby(location.lat, location.lng, 10000);
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
  useEffect(() => {
    loadGames();
  }, []);

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
  return (
    <div className="bg-gray-900">
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-288.75"
          />
        </div>
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="hidden sm:mb-8 sm:flex sm:justify-center">
            <div className="relative rounded-full px-3 py-1 text-sm/6 text-gray-400 ring-1 ring-white/10 hover:ring-white/20">
              Book local games, pay online & play.{' '}
              <a href="#how-it-works" className="font-semibold text-indigo-400">
                <span aria-hidden="true" className="absolute inset-0" />
                See how it works <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-semibold tracking-tight text-balance text-white sm:text-7xl">
              Hi, <span className="text-indigo-400">{user?.name}</span> Find and book sports near you
            </h1>
            <p className="mt-8 text-lg font-medium text-pretty text-gray-400 sm:text-xl/8">
              Discover nearby football, cricket, badminton and more — see who’s playing, reserve your slot,
              split fees with your squad and pay securely in seconds. No more spreadsheets, calls or cash.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <a
                href="#games"
                className="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Find games near me
              </a>
              <a href="#payments" className="text-sm/6 font-semibold text-white">
                Learn about payments <span aria-hidden="true">→</span>
              </a>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Live location-based suggestions • Secure online payments • Instant booking confirmations
            </p>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%+3rem)] aspect-1155/678 w-144.5 -translate-x-1/2 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-288.75"
          />
        </div>
      </div>
    </div>
  )
}

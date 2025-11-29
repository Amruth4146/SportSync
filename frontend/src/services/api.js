const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


const getToken = () => {
  return localStorage.getItem('token');
};


const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    throw error;
  }
};


export const authAPI = {
  register: async (name, email, password) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  login: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
};


export const gamesAPI = {
  

  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.gameType) queryParams.append('gameType', filters.gameType);
    if (filters.location) queryParams.append('location', filters.location);
    if (filters.date) queryParams.append('date', filters.date);

    const queryString = queryParams.toString();
    return apiRequest(`/games${queryString ? `?${queryString}` : ''}`);
  },

  

  getMine: async () => {
    return apiRequest('/games/mine');
  },

  

  create: async (gameData) => {
    return apiRequest('/games', {
      method: 'POST',
      body: JSON.stringify(gameData),
    });
  },

  

  join: async (gameId) => {
    return apiRequest(`/games/${gameId}/join`, {
      method: 'POST',
    });
  },

  

  leave: async (gameId) => {
    return apiRequest(`/games/${gameId}/leave`, {
      method: 'POST',
    });
  },

  

  autoJoin: async (preferences = {}) => {
    return apiRequest('/games/auto-join', {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
  },

  

  getPlayers: async (gameId) => {
    return apiRequest(`/games/${gameId}/players`);
  },

  

  addPlayer: async (gameId, userId) => {
    return apiRequest(`/games/${gameId}/add-player`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  

  kickPlayer: async (gameId, playerId) => {
    return apiRequest(`/games/${gameId}/kick/${playerId}`, {
      method: 'POST',
    });
  },

  

  getNearby: async (lat, lng, maxDistance = 5000, sport = null) => {
    const queryParams = new URLSearchParams();
    queryParams.append('lat', lat);
    queryParams.append('lng', lng);
    if (maxDistance) queryParams.append('maxDistance', maxDistance);
    if (sport) queryParams.append('sport', sport);

    return apiRequest(`/games/nearby?${queryParams.toString()}`);
  },
};


export const walletAPI = {
  getWallet: async () => {
    return apiRequest('/wallet/me');
  },

  createTopUpOrder: async (amount) => {
    return apiRequest('/wallet/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  verifyTopUpPayment: async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
    return apiRequest('/wallet/verify-and-credit', {
      method: 'POST',
      body: JSON.stringify({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      }),
    });
  },

  payForGame: async ({ gameId, totalPrice }) => {
    const payload = { gameId };
    if (typeof totalPrice === 'number') {
      payload.totalPrice = totalPrice;
    }
    return apiRequest('/wallet/pay-game', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getPaymentStatus: async (gameId) => {
    return apiRequest(`/wallet/game/${gameId}/status`);
  },
};


export const turfsAPI = {
  

  getNearby: async (lat, lng, maxDistance = 5000) => {
    const queryParams = new URLSearchParams();
    queryParams.append('lat', lat);
    queryParams.append('lng', lng);
    if (maxDistance) queryParams.append('maxDistance', maxDistance);

    return apiRequest(`/turfs/nearby?${queryParams.toString()}`);
  },

  

  getAll: async () => {
    return apiRequest('/turfs');
  },
};


export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error('Unable to get your location: ' + error.message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};


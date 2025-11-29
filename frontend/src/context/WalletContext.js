import React, { createContext, useContext, useEffect, useState } from 'react';
import { walletAPI } from '../services/api';
import { useAuth } from './AuthContext';

const WalletContext = createContext(null);

const loadRazorpayScript = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Razorpay can only be initialized in the browser'));
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(script);
  });
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return ctx;
};

export const WalletProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetState = () => {
    setBalance(0);
    setTransactions([]);
    setPayments([]);
    setError('');
  };

  const refreshWallet = async () => {
    if (!isAuthenticated) {
      resetState();
      return;
    }

    setLoading(true);
    try {
      const data = await walletAPI.getWallet();
      setBalance(data.balance || 0);
      setTransactions(data.transactions || []);
      setPayments(data.payments || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshWallet();
    } else {
      resetState();
    }
  }, [isAuthenticated]);

  const topUp = async (amount) => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    if (typeof window === 'undefined') {
      throw new Error('Wallet top-up is only available in the browser');
    }

    await loadRazorpayScript();

    const orderResponse = await walletAPI.createTopUpOrder(numericAmount);
    if (!orderResponse?.orderId) {
      throw new Error(orderResponse?.message || 'Failed to create payment order');
    }

    return new Promise((resolve, reject) => {
      const options = {
        key: orderResponse.keyId,
        amount: Math.round(numericAmount * 100),
        currency: orderResponse.currency || 'INR',
        name: 'PlayLocal Sports',
        description: 'Wallet top-up',
        order_id: orderResponse.orderId,
        handler: async (response) => {
          try {
            await walletAPI.verifyTopUpPayment(response);
            await refreshWallet();
            resolve(response);
          } catch (err) {
            const message = err?.message || 'Failed to verify payment';
            setError(message);
            reject(new Error(message));
          }
        },
        modal: {
          ondismiss: () => {
            const message = 'Payment cancelled';
            setError(message);
            reject(new Error(message));
          },
        },
        theme: {
          color: '#4f46e5',
        },
      };

      try {
        const razorpayCheckout = new window.Razorpay(options);
        razorpayCheckout.open();
      } catch (err) {
        const message = err?.message || 'Failed to open Razorpay checkout';
        setError(message);
        reject(new Error(message));
      }
    });
  };

  const payForGame = async ({ gameId, totalPrice }) => {
    if (!gameId) throw new Error('Missing gameId');
    const response = await walletAPI.payForGame({ gameId, totalPrice });
    await refreshWallet();
    return response;
  };

  const value = {
    balance,
    transactions,
    payments,
    loading,
    error,
    refreshWallet,
    topUp,
    payForGame,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};


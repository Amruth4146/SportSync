import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '₹0.00';
  return `₹${Number(value).toFixed(2)}`;
};

const getPaymentLabel = (payment) => {
  if (payment.gameName) return payment.gameName;
  if (payment.description) return payment.description;
  if (payment.game) return `Game ${String(payment.game).slice(-6)}`;
  return 'Game payment';
};

export default function WalletPanel({ onClose }) {
  const { balance, transactions, payments, topUp, loading } = useWallet();
  const [amount, setAmount] = useState('');
  const [topupError, setTopupError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleTopUp = async (e) => {
    e.preventDefault();
    setTopupError('');

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setTopupError('Please enter a positive amount');
      return;
    }

    try {
      setSubmitting(true);
      await topUp(numericAmount);
      setAmount('');
    } catch (err) {
      setTopupError(err.message || 'Failed to top-up wallet');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-gray-400 text-sm">Wallet Balance</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(balance)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Close wallet panel"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleTopUp} className="bg-gray-800 rounded-xl p-4 mb-6">
          <p className="text-white font-semibold mb-3">Add funds</p>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="flex-1 px-4 py-2 rounded-md bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 rounded-md bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-700 text-white font-semibold transition"
            >
              {submitting ? 'Adding...' : 'Top up'}
            </button>
          </div>
          {topupError && <p className="text-red-400 text-sm mt-2">{topupError}</p>}
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-white font-semibold mb-3">Recent transactions</p>
            {loading ? (
              <p className="text-gray-400 text-sm">Loading...</p>
            ) : transactions.length === 0 ? (
              <p className="text-gray-500 text-sm">No transactions yet.</p>
            ) : (
              <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {transactions.map((tx, index) => (
                  <li key={index} className="flex justify-between text-sm bg-gray-900 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-white capitalize">{tx.type}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.createdAt || Date.now()).toLocaleString()}
                      </p>
                      {tx.description && <p className="text-xs text-gray-400 mt-1">{tx.description}</p>}
                    </div>
                    <p className="text-indigo-400 font-semibold">{formatCurrency(tx.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-white font-semibold mb-3">Game payments</p>
            {payments.length === 0 ? (
              <p className="text-gray-500 text-sm">No payments recorded yet.</p>
            ) : (
              <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {payments.map((payment, index) => (
                  <li key={index} className="bg-gray-900 rounded-lg px-3 py-2 text-sm">
                    <div className="flex justify-between items-center">
                      <p className="text-white font-medium">{getPaymentLabel(payment)}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          payment.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                    <p className="text-indigo-400 font-semibold mt-1">{formatCurrency(payment.amount)}</p>
                    {payment.paidAt && (
                      <p className="text-xs text-gray-500">
                        Paid on {new Date(payment.paidAt).toLocaleDateString()}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


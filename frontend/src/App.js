import './App.css';
import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import NavBar from './components/NavBar.tsx';
import Hero from './components/Hero.tsx';
import GamesList from './components/GamesList';

function App() {
  const [currentSection, setCurrentSection] = useState('home');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'home';
      setCurrentSection(hash);
    };

    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <AuthProvider>
      <WalletProvider>
        <div className="min-h-screen bg-gray-900">
          <NavBar />
          {currentSection === 'home' && <Hero />}
          {currentSection === 'games' && <GamesList />}
        </div>
      </WalletProvider>
    </AuthProvider>
  );
}

export default App;
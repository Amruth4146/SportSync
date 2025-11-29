'use client'

import React, { useState } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import Login from './Login'
import Register from './Register'
import WalletPanel from './WalletPanel.tsx'

const navigation = [
  { name: 'Home', href: '#home' },
  { name: 'Games', href: '#games' },
]

export default function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [showWallet, setShowWallet] = useState(false)
  const { isAuthenticated, user, logout } = useAuth()
  const { balance } = useWallet()

  return (
    <div className="bg-gray-900">
      <header className="absolute inset-x-0 top-0 z-50 pointer-events-none">
        <nav aria-label="Global" className="flex items-center justify-between p-6 lg:px-8 pointer-events-auto">
          <div className="flex lg:flex-1">
            <a href="#home" className="-m-1.5 p-1.5 text-2xl font-bold text-white">
              <span className="sr-only">PlayLocal Sports</span>
              SportSync
            </a>
          </div>
          <div className="flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-200"
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            {navigation.map((item) => (
              <a key={item.name} href={item.href} className="text-sm/6 font-semibold text-white">
                {item.name}
              </a>
            ))}
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm/6 bg-indigo-500 rounded-md p-2 text-gray-300">Hello, {user?.name}</span>
                <button
                  onClick={() => setShowWallet(true)}
                  className="text-sm/6 font-semibold text-white border border-indigo-500/60 rounded-md px-3 py-1 hover:bg-indigo-500/20 transition"
                >
                  Wallet ₹{Number(balance || 0).toFixed(0)}
                </button>
                <button
                  onClick={logout}
                  className="text-sm/6 font-semibold text-white hover:text-indigo-400"
                >
                  Log out
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="text-sm/6 font-semibold text-white hover:text-indigo-400"
              >
                Log in / Sign Up<span aria-hidden="true">&rarr;</span>
              </button>
            )}
          </div>
        </nav>
        <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
          <div className="fixed inset-0 z-50" />
          <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-gray-900 p-6 sm:max-w-sm sm:ring-1 sm:ring-gray-100/10">
            <div className="flex items-center justify-between">
              <a href="#" className="-m-1.5 p-1.5">
                <span className="sr-only">PlayLocal Sports</span>
                <img
                  alt="PlayLocal Sports logo"
                  src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
                  className="h-8 w-auto"
                />
              </a>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="-m-2.5 rounded-md p-2.5 text-gray-200"
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon aria-hidden="true" className="size-6" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-white/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-white/5"
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
                <div className="py-6">
                  {isAuthenticated ? (
                    <>
                      <div className="-mx-3 block rounded-lg px-3 py-2.5 text-base/7 text-gray-300">
                        Hello, {user?.name}
                      </div>
                      <button
                        onClick={() => {
                          setShowWallet(true)
                          setMobileMenuOpen(false)
                        }}
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base/7 font-semibold text-white hover:bg-white/5 w-full text-left"
                      >
                        Wallet ₹{Number(balance || 0).toFixed(0)}
                      </button>
                      <button
                        onClick={() => {
                          logout()
                          setMobileMenuOpen(false)
                        }}
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base/7 font-semibold text-white hover:bg-white/5 w-full text-left"
                      >
                        Log out
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setShowLogin(true)
                        setMobileMenuOpen(false)
                      }}
                      className="-mx-3 block rounded-lg px-3 py-2.5 text-base/7 font-semibold text-white hover:bg-white/5 w-full text-left"
                    >
                      Log in
                    </button>
                  )}
                </div>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </header>

      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          switchToRegister={() => {
            setShowLogin(false)
            setShowRegister(true)
          }}
        />
      )}

      {showRegister && (
        <Register
          onClose={() => setShowRegister(false)}
          switchToLogin={() => {
            setShowRegister(false)
            setShowLogin(true)
          }}
        />
      )}

      {isAuthenticated && showWallet && <WalletPanel onClose={() => setShowWallet(false)} />}
    </div>
  )
}
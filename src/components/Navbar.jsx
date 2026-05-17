import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Search, MessageSquare, Package, User, LogOut,
  ChevronDown, Menu, X, Bell,
} from 'lucide-react'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [query,       setQuery]       = useState(searchParams.get('q') ?? '')
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [dropOpen,    setDropOpen]    = useState(false)
  const dropRef = useRef(null)

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(`/?q=${encodeURIComponent(query.trim())}`)
    setMenuOpen(false)
  }

  const initials = profile?.Username
    ? profile.Username.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-surface-border bg-white/80 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* ── Logo ── */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-brand-navy flex items-center justify-center group-hover:bg-brand-crimson transition-colors">
            <span className="text-white text-xs font-black">CS</span>
          </div>
          <span className="font-black text-lg text-brand-navy hidden sm:block">
            Campus<span className="text-brand-crimson">Swap</span>
          </span>
        </Link>

        {/* ── Search bar (desktop) ── */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="navbar-search"
              type="search"
              placeholder="Search products…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="input pl-10 pr-4 h-10 rounded-full bg-surface border-surface-border focus:bg-white"
            />
          </div>
        </form>

        {/* ── Right actions (desktop) ── */}
        {user ? (
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/messages" id="nav-messages"
              className="btn-ghost btn-sm flex gap-1.5 items-center">
              <MessageSquare className="w-4 h-4" />
              <span>Messages</span>
            </Link>
            <Link to="/my-products" id="nav-my-products"
              className="btn-ghost btn-sm flex gap-1.5 items-center">
              <Package className="w-4 h-4" />
              <span>My Products</span>
            </Link>

            {/* Avatar dropdown */}
            <div className="relative ml-1" ref={dropRef}>
              <button
                id="nav-profile-btn"
                onClick={() => setDropOpen(v => !v)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-brand-light transition-colors"
              >
                <span className="avatar w-7 h-7 text-xs">{initials}</span>
                <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">
                  {profile?.Username ?? 'Profile'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropOpen && (
                <div className="absolute right-0 mt-2 w-52 card shadow-card-hover animate-slide-up py-1 z-50">
                  <div className="px-4 py-2 border-b border-surface-border">
                    <p className="text-sm font-semibold text-gray-900 truncate">{profile?.Username}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <Link to="/profile" onClick={() => setDropOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-brand-light transition-colors">
                    <User className="w-4 h-4" /> Profile Settings
                  </Link>
                  <button onClick={() => { signOut(); setDropOpen(false) }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </nav>
        ) : (
          <div className="hidden md:flex items-center gap-2">
            <Link to="/login" className="btn-outline btn-sm">Sign In</Link>
            <Link to="/register" className="btn-primary btn-sm">Join Free</Link>
          </div>
        )}

        {/* ── Mobile hamburger ── */}
        <button
          id="navbar-mobile-menu"
          className="md:hidden btn-ghost p-2 rounded-lg"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ── Mobile menu ── */}
      {menuOpen && (
        <div className="md:hidden border-t border-surface-border bg-white animate-slide-up">
          <div className="p-4 space-y-3">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="search" placeholder="Search products…"
                  value={query} onChange={e => setQuery(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </form>
            {user ? (
              <>
                <Link to="/messages"    onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-sm font-medium text-gray-700 py-2"><MessageSquare className="w-4 h-4" /> Messages</Link>
                <Link to="/my-products" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-sm font-medium text-gray-700 py-2"><Package className="w-4 h-4" /> My Products</Link>
                <Link to="/profile"     onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-sm font-medium text-gray-700 py-2"><User className="w-4 h-4" /> Profile</Link>
                <button onClick={() => { signOut(); setMenuOpen(false) }} className="flex items-center gap-2 text-sm font-medium text-red-600 py-2"><LogOut className="w-4 h-4" /> Sign Out</button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link to="/login"    onClick={() => setMenuOpen(false)} className="btn-outline flex-1 text-center">Sign In</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary flex-1 text-center">Join Free</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

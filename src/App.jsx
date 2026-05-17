import React from 'react'
import {
  BrowserRouter, Routes, Route, Navigate, Outlet,
} from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import MainLayout    from './layouts/MainLayout'
import Home          from './pages/Home'
import Login         from './pages/Login'
import Register      from './pages/Register'
import ProductDetail from './pages/ProductDetail'
import Messages      from './pages/Messages'
import Profile       from './pages/Profile'
import MyProducts    from './pages/MyProducts'
import { Loader2 }  from 'lucide-react'

/* ── Route guard: redirect to /login if not authenticated ── */
function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-navy" />
      </div>
    )
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}

/* ── Route guard: redirect to / if already logged in ── */
function GuestRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-navy" />
      </div>
    )
  }

  return user ? <Navigate to="/" replace /> : <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      {/* ── Public layout routes ── */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/product/:productId" element={<ProductDetail />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/messages"    element={<Messages />} />
          <Route path="/profile"     element={<Profile />} />
          <Route path="/my-products" element={<MyProducts />} />
        </Route>
      </Route>

      {/* ── Auth routes (no navbar) ── */}
      <Route element={<GuestRoute />}>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

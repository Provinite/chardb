import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { CharacterPage } from './pages/CharacterPage';
import { CharactersPage } from './pages/CharactersPage';
import { CreateCharacterPage } from './pages/CreateCharacterPage';
import { GalleryPage } from './pages/GalleryPage';
import { NotFoundPage } from './pages/NotFoundPage';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/character/:id" element={<CharacterPage />} />
        <Route path="/user/:username" element={<ProfilePage />} />
        <Route path="/gallery/:id" element={<GalleryPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/character/create"
          element={
            <ProtectedRoute>
              <CreateCharacterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
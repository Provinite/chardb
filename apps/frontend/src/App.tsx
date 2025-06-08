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
import { EditCharacterPage } from './pages/EditCharacterPage';
import { GalleryPage } from './pages/GalleryPage';
import { GalleriesPage } from './pages/GalleriesPage';
import { CreateGalleryPage } from './pages/CreateGalleryPage';
import { UploadImagePage } from './pages/UploadImagePage';
import { ImagesPage } from './pages/ImagesPage';
import { ImagePage } from './pages/ImagePage';
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
        <Route path="/galleries" element={<GalleriesPage />} />
        <Route path="/gallery/:id" element={<GalleryPage />} />
        <Route path="/images" element={<ImagesPage />} />
        <Route path="/image/:id" element={<ImagePage />} />
        <Route path="/user/:username" element={<ProfilePage />} />

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
          path="/character/:id/edit"
          element={
            <ProtectedRoute>
              <EditCharacterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gallery/create"
          element={
            <ProtectedRoute>
              <CreateGalleryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadImagePage />
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
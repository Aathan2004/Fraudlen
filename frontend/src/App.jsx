import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import UploadPage from './pages/UploadPage';
import OverviewPage from './pages/OverviewPage';
import ProvidersPage from './pages/ProvidersPage';
import ProviderDetailPage from './pages/ProviderDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ──────────────────────────────────────── */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* ── Protected (all need auth) ────────────────────── */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/providers/:providerId" element={<ProviderDetailPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

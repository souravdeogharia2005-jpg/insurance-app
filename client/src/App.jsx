import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProposalPage from './pages/ProposalPage';
import DashboardPage from './pages/DashboardPage';
import ScanPage from './pages/ScanPage';
import AdminPage from './pages/AdminPage';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PageTransition({ children }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98, filter: 'blur(2px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.98, filter: 'blur(2px)' }} transition={{ duration: 0.3, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}

function AppLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isHomePage = location.pathname === '/';

  const useMainLayout = !isLoginPage && !isHomePage;

  return (
    <>
      {!isLoginPage && <Navbar />}
      <main className={useMainLayout ? 'main-content' : (isHomePage ? 'pt-[72px] min-h-screen' : '')}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
            <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
            <Route path="/dashboard" element={<ProtectedRoute><PageTransition><DashboardPage /></PageTransition></ProtectedRoute>} />
            <Route path="/proposal" element={<ProtectedRoute><PageTransition><ProposalPage /></PageTransition></ProtectedRoute>} />
            <Route path="/scan" element={<ProtectedRoute><PageTransition><ScanPage /></PageTransition></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><PageTransition><AdminPage /></PageTransition></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppLayout />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

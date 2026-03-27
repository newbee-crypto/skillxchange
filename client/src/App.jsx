import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import useAuthStore from './store/authStore';
import Navbar from './components/Navbar';
import { AUTH_UNAUTHORIZED_EVENT } from './services/api';
import { connectSocket } from './services/socket';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Chat from './pages/Chat';
import VideoCall from './pages/VideoCall';
import Bookings from './pages/Bookings';
import Payment from './pages/Payment';

const ProtectedRoute = ({ children }) => {
  const { user, hydrating } = useAuthStore();

  if (hydrating) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
        <div className="glass rounded-2xl px-6 py-5 flex items-center gap-3 text-dark-50">
          <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <span className="text-sm sm:text-base">Checking your session...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const SessionWatcher = () => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      if (location.pathname !== '/login') {
        toast.error('Session expired. Please sign in again.');
        navigate('/login', { replace: true });
      }
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [location.pathname, logout, navigate]);

  return null;
};

const CallWatcher = () => {
  const { token, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!token || !user) return undefined;

    const socket = connectSocket(token);
    const handleOffer = (payload) => {
      sessionStorage.setItem('incomingCall', JSON.stringify(payload));
      toast(`Incoming call from ${payload.callerName}`, { icon: '📞' });

      if (payload.roomId && location.pathname !== `/video/${payload.roomId}`) {
        navigate(`/video/${payload.roomId}`);
      }
    };

    socket.on('webrtc:offer', handleOffer);

    return () => {
      socket.off('webrtc:offer', handleOffer);
    };
  }, [location.pathname, navigate, token, user]);

  return null;
};

const AppRoutes = () => {
  const fetchMe = useAuthStore((state) => state.fetchMe);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <>
      <SessionWatcher />
      <CallWatcher />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-dark-900">
              <Navbar />
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/:id" element={<Profile />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/chat/:userId" element={<Chat />} />
                  <Route path="/video" element={<VideoCall />} />
                  <Route path="/video/:bookingId" element={<VideoCall />} />
                  <Route path="/bookings" element={<Bookings />} />
                  <Route path="/payment/:bookingId" element={<Payment />} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
};

const App = () => (
  <BrowserRouter>
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#25262b',
          color: '#c1c2c5',
          border: '1px solid rgba(255,255,255,0.06)',
        },
      }}
    />
    <AppRoutes />
  </BrowserRouter>
);

export default App;

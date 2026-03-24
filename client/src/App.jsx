import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import Navbar from './components/Navbar';
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
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
  return (
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
    </BrowserRouter>
  );
};

export default App;

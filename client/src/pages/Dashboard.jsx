import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, MessageCircle, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { connectSocket } from '../services/socket';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="glass rounded-xl p-5 glass-hover transition-all duration-200 cursor-default">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-dark-100">{label}</p>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user, token } = useAuthStore();
  const [stats, setStats] = useState({ users: 0, bookings: 0, messages: 0 });
  const [suggestions, setSuggestions] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);

  const syncRecentUserPresence = useCallback((onlineIds) => {
    setRecentUsers((prev) => prev.map((recentUser) => ({
      ...recentUser,
      isOnline: onlineIds.includes(recentUser._id),
    })));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, bookingsRes, aiRes] = await Promise.allSettled([
          api.get('/users?limit=6'),
          api.get('/bookings'),
          api.get('/ai/suggest-skills'),
        ]);

        if (usersRes.status === 'fulfilled') {
          setRecentUsers(usersRes.value.data.users || []);
          setStats(s => ({ ...s, users: usersRes.value.data.pagination?.total || 0 }));
        }
        if (bookingsRes.status === 'fulfilled') {
          setStats(s => ({ ...s, bookings: bookingsRes.value.data.bookings?.length || 0 }));
        }
        if (aiRes.status === 'fulfilled') {
          setSuggestions(aiRes.value.data.suggestions || []);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!token) return undefined;

    const socket = connectSocket(token);
    const handleUsersOnline = (onlineIds) => {
      syncRecentUserPresence(onlineIds);
    };
    const handleUserOnline = ({ userId }) => {
      setRecentUsers((prev) => prev.map((recentUser) => (
        recentUser._id === userId ? { ...recentUser, isOnline: true } : recentUser
      )));
    };
    const handleUserOffline = ({ userId }) => {
      setRecentUsers((prev) => prev.map((recentUser) => (
        recentUser._id === userId ? { ...recentUser, isOnline: false } : recentUser
      )));
    };

    socket.on('users:online', handleUsersOnline);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('users:online', handleUsersOnline);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [token, syncRecentUserPresence]);

  return (
    <div className="space-y-8 fade-in">
      {/* Hero */}
      <div className="glass rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, <span className="gradient-text">{user?.name}</span> 👋
          </h1>
          <p className="text-dark-100 text-lg max-w-xl">
            Discover new skills, connect with experts, and accelerate your learning journey.
          </p>
          <div className="flex gap-3 mt-6">
            <Link to="/search" className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium rounded-xl hover:from-primary-500 hover:to-primary-400 transition-all flex items-center gap-2 shadow-lg shadow-primary-500/20">
              Explore Skills <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/profile" className="px-5 py-2.5 bg-dark-500 text-dark-50 font-medium rounded-xl hover:bg-dark-400 transition-colors">
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Active Users" value={stats.users} color="bg-gradient-to-br from-blue-500 to-blue-600" />
        <StatCard icon={Calendar} label="Your Bookings" value={stats.bookings} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatCard icon={TrendingUp} label="Your Skills" value={user?.skills?.length || 0} color="bg-gradient-to-br from-purple-500 to-purple-600" />
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">AI Skill Suggestions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.map((s, i) => (
              <div key={i} className="bg-dark-600 rounded-xl p-4 border border-dark-400 hover:border-primary-500/30 transition-colors">
                <p className="text-white font-medium">{s.name}</p>
                <p className="text-sm text-dark-100 mt-1">{s.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Users */}
      {recentUsers.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Discover People</h2>
            <Link to="/search" className="text-primary-400 text-sm hover:text-primary-300 transition-colors flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentUsers.map((u) => (
              <Link key={u._id} to={`/profile/${u._id}`} className="bg-dark-600 rounded-xl p-4 border border-dark-400 hover:border-primary-500/30 transition-all hover:translate-y-[-2px]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{u.name}</p>
                    <p className="text-xs text-dark-100">{u.location || 'Remote'}</p>
                  </div>
                  {u.isOnline && <div className="w-2 h-2 bg-emerald-400 rounded-full ml-auto pulse-dot" />}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {u.skills?.slice(0, 3).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 bg-primary-600/20 text-primary-300 text-xs rounded-full">{s.name}</span>
                  ))}
                  {u.skills?.length > 3 && (
                    <span className="px-2 py-0.5 bg-dark-500 text-dark-100 text-xs rounded-full">+{u.skills.length - 3}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

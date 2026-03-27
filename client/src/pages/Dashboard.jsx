import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, TrendingUp, Sparkles, ArrowRight, Search, Wallet, Video, CheckCircle2 } from 'lucide-react';
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

const StatCardSkeleton = () => (
  <div className="glass rounded-xl p-5 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-dark-500" />
      <div className="flex-1">
        <div className="h-6 w-16 bg-dark-500 rounded mb-2" />
        <div className="h-4 w-24 bg-dark-600 rounded" />
      </div>
    </div>
  </div>
);

const flowSteps = [
  {
    icon: Search,
    title: 'Explore Experts',
    text: 'Browse profiles and see what people can teach.',
    to: '/search',
    cta: 'Start exploring',
  },
  {
    icon: Calendar,
    title: 'Book A Session',
    text: 'Pick a skill, time, duration, and send a request.',
    to: '/bookings',
    cta: 'Open bookings',
  },
  {
    icon: Wallet,
    title: 'Pay After Approval',
    text: 'Payment unlocks only when the provider accepts.',
    to: '/bookings',
    cta: 'See requests',
  },
  {
    icon: Video,
    title: 'Join The Call',
    text: 'Attend the private live session after acceptance and payment.',
    to: '/bookings',
    cta: 'Join sessions',
  },
];

const Dashboard = () => {
  const { user, token } = useAuthStore();
  const [stats, setStats] = useState({ users: 0, bookings: 0, messages: 0 });
  const [suggestions, setSuggestions] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const syncRecentUserPresence = useCallback((onlineIds) => {
    setRecentUsers((prev) => prev.map((recentUser) => ({
      ...recentUser,
      isOnline: onlineIds.includes(recentUser._id),
    })));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, bookingsRes, aiRes] = await Promise.allSettled([
          api.get('/users?limit=6'),
          api.get('/bookings'),
          api.get('/ai/suggest-skills'),
        ]);

        if (usersRes.status === 'fulfilled') {
          setRecentUsers(usersRes.value.data.users || []);
          setStats((s) => ({ ...s, users: usersRes.value.data.pagination?.total || 0 }));
        }
        if (bookingsRes.status === 'fulfilled') {
          setStats((s) => ({ ...s, bookings: bookingsRes.value.data.bookings?.length || 0 }));
        }
        if (aiRes.status === 'fulfilled') {
          setSuggestions(aiRes.value.data.suggestions || []);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
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
      <div className="relative overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(77,124,255,0.28),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(135deg,_rgba(12,14,19,0.96),_rgba(25,29,38,0.96))] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:22px_22px] opacity-20" />
        <div className="relative grid gap-8 lg:grid-cols-[1.55fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-400/20 bg-primary-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Skill Learning Marketplace
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.8rem]">
              Book live skill sessions, pay after approval, and learn directly from people.
            </h1>
            {loading ? (
              <>
                <div className="h-5 w-full max-w-xl bg-dark-600 rounded mt-4" />
                <div className="h-5 w-3/4 max-w-lg bg-dark-600 rounded mt-2" />
              </>
            ) : (
              <p className="mt-4 max-w-2xl text-base text-dark-100 sm:text-lg">
                SkillExchange helps users discover experts, request a session, pay after acceptance, and join a private peer-to-peer video call when the booking is ready.
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/search" className="px-5 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium rounded-xl hover:from-primary-500 hover:to-primary-400 transition-all flex items-center gap-2 shadow-lg shadow-primary-500/20">
                Explore Skills <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/bookings" className="px-5 py-3 bg-white/6 text-dark-50 font-medium rounded-xl hover:bg-white/10 transition-colors">
                Understand The Flow
              </Link>
              <Link to="/profile" className="px-5 py-3 bg-dark-500/80 text-dark-50 font-medium rounded-xl hover:bg-dark-400 transition-colors">
                Update Profile
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-dark-200">How It Works</p>
              <div className="mt-4 space-y-3">
                {['Explore people', 'Send booking request', 'Get accepted', 'Pay securely', 'Join live session'].map((step, index) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500/15 text-sm font-semibold text-primary-200">
                      {index + 1}
                    </div>
                    <p className="text-sm text-dark-50">{step}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-400/12 bg-emerald-500/8 p-4">
              <p className="text-sm font-semibold text-white">Best first move</p>
              <p className="mt-1 text-sm text-dark-100">
                Add strong skills to your profile, then explore users who match what you want to learn.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard icon={Users} label="Active Users" value={stats.users} color="bg-gradient-to-br from-blue-500 to-blue-600" />
            <StatCard icon={Calendar} label="Your Bookings" value={stats.bookings} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
            <StatCard icon={TrendingUp} label="Your Skills" value={user?.skills?.length || 0} color="bg-gradient-to-br from-purple-500 to-purple-600" />
          </>
        )}
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-white">Quick Start Guide</h2>
            <p className="text-sm text-dark-100 mt-1">Enough guidance to help new users navigate on their own.</p>
          </div>
          <Link to="/search" className="text-primary-400 text-sm hover:text-primary-300 transition-colors flex items-center gap-1">
            Start now <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {flowSteps.map(({ icon: Icon, title, text, to, cta }) => (
            <Link key={title} to={to} className="group rounded-2xl border border-white/6 bg-dark-600/70 p-5 transition-all hover:border-primary-500/25 hover:-translate-y-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/25 to-emerald-500/15 text-primary-200">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-white font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-dark-100 leading-6">{text}</p>
              <div className="mt-4 text-sm font-medium text-primary-300 flex items-center gap-1">
                {cta} <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>

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

      {recentUsers.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">People You Can Learn From</h2>
              <p className="text-sm text-dark-100 mt-1">Start with a profile, then chat or book a session.</p>
            </div>
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

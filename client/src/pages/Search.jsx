import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Filter, MapPin, Star, MessageCircle, LoaderCircle, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { connectSocket } from '../services/socket';

const Search = () => {
  const { token } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [skill, setSkill] = useState(searchParams.get('skill') || '');
  const [level, setLevel] = useState(searchParams.get('level') || '');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [pagination, setPagination] = useState({ page: Number(searchParams.get('page') || 1), pages: 1, total: 0 });
  const [showFilters, setShowFilters] = useState(Boolean(searchParams.get('skill') || searchParams.get('level')));
  const [backendError, setBackendError] = useState('');

  const levelColors = {
    beginner: 'bg-green-500/20 text-green-300',
    intermediate: 'bg-blue-500/20 text-blue-300',
    advanced: 'bg-purple-500/20 text-purple-300',
    expert: 'bg-amber-500/20 text-amber-300',
  };

  const buildParams = useCallback((page = 1) => {
    const params = new URLSearchParams();
    const trimmedQuery = query.trim();
    const trimmedSkill = skill.trim();

    if (trimmedQuery) params.set('q', trimmedQuery);
    if (trimmedSkill) params.set('skill', trimmedSkill);
    if (level) params.set('level', level);
    if (page > 1) params.set('page', String(page));

    return params;
  }, [level, query, skill]);

  const updateUserPresence = useCallback((userId, isOnline) => {
    setUsers((prev) => prev.map((user) => (
      user._id === userId ? { ...user, isOnline } : user
    )));
  }, []);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);

    try {
      const params = buildParams(page);
      const requestParams = new URLSearchParams(params);
      requestParams.set('limit', '12');

      const endpoint = params.get('q') || params.get('skill') || params.get('level')
        ? '/users/search'
        : '/users';

      const { data } = await api.get(`${endpoint}?${requestParams.toString()}`);
      setUsers(data.users || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
      setHasLoaded(true);
      setBackendError('');
    } catch (err) {
      console.error(err);
      setHasLoaded(true);
      setBackendError('Search results could not be refreshed because the backend is unavailable.');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    const page = Number(searchParams.get('page') || 1);
    const params = buildParams(page);
    const nextParams = new URLSearchParams(params);

    if (page > 1) {
      nextParams.set('page', String(page));
    }

    const currentString = searchParams.toString();
    const nextString = nextParams.toString();
    if (currentString !== nextString) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [buildParams, searchParams, setSearchParams]);

  useEffect(() => {
    const page = Number(searchParams.get('page') || 1);
    const timeoutId = window.setTimeout(() => {
      fetchUsers(page);
    }, hasLoaded ? 300 : 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchUsers, hasLoaded, searchParams]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = connectSocket(token);
    const handleUsersOnline = (onlineIds) => {
      setUsers((prev) => prev.map((user) => ({
        ...user,
        isOnline: onlineIds.includes(user._id),
      })));
    };
    const handleUserOnline = ({ userId }) => updateUserPresence(userId, true);
    const handleUserOffline = ({ userId }) => updateUserPresence(userId, false);

    socket.on('users:online', handleUsersOnline);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('users:online', handleUsersOnline);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [token, updateUserPresence]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const clearFilters = () => {
    setQuery('');
    setSkill('');
    setLevel('');
    setShowFilters(false);
    setSearchParams({}, { replace: true });
  };

  const handlePageChange = (page) => {
    const params = buildParams(page);
    if (page > 1) {
      params.set('page', String(page));
    }
    setSearchParams(params, { replace: false });
  };

  const hasActiveFilters = Boolean(query.trim() || skill.trim() || level);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Explore Skills</h1>
        <p className="text-dark-100">Find people to learn from, chat with, and book for a live skill session</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-4 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-primary-300">How To Use Explore</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-dark-600/80 p-3">
              <p className="text-sm font-semibold text-white">1. Search by skill</p>
              <p className="mt-1 text-xs leading-5 text-dark-100">Try skill names, categories, or a person you already know.</p>
            </div>
            <div className="rounded-xl bg-dark-600/80 p-3">
              <p className="text-sm font-semibold text-white">2. Check profile</p>
              <p className="mt-1 text-xs leading-5 text-dark-100">View their skill level, bio, and whether they are online now.</p>
            </div>
            <div className="rounded-xl bg-dark-600/80 p-3">
              <p className="text-sm font-semibold text-white">3. Chat or book</p>
              <p className="mt-1 text-xs leading-5 text-dark-100">Message first or directly create a session booking from the profile.</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4">
          <p className="text-sm font-semibold text-white">Booking flow</p>
          <p className="mt-1 text-sm text-dark-100">After the provider accepts, payment unlocks and the live session button becomes available.</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-200" />
            <input
              id="search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, skill, or keyword..."
              className="w-full pl-12 pr-10 py-3 bg-dark-600 border border-dark-400 rounded-xl text-white placeholder-dark-200 focus:outline-none focus:border-primary-500 transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-dark-200 hover:text-white hover:bg-dark-500 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className={`px-4 py-3 rounded-xl border transition-colors flex items-center gap-2 ${showFilters ? 'bg-primary-600/20 border-primary-500 text-primary-400' : 'bg-dark-600 border-dark-400 text-dark-100 hover:border-dark-300'}`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button id="search-submit" type="submit" className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors font-medium">
            Search
          </button>
        </div>

        {showFilters && (
          <div className="glass rounded-xl p-4 flex gap-4 flex-wrap items-end slide-in-right">
            <div>
              <label className="block text-xs text-dark-100 mb-1">Skill</label>
              <input
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                placeholder="e.g. React"
                className="px-3 py-2 bg-dark-700 border border-dark-400 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-100 mb-1">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="px-3 py-2 bg-dark-700 border border-dark-400 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
              >
                <option value="">All levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 rounded-lg bg-dark-500 text-dark-50 hover:bg-dark-400 transition-colors text-sm"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </form>

      <div className="flex items-center justify-between min-h-6">
        <p className="text-dark-100 text-sm">
          {pagination.total} users found
        </p>
        {loading && hasLoaded && (
          <div className="flex items-center gap-2 text-primary-400 text-sm">
            <LoaderCircle className="w-4 h-4 animate-spin" />
            Updating results...
          </div>
        )}
      </div>

      {backendError && (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {backendError}
        </div>
      )}

      {!hasLoaded && loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-dark-200 text-lg">No users found</p>
          <p className="text-dark-300 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${loading ? 'opacity-80' : 'opacity-100'}`}>
            {users.map((u) => (
              <div key={u._id} className="glass rounded-xl p-5 glass-hover transition-all duration-200 hover:translate-y-[-2px]">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/profile/${u._id}`} className="text-white font-semibold hover:text-primary-400 transition-colors truncate">
                        {u.name}
                      </Link>
                      {u.isOnline && <div className="w-2 h-2 bg-emerald-400 rounded-full pulse-dot flex-shrink-0" />}
                    </div>
                    {u.location && (
                      <p className="text-xs text-dark-200 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {u.location}
                      </p>
                    )}
                    {u.rating > 0 && (
                      <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 fill-current" /> {u.rating.toFixed(1)}
                      </p>
                    )}
                  </div>
                </div>

                {u.bio && <p className="text-dark-100 text-sm mb-3 line-clamp-2">{u.bio}</p>}

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {u.skills?.slice(0, 4).map((s, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-medium ${levelColors[s.level] || 'bg-dark-500 text-dark-100'}`}>
                      {s.name}
                    </span>
                  ))}
                  {u.skills?.length > 4 && (
                    <span className="px-2 py-0.5 bg-dark-500 text-dark-200 rounded-full text-xs">+{u.skills.length - 4}</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link to={`/chat/${u._id}`} className="flex-1 py-2 bg-primary-600/20 text-primary-400 rounded-lg text-sm font-medium text-center hover:bg-primary-600/30 transition-colors flex items-center justify-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" /> Chat
                  </Link>
                  <Link to={`/profile/${u._id}`} className="flex-1 py-2 bg-dark-500 text-dark-50 rounded-lg text-sm font-medium text-center hover:bg-dark-400 transition-colors">
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${page === pagination.page ? 'bg-primary-600 text-white' : 'bg-dark-600 text-dark-100 hover:bg-dark-500'}`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Search;

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, Filter, MapPin, Star, MessageCircle } from 'lucide-react';
import api from '../services/api';

const Search = () => {
  const [query, setQuery] = useState('');
  const [skill, setSkill] = useState('');
  const [level, setLevel] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showFilters, setShowFilters] = useState(false);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (skill) params.set('skill', skill);
      if (level) params.set('level', level);
      params.set('page', page);
      params.set('limit', 12);

      const endpoint = query || skill || level ? '/users/search' : '/users';
      const { data } = await api.get(`${endpoint}?${params}`);
      setUsers(data.users || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const levelColors = {
    beginner: 'bg-green-500/20 text-green-300',
    intermediate: 'bg-blue-500/20 text-blue-300',
    advanced: 'bg-purple-500/20 text-purple-300',
    expert: 'bg-amber-500/20 text-amber-300',
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Explore Skills</h1>
        <p className="text-dark-100">Find experts and learners across the community</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-200" />
          <input
            id="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, skill, or keyword..."
            className="w-full pl-12 pr-4 py-3 bg-dark-600 border border-dark-400 rounded-xl text-white placeholder-dark-200 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
        <button type="button" onClick={() => setShowFilters(!showFilters)} className={`px-4 py-3 rounded-xl border transition-colors flex items-center gap-2 ${showFilters ? 'bg-primary-600/20 border-primary-500 text-primary-400' : 'bg-dark-600 border-dark-400 text-dark-100 hover:border-dark-300'}`}>
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>
        <button id="search-submit" type="submit" className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors font-medium">
          Search
        </button>
      </form>

      {/* Filters */}
      {showFilters && (
        <div className="glass rounded-xl p-4 flex gap-4 flex-wrap slide-in-right">
          <div>
            <label className="block text-xs text-dark-100 mb-1">Skill</label>
            <input
              value={skill}
              onChange={e => setSkill(e.target.value)}
              placeholder="e.g. React"
              className="px-3 py-2 bg-dark-700 border border-dark-400 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-100 mb-1">Level</label>
            <select
              value={level}
              onChange={e => setLevel(e.target.value)}
              className="px-3 py-2 bg-dark-700 border border-dark-400 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">All levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
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
          <p className="text-dark-100 text-sm">{pagination.total} users found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => fetchUsers(p)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${p === pagination.page ? 'bg-primary-600 text-white' : 'bg-dark-600 text-dark-100 hover:bg-dark-500'}`}>
                  {p}
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

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, Check, X, Video, CreditCard, Plus, ChevronDown } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import useVisibilityRefresh from '../hooks/useVisibilityRefresh';
import { emitBookingChanged, subscribeToBookingChanges } from '../services/liveUpdates';
import toast from 'react-hot-toast';

const Bookings = () => {
  const { user: me } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(!!searchParams.get('provider'));
  const [allUsers, setAllUsers] = useState([]);
  const [form, setForm] = useState({
    providerId: searchParams.get('provider') || '',
    skill: '',
    dateTime: '',
    duration: 60,
    price: 0,
    notes: '',
  });

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?type=${filter}` : '';
      const { data } = await api.get(`/bookings${params}`);
      setBookings(data.bookings || []);
    } catch (err) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Load users for the dropdown
  useEffect(() => {
    api.get('/users?limit=100').then(res => {
      setAllUsers(res.data.users || []);
    });
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useVisibilityRefresh(fetchBookings);

  useEffect(() => {
    return subscribeToBookingChanges(() => {
      fetchBookings();
    });
  }, [fetchBookings]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.providerId) {
      toast.error('Please select a user');
      return;
    }
    try {
      const { data } = await api.post('/bookings', form);
      toast.success('Booking created!');
      setShowNewForm(false);
      setForm({ providerId: '', skill: '', dateTime: '', duration: 60, price: 0, notes: '' });
      emitBookingChanged(data.booking);
      setBookings((prev) => [data.booking, ...prev]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create booking');
    }
  };

  const handleStatus = async (id, status) => {
    try {
      const { data } = await api.patch(`/bookings/${id}/status`, { status });
      toast.success(`Booking ${status}`);
      setBookings((prev) => prev.map((booking) => (
        booking._id === id ? data.booking : booking
      )));
      emitBookingChanged(data.booking);
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const statusStyles = {
    pending: 'bg-amber-500/20 text-amber-300',
    accepted: 'bg-emerald-500/20 text-emerald-300',
    rejected: 'bg-red-500/20 text-red-300',
    completed: 'bg-blue-500/20 text-blue-300',
    cancelled: 'bg-dark-500 text-dark-200',
  };

  // Auto-fill skill options from selected provider
  const selectedProvider = allUsers.find(u => u._id === form.providerId);
  const providerSkills = selectedProvider?.skills || [];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bookings</h1>
          <p className="text-dark-100">Manage your skill exchange sessions</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors flex items-center gap-2 font-medium"
        >
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      {/* New Booking Form */}
      {showNewForm && (
        <form onSubmit={handleCreate} className="glass rounded-2xl p-6 space-y-4 slide-in-right">
          <h3 className="text-lg font-semibold text-white">Create Booking</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* User Dropdown */}
            <div>
              <label className="block text-sm text-dark-100 mb-1">Select User</label>
              <div className="relative">
                <select
                  value={form.providerId}
                  onChange={e => setForm({ ...form, providerId: e.target.value, skill: '' })}
                  required
                  className="w-full px-3 py-2.5 bg-dark-700 border border-dark-400 rounded-xl text-white focus:outline-none focus:border-primary-500 appearance-none cursor-pointer"
                >
                  <option value="">Choose a user...</option>
                  {allUsers.map(u => (
                    <option key={u._id} value={u._id}>{u.name} — {u.skills?.map(s => s.name).join(', ') || 'No skills'}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-200 pointer-events-none" />
              </div>
            </div>

            {/* Skill dropdown from provider */}
            <div>
              <label className="block text-sm text-dark-100 mb-1">Skill</label>
              {providerSkills.length > 0 ? (
                <div className="relative">
                  <select
                    value={form.skill}
                    onChange={e => setForm({ ...form, skill: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 bg-dark-700 border border-dark-400 rounded-xl text-white focus:outline-none focus:border-primary-500 appearance-none cursor-pointer"
                  >
                    <option value="">Choose a skill...</option>
                    {providerSkills.map((s, i) => (
                      <option key={i} value={s.name}>{s.name} ({s.level})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-200 pointer-events-none" />
                </div>
              ) : (
                <input
                  value={form.skill}
                  onChange={e => setForm({ ...form, skill: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 bg-dark-700 border border-dark-400 rounded-xl text-white focus:outline-none focus:border-primary-500"
                  placeholder={form.providerId ? 'Type a skill...' : 'Select a user first'}
                />
              )}
            </div>

            <div>
              <label className="block text-sm text-dark-100 mb-1">Date & Time</label>
              <input type="datetime-local" value={form.dateTime} onChange={e => setForm({ ...form, dateTime: e.target.value })} required className="w-full px-3 py-2.5 bg-dark-700 border border-dark-400 rounded-xl text-white focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm text-dark-100 mb-1">Duration (min)</label>
              <input type="number" min={15} max={480} value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} className="w-full px-3 py-2.5 bg-dark-700 border border-dark-400 rounded-xl text-white focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm text-dark-100 mb-1">Price ($)</label>
              <input type="number" min={0} value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="w-full px-3 py-2.5 bg-dark-700 border border-dark-400 rounded-xl text-white focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm text-dark-100 mb-1">Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2.5 bg-dark-700 border border-dark-400 rounded-xl text-white focus:outline-none focus:border-primary-500" placeholder="Optional notes" />
            </div>
          </div>
          <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors font-medium">Create Booking</button>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'sent', 'received'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${filter === f ? 'bg-primary-600 text-white' : 'bg-dark-600 text-dark-100 hover:bg-dark-500'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <Calendar className="w-12 h-12 text-dark-300 mx-auto mb-3" />
          <p className="text-dark-100 text-lg">No bookings yet</p>
          <p className="text-dark-300 text-sm">Search for users and book a session!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const isProvider = b.provider?._id === me._id;
            const otherUser = isProvider ? b.requester : b.provider;

            return (
              <div key={b._id} className="glass rounded-xl p-5 glass-hover transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {otherUser?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Link to={`/profile/${otherUser?._id}`} className="text-white font-semibold hover:text-primary-400 transition-colors">
                          {otherUser?.name}
                        </Link>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[b.status]}`}>{b.status}</span>
                        {isProvider && <span className="px-2 py-0.5 rounded-full text-xs bg-dark-500 text-dark-100">Provider</span>}
                      </div>
                      <p className="text-primary-400 text-sm font-medium">{b.skill}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-dark-100">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(b.dateTime).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {b.duration}min</span>
                        {b.price > 0 && <span className="text-emerald-400">${b.price}</span>}
                      </div>
                      {b.notes && <p className="text-dark-200 text-sm mt-2">{b.notes}</p>}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {b.status === 'pending' && isProvider && (
                      <>
                        <button onClick={() => handleStatus(b._id, 'accepted')} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors" title="Accept">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleStatus(b._id, 'rejected')} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors" title="Reject">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {b.status === 'accepted' && (
                      <>
                        <Link to={`/video/${b._id}`} className="p-2 rounded-lg bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 transition-colors" title="Join Video">
                          <Video className="w-4 h-4" />
                        </Link>
                        {b.price > 0 && b.paymentStatus !== 'paid' && (
                          <Link to={`/payment/${b._id}`} className="p-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors" title="Pay">
                            <CreditCard className="w-4 h-4" />
                          </Link>
                        )}
                      </>
                    )}
                    {['pending', 'accepted'].includes(b.status) && (
                      <button onClick={() => handleStatus(b._id, 'cancelled')} className="p-2 rounded-lg bg-dark-500 text-dark-200 hover:bg-dark-400 transition-colors" title="Cancel">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Bookings;

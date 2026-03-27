import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Star, Plus, X, MessageCircle, Video, Edit3, Save, Camera, Upload } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api, { resolveAssetUrl } from '../services/api';
import toast from 'react-hot-toast';

const Profile = () => {
  const { id } = useParams();
  const { user: me, updateUser } = useAuthStore();
  const isOwnProfile = !id || id === me?._id;

  const [user, setUser] = useState(isOwnProfile ? me : null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', location: '' });
  const [newSkill, setNewSkill] = useState({ name: '', category: 'General', level: 'intermediate' });
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOwnProfile && id) {
      api.get(`/users/${id}`).then(res => setUser(res.data.user)).catch(() => toast.error('User not found'));
    } else {
      setUser(me);
    }
  }, [id, me, isOwnProfile]);

  useEffect(() => {
    if (user) setForm({ name: user.name || '', bio: user.bio || '', location: user.location || '' });
  }, [user]);

  const handleSave = async () => {
    try {
      const { data } = await api.put('/users/profile', form);
      updateUser(data.user);
      setUser(data.user);
      setEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, GIF, and WEBP are allowed');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    try {
      const { data } = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updatedUser = { ...data.user, avatar: data.avatarUrl || data.user.avatar };
      updateUser(updatedUser);
      setUser(updatedUser);
      setAvatarVersion(Date.now());
      toast.success('Profile image updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    }
    setUploading(false);
  };

  const handleAddSkill = async () => {
    if (!newSkill.name.trim()) return;
    try {
      const { data } = await api.post('/users/skills', newSkill);
      updateUser(data.user);
      setUser(data.user);
      setNewSkill({ name: '', category: 'General', level: 'intermediate' });
      setShowSkillForm(false);
      toast.success('Skill added');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add skill');
    }
  };

  const handleRemoveSkill = async (skillId) => {
    try {
      const { data } = await api.delete(`/users/skills/${skillId}`);
      updateUser(data.user);
      setUser(data.user);
      toast.success('Skill removed');
    } catch (err) {
      toast.error('Failed to remove skill');
    }
  };

  if (!user) return <div className="text-center py-20 text-dark-100">Loading...</div>;

  const levelColors = {
    beginner: 'bg-green-500/20 text-green-300',
    intermediate: 'bg-blue-500/20 text-blue-300',
    advanced: 'bg-purple-500/20 text-purple-300',
    expert: 'bg-amber-500/20 text-amber-300',
  };

  const hasAvatar = user.avatar && user.avatar.length > 0;
  const avatarSrc = hasAvatar ? `${resolveAssetUrl(user.avatar)}?v=${avatarVersion}` : '';

  return (
    <div className="max-w-3xl mx-auto space-y-6 fade-in">
      {/* Header Card */}
      <div className="glass rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="relative flex items-start gap-6">
          {/* Avatar with upload */}
          <div className="relative flex-shrink-0 group">
            {hasAvatar ? (
              <img
                src={avatarSrc}
                alt={user.name}
                className="w-20 h-20 rounded-2xl object-cover shadow-lg shadow-primary-500/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-primary-500/20">
                {user.name?.[0]?.toUpperCase()}
              </div>
            )}
            {isOwnProfile && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-dark-700 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500" placeholder="Name" />
                <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full px-3 py-2 bg-dark-700 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500 resize-none" placeholder="Bio" />
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 bg-dark-700 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500" placeholder="Location" />
                <div className="flex gap-2">
                  <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors flex items-center gap-1"><Save className="w-4 h-4" /> Save</button>
                  <button onClick={() => setEditing(false)} className="px-4 py-2 bg-dark-500 text-dark-50 rounded-lg hover:bg-dark-400 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-white">{user.name}</h1>
                  {user.isOnline && <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full pulse-dot" />}
                </div>
                {user.location && (
                  <p className="text-dark-100 flex items-center gap-1 text-sm mb-2">
                    <MapPin className="w-3.5 h-3.5" /> {user.location}
                  </p>
                )}
                <p className="text-dark-50 mb-3">{user.bio || 'No bio yet'}</p>
                <div className="flex items-center gap-4">
                  {user.rating > 0 && (
                    <span className="flex items-center gap-1 text-amber-400 text-sm">
                      <Star className="w-4 h-4 fill-current" /> {user.rating.toFixed(1)} ({user.totalReviews})
                    </span>
                  )}
                  {isOwnProfile && (
                    <button onClick={() => setEditing(true)} className="text-primary-400 text-sm hover:text-primary-300 flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Upload hint for own profile */}
        {isOwnProfile && !hasAvatar && (
          <p className="text-dark-300 text-xs mt-4 flex items-center gap-1">
            <Upload className="w-3 h-3" /> Hover over the avatar to upload a profile picture
          </p>
        )}

        {/* Actions for other users */}
        {!isOwnProfile && (
          <div className="flex gap-3 mt-6 pt-6 border-t border-dark-400">
            <Link to={`/chat/${user._id}`} className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Chat
            </Link>
            <Link to={`/bookings?provider=${user._id}`} className="px-4 py-2 bg-dark-500 text-dark-50 rounded-xl hover:bg-dark-400 transition-colors flex items-center gap-2">
              <Video className="w-4 h-4" /> Book Session
            </Link>
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Skills</h2>
          {isOwnProfile && (
            <button onClick={() => setShowSkillForm(!showSkillForm)} className="p-2 rounded-lg bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {showSkillForm && isOwnProfile && (
          <div className="bg-dark-600 rounded-xl p-4 mb-4 space-y-3 slide-in-right">
            <input value={newSkill.name} onChange={e => setNewSkill({ ...newSkill, name: e.target.value })} placeholder="Skill name (e.g. React)" className="w-full px-3 py-2 bg-dark-700 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500" />
            <div className="flex gap-3">
              <select value={newSkill.category} onChange={e => setNewSkill({ ...newSkill, category: e.target.value })} className="flex-1 px-3 py-2 bg-dark-700 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500">
                <option>General</option><option>Frontend</option><option>Backend</option><option>Design</option><option>Data</option><option>DevOps</option><option>Mobile</option><option>Other</option>
              </select>
              <select value={newSkill.level} onChange={e => setNewSkill({ ...newSkill, level: e.target.value })} className="flex-1 px-3 py-2 bg-dark-700 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500">
                <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option>
              </select>
            </div>
            <button onClick={handleAddSkill} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors">Add Skill</button>
          </div>
        )}

        {user.skills?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {user.skills.map((skill) => (
              <div key={skill._id} className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${levelColors[skill.level] || 'bg-dark-500 text-dark-50'}`}>
                {skill.name}
                <span className="text-xs opacity-70 capitalize">{skill.level}</span>
                {isOwnProfile && (
                  <button onClick={() => handleRemoveSkill(skill._id)} className="ml-1 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark-200 text-sm">No skills added yet</p>
        )}
      </div>
    </div>
  );
};

export default Profile;

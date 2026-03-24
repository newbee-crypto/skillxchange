import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, MessageCircle, Video, Calendar, User, LogOut, Zap, Menu, X } from 'lucide-react';
import useAuthStore from '../store/authStore';

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/search', icon: Search, label: 'Explore' },
    { to: '/chat', icon: MessageCircle, label: 'Chat' },
    { to: '/video', icon: Video, label: 'Video' },
    { to: '/bookings', icon: Calendar, label: 'Bookings' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const handleNavClick = () => {
    setMobileOpen(false);
  };

  return (
    <nav className="glass sticky top-0 z-50 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" onClick={handleNavClick}>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="text-base sm:text-lg font-bold gradient-text">SkillExchange</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200
                    ${isActive
                      ? 'bg-primary-600/20 text-primary-400'
                      : 'text-dark-100 hover:bg-dark-500 hover:text-white'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Desktop User & Logout */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-semibold">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
              <span className="text-sm text-dark-50 font-medium">{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-dark-200 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-dark-100 hover:bg-dark-500 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-dark-700/95 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-1">
            {links.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
                    ${isActive
                      ? 'bg-primary-600/20 text-primary-400'
                      : 'text-dark-100 hover:bg-dark-500 hover:text-white'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{label}</span>
                </Link>
              );
            })}

            {/* Mobile user info & logout */}
            <div className="pt-3 mt-2 border-t border-dark-400">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-semibold">
                      {user?.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-dark-50 font-medium">{user?.name}</span>
                </div>
                <button
                  onClick={() => { handleLogout(); handleNavClick(); }}
                  className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

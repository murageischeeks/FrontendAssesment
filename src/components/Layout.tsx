import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Stethoscope } from 'lucide-react';
import { OfflineBanner } from './OfflineBanner';
import './Layout.css';

export const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      {/* Appears at the very top whenever the device loses connectivity */}
      <OfflineBanner />
      <header className="topbar">
        <div className="container topbar__inner">
          {/* Logo / Brand */}
          <button
            className="topbar__brand"
            onClick={() => navigate('/')}
            aria-label="Go to dashboard"
          >
            <Stethoscope size={20} />
            <span>Clinic Console</span>
          </button>

          {/* User info + logout */}
          {user && (
            <div className="topbar__user">
              {/* Small avatar using initials — a nice human touch */}
              <div className="topbar__avatar" aria-hidden="true">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <span className="topbar__name">
                {user.firstName} {user.lastName}
              </span>
              <button
                className="btn btn-ghost topbar__logout"
                onClick={handleLogout}
                aria-label="Sign out"
              >
                <LogOut size={15} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container">
          <span>Clinic Supplies Console · Powered by DummyJSON</span>
        </div>
      </footer>
    </div>
  );
};

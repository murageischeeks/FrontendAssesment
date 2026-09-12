import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { login as apiLogin, getCurrentUser, refreshToken as apiRefreshToken } from '../api/auth';

// ── Types ─────────────────────────────────────────────────────────
interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  image: string;
}

interface AuthContextType {
  user: User | null; // null = not logged in
  loading: boolean; // true only while checking a stored session on first load
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
}

// ── Context ───────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session on first load ─────────────────────────────────
  // When the page loads, we check if tokens are stored in localStorage.
  // If they are, we try to re-authenticate silently so the user stays logged in.
  useEffect(() => {
    let refreshInterval: ReturnType<typeof setInterval>;

    const restoreSession = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      // Nothing stored — show the login screen immediately
      if (!accessToken || !refreshToken) {
        setLoading(false);
        return;
      }

      try {
        // Try using the stored access token to fetch the current user
        const userData = await getCurrentUser(accessToken);
        setUser(userData);
        refreshInterval = startRefreshLoop(refreshToken);
      } catch {
        // Access token expired — try to get a fresh one using the refresh token
        try {
          const refreshed = await apiRefreshToken(refreshToken);
          saveTokens(refreshed.accessToken, refreshed.refreshToken);
          const userData = await getCurrentUser(refreshed.accessToken);
          setUser(userData);
          refreshInterval = startRefreshLoop(refreshed.refreshToken);
        } catch {
          // Both tokens are dead — clear localStorage so the login screen appears
          clearTokens();
        }
      } finally {
        setLoading(false);
      }
    };

    // ── Background token refresh ───────────────────────────────────
    // Tokens expire in 1 minute (set in auth.ts with expiresInMins: 1).
    // We proactively refresh every 50 seconds to stay ahead of that.
    // If the refresh fails, we log the user out rather than leaving them
    // with a silent broken session that shows blank screens.
    const startRefreshLoop = (currentRefreshToken: string) => {
      return setInterval(async () => {
        try {
          const refreshed = await apiRefreshToken(currentRefreshToken);
          saveTokens(refreshed.accessToken, refreshed.refreshToken);
        } catch {
          // Refresh token is also dead — force logout
          clearTokens();
          setUser(null);
          // ProtectedRoute will pick up that user is null and redirect to /login
        }
      }, 50_000);
    };

    restoreSession();

    // Clean up the interval when the component is unmounted (e.g. app closes)
    return () => clearInterval(refreshInterval);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────
  const saveTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  };

  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  // ── Actions ───────────────────────────────────────────────────────
  const login = async (username: string, pass: string) => {
    // apiLogin returns the user object + tokens together from DummyJSON
    const data = await apiLogin(username, pass);
    saveTokens(data.accessToken, data.refreshToken);
    setUser(data);
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    // No navigate() here — ProtectedRoute handles the redirect to /login
    // by watching for user === null
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────
// Import this in any component that needs auth info.
// Throws a clear error if you forget to wrap the app in AuthProvider.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
};

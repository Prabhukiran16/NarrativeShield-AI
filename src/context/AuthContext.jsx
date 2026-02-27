import { createContext, useContext, useMemo, useState } from 'react';
import { loginSession, logoutSession } from '../services/intelApi';

const AUTH_TOKEN_KEY = 'disinfo_auth_token';
const AUTH_USER_KEY = 'disinfo_auth_user';

const AuthContext = createContext(null);

function readInitialAuth() {
  try {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const rawUser = window.localStorage.getItem(AUTH_USER_KEY);
    const user = rawUser ? JSON.parse(rawUser) : null;

    if (!token || !user) {
      return { token: '', user: null };
    }

    return { token, user };
  } catch {
    return { token: '', user: null };
  }
}

export function AuthProvider({ children }) {
  const initialAuth = useMemo(() => readInitialAuth(), []);
  const [token, setToken] = useState(initialAuth.token);
  const [user, setUser] = useState(initialAuth.user);

  const persistAuth = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);

    try {
      if (!nextToken || !nextUser) {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        window.localStorage.removeItem(AUTH_USER_KEY);
        return;
      }

      window.localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
      window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
    } catch {
      // no-op
    }
  };

  const login = async ({ email, password }) => {
    const response = await loginSession({ email, password });
    persistAuth(response.token, response.user);
    return response.user;
  };

  const logout = async ({ confirm = false } = {}) => {
    if (confirm) {
      const accepted = window.confirm('Are you sure you want to logout?');
      if (!accepted) return false;
    }

    try {
      if (token) {
        await logoutSession({ reason: 'user_initiated' });
      }
    } catch {
      // proceed with local cleanup even if API call fails
    }

    persistAuth('', null);
    return true;
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

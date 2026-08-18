import { loginApi, registerApi } from '../api/client';

const SESSION_KEY = 'fraudlens_session';
const TOKEN_KEY = 'fraudlens_token';

/** Returns the stored user session object or null */
export const getSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Returns the JWT access token or null */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY) || null;
};

/**
 * Attempt login via backend API (connected to Neon PostgreSQL).
 * Returns { ok, user?, error? }
 */
export const login = async (username, password) => {
  try {
    const res = await loginApi({ username, password });
    if (res?.access_token && res?.user) {
      localStorage.setItem(TOKEN_KEY, res.access_token);
      localStorage.setItem(SESSION_KEY, JSON.stringify(res.user));
      return { ok: true, user: res.user, token: res.access_token };
    }
    return { ok: false, error: 'Invalid response from server.' };
  } catch (err) {
    return { ok: false, error: err.message || 'Login failed.' };
  }
};

/**
 * Register a new user in the database (Neon PostgreSQL).
 * Does NOT log in automatically — user will log in with their new credentials.
 * Returns { ok, user?, error? }
 */
export const register = async (userData) => {
  try {
    const res = await registerApi(userData);
    if (res?.user) {
      return { ok: true, user: res.user };
    }
    return { ok: false, error: 'Registration failed.' };
  } catch (err) {
    return { ok: false, error: err.message || 'Registration failed.' };
  }
};

/** Clear session and tokens on sign out */
export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
};

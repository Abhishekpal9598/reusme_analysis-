import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Check active session cookie on application load
   */
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const currentUser = await authService.getMe();
      setUser(currentUser);
    } catch (err) {
      // Unauthenticated / expired session is an expected guest state
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Log in user
   */
  const login = async (email, password) => {
    setError(null);
    try {
      const loggedInUser = await authService.login({ email, password });
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      setError(err.message || 'Failed to sign in.');
      throw err;
    }
  };

  /**
   * Register new user
   */
  const register = async (fullName, email, password) => {
    setError(null);
    try {
      const registeredUser = await authService.register({ fullName, email, password });
      setUser(registeredUser);
      return registeredUser;
    } catch (err) {
      setError(err.message || 'Failed to create account.');
      throw err;
    }
  };

  /**
   * Log out user
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setError(null);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

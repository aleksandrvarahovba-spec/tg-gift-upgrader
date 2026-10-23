import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserDto } from '@upgrader/shared';
import { api } from '../services/api';
import { sound } from '../services/soundEngine';
import { useTelegram } from '../hooks/useTelegram';

interface AuthContextType {
  user: UserDto | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  claimDemoGift: () => Promise<{ success: boolean; message: string }>;
  resetDevBalance: () => Promise<void>;
  switchDevUser: (id: string) => void;
  isTelegram: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAvailable, haptic } = useTelegram();

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch user:', err);
      setError(err.message || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const claimDemoGift = async () => {
    try {
      sound.playClick();
      haptic.impact('medium');
      const res = await api.claimDemo();
      await refreshUser();
      haptic.notification('success');
      return { success: true, message: res.message };
    } catch (err: any) {
      haptic.notification('error');
      return { success: false, message: err.message || 'Ошибка получения демо-подарка' };
    }
  };

  const resetDevBalance = async () => {
    sound.playClick();
    await api.resetBalance();
    await refreshUser();
  };

  const switchDevUser = (id: string) => {
    localStorage.setItem('upgrader_dev_user_id', id);
    window.location.reload();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        refreshUser,
        claimDemoGift,
        resetDevBalance,
        switchDevUser,
        isTelegram: isAvailable,
        error
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

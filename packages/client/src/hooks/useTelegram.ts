import { useEffect, useMemo } from 'react';

export function useTelegram() {
  const tg = useMemo(() => {
    if (typeof window !== 'undefined') {
      return (window as any).Telegram?.WebApp || null;
    }
    return null;
  }, []);

  const isAvailable = Boolean(tg && tg.initData && tg.initData.length > 0);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      // Set header color to dark
      try {
        tg.setHeaderColor('#080B11');
        tg.setBackgroundColor('#080B11');
      } catch {}
    }
  }, [tg]);

  const haptic = {
    impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
      try {
        tg?.HapticFeedback?.impactOccurred(style);
      } catch {}
    },
    notification: (type: 'error' | 'success' | 'warning') => {
      try {
        tg?.HapticFeedback?.notificationOccurred(type);
      } catch {}
    },
    selection: () => {
      try {
        tg?.HapticFeedback?.selectionChanged();
      } catch {}
    }
  };

  return {
    tg,
    isAvailable,
    user: tg?.initDataUnsafe?.user || null,
    haptic
  };
}

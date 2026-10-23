import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useToast } from '../context/ToastContext';
import { sound } from '../services/soundEngine';
import { api } from '../services/api';
import {
  Crown,
  DollarSign,
  Sparkles,
  Zap,
  Shield,
  EyeOff,
  X,
  Flame,
  CheckCircle2,
  Tv,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StreamerAdminDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StreamerAdminDrawer: React.FC<StreamerAdminDrawerProps> = ({ isOpen, onClose }) => {
  const { refreshUser } = useAuth();
  const { refreshAll, hideDevToolbar, setHideDevToolbar } = useGame();
  const { showToast } = useToast();

  const [luckyMode, setLuckyMode] = useState(false);
  const [maxWinLimit, setMaxWinLimit] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getAdminStatus().then((res) => {
        setLuckyMode(res.luckyModeEnabled);
        setMaxWinLimit(res.maxWinLimit);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddBalance = async () => {
    sound.playTap();
    setLoading(true);
    try {
      const res = await api.addAdminBalance(1000.0);
      sound.playWin();
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.5 } });
      } catch {}
      showToast(res.message, 'success');
      await refreshUser();
      await refreshAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantTopPack = async () => {
    sound.playTap();
    setLoading(true);
    try {
      const res = await api.grantAdminTopPack();
      sound.playWin();
      try {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      } catch {}
      showToast(res.message, 'success');
      await refreshAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDaily = async () => {
    sound.playTap();
    setLoading(true);
    try {
      await api.resetDailyTimer();
      showToast('Таймер Daily Bonus успешно сброшен!', 'success');
      await refreshUser();
      await refreshAll();
    } catch (err: any) {
      showToast(err.message || 'Ошибка сброса бонуса', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLucky = async () => {
    sound.playTap();
    try {
      const res = await api.toggleLuckyMode(!luckyMode);
      setLuckyMode(res.luckyModeEnabled);
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSetRisk = async (limit: number) => {
    sound.playTap();
    try {
      const res = await api.setAdminRiskLimits(limit);
      setMaxWinLimit(limit);
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl glass-card border border-amber-500/50 p-5 flex flex-col shadow-2xl relative overflow-hidden space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Crown className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-300">
                Стример-Панель & Управление Рис­ками
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                Инструменты для вирусных видео в TikTok / Reels / Shorts
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Quick Viral Actions (1-Click) */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Быстрые наборы для съемки видео:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={handleAddBalance}
              disabled={loading}
              className="py-3 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
            >
              <DollarSign className="w-4 h-4" />
              <span>+$1,000 на баланс</span>
            </button>

            <button
              onClick={handleGrantTopPack}
              disabled={loading}
              className="py-3 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition"
            >
              <span>🐸</span>
              <span>Выдать ТОП-набор</span>
            </button>
          </div>

          <button
            onClick={handleResetDaily}
            disabled={loading}
            className="w-full py-2.5 px-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>🔄 Сбросить таймер Daily Bonus</span>
          </button>
          <span className="text-[9px] text-slate-500 block">
            ТОП-набор добавляет в инвентарь: Plush Pepe ($1850), Durov's Cap ($1200), Snoop Dogg ($2800) и Birthday Cake ($17.5).
          </span>
        </div>

        {/* 2. Streamer Lucky Mode Switch */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-purple-500/40 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-purple-300 flex items-center gap-1.5">
                <span>🎬 Режим Стримера (Lucky Mode)</span>
                {luckyMode && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold">
                    ON
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Гарантирует победные исходы для красивой записи лесенки апгрейдов с $2 до $2500 на видео!
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleLucky}
            className={`w-14 h-7 rounded-full transition-colors relative p-1 shrink-0 ${
              luckyMode ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                luckyMode ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 3. Risk Management Controls */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" /> Лимит максимального выигрыша (Max Win Limit):
            </span>
            <span className="text-[10px] font-mono text-cyan-300 font-bold">
              {maxWinLimit > 0 ? `$${maxWinLimit}` : 'Безлимит'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'Безлимит', val: 0 },
              { label: 'До $100', val: 100 },
              { label: 'До $25', val: 25 },
            ].map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => handleSetRisk(r.val)}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition ${
                  maxWinLimit === r.val
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className="text-[9px] text-slate-500">
            Блокирует апгрейды выше лимита для защиты банка казино от крупных сливов.
          </span>
        </div>

        {/* 4. Hide Dev Toolbar Switch */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs font-bold text-slate-200">
                Скрыть плашку DEV (Чистый экран)
              </div>
              <span className="text-[9px] text-slate-500">
                Убирает все отладочные плашки для 100% продакшн-вида при записи экрана смартфона.
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              setHideDevToolbar(!hideDevToolbar);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
              hideDevToolbar ? 'bg-cyan-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                hideDevToolbar ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition"
        >
          Закрыть панель
        </button>
      </div>
    </div>
  );
};

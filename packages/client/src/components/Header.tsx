import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { sound } from '../services/soundEngine';
import { Volume2, VolumeX, Shield, Plus, Sparkles, RefreshCw, Crown } from 'lucide-react';
import { StreamerAdminDrawer } from './StreamerAdminDrawer';

export const Header: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { setActiveTab } = useGame();
  const [isMuted, setIsMuted] = useState(sound.isMuted());
  const [refreshing, setRefreshing] = useState(false);
  const [isStreamerOpen, setIsStreamerOpen] = useState(false);

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleManualRefresh = async () => {
    sound.playClick();
    setRefreshing(true);
    await refreshUser();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-tg-border/60 px-4 py-2.5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('upgrade')}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
                GIFT UPGRADER
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                TMA
              </span>
            </div>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2">
          {/* Balance Pill */}
          <div
            data-testid="header-balance-pill"
            onClick={() => setActiveTab('deposit')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-cyan-500/50 transition cursor-pointer shadow-inner group"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-slate-400 font-medium leading-none">Баланс</span>
              <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition font-mono">
                ${user ? user.balance.toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-black transition">
              <Plus className="w-3 h-3" />
            </div>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
            className="w-8 h-8 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Provably Fair Icon */}
          <button
            onClick={() => setActiveTab('provably_fair')}
            title="Честность Provably Fair"
            className="w-8 h-8 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 flex items-center justify-center text-emerald-400 transition"
          >
            <Shield className="w-4 h-4" />
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            title="Обновить данные"
            className="w-8 h-8 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Streamer Admin Button */}
          <button
            onClick={() => {
              sound.playTap();
              setIsStreamerOpen(true);
            }}
            title="Стример-панель & Риск-контроль"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-amber-200 transition text-[11px] font-black uppercase tracking-wider shadow-sm active:scale-95"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Streamer</span>
          </button>

          {/* User Profile Avatar */}
          <div className="flex items-center gap-1.5 pl-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 overflow-hidden flex items-center justify-center text-xs font-bold text-slate-300">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.firstName?.charAt(0) || 'U'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Streamer & Admin Drawer Modal */}
      <StreamerAdminDrawer isOpen={isStreamerOpen} onClose={() => setIsStreamerOpen(false)} />
    </header>
  );
};

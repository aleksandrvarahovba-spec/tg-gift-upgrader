import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useTelegram } from '../hooks/useTelegram';
import { Terminal, RefreshCw, PlusCircle, Smartphone, Globe, Star } from 'lucide-react';

export const DevToolbar: React.FC = () => {
  const { user, resetDevBalance, claimDemoGift } = useAuth();
  const { hideDevToolbar, setActiveTab } = useGame();
  const { isAvailable } = useTelegram();
  const [open, setOpen] = useState(false);

  if (hideDevToolbar) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-3 z-50">
      {open ? (
        <div className="p-3 rounded-2xl glass-panel border border-cyan-500/40 shadow-2xl space-y-2 w-56 text-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold text-cyan-400">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>Dev Controls</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-200 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            {isAvailable ? (
              <>
                <Smartphone className="w-3 h-3 text-emerald-400" />
                <span>Режим: Telegram WebApp</span>
              </>
            ) : (
              <>
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>Режим: Локальный Браузер</span>
              </>
            )}
          </div>

          <div className="text-[10px] text-slate-400 font-mono">
            User: {user?.username || user?.firstName} (${user?.balance.toFixed(2)})
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <button
              onClick={() => {
                setActiveTab('deposit');
                setOpen(false);
              }}
              className="w-full py-1.5 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] flex items-center justify-center gap-1 transition"
            >
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              Касса / Stars
            </button>
            <button
              onClick={() => resetDevBalance()}
              className="w-full py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[11px] flex items-center justify-center gap-1 transition"
            >
              <RefreshCw className="w-3 h-3" />
              Баланс $200
            </button>
            <button
              onClick={() => claimDemoGift()}
              className="w-full py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-[11px] flex items-center justify-center gap-1 transition"
            >
              <PlusCircle className="w-3 h-3" />
              Выдать демо-подарок
            </button>
            <button
              onClick={async () => {
                try {
                  const { api } = await import('../services/api');
                  await api.resetDailyTimer();
                  window.location.reload();
                } catch (e: any) {
                  alert(e.message);
                }
              }}
              className="w-full py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px] flex items-center justify-center gap-1 transition"
            >
              <RefreshCw className="w-3 h-3" />
              Сброс Daily Bonus
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400 shadow-xl active:scale-95 transition"
          title="Открыть Dev Toolbar"
        >
          <Terminal className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

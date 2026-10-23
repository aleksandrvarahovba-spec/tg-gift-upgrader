import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useToast } from '../context/ToastContext';
import { sound } from '../services/soundEngine';
import { api } from '../services/api';
import {
  Gift,
  Copy,
  Share2,
  Users,
  DollarSign,
  Sparkles,
  Ticket,
  Clock,
  ShieldAlert,
  CheckCircle,
  Package,
  RefreshCw,
  Trophy,
  Flame,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const BonusScreen: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { refreshAll } = useGame();
  const { showToast } = useToast();

  const [bonusInfo, setBonusInfo] = useState<any | null>(null);
  const [dailyStatus, setDailyStatus] = useState<{
    canClaim: boolean;
    streak: number;
    nextClaimAt: string | null;
    rewards: Array<{ day: number; balance: number; hasGift: boolean; desc: string }>;
  } | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(true);

  // Promocode Input
  const [promocodeInput, setPromocodeInput] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Daily Claim
  const [isClaimingDaily, setIsClaimingDaily] = useState(false);
  const [countdownText, setCountdownText] = useState('23:59:59');
  const [claimSuccessModal, setClaimSuccessModal] = useState<any | null>(null);

  const fetchDailyAndBonusData = async () => {
    try {
      const [statusRes, infoRes] = await Promise.all([
        api.getDailyStatus(),
        api.getBonusInfo(),
      ]);
      setDailyStatus(statusRes);
      setBonusInfo(infoRes);
    } catch {
      // ignore
    } finally {
      setLoadingDaily(false);
    }
  };

  useEffect(() => {
    fetchDailyAndBonusData();
  }, []);

  // Countdown timer for next daily claim
  useEffect(() => {
    if (!dailyStatus || dailyStatus.canClaim || !dailyStatus.nextClaimAt) {
      return;
    }

    const updateTimer = () => {
      const targetTime = new Date(dailyStatus.nextClaimAt!).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setCountdownText('00:00:00');
        setDailyStatus((prev) => (prev ? { ...prev, canClaim: true, nextClaimAt: null } : null));
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const pad = (n: number) => String(n).padStart(2, '0');
      setCountdownText(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [dailyStatus?.nextClaimAt, dailyStatus?.canClaim]);

  const handleCopyRef = () => {
    if (!bonusInfo?.referralLink) return;
    sound.playTap();
    navigator.clipboard.writeText(bonusInfo.referralLink);
    showToast('Реферальная ссылка скопирована!', 'success');
  };

  const handleShareTelegram = () => {
    if (!bonusInfo?.referralLink) return;
    sound.playTap();
    const shareText = encodeURIComponent(
      '🎁 Заходи в Telegram NFT Upgrader! Забирай ежедневный бонус и апгрейдь подарки до Pepe и Durov Cap!'
    );
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(bonusInfo.referralLink)}&text=${shareText}`;
    window.open(shareUrl, '_blank');
  };

  const handleRedeemPromo = async (codeToUse?: string) => {
    const code = (codeToUse || promocodeInput).trim().toUpperCase();
    if (!code) {
      showToast('Введите промокод', 'error');
      return;
    }

    sound.playTap();
    setIsRedeeming(true);
    try {
      const res = await api.redeemPromocode(code);
      sound.playWin();
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {}

      showToast(res.message, 'success');
      setPromocodeInput('');
      await refreshUser();
      await refreshAll();
      await fetchDailyAndBonusData();
    } catch (err: any) {
      sound.playLoss();
      showToast(err.message || 'Ошибка активации промокода', 'error');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleClaimDaily = async () => {
    sound.playTap();
    setIsClaimingDaily(true);
    try {
      const res = await api.claimDailyBonus();
      sound.playWin();
      try {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.55 } });
      } catch {}

      setClaimSuccessModal(res);
      showToast(`🎉 Ежедневный бонус получен: ${res.rewardText}`, 'success');

      await refreshUser();
      await refreshAll();
      await fetchDailyAndBonusData();
    } catch (err: any) {
      sound.playLoss();
      showToast(err.message || 'Не удалось забрать ежедневный бонус', 'error');
    } finally {
      setIsClaimingDaily(false);
    }
  };

  const handleResetDailyTimer = async () => {
    sound.playTap();
    try {
      await api.resetDailyTimer();
      showToast('Таймер Daily Bonus сброшен! Можно забрать снова.', 'success');
      await refreshUser();
      await fetchDailyAndBonusData();
    } catch (err: any) {
      showToast(err.message || 'Ошибка сброса', 'error');
    }
  };

  const wagerTotal = bonusInfo?.wagerTotal || user?.wagerTotal || 0;
  const wagerRequired = bonusInfo?.wagerRequired || user?.wagerRequired || 0;
  const wagerPercent = wagerRequired > 0 ? Math.min(100, (wagerTotal / wagerRequired) * 100) : 100;
  const currentStreak = dailyStatus?.streak || 0;

  return (
    <div className="w-full max-w-4xl mx-auto p-3 pb-28 space-y-4">
      {/* Success Modal on Claim */}
      {claimSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl glass-card border border-emerald-500/50 p-6 flex flex-col items-center text-center shadow-[0_0_50px_rgba(16,185,129,0.3)] relative">
            <button
              onClick={() => setClaimSuccessModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl mb-3 shadow-inner">
              🎉
            </div>

            <h3 className="text-lg font-black text-slate-100 uppercase tracking-wider mb-1">
              Ежедневный Бонус Получен!
            </h3>

            <div className="text-base font-black text-emerald-400 my-2">
              {claimSuccessModal.rewardText}
            </div>

            {claimSuccessModal.awardedGift && (
              <div className="my-2 p-3 rounded-2xl bg-slate-900 border border-slate-700 flex items-center gap-3 w-full">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/50 shrink-0">
                  <img
                    src={claimSuccessModal.awardedGift.imageUrl}
                    alt={claimSuccessModal.awardedGift.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-cyan-400 font-bold uppercase">
                    Подарок добавлен в инвентарь
                  </span>
                  <div className="text-sm font-black text-white">
                    {claimSuccessModal.awardedGift.name}
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    ${claimSuccessModal.awardedGift.price.toFixed(0)}
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-slate-400 mt-1 mb-4 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Текущая серия: {claimSuccessModal.streak} день подряд!</span>
            </div>

            <button
              onClick={() => setClaimSuccessModal(null)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              Отлично, играть дальше!
            </button>
          </div>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="p-4 rounded-3xl glass-card border border-tg-border/70 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-[10px] font-black uppercase tracking-wider">
            ПРОГРАММА ЛОЯЛЬНОСТИ
          </span>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-emerald-400" /> На складе: {bonusInfo?.inStockCount || 80} NFT
          </span>
        </div>
        <h2 className="text-base sm:text-lg font-black text-slate-100">
          Бонусы, Промокоды и Рефералы
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Забирай ежедневные награды, получай бесплатные NFT и приглашай друзей!
        </p>
      </div>

      {/* 2. DAILY BONUS WITH 7-DAY ROADMAP */}
      <div className="p-4 sm:p-5 rounded-3xl glass-card border border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-slate-900/80 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
              🎁
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>Ежедневный Бонус 24ч</span>
                {currentStreak > 0 && (
                  <span className="px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-0.5">
                    <Flame className="w-3 h-3 text-amber-400" /> Стрик: {currentStreak} дн.
                  </span>
                )}
              </div>
              <div className="text-sm font-black text-slate-100">
                Заходи каждый день за растущими наградами
              </div>
            </div>
          </div>

          <button
            onClick={handleResetDailyTimer}
            className="text-[10px] text-slate-400 hover:text-amber-400 font-mono flex items-center gap-1 transition p-1 rounded-lg bg-slate-800/60 border border-slate-700/60"
            title="Сбросить таймер бонуса для теста"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Сброс таймера (Тест)</span>
          </button>
        </div>

        {/* 7-Day Rewards Roadmap Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
          {(dailyStatus?.rewards || [
            { day: 1, balance: 2.5, hasGift: true, desc: '$2.50 + NFT' },
            { day: 2, balance: 5.0, hasGift: false, desc: '$5.00' },
            { day: 3, balance: 7.5, hasGift: true, desc: '$7.50 + NFT' },
            { day: 4, balance: 10.0, hasGift: false, desc: '$10.00' },
            { day: 5, balance: 12.5, hasGift: true, desc: '$12.50 + NFT' },
            { day: 6, balance: 15.0, hasGift: false, desc: '$15.00' },
            { day: 7, balance: 25.0, hasGift: true, desc: '$25.00 + NFT' },
          ]).map((r) => {
            const isCompleted = r.day <= currentStreak;
            const isToday = dailyStatus?.canClaim && r.day === (currentStreak % 7) + 1;

            return (
              <div
                key={r.day}
                className={`p-2 rounded-xl border flex flex-col items-center text-center transition-all ${
                  isToday
                    ? 'border-emerald-400 ring-2 ring-emerald-400/50 bg-emerald-950/40 scale-105 shadow-md shadow-emerald-500/20'
                    : isCompleted
                    ? 'border-cyan-500/50 bg-cyan-950/20 opacity-80'
                    : 'border-slate-800 bg-slate-900/60 text-slate-500'
                }`}
              >
                <span className="text-[9px] font-bold uppercase text-slate-400">
                  День {r.day}
                </span>
                <span className="text-base my-0.5">
                  {r.day === 7 ? '👑' : r.hasGift ? '🎁' : '💵'}
                </span>
                <span
                  className={`text-[10px] font-mono font-black ${
                    isToday ? 'text-emerald-300' : isCompleted ? 'text-cyan-300' : 'text-slate-400'
                  }`}
                >
                  ${r.balance}
                </span>
                {r.hasGift && (
                  <span className="text-[8px] text-amber-400 font-bold tracking-tight">
                    +NFT
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Claim Action Button */}
        <div>
          {dailyStatus?.canClaim ? (
            <button
              onClick={handleClaimDaily}
              disabled={isClaimingDaily}
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 active:scale-95 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>
                {isClaimingDaily
                  ? 'Начисление награды...'
                  : `Забрать ежедневный бонус (День ${(currentStreak % 7) + 1})`}
              </span>
            </button>
          ) : (
            <div className="w-full py-3 px-5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-slate-400 font-mono text-xs flex items-center justify-center gap-2 select-none shadow-inner">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>
                До следующего бонуса: <strong className="text-slate-100">{countdownText}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Promocodes Section */}
      <div className="p-4 rounded-3xl glass-card border border-tg-border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Ticket className="w-4 h-4 text-amber-400" /> Активация промокода
          </h3>
          <span className="text-[10px] text-slate-400">
            Мгновенное начисление на баланс
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Введи промокод (например: TIKTOK)..."
            value={promocodeInput}
            onChange={(e) => setPromocodeInput(e.target.value.toUpperCase())}
            className="flex-1 py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={() => handleRedeemPromo()}
            disabled={isRedeeming || !promocodeInput.trim()}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition active:scale-95 disabled:opacity-40"
          >
            {isRedeeming ? 'Проверка...' : 'Применить'}
          </button>
        </div>

        {/* Clickable Quick Promocodes */}
        <div className="pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Доступные промокоды для теста:
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { code: 'WELCOME', reward: 'Cupid Charm + $5' },
              { code: 'TIKTOK', reward: '+$25.00 на баланс' },
              { code: 'DUROV', reward: 'Rare Spiced Wine ($55)' },
            ].map((p) => (
              <button
                key={p.code}
                type="button"
                onClick={() => handleRedeemPromo(p.code)}
                className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-400 text-slate-300 hover:text-amber-300 text-[11px] font-mono transition active:scale-95"
              >
                <span className="font-black text-amber-400">{p.code}</span>
                <span className="text-[9px] text-slate-400 font-sans">({p.reward})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Referral Program */}
      <div className="p-4 rounded-3xl glass-card border border-tg-border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-cyan-400" /> Реферальная система (10%)
          </h3>
          <span className="text-[10px] font-bold text-cyan-400">
            10% от комиссии с каждой игры друга
          </span>
        </div>

        {/* Ref Link Bar */}
        <div className="p-2 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-slate-300 truncate pl-2">
            {bonusInfo?.referralLink || 'https://t.me/GiftUpgraderBot?start=ref_...'}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCopyRef}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              title="Скопировать ссылку"
            >
              <Copy className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              onClick={handleShareTelegram}
              className="py-1.5 px-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[11px] flex items-center gap-1 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Поделиться</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center text-center">
            <Users className="w-5 h-5 text-cyan-400 mb-1" />
            <span className="text-xs text-slate-400 font-bold uppercase">Приглашено друзей</span>
            <span className="text-lg font-black font-mono text-slate-100">
              {bonusInfo?.referredCount || 0}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center text-center">
            <DollarSign className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="text-xs text-slate-400 font-bold uppercase">Заработано (10%)</span>
            <span className="text-lg font-black font-mono text-emerald-400">
              ${(bonusInfo?.referralEarnings || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Wager & Anti-Abuse Protection Card */}
      <div className="p-4 rounded-3xl glass-card border border-tg-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-200">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>Отыгрыш бонусов (Комфортный Wager 1x)</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">
            {wagerPercent.toFixed(0)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            style={{ width: `${wagerPercent}%` }}
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Отыграно: ${wagerTotal.toFixed(2)}</span>
          <span>Требуется (1x): ${wagerRequired.toFixed(2)}</span>
        </div>

        <p className="text-[10px] text-slate-500 pt-1">
          💡 Вейджер снижен до строго 1x: достаточно совершить оборот ставок в Апгрейде или Дуэлях на сумму полученного бонуса. Мин. депозит для вывода — всего $1.00 (75 Stars).
        </p>
      </div>
    </div>
  );
};

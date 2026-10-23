import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sound } from '../services/soundEngine';
import { api } from '../services/api';
import {
  Sparkles,
  Bot,
  Wallet,
  Copy,
  Check,
  Star,
  ShieldCheck,
  Lock,
  Unlock,
  CheckCircle2,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { STARS_PACKAGES, MIN_DEPOSIT_TO_WITHDRAW } from '@upgrader/shared';
import confetti from 'canvas-confetti';

export const DepositScreen: React.FC = () => {
  const { user, refreshUser, claimDemoGift } = useAuth();
  const [tab, setTab] = useState<'stars' | 'ton' | 'bot'>('stars');
  const [selectedPackageIndex, setSelectedPackageIndex] = useState(1); // Default: 150 Stars ($2.00)
  const [copied, setCopied] = useState(false);
  const [simulatedWalletConnected, setSimulatedWalletConnected] = useState(false);
  const [tonAmount, setTonAmount] = useState('5');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const selectedPackage = STARS_PACKAGES[selectedPackageIndex] || STARS_PACKAGES[0];
  const totalDeposited = (user as any)?.totalDeposited || 0;
  const isWithdrawUnlocked = totalDeposited >= MIN_DEPOSIT_TO_WITHDRAW;
  const depositMemo = `UPG-${user ? user.telegramId.slice(-5) : '88412'}`;

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#10b981', '#06b6d4'],
      });
    } catch (e) {
      // ignore
    }
  };

  const handleCopyMemo = () => {
    sound.playClick();
    navigator.clipboard.writeText(depositMemo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Official Telegram Stars Payment Flow
  const handlePayStars = async () => {
    sound.playClick();
    setLoading(true);
    setStatusMessage(null);

    try {
      const invRes = await api.createStarsInvoice(selectedPackage.stars);

      const tgWebApp = (window as any).Telegram?.WebApp;
      if (tgWebApp && typeof tgWebApp.openInvoice === 'function') {
        tgWebApp.openInvoice(invRes.invoiceLink, async (status: string) => {
          if (status === 'paid') {
            sound.playWin();
            triggerConfetti();
            await api.confirmStarsPayment(selectedPackage.stars, selectedPackage.amountUsd);
            await refreshUser();
            setStatusMessage({
              text: `✅ Оплата ${selectedPackage.stars} ⭐ прошла успешно! Начислено +$${selectedPackage.amountUsd.toFixed(2)}.`,
              type: 'success',
            });
          } else if (status === 'cancelled') {
            setStatusMessage({ text: 'Оплата Stars была отменена пользователем.', type: 'error' });
          } else if (status === 'failed') {
            setStatusMessage({ text: 'Ошибка при проведении платежа Telegram Stars.', type: 'error' });
          }
        });
      } else {
        // Outside Telegram WebApp or browser environment: simulate/test payment or open link
        sound.playWin();
        triggerConfetti();
        const confRes = await api.confirmStarsPayment(selectedPackage.stars, selectedPackage.amountUsd);
        await refreshUser();
        setStatusMessage({
          text: `✅ ${confRes.message} (Тестовый режим браузера)`,
          type: 'success',
        });
      }
    } catch (err: any) {
      sound.playLoss();
      setStatusMessage({ text: err.message || 'Ошибка создания счета Stars', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Instant Dev Simulation ($2.00 / 150 Stars)
  const handleSimulateDevDeposit = async (stars = 150, amount = 2.0) => {
    sound.playClick();
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await api.confirmStarsPayment(stars, amount);
      await refreshUser();
      sound.playWin();
      triggerConfetti();
      setStatusMessage({
        text: `⚡ [DEV] Баланс успешно пополнен на +$${amount.toFixed(2)} (${stars} ⭐)! Вывод: ${
          res.isWithdrawUnlocked ? 'РАЗБЛОКИРОВАН' : 'ТРЕБУЕТСЯ ДЕПОЗИТ'
        }`,
        type: 'success',
      });
    } catch (err: any) {
      sound.playLoss();
      setStatusMessage({ text: err.message || 'Ошибка симуляции депозита', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateBotDeposit = async () => {
    sound.playClick();
    setLoading(true);
    await claimDemoGift();
    await refreshUser();
    triggerConfetti();
    setLoading(false);
  };

  const handleSimulateTonDeposit = async () => {
    sound.playClick();
    setLoading(true);
    const tonVal = parseFloat(tonAmount) || 5;
    const usdVal = Number((tonVal * 5.2).toFixed(2)); // ~$5.20 per TON
    await api.confirmStarsPayment(Math.round(usdVal * 75), usdVal);
    await refreshUser();
    triggerConfetti();
    setLoading(false);
    setStatusMessage({
      text: `✅ Баланс пополнен на ${tonAmount} TON (+$${usdVal.toFixed(2)})!`,
      type: 'success',
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4 pb-24 space-y-4">
      {/* 1. Header Banner & Withdrawal Status */}
      <div className="p-4 rounded-3xl glass-card border border-tg-border bg-slate-900/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Касса и Депозит</h2>
              <p className="text-[11px] text-slate-400">Мгновенное пополнение игрового баланса</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-mono font-bold">Баланс</span>
            <span className="text-base font-black text-emerald-400 font-mono">
              ${user ? user.balance.toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* Withdrawal Unlock Status Pill */}
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
            isWithdrawUnlocked
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {isWithdrawUnlocked ? (
              <Unlock className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-4 h-4 text-amber-400" />
            )}
            <div>
              <span className="font-bold block">
                {isWithdrawUnlocked ? 'Вывод подарков РАЗБЛОКИРОВАН' : 'Вывод подарков заблокирован'}
              </span>
              <span className="text-[10px] opacity-80 block">
                {isWithdrawUnlocked
                  ? `Внесено депозитов: $${totalDeposited.toFixed(2)} (Мин: $${MIN_DEPOSIT_TO_WITHDRAW.toFixed(2)})`
                  : `Требуется мин. депозит $${MIN_DEPOSIT_TO_WITHDRAW.toFixed(2)} (75 ⭐) для верификации Telegram`}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-black/40 border border-white/10">
            {isWithdrawUnlocked ? '100% OK' : `$${totalDeposited.toFixed(2)} / $1.00`}
          </span>
        </div>
      </div>

      {/* 2. Tab Switcher */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800">
        <button
          onClick={() => {
            sound.playClick();
            setTab('stars');
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
            tab === 'stars'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-md shadow-amber-500/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Star className="w-3.5 h-3.5 fill-current" />
          Telegram Stars
        </button>
        <button
          onClick={() => {
            sound.playClick();
            setTab('ton');
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
            tab === 'ton'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          TON
        </button>
        <button
          onClick={() => {
            sound.playClick();
            setTab('bot');
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
            tab === 'bot'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          NFT Подарки
        </button>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="flex-1">{statusMessage.text}</span>
        </div>
      )}

      {/* TAB 1: TELEGRAM STARS (MAIN & RECOMMENDED) */}
      {tab === 'stars' && (
        <div className="p-5 rounded-3xl glass-card border border-tg-border bg-slate-900/60 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                Выберите пакет Telegram Stars
              </h3>
              <p className="text-[11px] text-slate-400">
                Официальная валюта Telegram. Мгновенная оплата в один клик.
              </p>
            </div>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
              75 ⭐ = $1.00
            </span>
          </div>

          {/* Stars Packages Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {STARS_PACKAGES.map((pkg, idx) => {
              const isSelected = selectedPackageIndex === idx;
              return (
                <div
                  key={pkg.stars}
                  onClick={() => {
                    sound.playTap();
                    setSelectedPackageIndex(idx);
                  }}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border relative ${
                    isSelected
                      ? 'bg-gradient-to-b from-amber-500/20 to-yellow-500/5 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Badge */}
                  {pkg.badge && (
                    <div
                      className={`absolute -top-2.5 right-3 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm ${
                        pkg.popular
                          ? 'bg-rose-500 text-white border-rose-400'
                          : 'bg-amber-500/30 text-amber-300 border-amber-400/40'
                      }`}
                    >
                      {pkg.badge}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 mb-1">
                    <Star
                      className={`w-4 h-4 ${
                        isSelected ? 'fill-amber-400 text-amber-400' : 'text-slate-400 fill-slate-400'
                      }`}
                    />
                    <span className="text-base font-black text-white font-mono">{pkg.stars}</span>
                    <span className="text-xs text-slate-400 font-bold">Stars</span>
                  </div>

                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-sm font-extrabold text-emerald-400 font-mono">
                      ${pkg.amountUsd.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">USD</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Action Button */}
          <button
            onClick={handlePayStars}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <Star className="w-4 h-4 fill-slate-950 text-slate-950" />
            {loading ? (
              'Создание счета Telegram Stars...'
            ) : (
              <span>
                💳 Оплатить {selectedPackage.stars} Stars (${selectedPackage.amountUsd.toFixed(2)})
              </span>
            )}
          </button>

          {/* Desktop/Dev Simulation Button */}
          <div className="pt-1 border-t border-slate-800/80">
            <button
              onClick={() => handleSimulateDevDeposit(150, 2.0)}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              [DEV] Симулировать депозит $2.00 (150 ⭐)
            </button>
            <p className="text-[10px] text-center text-slate-500 mt-1.5">
              💡 В режиме браузера кнопка DEV мгновенно пополняет баланс и разблокирует вывод.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: TON CONNECT */}
      {tab === 'ton' && (
        <div className="p-5 rounded-3xl glass-card border border-tg-border bg-slate-900/60 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Пополнение через TON Connect
              </h3>
              <p className="text-[11px] text-slate-400">
                Подключите Tonkeeper / MyTonWallet для мгновенного депозита
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  simulatedWalletConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-xs font-bold text-slate-200">
                {simulatedWalletConnected ? 'Кошелек: UQ...7x9F (TON)' : 'Кошелек не подключен'}
              </span>
            </div>
            <button
              onClick={() => {
                sound.playClick();
                setSimulatedWalletConnected(!simulatedWalletConnected);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-slate-700 active:scale-95 transition"
            >
              {simulatedWalletConnected ? 'Отключить' : 'Подключить'}
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-2 block">
              Выберите сумму депозита:
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {['2', '5', '10', '25'].map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    sound.playClick();
                    setTonAmount(amt);
                  }}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition border ${
                    tonAmount === amt
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {amt} TON
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSimulateTonDeposit}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Подтверждение транзакции...' : `Пополнить баланс на ${tonAmount} TON`}
          </button>
        </div>
      )}

      {/* TAB 3: BOT GIFT DEPOSIT */}
      {tab === 'bot' && (
        <div className="p-5 rounded-3xl glass-card border border-tg-border bg-slate-900/60 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Депозит NFT Подарков через Бота
              </h3>
              <p className="text-[11px] text-slate-400">
                Отправьте любой лимитированный подарок нашему хранилищу
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <div className="text-xs text-slate-300">
                Откройте официального бота хранилища{' '}
                <span className="text-cyan-400 font-bold font-mono">@GiftUpgraderBot</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <div className="text-xs text-slate-300 flex-1">
                При отправке подарка укажите ваш персональный код депозита (MEMO):
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-700 font-mono text-cyan-300 font-bold text-sm">
                    {depositMemo}
                  </div>
                  <button
                    onClick={handleCopyMemo}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95 transition"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <div className="text-xs text-slate-300">
                Подарок зачисляется в инвентарь автоматически после подтверждения сети!
              </div>
            </div>
          </div>

          <button
            onClick={handleSimulateBotDeposit}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Обработка подарка...' : '⚡ Симулировать депозит NFT подарка'}
          </button>
        </div>
      )}
    </div>
  );
};

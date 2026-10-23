import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { sound } from '../services/soundEngine';
import { useTelegram } from '../hooks/useTelegram';
import { TelegramGiftCard } from './TelegramGiftCard';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Zap,
  ArrowRight,
  PlusCircle,
  Flame,
  DollarSign,
  PackageCheck,
  RotateCcw,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export const UpgradeArena: React.FC<{ onOpenInventoryDrawer: () => void; onOpenCatalogDrawer: () => void }> = ({
  onOpenInventoryDrawer,
  onOpenCatalogDrawer
}) => {
  const {
    math,
    selectedItem,
    selectedTarget,
    isUpgrading,
    setIsUpgrading,
    executeUpgrade,
    selectQuickMultiplier,
    upgradeResult,
    continueWithWonItem,
    pickNextAvailableItem,
    sellInventoryItem,
    fastSpin,
    setFastSpin
  } = useGame();
  const { claimDemoGift } = useAuth();
  const { haptic } = useTelegram();

  // Cumulative wheel rotation angle (never resets to 0, always spins forward!)
  const [currentAngle, setCurrentAngle] = useState(0);
  const cumulativeAngleRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<any>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinStatus, setSpinStatus] = useState<'idle' | 'spinning' | 'won' | 'lost'>('idle');
  const [displayRoll, setDisplayRoll] = useState<number | null>(null);
  const [shakeScreen, setShakeScreen] = useState(false);

  // Wheel layout constants
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;

  const chancePercent = math?.isValid ? math.rawChance : 0;
  const winStrokeDash = (chancePercent / 100) * circumference;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  // Finalize spin reliably
  const finalizeSpin = (result: any) => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setIsSpinning(false);
    setIsUpgrading(false);
    setDisplayRoll(result.roll);

    if (result.isWon) {
      setSpinStatus('won');
      sound.playWin();
      haptic.notification('success');
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.55 }
        });
      } catch {}
    } else {
      setSpinStatus('lost');
      sound.playLoss();
      haptic.notification('error');
      // Trigger screen shake
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 600);
    }
  };

  const handleStartUpgrade = async () => {
    if (isSpinning || isUpgrading || !math || !math.isValid || !selectedItem || !selectedTarget) {
      return;
    }

    sound.playSpinStart();
    setIsSpinning(true);
    setIsUpgrading(true);
    setSpinStatus('spinning');
    setDisplayRoll(null);

    // Call API for roll result
    const result = await executeUpgrade();
    if (!result) {
      setIsSpinning(false);
      setIsUpgrading(false);
      setSpinStatus('idle');
      return;
    }

    // --- CUMULATIVE ROTATION CALCULATION (CRITICAL FIX) ---
    // Start from current cumulative rotation
    const startAngle = cumulativeAngleRef.current;
    const currentMod = startAngle % 360;
    const forwardToZero = 360 - currentMod;
    const fullSpins = (fastSpin ? 2 : 5) * 360;
    // Target is: startAngle + forwardToZero + fullSpins + rollAngle
    const targetAngle = startAngle + forwardToZero + fullSpins + result.rollAngle;
    const totalDelta = targetAngle - startAngle;

    cumulativeAngleRef.current = targetAngle;

    const duration = fastSpin ? 1300 : 4200;
    const startTime = performance.now();
    let lastTickAngle = startAngle;

    // Quartic ease-out deceleration
    const easeOutQuart = (x: number): number => {
      return 1 - Math.pow(1 - x, 4);
    };

    // Safety fallback timer guaranteeing lock release
    fallbackTimerRef.current = setTimeout(() => {
      setCurrentAngle(targetAngle);
      finalizeSpin(result);
    }, duration + 100);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const angleNow = startAngle + eased * totalDelta;

      setCurrentAngle(angleNow);

      // Sound ticks every 16 degrees passed
      if (Math.abs(angleNow - lastTickAngle) >= 16) {
        lastTickAngle = angleNow;
        const speedFactor = Math.max(0, 1 - progress);
        sound.playTick(speedFactor);
        haptic.selection();
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        finalizeSpin(result);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className={`w-full max-w-5xl mx-auto flex flex-col items-center px-2 py-3 transition-transform ${shakeScreen ? 'animate-shake' : ''}`}>
      {/* Top 3D Pedestals: Left (Source) vs Right (Target) */}
      <div className="w-full grid grid-cols-2 md:grid-cols-2 gap-3 max-w-xl mx-auto mb-3">
        {/* Left Pedestal: My Gift */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-2 pb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Твой предмет
            </span>
            {selectedItem && (
              <button
                onClick={onOpenInventoryDrawer}
                disabled={isSpinning}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition"
              >
                Сменить
              </button>
            )}
          </div>

          {selectedItem ? (
            <TelegramGiftCard
              gift={selectedItem.gift}
              isSelected={true}
              onClick={onOpenInventoryDrawer}
              size="md"
            />
          ) : (
            <div
              onClick={() => claimDemoGift()}
              className="min-h-[215px] rounded-3xl border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-slate-900/40 hover:bg-slate-900/60 transition cursor-pointer flex flex-col items-center justify-center p-4 text-center group"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition mb-2 shadow-inner">
                <PlusCircle className="w-6 h-6" />
              </div>
              <span className="text-xs font-black text-slate-200">Выберите предмет</span>
              <span className="text-[10px] text-cyan-400 mt-1 font-bold">+ Демо-подарок</span>
            </div>
          )}
        </div>

        {/* Right Pedestal: Target Gift */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-2 pb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Целевой NFT
            </span>
            {selectedTarget && (
              <button
                onClick={onOpenCatalogDrawer}
                disabled={isSpinning}
                className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition"
              >
                Каталог
              </button>
            )}
          </div>

          {selectedTarget ? (
            <TelegramGiftCard
              gift={selectedTarget}
              isSelected={true}
              onClick={onOpenCatalogDrawer}
              size="md"
              chanceBadge={math ? { value: math.displayChance, isValid: math.isValid } : undefined}
            />
          ) : (
            <div
              onClick={onOpenCatalogDrawer}
              className="min-h-[215px] rounded-3xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-slate-900/40 hover:bg-slate-900/60 transition cursor-pointer flex flex-col items-center justify-center p-4 text-center group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition mb-2 shadow-inner">
                <ArrowRight className="w-6 h-6" />
              </div>
              <span className="text-xs font-black text-slate-200">Выберите цель</span>
              <span className="text-[10px] text-emerald-400 mt-1 font-bold">Из каталога</span>
            </div>
          )}
        </div>
      </div>

      {/* Center Multilayer Cyber Wheel */}
      <div className="relative w-[320px] h-[320px] flex items-center justify-center my-1 select-none">
        {/* Dynamic Holographic Aura Backdrop */}
        <div
          className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
            spinStatus === 'won'
              ? 'bg-emerald-500/30 scale-110 opacity-100'
              : spinStatus === 'lost'
              ? 'bg-rose-500/20 scale-100 opacity-90'
              : isSpinning
              ? 'bg-cyan-500/25 scale-105 opacity-100'
              : 'bg-cyan-500/15 scale-95 opacity-70'
          }`}
        />

        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-10">
          <defs>
            {/* Multi-stop Neon Winning Gradient */}
            <linearGradient id="winNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#00E5FF" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>

            {/* Glowing Drop Shadow Filters */}
            <filter id="arcGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#00E5FF" floodOpacity="0.8" />
            </filter>
            <filter id="winGlowFull" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#10B981" floodOpacity="0.9" />
            </filter>
            <filter id="pointerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#FFFFFF" floodOpacity="1" />
            </filter>
          </defs>

          {/* Radar Tick Marks (72 marks every 5 degrees) */}
          {Array.from({ length: 72 }).map((_, i) => {
            const deg = i * 5;
            const isMajor = deg % 45 === 0;
            const tickR1 = radius + (isMajor ? 18 : 14);
            const tickR2 = radius + 11;
            const rad = ((deg - 90) * Math.PI) / 180;
            const x1 = cx + tickR1 * Math.cos(rad);
            const y1 = cy + tickR1 * Math.sin(rad);
            const x2 = cx + tickR2 * Math.cos(rad);
            const y2 = cy + tickR2 * Math.sin(rad);

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? '#38BDF8' : '#1E2B48'}
                strokeWidth={isMajor ? 2 : 1}
                opacity={isMajor ? 0.8 : 0.4}
              />
            );
          })}

          {/* Outer Border Track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius + 8}
            fill="none"
            stroke="#162238"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="opacity-60"
          />

          {/* Losing Sector Background Track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#0D1322"
            strokeWidth="16"
          />

          {/* Neon Winning Arc */}
          {math?.isValid && (
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="url(#winNeonGrad)"
              strokeWidth="16"
              strokeDasharray={`${winStrokeDash} ${circumference}`}
              strokeDashoffset="0"
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              filter={spinStatus === 'won' ? 'url(#winGlowFull)' : 'url(#arcGlow)'}
              className="transition-all duration-300"
            />
          )}

          {/* 12 o'clock Start Anchor Pin */}
          <circle
            cx={cx}
            cy={cy - radius}
            r="4.5"
            fill="#FFFFFF"
            filter="url(#pointerGlow)"
          />

          {/* End of Win Sector Indicator Pin */}
          {math?.isValid && (
            <circle
              cx={cx + radius * Math.cos(((chancePercent * 3.6 - 90) * Math.PI) / 180)}
              cy={cy + radius * Math.sin(((chancePercent * 3.6 - 90) * Math.PI) / 180)}
              r="4"
              fill="#00E5FF"
              filter="url(#arcGlow)"
            />
          )}

          {/* Rotating Needle / Arrow Pointer (Smooth Cumulative Rotation) */}
          <g transform={`rotate(${currentAngle} ${cx} ${cy})`}>
            {/* Glowing Needle Shaft */}
            <line
              x1={cx}
              y1={cy - 68}
              x2={cx}
              y2={cy - radius + 4}
              stroke="#00E5FF"
              strokeWidth="3.5"
              strokeLinecap="round"
              filter="url(#arcGlow)"
            />

            {/* Glowing Arrow Triangle */}
            <polygon
              points={`${cx},${cy - radius - 12} ${cx - 8},${cy - radius + 6} ${cx + 8},${cy - radius + 6}`}
              fill="#00E5FF"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              filter="url(#pointerGlow)"
            />
          </g>
        </svg>

        {/* Central Futuristic Glass HUD */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-[136px] h-[136px] rounded-full bg-slate-950/95 border-2 border-slate-700/80 shadow-2xl flex flex-col items-center justify-center p-2 text-center backdrop-blur-xl">
            {spinStatus === 'spinning' ? (
              <>
                <div className="text-[10px] font-black text-cyan-400 tracking-wider animate-pulse uppercase">
                  ВРАЩЕНИЕ
                </div>
                <div className="text-2xl font-black font-mono text-cyan-300 leading-tight my-0.5">
                  {math?.displayChance}%
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-black">
                  x{math?.multiplier.toFixed(2)}
                </div>
                <div className="text-[8px] font-mono text-slate-400 mt-0.5">
                  Сектор: 0.00 — {math?.displayChance.toFixed(2)}
                </div>
              </>
            ) : spinStatus === 'won' ? (
              <>
                <div className="text-[10px] font-black text-emerald-400 tracking-wider uppercase animate-bounce">
                  🎉 ПОБЕДА!
                </div>
                <div className="text-2xl font-black font-mono text-emerald-300 leading-tight">
                  {displayRoll !== null ? displayRoll.toFixed(2) : 'WIN'}
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono text-[10px] font-black mt-0.5">
                  x{math?.multiplier.toFixed(2)}
                </div>
                <div className="text-[8px] font-mono text-emerald-400/80 mt-0.5">
                  Выпало: {displayRoll !== null ? displayRoll.toFixed(2) : ''}
                </div>
              </>
            ) : spinStatus === 'lost' ? (
              <>
                <div className="text-[10px] font-black text-rose-400 tracking-wider uppercase">
                  НЕУДАЧА
                </div>
                <div className="text-2xl font-black font-mono text-rose-300 leading-tight">
                  {displayRoll !== null ? displayRoll.toFixed(2) : 'FAIL'}
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 font-mono text-[10px] font-black mt-0.5">
                  Сгорел
                </div>
                <div className="text-[8px] font-mono text-slate-400 mt-0.5">
                  Выпало: {displayRoll !== null ? displayRoll.toFixed(2) : ''}
                </div>
              </>
            ) : math?.isValid ? (
              <>
                <div className="text-[9px] font-extrabold text-slate-400 tracking-wider uppercase">
                  КРУТИТЬ
                </div>
                <div className="text-2xl font-black font-mono bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400 leading-none my-0.5">
                  {math.displayChance}%
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-[10px] font-black">
                  x{math.multiplier.toFixed(2)}
                </div>
                <div className="text-[8px] font-mono text-slate-400 mt-0.5">
                  Выигрыш: 0.00 — {math.displayChance.toFixed(2)}
                </div>
              </>
            ) : (
              <div className="px-2">
                <AlertCircle className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <div className="text-[10px] font-bold text-amber-300 leading-tight">
                  {math?.reason || 'Выберите цель'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post-Spin Interactive Outcome Callout (In-Place, No annoying full blocking modal!) */}
      {upgradeResult && !isSpinning && (
        <div className="w-full max-w-sm my-2 p-3.5 rounded-2xl glass-panel border animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
          {upgradeResult.isWon && upgradeResult.wonInventoryItem ? (
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 uppercase tracking-wide mb-1">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>Вы выиграли {upgradeResult.wonInventoryItem.gift.name}!</span>
              </div>
              <p className="text-[11px] text-slate-300 mb-3">
                Стоимость: <span className="font-mono font-bold text-emerald-300">${upgradeResult.wonInventoryItem.gift.price.toFixed(2)}</span> (Выпало: {upgradeResult.roll.toFixed(2)})
              </p>

              {/* 3 Quick Action Buttons */}
              <div className="w-full grid grid-cols-3 gap-1.5">
                <button
                  onClick={continueWithWonItem}
                  className="py-2 px-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition shadow-md shadow-emerald-500/20"
                >
                  <Flame className="w-3.5 h-3.5" />
                  Дальше
                </button>
                <button
                  onClick={() => sellInventoryItem(upgradeResult.wonInventoryItem!.id)}
                  className="py-2 px-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 active:scale-95 transition"
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Продать 95%
                </button>
                <button
                  onClick={pickNextAvailableItem}
                  className="py-2 px-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 active:scale-95 transition"
                >
                  <PackageCheck className="w-3.5 h-3.5 text-cyan-400" />
                  След.
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="text-xs font-black text-rose-400 uppercase tracking-wide mb-0.5">
                Предмет сгорел (Выпало: {upgradeResult.roll.toFixed(2)})
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Не расстраивайтесь — выберите следующий предмет и отыграйтесь!
              </p>
              <button
                onClick={pickNextAvailableItem}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider active:scale-95 transition flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Взять следующий предмет
              </button>
            </div>
          )}
        </div>
      )}

      {/* Multiplier Presets & Fast Spin Toggle */}
      <div className="w-full max-w-sm mt-2 flex flex-col gap-2">
        {/* Fast spin & presets bar */}
        <div className="flex items-center justify-between gap-1.5">
          {/* Fast Spin Toggle */}
          <button
            onClick={() => setFastSpin(!fastSpin)}
            disabled={isSpinning}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition ${
              fastSpin
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${fastSpin ? 'text-amber-400 animate-pulse' : ''}`} />
            <span>Fast Spin ⚡</span>
          </button>

          {/* Quick multiplier chips */}
          <div className="flex items-center gap-1">
            {[
              { label: 'x1.5', val: 1.5 },
              { label: 'x2.0', val: 2.0 },
              { label: 'x3.0', val: 3.0 },
              { label: 'x5.0', val: 5.0 },
              { label: 'x10', val: 10.0 },
              { label: 'MAX', val: 'max' as const }
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={() => selectQuickMultiplier(btn.val)}
                disabled={isSpinning || !selectedItem}
                className="py-1 px-2 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800 active:scale-95 transition text-[11px] font-black font-mono text-slate-300 hover:text-cyan-400 disabled:opacity-30 disabled:pointer-events-none"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Big Glowing Cyber Upgrade Button */}
        <button
          onClick={handleStartUpgrade}
          disabled={!math?.isValid || isSpinning || !selectedItem || !selectedTarget}
          className={`w-full py-3.5 rounded-2xl font-black tracking-wider text-xs uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-2xl ${
            !math?.isValid || !selectedItem || !selectedTarget
              ? 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
              : isSpinning
              ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white animate-pulse cursor-wait'
              : 'bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-600 hover:from-emerald-400 hover:via-cyan-300 hover:to-blue-500 text-slate-950 shadow-cyan-500/30 hover:shadow-cyan-500/60 active:scale-[0.98]'
          }`}
        >
          {isSpinning ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              ВРАЩЕНИЕ КОЛЕСА...
            </>
          ) : !selectedItem ? (
            'Выберите свой подарок'
          ) : !selectedTarget ? (
            'Выберите целевой NFT'
          ) : !math?.isValid ? (
            math?.reason || 'Невалидный шанс'
          ) : (
            <>
              <Flame className="w-4 h-4 text-slate-950 fill-current" />
              АПГРЕЙД ДО {selectedTarget.name.toUpperCase()} ({math.displayChance}%)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

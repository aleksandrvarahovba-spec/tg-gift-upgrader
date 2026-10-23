import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { sound } from '../services/soundEngine';
import { useTelegram } from '../hooks/useTelegram';
import confetti from 'canvas-confetti';
import { Sparkles, AlertCircle, ArrowUpCircle } from 'lucide-react';

export const UpgradeWheel: React.FC<{ onOpenResultModal: () => void }> = ({ onOpenResultModal }) => {
  const {
    math,
    selectedItem,
    selectedTarget,
    isUpgrading,
    executeUpgrade,
    selectQuickMultiplier,
    refreshAll
  } = useGame();
  const { haptic } = useTelegram();

  const [currentAngle, setCurrentAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinStatus, setSpinStatus] = useState<'idle' | 'spinning' | 'won' | 'lost'>('idle');
  const [displayRoll, setDisplayRoll] = useState<number | null>(null);

  const animationRef = useRef<number | null>(null);

  // Wheel constants
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;

  // Chance calculations
  const chancePercent = math?.isValid ? math.rawChance : 0;
  const winStrokeDash = (chancePercent / 100) * circumference;

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleStartUpgrade = async () => {
    if (isSpinning || isUpgrading || !math || !math.isValid || !selectedItem || !selectedTarget) {
      return;
    }

    sound.playClick();
    setIsSpinning(true);
    setSpinStatus('spinning');
    setDisplayRoll(null);

    // Call API
    const result = await executeUpgrade();
    if (!result) {
      setIsSpinning(false);
      setSpinStatus('idle');
      return;
    }

    // 5 full rotations (1800 deg) + rollAngle
    const targetAngle = 1800 + result.rollAngle;
    const duration = 4500; // 4.5 seconds
    const startTime = performance.now();
    let lastTickAngle = 0;

    // Cubic-bezier approximation: easeOutCubic / custom deceleration
    const easeOutQuart = (x: number): number => {
      return 1 - Math.pow(1 - x, 4);
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      const angleNow = easedProgress * targetAngle;
      setCurrentAngle(angleNow);

      // Sound ticks every 15-20 degrees passed
      if (Math.abs(angleNow - lastTickAngle) >= 18) {
        lastTickAngle = angleNow;
        // Pitch shifts down as wheel decelerates
        const pitch = 1.2 - progress * 0.5;
        sound.playTick(pitch);
        haptic.selection();
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation finished!
        setIsSpinning(false);
        setDisplayRoll(result.roll);

        if (result.isWon) {
          setSpinStatus('won');
          sound.playWin();
          haptic.notification('success');

          // Trigger Confetti explosion
          try {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          } catch {}
        } else {
          setSpinStatus('lost');
          sound.playLoss();
          haptic.notification('error');
        }

        refreshAll();
        // Give player 1 second to see the landing needle, then trigger modal
        setTimeout(() => {
          onOpenResultModal();
        }, 1200);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-2 px-4 select-none">
      {/* Wheel SVG Container */}
      <div className="relative w-[320px] h-[320px] flex items-center justify-center">
        {/* Ambient background glow behind winning sector */}
        <div
          className={`absolute inset-0 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none ${
            spinStatus === 'won'
              ? 'bg-emerald-500/25 opacity-100'
              : spinStatus === 'lost'
              ? 'bg-rose-500/15 opacity-80'
              : 'bg-cyan-500/15 opacity-60'
          }`}
        />

        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-10">
          <defs>
            {/* Winning gradient: Emerald to Cyan */}
            <linearGradient id="winGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="60%" stopColor="#00D2FF" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>

            {/* Glowing filter */}
            <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#00D2FF" floodOpacity="0.7" />
            </filter>
            <filter id="winGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#10B981" floodOpacity="0.8" />
            </filter>
            <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#FFFFFF" floodOpacity="0.9" />
            </filter>
          </defs>

          {/* Outer Tick Ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius + 16}
            fill="none"
            stroke="#1E2B48"
            strokeWidth="2"
            strokeDasharray="2 6"
            className="opacity-70"
          />

          {/* Background Track (Losing Area) */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#131B2E"
            strokeWidth="14"
          />

          {/* Winning Sector Arc */}
          {math?.isValid && (
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="url(#winGradient)"
              strokeWidth="14"
              strokeDasharray={`${winStrokeDash} ${circumference}`}
              strokeDashoffset="0"
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              filter={spinStatus === 'won' ? 'url(#winGlow)' : 'url(#neonGlow)'}
              className="transition-all duration-300"
            />
          )}

          {/* Start Point Indicator (12 o'clock / 0 deg) */}
          <circle
            cx={cx}
            cy={cy - radius}
            r="3.5"
            fill="#FFFFFF"
            filter="url(#needleGlow)"
          />

          {/* End of Win Sector Indicator */}
          {math?.isValid && (
            <circle
              cx={cx + radius * Math.cos(((chancePercent * 3.6 - 90) * Math.PI) / 180)}
              cy={cy + radius * Math.sin(((chancePercent * 3.6 - 90) * Math.PI) / 180)}
              r="3.5"
              fill="#00D2FF"
              filter="url(#neonGlow)"
            />
          )}

          {/* Rotating Needle / Arrow Pointer */}
          <g transform={`rotate(${currentAngle} ${cx} ${cy})`}>
            {/* Needle Body (emerges gracefully from behind central HUD) */}
            <line
              x1={cx}
              y1={cy - 68}
              x2={cx}
              y2={cy - radius + 4}
              stroke="#00D2FF"
              strokeWidth="3.5"
              strokeLinecap="round"
              filter="url(#needleGlow)"
            />

            {/* Needle Arrow Head */}
            <polygon
              points={`${cx},${cy - radius - 10} ${cx - 7},${cy - radius + 6} ${cx + 7},${cy - radius + 6}`}
              fill="#00D2FF"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              filter="url(#neonGlow)"
            />
          </g>
        </svg>

        {/* Center HUD Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-36 h-36 rounded-full bg-slate-950/95 border border-slate-700/80 shadow-2xl flex flex-col items-center justify-center p-2 text-center backdrop-blur-md">
            {spinStatus === 'spinning' ? (
              <>
                <div className="text-[11px] font-bold text-cyan-400 tracking-wider animate-pulse uppercase">
                  КРУТИМ...
                </div>
                <div className="text-2xl font-black font-mono text-cyan-300 tracking-tight mt-0.5">
                  {math?.displayChance}%
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Цель: {math?.displayChance}%
                </div>
              </>
            ) : spinStatus === 'won' ? (
              <>
                <div className="text-[11px] font-extrabold text-emerald-400 tracking-wider uppercase animate-bounce">
                  🎉 УСПЕХ!
                </div>
                <div className="text-2xl font-black font-mono text-emerald-300">
                  {displayRoll !== null ? `${displayRoll.toFixed(2)}%` : 'WIN'}
                </div>
                <div className="text-[10px] text-emerald-400/80 font-bold">
                  x{math?.multiplier.toFixed(2)} MULTI
                </div>
              </>
            ) : spinStatus === 'lost' ? (
              <>
                <div className="text-[11px] font-extrabold text-rose-400 tracking-wider uppercase">
                  НЕ ПОВЕЗЛО
                </div>
                <div className="text-2xl font-black font-mono text-rose-300">
                  {displayRoll !== null ? `${displayRoll.toFixed(2)}%` : 'FAIL'}
                </div>
                <div className="text-[10px] text-slate-400">
                  Попробуйте снова!
                </div>
              </>
            ) : math?.isValid ? (
              <>
                <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  ШАНС ПОБЕДЫ
                </div>
                <div className="text-3xl font-black font-mono bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400">
                  {math.displayChance}%
                </div>
                <div className="flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-cyan-300 font-mono text-xs font-bold">
                  x{math.multiplier.toFixed(2)}
                </div>
              </>
            ) : (
              <div className="px-2">
                <AlertCircle className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <div className="text-[11px] font-bold text-amber-300 leading-tight">
                  {math?.reason || 'Выберите предметы'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Multiplier Buttons */}
      <div className="w-full max-w-sm mt-3 flex items-center justify-between gap-1.5 px-2">
        {[
          { label: 'x1.5', val: 1.5 },
          { label: 'x2.0', val: 2.0 },
          { label: 'x5.0', val: 5.0 },
          { label: 'x10', val: 10.0 },
          { label: 'MAX', val: 'max' as const }
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() => selectQuickMultiplier(btn.val)}
            disabled={isSpinning || !selectedItem}
            className="flex-1 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/80 active:scale-95 transition text-xs font-bold font-mono text-slate-300 hover:text-cyan-400 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Big Glow Upgrade Action Button */}
      <div className="w-full max-w-sm mt-4 px-2">
        <button
          onClick={handleStartUpgrade}
          disabled={!math?.isValid || isSpinning || !selectedItem || !selectedTarget}
          className={`w-full py-3.5 rounded-2xl font-black tracking-wider text-sm uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-xl ${
            !math?.isValid || !selectedItem || !selectedTarget
              ? 'bg-slate-800/60 text-slate-500 border border-slate-700/40 cursor-not-allowed'
              : isSpinning
              ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white animate-pulse cursor-wait'
              : 'bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 hover:from-emerald-400 hover:via-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/30 hover:shadow-cyan-500/50 active:scale-[0.98]'
          }`}
        >
          {isSpinning ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              ВРАЩЕНИЕ КОЛЕСА...
            </>
          ) : !selectedItem ? (
            'Выберите предмет из инвентаря'
          ) : !selectedTarget ? (
            'Выберите целевой подарок'
          ) : !math?.isValid ? (
            math?.reason || 'Невалидный шанс'
          ) : (
            <>
              <ArrowUpCircle className="w-5 h-5 text-slate-950" />
              АПГРЕЙД ДО {selectedTarget.name.toUpperCase()} ({math.displayChance}%)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

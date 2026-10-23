import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { sound } from '../services/soundEngine';
import { api } from '../services/api';
import {
  Swords,
  Plus,
  Bot,
  Sparkles,
  RefreshCw,
  Trophy,
  ShieldCheck,
  CheckCircle,
  Zap,
  Flame,
  ArrowRight,
  X,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface RouletteCard {
  id: number;
  owner: 'CREATOR' | 'OPPONENT';
  username: string;
  avatarUrl?: string;
  giftName: string;
  giftImageUrl: string;
  color: string;
}

export const PvpBattleScreen: React.FC = () => {
  const { inventory, refreshAll } = useGame();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Room Creation State
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Join Room Modal State (Dynamic Odds Selection)
  const [joinModalRoom, setJoinModalRoom] = useState<any | null>(null);
  const [joinSelectedInventoryId, setJoinSelectedInventoryId] = useState<string>('');
  const [isJoining, setIsJoining] = useState(false);

  // Horizontal Case-Opening Roulette State
  const [activeDuel, setActiveDuel] = useState<any | null>(null);
  const [rouletteCards, setRouletteCards] = useState<RouletteCard[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinTranslateX, setSpinTranslateX] = useState(0);
  const [duelOutcome, setDuelOutcome] = useState<any | null>(null);

  const reelContainerRef = useRef<HTMLDivElement | null>(null);
  const spinTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Load Rooms
  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await api.getPvpRooms();
      setRooms(res.rooms || []);
    } catch {
      // ignore
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 6000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      spinTimeoutsRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const handleCreateRoom = async () => {
    if (!selectedInventoryId) {
      showToast('Выберите подарок из инвентаря для ставки', 'error');
      return;
    }

    sound.playTap();
    setIsCreating(true);
    try {
      await api.createPvpRoom(selectedInventoryId);
      showToast('Комната создана! Ожидание соперника...', 'success');
      setSelectedInventoryId('');
      await fetchRooms();
      await refreshAll();
    } catch (err: any) {
      showToast(err.message || 'Ошибка создания комнаты', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Generates 90 cards for the CS2-style horizontal roulette.
   * Winning card is strictly placed at card index 75.
   */
  const generateRouletteDeck = (
    creator: { username: string; avatarUrl?: string; gift: any },
    opponent: { username: string; avatarUrl?: string; gift: any },
    creatorChance: number,
    winnerIsCreator: boolean
  ): RouletteCard[] => {
    const cards: RouletteCard[] = [];
    const totalCards = 90;
    const winningIndex = 75;

    for (let i = 0; i < totalCards; i++) {
      if (i === winningIndex) {
        cards.push({
          id: i,
          owner: winnerIsCreator ? 'CREATOR' : 'OPPONENT',
          username: winnerIsCreator ? creator.username : opponent.username,
          avatarUrl: winnerIsCreator ? creator.avatarUrl : opponent.avatarUrl,
          giftName: winnerIsCreator ? creator.gift.name : opponent.gift.name,
          giftImageUrl: winnerIsCreator ? creator.gift.imageUrl : opponent.gift.imageUrl,
          color: winnerIsCreator ? '#06b6d4' : '#f59e0b',
        });
      } else {
        const isCreatorCard = Math.random() * 100 < creatorChance;
        cards.push({
          id: i,
          owner: isCreatorCard ? 'CREATOR' : 'OPPONENT',
          username: isCreatorCard ? creator.username : opponent.username,
          avatarUrl: isCreatorCard ? creator.avatarUrl : opponent.avatarUrl,
          giftName: isCreatorCard ? creator.gift.name : opponent.gift.name,
          giftImageUrl: isCreatorCard ? creator.gift.imageUrl : opponent.gift.imageUrl,
          color: isCreatorCard ? '#06b6d4' : '#f59e0b',
        });
      }
    }

    return cards;
  };

  /**
   * Starts CS2 Horizontal Roulette Animation:
   * 90 cards, 5.0 seconds duration, cubic-bezier(0.1, 0.85, 0.15, 1)
   * Stops needle precisely on card #75 with subtle realistic landing offset.
   */
  const startRouletteSpin = (
    duelData: {
      creator: { username: string; avatarUrl?: string; gift: any };
      opponent: { username: string; avatarUrl?: string; gift: any };
      creatorChance: number;
      joinerChance: number;
    },
    result: any,
    isUserCreator: boolean
  ) => {
    // Clear any previous audio timers
    spinTimeoutsRef.current.forEach((t) => clearTimeout(t));
    spinTimeoutsRef.current = [];

    const winnerIsCreator = isUserCreator ? result.isWon : !result.isWon;

    // Generate 90 cards
    const cards = generateRouletteDeck(
      duelData.creator,
      duelData.opponent,
      duelData.creatorChance,
      winnerIsCreator
    );

    setRouletteCards(cards);
    setIsSpinning(true);
    setDuelOutcome(null);
    setSpinTranslateX(0);

    // Audio sequence: spin start whoosh + deceleration ticks
    sound.playSpinStart();
    const tickDelays: number[] = [];
    let t = 60;
    let interval = 45;
    while (t < 4850) {
      tickDelays.push(t);
      if (t < 2000) interval += 6;
      else if (t < 3500) interval += 24;
      else interval += 65;
      t += interval;
    }

    tickDelays.forEach((delay) => {
      const timer = setTimeout(() => {
        const speed = Math.max(0, 1 - delay / 4850);
        sound.playTick(speed);
      }, delay);
      spinTimeoutsRef.current.push(timer);
    });

    // Card width = 110px + 8px gap = 118px, plus 16px left container padding (px-4)
    const cardStep = 118;
    const cardWidth = 110;
    const winningCardIndex = 75;
    const paddingLeft = 16;

    // Target needle in center of viewport
    const containerWidth = reelContainerRef.current?.offsetWidth || 480;
    const viewportCenter = containerWidth / 2;

    // Card 75 center position precisely under the needle
    const cardCenter = paddingLeft + winningCardIndex * cardStep + cardWidth / 2;
    // Subtle landing offset (-16px to +16px) safely centered inside the 110px card width
    const randomOffset = (Math.random() - 0.5) * 32;

    const finalTranslate = -(cardCenter + randomOffset - viewportCenter);

    // Trigger CSS translation after browser paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSpinTranslateX(finalTranslate);
      });
    });

    // Conclude after 5.0s
    const endTimer = setTimeout(() => {
      setIsSpinning(false);
      setDuelOutcome(result);

      if (result.isWon) {
        sound.playWin();
        try {
          confetti({
            particleCount: 110,
            spread: 80,
            origin: { y: 0.5 },
          });
        } catch {}
      } else {
        sound.playLoss();
      }

      refreshAll();
      fetchRooms();
    }, 5100);

    spinTimeoutsRef.current.push(endTimer);
  };

  // Open Join Modal with dynamic odds
  const handleOpenJoinModal = (room: any) => {
    sound.playTap();
    setJoinModalRoom(room);
    if (inventory.length > 0) {
      setJoinSelectedInventoryId(inventory[0].id);
    } else {
      setJoinSelectedInventoryId('');
    }
  };

  const handleConfirmJoin = async () => {
    if (!joinModalRoom || !joinSelectedInventoryId) {
      showToast('Выберите подарок из инвентаря для ставки', 'error');
      return;
    }

    sound.playTap();
    setIsJoining(true);

    try {
      const selectedItem = inventory.find((i) => i.id === joinSelectedInventoryId);
      if (!selectedItem) {
        showToast('Выбранный предмет не найден', 'error');
        return;
      }

      const result = await api.joinPvpRoom(joinModalRoom.id, joinSelectedInventoryId);

      const creatorGift = joinModalRoom.creatorGift;
      const opponentGift = selectedItem.gift;

      const creatorChance = result.creatorChance || 50;
      const joinerChance = result.joinerChance || 50;

      const duelInfo = {
        creator: {
          username: joinModalRoom.creatorUsername,
          gift: creatorGift,
          avatarUrl: joinModalRoom.isBot ? undefined : undefined,
        },
        opponent: {
          username: user?.username || user?.firstName || 'You',
          gift: opponentGift,
        },
        creatorChance,
        joinerChance,
      };

      setActiveDuel(duelInfo);
      setJoinModalRoom(null);

      startRouletteSpin(duelInfo, result, false);
    } catch (err: any) {
      showToast(err.message || 'Не удалось вступить в дуэль', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCallBot = async (roomId: string) => {
    sound.playTap();
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    try {
      const result = await api.callPvpBot(roomId);

      const creatorGift = room.creatorGift;
      const opponentGift = result.opponentGift;

      const creatorChance = result.creatorChance || 50;
      const joinerChance = result.joinerChance || 50;

      const duelInfo = {
        creator: {
          username: user?.username || user?.firstName || 'You',
          gift: creatorGift,
        },
        opponent: {
          username: result.winnerUserId.startsWith('bot_') ? result.winnerUsername : 'Telegram_Bot',
          gift: opponentGift,
        },
        creatorChance,
        joinerChance,
      };

      setActiveDuel(duelInfo);
      startRouletteSpin(duelInfo, result, true);
    } catch (err: any) {
      showToast(err.message || 'Ошибка вызова бота', 'error');
    }
  };

  // Helper for dynamic odds calculations in join modal
  const selectedJoinItem = inventory.find((i) => i.id === joinSelectedInventoryId);
  const joinCreatorPrice = joinModalRoom ? joinModalRoom.creatorGift.price : 1;
  const joinMyPrice = selectedJoinItem ? selectedJoinItem.gift.price : 1;
  const joinTotalPot = joinCreatorPrice + joinMyPrice;
  const joinCreatorChance = Math.min(99, Math.max(1, Math.round((joinCreatorPrice / joinTotalPot) * 1000) / 10));
  const joinMyChance = Math.round((100 - joinCreatorChance) * 10) / 10;

  return (
    <div className="w-full max-w-4xl mx-auto p-3 pb-28 space-y-4">
      {/* 1. CS2 HORIZONTAL CASE-OPENING ROULETTE ARENA MODAL */}
      {activeDuel && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl glass-card border border-cyan-500/50 p-4 sm:p-6 flex flex-col items-center text-center shadow-[0_0_50px_rgba(6,182,212,0.25)] relative overflow-hidden">
            {/* Ambient Background Radial Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-amber-500/10 pointer-events-none" />

            {/* Duel Header with Live Odds */}
            <div className="w-full flex items-center justify-between z-10 mb-2">
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100">
                  CS2 PvP Рулетка Подарков
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Provably Fair
              </span>
            </div>

            {/* Players Comparison & Chances Banner */}
            <div className="w-full grid grid-cols-2 gap-2 my-2 z-10">
              {/* Creator Box (Blue) */}
              <div className="p-2.5 rounded-2xl border border-cyan-500/50 bg-cyan-950/40 flex items-center gap-2.5 text-left">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-cyan-500/40 shrink-0">
                  <img
                    src={activeDuel.creator.gift.imageUrl}
                    alt={activeDuel.creator.gift.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="truncate">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide">
                    {activeDuel.creator.username}
                  </div>
                  <div className="text-xs font-black text-slate-100 truncate">
                    {activeDuel.creator.gift.name}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                    ${activeDuel.creator.gift.price.toFixed(0)}
                    <span className="text-[10px] text-cyan-300 font-sans">
                      ({activeDuel.creatorChance.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Opponent Box (Gold/Amber) */}
              <div className="p-2.5 rounded-2xl border border-amber-500/50 bg-amber-950/40 flex items-center gap-2.5 text-left">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-500/40 shrink-0">
                  <img
                    src={activeDuel.opponent.gift.imageUrl}
                    alt={activeDuel.opponent.gift.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="truncate">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                    {activeDuel.opponent.username}
                  </div>
                  <div className="text-xs font-black text-slate-100 truncate">
                    {activeDuel.opponent.gift.name}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                    ${activeDuel.opponent.gift.price.toFixed(0)}
                    <span className="text-[10px] text-amber-300 font-sans">
                      ({activeDuel.joinerChance.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Probability Bar */}
            <div className="w-full my-1.5 z-10">
              <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-700/80 overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${activeDuel.creatorChance}%` }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                />
                <div
                  style={{ width: `${activeDuel.joinerChance}%` }}
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-300"
                />
              </div>
            </div>

            {/* === HORIZONTAL CS2 ROULETTE REEL VIEWPORT === */}
            <div
              ref={reelContainerRef}
              className="relative w-full h-[150px] my-3 rounded-2xl bg-slate-950/90 border-2 border-slate-700/80 overflow-hidden flex items-center shadow-[inset_0_0_30px_rgba(0,0,0,0.85)] z-10"
            >
              {/* Central Glowing Laser Line (Target Needle) */}
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[3px] bg-gradient-to-b from-cyan-400 via-white to-amber-400 shadow-[0_0_16px_rgba(255,255,255,0.95)] z-30 pointer-events-none flex flex-col justify-between items-center py-0.5">
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-400 filter drop-shadow-[0_2px_4px_rgba(245,158,11,0.8)]" />
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-cyan-400 filter drop-shadow-[0_-2px_4px_rgba(6,182,212,0.8)]" />
              </div>

              {/* Left & Right Edge Vignette Gradients */}
              <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-20 pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent z-20 pointer-events-none" />

              {/* Scrolling Horizontal Strip of 90 Cards */}
              <div
                style={{
                  transform: `translateX(${spinTranslateX}px)`,
                  transition: isSpinning ? 'transform 5.0s cubic-bezier(0.1, 0.85, 0.15, 1)' : 'none',
                }}
                className="flex items-center gap-2 px-4 whitespace-nowrap will-change-transform"
              >
                {rouletteCards.map((card, idx) => {
                  const isCreator = card.owner === 'CREATOR';
                  const isWinnerTarget = !isSpinning && duelOutcome && idx === 75;

                  return (
                    <div
                      key={`${card.id}-${idx}`}
                      className={`w-[110px] h-[130px] rounded-xl shrink-0 p-2 flex flex-col items-center justify-between border transition-all duration-300 relative select-none ${
                        isWinnerTarget
                          ? 'scale-105 border-white ring-4 ring-cyan-400 bg-slate-900 shadow-[0_0_30px_rgba(6,182,212,0.8)] z-10'
                          : isCreator
                          ? 'border-cyan-500/40 bg-slate-900/80 shadow-[0_4px_12px_rgba(6,182,212,0.15)]'
                          : 'border-amber-500/40 bg-slate-900/80 shadow-[0_4px_12px_rgba(245,158,11,0.15)]'
                      }`}
                    >
                      {/* Player avatar & tag */}
                      <div className="w-full flex items-center justify-between">
                        <span
                          className={`text-[8px] font-black px-1.5 py-0.2 rounded ${
                            isCreator
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {isCreator ? 'BLUE' : 'GOLD'}
                        </span>
                        <span className="text-[8px] text-slate-500 font-mono">#{idx}</span>
                      </div>

                      {/* Gift Thumbnail */}
                      <div className="w-14 h-14 my-0.5 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          src={card.giftImageUrl}
                          alt={card.giftName}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Player Username */}
                      <div className="w-full text-center">
                        <span
                          className={`text-[10px] font-black truncate block ${
                            isCreator ? 'text-cyan-300' : 'text-amber-300'
                          }`}
                        >
                          {card.username}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spin Status or Outcome */}
            {isSpinning ? (
              <div className="text-xs font-black text-cyan-400 uppercase tracking-widest animate-pulse my-2 z-10">
                РУЛЕТКА КРУТИТСЯ... ОПРЕДЕЛЕНИЕ ПОБЕДИТЕЛЯ
              </div>
            ) : duelOutcome ? (
              <div className="w-full mt-2 animate-in zoom-in-95 z-10">
                {duelOutcome.isWon ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 mb-3 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                    <div className="text-sm font-black text-emerald-400 uppercase flex items-center justify-center gap-1.5">
                      <Trophy className="w-4 h-4 text-emerald-400" />
                      <span>ТЫ ПОБЕДИЛ В БИТВЕ!</span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1">
                      Стрелка остановилась на твоей карточке! Ты забираешь оба подарка (общая сумма $
                      {(
                        activeDuel.creator.gift.price + activeDuel.opponent.gift.price
                      ).toFixed(0)}
                      ).
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Roll: {duelOutcome.roll} | Seed Hash: {duelOutcome.serverSeedHash?.substring(0, 16)}...
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/50 mb-3 shadow-[0_0_25px_rgba(244,63,94,0.25)]">
                    <div className="text-sm font-black text-rose-400 uppercase">
                      ПОРАЖЕНИЕ В ДУЭЛИ
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Победил соперник <span className="font-bold text-amber-300">{duelOutcome.winnerUsername}</span>. Твой подарок перешел победителю.
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Roll: {duelOutcome.roll} | Seed Hash: {duelOutcome.serverSeedHash?.substring(0, 16)}...
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setActiveDuel(null);
                    setDuelOutcome(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-md shadow-cyan-500/30"
                >
                  Завершить и забрать выигрыш
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 2. DYNAMIC ODDS JOIN MODAL */}
      {joinModalRoom && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl glass-card border border-cyan-500/50 p-5 flex flex-col shadow-2xl relative">
            <button
              onClick={() => setJoinModalRoom(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Swords className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                Вступить в дуэль с {joinModalRoom.creatorUsername}
              </h3>
            </div>

            {/* Opponent's Gift Card */}
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                <img
                  src={joinModalRoom.creatorGift.imageUrl}
                  alt={joinModalRoom.creatorGift.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                  Подарок соперника
                </span>
                <div className="text-sm font-black text-slate-100">
                  {joinModalRoom.creatorGift.name}
                </div>
                <div className="text-xs font-mono font-black text-emerald-400">
                  ${joinModalRoom.creatorGift.price.toFixed(0)}
                </div>
              </div>
            </div>

            {/* Select User's Gift */}
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Выбери свой подарок для битвы ({inventory.length} доступно):
            </label>

            {inventory.length === 0 ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center my-2">
                У вас нет доступных подарков в инвентаре. Получите бесплатный подарок в каталоге!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 mb-3 scrollbar-thin">
                {inventory.map((item) => {
                  const isSelected = item.id === joinSelectedInventoryId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        sound.playTap();
                        setJoinSelectedInventoryId(item.id);
                      }}
                      className={`p-2 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                        isSelected
                          ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-950/40'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden my-0.5 shrink-0">
                        <img
                          src={item.gift.imageUrl}
                          alt={item.gift.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-200 truncate w-full">
                        {item.gift.name}
                      </span>
                      <span className="text-[9px] font-mono font-black text-emerald-400">
                        ${item.gift.price.toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dynamic Odds Preview Ratio */}
            {selectedJoinItem && (
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 my-2">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-cyan-400">
                    Соперник: {joinCreatorChance.toFixed(1)}%
                  </span>
                  <span className="text-amber-400 font-black">
                    Твой шанс: {joinMyChance.toFixed(1)}%
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-700/80 overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${joinCreatorChance}%` }}
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  />
                  <div
                    style={{ width: `${joinMyChance}%` }}
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-300"
                  />
                </div>

                <p className="text-[10px] text-slate-400 text-center mt-1.5">
                  Чем дороже твой подарок относительно соперника, тем выше шанс победить в CS2-рулетке!
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleConfirmJoin}
              disabled={isJoining || !joinSelectedInventoryId}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/25 active:scale-95 flex items-center justify-center gap-2 mt-2"
            >
              <Swords className="w-4 h-4" />
              <span>
                {isJoining
                  ? 'Подключение...'
                  : `Крутить рулетку (Твой шанс: ${joinMyChance.toFixed(1)}%)`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Hero Banner: PvP Case-Opening Duels */}
      <div className="p-4 rounded-3xl glass-card border border-tg-border/70 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> CS2 ROULETTE DUELS
            </span>
            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Provably Fair
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-100">
            Горизонтальная Рулетка Подарков
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-md">
            Шансы строго пропорциональны цене подарка. Любой подарок может войти в любую комнату!
          </p>
        </div>

        <button
          onClick={fetchRooms}
          className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-400 transition"
          title="Обновить список комнат"
        >
          <RefreshCw className={`w-4 h-4 ${loadingRooms ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Create Room Box */}
      <div className="p-4 rounded-3xl glass-card border border-cyan-500/30">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 mb-2 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-cyan-400" /> Создать свою битву
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          {/* Item selector from user inventory */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Твой подарок для битвы:
            </label>
            <select
              value={selectedInventoryId}
              onChange={(e) => setSelectedInventoryId(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="">-- Выберите предмет ({inventory.length} шт) --</option>
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.gift.name} (${item.gift.price.toFixed(0)})
                </option>
              ))}
            </select>
          </div>

          {/* Create Button */}
          <div>
            <button
              onClick={handleCreateRoom}
              disabled={isCreating || !selectedInventoryId}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20 active:scale-95"
            >
              {isCreating ? 'Создание...' : '⚔️ Создать дуэль в лобби'}
            </button>
          </div>
        </div>
      </div>

      {/* Active Rooms Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            Активные комнаты ({rooms.length})
          </span>
          <span className="text-[10px] text-slate-400">
            Вход с любым предметом
          </span>
        </div>

        {rooms.length === 0 ? (
          <div className="p-8 text-center glass-card rounded-3xl text-slate-500 text-xs">
            Нет открытых комнат. Создай первую прямо сейчас!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rooms.map((room) => {
              const isMyRoom = room.creatorUserId === user?.id;

              return (
                <div
                  key={room.id}
                  className="p-3.5 rounded-3xl glass-card border border-tg-border hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs">
                        {room.isBot ? '🤖' : '👤'}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-black text-slate-200">
                          {room.creatorUsername}
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {room.isBot ? 'Бот-соперник' : 'Игрок'}
                        </span>
                      </div>
                    </div>

                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full border bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
                      Дуэль
                    </span>
                  </div>

                  {/* Gift preview */}
                  <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-black/40 border border-white/5 my-2">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                      <img
                        src={room.creatorGift.imageUrl}
                        alt={room.creatorGift.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-200 truncate">
                        {room.creatorGift.name}
                      </div>
                      <div className="text-xs font-mono font-black text-emerald-400">
                        ${room.creatorGift.price.toFixed(0)}
                      </div>
                    </div>
                  </div>

                  {/* Action Button: Join or Call Bot */}
                  {isMyRoom ? (
                    <button
                      onClick={() => handleCallBot(room.id)}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>🤖 Вызвать бота (Сыграть)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenJoinModal(room)}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>Вступить (${room.creatorGift.price.toFixed(0)})</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

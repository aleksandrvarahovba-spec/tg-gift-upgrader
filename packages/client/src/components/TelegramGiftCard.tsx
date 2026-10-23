import React from 'react';
import { GiftDto } from '@upgrader/shared';

interface TelegramGiftCardProps {
  gift: GiftDto;
  serialNumber?: string;
  isSelected?: boolean;
  onClick?: () => void;
  chanceBadge?: { value: number; isValid: boolean };
  size?: 'sm' | 'md' | 'lg';
  actionButton?: React.ReactNode;
}

export const TelegramGiftCard: React.FC<TelegramGiftCardProps> = ({
  gift,
  serialNumber,
  isSelected = false,
  onClick,
  chanceBadge,
  size = 'md',
  actionButton,
}) => {
  const tonPrice = (gift.price / 5.2).toFixed(1);
  const displayMint = serialNumber || (gift.mintNumber ? `#${gift.mintNumber}` : gift.badge || '#1');

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl p-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between select-none group active:scale-[0.98] bg-slate-900/90 border ${
        isSelected
          ? 'border-cyan-400 ring-2 ring-cyan-400/60 shadow-[0_0_24px_rgba(6,182,212,0.35)]'
          : 'border-slate-800/90 hover:border-slate-700 hover:shadow-lg'
      }`}
    >
      {/* 1. Square Official Fragment NFT Container */}
      <div className="aspect-square w-full overflow-hidden rounded-xl relative bg-slate-950 flex items-center justify-center">
        <img
          src={gift.imageUrl}
          alt={gift.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
        />

        {/* Top-Left: Mint / Serial Badge */}
        <div className="absolute top-1.5 left-1.5 z-10">
          <span className="backdrop-blur-md bg-black/60 text-white/95 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-white/10 shadow-sm truncate max-w-[80px] block">
            {displayMint}
          </span>
        </div>

        {/* Top-Right: Chance Badge or Rarity Badge */}
        <div className="absolute top-1.5 right-1.5 z-10">
          {chanceBadge ? (
            <span
              className={`backdrop-blur-md text-[10px] font-mono font-black px-2 py-0.5 rounded-md border shadow-sm ${
                chanceBadge.isValid
                  ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/60'
                  : 'bg-rose-500/30 text-rose-300 border-rose-500/60'
              }`}
            >
              {chanceBadge.value.toFixed(1)}%
            </span>
          ) : gift.rarity ? (
            <span className="backdrop-blur-md bg-black/60 text-slate-300 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border border-white/10 shadow-sm">
              {gift.rarity}
            </span>
          ) : null}
        </div>
      </div>

      {/* 2. Gift Title */}
      <div className="w-full mt-2 px-0.5">
        <div className="truncate font-semibold text-white text-xs sm:text-sm tracking-tight text-left">
          {gift.name}
        </div>
      </div>

      {/* 3. Price Bar in One Single Row without wrapping */}
      <div className="w-full whitespace-nowrap flex items-center justify-between mt-1 px-0.5">
        <span className="font-bold font-mono text-emerald-400 text-xs sm:text-sm">
          ${gift.price.toFixed(gift.price < 10 ? 2 : 0)}
        </span>
        <span className="text-cyan-400/80 font-mono text-[10px] sm:text-[11px] font-medium">
          {tonPrice} TON
        </span>
      </div>

      {/* Optional action button (e.g. "Выбрать") */}
      {actionButton && <div className="w-full mt-2">{actionButton}</div>}
    </div>
  );
};

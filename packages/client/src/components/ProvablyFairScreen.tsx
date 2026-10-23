import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sound } from '../services/soundEngine';
import { Shield, CheckCircle, RefreshCw, Calculator, Hash, Lock, Check } from 'lucide-react';
import { verifyGameResult, ProvablyFairVerificationResult } from '@upgrader/shared';

export const ProvablyFairScreen: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Client seed editing
  const [editingClientSeed, setEditingClientSeed] = useState(user?.clientSeed || '');
  const [clientSeedSaved, setClientSeedSaved] = useState(false);

  // Calculator inputs
  const [calcServerSeed, setCalcServerSeed] = useState('');
  const [calcServerSeedHash, setCalcServerSeedHash] = useState('');
  const [calcClientSeed, setCalcClientSeed] = useState('');
  const [calcNonce, setCalcNonce] = useState('1');
  const [calcExpectedRoll, setCalcExpectedRoll] = useState('0');
  const [calcResult, setCalcResult] = useState<ProvablyFairVerificationResult | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await api.getHistory();
      setHistory(res.history);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClientSeed = async () => {
    if (!editingClientSeed.trim()) return;
    sound.playClick();
    try {
      await api.updateClientSeed(editingClientSeed.trim());
      await refreshUser();
      setClientSeedSaved(true);
      setTimeout(() => setClientSeedSaved(false), 2000);
    } catch (err) {
      alert('Ошибка при смене Client Seed');
    }
  };

  const handleSelectGameForVerification = (game: any) => {
    sound.playClick();
    setCalcServerSeed(game.serverSeed);
    setCalcServerSeedHash(game.serverSeedHash);
    setCalcClientSeed(game.clientSeed);
    setCalcNonce(game.nonce.toString());
    setCalcExpectedRoll(game.roll.toString());

    // Run client-side verification instantly!
    const result = verifyGameResult(
      game.serverSeed,
      game.serverSeedHash,
      game.clientSeed,
      game.nonce,
      game.roll
    );
    setCalcResult(result);
  };

  const handleRunManualVerification = () => {
    sound.playClick();
    const result = verifyGameResult(
      calcServerSeed,
      calcServerSeedHash,
      calcClientSeed,
      parseInt(calcNonce, 10) || 1,
      parseFloat(calcExpectedRoll) || 0
    );
    setCalcResult(result);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 pb-24 space-y-6">
      {/* Header Info */}
      <div className="p-6 rounded-3xl glass-card border border-emerald-500/30 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-100 uppercase tracking-wide">
              Provably Fair (Криптографическая честность)
            </h2>
            <p className="text-xs text-slate-400">
              Исход каждого броска предопределен математически до совершения ставки и не может быть изменен сервером.
            </p>
          </div>
        </div>

        {/* Current Active Commitment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {/* Active Server Seed Hash */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Хеш текущего Server Seed (Commitment):</span>
            </div>
            <div className="font-mono text-[11px] text-cyan-300 break-all select-all bg-slate-950 p-2 rounded-xl border border-slate-800/80">
              {user?.serverSeedHash || 'loading...'}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Секретный сид сервера уже захеширован и будет раскрыт сразу после вашего следующего броска!
            </p>
          </div>

          {/* Client Seed & Nonce */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
              <div className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ваш Client Seed (влияет на исход):</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Nonce: #{user?.nonce || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingClientSeed}
                onChange={(e) => setEditingClientSeed(e.target.value)}
                className="flex-1 py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleSaveClientSeed}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs active:scale-95 transition"
              >
                {clientSeedSaved ? <Check className="w-4 h-4" /> : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive In-Browser Verifier Calculator */}
      <div className="p-6 rounded-3xl glass-card border border-tg-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-extrabold text-slate-100">
              Интерактивный верификатор исходов
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Кликните на любую игру в таблице ниже для мгновенной проверки
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-400 mb-1 block">Server Seed (Hex):</label>
            <input
              type="text"
              value={calcServerSeed}
              onChange={(e) => setCalcServerSeed(e.target.value)}
              placeholder="Раскрытый серверный сид"
              className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 mb-1 block">Client Seed:</label>
            <input
              type="text"
              value={calcClientSeed}
              onChange={(e) => setCalcClientSeed(e.target.value)}
              placeholder="Клиентский сид"
              className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 mb-1 block">Nonce:</label>
            <input
              type="number"
              value={calcNonce}
              onChange={(e) => setCalcNonce(e.target.value)}
              placeholder="1"
              className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 mb-1 block">Ожидаемый Roll (%):</label>
            <input
              type="text"
              value={calcExpectedRoll}
              onChange={(e) => setCalcExpectedRoll(e.target.value)}
              placeholder="0.00"
              className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200"
            />
          </div>
        </div>

        <button
          onClick={handleRunManualVerification}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-bold text-xs uppercase tracking-wider active:scale-95 transition"
        >
          Запустить расчет HMAC-SHA256
        </button>

        {/* Verification Result Callout */}
        {calcResult && (
          <div
            className={`p-4 rounded-2xl border transition ${
              calcResult.isRollMatch && calcResult.isHashMatch
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>
                {calcResult.isRollMatch && calcResult.isHashMatch
                  ? 'ВЕРИФИКАЦИЯ ПРОЙДЕНА: ИСХОД НА 100% ПОДЛИННЫЙ!'
                  : 'ОШИБКА СОВПАДЕНИЯ ПАРАМЕТРОВ'}
              </span>
            </div>
            <div className="font-mono text-[11px] space-y-1 text-slate-300">
              <div>
                Вычисленный Roll: <span className="font-bold text-cyan-300">{calcResult.computedRoll.toFixed(4)}</span>
              </div>
              <div className="truncate">
                HMAC: <span className="text-slate-400">{calcResult.computedHmac}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="p-6 rounded-3xl glass-card border border-tg-border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-100">История ваших апгрейдов</h3>
          <button
            onClick={loadHistory}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Вы еще не совершили ни одного апгрейда.
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Исходный</th>
                  <th className="pb-2">Целевой</th>
                  <th className="pb-2">Шанс</th>
                  <th className="pb-2">Roll</th>
                  <th className="pb-2">Результат</th>
                  <th className="pb-2">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {history.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-1.5 font-sans">
                        <img src={g.sourceGift.imageUrl} alt="" className="w-5 h-5 object-contain" />
                        <span className="font-bold text-slate-300">{g.sourceGift.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-1.5 font-sans">
                        <img src={g.targetGift.imageUrl} alt="" className="w-5 h-5 object-contain" />
                        <span className="font-bold text-slate-300">{g.targetGift.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-cyan-400 font-bold">{g.chance.toFixed(2)}%</td>
                    <td className="py-2.5 text-slate-300">{g.roll.toFixed(2)}%</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          g.isWon
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {g.isWon ? 'ПОБЕДА' : 'СГОРЕЛ'}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <button
                        onClick={() => handleSelectGameForVerification(g)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-[10px] font-sans font-bold text-slate-400 transition"
                      >
                        Проверить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

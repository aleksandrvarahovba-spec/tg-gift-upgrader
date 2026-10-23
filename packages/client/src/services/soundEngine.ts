/**
 * Ultra-Pleasant Procedural ASMR / iOS Picker Wheel Sound Engine
 * Designed for 100+ spins without ear fatigue.
 * STRICTLY NO sawtooth, NO square waves, NO harsh high-frequency noise (>1000Hz).
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    try {
      const saved = localStorage.getItem('upgrader_sound_muted');
      if (saved !== null) {
        this.muted = saved === 'true';
      }
    } catch {
      this.muted = false;
    }
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('upgrader_sound_muted', String(this.muted));
    } catch {}
    if (!this.muted) {
      this.playTap();
    }
    return this.muted;
  }

  /**
   * 1. Soft Warm Velvet iOS Picker / Wooden Fidget Tick (ASMR)
   * Pure Sine + quiet Triangle through 850Hz Lowpass.
   * Dynamic pitch: 310Hz when fast -> 250Hz when decelerating.
   */
  public playTick(speedFactor: number = 0.5) {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const normalizedSpeed = Math.max(0, Math.min(1, speedFactor));

      // 310Hz when spinning fast, descending to 250Hz when stopping
      const startFreq = 250 + 60 * normalizedSpeed;
      const endFreq = 115 * (startFreq / 290);

      // Master lowpass filter @ 850Hz for warm wooden acoustic feel
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(850, now);
      lpf.Q.setValueAtTime(1.0, now);
      lpf.connect(ctx.destination);

      // Primary Body: Pure Sine Wave
      const sineOsc = ctx.createOscillator();
      sineOsc.type = 'sine';
      sineOsc.frequency.setValueAtTime(startFreq, now);
      sineOsc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + 0.032);

      const sineGain = ctx.createGain();
      sineGain.gain.setValueAtTime(0.0001, now);
      sineGain.gain.linearRampToValueAtTime(0.14, now + 0.004);
      sineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      sineOsc.connect(sineGain);
      sineGain.connect(lpf);

      // Subtle warm undertone: Quiet Triangle Wave
      const triOsc = ctx.createOscillator();
      triOsc.type = 'triangle';
      triOsc.frequency.setValueAtTime(startFreq * 0.75, now);
      triOsc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq * 0.75), now + 0.028);

      const triGain = ctx.createGain();
      triGain.gain.setValueAtTime(0.0001, now);
      triGain.gain.linearRampToValueAtTime(0.035, now + 0.003);
      triGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      triOsc.connect(triGain);
      triGain.connect(lpf);

      sineOsc.start(now);
      sineOsc.stop(now + 0.04);
      triOsc.start(now);
      triOsc.stop(now + 0.04);
    } catch {}
  }

  /**
   * 2. Spin Start:
   * Gentle, warm sub whoosh without harsh noise.
   */
  public playSpinStart() {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.34);
    } catch {}
  }

  /**
   * 3. Win:
   * Soft Pentatonic Kalimba / Harp Arpeggio:
   * C4 (261.63Hz) -> E4 (329.63Hz) -> G4 (392.00Hz) -> B4 (493.88Hz) -> D5 (587.33Hz)
   * 65ms note delay, pure sine through lowpass 1400Hz, 0.015s attack, 0.9s tail.
   */
  public playWin() {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.0, 493.88, 587.33]; // C4, E4, G4, B4, D5

      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(1400, now);
      lpf.connect(ctx.destination);

      notes.forEach((freq, idx) => {
        const noteStart = now + idx * 0.065;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.linearRampToValueAtTime(0.15, noteStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.9);

        osc.connect(gain);
        gain.connect(lpf);

        osc.start(noteStart);
        osc.stop(noteStart + 0.95);
      });
    } catch {}
  }

  /**
   * 4. Loss:
   * Extremely gentle, velvety bass breath:
   * Sine 130Hz -> 55Hz over 0.28s, peak volume 0.14, warm and non-intrusive.
   */
  public playLoss() {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(220, now);
      lpf.connect(ctx.destination);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.28);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      osc.connect(gain);
      gain.connect(lpf);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  /**
   * 5. UI Velvet Tap:
   * Quiet acoustic click for iOS/Telegram feel (0.015s, pure sine 360Hz -> 140Hz, gain 0.07).
   */
  public playTap() {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.015);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.02);
    } catch {}
  }

  public playClick() {
    this.playTap();
  }

  /**
   * 6. Coinflip Sound:
   * Delightful gold coin flick and shimmer for PvP battles.
   */
  public playCoinFlip() {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(1800, now);
      lpf.connect(ctx.destination);

      // Gold coin ping 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.linearRampToValueAtTime(0.09, now + 0.005);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(lpf);
      osc1.start(now);
      osc1.stop(now + 0.38);

      // Second harmonic shimmer
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, now + 0.04); // E6
      gain2.gain.setValueAtTime(0.0001, now + 0.04);
      gain2.gain.linearRampToValueAtTime(0.06, now + 0.045);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc2.connect(gain2);
      gain2.connect(lpf);
      osc2.start(now + 0.04);
      osc2.stop(now + 0.48);
    } catch {}
  }
}

export const sound = new SoundEngine();

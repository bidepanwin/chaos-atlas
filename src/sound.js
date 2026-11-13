const TAU = Math.PI * 2;

const ROOTS = { lorenz: 146.83, flow: 196, life: 174.61 };
const SCALES = {
  lorenz: [0, 3, 7, 10, 14, 17, 21],
  flow: [0, 2, 5, 7, 9, 12, 14],
  life: [0, 3, 5, 7, 10, 12, 15],
};

const midiToFrequency = (root, semitones) => root * 2 ** (semitones / 12);

/**
 * Small, user-started Web Audio instrument for the observatory.
 * It deliberately has no audio file or network dependency: notes are short,
 * soft oscillators and a quiet drone, shaped by the live simulation activity.
 */
export class ObservatorySound {
  constructor({ onAvailability } = {}) {
    this.onAvailability = typeof onAvailability === 'function' ? onAvailability : () => {};
    this.context = null;
    this.master = null;
    this.filter = null;
    this.compressor = null;
    this.timer = null;
    this.drone = null;
    this.scene = 'lorenz';
    this.activity = 0.2;
    this.elapsed = 0;
    this.volume = 0.38;
    this.enabled = false;
    this.muted = false;
    this.step = 0;
    this._available = true;
  }

  get available() {
    return this._available && Boolean(globalThis.AudioContext || globalThis.webkitAudioContext);
  }

  async enable() {
    if (!this.available) {
      this._available = false;
      this.onAvailability(false);
      return false;
    }
    try {
      if (!this.context) this._createGraph();
      await this.context.resume();
      this.enabled = true;
      this._startDrone();
      this._scheduleNext(0.04);
      this.onAvailability(true);
      return true;
    } catch (error) {
      console.warn('Observatory sound unavailable:', error);
      this._available = false;
      this.onAvailability(false);
      return false;
    }
  }

  _createGraph() {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.filter = this.context.createBiquadFilter();
    this.compressor = this.context.createDynamicsCompressor();
    this.master.gain.value = this.volume;
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 2800;
    this.filter.Q.value = 0.7;
    this.compressor.threshold.value = -28;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.015;
    this.compressor.release.value = 0.25;
    this.master.connect(this.filter).connect(this.compressor).connect(this.context.destination);
  }

  _startDrone() {
    if (this.drone || !this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = ROOTS[this.scene] / 2;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 1.8);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    this.drone = { oscillator, gain };
  }

  _scheduleNext(delay = 0.55) {
    clearTimeout(this.timer);
    if (!this.enabled || !this.context) return;
    this.timer = setTimeout(() => {
      this._playStep();
      this._scheduleNext(0.42 + (1 - this.activity) * 0.34);
    }, Math.max(40, delay * 1000));
  }

  _playStep() {
    if (!this.enabled || this.muted || !this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime + 0.015;
    const scale = SCALES[this.scene] || SCALES.lorenz;
    const index = (this.step * 2 + Math.floor(this.elapsed * 3)) % scale.length;
    const octave = this.scene === 'flow' ? 12 : (this.step % 5 === 0 ? 0 : 12);
    const frequency = midiToFrequency(ROOTS[this.scene], scale[index] + octave);
    const duration = 0.2 + this.activity * 0.16;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const voice = this.context.createBiquadFilter();
    oscillator.type = this.scene === 'life' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.detune.setValueAtTime((this.activity - 0.5) * 18, now);
    voice.type = 'lowpass';
    voice.frequency.setValueAtTime(900 + this.activity * 2800, now);
    voice.Q.value = 0.45;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055 + this.activity * 0.04, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(voice).connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
    this.step += 1;
  }

  setScene(scene) {
    this.scene = scene;
    if (this.drone && this.context) {
      const now = this.context.currentTime;
      this.drone.oscillator.frequency.setTargetAtTime(ROOTS[scene] / 2, now, 0.4);
    }
  }

  setStats({ activity = 0, elapsed = 0 } = {}) {
    this.activity = Math.max(0.05, Math.min(1, Number(activity) || 0));
    this.elapsed = Number(elapsed) || 0;
    if (this.filter && this.context) this.filter.frequency.setTargetAtTime(1800 + this.activity * 2600, this.context.currentTime, 0.15);
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, 0.04);
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, 0.04);
  }

  async toggleMute() {
    if (!this.enabled) return this.enable();
    this.setMuted(!this.muted);
    return !this.muted;
  }

  suspend() {
    if (this.context?.state === 'running') this.context.suspend();
  }

  resume() {
    if (this.enabled && this.context?.state === 'suspended') this.context.resume();
  }

  destroy() {
    clearTimeout(this.timer);
    if (this.drone) {
      try { this.drone.oscillator.stop(); } catch { /* Already stopped. */ }
      this.drone = null;
    }
    if (this.context) this.context.close();
    this.context = null;
    this.enabled = false;
  }
}

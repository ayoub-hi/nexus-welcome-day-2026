let ctx = null;

function audioCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone({ freq = 880, start = 0, duration = 0.1, volume = 0.12, type = "sine" } = {}) {
  const ac = audioCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const t = ac.currentTime + start;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

export const sounds = {
  click() {
    tone({ freq: 620, duration: 0.06, volume: 0.08, type: "triangle" });
  },

  answer() {
    tone({ freq: 740, duration: 0.09, volume: 0.09, type: "triangle" });
    tone({ freq: 1108, start: 0.06, duration: 0.1, volume: 0.06, type: "sine" });
  },

  start() {
    tone({ freq: 523.25, duration: 0.12, volume: 0.1, type: "square" });
    tone({ freq: 659.25, start: 0.12, duration: 0.12, volume: 0.1, type: "square" });
    tone({ freq: 783.99, start: 0.24, duration: 0.22, volume: 0.1, type: "square" });
  },

  minute() {
    tone({ freq: 392, duration: 0.14, volume: 0.12, type: "sine" });
    tone({ freq: 392, start: 0.18, duration: 0.2, volume: 0.09, type: "sine" });
  },

  // "final minute" - an urgent descending alert motif
  lastMinute() {
    tone({ freq: 659.25, duration: 0.15, volume: 0.12, type: "sawtooth" });
    tone({ freq: 554.37, start: 0.18, duration: 0.15, volume: 0.11, type: "sawtooth" });
    tone({ freq: 440, start: 0.36, duration: 0.26, volume: 0.12, type: "sawtooth" });
  },

  // per-second pressure tick inside the final minute; pitch rises as time runs out
  tick(remaining = 60) {
    const urgency = Math.max(0, Math.min(60, remaining));
    const freq = 400 + Math.round((60 - urgency) * 7);
    tone({ freq, duration: 0.055, volume: 0.055, type: "sine" });
  },

  beep() {
    tone({ freq: 880, duration: 0.08, volume: 0.09, type: "sine" });
  },

  // leaderboard single reveal; pitch climbs with the rank being shown
  reveal(rank = 1) {
    const step = Math.max(0, Math.min(10, rank - 1));
    const f = 392 * Math.pow(2, step / 6);
    tone({ freq: f, duration: 0.16, volume: 0.11, type: "triangle" });
    tone({ freq: f * 1.5, start: 0.1, duration: 0.14, volume: 0.07, type: "sine" });
  },

  // ascending fanfare for the champion reveal
  champion() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      tone({ freq: f, start: i * 0.14, duration: 0.2, volume: 0.12, type: "square" });
      tone({ freq: f * 2, start: i * 0.14, duration: 0.16, volume: 0.05, type: "sine" });
    });
    tone({ freq: 1318.51, start: 0.56, duration: 0.55, volume: 0.1, type: "sine" });
    tone({ freq: 1760, start: 0.56, duration: 0.45, volume: 0.05, type: "sine" });
  },

  timeUp() {
    tone({ freq: 440, duration: 0.2, volume: 0.14, type: "sawtooth" });
    tone({ freq: 330, start: 0.2, duration: 0.3, volume: 0.14, type: "sawtooth" });
    tone({ freq: 220, start: 0.5, duration: 0.42, volume: 0.12, type: "sawtooth" });
  },
};
let ctx = null;

function audioCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone({ freq = 440, start = 0, duration = 0.1, volume = 0.1, type = "sine" } = {}) {
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
    tone({ freq: 300, duration: 0.06, volume: 0.06, type: "square" });
  },

  answer() {
    tone({ freq: 400, duration: 0.09, volume: 0.08, type: "sawtooth" });
    tone({ freq: 600, start: 0.06, duration: 0.1, volume: 0.05, type: "sine" });
  },

  start() {
    tone({ freq: 220, duration: 0.12, volume: 0.1, type: "sawtooth" });
    tone({ freq: 277.18, start: 0.12, duration: 0.12, volume: 0.1, type: "sawtooth" });
    tone({ freq: 329.63, start: 0.24, duration: 0.3, volume: 0.1, type: "sawtooth" });
  },

  minute() {
    tone({ freq: 200, duration: 0.15, volume: 0.15, type: "square" });
    tone({ freq: 200, start: 0.2, duration: 0.25, volume: 0.1, type: "square" });
  },

  // "final minute" - darker, ominous motif
  lastMinute() {
    tone({ freq: 329.63, duration: 0.2, volume: 0.15, type: "square" });
    tone({ freq: 277.18, start: 0.25, duration: 0.2, volume: 0.12, type: "square" });
    tone({ freq: 220, start: 0.5, duration: 0.35, volume: 0.15, type: "square" });
  },

  // per-second pressure tick inside the final minute; pitched down for dark vibe
  tick(remaining = 60) {
    const urgency = Math.max(0, Math.min(60, remaining));
    const freq = 150 + Math.round((60 - urgency) * 3);
    tone({ freq, duration: 0.05, volume: 0.08, type: "sawtooth" });
  },

  beep() {
    tone({ freq: 440, duration: 0.1, volume: 0.08, type: "square" });
  },

  // leaderboard single reveal; dark escalation
  reveal(rank = 1) {
    const step = Math.max(0, Math.min(10, rank - 1));
    const f = 220 * Math.pow(2, step / 12);
    tone({ freq: f, duration: 0.2, volume: 0.1, type: "sawtooth" });
    tone({ freq: f * 1.5, start: 0.15, duration: 0.2, volume: 0.05, type: "sine" });
  },

  // distorted fanfare for the champion reveal
  champion() {
    const notes = [220, 277.18, 329.63, 440];
    notes.forEach((f, i) => {
      tone({ freq: f, start: i * 0.18, duration: 0.25, volume: 0.12, type: "sawtooth" });
      tone({ freq: f * 1.5, start: i * 0.18, duration: 0.2, volume: 0.06, type: "square" });
    });
    tone({ freq: 554.37, start: 0.72, duration: 0.6, volume: 0.12, type: "sawtooth" });
    tone({ freq: 740, start: 0.72, duration: 0.5, volume: 0.08, type: "sine" });
  },

  timeUp() {
    tone({ freq: 110, duration: 0.3, volume: 0.2, type: "sawtooth" });
    tone({ freq: 100, start: 0.3, duration: 0.3, volume: 0.2, type: "sawtooth" });
    tone({ freq: 90, start: 0.6, duration: 0.5, volume: 0.2, type: "sawtooth" });
  },
};
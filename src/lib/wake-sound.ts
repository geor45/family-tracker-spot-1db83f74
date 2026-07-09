// Plays a loud attention-grabbing alarm using the Web Audio API.
// No asset needed — synthesized on the fly.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

export async function playWakeSound(durationSec = 4) {
  try {
    const ac = getCtx();
    const now = ac.currentTime;
    const gain = ac.createGain();
    gain.gain.value = 0.0001;
    gain.connect(ac.destination);

    // Two detuned square oscillators for a siren feel
    const osc1 = ac.createOscillator();
    const osc2 = ac.createOscillator();
    osc1.type = "square";
    osc2.type = "square";
    osc1.connect(gain);
    osc2.connect(gain);

    // Siren sweep 500Hz <-> 1200Hz repeating
    const steps = Math.max(1, Math.round(durationSec * 4));
    for (let i = 0; i < steps; i++) {
      const t = now + i * 0.25;
      const high = i % 2 === 0;
      osc1.frequency.setValueAtTime(high ? 1200 : 500, t);
      osc2.frequency.setValueAtTime(high ? 1210 : 510, t);
    }

    // Envelope
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.4, now + 0.05);
    gain.gain.setValueAtTime(0.4, now + durationSec - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + durationSec);
    osc2.stop(now + durationSec);

    // Vibrate if supported (mobile)
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate([400, 150, 400, 150, 400, 150, 800]);
      } catch {
        /* ignore */
      }
    }
  } catch (e) {
    console.warn("Wake sound failed:", e);
  }
}

// Call once from a user gesture (e.g. app load click) so mobile browsers
// allow the AudioContext to run for later incoming signals.
export function primeWakeSound() {
  try {
    const ac = getCtx();
    void ac.resume().catch(() => {});
  } catch {
    /* ignore */
  }
}

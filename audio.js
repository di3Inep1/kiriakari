/* Original, locally synthesized ambient score. No requests or audio downloads. */
(function (root) {
  'use strict';
  let context = null, bus = null, timer = null, step = 0, echo = false;
  const notes = [0, 7, 10, 14, 19, 14, 10, 7, 3, 10, 14, 19, 22, 19, 14, 7];
  const Sound = { enabled: false,
    async setEnabled(enabled) {
      if (!enabled) {
        this.enabled = false;
        clearInterval(timer); timer = null;
        if (context) await context.suspend().catch(() => {});
        return false;
      }
      const Audio = root.AudioContext || root.webkitAudioContext;
      if (!Audio) return false;
      try {
        if (!context) {
          context = new Audio(); bus = context.createGain(); bus.gain.value = .16; bus.connect(context.destination);
        }
        await context.resume(); this.enabled = true;
        if (!timer) { this.tick(); timer = setInterval(() => this.tick(), 1700); }
        return true;
      } catch { this.enabled = false; return false; }
    },
    tone(frequency, duration = 1.2, gain = .15, delay = 0, type = 'sine') {
      if (!this.enabled || !context) return;
      const now = context.currentTime + delay;
      const osc = context.createOscillator(), amp = context.createGain();
      osc.type = type; osc.frequency.value = frequency;
      amp.gain.setValueAtTime(0, now);
      amp.gain.linearRampToValueAtTime(gain, now + .04);
      amp.gain.exponentialRampToValueAtTime(.0001, now + duration);
      osc.connect(amp); amp.connect(bus); osc.start(now); osc.stop(now + duration + .1);
      osc.onended = () => { osc.disconnect(); amp.disconnect(); };
    },
    tick() {
      if (document.hidden) return;
      const pitch = notes[(step++) % notes.length];
      const frequency = 220 * 2 ** (pitch / 12);
      this.tone(frequency, 3.6, .12);
      this.tone(frequency * .5, 4.8, .11, .25);
      if (echo) this.tone(frequency * 2, 2.8, .04, .5);
      if (step % 4 === 0) this.tone(110, 6, .12);
    },
    phase(value) { echo = value; this.tone(echo ? 659.25 : 440, 2, .16); },
    chime() { [0, 4, 7, 12].forEach((note, i) => this.tone(440 * 2 ** (note / 12), 2.8, .15, i * .16)); },
    click() { this.tone(880, .12, .06); }
  };
  document.addEventListener('visibilitychange', () => {
    if (!context) return;
    if (document.hidden) context.suspend().catch(() => {});
    else if (Sound.enabled) context.resume().catch(() => {});
  });
  root.KiriSound = Sound;
})(globalThis);

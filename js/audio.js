// Sons synthétisés (WebAudio) — aucun fichier externe
G.Audio = (function () {
  let ctx = null, master = null, noiseBuf = null;
  let volume = 0.6;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }

  function setVolume(v) { volume = v; if (master) master.gain.value = v; }

  function noise(dur, freq, q, gain, type = 'lowpass', attack = 0.002) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  function tone(freq, dur, gain, type = 'square', slideTo = null, delay = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  const S = {
    shot(kind) {
      if (kind === 'shotgun') { noise(0.35, 1800, 0.7, 0.9); tone(90, 0.2, 0.5, 'sine', 40); }
      else if (kind === 'sniper') { noise(0.5, 2600, 0.6, 1.0); tone(70, 0.35, 0.6, 'sine', 30); }
      else if (kind === 'energy') { tone(900, 0.25, 0.25, 'sawtooth', 120); tone(1400, 0.15, 0.15, 'square', 300); }
      else if (kind === 'lmg') { noise(0.16, 2000, 0.8, 0.7); tone(110, 0.1, 0.3, 'sine', 50); }
      else if (kind === 'smg') { noise(0.1, 3200, 0.8, 0.5); }
      else { noise(0.14, 2600, 0.8, 0.6); tone(140, 0.08, 0.25, 'sine', 60); }
    },
    empty() { tone(1800, 0.03, 0.15, 'square'); },
    reload() { tone(400, 0.05, 0.15, 'square', 300); tone(600, 0.05, 0.15, 'square', 500, 0.25); },
    hit() { tone(1200, 0.04, 0.12, 'square', 900); },
    headshot() { tone(1700, 0.06, 0.16, 'square', 1300); },
    kill() { noise(0.12, 700, 1, 0.3); },
    hurt() { tone(220, 0.15, 0.3, 'sawtooth', 120); noise(0.1, 500, 1, 0.3); },
    groan() { const f = G.rand(70, 120); tone(f, G.rand(0.5, 0.9), 0.07, 'sawtooth', f * 0.7); },
    buy() { tone(660, 0.08, 0.2, 'square'); tone(990, 0.12, 0.2, 'square', null, 0.08); },
    deny() { tone(160, 0.2, 0.25, 'square', 120); },
    powerup() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.15, 0.18, 'triangle', null, i * 0.07)); },
    waveStart() { [196, 233, 196, 147].forEach((f, i) => tone(f, 0.5, 0.22, 'sawtooth', null, i * 0.32)); },
    waveEnd() { [392, 523, 659].forEach((f, i) => tone(f, 0.35, 0.2, 'triangle', null, i * 0.15)); },
    boss() { tone(55, 2.0, 0.5, 'sawtooth', 40); tone(82, 2.0, 0.35, 'square', 60, 0.2); noise(1.5, 300, 1, 0.4); },
    explosion() { noise(0.9, 600, 0.5, 1.0); tone(60, 0.6, 0.7, 'sine', 25); },
    slam() { noise(0.6, 250, 0.5, 1.0); tone(45, 0.5, 0.8, 'sine', 25); },
    spit() { noise(0.25, 900, 2, 0.35, 'bandpass'); },
    melee() { noise(0.12, 1200, 1, 0.4, 'bandpass'); },
    gameOver() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.6, 0.25, 'triangle', null, i * 0.35)); },
    rankUp() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.25, 0.2, 'triangle', null, i * 0.1)); },
    click() { tone(900, 0.03, 0.1, 'square'); },
    step() { noise(0.06, 400, 1, 0.08); },
  };

  return { init, setVolume, S };
})();

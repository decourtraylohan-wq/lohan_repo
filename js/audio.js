// Sons synthétisés (WebAudio) : couches multiples, réverbération et spatialisation
G.Audio = (function () {
  let ctx = null, master = null, dry = null, wet = null, noiseBuf = null, brownBuf = null;
  let volume = 0.6;
  const listener = { x: 0, y: 0, z: 0, yaw: 0 };
  let ambient = null;

  function makeImpulse(sec, decay) {
    const len = ctx.sampleRate * sec, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  }
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = volume;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ctx.destination);
      dry = ctx.createGain(); dry.connect(master);
      const conv = ctx.createConvolver(); conv.buffer = makeImpulse(1.6, 3);
      wet = ctx.createGain(); wet.gain.value = 0.22; wet.connect(conv); conv.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      brownBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const b = brownBuf.getChannelData(0); let last = 0;
      for (let i = 0; i < b.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
    } catch (e) { ctx = null; }
  }
  function setVolume(v) { volume = v; if (master) master.gain.value = v; }
  function setListener(x, y, z, yaw) { listener.x = x; listener.y = y; listener.z = z; listener.yaw = yaw; }

  // sortie : gain + panoramique selon la position (null = son du joueur)
  function out(pos, gain, reverb = 0.25) {
    const g = ctx.createGain();
    let vol = gain, pan = 0;
    if (pos) {
      const dx = pos.x - listener.x, dz = pos.z - listener.z, dy = (pos.y || 0) - listener.y;
      const d = Math.hypot(dx, dy, dz);
      vol *= 1 / (1 + d * 0.09);
      const a = Math.atan2(dx, dz) - (listener.yaw + Math.PI);
      pan = G.clamp(-Math.sin(a), -1, 1) * Math.min(1, d / 3);
      reverb += Math.min(0.5, d * 0.015);
    }
    g.gain.value = vol;
    let node = g;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    node.connect(dry);
    if (reverb > 0) { const s = ctx.createGain(); s.gain.value = reverb; node.connect(s); s.connect(wet); }
    return g;
  }

  function noise(dest, dur, freq, q, gain, type = 'lowpass', attack = 0.002, delay = 0, buf = noiseBuf, sweepTo = null) {
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 1.0); src.stop(t + dur + 0.05);
  }
  function tone(dest, freq, dur, gain, type = 'square', slideTo = null, delay = 0, attack = 0.005) {
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }
  // détonation en 4 couches : claquement, corps, grave, queue
  function gun(dest, p) {
    noise(dest, 0.03, 6000, 0.7, p.crack, 'highpass');
    noise(dest, p.body, p.bodyF, 0.8, p.bodyG, 'lowpass', 0.001, 0, noiseBuf, p.bodyF * 0.25);
    tone(dest, p.thump, p.thumpD, p.thumpG, 'sine', 30);
    noise(dest, p.tail, 900, 0.6, p.tailG, 'lowpass', 0.01, 0.02, brownBuf);
    if (p.mech) tone(dest, 2400, 0.03, 0.05, 'square', 1800, 0.06);
  }
  const GUNS = {
    pistol: { crack: 0.5, body: 0.12, bodyF: 4200, bodyG: 0.7, thump: 150, thumpD: 0.1, thumpG: 0.45, tail: 0.35, tailG: 0.25, mech: true },
    smg: { crack: 0.4, body: 0.08, bodyF: 5000, bodyG: 0.55, thump: 170, thumpD: 0.07, thumpG: 0.3, tail: 0.22, tailG: 0.18 },
    rifle: { crack: 0.6, body: 0.13, bodyF: 3800, bodyG: 0.8, thump: 110, thumpD: 0.12, thumpG: 0.6, tail: 0.5, tailG: 0.3 },
    shotgun: { crack: 0.7, body: 0.3, bodyF: 2400, bodyG: 1.0, thump: 80, thumpD: 0.25, thumpG: 0.9, tail: 0.8, tailG: 0.45 },
    sniper: { crack: 0.9, body: 0.35, bodyF: 3000, bodyG: 1.0, thump: 60, thumpD: 0.35, thumpG: 1.0, tail: 1.3, tailG: 0.55 },
    magnum: { crack: 0.8, body: 0.25, bodyF: 3200, bodyG: 0.9, thump: 90, thumpD: 0.22, thumpG: 0.8, tail: 0.9, tailG: 0.4 },
    lmg: { crack: 0.55, body: 0.14, bodyF: 3200, bodyG: 0.8, thump: 95, thumpD: 0.13, thumpG: 0.65, tail: 0.5, tailG: 0.3 },
  };

  const S = {
    shot(kind) {
      if (!ctx) return;
      if (kind === 'energy') { const d = out(null, 0.8, 0.4); tone(d, 1200, 0.3, 0.25, 'sawtooth', 90); tone(d, 2200, 0.15, 0.12, 'square', 400); noise(d, 0.25, 3000, 3, 0.3, 'bandpass', 0.002, 0, noiseBuf, 300); return; }
      gun(out(null, 0.9, 0.3), GUNS[kind] || GUNS.pistol);
    },
    shotAt(kind, pos) { if (!ctx) return; gun(out(pos, 0.9, 0.35), GUNS[kind] || GUNS.rifle); },
    whizz() { if (!ctx) return; const d = out(null, 0.5, 0); noise(d, 0.12, 2500, 6, 0.4, 'bandpass', 0.01, 0, noiseBuf, 700); },
    impact() { if (!ctx) return; noise(out(null, 0.3, 0.1), 0.05, 1800, 2, 0.4, 'bandpass'); },
    empty() { if (!ctx) return; tone(out(null, 0.5, 0), 1800, 0.03, 0.15, 'square'); },
    reload(pos) {
      if (!ctx) return;
      const d = out(pos || null, 0.7, 0.05);
      noise(d, 0.05, 2500, 4, 0.35, 'bandpass'); tone(d, 300, 0.04, 0.12, 'square', 200);
      noise(d, 0.06, 1800, 5, 0.4, 'bandpass', 0.002, 0.35); tone(d, 500, 0.05, 0.15, 'square', 900, 0.38);
      noise(d, 0.04, 3500, 6, 0.4, 'bandpass', 0.002, 0.6);
    },
    hit() { if (!ctx) return; const d = out(null, 0.6, 0); noise(d, 0.06, 900, 1.5, 0.35, 'lowpass'); tone(d, 1300, 0.04, 0.08, 'triangle', 900); },
    headshot() { if (!ctx) return; const d = out(null, 0.6, 0.1); tone(d, 2100, 0.12, 0.18, 'sine', 1900); tone(d, 3150, 0.08, 0.08, 'sine'); noise(d, 0.07, 1200, 2, 0.35); },
    kill() { if (!ctx) return; const d = out(null, 0.5, 0.1); noise(d, 0.18, 600, 1, 0.35, 'lowpass', 0.002, 0, brownBuf); },
    hurt() { if (!ctx) return; const d = out(null, 0.8, 0.05); noise(d, 0.15, 500, 1, 0.5, 'lowpass', 0.002, 0, brownBuf); tone(d, 160, 0.18, 0.25, 'sawtooth', 90); },
    heartbeat(k = 1) { if (!ctx) return; const d = out(null, 0.7 * k, 0); tone(d, 55, 0.12, 0.6, 'sine', 40); tone(d, 50, 0.12, 0.45, 'sine', 38, 0.2); noise(d, 0.08, 120, 1, 0.3 * k, 'lowpass', 0.003, 0, brownBuf); },
    // mort du joueur : impact sourd, souffle qui s'éteint, puis une petite musique triste (accords et mélodie)
    playerDeath() {
      if (!ctx) return;
      const d = out(null, 1.0, 0.6);
      noise(d, 0.5, 260, 0.8, 0.9, 'lowpass', 0.003, 0, brownBuf, 60); tone(d, 70, 0.9, 0.7, 'sine', 30);
      tone(d, 52, 0.3, 0.5, 'sine', 38, 0.55); tone(d, 46, 0.4, 0.35, 'sine', 32, 1.0);
      const m = out(null, 0.55, 0.9), t0 = 1.3;
      const pad = (freqs, at, dur) => freqs.forEach((f) => { tone(m, f, dur, 0.07, 'triangle', null, at, 0.5); tone(m, f * 1.003, dur, 0.04, 'sine', null, at, 0.6); });
      pad([220, 261.6, 329.6], t0, 2.0);          // la mineur
      pad([174.6, 220, 261.6], t0 + 1.8, 2.0);    // fa
      pad([130.8, 196, 261.6], t0 + 3.6, 2.0);    // do
      pad([146.8, 196, 246.9], t0 + 5.4, 2.6);    // sol (suspendu)
      [[659.3, 0], [587.3, 0.6], [523.3, 1.2], [440, 1.8], [523.3, 2.7], [493.9, 3.3], [440, 3.9], [392, 4.5], [440, 5.4]].forEach(([f, at]) => tone(m, f, at === 5.4 ? 2.4 : 0.85, 0.09, 'sine', f * 0.995, t0 + at, 0.04));
    },
    groan(pos) {
      if (!ctx) return; const d = out(pos, 0.5, 0.3);
      const f = G.rand(70, 120), dur = G.rand(0.6, 1.1);
      tone(d, f, dur, 0.18, 'sawtooth', f * 0.65, 0, 0.08);
      noise(d, dur, f * 6, 4, 0.12, 'bandpass', 0.08, 0, brownBuf, f * 3);
    },
    growl(pos) { if (!ctx) return; const d = out(pos, 0.7, 0.3); tone(d, 90, 0.5, 0.3, 'sawtooth', 60); noise(d, 0.5, 400, 3, 0.3, 'bandpass', 0.02, 0, brownBuf); },
    screamCharge(pos) { if (!ctx) return; const d = out(pos, 0.6, 0.4); tone(d, 300, 1.0, 0.12, 'sawtooth', 900, 0, 0.3); },
    scream() { if (!ctx) return; const d = out(null, 0.8, 0.6); tone(d, 900, 1.0, 0.25, 'sawtooth', 1400); tone(d, 1350, 1.0, 0.18, 'square', 1800); noise(d, 1.0, 3000, 2, 0.4, 'bandpass'); },
    buy() { if (!ctx) return; const d = out(null, 0.6, 0.2); tone(d, 660, 0.08, 0.2, 'triangle'); tone(d, 990, 0.14, 0.2, 'triangle', null, 0.08); noise(d, 0.08, 4000, 3, 0.15, 'bandpass', 0.002, 0.1); },
    deny() { if (!ctx) return; tone(out(null, 0.6, 0), 160, 0.22, 0.25, 'square', 120); },
    powerup() { if (!ctx) return; const d = out(null, 0.6, 0.5); [523, 659, 784, 1046].forEach((f, i) => tone(d, f, 0.25, 0.16, 'triangle', null, i * 0.07)); },
    waveStart() { if (!ctx) return; const d = out(null, 0.8, 0.6); [98, 116, 98, 73].forEach((f, i) => { tone(d, f, 0.9, 0.25, 'sawtooth', null, i * 0.4, 0.05); tone(d, f * 2, 0.9, 0.1, 'triangle', null, i * 0.4, 0.05); }); noise(d, 2, 200, 1, 0.3, 'lowpass', 0.5, 0, brownBuf); },
    waveEnd() { if (!ctx) return; const d = out(null, 0.7, 0.6); [392, 523, 659, 784].forEach((f, i) => tone(d, f, 0.5, 0.15, 'triangle', null, i * 0.14)); },
    boss() { if (!ctx) return; const d = out(null, 1, 0.7); tone(d, 55, 2.2, 0.5, 'sawtooth', 38); tone(d, 82, 2.0, 0.3, 'square', 60, 0.2); noise(d, 1.8, 250, 1, 0.5, 'lowpass', 0.2, 0, brownBuf); },
    explosion(pos) { if (!ctx) return; const d = out(pos || null, 1.2, 0.5); noise(d, 0.08, 5000, 0.7, 0.8, 'highpass'); noise(d, 1.4, 900, 0.5, 1.0, 'lowpass', 0.003, 0, brownBuf, 120); tone(d, 55, 0.8, 0.9, 'sine', 22); },
    slam() { if (!ctx) return; const d = out(null, 1, 0.5); noise(d, 0.7, 300, 0.5, 1.0, 'lowpass', 0.003, 0, brownBuf); tone(d, 42, 0.6, 0.9, 'sine', 22); },
    spit(pos) { if (!ctx) return; noise(out(pos, 0.6, 0.2), 0.3, 900, 2, 0.4, 'bandpass', 0.01, 0, noiseBuf, 400); },
    spinup(pos) { if (!ctx) return; const d = out(pos, 0.8, 0.3); tone(d, 80, 1.0, 0.25, 'sawtooth', 600, 0, 0.3); },
    flame(pos) { if (!ctx) return; noise(out(pos, 0.5, 0.2), 0.16, 700, 0.8, 0.5, 'lowpass', 0.02, 0, brownBuf); },
    melee() { if (!ctx) return; noise(out(null, 0.6, 0.05), 0.14, 1600, 1.5, 0.45, 'bandpass', 0.01, 0, noiseBuf, 600); },
    gameOver() { if (!ctx) return; const d = out(null, 0.8, 0.7); [392, 330, 262, 196].forEach((f, i) => tone(d, f, 0.8, 0.2, 'triangle', null, i * 0.4)); },
    rankUp() { if (!ctx) return; const d = out(null, 0.7, 0.6); [523, 659, 784, 1046, 1318].forEach((f, i) => tone(d, f, 0.35, 0.18, 'triangle', null, i * 0.1)); },
    click() { if (!ctx) return; tone(out(null, 0.4, 0), 900, 0.03, 0.1, 'square'); },
    step(surface) { if (!ctx) return; const d = out(null, 0.35, 0.05); noise(d, 0.07, surface === 'hard' ? 1400 : 500, 1.2, 0.18, 'lowpass', 0.003, 0, brownBuf); },
    slide() { if (!ctx) return; noise(out(null, 0.5, 0.05), 0.7, 900, 0.8, 0.35, 'lowpass', 0.02, 0, noiseBuf, 300); },
    plate() { if (!ctx) return; const d = out(null, 0.7, 0.1); noise(d, 0.05, 3000, 3, 0.5, 'bandpass'); tone(d, 220, 0.12, 0.25, 'square', 140, 0.05); noise(d, 0.08, 1600, 4, 0.4, 'bandpass', 0.002, 0.12); },
    build() { if (!ctx) return; const d = out(null, 0.7, 0.2); for (let i = 0; i < 3; i++) { noise(d, 0.07, 900, 2, 0.5, 'bandpass', 0.002, i * 0.09); tone(d, 160, 0.05, 0.2, 'square', 120, i * 0.09); } },
    buildHit(pos) { if (!ctx) return; noise(out(pos, 0.5, 0.1), 0.08, 700, 1.5, 0.4, 'bandpass', 0.002, 0, brownBuf); },
    buildBreak(pos) { if (!ctx) return; const d = out(pos, 0.8, 0.3); noise(d, 0.5, 600, 0.8, 0.7, 'lowpass', 0.002, 0, brownBuf, 150); },
    portal() { if (!ctx) return; const d = out(null, 0.7, 0.6); tone(d, 200, 0.8, 0.2, 'sine', 1200); tone(d, 300, 0.8, 0.15, 'triangle', 1800, 0.1); },
    knifeHit() { if (!ctx) return; const d = out(null, 0.7, 0.05); noise(d, 0.1, 700, 1.2, 0.6, 'lowpass', 0.002, 0, brownBuf); tone(d, 900, 0.05, 0.1, 'triangle', 500); },
    glass(pos) { if (!ctx) return; const d = out(pos || null, 0.6, 0.2); noise(d, 0.25, 5000, 0.8, 0.5, 'highpass'); for (let i = 0; i < 4; i++) tone(d, G.rand(2500, 4500), 0.12, 0.05, 'sine', null, i * 0.03); },
    land() { if (!ctx) return; noise(out(null, 0.5, 0.05), 0.12, 400, 1, 0.4, 'lowpass', 0.002, 0, brownBuf); },
    // cris de mort : voix synthétisée (source glottale + formants), râle des zombies, rugissement des boss
    death(pos, kind, pitch = 1) {
      if (!ctx) return;
      const d = out(pos, kind === 'boss' ? 1.2 : 0.8, 0.35), t = ctx.currentTime;
      if (kind === 'soldier') {
        const f0 = G.rand(150, 210) * pitch, dur = G.rand(0.45, 0.7);
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(f0 * 1.25, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.08); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + dur);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        for (const [fr, q, gg] of [[750, 6, 1], [1150, 8, 0.7], [2500, 10, 0.25]]) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(fr, t); f.frequency.linearRampToValueAtTime(fr * 0.8, t + dur); f.Q.value = q; const fg = ctx.createGain(); fg.gain.value = gg; o.connect(f); f.connect(fg); fg.connect(g); }
        g.connect(d); o.start(t); o.stop(t + dur + 0.05);
        noise(d, dur * 0.8, 1800, 1, 0.12, 'bandpass', 0.02, 0.05);
        noise(d, 0.15, 300, 1, 0.35, 'lowpass', 0.002, dur * 0.9, brownBuf); // chute au sol
      } else if (kind === 'boss') {
        tone(d, 70, 1.6, 0.6, 'sawtooth', 30, 0, 0.05); tone(d, 105, 1.4, 0.35, 'square', 45, 0.05, 0.05);
        noise(d, 1.6, 500, 1.5, 0.6, 'bandpass', 0.05, 0, brownBuf, 120);
        noise(d, 0.6, 250, 0.7, 0.8, 'lowpass', 0.003, 1.2, brownBuf);
      } else {
        const f = G.rand(60, 95) * pitch;
        tone(d, f * 1.6, 0.7, 0.3, 'sawtooth', f * 0.5, 0, 0.03);
        noise(d, 0.7, f * 8, 3, 0.3, 'bandpass', 0.03, 0, brownBuf, f * 2);
        noise(d, 0.25, 700, 1.2, 0.3, 'bandpass', 0.005, 0.35, noiseBuf, 200); // gargouillis
      }
    },
    radio() { if (!ctx) return; const d = out(null, 0.5, 0); noise(d, 0.18, 2500, 2, 0.25, 'bandpass', 0.002); tone(d, 1200, 0.05, 0.06, 'square', null, 0.12); },
    objective() { if (!ctx) return; const d = out(null, 0.6, 0.4); [587, 880, 1175].forEach((f, i) => tone(d, f, 0.3, 0.15, 'triangle', null, i * 0.09)); },
  };

  // ambiance continue (vent, lave, ville…)
  function startAmbient(kind) {
    if (!ctx) return;
    stopAmbient();
    const src = ctx.createBufferSource(); src.buffer = brownBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.value = kind === 'enfer' ? 180 : kind === 'toundra' ? 700 : kind === 'ville' ? 300 : 400;
    const g = ctx.createGain(); g.gain.value = kind === 'toundra' ? 0.18 : 0.1;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08; const lg = ctx.createGain(); lg.gain.value = 0.06; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    src.connect(f); f.connect(g); g.connect(master); src.start();
    ambient = { src, lfo };
  }
  function stopAmbient() { if (ambient) { try { ambient.src.stop(); ambient.lfo.stop(); } catch (e) { /* déjà arrêté */ } ambient = null; } }

  return { init, setVolume, setListener, startAmbient, stopAmbient, S };
})();

// Voix : les soldats parlent (synthèse vocale du navigateur, en français), sans saturer
G.Voice = (function () {
  const LINES = {
    spot: ['Contact !', 'Je le vois !', 'Cible repérée !', 'Il est là !', 'Ennemi en vue !', 'Là-bas !'],
    up: ["Il est dans l'immeuble !", 'Il est en hauteur !', 'Il est à l\'étage !', 'Il se planque là-haut !'],
    climb: ['Je monte !', 'Couvrez-moi, je monte !', "J'y vais, je monte !", 'On monte le chercher !'],
    perch: ['Je prends de la hauteur.', 'Je me poste sur le toit.', 'En position.', 'Je le couvre depuis là-haut.'],
    reload: ['Je recharge !', 'Rechargement !', 'Couvrez-moi, je recharge !'],
    grenade: ['Grenade !', 'Grenade lancée !', 'Je le débusque !'],
    hit: ['Je suis touché !', 'Aïe ! Touché !', 'Médic !', "Je pisse le sang !"],
    down: ['Homme à terre !', 'On a perdu un gars !', 'Il en a eu un !', 'Merde, il est mort !'],
    flank: ['Je le contourne !', 'Prenez-le à revers !', 'Je passe par le flanc !'],
    lost: ['Où il est passé ?', "Je l'ai perdu !", 'Il a disparu !'],
    melee: ['Je vais te saigner !', "T'es à moi !", 'Viens là !'],
    car: ['Il a un véhicule !', 'Visez la voiture !'],
    boss: ['Tu ne peux pas m\'arrêter !', 'Je vais te broyer !', 'Personne ne sort d\'ici vivant !'],
  };
  let last = 0, voices = null, enabled = true;
  const lastKind = {};
  function pickVoice() {
    if (voices && voices.length) return voices;
    try { voices = (window.speechSynthesis.getVoices() || []).filter((v) => /^fr/i.test(v.lang)); } catch (e) { voices = []; }
    return voices;
  }
  // un ennemi dit une réplique : volume selon la distance, une seule voix à la fois
  function bark(e, kind, force) {
    if (!enabled || !window.speechSynthesis || !LINES[kind]) return false;
    const game = e.game, pl = game.player, now = performance.now() / 1000;
    const d = Math.hypot(e.pos.x - pl.pos.x, e.pos.y - pl.pos.y, e.pos.z - pl.pos.z);
    if (d > 48) return false;
    if (!force && (now - last < 1.6 || now - (lastKind[kind] || -99) < 5)) return false;
    try {
      if (window.speechSynthesis.speaking && !force) return false;
      if (force) window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(G.pick(LINES[kind]));
      u.lang = 'fr-FR';
      const vs = pickVoice(); if (vs.length) u.voice = vs[(e.voiceIdx || 0) % vs.length];
      u.pitch = e.voicePitch || 1; u.rate = 1.2;
      u.volume = G.clamp((G.Ranked.profile.settings.vol ?? 0.6) * 1.6 / (1 + d * 0.06), 0.05, 1);
      window.speechSynthesis.speak(u);
      last = now; lastKind[kind] = now;
      return true;
    } catch (err) { return false; }
  }
  // voix radio (mode histoire) : le même canal, priorité absolue
  function radio(text, who) {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR';
      const vs = pickVoice(); if (vs.length) u.voice = vs[who === 'handler' ? 0 : (vs.length > 1 ? 1 : 0)];
      u.pitch = who === 'handler' ? 0.85 : who === 'vex' ? 0.75 : 1.05; u.rate = 1.08;
      u.volume = G.clamp((G.Ranked.profile.settings.vol ?? 0.6) * 1.5, 0.1, 1);
      window.speechSynthesis.speak(u);
      last = performance.now() / 1000 + 2;
    } catch (e) { /* pas de synthèse vocale */ }
  }
  function stop() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* ignoré */ } }
  function setEnabled(v) { enabled = v; if (!v) stop(); }
  return { bark, radio, stop, setEnabled, LINES };
})();


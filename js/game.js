// Boucle de jeu : vagues, tir, points, bonus, stations, effets, HUD
G.POWERUPS = {
  ammo: { name: 'MUNITIONS MAX', color: 0x40c0ff, icon: 'M', w: 3 },
  insta: { name: 'MORT INSTANTANÉE', color: 0xff4040, icon: '☠', w: 2, dur: 20 },
  double: { name: 'POINTS ×2', color: 0xffd040, icon: '×2', w: 3, dur: 20 },
  nuke: { name: 'BOMBE', color: 0xff8020, icon: '✹', w: 1.5 },
  fury: { name: 'FUREUR', color: 0xc040ff, icon: '∞', w: 1.5, dur: 15 },
  cash: { name: 'BUTIN', color: 0x40ff80, icon: '$', w: 2 },
};

G.Game = class {
  constructor(canvas) {
    this.canvas = canvas;
    const q = G.Ranked.profile.settings.quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: q === 'haute', powerPreference: 'high-performance' });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.autoClear = false;
    this.applyQuality();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.05, 220);
    this.player = new G.Player(this);
    this.phase = 'menu';
    this.paused = false;
    this.shakeAmt = 0;
    this.power = { insta: 0, double: 0, fury: 0 };
    this.mods = G.Ranked.modifiers('classic');
    this.hud = {};
    this.lastT = performance.now();
    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.loadMap('village');
    requestAnimationFrame((t) => this.frame(t));
  }

  applyQuality() {
    const q = G.Ranked.profile.settings.quality;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 'haute' ? 1.5 : q === 'moyenne' ? 1 : 0.7));
    this.resize && this.camera && this.resize();
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.player.vmCam.aspect = w / h; this.player.vmCam.updateProjectionMatrix();
  }

  // ---------- Chargement de carte ----------
  loadMap(id) {
    if (this.scene) this.disposeScene();
    const map = G.Maps.create(id);
    this.map = map; this.world = map.world;
    const d = map.def;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(d.sky);
    scene.fog = new THREE.Fog(d.fog[0], d.fog[1], d.fog[2]);
    scene.add(new THREE.HemisphereLight(d.hemi[0], d.hemi[1], d.hemi[2]));
    const sun = new THREE.DirectionalLight(d.sun[0], d.sun[1]); sun.position.set(0.6, 1, 0.35); scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.18));
    this.scene = scene;
    this.world.buildMesh(scene);
    // lumière dynamique (tirs / explosions)
    this.flashLight = new THREE.PointLight(0xffc060, 0, 10); scene.add(this.flashLight);
    this.boomLight = new THREE.PointLight(0xff8030, 0, 16); scene.add(this.boomLight);
    this.buildStations();
    this.buildWeather(d.weather);
    this.buildClouds(d);
    this.buildMinimap();
    this.enemies = []; this.projectiles = []; this.powerups = []; this.fx = []; this.particlesList = [];
    this.tracers = [];
    scene.add(this.camera);
  }
  disposeScene() {
    for (const e of this.enemies || []) e.remove();
    this.world.dispose(this.scene);
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose()); else o.material.dispose(); } });
    this.scene = null;
  }

  buildStations() {
    this.stations = [];
    for (const s of this.map.def.stations) {
      const st = { def: Object.assign({}, s), group: new THREE.Group(), center: new THREE.Vector3(s.x + 0.5, s.y + 0.5, s.z + 0.5), t: Math.random() * 6 };
      const g = st.group; g.position.set(s.x + 0.5, s.y, s.z + 0.5);
      if (s.type === 'box') {
        const tex = G.Tex.pix('boxtex', 16, 16, (ctx, rnd, px) => {
          for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(x, y, (x < 1 || y < 1 || x > 14 || y > 14) ? 0x2a1a0a : 0x5a3a1a, Math.floor((rnd() - 0.5) * 20));
          const q = ['..XXXX..', '.XX..XX.', '.....XX.', '....XX..', '...XX...', '...XX...', '........', '...XX...'];
          q.forEach((row, yy) => [...row].forEach((c, xx) => { if (c === 'X') px(xx + 4, yy + 4, 0xffd040); }));
        });
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.04, 1.04), new THREE.MeshLambertMaterial({ map: tex }));
        m.position.y = 0.5; g.add(m);
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 30, 0.5), new THREE.MeshBasicMaterial({ color: 0x60b0ff, transparent: true, opacity: 0.18, depthWrite: false, fog: false }));
        beam.position.y = 16; g.add(beam);
        st.light = new THREE.PointLight(0x60b0ff, 0.8, 6); st.light.position.y = 1.5; g.add(st.light);
        st.box = { state: 'idle', t: 0, weapon: null, model: null };
      } else if (s.type === 'wall') {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.04, 1.04), new THREE.MeshLambertMaterial({ map: G.Tex.noiseTex('pedestal', 0x4a4e56, 20, (ctx, rnd, px) => { for (let x = 0; x < 8; x++) { px(x, 0, 0xe0b040); px(x, 7, 0xe0b040); } }) }));
        m.position.y = 0.5; g.add(m);
        const gun = G.makeWeaponModel(s.weapon, false); gun.scale.setScalar(1.6); gun.position.y = 1.45; g.add(gun); st.gun = gun;
      } else if (s.type === 'perk') {
        const P = G.PERKS[s.perk];
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.04, 2.04, 1.04), new THREE.MeshLambertMaterial({ map: G.Tex.noiseTex('perk' + s.perk, P.color, 30, (ctx, rnd, px) => { for (let x = 1; x < 7; x++) for (let y = 2; y < 5; y++) px(x, y, 0x1a1a1a); }) }));
        body.position.y = 1.0; g.add(body);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.18, 1.08), new THREE.MeshBasicMaterial({ color: 0x555555 }));
        stripe.position.y = 1.75; g.add(stripe); st.stripe = stripe;
        const icon = this.makeIconSprite(P.icon, '#' + P.color.toString(16).padStart(6, '0'));
        icon.position.y = 2.6; icon.scale.set(0.9, 0.9, 1); g.add(icon); st.icon = icon;
      } else if (s.type === 'forge') {
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.04, 1.04), new THREE.MeshLambertMaterial({ map: G.Tex.noiseTex('forge', 0x2a2a30, 20) }));
        base.position.y = 0.5; g.add(base);
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.7), new THREE.MeshLambertMaterial({ color: 0x3a3a40 })); top.position.y = 1.1; g.add(top);
        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.5), new THREE.MeshBasicMaterial({ color: 0x555555 })); glow.position.y = 1.23; g.add(glow); st.stripe = glow;
        const icon = this.makeIconSprite('★', '#c060ff'); icon.position.y = 2.0; icon.scale.set(0.8, 0.8, 1); g.add(icon); st.icon = icon;
      }
      this.scene.add(g);
      this.stations.push(st);
    }
  }
  makeIconSprite(text, color) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = color; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 32, 34);
    const t = new THREE.CanvasTexture(c);
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, fog: false }));
  }
  buildWeather(type) {
    this.weather = null;
    if (!type) return;
    const N = 900, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = G.rand(-25, 25); pos[i * 3 + 1] = G.rand(0, 25); pos[i * 3 + 2] = G.rand(-25, 25); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: type === 'snow' ? 0xffffff : 0xff7a40, size: type === 'snow' ? 0.12 : 0.08, transparent: true, opacity: 0.85, depthWrite: false });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
    this.scene.add(pts);
    this.weather = { pts, type, N };
  }
  buildClouds(d) {
    this.clouds = new THREE.Group();
    if (d.id === 'enfer') return;
    const mat = new THREE.MeshBasicMaterial({ color: d.id === 'toundra' ? 0x3a4a6a : 0xffffff, transparent: true, opacity: 0.75, fog: false });
    const rnd = G.mulberry32(77);
    for (let i = 0; i < 26; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(4 + rnd() * 10, 1, 3 + rnd() * 8), mat);
      c.position.set(rnd() * 140 - 38, 34 + rnd() * 3, rnd() * 140 - 38);
      this.clouds.add(c);
    }
    this.scene.add(this.clouds);
  }
  buildMinimap() { this.minimapImg = G.topDown(this.world); }

  // ---------- Démarrage / fin ----------
  start(mapId, mode) {
    G.Audio.init();
    this.loadMap(mapId);
    this.mode = mode;
    this.mods = G.Ranked.modifiers(mode);
    this.player.reset(this.map.playerSpawn);
    this.wave = 0; this.points = 500; this.time = 0;
    this.toSpawn = 0; this.spawnT = 0;
    this.power = { insta: 0, double: 0, fury: 0 };
    this.stats = { kills: 0, headshots: 0, shots: 0, hits: 0, dmgDealt: 0, dmgTaken: 0, points: 0, bosses: 0, specials: 0, revives: 0 };
    this.waveStats = []; this.curWave = null;
    this.phase = 'intermission'; this.phaseT = 5;
    this.boss = null; this.dropsThisWave = 0;
    this.flowT = 0; this.paused = false;
    this.world.computeFlow(Math.floor(this.player.pos.x), Math.floor(this.player.pos.z));
    this.lastPerkWave = 0;
    G.UI.showHUD(true);
    this.message('PRÉPAREZ-VOUS', this.map.def.name + (mode === 'ranked' ? ' — CLASSÉ ' + G.Ranked.rankInfo(G.Ranked.profile.rp).label : ' — CLASSIQUE'), 3.5);
    this.lockPointer();
  }
  lockPointer() { try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignoré */ } }
  quitToMenu() {
    this.phase = 'menu'; this.paused = false;
    if (document.pointerLockElement) document.exitPointerLock();
    G.UI.showHUD(false);
    this.loadMap(this.map.def.id);
  }
  setPaused(p) {
    if (this.phase === 'menu' || this.phase === 'over') return;
    this.paused = p;
    G.UI.showPause(p);
    if (!p) this.lockPointer();
  }

  // ---------- Entrées ----------
  bindInput() {
    const pl = this.player;
    document.addEventListener('keydown', (e) => {
      if (this.phase === 'menu' || this.phase === 'over') return;
      if (e.code === 'Escape' || e.code === 'KeyP') { if (!document.pointerLockElement || e.code === 'KeyP') this.setPaused(!this.paused); return; }
      if (this.paused) return;
      pl.keys[e.code] = true;
      if (e.code === 'KeyR') pl.tryReload();
      if (e.code === 'Digit1') pl.switchTo(0);
      if (e.code === 'Digit2') pl.switchTo(1);
      if (e.code === 'Digit3') pl.switchTo(2);
      if (e.code === 'KeyE' || e.code === 'KeyF') this.interact();
      if (e.code === 'KeyV') pl.melee();
      if (e.code === 'KeyG') pl.throwGrenade();
      if (e.code === 'KeyN' && this.phase === 'intermission' && this.wave > 0) this.phaseT = Math.min(this.phaseT, 0.5);
      if (e.code === 'Tab') { e.preventDefault(); G.UI.showScoreboard(true); }
      if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
    });
    document.addEventListener('keyup', (e) => { pl.keys[e.code] = false; if (e.code === 'Tab') G.UI.showScoreboard(false); });
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.phase === 'menu' || this.phase === 'over' || this.paused) return;
      if (!document.pointerLockElement) this.lockPointer();
      if (e.button === 0) pl.mouse.left = true;
      if (e.button === 2) pl.mouse.right = true;
    });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) pl.mouse.left = false; if (e.button === 2) pl.mouse.right = false; });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('mousemove', (e) => {
      if (this.paused || this.phase === 'menu' || this.phase === 'over') return;
      // sans verrouillage du pointeur (navigateur qui le refuse) : on tourne la caméra en maintenant un clic
      if (document.pointerLockElement === this.canvas || e.buttons) pl.onMouseMove(e.movementX || 0, e.movementY || 0);
    });
    document.addEventListener('wheel', (e) => { if (this.phase !== 'menu' && !this.paused) pl.cycle(e.deltaY > 0 ? 1 : -1); });
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && (this.phase === 'active' || this.phase === 'intermission') && !this.paused) this.setPaused(true);
      pl.mouse.left = pl.mouse.right = false;
    });
    window.addEventListener('blur', () => { for (const k in pl.keys) pl.keys[k] = false; });
  }

  // ---------- Boucle ----------
  frame(t) {
    requestAnimationFrame((tt) => this.frame(tt));
    let dt = (t - this.lastT) / 1000; this.lastT = t;
    if (dt > 0.05) dt = 0.05;
    if (!this.scene) return;
    if (this.phase === 'menu' || this.phase === 'over') {
      const a = t * 0.00005;
      this.camera.position.set(32 + Math.cos(a) * 30, 22, 32 + Math.sin(a) * 30);
      this.camera.lookAt(32, 8, 32);
      if (this.camera.fov !== 70) { this.camera.fov = 70; this.camera.updateProjectionMatrix(); }
      this.updateAmbient(dt);
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
      return;
    }
    if (!this.paused) this.update(dt);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.player.vmScene, this.player.vmCam);
    if (!this.paused) this.updateHUD(dt);
  }

  updateAmbient(dt) {
    if (this.weather) {
      const p = this.weather.pts, arr = p.geometry.attributes.position.array, c = this.camera.position;
      const fall = this.weather.type === 'snow' ? 2.2 : 1.0;
      for (let i = 0; i < this.weather.N; i++) {
        arr[i * 3 + 1] -= fall * dt * (0.6 + (i % 5) * 0.15);
        arr[i * 3] += Math.sin(this.lastT * 0.001 + i) * dt * 0.4;
        if (arr[i * 3 + 1] < -2) arr[i * 3 + 1] += 26;
      }
      p.position.set(c.x, c.y - 10, c.z);
      p.geometry.attributes.position.needsUpdate = true;
    }
    if (this.clouds) { this.clouds.position.x += dt * 0.6; if (this.clouds.position.x > 60) this.clouds.position.x = -20; }
    for (const st of this.stations) {
      st.t += dt;
      if (st.gun) { st.gun.rotation.y = st.t * 1.2; st.gun.position.y = 1.45 + Math.sin(st.t * 2) * 0.08; }
      if (st.icon) st.icon.position.y = (st.def.type === 'perk' ? 2.6 : 2.0) + Math.sin(st.t * 2) * 0.08;
    }
  }

  update(dt) {
    this.time += dt;
    const pl = this.player;
    pl.update(dt, this.camera);
    this.player.vmCam.fov = 65; // arme toujours au même champ de vision
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.5);
    for (const k in this.power) if (this.power[k] > 0) this.power[k] = Math.max(0, this.power[k] - dt);

    // champ de flux
    this.flowT -= dt;
    if (this.flowT <= 0) { this.flowT = 0.25; this.world.computeFlow(Math.floor(pl.pos.x), Math.floor(pl.pos.z)); }

    this.updateWaves(dt);
    // ennemis
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.update(dt)) { e.remove(); this.enemies.splice(i, 1); }
    }
    this.updateProjectiles(dt);
    this.updatePowerups(dt);
    this.updateStations(dt);
    this.updateFX(dt);
    this.updateAmbient(dt);
    this.flashLight.intensity = Math.max(0, this.flashLight.intensity - dt * 40);
    this.boomLight.intensity = Math.max(0, this.boomLight.intensity - dt * 6);
  }

  // ---------- Vagues ----------
  zombieBaseHp() { const w = Math.max(1, this.wave); return w < 10 ? 80 + 45 * w : 485 * Math.pow(1.09, w - 9); }
  waveCount(w) { return Math.round(5 + w * 2.4 + w * w * 0.12); }
  aliveCount() { let n = 0; for (const e of this.enemies) if (!e.dead) n++; return n; }
  isBossWave(w) { return w % 5 === 0; }

  beginWave() {
    this.wave++;
    const w = this.wave;
    this.toSpawn = this.waveCount(w);
    this.spawnT = 1.5;
    this.dropsThisWave = 0;
    this.phase = 'active';
    this.curWave = { n: w, t0: this.time, kills: 0, hs: 0, dmgTaken: 0, pts: 0, boss: null, specials: 0 };
    if (this.isBossWave(w)) {
      this.toSpawn = Math.round(this.toSpawn * 0.45);
      const idx = (w / 5 - 1) % 3, cycle = Math.floor((w / 5 - 1) / 3);
      this.bossT = 2.5; this.bossArgs = [idx, cycle];
      this.message('VAGUE ' + w, '⚠ UN BOSS APPROCHE ⚠', 3);
      G.Audio.S.boss();
    } else {
      this.message('VAGUE ' + w, this.waveHint(w), 3);
      G.Audio.S.waveStart();
    }
  }
  waveHint(w) {
    const e = this.mods.early;
    const hints = [];
    if (w + e === 3) hints.push('Des Coureurs rôdent…');
    if (w + e === 6) hints.push('Attention aux Brutes !');
    if (w + e === 8) hints.push('Les Gonflés explosent au contact !');
    if (w + e === 11) hints.push('Des Cracheurs à distance !');
    if (w === this.mods.armoredFrom) hints.push('Zombies Blindés : visez le corps ou brisez le casque');
    if (w === 8) hints.push('La Forge est active ★');
    return hints.join(' — ');
  }
  spawnBoss(idx, cycle) {
    const T = G.BOSSES[idx];
    const p = this.pickSpawn(14, 30) || this.map.playerSpawn.clone();
    const b = new G.Enemy(this, T.id, p, { boss: T, hpScale: (1 + 0.6 * cycle) * this.mods.bossHp, cycle });
    this.enemies.push(b);
    this.boss = b;
    this.curWave.boss = T.name;
    this.message(T.name, cycle > 0 ? 'Il est revenu… plus fort.' : 'Abattez-le !', 3);
    G.Audio.S.boss();
    this.shake(0.6);
  }
  chooseType() {
    const w = this.wave, ww = w + this.mods.early, r = Math.random();
    let acc = 0;
    const opts = [];
    if (ww >= 3) opts.push(['runner', Math.min(0.3, (ww - 2) * 0.04)]);
    if (ww >= 6) opts.push(['brute', Math.min(0.12, (ww - 5) * 0.018)]);
    if (ww >= 8) opts.push(['bloater', Math.min(0.1, (ww - 7) * 0.018)]);
    if (ww >= 11) opts.push(['spitter', Math.min(0.1, (ww - 10) * 0.018)]);
    if (w >= this.mods.armoredFrom) opts.push(['armored', Math.min(0.2, (w - this.mods.armoredFrom + 1) * 0.03)]);
    for (const [t, p] of opts) { acc += p; if (r < acc) return t; }
    return 'walker';
  }
  pickSpawn(minD = 12, maxD = 40) {
    const pl = this.player.pos, w = this.world;
    const ok = [], reach = [];
    for (const [x, z] of this.map.spawns) {
      if (w.flowDist(x, z) < 0) continue;
      reach.push([x, z]);
      const d = Math.hypot(x + 0.5 - pl.x, z + 0.5 - pl.z);
      if (d >= minD && d <= maxD) ok.push([x, z]);
    }
    const list = ok.length ? ok : reach.length ? reach : this.map.spawns;
    if (!list.length) return null;
    const [x, z] = G.pick(list);
    return new THREE.Vector3(x + 0.5, w.standAt(x, z), z + 0.5);
  }
  spawnEnemy(type, pos) {
    const e = new G.Enemy(this, type, pos);
    this.enemies.push(e);
    return e;
  }
  updateWaves(dt) {
    if (this.phase === 'intermission') {
      this.phaseT -= dt;
      if (this.phaseT <= 0) this.beginWave();
      return;
    }
    if (this.phase !== 'active') return;
    if (this.bossT > 0) { this.bossT -= dt; if (this.bossT <= 0) this.spawnBoss(this.bossArgs[0], this.bossArgs[1]); }
    this.spawnT -= dt;
    if (this.toSpawn > 0 && this.spawnT <= 0 && this.aliveCount() < this.mods.maxAlive) {
      this.spawnT = Math.max(0.3, 2.0 - this.wave * 0.08);
      const p = this.pickSpawn();
      if (p) { this.spawnEnemy(this.chooseType(), p); this.toSpawn--; }
    }
    const bossPending = this.isBossWave(this.wave) && !this.curWave.boss;
    if (this.toSpawn <= 0 && this.aliveCount() === 0 && !bossPending) this.endWave();
  }
  endWave() {
    this.curWave.t = this.time - this.curWave.t0;
    this.waveStats.push(this.curWave);
    this.phase = 'intermission';
    this.phaseT = 12;
    this.player.grenades = Math.min(4, this.player.grenades + 2);
    G.Audio.S.waveEnd();
    const next = this.wave + 1;
    const newPerks = this.stations.filter((s) => s.def.type === 'perk' && s.def.wave === next).map((s) => G.PERKS[s.def.perk].name);
    let sub = '+2 grenades — [N] pour lancer la vague suivante';
    if (newPerks.length) sub = 'Nouvel atout disponible : ' + newPerks.join(', ');
    if (next === 8) sub = 'La Forge ★ s\'allume à la prochaine vague';
    this.message('VAGUE ' + this.wave + ' TERMINÉE', sub, 3.5);
  }

  // ---------- Tir ----------
  fireWeapon(st, pl) {
    G.Audio.S.shot(st.sound);
    this.stats.shots++;
    const eye = pl.eye.clone();
    const base = pl.lookDir();
    const moving = Math.hypot(pl.vel.x, pl.vel.z) > 1;
    let spread = G.lerp(st.spread[0], st.spread[1], pl.ads) * (moving ? 1.5 : 1) * (pl.onGround ? 1 : 2.2);
    if (st.id === 'shotgun') spread = G.lerp(st.spread[0], st.spread[1], pl.ads);
    const muzzle = eye.clone().add(base.clone().multiplyScalar(0.6)).add(new THREE.Vector3(Math.cos(pl.yaw), 0, -Math.sin(pl.yaw)).multiplyScalar(0.18 * (1 - pl.ads))).add(new THREE.Vector3(0, -0.12 * (1 - pl.ads), 0));
    this.flashLight.position.copy(muzzle); this.flashLight.intensity = 2.5;
    if (st.projectile) {
      this.spawnProjectile('energy', muzzle, base.clone().multiplyScalar(48), st.dmg, 'player', { splash: st.splash, up: st.upgraded });
      return;
    }
    let anyHit = false;
    for (let p = 0; p < st.pellets; p++) {
      const dir = base.clone();
      if (spread > 0) {
        dir.x += (Math.random() - 0.5) * 2 * spread; dir.y += (Math.random() - 0.5) * 2 * spread; dir.z += (Math.random() - 0.5) * 2 * spread;
        dir.normalize();
      }
      const wh = this.world.raycast(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, st.range);
      const maxD = wh ? wh.dist : st.range;
      const hits = [];
      for (const e of this.enemies) {
        if (e.dead) continue;
        const h = e.rayHit(eye, dir, maxD);
        if (h) hits.push({ e, t: h.t, part: h.part });
      }
      hits.sort((a, b) => a.t - b.t);
      let endD = maxD;
      const n = Math.min(st.pierce, hits.length);
      for (let i = 0; i < n; i++) {
        const h = hits[i];
        let dmg = st.dmg * (h.part === 'head' ? st.headMult : 1) * Math.pow(0.75, i);
        if (st.id === 'shotgun' && h.t > 8) dmg *= Math.max(0.35, 1 - (h.t - 8) / 16);
        this.damageEnemy(h.e, dmg, h.part, 'gun');
        anyHit = true;
        const hp = eye.clone().add(dir.clone().multiplyScalar(h.t));
        this.particles(hp, 0x7a1010, h.part === 'head' ? 7 : 4, 3);
        if (i === n - 1 && st.pierce <= hits.length) endD = h.t;
      }
      if (wh && endD === maxD) {
        const hp = eye.clone().add(dir.clone().multiplyScalar(wh.dist));
        this.particles(hp, 0x9a9080, 3, 2.2, 0.06);
      }
      if (p < 3) this.tracer(muzzle, eye.clone().add(dir.clone().multiplyScalar(Math.min(endD, 60))));
    }
    if (anyHit) this.stats.hits++;
  }
  damageEnemy(e, dmg, part, src) {
    if (e.dead) return;
    if (this.power.insta > 0 && !e.isBoss) dmg = e.hp + e.helmet + 1;
    const before = e.hp;
    const dealt = e.damage(dmg, part, src);
    this.stats.dmgDealt += Math.max(0, Math.min(before, dealt));
    if (!e.dead && (src === 'gun' || src === 'melee' || src === 'energy')) this.addPoints(10);
    G.UI.hitmarker(e.dead, part === 'head');
    if (part === 'head') G.Audio.S.headshot(); else G.Audio.S.hit();
  }
  onEnemyKilled(e, src, part, self) {
    if (e === this.boss) { this.boss = null; }
    if (self) return;
    this.stats.kills++; this.curWave.kills++;
    if (part === 'head') { this.stats.headshots++; this.curWave.hs++; }
    if (e.type !== 'walker' && e.type !== 'minion') { this.stats.specials++; this.curWave.specials++; }
    let pts = e.isBoss ? e.T.pts : src === 'melee' ? 130 : part === 'head' ? 100 : e.T.pts;
    if (src === 'nuke') pts = 0;
    if (pts) this.addPoints(pts, part === 'head' ? 'TÊTE' : src === 'melee' ? 'COUTEAU' : null);
    G.Audio.S.kill();
    this.particles(e.pos.clone().add(new THREE.Vector3(0, 1.2 * e.size, 0)), e.isBoss ? 0x5a0a0a : 0x6a1010, e.isBoss ? 40 : 10, 4);
    if (e.isBoss) {
      this.stats.bosses++;
      this.message(e.T.name + ' EST TOMBÉ', '+' + e.T.pts + ' points', 3);
      this.spawnPowerup('ammo', e.pos.clone());
      this.spawnPowerup(G.pick(['insta', 'double', 'fury', 'cash']), e.pos.clone().add(new THREE.Vector3(1.5, 0, 0)));
      this.shake(0.8);
      return;
    }
    if (src === 'nuke' || src === 'self') return;
    const chance = 0.035 * this.mods.drops * (e.type !== 'walker' ? 2 : 1);
    if (this.dropsThisWave < 4 && Math.random() < chance) { this.dropsThisWave++; this.spawnPowerup(null, e.pos.clone()); }
  }
  addPoints(n, tag) {
    const v = this.power.double > 0 ? n * 2 : n;
    this.points += v; this.stats.points += v;
    if (this.curWave) this.curWave.pts += v;
    G.UI.pointsPopup('+' + v + (tag ? ' ' + tag : ''));
  }
  meleeAttack(pl) {
    const eye = pl.eye, dir = pl.lookDir();
    let best = null, bd = 2.3;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const to = new THREE.Vector3(e.pos.x - eye.x, e.pos.y + 1.2 * e.size - eye.y, e.pos.z - eye.z);
      const d = to.length();
      if (d < bd + e.w * 0.5 && to.normalize().dot(dir) > 0.55) { best = e; bd = d; }
    }
    if (best) { this.damageEnemy(best, 160, 'body', 'melee'); this.particles(best.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0x7a1010, 8, 3); }
  }

  // ---------- Joueur touché ----------
  damagePlayer(amount, src) {
    const pl = this.player;
    if (pl.dead || this.phase === 'over') return;
    pl.hp -= amount; pl.lastHit = this.time;
    this.stats.dmgTaken += amount;
    if (this.curWave) this.curWave.dmgTaken += amount;
    G.Audio.S.hurt();
    this.shake(Math.min(0.5, amount / 60));
    G.UI.hurt(amount / pl.maxHp);
    if (src && src.pos) {
      const ang = Math.atan2(src.pos.x - pl.pos.x, src.pos.z - pl.pos.z);
      G.UI.damageDir(ang - pl.yaw + Math.PI);
    }
    if (pl.hp <= 0) {
      if (pl.perks.has('souffle')) {
        pl.perks.delete('souffle'); pl.hp = pl.maxHp * 0.6;
        this.stats.revives++;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = e.pos.distanceTo(pl.pos);
          if (d < 6) { const k = e.pos.clone().sub(pl.pos).setY(0).normalize().multiplyScalar(10); e.vel.add(k); e.vel.y = 6; if (!e.isBoss) this.damageEnemy(e, 300, 'body', 'shock'); }
        }
        this.message('SECOND SOUFFLE', 'Vous vous relevez !', 2);
        this.boom(pl.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x3080e0);
        return;
      }
      pl.dead = true;
      this.gameOver();
    }
  }
  gameOver() {
    if (this.phase === 'over' || this.phase === 'menu') return;
    this.phase = 'over';
    G.Audio.S.gameOver();
    if (this.curWave && this.waveStats[this.waveStats.length - 1] !== this.curWave) { this.curWave.t = this.time - this.curWave.t0; this.curWave.died = true; this.waveStats.push(this.curWave); }
    const s = this.stats;
    const run = {
      mode: this.mode, map: this.map.def.id, mapName: this.map.def.name, rpMult: this.map.def.rpMult,
      wave: this.wave, kills: s.kills, headshots: s.headshots, shots: s.shots, hits: s.hits,
      dmgDealt: Math.round(s.dmgDealt), dmgTaken: Math.round(s.dmgTaken), points: s.points, time: Math.round(this.time),
      bosses: s.bosses, specials: s.specials, date: Date.now(),
      perks: [...this.player.perks], weapons: this.player.slots.map((x) => G.weaponStats(x).name),
      waves: this.waveStats.map((w) => ({ n: w.n, t: Math.round(w.t || 0), kills: w.kills, hs: w.hs, dmgTaken: Math.round(w.dmgTaken), pts: w.pts, boss: w.boss, specials: w.specials, died: !!w.died })),
    };
    const res = G.Ranked.record(run);
    if (document.pointerLockElement) document.exitPointerLock();
    G.UI.showHUD(false);
    setTimeout(() => G.UI.showGameOver(run, res), 300);
  }

  // ---------- Explosions / effets ----------
  explode(pos, r, dmg, src, color = 0xff8030) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      const c = e.pos.clone(); c.y += 1 * e.size;
      const d = c.distanceTo(pos);
      if (d < r + e.w * 0.5) this.damageEnemy(e, dmg * (1 - Math.min(1, d / r) * 0.6), 'body', src === 'player' ? 'explosive' : src);
    }
    const pc = this.player.pos.clone(); pc.y += 0.9;
    const pd = pc.distanceTo(pos);
    if (pd < r) {
      const self = src === 'player';
      const amt = (self ? 0.15 : 1) * (src === 'bloater' ? dmg : dmg * 0.4) * (1 - pd / r * 0.5);
      if (amt > 1) this.damagePlayer(amt, { pos });
    }
    this.boom(pos, color);
    this.shake(G.clamp(1.2 - pd / 20, 0.1, 0.9));
    G.Audio.S.explosion();
  }
  boom(pos, color) {
    this.boomLight.position.copy(pos); this.boomLight.color.setHex(color); this.boomLight.intensity = 4;
    this.particles(pos, color, 26, 7, 0.16);
    this.particles(pos, 0x333333, 14, 4, 0.2);
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false }));
    m.position.copy(pos); this.scene.add(m);
    this.fx.push({ mesh: m, t: 0, life: 0.35, kind: 'boom' });
  }
  shockwave(pos, r, dmg) {
    const pl = this.player;
    const d = Math.hypot(pl.pos.x - pos.x, pl.pos.z - pos.z);
    if (d < r && pl.onGround && Math.abs(pl.pos.y - pos.y) < 2.5) { this.damagePlayer(dmg, { pos }); pl.vel.y = 7; }
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(pos.x, pos.y + 0.1, pos.z); this.scene.add(m);
    this.fx.push({ mesh: m, t: 0, life: 0.5, kind: 'ring', r });
    this.particles(pos.clone().add(new THREE.Vector3(0, 0.3, 0)), 0x8a7a60, 30, 8);
    this.shake(0.9);
    for (const e of this.enemies) if (!e.isBoss && !e.dead && e.pos.distanceTo(pos) < r) e.vel.y = 5;
  }
  telegraph(pos, r, t) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.0, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(pos.x, pos.y + 0.06, pos.z); this.scene.add(m);
    this.fx.push({ mesh: m, t: 0, life: t, kind: 'tele' });
  }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  message(title, sub, dur) { G.UI.message(title, sub, dur); }
  floatText(t, color) { G.UI.message('', t, 1.5, color); }

  particles(pos, color, n, spd, size = 0.1) {
    if (!this._pgeo) { this._pgeo = new THREE.BoxGeometry(1, 1, 1); this._pmats = {}; }
    if (!this._pmats[color]) this._pmats[color] = new THREE.MeshLambertMaterial({ color });
    for (let i = 0; i < n; i++) {
      if (this.particlesList.length > 320) { const old = this.particlesList.shift(); this.scene.remove(old.mesh); }
      const m = new THREE.Mesh(this._pgeo, this._pmats[color]);
      const s = size * G.rand(0.6, 1.4); m.scale.setScalar(s);
      m.position.copy(pos);
      this.scene.add(m);
      this.particlesList.push({ mesh: m, vel: new THREE.Vector3(G.rand(-1, 1), G.rand(0, 1.4), G.rand(-1, 1)).multiplyScalar(spd), life: G.rand(0.4, 0.9) });
    }
  }
  tracer(a, b) {
    if (!this._tmat) this._tmat = new THREE.LineBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.8 });
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const l = new THREE.Line(geo, this._tmat.clone()); this.scene.add(l);
    this.fx.push({ mesh: l, t: 0, life: 0.06, kind: 'tracer' });
  }
  updateFX(dt) {
    const w = this.world;
    for (let i = this.particlesList.length - 1; i >= 0; i--) {
      const p = this.particlesList[i];
      p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.mesh); this.particlesList.splice(i, 1); continue; }
      p.vel.y -= 18 * dt;
      const m = p.mesh;
      const nx = m.position.x + p.vel.x * dt, ny = m.position.y + p.vel.y * dt, nz = m.position.z + p.vel.z * dt;
      if (w.isSolid(Math.floor(nx), Math.floor(ny), Math.floor(nz))) { p.vel.multiplyScalar(0.3); p.vel.y = 0; }
      else m.position.set(nx, ny, nz);
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      const k = f.t / f.life;
      if (k >= 1 || f.dead) {
        this.scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose();
        this.fx.splice(i, 1); continue;
      }
      if (f.kind === 'boom') { f.mesh.scale.setScalar(0.5 + k * 3); f.mesh.material.opacity = 0.7 * (1 - k); }
      else if (f.kind === 'ring') { const s = 1 + k * f.r; f.mesh.scale.set(s, s, s); f.mesh.material.opacity = 0.8 * (1 - k); }
      else if (f.kind === 'tele') { f.mesh.material.opacity = 0.15 + 0.35 * k + Math.sin(f.t * 30) * 0.05; }
      else if (f.kind === 'tracer') f.mesh.material.opacity = 0.8 * (1 - k);
      else if (f.kind === 'acid') {
        f.mesh.material.opacity = 0.6 * (1 - k * k);
        f.tick -= dt;
        const pl = this.player;
        if (f.tick <= 0 && Math.hypot(pl.pos.x - f.mesh.position.x, pl.pos.z - f.mesh.position.z) < 1.3 && Math.abs(pl.pos.y - f.mesh.position.y) < 1) { f.tick = 0.5; this.damagePlayer(f.dmg, null); }
      }
    }
  }

  // ---------- Projectiles ----------
  spawnProjectile(type, pos, vel, dmg, owner, extra = {}) {
    let mesh;
    if (type === 'spit') mesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshBasicMaterial({ color: 0x80ff40 }));
    else if (type === 'orb') mesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshBasicMaterial({ color: 0xb050ff }));
    else if (type === 'energy') mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: extra.up ? 0xff60ff : 0x60ffb0 }));
    else mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshLambertMaterial({ color: 0x3a4a2a }));
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.projectiles.push(Object.assign({ type, pos: pos.clone(), vel: vel.clone(), dmg, owner, mesh, life: type === 'grenade' ? 2.2 : 6 }, extra));
  }
  updateProjectiles(dt) {
    const w = this.world, pl = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      let done = p.life <= 0;
      if (p.type === 'grenade' && done) { this.explode(p.pos.clone(), 4.5, p.dmg, 'player', 0xff8030); }
      if (!done) {
        const steps = Math.ceil(p.vel.length() * dt / 0.3);
        const sdt = dt / steps;
        for (let s = 0; s < steps && !done; s++) {
          if (p.type === 'spit') p.vel.y -= 18 * sdt;
          if (p.type === 'grenade') p.vel.y -= 20 * sdt;
          if (p.type === 'orb') { const to = pl.eye.clone().sub(p.pos).normalize().multiplyScalar(9); p.vel.lerp(to, Math.min(1, sdt * 0.9)); }
          const np = p.pos.clone().addScaledVector(p.vel, sdt);
          const solid = w.isSolid(Math.floor(np.x), Math.floor(np.y), Math.floor(np.z));
          if (p.type === 'grenade') {
            if (solid) {
              // rebond simple
              if (w.isSolid(Math.floor(np.x), Math.floor(p.pos.y), Math.floor(p.pos.z))) p.vel.x *= -0.4;
              if (w.isSolid(Math.floor(p.pos.x), Math.floor(np.y), Math.floor(p.pos.z))) p.vel.y *= -0.35;
              if (w.isSolid(Math.floor(p.pos.x), Math.floor(p.pos.y), Math.floor(np.z))) p.vel.z *= -0.4;
              p.vel.multiplyScalar(0.8);
            } else p.pos.copy(np);
            continue;
          }
          if (solid) {
            done = true;
            if (p.type === 'energy') this.explode(p.pos.clone(), p.splash, p.dmg, 'player', p.up ? 0xff60ff : 0x60ffb0);
            if (p.type === 'spit') this.acidPuddle(p.pos.clone(), p.dmg * 0.5);
            if (p.type === 'orb') this.particles(p.pos, 0xb050ff, 8, 3);
            break;
          }
          p.pos.copy(np);
          if (p.owner === 'player') {
            for (const e of this.enemies) {
              if (e.dead) continue;
              const c = e.pos.clone(); c.y += 1 * Math.min(e.size, 2);
              if (Math.abs(p.pos.x - c.x) < e.w * 0.6 + 0.2 && Math.abs(p.pos.z - c.z) < e.w * 0.6 + 0.2 && p.pos.y > e.pos.y && p.pos.y < e.pos.y + 2 * e.size) {
                done = true; this.explode(p.pos.clone(), p.splash, p.dmg, 'player', p.up ? 0xff60ff : 0x60ffb0); break;
              }
            }
          } else {
            const c = pl.pos.clone(); c.y += 0.9;
            if (Math.abs(p.pos.x - c.x) < 0.55 && Math.abs(p.pos.z - c.z) < 0.55 && Math.abs(p.pos.y - c.y) < 1.0) {
              done = true; this.damagePlayer(p.dmg, p.owner);
              if (p.type === 'spit') this.acidPuddle(pl.pos.clone(), p.dmg * 0.5);
            }
          }
        }
      }
      if (done) { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); this.projectiles.splice(i, 1); continue; }
      p.mesh.position.copy(p.pos);
      if (p.type === 'energy') p.mesh.lookAt(p.pos.clone().add(p.vel));
      else p.mesh.rotation.x += dt * 8;
    }
  }
  acidPuddle(pos, dmg) {
    const w = this.world;
    const y = w.standAt(Math.floor(pos.x), Math.floor(pos.z));
    const m = new THREE.Mesh(new THREE.CircleGeometry(1.3, 16), new THREE.MeshBasicMaterial({ color: 0x70e030, transparent: true, opacity: 0.6, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(pos.x, (y < 999 ? y : pos.y) + 0.05, pos.z);
    this.scene.add(m);
    this.fx.push({ mesh: m, t: 0, life: 4, kind: 'acid', dmg: Math.max(4, dmg), tick: 0 });
  }

  // ---------- Bonus ----------
  spawnPowerup(type, pos) {
    if (!type) {
      const ent = Object.entries(G.POWERUPS); let tot = 0; for (const [, v] of ent) tot += v.w;
      let r = Math.random() * tot; type = 'ammo';
      for (const [k, v] of ent) { r -= v.w; if (r <= 0) { type = k; break; } }
    }
    const P = G.POWERUPS[type];
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: P.color }));
    g.add(core);
    const icon = this.makeIconSprite(P.icon, '#' + P.color.toString(16).padStart(6, '0'));
    icon.scale.set(0.8, 0.8, 1); icon.position.y = 0.8; g.add(icon);
    const y = this.world.standAt(Math.floor(pos.x), Math.floor(pos.z));
    g.position.set(pos.x, (y < 999 ? y : pos.y) + 0.8, pos.z);
    this.scene.add(g);
    this.powerups.push({ type, g, t: 0, life: 25 });
  }
  updatePowerups(dt) {
    const pl = this.player;
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.t += dt;
      p.g.rotation.y += dt * 2; p.g.children[0].position.y = Math.sin(p.t * 3) * 0.12;
      p.g.visible = p.life - p.t > 5 || Math.floor(p.t * 6) % 2 === 0;
      const d = Math.hypot(pl.pos.x - p.g.position.x, pl.pos.z - p.g.position.z);
      const gone = p.t > p.life;
      if (d < 1.3 && Math.abs(pl.pos.y + 0.8 - p.g.position.y) < 1.8) { this.applyPowerup(p.type); }
      else if (!gone) continue;
      this.scene.remove(p.g);
      p.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
      this.powerups.splice(i, 1);
    }
  }
  applyPowerup(type) {
    const P = G.POWERUPS[type], pl = this.player;
    G.Audio.S.powerup();
    if (type === 'ammo') { pl.refillAmmo(); pl.grenades = 4; }
    else if (type === 'nuke') {
      for (const e of this.enemies) if (!e.dead && !e.isBoss) { this.particles(e.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0xff8020, 6, 4); e.hp = 0; e.die('nuke', 'body'); }
      this.addPoints(400);
      this.boomLight.position.copy(pl.pos); this.boomLight.intensity = 6; this.shake(0.6);
      G.UI.flash('#ffb060');
    } else if (type === 'cash') this.addPoints(this.power.double > 0 ? 250 : 500);
    else this.power[type] = P.dur;
    this.message(P.name, '', 2, '#' + P.color.toString(16).padStart(6, '0'));
  }

  // ---------- Stations ----------
  nearestStation() {
    const pl = this.player;
    let best = null, bd = 2.4;
    for (const s of this.stations) {
      const d = Math.hypot(pl.pos.x - s.center.x, pl.pos.z - s.center.z);
      if (d < bd && Math.abs(pl.pos.y - s.def.y) < 2.5) { bd = d; best = s; }
    }
    return best;
  }
  stationPrompt(s) {
    const d = s.def, pl = this.player;
    if (d.type === 'box') {
      const b = s.box;
      if (b.state === 'spin') return 'La caisse tourne…';
      if (b.state === 'ready') return '[E] Prendre : ' + G.WEAPONS[b.weapon].name;
      return '[E] Caisse mystère — 950';
    }
    if (d.type === 'wall') {
      const W = G.WEAPONS[d.weapon];
      const idx = pl.hasWeapon(d.weapon);
      if (idx >= 0) return '[E] Munitions ' + W.name + ' — ' + (pl.slots[idx].up ? 3000 : Math.round(W.price / 2));
      return '[E] Acheter ' + W.name + ' (' + W.cls + ') — ' + W.price;
    }
    if (d.type === 'perk') {
      const P = G.PERKS[d.perk];
      if (this.wave < d.wave) return P.name + ' — inactif (vague ' + d.wave + ')';
      if (pl.perks.has(d.perk)) return P.name + ' — déjà acquis';
      return '[E] ' + P.name + ' : ' + P.desc + ' — ' + P.price;
    }
    if (d.type === 'forge') {
      if (this.wave < d.wave) return 'Forge ★ — inactive (vague ' + d.wave + ')';
      if (pl.slot.up) return 'Forge ★ — arme déjà améliorée';
      return '[E] Forge ★ : améliorer ' + G.WEAPONS[pl.slot.id].name + ' — 5000';
    }
    return '';
  }
  spend(n) {
    if (this.points < n) { G.Audio.S.deny(); G.UI.message('', 'Pas assez de points', 1.2, '#ff6060'); return false; }
    this.points -= n; G.Audio.S.buy(); G.UI.pointsPopup('-' + n, true); return true;
  }
  interact() {
    const s = this.nearestStation(); if (!s) return;
    const d = s.def, pl = this.player;
    if (d.type === 'box') {
      const b = s.box;
      if (b.state === 'idle') { if (!this.spend(950)) return; b.state = 'spin'; b.t = 0; b.weapon = null; }
      else if (b.state === 'ready') { pl.giveWeapon(b.weapon); this.clearBoxModel(s); b.state = 'idle'; G.Audio.S.buy(); }
      return;
    }
    if (d.type === 'wall') {
      const W = G.WEAPONS[d.weapon];
      const idx = pl.hasWeapon(d.weapon);
      if (idx >= 0) { const c = pl.slots[idx].up ? 3000 : Math.round(W.price / 2); if (this.spend(c)) { const st = G.weaponStats(pl.slots[idx]); pl.slots[idx].reserve = st.reserve; pl.slots[idx].mag = st.mag; } }
      else if (this.spend(W.price)) pl.giveWeapon(d.weapon);
      return;
    }
    if (d.type === 'perk') {
      if (this.wave < d.wave || pl.perks.has(d.perk)) { G.Audio.S.deny(); return; }
      const P = G.PERKS[d.perk];
      if (!this.spend(P.price)) return;
      pl.perks.add(d.perk);
      if (d.perk === 'cuirasse') { pl.maxHp = 250; pl.hp = 250; }
      this.message(P.name.toUpperCase(), P.desc, 2);
      return;
    }
    if (d.type === 'forge') {
      if (this.wave < d.wave || pl.slot.up) { G.Audio.S.deny(); return; }
      if (!this.spend(5000)) return;
      pl.slot.up = true; const st = G.weaponStats(pl.slot); pl.slot.mag = st.mag; pl.slot.reserve = st.reserve;
      pl.setViewWeapon();
      this.particles(s.center.clone().add(new THREE.Vector3(0, 1, 0)), 0xc060ff, 30, 5);
      this.message('ARME AMÉLIORÉE ★', st.name, 2.5, '#c060ff');
    }
  }
  clearBoxModel(s) { if (s.box.model) { s.group.remove(s.box.model); s.box.model = null; } }
  updateStations(dt) {
    for (const s of this.stations) {
      const d = s.def;
      if (d.type === 'perk' || d.type === 'forge') {
        const on = this.wave >= d.wave;
        const col = on ? (d.type === 'perk' ? G.PERKS[d.perk].color : 0xff8020) : 0x444444;
        if (s.stripe.material.color.getHex() !== col) s.stripe.material.color.setHex(col);
        if (s.icon) s.icon.material.opacity = on ? 1 : 0.35;
      }
      if (d.type === 'box') {
        const b = s.box;
        if (b.state === 'spin') {
          b.t += dt;
          const step = Math.floor(b.t * 10);
          if (step !== b.lastStep) {
            b.lastStep = step;
            const pool = Object.values(G.WEAPONS).filter((w) => w.box > 0 && this.player.hasWeapon(w.id) < 0);
            const pick = G.pick(pool.length ? pool : Object.values(G.WEAPONS).filter((w) => w.box > 0));
            if (b.t > 2.4) {
              // tirage final pondéré
              let tot = 0; for (const w of pool) tot += w.box;
              let r = Math.random() * tot; b.weapon = pool.length ? pool[0].id : 'smg';
              for (const w of pool) { r -= w.box; if (r <= 0) { b.weapon = w.id; break; } }
              b.state = 'ready'; b.t = 0;
            } else b.weapon = pick.id;
            this.clearBoxModel(s);
            b.model = G.makeWeaponModel(b.weapon, false); b.model.scale.setScalar(1.6); b.model.position.y = 1.4; s.group.add(b.model);
          }
          if (b.model) b.model.position.y = 1.1 + Math.min(1, b.t / 2.4) * 0.5;
        } else if (b.state === 'ready') {
          b.t += dt;
          if (b.model) b.model.rotation.y += dt * 1.5;
          if (b.t > 10) { this.clearBoxModel(s); b.state = 'idle'; }
        }
      }
    }
  }

  // ---------- HUD ----------
  updateHUD(dt) {
    const pl = this.player, st = pl.wstats, s = pl.slot;
    const near = this.nearestStation();
    G.UI.updateHUD({
      points: this.points, wave: this.wave, hp: pl.hp, maxHp: pl.maxHp,
      weapon: st.name, mag: this.power.fury > 0 ? '∞' : s.mag, reserve: s.reserve, reloading: pl.reloadT > 0,
      grenades: pl.grenades, perks: [...pl.perks], power: this.power,
      prompt: near ? this.stationPrompt(near) : (this.phase === 'intermission' && this.wave > 0 ? 'Vague suivante dans ' + Math.ceil(this.phaseT) + ' s — [N] pour lancer' : ''),
      boss: this.boss && !this.boss.dead ? { name: this.boss.T.name, hp: this.boss.hp / this.boss.maxHp, stunned: this.boss.state === 'stunned' } : null,
      left: this.phase === 'active' ? this.toSpawn + this.aliveCount() : 0,
      ads: pl.ads, sprint: pl.sprinting, stamina: pl.stamina, slots: pl.slots.map((x, i) => ({ name: G.weaponStats(x).name, cur: i === pl.cur })),
    });
    this.drawMinimap();
  }
  drawMinimap() {
    const cv = document.getElementById('minimap'); if (!cv) return;
    const ctx = cv.getContext('2d'), S = cv.width, pl = this.player;
    const scale = 3, half = S / scale / 2;
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S, S);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(this.minimapImg, pl.pos.x - half, pl.pos.z - half, half * 2, half * 2, 0, 0, S, S);
    ctx.globalAlpha = 1;
    const tx = (x) => (x - pl.pos.x + half) * scale, tz = (z) => (z - pl.pos.z + half) * scale;
    for (const s of this.stations) {
      ctx.fillStyle = s.def.type === 'box' ? '#60b0ff' : s.def.type === 'perk' ? '#' + G.PERKS[s.def.perk].color.toString(16).padStart(6, '0') : s.def.type === 'forge' ? '#c060ff' : '#e0b040';
      ctx.fillRect(tx(s.center.x) - 3, tz(s.center.z) - 3, 6, 6);
    }
    for (const p of this.powerups) { ctx.fillStyle = '#ffff60'; ctx.beginPath(); ctx.arc(tx(p.g.position.x), tz(p.g.position.z), 3.5, 0, Math.PI * 2); ctx.fill(); }
    for (const e of this.enemies) {
      if (e.dead) continue;
      ctx.fillStyle = e.isBoss ? '#ff40ff' : e.elite ? '#ffffff' : '#ff3030';
      const r = e.isBoss ? 5 : 2.5;
      ctx.beginPath(); ctx.arc(tx(e.pos.x), tz(e.pos.z), r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.translate(S / 2, S / 2); ctx.rotate(-pl.yaw + Math.PI);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(-5, -5); ctx.lineTo(5, -5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); ctx.stroke();
  }
};

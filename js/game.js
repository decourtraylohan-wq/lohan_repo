// Boucle de jeu : vagues, tir, points, bonus, stations, effets, HUD
G.POWERUPS = {
  ammo: { name: 'MUNITIONS MAX', color: 0x40c0ff, icon: 'M', w: 3 },
  insta: { name: 'MORT INSTANTANÉE', color: 0xff4040, icon: '☠', w: 2, dur: 20 },
  double: { name: 'POINTS ×2', color: 0xffd040, icon: '×2', w: 3, dur: 20 },
  nuke: { name: 'BOMBE', color: 0xff8020, icon: '✹', w: 1.5 },
  fury: { name: 'FUREUR', color: 0xc040ff, icon: '∞', w: 1.5, dur: 15 },
  cash: { name: 'BUTIN', color: 0x40ff80, icon: '$', w: 2 },
  plate: { name: "PLAQUE D'ARMURE", color: 0x5aa0ff, icon: '⛨', w: 2.5 },
};

G.CRAFT = [
  { id: 'barricade', name: 'Barricade (sacs de sable)', desc: 'Mur bas 3×1 : abri accroupi, 450 PV (cassable)', price: 600, max: 4 },
  { id: 'shield', name: 'Bouclier énergétique', desc: 'Bloque balles et zombies, vos tirs passent. 1500 PV, 60 s', price: 900, max: 3 },
  { id: 'plate', name: "Plaque d'armure", desc: '+50 armure (touche X)', price: 400, max: 5 },
  { id: 'grenade', name: 'Grenade', desc: 'Explosif (touche A ou G)', price: 250, max: 4 },
];

G.Game = class {
  constructor(canvas) {
    this.canvas = canvas;
    const q = G.Ranked.profile.settings.quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: q === 'haute', powerPreference: 'high-performance' });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.autoClear = false;
    this.applyQuality();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.05, 260);
    this.player = new G.Player(this);
    this.setupPost();
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
    this.coop = new G.Coop(this);
    requestAnimationFrame((t) => this.frame(t));
  }

  setupPost() {
    const q = G.Ranked.profile.settings.quality;
    this.usePost = q !== 'basse';
    if (this.post) { this.post.rt.dispose(); }
    const isGL2 = this.renderer.capabilities.isWebGL2;
    const rt = new THREE.WebGLRenderTarget(4, 4, { samples: isGL2 && q === 'haute' ? 4 : 0 });
    const mat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: rt.texture }, uTime: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uWarp: { value: 0 }, uSat: { value: 0.9 }, uContrast: { value: 1.06 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform float uTime; uniform vec3 uTint; uniform float uWarp; uniform float uSat; uniform float uContrast; varying vec2 vUv;',
        'float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }',
        'void main(){',
        '  vec2 uv = vUv;',
        '  if (uWarp > 0.0) uv += vec2(sin(uv.y * 30.0 + uTime * 12.0), cos(uv.x * 26.0 + uTime * 9.0)) * 0.006 * uWarp;',
        '  vec3 c = texture2D(tDiffuse, uv).rgb;',
        '  if (uWarp > 0.0) { c.r = texture2D(tDiffuse, uv + vec2(0.004 * uWarp, 0.0)).r; c.b = texture2D(tDiffuse, uv - vec2(0.004 * uWarp, 0.0)).b; }',
        '  float l = dot(c, vec3(0.299, 0.587, 0.114));',
        '  c = mix(vec3(l), c, uSat);',
        '  c = (c - 0.18) * uContrast + 0.18;',
        '  c *= uTint;',
        '  vec2 d = vUv - 0.5; c *= 1.0 - dot(d, d) * 0.9;',
        '  c += (rnd(vUv * 731.0 + uTime) - 0.5) * 0.018;',
        '  gl_FragColor = linearToOutputTexel(vec4(max(c, 0.0), 1.0));',
        '}',
      ].join('\n'),
      depthTest: false, depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
    const scene = new THREE.Scene(); scene.add(quad);
    this.post = { rt, mat, scene, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
    this.resize && this.resize();
  }
  render() {
    const r = this.renderer, playing = this.phase !== 'menu' && this.phase !== 'over';
    if (this.sky) this.sky.position.copy(this.camera.position);
    if (this.stars) this.stars.position.copy(this.camera.position);
    if (this.usePost) {
      r.setRenderTarget(this.post.rt); r.clear();
      r.render(this.scene, this.camera);
      if (playing && !this.player.vehicle && !this.player.spectator) { r.clearDepth(); r.render(this.player.vmScene, this.player.vmCam); }
      r.setRenderTarget(null); r.clear();
      this.post.mat.uniforms.uTime.value = (this.post.mat.uniforms.uTime.value + 0.016) % 100;
      this.post.mat.uniforms.uWarp.value = Math.max(0, (this.warpT || 0));
      r.render(this.post.scene, this.post.cam);
    } else {
      r.setRenderTarget(null); r.clear();
      r.render(this.scene, this.camera);
      if (playing && !this.player.vehicle && !this.player.spectator) { r.clearDepth(); r.render(this.player.vmScene, this.player.vmCam); }
    }
  }
  applyQuality() {
    const q = G.Ranked.profile.settings.quality;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 'haute' ? 1.5 : q === 'moyenne' ? 1 : 0.7));
    if (this.post) this.setupPost();
    this.resize && this.camera && this.resize();
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    if (this.post) { const pr = this.renderer.getPixelRatio(); this.post.rt.setSize(Math.floor(w * pr), Math.floor(h * pr)); }
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
    scene.background = new THREE.Color(d.sky[1]);
    scene.fog = new THREE.Fog(d.fog[0], d.fog[1], d.fog[2]);
    scene.add(new THREE.HemisphereLight(d.hemi[0], d.hemi[1], d.hemi[2]));
    const q = G.Ranked.profile.settings.quality;
    const shadows = q === 'haute';
    this.renderer.shadowMap.enabled = shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const sun = new THREE.DirectionalLight(d.sun[0], d.sun[1]);
    this.sunDir = new THREE.Vector3(0.55, 1, 0.35).normalize();
    sun.position.copy(this.sunDir).multiplyScalar(60).add(new THREE.Vector3(d.size / 2, 0, d.size / 2));
    sun.target.position.set(d.size / 2, 0, d.size / 2);
    if (shadows) {
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      const c = sun.shadow.camera; c.left = -45; c.right = 45; c.top = 45; c.bottom = -45; c.near = 1; c.far = 160;
      sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    }
    scene.add(sun); scene.add(sun.target); this.sun = sun;
    scene.add(new THREE.AmbientLight(0xffffff, 0.16));
    this.scene = scene;
    this.world.buildMesh(scene, shadows);
    this.buildSky(d);
    const tints = { village: [1.0, 1.0, 0.97], desert: [1.06, 1.0, 0.88], toundra: [0.92, 0.98, 1.1], enfer: [1.12, 0.92, 0.84], ville: [0.98, 1.0, 1.03] };
    const tt = tints[d.id] || [1, 1, 1]; this.post.mat.uniforms.uTint.value.set(tt[0], tt[1], tt[2]);
    // lumière dynamique (tirs / explosions)
    this.flashLight = new THREE.PointLight(0xffc060, 0, 10); scene.add(this.flashLight);
    this.boomLight = new THREE.PointLight(0xff8030, 0, 16); scene.add(this.boomLight);
    this.buildStations();
    this.buildWeather(d.weather);
    this.buildClouds(d);
    this.buildMinimap();
    this.enemies = []; this.projectiles = []; this.powerups = []; this.fx = []; this.particlesList = [];
    this.builds = []; this.ghost = null; this.buildItem = null;
    this.vehicles = G.seeded(4242, () => (map.carSpots || []).slice(0, 28).map((sp) => new G.Vehicle(this, sp)));
    this.tracers = [];
    scene.add(this.camera);
  }
  buildSky(d) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color(d.sky[0]) }, hor: { value: new THREE.Color(d.sky[1]) }, sunDir: { value: this.sunDir.clone() }, sunCol: { value: new THREE.Color(d.sun[0]) }, night: { value: d.weather === 'snow' || d.id === 'enfer' ? 1 : 0 } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float night; varying vec3 vDir; void main(){ float h = clamp(vDir.y, 0.0, 1.0); vec3 c = mix(hor, top, pow(h, 0.6)); float s = max(dot(normalize(vDir), sunDir), 0.0); c += sunCol * (pow(s, 600.0) * 2.0 + pow(s, 12.0) * 0.25) * (1.0 - night * 0.8); if (vDir.y < 0.0) c = hor; gl_FragColor = linearToOutputTexel(vec4(c, 1.0)); }',
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(230, 24, 12), mat);
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);
    this.stars = null;
    if (d.weather === 'snow') {
      const N = 600, pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 0.45 + 0.08; pos[i * 3] = Math.cos(a) * Math.cos(b) * 200; pos[i * 3 + 1] = Math.sin(b) * 200; pos[i * 3 + 2] = Math.sin(a) * Math.cos(b) * 200; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false, fog: false }));
      this.scene.add(this.stars);
    }
  }
  disposeScene() {
    for (const e of this.enemies || []) e.remove();
    for (const v of this.vehicles || []) v.remove();
    if (this.player) { this.player.vehicle = null; this.player.spectator = false; }
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
        const gun = G.makeWeaponModel(s.weapon, false, true); gun.scale.setScalar(1.3); gun.position.y = 1.45; g.add(gun); st.gun = gun;
      } else if (s.type === 'perk') {
        const P = G.PERKS[s.perk];
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.04, 2.04, 1.04), new THREE.MeshLambertMaterial({ map: G.Tex.noiseTex('perk' + s.perk, P.color, 30, (ctx, rnd, px) => { for (let x = 1; x < 7; x++) for (let y = 2; y < 5; y++) px(x, y, 0x1a1a1a); }) }));
        body.position.y = 1.0; g.add(body);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.18, 1.08), new THREE.MeshBasicMaterial({ color: 0x555555 }));
        stripe.position.y = 1.75; g.add(stripe); st.stripe = stripe;
        const icon = this.makeIconSprite(P.icon, '#' + P.color.toString(16).padStart(6, '0'));
        icon.position.y = 2.6; icon.scale.set(0.9, 0.9, 1); g.add(icon); st.icon = icon;
      } else if (s.type === 'bench') {
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 1.04), new THREE.MeshLambertMaterial({ map: G.Tex.noiseTex('benchtop', 0x8a6a40, 24, (ctx, rnd, px) => { for (let x = 0; x < 8; x++) px(x, 3, 0x5a4428); }) }));
        top.position.y = 0.92; g.add(top);
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.84, 0.9), new THREE.MeshLambertMaterial({ map: G.Tex.noiseTex('benchbase', 0x5a4430, 20) }));
        base.position.y = 0.42; g.add(base);
        const saw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.12), new THREE.MeshLambertMaterial({ color: 0xaaaaaa })); saw.position.set(0.15, 1.02, 0.1); g.add(saw);
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.2), new THREE.MeshLambertMaterial({ color: 0x958866 })); bag.position.set(-0.25, 1.08, -0.15); g.add(bag);
        const icon = this.makeIconSprite('⚒', '#e0a040'); icon.position.y = 1.9; icon.scale.set(0.8, 0.8, 1); g.add(icon); st.icon = icon;
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
  // mode Histoire / Missions : même moteur, objectifs à la place des vagues
  startMission(def, kind) {
    if (this.coop && this.coop.code) this.coop.leave();
    if (this.campaign) this.campaign.dispose();
    this.pendingMission = def;
    this.start(def.map, 'classic', def.type, null);
    this.pendingMission = null;
    this.campaign = new G.MissionRun(this, def, kind);
    this.campaign.begin();
  }
  start(mapId, mode, gameType = 'zombies', cheats = null) {
    G.Audio.init();
    if (this.campaign) { this.campaign.dispose(); this.campaign = null; }
    this.loadMap(mapId);
    this.cheats = cheats && cheats.on ? cheats : null;
    this.lastCheats = this.cheats;
    if (this.cheats) mode = 'classic';
    this.mode = mode;
    this.gameType = gameType;
    G.Audio.startAmbient(mapId);
    this.mods = G.Ranked.modifiers(mode);
    this.player.reset(this.map.playerSpawn);
    this.wave = 0; this.points = 500; this.time = 0;
    this.toSpawn = 0; this.spawnT = 0;
    this.power = { insta: 0, double: 0, fury: 0 };
    this.stats = { kills: 0, headshots: 0, shots: 0, hits: 0, dmgDealt: 0, dmgTaken: 0, points: 0, bosses: 0, specials: 0, revives: 0 };
    this.waveStats = []; this.curWave = null;
    this.phase = 'intermission'; this.phaseT = 10;
    this.setupBorder();
    this.boss = null; this.dropsThisWave = 0;
    this.flowT = 0; this.paused = false;
    this.world.computeFlow(this.player.pos.x, this.player.pos.y, this.player.pos.z);
    this.lastPerkWave = 0;
    this.builds = []; this.buildItem = null; this.craftOpen = false; this.portalCD = 0; this.ghost = null;
    this.squads = [];
    if (this.cheats) {
      const c = this.cheats, pl = this.player;
      this.points = c.points || 50000;
      if (c.wave > 1) { this.wave = c.wave - 1; this.phaseT = 3; }
      const ws = (c.weapons || []).filter((id) => G.WEAPONS[id]);
      if (c.allPerks) { for (const k in G.PERKS) pl.perks.add(k); pl.maxHp = 250; pl.hp = 250; }
      if (ws.length) { pl.slots = ws.slice(0, pl.maxSlots).map((id) => pl.newSlot(id, !!c.upgraded)); pl.cur = 0; pl.setViewWeapon(); }
      pl.plates = 5; pl.armor = 150; pl.builds = { barricade: 4, shield: 3 }; pl.grenades = 4;
    }
    this.coopFinal = false;
    if (this.coop && this.coop.code && !this.coop.started) this.coop.leave();
    G.UI.showHUD(true);
    if (this.coop && this.coop.active) { this.coop.onGameStart(); this.lockPointer(); return; }
    this.message('PRÉPAREZ-VOUS', (gameType === 'soldats' ? 'Soldats — ' : 'Zombies — ') + this.map.def.name + (mode === 'ranked' ? ' — CLASSÉ ' + G.Ranked.rankInfo(G.Ranked.profile.rp).label : ' — CLASSIQUE'), 3.5);
    this.lockPointer();
  }
  lockPointer() { try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignoré */ } }
  quitToMenu(keepCoop) {
    G.Voice.stop();
    if (this.coop && this.coop.code) { if (keepCoop) this.coop.backToRoom(); else this.coop.leave(); }
    if (this.campaign) { this.campaign.dispose(); this.campaign = null; }
    this.phase = 'menu'; this.paused = false;
    if (document.pointerLockElement) document.exitPointerLock();
    G.UI.showHUD(false);
    G.Audio.stopAmbient();
    this.loadMap(this.map.def.id);
  }
  setPaused(p) {
    if (p) G.Voice.stop();
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
      if (e.repeat) { if (['Space', 'Tab'].includes(e.code)) e.preventDefault(); return; }
      if (pl.dead && e.code !== 'Tab') return; // coop : à terre, on regarde ses équipiers
      // les lettres d'action suivent la disposition du clavier (AZERTY : E, A, F…)
      const key = (e.key || '').toLowerCase();
      if (pl.vehicle) { if (key === 'e') this.exitVehicle(); if (e.code === 'Space') e.preventDefault(); return; }
      if (key === 'r') pl.tryReload();
      if (e.code === 'Digit1' && !this.craftOpen) pl.switchTo(0);
      if (e.code === 'Digit2' && !this.craftOpen) pl.switchTo(1);
      if (e.code === 'Digit3' && !this.craftOpen) pl.switchTo(2);
      if (key === 'e') {
        // E : interagir si une station ou un véhicule est à portée, sinon coup de couteau
        if (this.campaign && this.campaign.nearInteract()) { /* maintien de E géré par la mission */ }
        else if (this.nearestStation()) this.interact();
        else if (this.nearestVehicle()) this.enterVehicle(this.nearestVehicle());
        else pl.melee();
      }
      if (key === 'v') pl.melee();
      if (key === 'x') pl.usePlate();
      if (key === 'f') this.cycleBuild();
      if ((key === 'a' && e.code !== 'KeyA') || key === 'g') pl.throwGrenade();
      if (e.code === 'KeyC') {
        // double appui sur C : rester accroupi
        const now = performance.now();
        if (pl.crouchLock) pl.crouchLock = false;
        else if (now - (this.lastC || 0) < 320) pl.crouchLock = true;
        this.lastC = now;
      }
      if (this.craftOpen && /^Digit[1-4]$/.test(e.code)) { this.craft(Number(e.code.slice(5)) - 1); return; }
      if (this.cheats && key === 'k') this.cheatSkip();
      if (this.cheats && key === 'l') { this.points += 10000; }
      if (this.cheats && this.cheats.spectator && key === 't') this.toggleSpectator();
      if (e.code === 'KeyN' && this.phase === 'intermission' && this.wave > 0 && !(this.coop && this.coop.isClient)) this.phaseT = Math.min(this.phaseT, 0.5);
      if (e.code === 'Tab') { e.preventDefault(); G.UI.showScoreboard(true); }
      if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
    });
    document.addEventListener('keyup', (e) => { pl.keys[e.code] = false; if (e.code === 'Tab') G.UI.showScoreboard(false); });
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.phase === 'menu' || this.phase === 'over' || this.paused) return;
      if (!document.pointerLockElement) this.lockPointer();
      if (pl.dead) return;
      if (e.button === 0) pl.mouse.left = true;
      if (e.button === 1) { e.preventDefault(); pl.melee(); }
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
    if (this.coop && this.phase === 'menu') this.coop.pollLobby();
    if (this.phase === 'menu' || this.phase === 'over') {
      const a = t * 0.00005, c = this.world.W / 2;
      this.camera.position.set(c + Math.cos(a) * c * 0.85, this.world.H * 0.7 + 4, c + Math.sin(a) * c * 0.85);
      this.camera.lookAt(c, this.world.H * 0.3, c);
      if (this.camera.fov !== 70) { this.camera.fov = 70; this.camera.updateProjectionMatrix(); }
      this.updateAmbient(dt);
      this.updateSun(this.camera.position);
      this.render();
      return;
    }
    // en coop, le monde continue de tourner pendant la pause (les équipiers jouent toujours)
    const live = !this.paused || (this.coop && this.coop.active);
    if (live) this.update(dt);
    this.updateSun(this.player.pos);
    this.render();
    if (live) this.updateHUD(dt);
  }

  updateSun(p) {
    if (!this.sun) return;
    const x = Math.round(p.x / 4) * 4, z = Math.round(p.z / 4) * 4;
    this.sun.target.position.set(x, 0, z);
    this.sun.position.set(x + this.sunDir.x * 70, this.sunDir.y * 70, z + this.sunDir.z * 70);
  }
  updateAmbient(dt) {
    this.animT = (this.animT || 0) + dt;
    if (this.world) this.world.animate(this.animT);
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
    if (this.flowT <= 0) {
      // les ennemis ne cherchent pas de chemin hors de la zone de combat
      this.world.flowBounds = this.borderR !== undefined && this.borderR < this.borderFull - 0.5 ? { x: this.borderC.x, z: this.borderC.y, R: this.borderR - 0.6 } : null;
      this.flowT = 0.25; this.world.computeFlow(pl.pos.x, pl.pos.y, pl.pos.z);
      if (this.enemies.some((e) => e.big && !e.dead)) this.world.computeFlowBig(pl.pos.x, pl.pos.y, pl.pos.z);
    }
    // joueur en étage (immeuble, tour, toit) : les ennemis se répartissent entre ceux qui montent et ceux qui se postent
    this.upT = (this.upT || 0) - dt;
    if (this.upT <= 0) {
      this.upT = 0.5;
      const w = this.world, ground = w.standAt(Math.floor(pl.pos.x), Math.floor(pl.pos.z));
      this.playerUp = !pl.vehicle && ground < 999 && pl.pos.y - ground > 3.5;
      pl.up = this.playerUp;
    }
    // la voiture du joueur ne cache pas le joueur aux ennemis : ils la voient et lui tirent dessus
    this.world.losIgnore = pl.vehicle && !pl.vehicle.dead ? pl.vehicle.solid : null;
    this.updateBorder(dt);
    this.updateWater(dt);
    G.Audio.setListener(pl.eye.x, pl.eye.y, pl.eye.z, pl.yaw);
    if (this.warpT > 0) this.warpT -= dt;
    this.beatT = (this.beatT || 0) - dt;
    {
      const hpP = pl.hp / pl.maxHp, danger = G.clamp((0.6 - hpP) / 0.55, 0, 1);
      if (danger > 0 && !pl.dead && this.beatT <= 0) { this.beatT = G.lerp(1.15, 0.42, danger); G.Audio.S.heartbeat(0.35 + danger * 1.1); G.UI._beat = 1; }
    }

    if (this.campaign) this.campaign.update(dt); else if (!(this.coop && this.coop.isClient)) this.updateWaves(dt);
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
    this.updateBuilds(dt);
    this.updatePortals(dt);
    for (const v of this.vehicles) v.update(dt, v === pl.vehicle ? v.input : null);
    if (pl.vehicle) pl.vehicleCamera(this.camera, dt);
    if (pl.spectator) { for (const e of this.enemies) if (!e.dead) { e.dead = true; e.deadT = 3; } }
    if (this.coop && this.coop.active) this.coop.update(dt);
    this.world.updateDirty();
    if (this.craftOpen && (!this.craftStation || Math.hypot(pl.pos.x - this.craftStation.center.x, pl.pos.z - this.craftStation.center.z) > 3)) this.closeCraft();
    if (this.cheats && this.cheats.god) { pl.hp = pl.maxHp; }
    if (this.cheats && this.cheats.ammo) { const sl = pl.slot; sl.reserve = Math.max(sl.reserve, 99); }
    this.flashLight.intensity = Math.max(0, this.flashLight.intensity - dt * 40);
    this.boomLight.intensity = Math.max(0, this.boomLight.intensity - dt * 6);
  }

  // ---------- Vagues ----------
  zombieBaseHp() { const w = Math.max(1, this.wave); return w < 10 ? 80 + 45 * w : 485 * Math.pow(1.09, w - 9); }
  waveCount(w) { const n = Math.round(5 + w * 2.4 + w * w * 0.12); return this.gameType === 'soldats' ? Math.round(n * 0.55) + 2 : n; }
  soldierBaseHp() { const w = Math.max(1, this.wave); return w < 10 ? 90 + 24 * w : 306 * Math.pow(1.07, w - 9); }
  maxAlive() { return this.gameType === 'soldats' ? Math.min(16, 6 + Math.floor(this.wave / 2) + this.mods.tier) : this.mods.maxAlive; }
  // ---------- Zone de jeu qui s'agrandit au fil des vagues ----------
  setupBorder() {
    const W = this.world.W, c = this.map.playerSpawn;
    this.borderC = new THREE.Vector2(c.x, c.z);
    const full = Math.max(c.x, W - c.x, c.z, this.world.D - c.z) + 1;
    this.borderFull = full;
    this.borderStart = this.cheats || this.pendingMission ? full : this.gameType === 'soldats' ? 22 : 16;
    this.borderWaves = this.gameType === 'soldats' ? 3 : 5;
    this.borderR = this.borderTarget = this.borderStart;
    const c2 = document.createElement('canvas'); c2.width = c2.height = 32;
    const x2 = c2.getContext('2d'); x2.fillStyle = 'rgba(255,110,50,0.18)'; x2.fillRect(0, 0, 32, 32);
    x2.strokeStyle = 'rgba(255,150,80,0.75)'; x2.lineWidth = 3; for (let i = -32; i < 64; i += 12) { x2.beginPath(); x2.moveTo(i, 32); x2.lineTo(i + 32, 0); x2.stroke(); }
    this.borderTex = new THREE.CanvasTexture(c2); this.borderTex.wrapS = this.borderTex.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshBasicMaterial({ map: this.borderTex, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false, fog: false });
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); g.add(m); }
    const lines = new THREE.MeshBasicMaterial({ color: 0xffa060, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, fog: false });
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), lines); g.add(m); }
    this.borderMesh = g; this.scene.add(g);
    this.layoutBorder();
  }
  layoutBorder() {
    const R = this.borderR, c = this.borderC, H = this.world.H + 12, g = this.borderMesh;
    if (!g) return;
    g.visible = R < this.borderFull - 0.5;
    const sides = [[c.x, c.y - R, 0], [c.x, c.y + R, 0], [c.x - R, c.y, Math.PI / 2], [c.x + R, c.y, Math.PI / 2]];
    sides.forEach(([x, z, ry], i) => {
      const m = g.children[i]; m.position.set(x, H / 2, z); m.rotation.set(0, ry, 0); m.scale.set(2 * R, H, 1);
      if (this.borderTex) this.borderTex.repeat.set(R / 2, H / 4);
      const l = g.children[i + 4]; l.position.set(x, 1, z); l.rotation.set(0, ry, 0); l.scale.set(2 * R, 0.15, 1);
    });
  }
  updateBorder(dt) {
    if (this.borderR === undefined) return;
    if (Math.abs(this.borderR - this.borderTarget) > 0.01) { this.borderR = G.lerp(this.borderR, this.borderTarget, Math.min(1, dt * 1.2)); this.layoutBorder(); }
    const R = this.borderR - 0.4, c = this.borderC;
    const clamp = (p) => { p.x = G.clamp(p.x, c.x - R, c.x + R); p.z = G.clamp(p.z, c.y - R, c.y + R); };
    const pl = this.player;
    if (!pl.spectator) {
      const before = pl.pos.x + pl.pos.z;
      clamp(pl.pos);
      if (pl.pos.x + pl.pos.z !== before) { this.borderHintT = (this.borderHintT || 0) - dt; if (this.borderHintT <= 0) { this.borderHintT = 3; G.UI.message('', 'Limite de zone : elle s\'agrandit au fil des vagues', 1.5, '#ffa060'); } }
    }
    for (const e of this.enemies) if (!e.dead) clamp(e.pos);
  }
  expandBorder() {
    const k = Math.min(1, (this.wave) / (this.borderWaves - 1 || 1));
    const t = G.lerp(this.borderStart, this.borderFull, k);
    if (t > this.borderTarget + 0.5) { this.borderTarget = t; return true; }
    return false;
  }
  insideBorder(x, z, m = 1) { const c = this.borderC, R = this.borderR - m; return Math.abs(x - c.x) <= R && Math.abs(z - c.y) <= R; }
  // ---------- Eau : nage du joueur, vue sous l'eau ----------
  updateWater(dt) {
    const pl = this.player, w = this.world;
    const under = !pl.vehicle && w.blockAt(pl.eye.x, pl.eye.y + 0.05, pl.eye.z) === G.B.WATER;
    if (under !== this.underwater) {
      this.underwater = under;
      const f = this.scene.fog, d = this.map.def;
      if (under) { f.color.setHex(0x1a4a6a); f.near = 0.5; f.far = 14; }
      else { f.color.setHex(d.fog[0]); f.near = d.fog[1]; f.far = d.fog[2]; }
      G.UI.underwater(under);
    }
  }
  aliveCount() { let n = 0; for (const e of this.enemies) if (!e.dead) n++; return n; }
  isBossWave(w) { return w % 5 === 0; }

  beginWave() {
    this.wave++;
    if (this.coop && this.coop.isHost) this.coop.onWaveStart();
    const w = this.wave;
    this.toSpawn = this.waveCount(w);
    this.spawnT = 1.5;
    this.dropsThisWave = 0;
    this.phase = 'active';
    this.curWave = { n: w, t0: this.time, kills: 0, hs: 0, dmgTaken: 0, pts: 0, boss: null, specials: 0 };
    if (this.isBossWave(w)) {
      this.toSpawn = Math.round(this.toSpawn * 0.45);
      const idx = (w / 5 - 1) % 3, cycle = Math.floor((w / 5 - 1) / 3);
      this.curWave.bossPending = true;
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
    if (this.gameType === 'soldats') {
      if (w + e === 2) hints.push('Assaillants et Égorgeurs au couteau arrivent au contact');
      if (w + e === 5) hints.push('Des tireurs embusqués restent à distance');
      if (w + e === 3) hints.push('Brécheurs à fusil à pompe !');
      if (w + e === 4) hints.push('Grenadiers : attention aux grenades');
      if (w + e === 6) hints.push("Tireurs d'élite : repérez le laser rouge !");
      if (w + e === 8) hints.push('Mitrailleurs lourds en approche');
      if (w === 8) hints.push('La Forge est active ★');
      return hints.join(' — ');
    }
    if (w + e === 3) hints.push('Des Coureurs rôdent…');
    if (w + e === 4) hints.push('Des Rampants se faufilent au sol');
    if (w + e === 7) hints.push('Traqueurs : ils bondissent sur vous !');
    if (w + e === 9) hints.push('Hurleuses : leur cri vous ralentit et enrage les autres');
    if (w + e === 6) hints.push('Attention aux Brutes !');
    if (w + e === 8) hints.push('Les Gonflés explosent au contact !');
    if (w + e === 11) hints.push('Des Cracheurs à distance !');
    if (w === this.mods.armoredFrom) hints.push('Zombies Blindés : visez le corps ou brisez le casque');
    if (w === 8) hints.push('La Forge est active ★');
    return hints.join(' — ');
  }
  spawnBoss(idx, cycle) {
    const T = (this.gameType === 'soldats' ? G.SBOSSES : G.BOSSES)[idx];
    let p = this.pickSpawn(14, 30) || this.map.playerSpawn.clone();
    if (T.size >= 1.4) {
      this.world.computeFlowBig(this.player.pos.x, this.player.pos.y, this.player.pos.z);
      let bestK = Infinity;
      for (let i = 0; i < 40; i++) { const c = this.pickSpawn(10, 40); if (!c) break; const id = this.world.nodeNear(c.x, c.y, c.z); if (id >= 0 && this.world.nav.big[id] && this.world.nav.distBig[id] >= 0 && this.world.nav.distBig[id] < bestK) { bestK = this.world.nav.distBig[id]; p = c; } }
    }
    const b = new G.Enemy(this, T.id, p, { boss: T, hpScale: (1 + 0.6 * cycle) * this.mods.bossHp, cycle });
    this.enemies.push(b);
    this.boss = b;
    this.curWave.boss = T.name; this.curWave.bossPending = false;
    this.message(T.name, cycle > 0 ? 'Il est revenu… plus fort.' : 'Abattez-le !', 3);
    G.Audio.S.boss();
    this.shake(0.6);
  }
  chooseType() {
    const w = this.wave, ww = w + this.mods.early, r = Math.random();
    let acc = 0;
    const opts = [];
    if (this.gameType === 'soldats') {
      if (ww >= 2) opts.push(['assault', Math.min(0.25, 0.1 + ww * 0.02)]);
      if (ww >= 2) opts.push(['knifer', Math.min(0.14, 0.05 + ww * 0.012)]);
      if (ww >= 5) opts.push(['marksman', Math.min(0.12, (ww - 4) * 0.025)]);
      if (ww >= 3) opts.push(['breacher', Math.min(0.15, (ww - 2) * 0.03)]);
      if (ww >= 4) opts.push(['grenadier', Math.min(0.12, (ww - 3) * 0.025)]);
      if (ww >= 6) opts.push(['sniper', Math.min(0.12, (ww - 5) * 0.025)]);
      if (ww >= 8) opts.push(['heavy', Math.min(0.14, (ww - 7) * 0.025)]);
      for (const [t, p] of opts) { acc += p; if (r < acc) return t; }
      return 'rifleman';
    }
    if (ww >= 3) opts.push(['runner', Math.min(0.26, (ww - 2) * 0.04)]);
    if (ww >= 4) opts.push(['crawler', Math.min(0.1, (ww - 3) * 0.02)]);
    if (ww >= 7) opts.push(['stalker', Math.min(0.09, (ww - 6) * 0.018)]);
    if (ww >= 9) opts.push(['screamer', Math.min(0.05, (ww - 8) * 0.012)]);
    if (ww >= 6) opts.push(['brute', Math.min(0.12, (ww - 5) * 0.018)]);
    if (ww >= 8) opts.push(['bloater', Math.min(0.1, (ww - 7) * 0.018)]);
    if (ww >= 11) opts.push(['spitter', Math.min(0.1, (ww - 10) * 0.018)]);
    if (w >= this.mods.armoredFrom) opts.push(['armored', Math.min(0.2, (w - this.mods.armoredFrom + 1) * 0.03)]);
    for (const [t, p] of opts) { acc += p; if (r < acc) return t; }
    return 'walker';
  }
  pickSpawn(minD = 12, maxD = 40) {
    const pl = this.player.pos, w = this.world;
    if (this.borderR !== undefined && this.borderR < this.borderFull - 0.5) {
      // zone réduite : on fait apparaître près du bord intérieur de la zone
      const R = this.borderR - 2, c = this.borderC, md = Math.min(minD, R * 0.7);
      for (let i = 0; i < 40; i++) {
        const side = Math.floor(Math.random() * 4), t = (Math.random() * 2 - 1) * R;
        const x = Math.floor(side < 2 ? c.x + t : c.x + (side === 2 ? -R : R)), z = Math.floor(side < 2 ? c.y + (side === 0 ? -R : R) : c.y + t);
        const y = w.standAt(x, z); if (y >= 999) continue;
        if (Math.hypot(x + 0.5 - pl.x, z + 0.5 - pl.z) < md) continue;
        if (w.flowDistAt(x + 0.5, y, z + 0.5) < 0) continue;
        if (w.blockAt(x, y + 0.5, z) === G.B.WATER || w.blockAt(x, y + 0.5, z) === G.B.LAVA || w.blockAt(x, y + 0.5, z) === G.B.LAVA_FLOW) continue;
        return new THREE.Vector3(x + 0.5, y, z + 0.5);
      }
    }
    const ok = [], reach = [];
    const scale = w.W / 64;
    for (const sp of this.map.spawns) {
      const [x, y, z] = sp;
      if (w.flowDistAt(x + 0.5, y, z + 0.5) < 0) continue;
      reach.push(sp);
      const d = Math.hypot(x + 0.5 - pl.x, z + 0.5 - pl.z);
      if (d >= minD && d <= maxD * scale) ok.push(sp);
    }
    const list = ok.length ? ok : reach.length ? reach : this.map.spawns;
    if (!list.length) return null;
    const [x, y, z] = G.pick(list);
    return new THREE.Vector3(x + 0.5, y, z + 0.5);
  }
  spawnEnemy(type, pos) {
    const e = new G.Enemy(this, type, pos);
    this.enemies.push(e);
    return e;
  }
  updateWaves(dt) {
    if (this.player.spectator) return;
    if (this.phase === 'intermission') {
      this.phaseT -= dt;
      if (this.phaseT <= 0) this.beginWave();
      return;
    }
    if (this.phase !== 'active') return;
    if (this.bossT > 0) { this.bossT -= dt; if (this.bossT <= 0) this.spawnBoss(this.bossArgs[0], this.bossArgs[1]); }
    this.spawnT -= dt;
    if (this.toSpawn > 0 && this.spawnT <= 0 && this.aliveCount() < this.maxAlive()) {
      this.spawnT = this.gameType === 'soldats' ? Math.max(0.8, 2.6 - this.wave * 0.08) : Math.max(0.3, 2.0 - this.wave * 0.08);
      const p = this.pickSpawn();
      if (p && this.gameType === 'soldats') {
        // les soldats arrivent par escouades
        const size = this.wave <= 2 ? 1 + Math.floor(Math.random() * 2) : this.wave <= 5 ? 2 + Math.floor(Math.random() * 2) : this.wave <= 9 ? 3 + Math.floor(Math.random() * 2) : 4 + Math.floor(Math.random() * 2);
        const n = Math.min(this.toSpawn, this.maxAlive() - this.aliveCount(), size);
        if (n < size && this.toSpawn > n) { this.spawnT = 0.5; return; } // on attend d'avoir la place pour toute l'escouade
        const squad = { leader: null, members: [] };
        for (let i = 0; i < n; i++) {
          const q = p.clone().add(new THREE.Vector3((i % 2) * 1.2 - 0.6, 0, Math.floor(i / 2) * 1.2));
          q.x = G.clamp(q.x, 1.5, this.world.W - 1.5); q.z = G.clamp(q.z, 1.5, this.world.D - 1.5);
          q.y = this.world.standBelow(Math.floor(q.x), p.y + 1, Math.floor(q.z)); if (q.y >= 999) q.copy(p);
          const e = this.spawnEnemy(i === 0 && this.wave >= 3 && Math.random() < 0.5 ? 'rifleman' : this.chooseType(), q);
          e.squad = squad; squad.members.push(e); if (!squad.leader) squad.leader = e;
          this.toSpawn--;
        }
        this.spawnT = G.rand(4, 7) + n * 0.5;
      } else if (p) { this.spawnEnemy(this.chooseType(), p); this.toSpawn--; }
    }
    const bossPending = !!this.curWave.bossPending;
    if (this.toSpawn <= 0 && this.aliveCount() === 0 && !bossPending) this.endWave();
  }
  endWave() {
    this.curWave.t = this.time - this.curWave.t0;
    this.waveStats.push(this.curWave);
    this.phase = 'intermission';
    this.phaseT = 30;
    this.player.grenades = Math.min(4, this.player.grenades + 2);
    G.Audio.S.waveEnd();
    const next = this.wave + 1;
    const newPerks = this.stations.filter((s) => s.def.type === 'perk' && s.def.wave === next).map((s) => G.PERKS[s.def.perk].name);
    let sub = '+2 grenades — [N] pour lancer la vague suivante';
    if (newPerks.length) sub = 'Nouvel atout disponible : ' + newPerks.join(', ');
    if (next === 8) sub = 'La Forge ★ s\'allume à la prochaine vague';
    if (this.expandBorder()) sub = 'La zone de combat s\'agrandit — ' + sub;
    this.message('VAGUE ' + this.wave + ' TERMINÉE', sub + ' — 30 s pour se préparer', 4);
  }

  // ---------- Tir ----------
  fireWeapon(st, pl) {
    G.Audio.S.shot(st.sound);
    this.stats.shots++;
    const eye = pl.eye.clone();
    const base = pl.lookDir();
    const moving = Math.hypot(pl.vel.x, pl.vel.z) > 1;
    const adsK = st.id === 'sniper' ? Math.min(1, pl.ads * 1.8) : pl.ads;
    let spread = G.lerp(st.spread[0], st.spread[1], adsK) * (moving ? 1.5 : 1) * (pl.onGround ? 1 : 2.2) * (pl.crouch ? 0.65 : 1);
    if (st.id === 'shotgun') spread = G.lerp(st.spread[0], st.spread[1], pl.ads);
    if (st.id === 'sniper' && adsK >= 1) spread = 0;
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
      let glassN = 0;
      const wh = this.world.raycast(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, st.range, (x, y, z, b) => { if (b === G.B.GLASS && glassN++ < 3) this.breakGlass(x, y, z); });
      let maxD = wh ? wh.dist : st.range;
      if (this.world.solids.length) { const sb = this.world.solidOnRay(eye, dir, maxD, (o) => o.opaque); if (sb) { maxD = sb.t; if (sb.s.car) sb.s.car.damage(st.dmg * 0.35); } }
      const hits = [];
      for (const e of this.enemies) {
        if (e.dead) continue;
        let h = e.rayHit(eye, dir, maxD);
        if (!h && (st.id === 'sniper' || st.id === 'magnum')) {
          // tolérance : un tir qui frôle la tête ou le corps compte
          const c = e.headPos(), toC = c.clone().sub(eye), t = toC.dot(dir);
          if (t > 0 && t < maxD && toC.addScaledVector(dir, -t).length() < 0.32 * e.size) h = { t, part: 'head' };
        }
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
  // dégâts infligés par un ennemi à sa cible : nous, ou un équipier (envoyés par le réseau)
  hurt(target, amount, src, quiet) {
    if (target && target.isRemote) { if (this.coop) this.coop.queueDamage(target.peer, amount, src); return; }
    this.damagePlayer(amount, src, quiet);
  }
  // touche d'un équipier appliquée par l'hôte (pas de points pour l'hôte)
  damageEnemyNet(e, dmg, part, src) {
    if (e.dead) return;
    e.damage(dmg, part, src);
  }
  damageEnemy(e, dmg, part, src) {
    if (e.dead) return;
    if (this.coop && this.coop.isClient && e.puppet) {
      // invité : la touche est envoyée à l'hôte, qui l'applique
      this.coop.claimHit(e, dmg, part, src);
      this.stats.dmgDealt += Math.min(e.hp, dmg);
      if (src === 'gun' || src === 'melee' || src === 'energy') this.addPoints(this.gameType === 'soldats' ? 20 : 10);
      G.UI.hitmarker(false, part === 'head');
      if (part === 'head') G.Audio.S.headshot(); else G.Audio.S.hit();
      return;
    }
    e.lastBy = null;
    if (this.power.insta > 0 && !e.isBoss) dmg = e.hp + e.helmet + 1;
    const before = e.hp;
    const dealt = e.damage(dmg, part, src);
    this.stats.dmgDealt += Math.max(0, Math.min(before, dealt));
    if (!e.dead && (src === 'gun' || src === 'melee' || src === 'energy')) this.addPoints(this.gameType === 'soldats' ? 20 : 10);
    G.UI.hitmarker(e.dead, part === 'head');
    if (part === 'head') G.Audio.S.headshot(); else G.Audio.S.hit();
  }
  onEnemyKilled(e, src, part, self) {
    if (e === this.boss) { this.boss = null; }
    if (this.campaign) this.campaign.onKilled(e, part);
    if (self) return;
    const remoteKill = e.lastBy && this.coop && this.coop.isHost && this.coop.others.has(e.lastBy);
    if (this.curWave) this.curWave.kills++;
    if (!remoteKill) this.stats.kills++;
    if (part === 'head' && !remoteKill) { this.stats.headshots++; if (this.curWave) this.curWave.hs++; }
    if (!['walker', 'minion', 'rifleman'].includes(e.type) && !remoteKill) { this.stats.specials++; if (this.curWave) this.curWave.specials++; }
    let pts = e.isBoss ? e.T.pts : src === 'melee' ? 130 : part === 'head' ? 100 : e.T.pts;
    if (this.gameType === 'soldats' && !e.isBoss) pts = Math.round(pts * 2.2); // moins d'ennemis, plus coriaces : ils rapportent bien plus
    if (src === 'nuke') pts = 0;
    if (remoteKill) this.coop.creditKill(e.lastBy, pts, part === 'head');
    else if (pts) this.addPoints(pts, part === 'head' ? 'TÊTE' : src === 'melee' ? 'COUTEAU' : null);
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
    const chance = (e.soldier ? 0.06 : 0.035) * this.mods.drops * (e.type !== 'walker' && e.type !== 'rifleman' ? 2 : 1);
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
    let best = null, bd = 3.4;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const to = new THREE.Vector3(e.pos.x - eye.x, e.centerY() - eye.y, e.pos.z - eye.z);
      const d = to.length();
      if (d < bd + e.w * 0.5 && to.normalize().dot(dir) > 0.6 && this.world.lineOfSight(eye, new THREE.Vector3(e.pos.x, e.centerY(), e.pos.z))) { best = e; bd = d; }
    }
    if (!best) return;
    // fente vers la cible
    if (bd > 1.6) { const l = new THREE.Vector3(best.pos.x - pl.pos.x, 0, best.pos.z - pl.pos.z).normalize(); pl.vel.x = l.x * 12; pl.vel.z = l.z * 12; }
    const base = best.soldier ? this.soldierBaseHp() : this.zombieBaseHp();
    // dans le dos : coup fatal
    const back = new THREE.Vector3(Math.sin(best.mesh.rotation.y), 0, Math.cos(best.mesh.rotation.y)).dot(new THREE.Vector3(dir.x, 0, dir.z).normalize()) > 0.5;
    const dmg = best.isBoss ? 300 + this.wave * 30 : back ? base * 3 : Math.max(260, base * 0.6);
    this.damageEnemy(best, dmg, 'body', 'melee');
    G.Audio.S.knifeHit();
    this.particles(best.pos.clone().add(new THREE.Vector3(0, 1.0 * best.size, 0)), 0x7a1010, 10, 3);
    if (back && !best.isBoss) this.floatText('DANS LE DOS !', '#ff8060');
  }

  // ---------- Joueur touché ----------
  damagePlayer(amount, src, quiet) {
    const pl = this.player;
    if (pl.dead || this.phase === 'over') return;
    if (this.cheats && this.cheats.god) return;
    if (pl.vehicle && !pl.vehicle.dead && src !== 'car') { pl.vehicle.damage(amount * 1.2); return; }
    if (pl.armor > 0) {
      const absorbed = Math.min(pl.armor, amount * 0.75);
      pl.armor -= absorbed; amount -= absorbed;
      if (pl.armor <= 0) { G.UI.message('', 'Armure brisée !', 1.2, '#5aa0ff'); G.Audio.S.buildBreak(null); }
    }
    pl.hp -= amount; pl.lastHit = this.time;
    this.stats.dmgTaken += amount;
    if (this.curWave) this.curWave.dmgTaken += amount;
    if (!quiet || Math.random() < 0.15) G.Audio.S.hurt();
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
  gameOver(reason) {
    if (this.phase === 'over' || this.phase === 'menu') return;
    if (this.campaign) { this.campaign.fail(reason || 'death'); return; }
    // coop : on tombe « à terre » tant qu'un équipier tient debout ; l'hôte termine la partie quand tout le monde est à terre
    if (this.coop && this.coop.active && reason !== 'abandon') {
      if (this.coop.isClient && !this.coopFinal) { this.coop.downed(); return; }
      if (this.coop.isHost && !this.coop.allDead()) { this.coop.downed(); return; }
    }
    this.phase = 'over';
    G.Audio.S.playerDeath();
    const wasCoop = !!(this.coop && this.coop.active);
    if (wasCoop) { this.player.dead = true; this.coop.publish(); } // dernier état (hôte : partie terminée pour tout le monde)
    if (this.curWave && this.waveStats[this.waveStats.length - 1] !== this.curWave) { this.curWave.t = this.time - this.curWave.t0; this.curWave.died = true; this.waveStats.push(this.curWave); }
    const s = this.stats;
    const run = {
      mode: this.mode, gameType: this.gameType, map: this.map.def.id, mapName: this.map.def.name, rpMult: this.map.def.rpMult,
      wave: this.wave, kills: s.kills, headshots: s.headshots, shots: s.shots, hits: s.hits,
      dmgDealt: Math.round(s.dmgDealt), dmgTaken: Math.round(s.dmgTaken), points: s.points, time: Math.round(this.time),
      bosses: s.bosses, specials: s.specials, date: Date.now(), coop: wasCoop,
      perks: [...this.player.perks], weapons: this.player.slots.map((x) => G.weaponStats(x).name),
      waves: this.waveStats.map((w) => ({ n: w.n, t: Math.round(w.t || 0), kills: w.kills, hs: w.hs, dmgTaken: Math.round(w.dmgTaken), pts: w.pts, boss: w.boss, specials: w.specials, died: !!w.died })),
    };
    if (this.cheats) {
      if (document.pointerLockElement) document.exitPointerLock();
      G.UI.showHUD(false);
      setTimeout(() => G.UI.showGameOver(run, { delta: 0, before: 0, after: 0, infoBefore: G.Ranked.rankInfo(G.Ranked.profile.rp), infoAfter: G.Ranked.rankInfo(G.Ranked.profile.rp), xpGain: 0, cheat: true }), 300);
      return;
    }
    const res = G.Ranked.record(run);
    if (document.pointerLockElement) document.exitPointerLock();
    G.UI.showHUD(false);
    setTimeout(() => G.UI.showGameOver(run, res), 300);
  }

  endMission(success, res) {
    this.phase = 'over';
    G.Voice.stop();
    if (success) G.Audio.S.rankUp(); else if (res.reason === 'death') G.Audio.S.playerDeath(); else G.Audio.S.gameOver();
    if (document.pointerLockElement) document.exitPointerLock();
    G.UI.showHUD(false);
    setTimeout(() => G.UI.showMissionEnd(res), 300);
  }

  // ---------- Explosions / effets ----------
  explode(pos, r, dmg, src, color = 0xff8030) {
    if (src !== 'enemy') for (const e of this.enemies) {
      if (e.dead) continue;
      const c = e.pos.clone(); c.y += 1 * e.size;
      const d = c.distanceTo(pos);
      if (d < r + e.w * 0.5) this.damageEnemy(e, dmg * (1 - Math.min(1, d / r) * 0.6), 'body', src === 'player' ? 'explosive' : src);
    }
    for (const v of this.vehicles || []) if (!v.dead && v.pos.distanceTo(pos) < r + 2 && src !== 'car-self') v.damage(dmg * 0.6 * (1 - Math.min(1, v.pos.distanceTo(pos) / (r + 2))) + 20);
    for (const b of this.builds || []) { const c = b.min.clone().add(b.max).multiplyScalar(0.5); if (!b.dead && c.distanceTo(pos) < r + 1) this.damageBuild(b, dmg * 0.5); }
    const pc = this.player.pos.clone(); pc.y += 0.9;
    const pd = pc.distanceTo(pos);
    if (pd < r) {
      const self = src === 'player';
      const amt = (self ? 0.15 : 1) * (src === 'bloater' || src === 'enemy' ? dmg : dmg * 0.4) * (1 - pd / r * 0.5);
      if (amt > 1) this.damagePlayer(amt, { pos });
    }
    if (this.coop && this.coop.isHost && src !== 'player') for (const o of this.coop.others.values()) {
      const P = o.proxy; if (P.dead) continue;
      const d = P.pos.clone().add(new THREE.Vector3(0, 0.9, 0)).distanceTo(pos);
      if (d < r) this.hurt(P, (src === 'bloater' || src === 'enemy' ? dmg : dmg * 0.4) * (1 - d / r * 0.5), { pos });
    }
    if (this.coop && this.coop.active) this.coop.recordFx(pos);
    this.boom(pos, color);
    this.shake(G.clamp(1.2 - pd / 20, 0.1, 0.9));
    G.Audio.S.explosion(pos);
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
  tracer(a, b, color = 0xffe0a0) {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 })); this.scene.add(l);
    this.fx.push({ mesh: l, t: 0, life: 0.06, kind: 'tracer' });
  }
  updateFX(dt) {
    const w = this.world;
    for (let i = this.particlesList.length - 1; i >= 0; i--) {
      const p = this.particlesList[i];
      p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.mesh); this.particlesList.splice(i, 1); continue; }
      if (!p.noGrav) p.vel.y -= 18 * dt;
      const m = p.mesh;
      if (p.grow) m.scale.multiplyScalar(1 + p.grow * dt);
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
        if (f.fire && Math.random() < 0.3) this.particles(f.mesh.position.clone().add(new THREE.Vector3(G.rand(-1, 1), 0.1, G.rand(-1, 1))), 0xff8020, 1, 1.5, 0.12);
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
    else if (type === 'boulder') mesh = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.7, 0.75), new THREE.MeshLambertMaterial({ color: 0x7d7a74 }));
    else mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshLambertMaterial({ color: type === 'egrenade' ? 0x5a3a2a : 0x3a4a2a }));
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.projectiles.push(Object.assign({ type, pos: pos.clone(), vel: vel.clone(), dmg, owner, mesh, life: type === 'grenade' ? 1.8 : type === 'egrenade' ? 2.2 : 6 }, extra));
  }
  updateProjectiles(dt) {
    const w = this.world, pl = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      let done = p.life <= 0;
      if (p.type === 'grenade' && done) { this.explode(p.pos.clone(), 5, p.dmg, 'player', 0xff8030); }
      if (p.type === 'egrenade' && done) { this.explode(p.pos.clone(), 4.5, p.dmg, 'enemy', 0xff8030); }
      if (!done) {
        const steps = Math.ceil(p.vel.length() * dt / 0.3);
        const sdt = dt / steps;
        for (let s = 0; s < steps && !done; s++) {
          if (p.type === 'spit' || p.type === 'boulder') p.vel.y -= 18 * sdt;
          if (p.type === 'grenade' || p.type === 'egrenade') p.vel.y -= 20 * sdt;
          if (p.type === 'orb') { const to = pl.eye.clone().sub(p.pos).normalize().multiplyScalar(9); p.vel.lerp(to, Math.min(1, sdt * 0.9)); }
          const np = p.pos.clone().addScaledVector(p.vel, sdt);
          let solid = w.isSolid(Math.floor(np.x), Math.floor(np.y), Math.floor(np.z));
          if (!solid && p.owner !== 'player') for (const b of this.world.solids) if (!b.dead && np.x > b.min.x && np.x < b.max.x && np.y > b.min.y && np.y < b.max.y && np.z > b.min.z && np.z < b.max.z) { solid = true; if (p.type !== 'egrenade') this.damageBuild(b, p.dmg); }
          if (p.type === 'grenade' || p.type === 'egrenade') {
            if (solid) {
              // rebond simple ; au sol elle roule peu
              if (w.isSolid(Math.floor(np.x), Math.floor(p.pos.y), Math.floor(p.pos.z))) p.vel.x *= -0.4;
              if (w.isSolid(Math.floor(p.pos.x), Math.floor(np.y), Math.floor(p.pos.z))) { p.vel.y *= -0.3; p.vel.x *= 0.55; p.vel.z *= 0.55; }
              if (w.isSolid(Math.floor(p.pos.x), Math.floor(p.pos.y), Math.floor(np.z))) p.vel.z *= -0.4;
              p.vel.multiplyScalar(0.8);
            } else p.pos.copy(np);
            // grenade du joueur : elle explose au contact d'un ennemi
            if (p.type === 'grenade') for (const e of this.enemies) {
              if (e.dead) continue;
              if (Math.abs(p.pos.x - e.pos.x) < e.w * 0.6 + 0.15 && Math.abs(p.pos.z - e.pos.z) < e.w * 0.6 + 0.15 && p.pos.y > e.pos.y && p.pos.y < e.pos.y + 1.9 * e.size) { p.life = 0; done = true; this.explode(p.pos.clone(), 5, p.dmg, 'player', 0xff8030); break; }
            }
            continue;
          }
          if (solid) {
            done = true;
            if (p.type === 'energy') this.explode(p.pos.clone(), p.splash, p.dmg, 'player', p.up ? 0xff60ff : 0x60ffb0);
            if (p.type === 'spit') this.acidPuddle(p.pos.clone(), p.dmg * 0.5);
            if (p.type === 'orb') this.particles(p.pos, 0xb050ff, 8, 3);
            if (p.type === 'boulder') this.explode(p.pos.clone(), 2.6, p.dmg, 'enemy', 0x9a8a7a);
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
            if (this.coop && this.coop.isHost) for (const o of this.coop.others.values()) {
              const P = o.proxy; if (P.dead) continue;
              if (Math.abs(p.pos.x - P.pos.x) < 0.55 && Math.abs(p.pos.z - P.pos.z) < 0.55 && Math.abs(p.pos.y - P.pos.y - 0.9) < 1.0) {
                done = true;
                if (p.type === 'boulder') this.explode(p.pos.clone(), 2.6, p.dmg, 'enemy', 0x9a8a7a); else this.hurt(P, p.dmg, p.owner);
                break;
              }
            }
            if (done) break;
            if (Math.abs(p.pos.x - c.x) < 0.55 && Math.abs(p.pos.z - c.z) < 0.55 && Math.abs(p.pos.y - c.y) < 1.0) {
              done = true;
              if (p.type === 'boulder') this.explode(p.pos.clone(), 2.6, p.dmg, 'enemy', 0x9a8a7a);
              else this.damagePlayer(p.dmg, p.owner);
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
  // bloc de pierre lancé en cloche par un boss : on choisit la trajectoire la plus tendue qui passe les obstacles
  throwBoulder(e, from) {
    const pl = this.player, w = this.world, horiz = Math.hypot(pl.eye.x - from.x, pl.eye.z - from.z);
    let best = null;
    for (let t = G.clamp(horiz / 15, 0.6, 2.4); t <= 2.8 && !best; t += 0.2) {
      const to = pl.eye.clone().addScaledVector(pl.vel, t * 0.4); to.y -= 0.4;
      const vel = new THREE.Vector3((to.x - from.x) / t, (to.y - from.y) / t + 0.5 * 18 * t, (to.z - from.z) / t);
      let clear = true;
      for (let k = 1; k < 24 && clear; k++) {
        const s = (k / 24) * t * 0.92, x = from.x + vel.x * s, y = from.y + vel.y * s - 9 * s * s, z = from.z + vel.z * s;
        if (w.isSolid(Math.floor(x), Math.floor(y), Math.floor(z))) clear = false;
      }
      if (clear) best = vel;
    }
    if (!best) return false;
    this.spawnProjectile('boulder', from, best, Math.round(e.dmg * 0.7), e);
    G.Audio.S.growl(e.pos);
    return true;
  }
  acidPuddle(pos, dmg, color, life = 4) {
    const w = this.world;
    const y = w.standBelow(Math.floor(pos.x), pos.y + 0.5, Math.floor(pos.z));
    const m = new THREE.Mesh(new THREE.CircleGeometry(1.3, 16), new THREE.MeshBasicMaterial({ color: color || 0x70e030, transparent: true, opacity: 0.6, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(pos.x, (y < 999 ? y : pos.y) + 0.05, pos.z);
    this.scene.add(m);
    this.fx.push({ mesh: m, t: 0, life, kind: 'acid', dmg: Math.max(4, dmg), tick: 0, fire: !!color });
  }
  // ---------- Soldats ----------
  enemyShot(e, from, hits, dmg, sound, victim) {
    const pl = this.player;
    G.Audio.S.shotAt(sound, from);
    if (victim && victim.isRemote) {
      // tir sur un équipier : l'hôte décide, l'équipier encaisse chez lui
      const ok = hits > 0 && this.world.lineOfSight(from, victim.eye);
      this.tracer(from, ok ? victim.eye.clone() : victim.eye.clone().add(new THREE.Vector3(G.rand(-1, 1), G.rand(-0.5, 1), G.rand(-1, 1))), 0xffb060);
      if (ok) this.hurt(victim, dmg, e);
      if (this.coop) this.coop.recordShot(e, victim, ok);
      return;
    }
    if (this.coop) this.coop.recordShot(e, null, hits > 0);
    this.flashLight.position.copy(from); this.flashLight.intensity = Math.max(this.flashLight.intensity, 1.5);
    if (!this._mflash) this._mflash = new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0.9, depthWrite: false });
    const fl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), this._mflash.clone()); fl.position.copy(from); this.scene.add(fl);
    this.fx.push({ mesh: fl, t: 0, life: 0.05, kind: 'tracer' });
    const target = pl.eye.clone(); target.y -= 0.3;
    const dirP = target.clone().sub(from); const dl = dirP.length(); dirP.normalize();
    let gN = 0; this.world.raycast(from.x, from.y, from.z, dirP.x, dirP.y, dirP.z, dl, (x, y, z, b) => { if (b === G.B.GLASS && gN++ < 2) this.breakGlass(x, y, z); });
    let blockHit = this.world.solids.length ? this.world.solidOnRay(from, dirP, dl) : null;
    if (blockHit) {
      // le corps est caché (voiture, barricade) mais la tête dépasse : tir à la tête, plus difficile
      const dH = pl.eye.clone().sub(from), lH = dH.length(); dH.normalize();
      if (!this.world.solidOnRay(from, dH, lH, (o) => o.opaque || o.type === 'shield') && this.world.lineOfSight(from, pl.eye)) {
        if (hits > 0 && Math.random() < 0.45) { this.tracer(from, pl.eye.clone(), 0xffb060); this.damagePlayer(dmg, e); return; }
        const miss = pl.eye.clone().add(new THREE.Vector3(G.rand(-0.8, 0.8), G.rand(0.2, 1), G.rand(-0.8, 0.8)));
        this.tracer(from, miss, 0xffb060); if (Math.random() < 0.5) G.Audio.S.whizz();
        return;
      }
    }
    if (blockHit) {
      const end = from.clone().addScaledVector(dirP, blockHit.t);
      this.tracer(from, end, 0xffb060);
      this.damageBuild(blockHit.s, dmg > 0 ? dmg : 6);
      this.particles(end, blockHit.s.type === 'shield' ? 0x80d0ff : 0x958866, 2, 2, 0.06);
      return;
    }
    if (hits > 0 && this.world.lineOfSight(from, pl.eye)) {
      this.tracer(from, target, 0xffb060);
      this.damagePlayer(dmg, e);
    } else {
      const miss = target.clone().add(new THREE.Vector3(G.rand(-1, 1), G.rand(-0.6, 1), G.rand(-1, 1)).multiplyScalar(1.4));
      const dir = miss.clone().sub(from).normalize();
      const wh = this.world.raycast(from.x, from.y, from.z, dir.x, dir.y, dir.z, 80);
      const end = from.clone().addScaledVector(dir, wh ? wh.dist : 60);
      this.tracer(from, end, 0xffb060);
      if (wh) this.particles(end, 0x9a9080, 2, 2, 0.05);
      if (from.distanceTo(target) > 4 && Math.random() < 0.5) G.Audio.S.whizz();
    }
  }
  scream(e) {
    const pl = this.player;
    G.Audio.S.scream();
    if (this.world.lineOfSight(e.headPos(), pl.eye) && e.pos.distanceTo(pl.pos) < 18) {
      pl.slowT = 2.2; this.warpT = 2.2; this.shake(0.4);
      this.message('', 'Le cri vous paralyse !', 1.5, '#60c0ff');
    }
    for (const o of this.enemies) if (!o.dead && o !== e && o.pos.distanceTo(e.pos) < 14) { o.buffT = 6; this.particles(o.headPos(), 0x60c0ff, 3, 1.5); }
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 32), new THREE.MeshBasicMaterial({ color: 0x60c0ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    m.position.copy(e.headPos()); m.lookAt(pl.eye); this.scene.add(m);
    this.fx.push({ mesh: m, t: 0, life: 0.6, kind: 'ring', r: 10 });
  }
  flame(e, from, to) {
    const dir = to.clone().sub(from).normalize();
    if (!this._fmats) this._fmats = [0xff8020, 0xffc040, 0xff4010].map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.8, depthWrite: false }));
    if (!this._pgeo) { this._pgeo = new THREE.BoxGeometry(1, 1, 1); this._pmats = {}; }
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(this._pgeo, G.pick(this._fmats)); m.scale.setScalar(G.rand(0.2, 0.45));
      m.position.copy(from);
      this.scene.add(m);
      const v = dir.clone().multiplyScalar(G.rand(9, 13)).add(new THREE.Vector3(G.rand(-1, 1), G.rand(-0.5, 1.5), G.rand(-1, 1)));
      this.particlesList.push({ mesh: m, vel: v, life: 0.55, noGrav: true, grow: 2.2 });
    }
    if (Math.random() < 0.3) G.Audio.S.flame(from);
  }
  fireZone(pos, dmg) {
    for (let i = 0; i < 3; i++) {
      const p = pos.clone().add(new THREE.Vector3(G.rand(-2, 2), 0, G.rand(-2, 2)));
      this.acidPuddle(p, dmg, 0xff6a10, 5);
    }
    this.telegraph(pos.clone(), 3, 0.6);
  }

  // ---------- Bonus ----------
  spawnPowerup(type, pos, id) {
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
    const y = this.world.standBelow(Math.floor(pos.x), pos.y + 0.5, Math.floor(pos.z));
    g.position.set(pos.x, (y < 999 ? y : pos.y) + 0.8, pos.z);
    this.scene.add(g);
    const pu = { type, g, t: 0, life: id ? Infinity : 25, id: id || (this.puId = (this.puId || 0) + 1), base: pos.clone() };
    this.powerups.push(pu);
    return pu;
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
      const near = !pl.dead && !pl.spectator && d < 1.3 && Math.abs(pl.pos.y + 0.8 - p.g.position.y) < 1.8;
      const coop = this.coop && this.coop.active ? this.coop : null;
      if (near && coop && coop.isClient) { coop.claimPowerup(p.id); }
      else if (near) { this.applyPowerup(p.type); if (coop) coop.powerEvent(p.type); }
      else if (!gone && !p.drop) continue;
      this.scene.remove(p.g);
      p.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
      this.powerups.splice(i, 1);
    }
  }
  applyPowerup(type) {
    const P = G.POWERUPS[type], pl = this.player;
    G.Audio.S.powerup();
    if (type === 'ammo') { pl.refillAmmo(); pl.grenades = 4; }
    else if (type === 'plate') { pl.armor = Math.min(pl.maxArmor, pl.armor + 50); pl.plates = Math.min(5, pl.plates + 1); }
    else if (type === 'nuke') {
      if (!(this.coop && this.coop.isClient)) for (const e of this.enemies) if (!e.dead && !e.isBoss) { this.particles(e.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0xff8020, 6, 4); e.hp = 0; e.die('nuke', 'body'); }
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
  // en mission, toutes les stations sont actives d'emblée
  locked(d) { return !this.campaign && this.wave < d.wave; }
  stationPrompt(s) {
    const d = s.def, pl = this.player;
    if (d.type === 'box') {
      const b = s.box;
      if (b.state === 'spin') return 'La caisse tourne…';
      if (b.state === 'ready') return '[E] Prendre : ' + G.WEAPONS[b.weapon].name;
      return '[E] Caisse mystère — 950';
    }
    if (d.type === 'wall') {
      const W = G.WEAPONS[d.weapon], price = d.price || W.price;
      const idx = pl.hasWeapon(d.weapon);
      if (idx >= 0) return '[E] Munitions ' + W.name + ' — ' + (pl.slots[idx].up ? 3000 : Math.round(price / 2));
      return '[E] Acheter ' + W.name + ' (' + W.cls + ') — ' + price;
    }
    if (d.type === 'bench') return this.craftOpen ? 'Établi : touches 1 à 4 pour fabriquer — [E] fermer' : '[E] Établi : fabriquer barricades, boucliers, armure';
    if (d.type === 'perk') {
      const P = G.PERKS[d.perk];
      if (this.locked(d)) return P.name + ' — inactif (vague ' + d.wave + ')';
      if (pl.perks.has(d.perk)) return P.name + ' — déjà acquis';
      return '[E] ' + P.name + ' : ' + P.desc + ' — ' + P.price;
    }
    if (d.type === 'forge') {
      if (this.locked(d)) return 'Forge ★ — inactive (vague ' + d.wave + ')';
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
    if (d.type === 'bench') { if (this.craftOpen) this.closeCraft(); else { this.craftOpen = true; this.craftStation = s; G.UI.showCraft(true); G.Audio.S.click(); } return; }
    if (d.type === 'box') {
      const b = s.box;
      if (b.state === 'idle') { if (!this.spend(950)) return; b.state = 'spin'; b.t = 0; b.weapon = null; }
      else if (b.state === 'ready') { pl.giveWeapon(b.weapon); this.clearBoxModel(s); b.state = 'idle'; G.Audio.S.buy(); }
      return;
    }
    if (d.type === 'wall') {
      const W = G.WEAPONS[d.weapon], price = d.price || W.price;
      const idx = pl.hasWeapon(d.weapon);
      if (idx >= 0) { const c = pl.slots[idx].up ? 3000 : Math.round(price / 2); if (this.spend(c)) { const st = G.weaponStats(pl.slots[idx]); pl.slots[idx].reserve = st.reserve; pl.slots[idx].mag = st.mag; } }
      else if (this.spend(price)) pl.giveWeapon(d.weapon);
      return;
    }
    if (d.type === 'perk') {
      if (this.locked(d) || pl.perks.has(d.perk)) { G.Audio.S.deny(); return; }
      const P = G.PERKS[d.perk];
      if (!this.spend(P.price)) return;
      pl.perks.add(d.perk);
      if (d.perk === 'cuirasse') { pl.maxHp = 250; pl.hp = 250; }
      this.message(P.name.toUpperCase(), P.desc, 2);
      return;
    }
    if (d.type === 'forge') {
      if (this.locked(d) || pl.slot.up) { G.Audio.S.deny(); return; }
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
        const on = !this.locked(d);
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
            b.model = G.makeWeaponModel(b.weapon, false, true); b.model.scale.setScalar(1.3); b.model.position.y = 1.4; s.group.add(b.model);
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

  // ---------- Établi / fabrication ----------
  closeCraft() { this.craftOpen = false; this.craftStation = null; G.UI.showCraft(false); }
  craft(i) {
    const it = G.CRAFT[i], pl = this.player; if (!it) return;
    const have = it.id === 'plate' ? pl.plates : it.id === 'grenade' ? pl.grenades : pl.builds[it.id];
    if (have >= it.max) { G.Audio.S.deny(); G.UI.message('', 'Stock plein', 1, '#ff6060'); return; }
    if (!this.spend(it.price)) return;
    if (it.id === 'plate') pl.plates++; else if (it.id === 'grenade') pl.grenades++; else pl.builds[it.id]++;
    G.UI.message('', it.name + ' fabriqué(e)', 1.2, '#e0a040');
    G.Audio.S.build();
  }
  // ---------- Constructions ----------
  cycleBuild() {
    const pl = this.player, order = ['barricade', 'shield'];
    const avail = order.filter((k) => pl.builds[k] > 0);
    if (!avail.length) { this.buildItem = null; this.removeGhost(); G.UI.message('', 'Rien à construire : fabriquez à un établi ⚒ (touche F pour construire)', 1.5, '#e0a040'); return; }
    const i = this.buildItem ? avail.indexOf(this.buildItem) : -1;
    this.buildItem = i + 1 < avail.length ? avail[i + 1] : null;
    if (!this.buildItem) this.removeGhost();
    G.Audio.S.click();
  }
  buildBox(item) {
    const pl = this.player, dir = pl.lookDir(); dir.y = 0; dir.normalize();
    const alongX = Math.abs(dir.z) > Math.abs(dir.x); // mur perpendiculaire au regard
    const cx = Math.floor(pl.pos.x + dir.x * 2.3) + 0.5, cz = Math.floor(pl.pos.z + dir.z * 2.3) + 0.5;
    const y = this.world.standBelow(Math.floor(cx), pl.pos.y + 1.5, Math.floor(cz));
    if (y >= 999) return null;
    const W = item === 'barricade' ? 3 : 2.2, H = item === 'barricade' ? 1.05 : 2.1, D = item === 'barricade' ? 0.9 : 0.25;
    const hx = (alongX ? W : D) / 2, hz = (alongX ? D : W) / 2;
    return { min: new THREE.Vector3(cx - hx, y, cz - hz), max: new THREE.Vector3(cx + hx, y + H, cz + hz), alongX };
  }
  buildValid(b) {
    if (!b) return false;
    const w = this.world, c = b.min.clone().add(b.max).multiplyScalar(0.5);
    for (const o of w.solids) if (b.min.x < o.max.x && b.max.x > o.min.x && b.min.z < o.max.z && b.max.z > o.min.z && b.min.y < o.max.y && b.max.y > o.min.y) return false;
    for (let x = Math.floor(b.min.x + 0.05); x <= Math.floor(b.max.x - 0.05); x++) for (let z = Math.floor(b.min.z + 0.05); z <= Math.floor(b.max.z - 0.05); z++) for (let y = Math.floor(b.min.y + 0.02); y <= Math.floor(b.max.y - 0.05); y++) if (w.isSolid(x, y, z)) return false;
    const p = this.player.pos;
    if (p.x + 0.3 > b.min.x && p.x - 0.3 < b.max.x && p.z + 0.3 > b.min.z && p.z - 0.3 < b.max.z && p.y < b.max.y && p.y + 1.8 > b.min.y) return false;
    return this.builds.filter((o) => !o.dead).length < 12;
  }
  removeGhost() { if (this.ghost) { this.scene.remove(this.ghost); this.ghost.geometry.dispose(); this.ghost.material.dispose(); this.ghost = null; } }
  placeBuild() {
    const item = this.buildItem, pl = this.player;
    if (!item || pl.builds[item] <= 0) { this.buildItem = null; this.removeGhost(); return; }
    const b = this.buildBox(item);
    if (!this.buildValid(b)) { G.Audio.S.deny(); return; }
    pl.builds[item]--;
    const size = b.max.clone().sub(b.min), c = b.min.clone().add(b.max).multiplyScalar(0.5);
    let mesh;
    if (item === 'barricade') {
      mesh = new THREE.Group();
      const mat = new THREE.MeshLambertMaterial({ map: G.Tex.pix('sandbagTex', 16, 16, (ctx, rnd, px) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const seam = y % 5 === 4 || (x + (Math.floor(y / 5) % 2 ? 4 : 0)) % 8 === 7; px(x, y, seam ? 0x5e553e : 0x958866, seam ? 0 : Math.floor((rnd() - 0.5) * 18)); } }) });
      const n = 3;
      for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
        const bx = new THREE.Mesh(new THREE.BoxGeometry(b.alongX ? size.x / n - 0.04 : size.x, size.y / 2 - 0.02, b.alongX ? size.z : size.z / n - 0.04), mat);
        bx.position.set(b.alongX ? -size.x / 2 + (i + 0.5) * size.x / n + (j ? 0.12 : 0) : 0, -size.y / 2 + (j + 0.5) * size.y / 2, b.alongX ? 0 : -size.z / 2 + (i + 0.5) * size.z / n + (j ? 0.12 : 0));
        bx.castShadow = bx.receiveShadow = true;
        mesh.add(bx);
      }
      mesh.userData.mat = mat;
    } else {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshBasicMaterial({ color: 0x50b0ff, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: 0xa0e0ff }));
      mesh.add(edges);
    }
    mesh.position.copy(c);
    this.scene.add(mesh);
    const hp = item === 'barricade' ? 450 : 1500;
    const s = { type: item, min: b.min, max: b.max, hp, maxHp: hp, mesh, opaque: item === 'barricade', blocksPlayer: item === 'barricade', life: item === 'shield' ? 60 : Infinity, t: 0 };
    this.builds.push(s);
    this.world.solids.push(s);
    this.world.navBlock(s.min, s.max, 1);
    G.Audio.S.build();
    this.particles(c, item === 'barricade' ? 0x958866 : 0x50b0ff, 10, 2.5);
    if (pl.builds[item] <= 0) { this.buildItem = null; this.removeGhost(); }
  }
  damageBuild(b, dmg) {
    if (b.car) { if (!b.wreck) b.car.damage(dmg); return; }
    if (b.dead) return;
    b.hp -= dmg;
    G.Audio.S.buildHit(b.min);
    if (b.type === 'barricade' && b.mesh.userData.mat) { const k = Math.max(0.35, b.hp / b.maxHp); b.mesh.userData.mat.color.setRGB(k, k, k); }
    if (b.type === 'shield') b.mesh.material.opacity = 0.15 + 0.3 * Math.max(0, b.hp / b.maxHp);
    if (b.hp <= 0) this.destroyBuild(b);
  }
  destroyBuild(b) {
    b.dead = true;
    const c = b.min.clone().add(b.max).multiplyScalar(0.5);
    this.particles(c, b.type === 'barricade' ? 0x958866 : 0x50b0ff, 18, 4);
    G.Audio.S.buildBreak(c);
    this.scene.remove(b.mesh);
    b.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    const i = this.world.solids.indexOf(b); if (i >= 0) this.world.solids.splice(i, 1);
    this.world.navBlock(b.min, b.max, -1);
  }
  updateBuilds(dt) {
    for (const b of this.builds) {
      if (b.dead) continue;
      b.t += dt;
      if (b.t > b.life) this.destroyBuild(b);
      else if (b.type === 'shield' && b.life - b.t < 5) b.mesh.visible = Math.floor(b.t * 6) % 2 === 0;
    }
    this.builds = this.builds.filter((b) => !b.dead);
    // aperçu fantôme
    if (this.buildItem) {
      const bb = this.buildBox(this.buildItem), ok = this.buildValid(bb);
      if (!this.ghost) { this.ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, depthWrite: false })); this.scene.add(this.ghost); }
      if (bb) { this.ghost.visible = true; this.ghost.position.copy(bb.min.clone().add(bb.max).multiplyScalar(0.5)); this.ghost.scale.copy(bb.max.clone().sub(bb.min)); this.ghost.material.color.setHex(ok ? 0x40ff80 : 0xff4040); }
      else this.ghost.visible = false;
    }
  }
  // ---------- Portails ----------
  updatePortals(dt) {
    this.portalCD -= dt;
    if (this.portalCD > 0 || !this.map.portals.length) return;
    const p = this.player.pos;
    for (const [a, b] of this.map.portals) {
      for (const [from, to] of [[a, b], [b, a]]) {
        if (Math.hypot(p.x - (from[0] + 0.5), p.z - (from[2] + 0.5)) < 0.7 && Math.abs(p.y - from[1]) < 1.2) {
          this.player.pos.set(to[0] + 0.5, to[1], to[2] + 1.6); this.player.vel.set(0, 0, 0); this.player.camY = to[1] + 1.6;
          this.portalCD = 2; this.warpT = 0.8; G.Audio.S.portal(); G.UI.flash('#b060ff');
          this.world.computeFlow(this.player.pos.x, this.player.pos.y, this.player.pos.z);
          return;
        }
      }
    }
  }
  breakGlass(x, y, z) {
    this.world.setBlock(x, y, z, G.B.AIR);
    this.particles(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), 0xbfd8e8, 8, 3, 0.08);
    G.Audio.S.glass(new THREE.Vector3(x, y, z));
  }
  // ---------- Véhicules ----------
  nearestVehicle() {
    const p = this.player.pos; let best = null, bd = 3.2;
    for (const v of this.vehicles || []) { if (v.dead) continue; const d = Math.hypot(v.pos.x - p.x, v.pos.z - p.z); if (d < bd && Math.abs(v.pos.y - p.y) < 2) { bd = d; best = v; } }
    return best;
  }
  enterVehicle(v) {
    const pl = this.player;
    if (v.remote) { G.UI.message('', 'Un équipier conduit déjà ce véhicule', 1.5, '#e0e0e0'); return; }
    pl.vehicle = v; pl._camPos = null; pl.camOrbit = 0; pl.crouch = false; pl.h = 1.8; pl.slideT = 0; pl.mouse.left = false; pl.mouse.right = false;
    this.buildItem = null; this.removeGhost();
    G.Audio.S.click();
    this.message('', '[ZQSD] conduire · [Espace] frein · [E] sortir', 2.5, '#e0e0e0');
  }
  exitVehicle(forced) {
    const pl = this.player, v = pl.vehicle; if (!v) return;
    pl.vehicle = null;
    const w = this.world;
    const cands = [v.right.multiplyScalar(-2.0), v.right.multiplyScalar(2.0), v.forward.multiplyScalar(3.2), v.forward.multiplyScalar(-3.2)];
    let placed = false;
    for (const c of cands) {
      const p = v.pos.clone().add(c);
      const y = w.standBelow(Math.floor(p.x), v.pos.y + 1.5, Math.floor(p.z));
      if (y < 999 && !w.collides(p.x, y, p.z, 0.3, 1.8, 'player')) { pl.pos.set(p.x, y, p.z); placed = true; break; }
    }
    if (!placed) pl.pos.set(v.pos.x, v.pos.y + v.H + 0.1, v.pos.z);
    pl.vel.set(0, 0, 0); pl.camY = pl.pos.y + pl.eyeH; pl.yaw = v.yaw + Math.PI; pl.pitch = 0;
    pl.setViewWeapon();
    if (forced) this.message('', 'Le véhicule explose !', 1.5, '#ff8040');
  }
  toggleSpectator() {
    const pl = this.player;
    pl.spectator = !pl.spectator;
    if (pl.vehicle) this.exitVehicle();
    if (pl.spectator) { for (const e of this.enemies) if (!e.dead) { e.hp = 0; e.dead = true; e.deadT = 3; } this.toSpawn = 0; if (this.curWave) this.curWave.bossPending = false; this.boss = null; this.message('SPECTATEUR', 'Vol libre — Espace monter, C descendre, Maj rapide — [T] quitter', 3, '#ff60ff'); }
    else { pl.vel.set(0, 0, 0); const y = this.world.standBelow(Math.floor(pl.pos.x), pl.pos.y + 1, Math.floor(pl.pos.z)); if (y < 999) pl.pos.y = y; else pl.pos.copy(this.map.playerSpawn); this.message('', 'Mode spectateur désactivé', 1.5, '#ff60ff'); if (this.phase === 'active') { this.toSpawn = 0; } }
  }
  // ---------- Triche ----------
  cheatSkip() {
    for (const e of this.enemies) if (!e.dead) { e.hp = 0; e.die('nuke', 'body'); }
    this.toSpawn = 0; if (this.curWave) this.curWave.bossPending = false;
    this.boss = null;
    this.message('', 'Triche : vague passée', 1, '#ff60ff');
  }

  // ---------- HUD ----------
  updateHUD(dt) {
    const pl = this.player, st = pl.wstats, s = pl.slot;
    const near = this.nearestStation();
    const mi = this.campaign ? this.campaign.hud() : null;
    G.UI.updateObjective(mi, this.camera);
    G.UI.updateHUD({
      points: this.points, wave: this.campaign ? '' : this.wave, hp: pl.hp, maxHp: pl.maxHp,
      weapon: st.name, mag: this.power.fury > 0 ? '∞' : s.mag, reserve: s.reserve, reloading: pl.reloadT > 0,
      grenades: pl.grenades, armor: pl.armor, maxArmor: pl.maxArmor, plates: pl.plates, plateT: pl.plateT, builds: pl.builds, buildItem: this.buildItem, crouch: pl.crouch, cheats: !!this.cheats, perks: [...pl.perks], power: this.power,
      prompt: mi && mi.prompt ? mi.prompt : pl.vehicle ? 'Véhicule ' + Math.max(0, Math.round(pl.vehicle.hp / pl.vehicle.maxHp * 100)) + ' % — [ZQSD] conduire · [Espace] frein · [E] sortir' : pl.spectator ? 'SPECTATEUR — [T] quitter' : near ? this.stationPrompt(near) : this.nearestVehicle() ? '[E] Conduire le véhicule' : (this.phase === 'intermission' && this.wave > 0 ? 'Vague suivante dans ' + Math.ceil(this.phaseT) + ' s' + (this.coop && this.coop.isClient ? '' : ' — [N] pour lancer') : ''),
      boss: this.boss && !this.boss.dead ? { name: this.boss.T.name, hp: this.boss.hp / this.boss.maxHp, stunned: this.boss.state === 'stunned' } : null,
      left: this.campaign ? 0 : this.phase === 'active' ? this.toSpawn + this.aliveCount() : 0,
      ads: pl.ads, sprint: pl.sprinting, stamina: pl.stamina, slots: pl.slots.map((x, i) => ({ name: G.weaponStats(x).name, cur: i === pl.cur })),
      team: this.coop && this.coop.active ? this.coop.team() : null,
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
    if (this.coop && this.coop.active) for (const o of this.coop.others.values()) {
      ctx.fillStyle = o.proxy.dead ? '#777' : '#' + o.color.toString(16).padStart(6, '0');
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(tx(o.proxy.pos.x), tz(o.proxy.pos.z), 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.translate(S / 2, S / 2); ctx.rotate(-pl.yaw + Math.PI);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(-5, -5); ctx.lineTo(5, -5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); ctx.stroke();
  }
};

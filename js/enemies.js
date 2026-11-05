// Zombies, zombies spéciaux, soldats et boss
G.ZTYPES = {
  walker: { name: 'Zombie', hp: 1, speed: 1.5, dmg: 20, size: 1, skin: 0x6a9a4a, shirt: 0x3a6a8a, pants: 0x2a2a5a, eye: 0xff2020, pts: 60 },
  runner: { name: 'Coureur', hp: 0.6, speed: 3.7, dmg: 14, size: 0.95, skin: 0x8a9a7a, shirt: 0x8a2a2a, pants: 0x3a3a3a, eye: 0xffaa00, pts: 70 },
  crawler: { name: 'Rampant', hp: 0.7, speed: 2.4, dmg: 15, size: 1.0, skin: 0x7a8a5a, shirt: 0x4a3a2a, pants: 0x2a2a2a, eye: 0xff6020, pts: 80, shape: 'crawler' },
  brute: { name: 'Brute', hp: 3.2, speed: 1.3, dmg: 38, size: 1.35, skin: 0x4a6a3a, shirt: 0x5a3a20, pants: 0x2a2a2a, eye: 0xff4000, pts: 140 },
  stalker: { name: 'Traqueur', hp: 0.9, speed: 4.6, dmg: 22, size: 1.0, skin: 0x8a3a3a, shirt: 0x6a2a2a, pants: 0x4a1a1a, eye: 0xffff40, pts: 120, shape: 'quad' },
  bloater: { name: 'Gonflé', hp: 1.5, speed: 1.4, dmg: 45, size: 1.12, skin: 0xa8b060, shirt: 0x8a8a40, pants: 0x4a4a20, eye: 0xffff40, pts: 110, swollen: true },
  screamer: { name: 'Hurleuse', hp: 1.1, speed: 2.0, dmg: 14, size: 1.15, skin: 0xb8b8c8, shirt: 0x4a4a6a, pants: 0x2a2a3a, eye: 0x60c0ff, pts: 150, shape: 'tall' },
  spitter: { name: 'Cracheur', hp: 0.9, speed: 2.2, dmg: 16, size: 1.0, skin: 0x7a5a9a, shirt: 0x2a4a2a, pants: 0x202020, eye: 0x80ff40, pts: 110, ranged: true },
  armored: { name: 'Blindé', hp: 1.5, speed: 1.6, dmg: 24, size: 1.05, skin: 0x5a7a4a, shirt: 0x50565c, pants: 0x30343a, eye: 0xff2020, pts: 120, armor: true },
  minion: { name: 'Squelette', hp: 0.5, speed: 3.2, dmg: 12, size: 0.9, skin: 0xd8d4c4, shirt: 0xb8b4a4, pants: 0x9a968a, eye: 0xa040ff, pts: 30 },
};

// Soldats : arme portée, portée de combat, précision (probabilité de toucher à courte distance)
G.STYPES = {
  rifleman: { name: 'Fantassin', hp: 1, speed: 3.0, dmg: 7, size: 1, skin: 0xc89a78, shirt: 0x4a5a3a, pants: 0x3a4030, eye: 0x202020, pts: 80, soldier: true, weapon: 'rifle', range: [6, 28], acc: 0.42, burst: [3, 5], rof: 0.11, mag: 30, reload: 2.4, react: 0.7, sound: 'rifle' },
  assault: { name: 'Assaillant', hp: 0.85, speed: 4.0, dmg: 5, size: 0.97, skin: 0xa87a58, shirt: 0x3a3a42, pants: 0x2a2a30, eye: 0x202020, pts: 90, soldier: true, weapon: 'smg', range: [2, 14], acc: 0.4, burst: [5, 9], rof: 0.075, mag: 32, reload: 2.0, react: 0.5, sound: 'smg' },
  breacher: { name: 'Brécheur', hp: 1.4, speed: 3.4, dmg: 4, pellets: 7, size: 1.05, skin: 0xd8a888, shirt: 0x2a2a2a, pants: 0x1a1a1a, eye: 0x202020, pts: 110, soldier: true, weapon: 'shotgun', range: [1, 8], acc: 0.55, burst: [1, 1], rof: 0.9, mag: 6, reload: 2.8, react: 0.45, sound: 'shotgun', helmet: true },
  sniper: { name: "Tireur d'élite", hp: 0.8, speed: 2.6, dmg: 50, size: 1, skin: 0xc8a078, shirt: 0x6a6a4a, pants: 0x4a4a30, eye: 0x202020, pts: 140, soldier: true, weapon: 'sniper', range: [14, 45], acc: 0.8, burst: [1, 1], rof: 2.6, mag: 5, reload: 3.0, react: 1.8, sound: 'sniper', laser: true },
  heavy: { name: 'Mitrailleur', hp: 2.6, speed: 1.8, dmg: 6, size: 1.2, skin: 0xb88a68, shirt: 0x3a2a2a, pants: 0x2a2020, eye: 0x202020, pts: 160, soldier: true, weapon: 'lmg', range: [5, 26], acc: 0.32, burst: [8, 16], rof: 0.085, mag: 100, reload: 4.0, react: 0.9, sound: 'lmg', helmet: true, vest: true },
  grenadier: { name: 'Grenadier', hp: 1.1, speed: 2.8, dmg: 6, size: 1, skin: 0xc09070, shirt: 0x5a4a2a, pants: 0x3a3020, eye: 0x202020, pts: 120, soldier: true, weapon: 'pistol', range: [7, 22], acc: 0.35, burst: [2, 3], rof: 0.3, mag: 12, reload: 1.8, react: 0.6, sound: 'pistol', grenades: true },
};

G.BOSSES = [
  { id: 'colosse', name: 'LE COLOSSE', hp: 4200, speed: 1.6, dmg: 50, size: 2.6, skin: 0x5a6a5a, shirt: 0x3a2a2a, pants: 0x2a2a2a, eye: 0xff1010, pts: 2000 },
  { id: 'necro', name: 'LE NÉCROMANCIEN', hp: 6500, speed: 2.4, dmg: 22, size: 1.5, skin: 0xd8d4c4, shirt: 0x3a1a5a, pants: 0x2a1040, eye: 0xb050ff, pts: 2500, floating: true },
  { id: 'belier', name: 'LE BÉLIER', hp: 9500, speed: 1.9, dmg: 60, size: 2.1, skin: 0x7a4a2a, shirt: 0x4a2a1a, pants: 0x2a1a10, eye: 0xffa000, pts: 3000, horns: true },
];
G.SBOSSES = [
  { id: 'juggernaut', name: 'LE JUGGERNAUT', hp: 5500, speed: 1.4, dmg: 6, size: 1.6, skin: 0x9a7a60, shirt: 0x2a2a2e, pants: 0x1a1a1e, eye: 0xff2020, pts: 2500, soldier: true, weapon: 'lmg', helmet: true, vest: true },
  { id: 'commandant', name: 'LE COMMANDANT', hp: 4800, speed: 3.0, dmg: 9, size: 1.25, skin: 0xc89a78, shirt: 0x5a2a2a, pants: 0x2a2a2a, eye: 0x202020, pts: 2500, soldier: true, weapon: 'rifle', beret: true },
  { id: 'pyro', name: 'LE PYROMANE', hp: 7000, speed: 2.6, dmg: 32, size: 1.4, skin: 0x8a6a4a, shirt: 0x6a4a1a, pants: 0x3a2a10, eye: 0xff8000, pts: 3000, soldier: true, weapon: 'flamer', helmet: true, vest: true },
];

G.Enemy = class {
  constructor(game, type, pos, opts = {}) {
    this.game = game;
    this.isBoss = !!opts.boss;
    const T = this.isBoss ? opts.boss : (G.ZTYPES[type] || G.STYPES[type]);
    this.T = T; this.type = this.isBoss ? T.id : type;
    this.shape = T.shape || 'humanoid';
    this.soldier = !!T.soldier;
    const mods = game.mods;
    this.size = T.size;
    this.elite = !this.isBoss && type !== 'minion' && Math.random() < mods.elite;
    const base = this.soldier ? game.soldierBaseHp() : game.zombieBaseHp();
    const baseHp = this.isBoss ? T.hp * opts.hpScale : base * T.hp * mods.hp * (this.elite ? 1.5 : 1);
    this.maxHp = this.hp = Math.round(baseHp);
    let spd = T.speed * mods.speed * (this.isBoss || this.soldier ? 1 : 1 + Math.min(0.45, game.wave * 0.025));
    if (type === 'walker' && game.wave >= 6 && Math.random() < Math.min(0.5, (game.wave - 5) * 0.06)) spd = 2.9 * mods.speed;
    if (this.elite) spd *= 1.15;
    this.speed = spd;
    this.dmg = T.dmg * mods.dmg * (this.isBoss ? 1 + 0.15 * (opts.cycle || 0) : 1) * (this.soldier ? 1 + Math.min(1, game.wave * 0.03) : 1);
    this.helmet = T.armor || T.helmet ? Math.round(this.maxHp * (T.vest ? 0.8 : 0.5)) : 0;
    this.pos = pos.clone();
    this.vel = new THREE.Vector3();
    this.w = Math.min(0.8, 0.6 * this.size); this.h = this.shape === 'crawler' || this.shape === 'quad' ? 0.95 : 1.9;
    this.lastAtk = -99;
    this.onGround = false;
    this.dead = false; this.deadT = 0;
    this.atkT = 0.5; this.flash = 0; this.anim = Math.random() * 10;
    this.stuckT = 0; this.lastPos = pos.clone();
    this.groanT = G.rand(2, 8);
    this.state = 'chase'; this.stateT = 0; this.abilityT = G.rand(3, 6); this.summonT = 10; this.tpT = 14;
    this.fuse = -1; this.buffT = 0;
    // soldats
    this.ammo = T.mag || 30; this.aimT = 0; this.burstLeft = 0; this.shotT = 0; this.losT = 0; this.los = false; this.strafeDir = Math.random() < 0.5 ? 1 : -1; this.grenT = G.rand(4, 8);
    this._head = new THREE.Vector3();
    this.buildModel();
    game.scene.add(this.mesh);
    this.mesh.updateMatrixWorld(true);
  }

  buildModel() {
    const T = this.T, s = this.size;
    const key = this.type + (this.elite ? 'e' : '');
    const skin = G.Tex.noiseTex('skin' + key, T.skin, this.soldier ? 14 : 34);
    const camo = this.soldier ? (ctx, rnd, px) => { for (let i = 0; i < 14; i++) px(Math.floor(rnd() * 8), Math.floor(rnd() * 8), T.shirt, (rnd() < 0.5 ? -24 : 18)); } : (ctx, rnd, px) => { for (let i = 0; i < 6; i++) px(Math.floor(rnd() * 8), Math.floor(rnd() * 8), T.skin); };
    const shirt = G.Tex.noiseTex('shirt' + key, T.shirt, 22, camo);
    const pants = G.Tex.noiseTex('pants' + key, T.pants, 20, this.soldier ? camo : null);
    const face = this.soldier ? G.Tex.pix('sface' + key, 8, 8, (ctx, rnd, px) => {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) px(x, y, T.skin, Math.floor((rnd() - 0.5) * 12));
      px(2, 3, 0xffffff); px(5, 3, 0xffffff); px(2, 3, 0x202020); px(5, 3, 0x202020); px(3, 5, 0x6a3a2a); px(4, 5, 0x6a3a2a);
      for (let x = 0; x < 8; x++) px(x, 6, 0x2a2a2a, 0); px(0, 7, 0x2a2a2a); px(7, 7, 0x2a2a2a);
    }) : G.Tex.faceTex('face' + key, T.skin, this.elite ? 0xffffff : T.eye, 0x301010);
    const mk = (tex) => new THREE.MeshLambertMaterial({ map: tex });
    this.mats = [mk(skin), mk(shirt), mk(pants), mk(face)];
    const [mSkin, mShirt, mPants, mFace] = this.mats;
    const g = new THREE.Group();
    const part = (sx, sy, sz, mat, px, py, pz, parent = g, offY = 0) => {
      const geo = new THREE.BoxGeometry(sx, sy, sz); if (offY) geo.translate(0, offY, 0);
      const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); parent.add(m); return m;
    };
    const headMats = [mSkin, mSkin, mSkin, mSkin, mFace, mSkin];
    const extraMat = (c) => { const m = new THREE.MeshLambertMaterial({ color: c }); this.mats.push(m); return m; };

    if (this.shape === 'crawler') {
      // torse au sol, tiré par les bras
      this.body = part(0.5, 0.32, 0.8, mShirt, 0, 0.22, -0.05);
      this.legL = part(0.2, 0.18, 0.35, mPants, -0.13, 0.12, -0.55); this.legR = part(0.2, 0.18, 0.2, mPants, 0.13, 0.12, -0.5);
      this.armL = part(0.18, 0.62, 0.18, mSkin, -0.32, 0.3, 0.3, g, -0.3); this.armR = part(0.18, 0.62, 0.18, mSkin, 0.32, 0.3, 0.3, g, -0.3);
      this.head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), headMats); this.head.position.set(0, 0.42, 0.5); g.add(this.head);
      this.armBase = -1.1;
    } else if (this.shape === 'quad') {
      // créature à quatre pattes, écorchée
      this.body = part(0.5, 0.45, 1.1, mShirt, 0, 0.75, 0);
      const spine = extraMat(0xd8c8b0);
      for (let i = 0; i < 4; i++) part(0.1, 0.12, 0.1, spine, 0, 1.02, -0.4 + i * 0.27);
      this.legs = [];
      for (const [x, z] of [[-0.18, 0.4], [0.18, 0.4], [-0.18, -0.4], [0.18, -0.4]]) this.legs.push(part(0.16, 0.6, 0.16, mPants, x, 0.6, z, g, -0.3));
      this.head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.5), headMats); this.head.position.set(0, 0.95, 0.72); g.add(this.head);
      part(0.3, 0.08, 0.2, extraMat(0xe8e0c8), 0, -0.2, 0.18, this.head);
    } else {
      const tall = this.shape === 'tall';
      const bodyW = T.swollen ? 0.75 : tall ? 0.42 : 0.5, bodyD = T.swollen ? 0.55 : 0.3;
      const legH = tall ? 1.0 : 0.75;
      this.legL = part(0.22, legH, 0.22, mPants, -0.12, legH, 0, g, -legH / 2);
      this.legR = part(0.22, legH, 0.22, mPants, 0.12, legH, 0, g, -legH / 2);
      if (T.floating) { this.legL.visible = false; this.legR.visible = false; part(0.6, 0.9, 0.4, mPants, 0, 0.55, 0); }
      this.body = part(bodyW, 0.75, bodyD, mShirt, 0, legH + 0.375, 0);
      const armL = tall ? 1.05 : 0.72;
      this.armL = part(0.2, armL, 0.2, this.soldier ? mShirt : mSkin, -(bodyW / 2 + 0.1), legH + 0.7, 0, g, -armL / 2 + 0.06);
      this.armR = part(0.2, armL, 0.2, this.soldier ? mShirt : mSkin, bodyW / 2 + 0.1, legH + 0.7, 0, g, -armL / 2 + 0.06);
      this.head = new THREE.Mesh(new THREE.BoxGeometry(0.5, tall ? 0.6 : 0.5, 0.5), headMats);
      this.head.position.set(0, legH + 1.0, 0); g.add(this.head);
      if (tall) { part(0.3, 0.12, 0.05, extraMat(0x101010), 0, -0.14, 0.26, this.head); }
      if (T.armor) {
        const mMetal = extraMat(0x8a9096);
        this.helmetMesh = part(0.56, 0.22, 0.56, mMetal, 0, 0.2, 0, this.head);
        part(0.56, 0.5, 0.36, mMetal, 0, 1.18, 0);
      }
      if (this.soldier) {
        if (T.helmet) this.helmetMesh = part(0.58, 0.22, 0.58, extraMat(T.vest ? 0x2a2c2e : 0x4a5a3a), 0, 0.3, 0, this.head);
        if (T.beret) part(0.56, 0.1, 0.56, extraMat(0x8a1a1a), 0.03, 0.28, 0, this.head);
        if (T.vest) part(0.58, 0.55, 0.4, extraMat(0x2a2c2e), 0, legH + 0.4, 0);
        else part(0.54, 0.4, 0.36, extraMat(0x3a3a2a), 0, legH + 0.45, 0);
        if (T.laser || this.elite) part(0.44, 0.08, 0.04, extraMat(this.elite ? 0xff2020 : 0x103040), 0, 0.03, 0.26, this.head);
        // arme tenue à deux mains
        const wid = T.weapon === 'flamer' ? 'lmg' : T.weapon;
        const gun = G.makeWeaponModel(wid, false, true);
        gun.rotation.y = Math.PI; gun.scale.setScalar(1.1);
        gun.position.set(0.12, legH + 0.62, 0.42);
        if (T.weapon === 'flamer') { const tank = part(0.3, 0.5, 0.2, extraMat(0xb04010), 0, legH + 0.45, -0.28); tank.name = 'tank'; }
        g.add(gun); this.gun = gun;
      }
      this.armBase = -Math.PI / 2;
    }
    if (T.horns) {
      const mHorn = extraMat(0xe8dcc0);
      const h1 = part(0.12, 0.12, 0.4, mHorn, -0.3, 0.2, 0.1, this.head); h1.rotation.x = -0.6;
      const h2 = part(0.12, 0.12, 0.4, mHorn, 0.3, 0.2, 0.1, this.head); h2.rotation.x = -0.6;
    }
    if (T.floating) {
      const mGlow = new THREE.MeshBasicMaterial({ color: 0xb050ff }); this.mats.push(mGlow);
      this.orb = part(0.2, 0.2, 0.2, mGlow, 0, -0.55, 0.15, this.armR);
      part(0.6, 0.15, 0.6, mShirt, 0, 0.3, 0, this.head);
    }
    if (this.type === 'colosse') {
      const mMetal = extraMat(0x4a4a50);
      part(0.35, 0.2, 0.35, mMetal, -0.38, 1.55, 0); part(0.35, 0.2, 0.35, mMetal, 0.38, 1.55, 0);
    }
    if (this.elite && !this.soldier) {
      const mGlow = new THREE.MeshBasicMaterial({ color: 0xff3030 }); this.mats.push(mGlow);
      part(0.52, 0.06, 0.06, mGlow, 0, 0.05, 0.26, this.head);
    }
    if (this.armL) this.armL.rotation.x = this.armR.rotation.x = this.armBase || -Math.PI / 2;
    g.scale.setScalar(s);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.mesh = g;
    this.mesh.position.copy(this.pos);
    if (T.laser) {
      const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]);
      this.laser = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.6 }));
      this.laser.visible = false; this.laser.frustumCulled = false;
      this.game.scene.add(this.laser);
    }
  }

  headPos() { return this._head.clone(); }
  get headY() { return this._head.y; }
  muzzlePos() {
    if (this.gun) { const v = new THREE.Vector3(0, 0.02, -0.75); this.gun.localToWorld(v); return v; }
    return new THREE.Vector3(this.pos.x, this.pos.y + 1.4 * this.size, this.pos.z);
  }
  // hitbox : renvoie distance d'impact et 'head' / 'body'
  rayHit(o, d, maxD) {
    const s = this.size, p = this.pos, hp = this._head;
    const hh = (this.shape === 'quad' ? 0.25 : 0.28) * s;
    const tHead = G.rayAABB(o, d, hp.x - hh, hp.y - hh, hp.z - hh, hp.x + hh, hp.y + hh, hp.z + hh);
    let bw = (this.T.swollen ? 0.4 : 0.32) * s, bh = 1.5 * s;
    if (this.shape === 'crawler') { bw = 0.45 * s; bh = 0.5 * s; }
    else if (this.shape === 'quad') { bw = 0.55 * s; bh = 1.0 * s; }
    else if (this.shape === 'tall') bh = 1.75 * s;
    const tBody = G.rayAABB(o, d, p.x - bw, p.y, p.z - bw, p.x + bw, p.y + bh, p.z + bw);
    let best = null;
    if (tHead !== null && tHead <= maxD) best = { t: tHead, part: 'head' };
    if (tBody !== null && tBody <= maxD && (!best || tBody < best.t - 0.05)) best = { t: tBody, part: 'body' };
    return best;
  }
  centerY() { return this.pos.y + (this.shape === 'crawler' ? 0.3 : this.shape === 'quad' ? 0.6 : 1.0) * this.size; }

  damage(amount, part, src) {
    if (this.dead) return 0;
    let dmg = amount;
    if (part === 'head' && this.helmet > 0) {
      const absorbed = Math.min(this.helmet, dmg * 0.6);
      this.helmet -= absorbed; dmg -= absorbed;
      if (this.helmet <= 0 && this.helmetMesh) { this.helmetMesh.visible = false; this.game.particles(this.headPos(), 0x8a9096, 10, 4); }
    }
    if (this.state === 'stunned') dmg *= 2;
    this.hp -= dmg;
    this.flash = 0.09;
    if (this.soldier && this.state !== 'engage') this.aimT = Math.max(this.aimT, 0.2); // riposte
    if (this.hp <= 0) this.die(src, part);
    return dmg;
  }

  die(src, part) {
    if (this.dead) return;
    this.dead = true; this.deadT = 0;
    if (this.laser) this.laser.visible = false;
    this.game.onEnemyKilled(this, src, part);
    if (this.type === 'bloater' && src !== 'nuke') this.explode();
  }
  explode() {
    this.game.explode(this.pos.clone().add(new THREE.Vector3(0, 1, 0)), 3.2, this.dmg, 'bloater', 0x9aa840);
    this.mesh.visible = false;
  }

  update(dt) {
    const game = this.game, w = game.world, pl = game.player;
    this.anim += dt;
    if (this.flash > 0) { this.flash -= dt; for (const m of this.mats) if (m.emissive) m.emissive.setHex(this.flash > 0 ? 0x902020 : (this.state === 'stunned' ? 0x303000 : 0)); }
    if (this.dead) {
      this.deadT += dt;
      const t = Math.min(1, this.deadT / 0.45);
      this.mesh.rotation.x = -t * Math.PI / 2;
      if (this.deadT > 1.4) this.mesh.position.y -= dt * 0.8;
      return this.deadT < 2.4;
    }
    const toP = new THREE.Vector3(pl.pos.x - this.pos.x, 0, pl.pos.z - this.pos.z);
    const dist = toP.length();
    const dy = pl.pos.y - this.pos.y;
    const moveDir = new THREE.Vector3();
    let speed = this.speed * (this.buffT > 0 ? 1.35 : 1);
    if (this.buffT > 0) this.buffT -= dt;

    this.groanT -= dt;
    if (this.groanT < 0) { this.groanT = G.rand(4, 10); if (dist < 22 && !this.soldier) G.Audio.S.groan(this.pos); }

    let custom = false;
    if (this.isBoss && !this.soldier) { speed = this.bossLogic(dt, dist, dy, toP, moveDir); }
    else if (this.soldier) { speed = this.soldierLogic(dt, dist, dy, toP, moveDir); custom = this.state === 'engage' || this.state === 'reload' || this.state === 'cast'; }
    else if (this.T.ranged) speed = this.spitterLogic(dt, dist, toP, moveDir);
    else if (this.shape === 'quad') speed = this.stalkerLogic(dt, dist, dy, toP, speed);
    else if (this.shape === 'tall') speed = this.screamerLogic(dt, dist, speed);

    const frozen = ['stunned', 'slam', 'windup', 'charge', 'cast', 'scream', 'pounce'].includes(this.state);
    if (moveDir.lengthSq() === 0 && !frozen && !custom) {
      const direct = dist < 2.5 || (dist < 7 && Math.abs(dy) < 1.2 && w.lineOfSight(new THREE.Vector3(this.pos.x, this.pos.y + 1.2, this.pos.z), pl.eye));
      if (direct || this.T.floating) moveDir.copy(toP).normalize();
      else {
        const nxt = w.nextStep(this.pos.x, this.pos.y, this.pos.z);
        if (nxt) moveDir.set(nxt[0] + 0.5 - this.pos.x, 0, nxt[2] + 0.5 - this.pos.z).normalize();
        else moveDir.copy(toP).normalize();
      }
    }

    // attaque au corps à corps
    const reach = 1.25 + 0.35 * Math.min(this.size, 2.6);
    this.atkT -= dt;
    let attacking = false;
    if (!this.T.ranged && !this.soldier && dist < reach && Math.abs(dy) < 1.6 + this.size * 0.3 && !frozen) {
      attacking = true;
      if (this.type === 'bloater') { if (this.fuse < 0) this.fuse = 0.7; }
      else if (this.atkT <= 0) { this.atkT = this.isBoss ? 1.3 : 1.0; this.lastAtk = game.time; game.damagePlayer(this.dmg, this); }
      if (dist < 0.9) speed = 0;
    }
    if (this.soldier && dist < 1.6 && Math.abs(dy) < 1.6) {
      // coup de crosse
      if (this.atkT <= 0) { this.atkT = 1.2; this.lastAtk = game.time; game.damagePlayer(this.dmg * 2 + 10, this); }
    }
    if (this.fuse >= 0) {
      this.fuse -= dt; speed *= 0.3;
      this.mesh.scale.setScalar(this.size * (1 + (0.7 - this.fuse) * 0.25));
      for (const m of this.mats) if (m.emissive) m.emissive.setHex(Math.floor(this.fuse * 12) % 2 ? 0x606000 : 0);
      if (this.fuse <= 0) { this.hp = 0; this.dead = true; this.deadT = 2; this.explode(); game.onEnemyKilled(this, 'self', 'body', true); return false; }
    }

    // séparation
    for (const o of game.enemies) {
      if (o === this || o.dead) continue;
      const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z;
      const d2 = ox * ox + oz * oz, r = (this.w + o.w) * 0.55;
      if (d2 < r * r && d2 > 1e-4 && Math.abs(this.pos.y - o.pos.y) < 1.5) { const d = Math.sqrt(d2); moveDir.x += (ox / d) * 0.8 * (1 - d / r); moveDir.z += (oz / d) * 0.8 * (1 - d / r); }
    }
    if (moveDir.lengthSq() > 1) moveDir.normalize();

    if (this.state !== 'charge' && this.state !== 'pounce') { this.vel.x = moveDir.x * speed; this.vel.z = moveDir.z * speed; }
    if (this.T.floating) {
      const sb = w.standBelow(Math.floor(this.pos.x), this.pos.y, Math.floor(this.pos.z));
      const targetY = Math.max(sb < 999 ? sb : this.pos.y, pl.pos.y) + 1.2 + Math.sin(this.anim * 2) * 0.3;
      this.vel.y = (Math.min(w.H, targetY) - this.pos.y) * 2;
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt; this.pos.y += this.vel.y * dt;
      this.pos.x = G.clamp(this.pos.x, 1, w.W - 1); this.pos.z = G.clamp(this.pos.z, 1, w.D - 1);
    } else {
      this.vel.y -= 26 * dt;
      if (this.vel.y < -30) this.vel.y = -30;
      this.blocked = false;
      w.moveEntity(this, dt, true);
      if (this.blocked && this.onGround && this.state !== 'charge' && this.state !== 'engage') this.vel.y = 7.5;
    }

    const fb = w.blockAt(this.pos.x, this.pos.y + 0.1, this.pos.z);
    if (fb === G.B.LAVA && !this.isBoss) this.damage(this.maxHp * dt * 0.5, 'body', 'lava');
    if (this.pos.y < -5) this.respawnFar();

    // détection de blocage
    this.stuckT += dt;
    if (this.stuckT > 5) {
      const idle = this.soldier ? (this.state === 'move' && !this.los) : (this.state === 'chase' && !this.T.ranged);
      if (this.pos.distanceTo(this.lastPos) < 1.2 && game.time - this.lastAtk > 5 && idle) this.respawnFar();
      this.stuckT = 0; this.lastPos.copy(this.pos);
    }

    // orientation + animation
    const face = this.state === 'charge' ? this.chargeDir : (this.soldier && this.los) || dist < 6 || moveDir.lengthSq() < 0.01 ? toP : moveDir;
    if (face && face.lengthSq() > 0.001) {
      const target = Math.atan2(face.x, face.z);
      let diff = target - this.mesh.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.mesh.rotation.y += diff * Math.min(1, dt * 8);
    }
    const sp = Math.hypot(this.vel.x, this.vel.z);
    const swing = Math.sin(this.anim * (3 + sp * 2.2)) * Math.min(0.8, sp * 0.3);
    if (this.legs) this.legs.forEach((l, i) => { l.rotation.x = (i % 2 === (i < 2 ? 0 : 1) ? 1 : -1) * swing * 1.2; });
    else if (this.legL) { this.legL.rotation.x = swing; this.legR.rotation.x = -swing; }
    if (this.armL) {
      if (this.shape === 'crawler') { this.armL.rotation.x = -1.1 + Math.sin(this.anim * 6) * 0.5; this.armR.rotation.x = -1.1 - Math.sin(this.anim * 6) * 0.5; }
      else if (this.soldier) {
        // les bras tiennent l'arme
        this.armL.rotation.set(-1.45, 0.45, 0); this.armR.rotation.set(-1.5, -0.15, 0);
        if (this.state === 'reload') { this.armL.rotation.x = -0.9 + Math.sin(this.anim * 8) * 0.2; }
      } else {
        let armBase = this.armBase + (this.state === 'slam' || this.state === 'cast' ? -0.9 : 0);
        if (this.state === 'scream') armBase = -2.6 + Math.sin(this.anim * 30) * 0.1;
        const atkSwing = attacking ? Math.sin(this.anim * 12) * 0.5 : 0;
        this.armL.rotation.x = armBase + swing * 0.3 + atkSwing;
        this.armR.rotation.x = armBase - swing * 0.3 - atkSwing;
      }
    }
    if (this.gun && this.soldier) this.gun.rotation.x = this.state === 'reload' ? 0.6 : 0;
    this.mesh.position.copy(this.pos);
    if (this.state === 'windup') this.mesh.position.x += Math.sin(this.anim * 60) * 0.05;
    this.mesh.updateMatrixWorld(true);
    this.head.getWorldPosition(this._head);
    return true;
  }

  respawnFar() {
    const sp = this.isBoss ? this.game.pickSpawn(8, 20) : this.game.pickSpawn();
    if (sp) { this.pos.copy(sp); this.vel.set(0, 0, 0); this.lastPos.copy(sp); }
  }

  // ---------- zombies spéciaux ----------
  spitterLogic(dt, dist, toP, moveDir) {
    const pl = this.game.player;
    const los = this.game.world.lineOfSight(new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z), pl.eye);
    this.abilityT -= dt;
    if (los && dist < 15) {
      if (dist < 6) moveDir.copy(toP).normalize().multiplyScalar(-1);
      else if (dist < 12) { const side = new THREE.Vector3(-toP.z, 0, toP.x).normalize(); moveDir.copy(side).multiplyScalar(Math.sin(this.anim * 0.7) > 0 ? 0.5 : -0.5); }
      if (this.abilityT <= 0) {
        this.abilityT = G.rand(2.2, 3.2);
        const from = new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z);
        const target = pl.pos.clone().add(pl.vel.clone().multiplyScalar(0.4));
        const t = Math.max(0.5, dist / 11);
        const vel = new THREE.Vector3((target.x - from.x) / t, (target.y + 0.5 - from.y) / t + 0.5 * 18 * t, (target.z - from.z) / t);
        this.game.spawnProjectile('spit', from, vel, this.dmg, this);
        G.Audio.S.spit(this.pos);
      }
      return this.speed * 0.8;
    }
    return this.speed;
  }
  stalkerLogic(dt, dist, dy, toP, speed) {
    const game = this.game, pl = game.player;
    this.abilityT -= dt;
    if (this.state === 'pounce') {
      if (!this.hitDuringCharge && dist < 1.5 && Math.abs(dy) < 1.8) { this.hitDuringCharge = true; this.lastAtk = game.time; game.damagePlayer(this.dmg, this); pl.vel.x += this.chargeDir.x * 6; pl.vel.z += this.chargeDir.z * 6; }
      if (this.onGround && this.stateT < game.time - 0.15) this.state = 'chase';
      return speed;
    }
    if (this.abilityT <= 0 && this.onGround && dist > 2.5 && dist < 8 && Math.abs(dy) < 2 && game.world.lineOfSight(new THREE.Vector3(this.pos.x, this.pos.y + 0.8, this.pos.z), pl.eye)) {
      this.abilityT = G.rand(2.5, 4);
      this.state = 'pounce'; this.stateT = game.time; this.hitDuringCharge = false;
      this.chargeDir = toP.clone().normalize();
      this.vel.x = this.chargeDir.x * Math.min(13, dist * 2.2); this.vel.z = this.chargeDir.z * Math.min(13, dist * 2.2); this.vel.y = 6.5;
      G.Audio.S.growl(this.pos);
    }
    return speed;
  }
  screamerLogic(dt, dist, speed) {
    const game = this.game, pl = game.player;
    this.abilityT -= dt;
    if (this.state === 'scream') {
      if (this.stateT <= game.time) { this.state = 'chase'; game.scream(this); }
      return 0;
    }
    if (this.abilityT <= 0 && dist < 16 && game.world.lineOfSight(new THREE.Vector3(this.pos.x, this.pos.y + 2, this.pos.z), pl.eye)) {
      this.abilityT = G.rand(9, 12); this.state = 'scream'; this.stateT = game.time + 1.1;
      G.Audio.S.screamCharge(this.pos);
      return 0;
    }
    return speed;
  }

  // ---------- soldats ----------
  soldierLogic(dt, dist, dy, toP, moveDir) {
    const game = this.game, pl = game.player, w = game.world, T = this.T;
    const eye = new THREE.Vector3(this.pos.x, this.pos.y + 1.55 * Math.min(this.size, 1.3), this.pos.z);
    this.losT -= dt;
    if (this.losT <= 0) { this.losT = 0.2; this.los = w.lineOfSight(eye, pl.eye); }
    const range = this.isBoss ? (T.id === 'pyro' ? [1, 7] : T.id === 'juggernaut' ? [3, 24] : [6, 26]) : T.range;
    this.shotT -= dt; this.grenT -= dt;
    if (this.isBoss) { const r = this.soldierBoss(dt, dist, range); if (r !== undefined) return r; }
    if (this.state === 'reload') {
      if (this.stateT <= game.time) { this.state = 'move'; this.ammo = this.isBoss ? 999 : T.mag; }
      if (this.los && dist < 10) moveDir.copy(toP).normalize().multiplyScalar(-0.6); // recule pour recharger
      return this.speed * 0.7;
    }
    // grenades
    if ((T.grenades || this.type === 'commandant') && this.grenT <= 0 && dist > 6 && dist < 22 && this.los) {
      this.grenT = G.rand(5, 8);
      const from = eye.clone();
      const t = 1.1;
      const target = pl.pos.clone().add(pl.vel.clone().multiplyScalar(0.5));
      const vel = new THREE.Vector3((target.x - from.x) / t, (target.y - from.y) / t + 0.5 * 20 * t, (target.z - from.z) / t);
      game.spawnProjectile('egrenade', from, vel, 45 * game.mods.dmg, this);
    }
    if (this.los && dist <= range[1]) {
      this.state = 'engage';
      this.aimT += dt;
      // déplacement tactique
      if (dist < range[0]) moveDir.copy(toP).normalize().multiplyScalar(-1);
      else if (range[0] <= 2 && dist > 3) moveDir.copy(toP).normalize(); // fonce
      else { const side = new THREE.Vector3(-toP.z, 0, toP.x).normalize(); if (Math.random() < dt * 0.4) this.strafeDir *= -1; moveDir.copy(side).multiplyScalar(this.strafeDir * 0.45); }
      if (this.laser) this.updateLaser(true);
      const react = T.react * (this.elite ? 0.7 : 1);
      if (this.aimT > react && this.shotT <= 0) {
        if (this.burstLeft <= 0) this.burstLeft = G.randInt(T.burst[0], T.burst[1]);
        this.fireAt(dist);
        this.burstLeft--; this.ammo--;
        this.shotT = this.burstLeft > 0 ? T.rof : T.rof + G.rand(0.5, 1.2);
        if (T.laser) this.aimT = 0;
        if (this.ammo <= 0) { this.state = 'reload'; this.stateT = game.time + T.reload; this.burstLeft = 0; G.Audio.S.reload(this.pos); }
      }
      return T.laser && this.aimT > 0.3 ? 0 : this.speed * 0.55;
    }
    if (this.laser) this.updateLaser(false);
    this.aimT = Math.max(0, this.aimT - dt * 2);
    this.state = 'move';
    return this.speed;
  }
  updateLaser(on) {
    this.laser.visible = on;
    if (!on) return;
    const a = this.muzzlePos(), b = this.game.player.eye.clone();
    const pos = this.laser.geometry.attributes.position;
    pos.setXYZ(0, a.x, a.y, a.z); pos.setXYZ(1, b.x, b.y - 0.15, b.z); pos.needsUpdate = true;
    this.laser.material.opacity = 0.25 + Math.min(1, this.aimT / this.T.react) * 0.6;
  }
  fireAt(dist, accMul = 1, dmgMul = 1) {
    const game = this.game, pl = game.player, T = this.T;
    const from = this.muzzlePos();
    const pellets = T.pellets || 1;
    let acc = (T.acc || 0.4) * accMul * (1 + game.mods.tier * 0.05) * (this.elite ? 1.25 : 1);
    acc *= G.clamp(1.25 - dist / 40, 0.35, 1.1);
    const pv = Math.hypot(pl.vel.x, pl.vel.z);
    if (pv > 5) acc *= 0.6; else if (pv > 2) acc *= 0.8;
    if (!pl.onGround) acc *= 0.7;
    let hits = 0;
    for (let i = 0; i < pellets; i++) if (Math.random() < acc) hits++;
    game.enemyShot(this, from, hits, hits * this.dmg * dmgMul, T.sound || 'rifle');
  }
  soldierBoss(dt, dist, range) {
    const game = this.game, pl = game.player, T = this.T;
    this.abilityT -= dt;
    if (T.id === 'juggernaut') {
      if (this.state === 'spin') {
        if (game.time > this.stateT) { this.state = 'fire'; this.stateT = game.time + 3.2; }
        return 0;
      }
      if (this.state === 'fire') {
        if (this.shotT <= 0 && this.los) { this.shotT = 0.07; this.fireAt(dist, 0.75); }
        if (game.time > this.stateT) { this.state = 'move'; this.abilityT = G.rand(1.5, 2.5); }
        return this.speed * 0.4;
      }
      if (this.los && dist < range[1] && this.abilityT <= 0) { this.state = 'spin'; this.stateT = game.time + 1.0; G.Audio.S.spinup(this.pos); return 0; }
      this.state = 'move';
      return this.speed;
    }
    if (T.id === 'pyro') {
      if (this.los && dist < 7.5 && Math.abs(pl.pos.y - this.pos.y) < 2.5) {
        this.state = 'engage';
        if (this.shotT <= 0) {
          this.shotT = 0.1;
          game.flame(this, this.muzzlePos(), pl.eye.clone());
          game.damagePlayer(this.dmg * 0.1, this, true);
        }
        return this.speed * 0.6;
      }
      if (this.abilityT <= 0 && dist < 18) { this.abilityT = 6; game.fireZone(pl.pos.clone(), 12); }
      this.state = 'move';
      return this.speed * 1.15;
    }
    if (T.id === 'commandant') {
      this.summonT -= dt;
      if (this.summonT <= 0) {
        this.summonT = 16;
        for (let i = 0; i < 3; i++) { const p = game.pickSpawn(8, 25); if (p) game.spawnEnemy(G.pick(['rifleman', 'assault', 'breacher']), p); }
        game.floatText('Le Commandant appelle des renforts !', '#ff8060');
      }
      return undefined; // combat normal
    }
    return undefined;
  }

  // ---------- boss zombies ----------
  bossLogic(dt, dist, dy, toP, moveDir) {
    const game = this.game, pl = game.player;
    this.stateT -= dt; this.abilityT -= dt;
    const id = this.T.id;
    if (id === 'colosse') {
      if (this.state === 'slam') {
        if (this.stateT <= 0) { this.state = 'chase'; this.abilityT = G.rand(5, 7); game.shockwave(this.pos.clone(), 7, this.dmg * 0.9); }
        return 0;
      }
      if (this.abilityT <= 0 && dist < 10) { this.state = 'slam'; this.stateT = 1.1; game.telegraph(this.pos.clone(), 7, 1.1); G.Audio.S.slam(); return 0; }
      return this.speed;
    }
    if (id === 'necro') {
      this.summonT -= dt; this.tpT -= dt;
      if (this.state === 'cast') { if (this.stateT <= 0) this.state = 'chase'; return 0; }
      if (this.summonT <= 0) {
        this.summonT = 12; this.state = 'cast'; this.stateT = 1.0;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2, p = new THREE.Vector3(this.pos.x + Math.cos(a) * 2, 0, this.pos.z + Math.sin(a) * 2);
          p.x = G.clamp(p.x, 2, game.world.W - 2); p.z = G.clamp(p.z, 2, game.world.D - 2);
          p.y = game.world.standBelow(Math.floor(p.x), this.pos.y, Math.floor(p.z)); if (p.y >= 999) continue;
          game.spawnEnemy('minion', p); game.particles(p.clone().add(new THREE.Vector3(0, 1, 0)), 0xb050ff, 12, 3);
        }
        return 0;
      }
      if (this.tpT <= 0) {
        this.tpT = G.rand(12, 16);
        const sp = game.pickSpawn(10, 22);
        if (sp) { game.particles(this.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0xb050ff, 20, 5); this.pos.copy(sp); this.pos.y += 1.5; }
      }
      if (this.abilityT <= 0 && dist < 26) {
        this.abilityT = 2.6;
        const from = new THREE.Vector3(this.pos.x, this.pos.y + 1.6 * this.size, this.pos.z);
        for (let i = -1; i <= 1; i++) {
          const dir = pl.eye.clone().sub(from).normalize();
          dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.22);
          game.spawnProjectile('orb', from.clone(), dir.multiplyScalar(9), this.dmg, this);
        }
      }
      if (dist < 9) moveDir.copy(toP).normalize().multiplyScalar(-1);
      else if (dist < 16) moveDir.set(-toP.z, 0, toP.x).normalize().multiplyScalar(0.6);
      return this.speed;
    }
    if (id === 'belier') {
      if (this.state === 'stunned') { if (this.stateT <= 0) { this.state = 'chase'; this.abilityT = G.rand(3, 5); } return 0; }
      if (this.state === 'windup') {
        if (this.stateT <= 0) { this.state = 'charge'; this.stateT = 1.8; this.chargeDir = toP.clone().normalize(); this.hitDuringCharge = false; }
        return 0;
      }
      if (this.state === 'charge') {
        this.vel.x = this.chargeDir.x * 15; this.vel.z = this.chargeDir.z * 15;
        if (!this.hitDuringCharge && dist < 2.2 && Math.abs(dy) < 2.5) {
          this.hitDuringCharge = true; game.damagePlayer(this.dmg, this);
          pl.vel.x += this.chargeDir.x * 14; pl.vel.z += this.chargeDir.z * 14; pl.vel.y = 6;
        }
        if (this.blocked || this.stateT <= 0) {
          this.state = this.blocked ? 'stunned' : 'chase'; this.stateT = 2.6; this.abilityT = G.rand(3, 5);
          if (this.blocked) { game.shake(0.5); G.Audio.S.slam(); game.particles(this.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x777777, 18, 6); game.floatText('ÉTOURDI ! ×2 dégâts', '#ffe14d'); }
        }
        this.blocked = false;
        return 15;
      }
      if (this.abilityT <= 0 && dist > 5 && dist < 22 && game.world.lineOfSight(new THREE.Vector3(this.pos.x, this.pos.y + 1.5, this.pos.z), pl.eye)) {
        this.state = 'windup'; this.stateT = 0.9; G.Audio.S.boss();
        return 0;
      }
      return this.speed;
    }
    return this.speed;
  }

  remove() {
    this.game.scene.remove(this.mesh);
    if (this.laser) { this.game.scene.remove(this.laser); this.laser.geometry.dispose(); this.laser.material.dispose(); }
    this.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    for (const m of this.mats) m.dispose();
  }
};

G.rayAABB = function (o, d, x0, y0, z0, x1, y1, z1) {
  let tmin = -Infinity, tmax = Infinity;
  const axes = [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]];
  for (const [oo, dd, a, b] of axes) {
    if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) return null; continue; }
    let t1 = (a - oo) / dd, t2 = (b - oo) / dd;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  return tmin < 0 ? 0 : tmin;
};

// Joueur : déplacement, caméra, armes, atouts
G.PERKS = {
  cuirasse: { name: 'Cuirasse', desc: 'PV max 100 → 250', price: 2500, color: 0xd03030, icon: '🛡' },
  mainleste: { name: 'Main Leste', desc: 'Rechargement 2× plus rapide', price: 3000, color: 0x30a040, icon: '⚡' },
  rafale: { name: 'Rafale', desc: 'Cadence de tir +35%', price: 2000, color: 0xe0a020, icon: '✦' },
  souffle: { name: 'Second Souffle', desc: 'Vous relève une fois si vous tombez', price: 1500, color: 0x3080e0, icon: '✚' },
  foulee: { name: 'Foulée', desc: 'Vitesse +20%, sprint illimité', price: 2000, color: 0xe06020, icon: '➤' },
  bandouliere: { name: 'Bandoulière', desc: '3e emplacement d\'arme', price: 4000, color: 0x40c0a0, icon: '✚✚' },
};

G.Player = class {
  constructor(game) {
    this.game = game;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.w = 0.6; this.h = 1.8; this.eyeH = 1.62;
    this.eye = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.camY = 0;
    this.keys = {}; this.mouse = { left: false, right: false };
    this.lookDX = 0; this.lookDY = 0;
    this.buildViewModel();
  }

  reset(spawn) {
    this.pos.copy(spawn); this.vel.set(0, 0, 0);
    this.camY = spawn.y + this.eyeH;
    this.yaw = Math.PI; this.pitch = 0;
    this.maxHp = 100; this.hp = 100; this.lastHit = -99; this.dead = false;
    this.stamina = 1;
    this.perks = new Set();
    this.slots = [this.newSlot('pistol')];
    this.cur = 0;
    this.fireCD = 0; this.reloadT = 0; this.ads = 0; this.switchT = 0;
    this.meleeCD = 0; this.meleeT = 0; this.grenades = 2; this.grenadeCD = 0;
    this.recoil = 0; this.bob = 0; this.triggerHeld = false;
    this.lavaT = 0; this.slowT = 0;
    this.setViewWeapon();
  }
  newSlot(id, up = false) { const s = up ? G.upgradeStats(id) : G.WEAPONS[id]; return { id, up, mag: s.mag, reserve: s.reserve }; }
  get slot() { return this.slots[this.cur]; }
  get wstats() { return G.weaponStats(this.slot); }
  get maxSlots() { return this.perks.has('bandouliere') ? 3 : 2; }
  hasWeapon(id) { return this.slots.findIndex((s) => s.id === id); }

  giveWeapon(id, up = false) {
    const idx = this.hasWeapon(id);
    if (idx >= 0) { this.slots[idx] = this.newSlot(id, up || this.slots[idx].up); this.cur = idx; }
    else if (this.slots.length < this.maxSlots) { this.slots.push(this.newSlot(id, up)); this.cur = this.slots.length - 1; }
    else this.slots[this.cur] = this.newSlot(id, up);
    this.reloadT = 0; this.switchT = 0.4;
    this.setViewWeapon();
  }
  refillAmmo() { for (const s of this.slots) { const st = G.weaponStats(s); s.mag = st.mag; s.reserve = st.reserve; } }

  buildViewModel() {
    this.vmScene = new THREE.Scene();
    this.vmCam = new THREE.PerspectiveCamera(65, 1, 0.01, 10);
    this.vmScene.add(new THREE.HemisphereLight(0xffffff, 0x50505a, 2.0));
    const dl = new THREE.DirectionalLight(0xfff4e8, 1.6); dl.position.set(1, 2, 1.5); this.vmScene.add(dl);
    this.vmRoot = new THREE.Group();
    this.vmRoot.scale.setScalar(0.6);
    this.shells = [];
    this.sway = new THREE.Vector2();
    this.vmScene.add(this.vmRoot);
    // bras
    const arm = new THREE.MeshLambertMaterial({ color: 0x5a6a48 });
    const hand = new THREE.MeshLambertMaterial({ color: 0xd8a880 });
    this.armMat = arm; this.handMat = hand;
    const glove = new THREE.MeshLambertMaterial({ color: 0x2a2a2a }); this.gloveMat = glove;
    // flash du canon
    const fm = new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0.95, depthWrite: false });
    this.flash = new THREE.Group();
    const f1 = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), fm); this.flash.add(f1);
    const f2 = f1.clone(); f2.rotation.y = Math.PI / 2; this.flash.add(f2);
    const f3 = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), fm); f3.rotation.x = Math.PI / 2; this.flash.add(f3);
    this.flash.visible = false;
    // couteau
    const kn = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.28), new THREE.MeshLambertMaterial({ color: 0xc8ccd0 }));
    blade.position.z = -0.18; kn.add(blade);
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, 0.12), new THREE.MeshLambertMaterial({ color: 0x2a2a2a })); kn.add(hilt);
    kn.visible = false; this.knife = kn; this.vmScene.add(kn);
  }
  setViewWeapon() {
    if (this.vmGun) { this.vmRoot.remove(this.vmGun); this.vmGun.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    this.vmGun = G.makeWeaponModel(this.slot.id, this.slot.up);
    this.vmRoot.add(this.vmGun);
    // mains et manches attachées à l'arme
    const U = this.vmGun.userData, id = this.slot.id;
    const mk = (sx, sy, sz, m, x, y, z, rx = 0, ry = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); b.rotation.set(rx, ry, 0); this.vmGun.add(b); return b; };
    mk(0.05, 0.07, 0.08, this.gloveMat, 0.0, -0.05, 0.04, 0.3);
    mk(0.075, 0.075, 0.3, this.armMat, 0.03, -0.12, 0.22, 0.45, 0.1);
    const short = id === 'pistol' || id === 'magnum';
    const lz = short ? 0.03 : id === 'shotgun' ? (U.pumpBase ? U.pumpBase.z : -0.3) : id === 'sniper' ? -0.3 : id === 'lmg' ? -0.32 : -0.3;
    const left = mk(0.05, 0.06, 0.08, this.gloveMat, short ? -0.025 : -0.005, short ? -0.08 : -0.025, lz, 0.2);
    const larm = mk(0.075, 0.075, 0.34, this.armMat, short ? -0.06 : -0.08, short ? -0.14 : -0.1, lz + 0.18, 0.4, -0.45);
    if (U.pump) { this.vmGun.remove(left); U.pump.add(left); left.position.set(0, -0.03, 0); this.vmGun.remove(larm); U.pump.add(larm); larm.position.set(-0.07, -0.08, 0.18); }
    this.vmGun.position.set(0, 0, 0);
    this.flash.position.copy(this.vmGun.userData.muzzle);
    this.boltT = 0; this.pumpT = 0;
    this.vmGun.add(this.flash);
  }

  onMouseMove(dx, dy) { this.lookDX += dx; this.lookDY += dy; this.sway.x += dx * 0.0004; this.sway.y += dy * 0.0004; }

  update(dt, cam) {
    const game = this.game, w = game.world, set = G.Ranked.profile.settings;
    // regard
    const sens = 0.0022 * set.sens * (1 - this.ads * (1 - this.wstats.zoom) * 0.6);
    this.yaw -= this.lookDX * sens; this.pitch -= this.lookDY * sens;
    this.lookDX = this.lookDY = 0;
    this.pitch = G.clamp(this.pitch, -1.55, 1.55);

    // déplacement
    const k = this.keys;
    const fwd = (k.KeyW || k.KeyZ ? 1 : 0) - (k.KeyS ? 1 : 0);
    const str = (k.KeyD ? 1 : 0) - (k.KeyA || k.KeyQ ? 1 : 0);
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wish = new THREE.Vector3(-sin * fwd + cos * str, 0, -cos * fwd - sin * str);
    if (wish.lengthSq() > 1) wish.normalize();
    const feet = w.blockAt(this.pos.x, this.pos.y - 0.05, this.pos.z);
    const inBlock = w.blockAt(this.pos.x, this.pos.y + 0.2, this.pos.z);
    const st = this.wstats;
    const foulee = this.perks.has('foulee');
    let sprinting = k.ShiftLeft && fwd > 0 && this.ads < 0.3 && this.reloadT <= 0 && (foulee || this.stamina > 0.05);
    if (sprinting && !foulee) this.stamina = Math.max(0, this.stamina - dt * 0.18);
    else this.stamina = Math.min(1, this.stamina + dt * 0.25);
    let speed = (sprinting ? 7.0 : 4.6) * st.move * (foulee ? 1.2 : 1);
    speed *= G.lerp(1, 0.55, this.ads);
    if (inBlock === G.B.WATER) speed *= 0.6;
    if (this.slowT > 0) { this.slowT -= dt; speed *= 0.55; }
    this.sprinting = sprinting && wish.lengthSq() > 0;
    const accel = this.onGround ? (feet === G.B.ICE ? 2.5 : 14) : 3;
    this.vel.x = G.lerp(this.vel.x, wish.x * speed, Math.min(1, accel * dt));
    this.vel.z = G.lerp(this.vel.z, wish.z * speed, Math.min(1, accel * dt));
    if (k.Space && this.onGround) { this.vel.y = 8.2; this.onGround = false; }
    this.vel.y -= 26 * dt; if (this.vel.y < -40) this.vel.y = -40;
    w.moveEntity(this, dt, true);
    if (this.pos.y < -10) { this.pos.copy(game.map.playerSpawn); this.vel.set(0, 0, 0); }

    // lave
    if (inBlock === G.B.LAVA || feet === G.B.LAVA) {
      this.lavaT -= dt;
      if (this.lavaT <= 0) { this.lavaT = 0.25; game.damagePlayer(9, 'lava'); }
    }
    // régénération
    if (game.time - this.lastHit > game.mods.regenDelay && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + dt * 45);

    // caméra
    const targetY = this.pos.y + this.eyeH;
    this.camY = this.camY < targetY ? G.lerp(this.camY, targetY, Math.min(1, dt * 14)) : targetY;
    if (Math.abs(this.camY - targetY) > 1.2) this.camY = targetY;
    const hsp = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && hsp > 0.5) {
      const prev = Math.sin(this.bob);
      this.bob += dt * hsp * 1.9;
      if (prev > 0 && Math.sin(this.bob) <= 0) G.Audio.S.step();
    }
    const bobY = Math.sin(this.bob * 2) * 0.04 * Math.min(1, hsp / 5) * (1 - this.ads);
    this.eye.set(this.pos.x, this.camY + bobY, this.pos.z);
    cam.position.copy(this.eye);
    cam.position.x += game.shakeAmt * (Math.random() - 0.5) * 0.3;
    cam.position.y += game.shakeAmt * (Math.random() - 0.5) * 0.3;
    cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    const fov = set.fov * G.lerp(1, st.zoom, this.ads) * (this.sprinting ? 1.06 : 1);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = G.lerp(cam.fov, fov, Math.min(1, dt * 14)); cam.updateProjectionMatrix(); }

    this.updateWeapon(dt, hsp);
  }

  updateWeapon(dt, hsp) {
    const game = this.game, st = this.wstats, s = this.slot;
    this.fireCD -= dt; this.meleeCD -= dt; this.grenadeCD -= dt; this.switchT = Math.max(0, this.switchT - dt);
    const wantAds = this.mouse.right && this.reloadT <= 0 && this.meleeT <= 0;
    this.ads = G.lerp(this.ads, wantAds ? 1 : 0, Math.min(1, dt * 12));
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const need = st.mag - s.mag, take = Math.min(need, s.reserve);
        s.mag += take; s.reserve -= take;
      }
    }
    if (this.meleeT > 0) this.meleeT -= dt;
    const fury = game.power.fury > 0;
    if (this.mouse.left && this.fireCD <= 0 && this.reloadT <= 0 && this.switchT <= 0 && this.meleeT <= 0 && (st.auto || !this.triggerHeld)) {
      if (s.mag > 0 || fury) {
        const rate = st.rpm * (this.perks.has('rafale') ? 1.35 : 1);
        this.fireCD = 60 / rate;
        if (!fury) s.mag--;
        game.fireWeapon(st, this);
        this.recoil = Math.min(1, this.recoil + 0.35);
        this.pitch += st.recoil * G.lerp(1, 0.55, this.ads);
        this.yaw += (Math.random() - 0.5) * st.recoil * 0.5;
        this.flashT = 0.05; this.boltT = 1; if (st.pump || st.id === 'sniper') this.pumpT = 1;
        this.ejectShell();
        if (s.mag === 0 && s.reserve > 0) setTimeout(() => this.tryReload(), 150);
      } else if (!this.triggerHeld) { G.Audio.S.empty(); this.tryReload(); }
      this.triggerHeld = true;
    }
    if (!this.mouse.left) this.triggerHeld = false;
    this.flashT = (this.flashT || 0) - dt;
    this.flash.visible = this.flashT > 0;
    if (this.flash.visible) this.flash.rotation.z = Math.random() * Math.PI;
    this.recoil = Math.max(0, this.recoil - dt * 6);

    // position de l'arme en vue subjective
    const U = this.vmGun.userData;
    const hip = new THREE.Vector3(0.1, -0.1, -0.2), adsP = new THREE.Vector3(0, -(U.sightY || 0.07) * 0.6, -0.12);
    const p = hip.clone().lerp(adsP, this.ads);
    const bobAmt = Math.min(1, hsp / 5) * (1 - this.ads * 0.85);
    p.x += Math.cos(this.bob) * 0.012 * bobAmt; p.y += Math.abs(Math.sin(this.bob)) * 0.014 * bobAmt;
    p.z += this.recoil * 0.03;
    this.sway.multiplyScalar(Math.max(0, 1 - dt * 8));
    this.sway.x = G.clamp(this.sway.x, -0.04, 0.04); this.sway.y = G.clamp(this.sway.y, -0.04, 0.04);
    p.x -= this.sway.x * (1 - this.ads * 0.8); p.y += this.sway.y * (1 - this.ads * 0.8);
    if (this.sprinting) { p.x -= 0.05; p.y -= 0.04; }
    let reloadK = 0;
    if (this.reloadT > 0) { const t = 1 - this.reloadT / (st.reload * this.reloadMult()); reloadK = Math.sin(t * Math.PI); p.y -= reloadK * 0.04; p.x -= reloadK * 0.03;
      if (U.mag) { const mt = t < 0.15 ? 0 : t < 0.4 ? (t - 0.15) / 0.25 : t < 0.55 ? 1 : t < 0.8 ? 1 - (t - 0.55) / 0.25 : 0; U.mag.position.copy(U.magBase); U.mag.position.y -= mt * 0.25; U.mag.position.z += mt * 0.05; U.mag.visible = mt < 0.95; }
      if (U.cyl) U.cyl.position.x = U.cyl.userData.base === undefined ? (U.cyl.userData.base = U.cyl.position.x) : U.cyl.userData.base + reloadK * 0.045;
    } else if (U.mag) { U.mag.position.copy(U.magBase); U.mag.visible = true; }
    // culasse / pompe
    this.boltT = Math.max(0, this.boltT - dt * 14);
    if (U.bolt && U.boltBase) { U.bolt.position.copy(U.boltBase); if (st.id === 'sniper') U.bolt.rotation.z = Math.sin(Math.min(1, this.pumpT) * Math.PI) * 1.2; else U.bolt.position.z += this.boltT * 0.035; }
    if (this.pumpT > 0) { this.pumpT = Math.max(0, this.pumpT - dt * 2.2); }
    if (U.pump) { U.pump.position.copy(U.pumpBase); U.pump.position.z += Math.sin(Math.min(1, (1 - this.pumpT) * 1.3) * Math.PI) * (this.pumpT > 0 ? 0.08 : 0); }
    this.updateShells(dt);
    if (this.switchT > 0) p.y -= this.switchT * 0.4;
    this.vmRoot.position.copy(p);
    this.vmRoot.rotation.set(this.recoil * 0.1 + reloadK * 0.35 + this.sway.y * 2, (this.sprinting ? 0.6 : 0) - this.sway.x * 2, (this.sprinting ? 0.25 : 0) + reloadK * 0.5);
    const scoped = st.scope && this.ads > 0.85;
    this.vmRoot.visible = !scoped && this.meleeT <= 0;
    this.knife.visible = this.meleeT > 0;
    if (this.knife.visible) { const t = 1 - this.meleeT / 0.35; this.knife.position.set(0.25 - t * 0.35, -0.15, -0.35 - Math.sin(t * Math.PI) * 0.2); this.knife.rotation.set(0, 0.6 - t * 1.4, -0.4); }
    const scope = document.getElementById('scope');
    if (scope) scope.style.display = scoped ? 'block' : 'none';
  }
  ejectShell() {
    const U = this.vmGun.userData;
    if (!U.eject || this.slot.id === 'ray' || this.slot.id === 'magnum') return;
    if (!this._shellGeo) this._shellGeo = new THREE.BoxGeometry(0.012, 0.012, 0.03);
    const m = new THREE.Mesh(this._shellGeo, U.brass);
    const p = U.eject.clone(); this.vmGun.localToWorld(p);
    m.position.copy(p); this.vmScene.add(m);
    this.shells.push({ m, v: new THREE.Vector3(G.rand(1.2, 1.8), G.rand(1.0, 1.6), G.rand(-0.1, 0.3)), life: 0.5 });
    if (this.shells.length > 12) { const o = this.shells.shift(); this.vmScene.remove(o.m); }
  }
  updateShells(dt) {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i]; s.life -= dt; s.v.y -= 9 * dt;
      s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += dt * 20; s.m.rotation.y += dt * 13;
      if (s.life <= 0) { this.vmScene.remove(s.m); this.shells.splice(i, 1); }
    }
  }
  reloadMult() { return this.perks.has('mainleste') ? 0.5 : 1; }
  tryReload() {
    const s = this.slot, st = this.wstats;
    if (this.reloadT > 0 || s.mag >= st.mag || s.reserve <= 0 || this.game.power.fury > 0) return;
    this.reloadT = st.reload * this.reloadMult();
    G.Audio.S.reload();
  }
  switchTo(i) {
    if (i < 0 || i >= this.slots.length || i === this.cur) return;
    this.cur = i; this.reloadT = 0; this.switchT = 0.35; this.ads = 0;
    this.setViewWeapon();
  }
  cycle(d) { if (this.slots.length > 1) this.switchTo((this.cur + d + this.slots.length) % this.slots.length); }
  melee() {
    if (this.meleeCD > 0) return;
    this.meleeCD = 0.6; this.meleeT = 0.35; this.reloadT = 0;
    G.Audio.S.melee();
    this.game.meleeAttack(this);
  }
  throwGrenade() {
    if (this.grenades <= 0 || this.grenadeCD > 0) return;
    this.grenades--; this.grenadeCD = 0.8;
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    const vel = dir.multiplyScalar(17); vel.y += 3.5;
    this.game.spawnProjectile('grenade', this.eye.clone(), vel, 420, 'player');
  }
  lookDir() { return new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')); }
};

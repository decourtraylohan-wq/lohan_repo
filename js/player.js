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
    this.armor = 0; this.maxArmor = 150; this.plates = 1; this.plateT = 0;
    this.crouch = false; this.crouchHeld = false; this.slideT = 0; this.slideCD = 0; this.slideDir = new THREE.Vector3(); this.exhausted = false;
    this.h = 1.8; this.eyeCur = this.eyeH; this.roll = 0;
    this.builds = { barricade: 0, shield: 0 };
    this.isPlayer = true;
    this.crouchLock = false; this.vehicle = null; this.spectator = false; this.camOrbit = 0;
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
    const steel = new THREE.MeshPhongMaterial({ color: 0xb8bcc2, shininess: 120, specular: 0xffffff });
    const kb = (sx, sy, sz, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); kn.add(b); return b; };
    kb(0.008, 0.035, 0.17, steel, 0, 0.004, -0.15);
    const tip = kb(0.008, 0.024, 0.04, steel, 0, 0.0, -0.245); tip.rotation.x = 0.35;
    kb(0.01, 0.006, 0.15, new THREE.MeshPhongMaterial({ color: 0x55585e }), 0, 0.022, -0.14);
    kb(0.05, 0.014, 0.016, new THREE.MeshPhongMaterial({ color: 0x2a2a2a }), 0, 0, -0.06);
    kb(0.026, 0.032, 0.1, new THREE.MeshLambertMaterial({ color: 0x3a3226 }), 0, -0.002, 0.0);
    kb(0.055, 0.065, 0.08, new THREE.MeshLambertMaterial({ color: 0x2a2a2a }), 0, -0.01, 0.01);
    kb(0.07, 0.07, 0.3, new THREE.MeshLambertMaterial({ color: 0x5a6a48 }), 0.02, -0.05, 0.19);
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

  onMouseMove(dx, dy) { if (this.vehicle) { this._orbitDX = (this._orbitDX || 0) + dx; return; } this.lookDX += dx; this.lookDY += dy; this.sway.x += dx * 0.0004; this.sway.y += dy * 0.0004; }

  update(dt, cam) {
    const game = this.game, w = game.world, set = G.Ranked.profile.settings;
    // regard
    const sens = 0.0022 * set.sens * (1 - this.ads * (1 - this.wstats.zoom) * 0.6);
    this.yaw -= this.lookDX * sens; this.pitch -= this.lookDY * sens;
    this.lookDX = this.lookDY = 0;
    this.pitch = G.clamp(this.pitch, -1.55, 1.55);
    if (this.vehicle) { this.updateVehicleInput(); this.vmRoot.visible = false; this.knife.visible = false; return; }
    if (this.spectator) { this.updateSpectator(dt, cam); return; }

    // déplacement
    const k = this.keys;
    // touches physiques : ZQSD sur AZERTY = WASD sur QWERTY
    const fwd = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
    const str = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wish = new THREE.Vector3(-sin * fwd + cos * str, 0, -cos * fwd - sin * str);
    if (wish.lengthSq() > 1) wish.normalize();
    const feet = w.blockAt(this.pos.x, this.pos.y - 0.05, this.pos.z);
    const inBlock = w.blockAt(this.pos.x, this.pos.y + 0.2, this.pos.z);
    const st = this.wstats;
    const foulee = this.perks.has('foulee');
    // endurance : une fois épuisée, il faut récupérer avant de resprinter (évite le sprint saccadé)
    if (this.stamina <= 0.01) this.exhausted = true;
    if (this.exhausted && this.stamina > 0.45) this.exhausted = false;
    const shift = k.ShiftLeft || k.ShiftRight;
    let sprinting = shift && fwd > 0 && this.ads < 0.3 && this.reloadT <= 0 && this.plateT <= 0 && !this.crouch && (foulee || !this.exhausted);
    if (sprinting && !foulee && Math.hypot(this.vel.x, this.vel.z) > 1) this.stamina = Math.max(0, this.stamina - dt * 0.16);
    else if (!sprinting) this.stamina = Math.min(1, this.stamina + dt * 0.22);
    // accroupi / glissade
    const crouchKey = !!k.KeyC;
    this.slideCD -= dt;
    if (crouchKey && !this.crouchHeld && this.sprinting && this.onGround && this.slideCD <= 0) {
      this.slideT = 0.8; this.slideCD = 1.2;
      this.slideDir.set(this.vel.x, 0, this.vel.z).normalize();
      G.Audio.S.slide();
    }
    this.crouchHeld = crouchKey;
    const wantCrouch = crouchKey || this.slideT > 0 || this.crouchLock;
    if (wantCrouch) { this.crouch = true; this.h = 1.2; }
    else if (this.crouch && !w.collides(this.pos.x, this.pos.y, this.pos.z, this.w / 2, 1.8, 'player')) { this.crouch = false; this.h = 1.8; }
    let speed = (sprinting ? 7.0 : 4.6) * st.move * (foulee ? 1.2 : 1);
    if (this.crouch) speed = 2.4 * st.move;
    speed *= G.lerp(1, 0.55, this.ads);
    // nage : le corps est dans l'eau
    this.swimming = w.blockAt(this.pos.x, this.pos.y + 0.9, this.pos.z) === G.B.WATER;
    if (inBlock === G.B.WATER) speed *= 0.6;
    if (this.swimming) { speed = 3.0 * (foulee ? 1.2 : 1); this.slideT = 0; }
    if (this.slowT > 0) { this.slowT -= dt; speed *= 0.55; }
    this.sprinting = sprinting && wish.lengthSq() > 0;
    const accel = this.onGround ? (feet === G.B.ICE ? 2.5 : 14) : 3;
    if (this.slideT > 0) {
      this.slideT -= dt;
      const sp = G.lerp(4.0, 10.5, Math.max(0, this.slideT / 0.8));
      const dir = this.slideDir.clone().lerp(wish.lengthSq() > 0 ? wish.clone().normalize() : this.slideDir, 0.15).normalize();
      this.slideDir.copy(dir);
      this.vel.x = dir.x * sp; this.vel.z = dir.z * sp;
      if (this.blocked) this.slideT = 0;
    } else {
      this.vel.x = G.lerp(this.vel.x, wish.x * speed, Math.min(1, accel * dt));
      this.vel.z = G.lerp(this.vel.z, wish.z * speed, Math.min(1, accel * dt));
    }
    if (k.Space && this.onGround) { this.vel.y = this.crouch && this.slideT <= 0 ? 6.5 : 8.2; this.onGround = false; if (this.slideT > 0) this.slideT = 0; }
    this.blocked = false;
    if (this.swimming) {
      // flottaison : on coule doucement, Espace pour remonter, on peut se hisser hors de l'eau contre un bord
      this.vel.y -= 4 * dt; this.vel.y = G.clamp(this.vel.y, -2.2, 4);
      if (k.Space) this.vel.y = Math.min(this.vel.y + 14 * dt, 3.4);
      if (k.Space && this.blockedSide && w.blockAt(this.pos.x, this.pos.y + 1.7, this.pos.z) !== G.B.WATER) this.vel.y = 6.5;
    } else { this.vel.y -= 26 * dt; if (this.vel.y < -40) this.vel.y = -40; }
    const fallV = this.vel.y, wasAir = !this.onGround;
    w.moveEntity(this, dt, true);
    this.blockedSide = this.blocked;
    // dégâts de chute (pas dans l'eau)
    if (wasAir && this.onGround && fallV < -15 && !this.swimming && w.blockAt(this.pos.x, this.pos.y + 0.2, this.pos.z) !== G.B.WATER) {
      const dmg = Math.round((-fallV - 15) * 7);
      if (dmg > 0) { game.damagePlayer(dmg, 'fall'); G.Audio.S.land(); game.shake(Math.min(0.6, dmg / 60)); }
    }
    if (this.pos.y < -10) { this.pos.copy(game.map.playerSpawn); this.vel.set(0, 0, 0); }

    // lave
    if (inBlock === G.B.LAVA || feet === G.B.LAVA || inBlock === G.B.LAVA_FLOW || feet === G.B.LAVA_FLOW) {
      this.lavaT -= dt;
      if (this.lavaT <= 0) { this.lavaT = 0.25; game.damagePlayer(9, 'lava'); }
    }
    // régénération
    if (game.time - this.lastHit > game.mods.regenDelay && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + dt * 45);

    // caméra
    this.eyeCur = G.lerp(this.eyeCur, this.crouch ? 1.05 : this.eyeH, Math.min(1, dt * 12));
    const targetY = this.pos.y + this.eyeCur;
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
    this.roll = G.lerp(this.roll, this.slideT > 0 ? 0.08 : 0, Math.min(1, dt * 10));
    cam.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ');
    const fov = set.fov * G.lerp(1, st.zoom, this.ads) * (this.sprinting ? 1.05 : 1) * (this.slideT > 0 ? 1.08 : 1);
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
    if (this.plateT > 0) {
      this.plateT -= dt;
      if (this.plateT <= 0) { this.armor = Math.min(this.maxArmor, this.armor + 50); this.plates--; G.Audio.S.plate(); }
    }
    const fury = game.power.fury > 0;
    if (game.buildItem) { if (this.mouse.left && !this.triggerHeld) { game.placeBuild(); this.triggerHeld = true; } if (!this.mouse.left) this.triggerHeld = false; }
    else if (this.mouse.left && this.plateT <= 0 && this.fireCD <= 0 && this.reloadT <= 0 && this.switchT <= 0 && this.meleeT <= 0 && (st.auto || !this.triggerHeld)) {
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
    if (this.sprinting) { p.x += 0.02; p.y -= 0.05; p.z += 0.03; }
    if (this.plateT > 0 || game.buildItem) p.y -= 0.18;
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
    this.sprintK = G.lerp(this.sprintK || 0, this.sprinting ? 1 : 0, Math.min(1, dt * 10));
    this.vmRoot.rotation.set(this.recoil * 0.1 + reloadK * 0.35 + this.sway.y * 2 - this.sprintK * 0.45, this.sprintK * 0.35 - this.sway.x * 2, this.sprintK * 0.2 + reloadK * 0.5);
    const scoped = st.scope && this.ads > 0.85;
    this.vmRoot.visible = !scoped && this.meleeT <= 0;
    this.knife.visible = this.meleeT > 0;
    if (this.knife.visible) {
      const t = 1 - this.meleeT / 0.4, e = Math.sin(t * Math.PI);
      this.knife.position.set(0.18 - t * 0.3, -0.12 + e * 0.05, -0.22 - e * 0.12);
      this.knife.rotation.set(-0.2 + e * 0.3, 0.9 - t * 1.6, -0.9 + t * 0.6);
    }
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
  updateVehicleInput() {
    const k = this.keys;
    this.vehicle.input = { fwd: !!k.KeyW, back: !!k.KeyS, left: !!k.KeyA, right: !!k.KeyD, brake: !!k.Space };
  }
  // caméra à la troisième personne derrière le véhicule (la souris fait tourner la vue)
  vehicleCamera(cam, dt) {
    const v = this.vehicle;
    this.camOrbit = (this.camOrbit || 0);
    const set = G.Ranked.profile.settings;
    this.camOrbit -= (this._orbitDX || 0) * 0.003 * set.sens; this._orbitDX = 0;
    if (!this.keys.ShiftLeft) this.camOrbit *= Math.max(0, 1 - dt * 1.5);
    const a = v.yaw + Math.PI + this.camOrbit;
    const target = v.pos.clone().add(new THREE.Vector3(0, 1.3, 0));
    const want = target.clone().add(new THREE.Vector3(Math.sin(a) * 7.5, 2.6, Math.cos(a) * 7.5));
    if (!this._camPos) this._camPos = want.clone();
    this._camPos.lerp(want, Math.min(1, dt * 6));
    cam.position.copy(this._camPos);
    cam.lookAt(target);
    this.yaw = v.yaw + Math.PI; this.pitch = 0;
    this.pos.set(v.pos.x, v.pos.y + 0.5, v.pos.z); this.eye.set(v.pos.x, v.pos.y + 1.3, v.pos.z);
    this.vel.copy(v.forward.multiplyScalar(v.speed));
    if (Math.abs(cam.fov - G.Ranked.profile.settings.fov) > 0.01) { cam.fov = G.Ranked.profile.settings.fov; cam.updateProjectionMatrix(); }
  }
  // mode spectateur (triche) : vol libre à travers les murs
  updateSpectator(dt, cam) {
    const k = this.keys;
    const fwd = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0), str = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
    const dir = this.lookDir(), right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const v = dir.multiplyScalar(fwd).addScaledVector(right, str);
    if (k.Space) v.y += 1; if (k.KeyC) v.y -= 1;
    if (v.lengthSq() > 0) v.normalize();
    const sp = k.ShiftLeft || k.ShiftRight ? 28 : 11;
    this.vel.copy(v.multiplyScalar(sp));
    this.pos.addScaledVector(this.vel, dt);
    const w = this.game.world;
    this.pos.x = G.clamp(this.pos.x, 0.5, w.W - 0.5); this.pos.z = G.clamp(this.pos.z, 0.5, w.D - 0.5); this.pos.y = G.clamp(this.pos.y, 0, w.H + 30);
    this.eye.set(this.pos.x, this.pos.y + 1.6, this.pos.z); this.camY = this.eye.y;
    cam.position.copy(this.eye);
    cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.vmRoot.visible = false; this.knife.visible = false;
  }
  usePlate() {
    if (this.plates <= 0 || this.armor >= this.maxArmor || this.plateT > 0) { if (this.plates <= 0) G.Audio.S.deny(); return; }
    this.plateT = this.perks.has('mainleste') ? 0.6 : 1.1; this.reloadT = 0;
    G.Audio.S.reload();
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
    this.meleeCD = 0.55; this.meleeT = 0.4; this.reloadT = 0;
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

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
    this.lavaT = 0;
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
    this.vmScene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.0));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(1, 2, 1); this.vmScene.add(dl);
    this.vmRoot = new THREE.Group();
    this.vmRoot.scale.setScalar(0.6);
    this.vmScene.add(this.vmRoot);
    // bras
    const arm = new THREE.MeshLambertMaterial({ color: 0x5a6a48 });
    const hand = new THREE.MeshLambertMaterial({ color: 0xd8a880 });
    this.vmHands = new THREE.Group();
    const a1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.22), arm); a1.position.set(0.02, -0.14, 0.12); a1.rotation.x = 0.35; this.vmHands.add(a1);
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), hand); h1.position.set(0, -0.09, 0.0); this.vmHands.add(h1);
    const a2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.26), arm); a2.position.set(-0.1, -0.08, -0.1); a2.rotation.y = 0.6; this.vmHands.add(a2);
    this.vmRoot.add(this.vmHands);
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
    this.flash.position.copy(this.vmGun.userData.muzzle);
    this.vmGun.add(this.flash);
  }

  onMouseMove(dx, dy) { this.lookDX += dx; this.lookDY += dy; }

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
        this.flashT = 0.05;
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
    const hip = new THREE.Vector3(0.15, -0.14, -0.42), adsP = new THREE.Vector3(0, -0.041, -0.3);
    const p = hip.clone().lerp(adsP, this.ads);
    const bobAmt = Math.min(1, hsp / 5) * (1 - this.ads * 0.85);
    p.x += Math.cos(this.bob) * 0.012 * bobAmt; p.y += Math.abs(Math.sin(this.bob)) * 0.014 * bobAmt;
    p.z += this.recoil * 0.035;
    if (this.sprinting) { p.x -= 0.05; p.y -= 0.04; }
    if (this.reloadT > 0) { const t = this.reloadT / (st.reload * this.reloadMult()); p.y -= Math.sin((1 - t) * Math.PI) * 0.15; }
    if (this.switchT > 0) p.y -= this.switchT * 0.4;
    this.vmRoot.position.copy(p);
    this.vmRoot.rotation.set(this.recoil * 0.12 + (this.reloadT > 0 ? 0.25 : 0), this.sprinting ? 0.6 : 0, this.sprinting ? 0.25 : 0);
    const scoped = st.scope && this.ads > 0.85;
    this.vmRoot.visible = !scoped && this.meleeT <= 0;
    this.knife.visible = this.meleeT > 0;
    if (this.knife.visible) { const t = 1 - this.meleeT / 0.35; this.knife.position.set(0.25 - t * 0.35, -0.15, -0.35 - Math.sin(t * Math.PI) * 0.2); this.knife.rotation.set(0, 0.6 - t * 1.4, -0.4); }
    const scope = document.getElementById('scope');
    if (scope) scope.style.display = scoped ? 'block' : 'none';
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

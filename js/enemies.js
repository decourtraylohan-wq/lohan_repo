// Zombies, zombies spéciaux et boss
G.ZTYPES = {
  walker: { name: 'Zombie', hp: 1, speed: 1.5, dmg: 20, size: 1, skin: 0x6a9a4a, shirt: 0x3a6a8a, pants: 0x2a2a5a, eye: 0xff2020, pts: 60 },
  runner: { name: 'Coureur', hp: 0.6, speed: 3.7, dmg: 14, size: 0.95, skin: 0x8a9a7a, shirt: 0x8a2a2a, pants: 0x3a3a3a, eye: 0xffaa00, pts: 70 },
  brute: { name: 'Brute', hp: 3.2, speed: 1.3, dmg: 38, size: 1.35, skin: 0x4a6a3a, shirt: 0x5a3a20, pants: 0x2a2a2a, eye: 0xff4000, pts: 140 },
  bloater: { name: 'Gonflé', hp: 1.5, speed: 1.4, dmg: 45, size: 1.12, skin: 0xa8b060, shirt: 0x8a8a40, pants: 0x4a4a20, eye: 0xffff40, pts: 110, swollen: true },
  spitter: { name: 'Cracheur', hp: 0.9, speed: 2.2, dmg: 16, size: 1.0, skin: 0x7a5a9a, shirt: 0x2a4a2a, pants: 0x202020, eye: 0x80ff40, pts: 110, ranged: true },
  armored: { name: 'Blindé', hp: 1.5, speed: 1.6, dmg: 24, size: 1.05, skin: 0x5a7a4a, shirt: 0x50565c, pants: 0x30343a, eye: 0xff2020, pts: 120, armor: true },
  minion: { name: 'Squelette', hp: 0.5, speed: 3.2, dmg: 12, size: 0.9, skin: 0xd8d4c4, shirt: 0xb8b4a4, pants: 0x9a968a, eye: 0xa040ff, pts: 30 },
};

G.BOSSES = [
  { id: 'colosse', name: 'LE COLOSSE', hp: 4200, speed: 1.6, dmg: 50, size: 2.6, skin: 0x5a6a5a, shirt: 0x3a2a2a, pants: 0x2a2a2a, eye: 0xff1010, pts: 2000 },
  { id: 'necro', name: 'LE NÉCROMANCIEN', hp: 6500, speed: 2.4, dmg: 22, size: 1.5, skin: 0xd8d4c4, shirt: 0x3a1a5a, pants: 0x2a1040, eye: 0xb050ff, pts: 2500, floating: true },
  { id: 'belier', name: 'LE BÉLIER', hp: 9500, speed: 1.9, dmg: 60, size: 2.1, skin: 0x7a4a2a, shirt: 0x4a2a1a, pants: 0x2a1a10, eye: 0xffa000, pts: 3000, horns: true },
];

G.Enemy = class {
  constructor(game, type, pos, opts = {}) {
    this.game = game;
    this.isBoss = !!opts.boss;
    const T = this.isBoss ? opts.boss : G.ZTYPES[type];
    this.T = T; this.type = this.isBoss ? T.id : type;
    const mods = game.mods;
    this.size = T.size;
    this.elite = !this.isBoss && type !== 'minion' && Math.random() < mods.elite;
    const baseHp = this.isBoss ? T.hp * opts.hpScale : game.zombieBaseHp() * T.hp * mods.hp * (this.elite ? 1.5 : 1);
    this.maxHp = this.hp = Math.round(baseHp);
    let spd = T.speed * mods.speed * (this.isBoss ? 1 : 1 + Math.min(0.45, game.wave * 0.025));
    if (type === 'walker' && game.wave >= 6 && Math.random() < Math.min(0.5, (game.wave - 5) * 0.06)) spd = 2.9 * mods.speed;
    if (this.elite) spd *= 1.15;
    this.speed = spd;
    this.dmg = T.dmg * mods.dmg * (this.isBoss ? 1 + 0.15 * (opts.cycle || 0) : 1);
    this.helmet = T.armor ? Math.round(this.maxHp * 0.6) : 0;
    this.pos = pos.clone();
    this.vel = new THREE.Vector3();
    // boîte de collision limitée pour passer les portes (1 bloc de large, 2 de haut)
    this.w = Math.min(0.8, 0.6 * this.size); this.h = 1.9;
    this.lastAtk = -99;
    this.onGround = false;
    this.dead = false; this.deadT = 0;
    this.atkT = 0.5; this.flash = 0; this.anim = Math.random() * 10;
    this.stuckT = 0; this.lastPos = pos.clone();
    this.groanT = G.rand(2, 8);
    this.state = 'chase'; this.stateT = 0; this.abilityT = G.rand(3, 6); this.summonT = 10; this.tpT = 14;
    this.fuse = -1;
    this.buildModel();
    game.scene.add(this.mesh);
  }

  buildModel() {
    const T = this.T, s = this.size;
    const key = this.type + (this.elite ? 'e' : '');
    const skin = G.Tex.noiseTex('skin' + key, T.skin, 34);
    const shirt = G.Tex.noiseTex('shirt' + key, T.shirt, 30, (ctx, rnd, px) => { for (let i = 0; i < 6; i++) px(Math.floor(rnd() * 8), Math.floor(rnd() * 8), T.skin); });
    const pants = G.Tex.noiseTex('pants' + key, T.pants, 24);
    const face = G.Tex.faceTex('face' + key, T.skin, this.elite ? 0xffffff : T.eye, 0x301010);
    const mk = (tex) => new THREE.MeshLambertMaterial({ map: tex });
    this.mats = [mk(skin), mk(shirt), mk(pants), mk(face)];
    const [mSkin, mShirt, mPants, mFace] = this.mats;
    const g = new THREE.Group();
    const part = (sx, sy, sz, mat, px, py, pz, parent = g, offY = 0) => {
      const geo = new THREE.BoxGeometry(sx, sy, sz); if (offY) geo.translate(0, offY, 0);
      const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); parent.add(m); return m;
    };
    const bodyW = T.swollen ? 0.75 : 0.5, bodyD = T.swollen ? 0.55 : 0.3;
    this.legL = part(0.24, 0.75, 0.24, mPants, -0.13, 0.75, 0, g, -0.375);
    this.legR = part(0.24, 0.75, 0.24, mPants, 0.13, 0.75, 0, g, -0.375);
    if (T.floating) { this.legL.visible = false; this.legR.visible = false; part(0.6, 0.9, 0.4, mPants, 0, 0.55, 0); }
    this.body = part(bodyW, 0.75, bodyD, mShirt, 0, 1.125, 0);
    this.armL = part(0.22, 0.72, 0.22, mSkin, -(bodyW / 2 + 0.11), 1.45, 0, g, -0.33);
    this.armR = part(0.22, 0.72, 0.22, mSkin, bodyW / 2 + 0.11, 1.45, 0, g, -0.33);
    const headMats = [mSkin, mSkin, mSkin, mSkin, mFace, mSkin];
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMats);
    this.head.position.set(0, 1.75, 0); g.add(this.head);
    if (T.armor) {
      const mMetal = new THREE.MeshLambertMaterial({ color: 0x8a9096 }); this.mats.push(mMetal);
      this.helmetMesh = part(0.56, 0.22, 0.56, mMetal, 0, 0.2, 0, this.head);
      part(0.56, 0.5, 0.36, mMetal, 0, 1.18, 0);
    }
    if (T.horns) {
      const mHorn = new THREE.MeshLambertMaterial({ color: 0xe8dcc0 }); this.mats.push(mHorn);
      const h1 = part(0.12, 0.12, 0.4, mHorn, -0.3, 0.2, 0.1, this.head); h1.rotation.x = -0.6;
      const h2 = part(0.12, 0.12, 0.4, mHorn, 0.3, 0.2, 0.1, this.head); h2.rotation.x = -0.6;
    }
    if (T.floating) {
      const mGlow = new THREE.MeshBasicMaterial({ color: 0xb050ff });
      const orb = part(0.2, 0.2, 0.2, mGlow, 0, -0.55, 0.15, this.armR); this.orb = orb;
      part(0.6, 0.15, 0.6, mShirt, 0, 0.3, 0, this.head);
    }
    if (this.id === 'colosse' || this.type === 'colosse') {
      const mMetal = new THREE.MeshLambertMaterial({ color: 0x4a4a50 }); this.mats.push(mMetal);
      part(0.35, 0.2, 0.35, mMetal, -0.38, 1.55, 0); part(0.35, 0.2, 0.35, mMetal, 0.38, 1.55, 0);
    }
    if (this.elite) {
      const mGlow = new THREE.MeshBasicMaterial({ color: 0xff3030 });
      part(0.52, 0.06, 0.06, mGlow, 0, 0.05, 0.26, this.head);
    }
    this.armL.rotation.x = this.armR.rotation.x = -Math.PI / 2;
    g.scale.setScalar(s);
    this.mesh = g;
    this.mesh.position.copy(this.pos);
  }

  get headY() { return this.pos.y + 1.75 * this.size; }
  // hitbox : renvoie distance d'impact et 'head' / 'body'
  rayHit(o, d, maxD) {
    const s = this.size, p = this.pos;
    const hh = 0.28 * s;
    const tHead = rayAABB(o, d, p.x - hh, this.headY - hh, p.z - hh, p.x + hh, this.headY + hh, p.z + hh);
    const bw = (this.T.swollen ? 0.4 : 0.32) * s;
    const tBody = rayAABB(o, d, p.x - bw, p.y, p.z - bw, p.x + bw, p.y + 1.5 * s, p.z + bw);
    let best = null;
    if (tHead !== null && tHead <= maxD) best = { t: tHead, part: 'head' };
    if (tBody !== null && tBody <= maxD && (!best || tBody < best.t - 0.05)) best = { t: tBody, part: 'body' };
    return best;
  }

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
    if (this.hp <= 0) { this.die(src, part); }
    return dmg;
  }
  headPos() { return new THREE.Vector3(this.pos.x, this.headY, this.pos.z); }

  die(src, part) {
    if (this.dead) return;
    this.dead = true; this.deadT = 0;
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
    let moveDir = new THREE.Vector3();
    let speed = this.speed;

    // groans
    this.groanT -= dt;
    if (this.groanT < 0) { this.groanT = G.rand(4, 10); if (dist < 20) G.Audio.S.groan(); }

    if (this.isBoss) speed = this.bossLogic(dt, dist, dy, toP, moveDir);
    else if (this.T.ranged) speed = this.spitterLogic(dt, dist, toP, moveDir);

    if (moveDir.lengthSq() === 0 && this.state !== 'stunned' && this.state !== 'slam' && this.state !== 'windup' && this.state !== 'charge' && this.state !== 'cast') {
      // navigation par champ de flux
      const cx = Math.floor(this.pos.x), cz = Math.floor(this.pos.z);
      const direct = dist < 2.5 || (dist < 7 && Math.abs(dy) < 1.2 && w.lineOfSight(new THREE.Vector3(this.pos.x, this.pos.y + 1.5, this.pos.z), pl.eye));
      if (direct || this.T.floating) moveDir.copy(toP).normalize();
      else {
        const nxt = w.nextStep(cx, cz);
        if (nxt) moveDir.set(nxt[0] + 0.5 - this.pos.x, 0, nxt[1] + 0.5 - this.pos.z).normalize();
        else moveDir.copy(toP).normalize();
      }
    }

    // attaque au corps à corps
    const reach = 1.25 + 0.35 * Math.min(this.size, 2.6);
    this.atkT -= dt;
    let attacking = false;
    if (!this.T.ranged && dist < reach && Math.abs(dy) < 1.6 + this.size * 0.3 && this.state !== 'stunned') {
      attacking = true;
      if (this.type === 'bloater') {
        if (this.fuse < 0) this.fuse = 0.7;
      } else if (this.atkT <= 0) {
        this.atkT = this.isBoss ? 1.3 : 1.0; this.lastAtk = game.time;
        game.damagePlayer(this.dmg, this);
      }
      if (dist < 0.9) speed = 0;
    }
    if (this.fuse >= 0) {
      this.fuse -= dt; speed *= 0.3;
      this.mesh.scale.setScalar(this.size * (1 + (0.7 - this.fuse) * 0.25));
      for (const m of this.mats) if (m.emissive) m.emissive.setHex(Math.floor(this.fuse * 12) % 2 ? 0x606000 : 0);
      if (this.fuse <= 0) { this.hp = 0; this.dead = true; this.deadT = 2; this.explode(); game.onEnemyKilled(this, 'self', 'body', true); return false; }
    }

    // séparation entre zombies
    for (const o of game.enemies) {
      if (o === this || o.dead) continue;
      const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z;
      const d2 = ox * ox + oz * oz, r = (this.w + o.w) * 0.55;
      if (d2 < r * r && d2 > 1e-4) { const d = Math.sqrt(d2); moveDir.x += (ox / d) * 0.8 * (1 - d / r); moveDir.z += (oz / d) * 0.8 * (1 - d / r); }
    }
    if (moveDir.lengthSq() > 1) moveDir.normalize();

    if (this.state !== 'charge') { this.vel.x = moveDir.x * speed; this.vel.z = moveDir.z * speed; }
    if (this.T.floating) {
      const targetY = Math.max(w.standAt(Math.floor(this.pos.x), Math.floor(this.pos.z)), pl.pos.y) + 1.2 + Math.sin(this.anim * 2) * 0.3;
      this.vel.y = (Math.min(w.H, targetY) - this.pos.y) * 2;
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt; this.pos.y += this.vel.y * dt;
      this.pos.x = G.clamp(this.pos.x, 1, w.W - 1); this.pos.z = G.clamp(this.pos.z, 1, w.D - 1);
    } else {
      this.vel.y -= 26 * dt;
      if (this.vel.y < -30) this.vel.y = -30;
      this.blocked = false;
      w.moveEntity(this, dt, true);
      if (this.blocked && this.onGround && this.state !== 'charge') this.vel.y = 7.5;
    }

    // lave
    const fb = w.blockAt(this.pos.x, this.pos.y + 0.1, this.pos.z);
    if (fb === G.B.LAVA && !this.isBoss) { this.damage(this.maxHp * dt * 0.5, 'body', 'lava'); }
    if (this.pos.y < -5) { this.respawnFar(); }

    // détection de blocage : on renvoie le zombie à un point d'apparition
    this.stuckT += dt;
    if (this.stuckT > 5) {
      if (this.pos.distanceTo(this.lastPos) < 1.2 && game.time - this.lastAtk > 5 && this.state === 'chase' && !this.T.ranged) this.respawnFar();
      this.stuckT = 0; this.lastPos.copy(this.pos);
    }

    // orientation + animation
    const face = this.state === 'charge' ? this.chargeDir : (dist < 6 || moveDir.lengthSq() < 0.01 ? toP : moveDir);
    if (face && face.lengthSq() > 0.001) {
      const target = Math.atan2(face.x, face.z);
      let diff = target - this.mesh.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.mesh.rotation.y += diff * Math.min(1, dt * 8);
    }
    const sp = Math.hypot(this.vel.x, this.vel.z);
    const swing = Math.sin(this.anim * (3 + sp * 2.2)) * Math.min(0.8, sp * 0.3);
    this.legL.rotation.x = swing; this.legR.rotation.x = -swing;
    const armBase = -Math.PI / 2 + (this.state === 'slam' || this.state === 'cast' ? -0.9 : 0);
    const atkSwing = attacking ? Math.sin(this.anim * 12) * 0.5 : 0;
    this.armL.rotation.x = armBase + swing * 0.3 + atkSwing;
    this.armR.rotation.x = armBase - swing * 0.3 - atkSwing;
    this.mesh.position.copy(this.pos);
    if (this.state === 'windup') this.mesh.position.x += Math.sin(this.anim * 60) * 0.05;
    return true;
  }

  respawnFar() {
    const sp = this.isBoss ? this.game.pickSpawn(8, 20) : this.game.pickSpawn();
    if (sp) { this.pos.copy(sp); this.vel.set(0, 0, 0); this.lastPos.copy(sp); }
  }

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
        G.Audio.S.spit();
      }
      return this.speed * 0.8;
    }
    return this.speed;
  }

  bossLogic(dt, dist, dy, toP, moveDir) {
    const game = this.game, pl = game.player;
    this.stateT -= dt; this.abilityT -= dt;
    const id = this.T.id;
    if (id === 'colosse') {
      if (this.state === 'slam') {
        if (this.stateT <= 0) {
          this.state = 'chase'; this.abilityT = G.rand(5, 7);
          game.shockwave(this.pos.clone(), 7, this.dmg * 0.9);
        }
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
          p.x = G.clamp(p.x, 2, 62); p.z = G.clamp(p.z, 2, 62);
          p.y = game.world.standAt(Math.floor(p.x), Math.floor(p.z)); if (p.y >= 999) continue;
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
      // garde ses distances
      if (dist < 9) { moveDir.copy(toP).normalize().multiplyScalar(-1); }
      else if (dist < 16) { moveDir.set(-toP.z, 0, toP.x).normalize().multiplyScalar(0.6); }
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
    this.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    for (const m of this.mats) m.dispose();
  }
};

function rayAABB(o, d, x0, y0, z0, x1, y1, z1) {
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
}
G.rayAABB = rayAABB;

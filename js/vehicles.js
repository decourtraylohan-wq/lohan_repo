// Véhicules : voitures modélisées, conduisibles, avec durabilité et explosion
G.Vehicle = class {
  constructor(game, spot) {
    this.game = game;
    this.pos = new THREE.Vector3(spot.x, spot.y, spot.z);
    this.yaw = spot.yaw + (Math.random() < 0.5 ? Math.PI : 0);
    this.speed = 0; this.steer = 0; this.wheelRot = 0;
    this.L = 4.2; this.W = 2.0; this.H = 1.55;
    this.maxHp = this.hp = 1800;
    this.dead = false; this.burnT = 0; this.smokeT = 0; this.hitCD = 0;
    this.color = G.pick([0x9a2a24, 0x2a4a8a, 0xd0d0cc, 0x2a2c30, 0x5a6a3a, 0xb08a30, 0x6a6e74]);
    this.build();
    this.solid = { type: 'car', car: this, min: new THREE.Vector3(), max: new THREE.Vector3(), opaque: true, blocksPlayer: true, hp: Infinity };
    this.updateSolid();
    game.world.solids.push(this.solid);
    this.reblock();
  }
  // les zombies contournent la voiture (cases de navigation bloquées)
  reblock() {
    const w = this.game.world;
    if (this.blockBox) w.navBlock(this.blockBox.min, this.blockBox.max, -1);
    this.blockBox = { min: this.solid.min.clone(), max: this.solid.max.clone() };
    w.navBlock(this.blockBox.min, this.blockBox.max, 1);
    this.blockPos = this.pos.clone();
  }
  build() {
    const g = new THREE.Group();
    const paint = new THREE.MeshPhongMaterial({ color: this.color, shininess: 70, specular: 0x555555 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x1c1c1e });
    const glass = new THREE.MeshPhongMaterial({ color: 0x3a4a58, shininess: 100, specular: 0x8899aa, transparent: true, opacity: 0.5, depthWrite: false });
    const chrome = new THREE.MeshPhongMaterial({ color: 0xb0b4b8, shininess: 100 });
    const lightF = new THREE.MeshBasicMaterial({ color: 0xfff2c0 }), lightR = new THREE.MeshBasicMaterial({ color: 0xb01010 });
    this.mats = [paint, dark, glass, chrome, lightF, lightR];
    const box = (sx, sy, sz, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; };
    const { L, W } = this;
    box(W, 0.55, L, paint, 0, 0.62, 0);                 // caisse
    box(W - 0.1, 0.18, L * 0.3, paint, 0, 0.98, L * 0.32); // capot
    box(W - 0.1, 0.16, L * 0.22, paint, 0, 0.97, -L * 0.37); // coffre
    box(W - 0.16, 0.5, L * 0.46, glass, 0, 1.15, -0.12);   // habitacle vitré
    box(W - 0.12, 0.08, L * 0.42, paint, 0, 1.43, -0.12);  // toit
    for (const sx of [-1, 1]) { box(0.08, 0.5, 0.1, paint, sx * (W / 2 - 0.1), 1.15, L * 0.1); box(0.08, 0.5, 0.1, paint, sx * (W / 2 - 0.1), 1.15, -L * 0.34); }
    box(W + 0.04, 0.2, 0.16, dark, 0, 0.45, L / 2); box(W + 0.04, 0.2, 0.16, dark, 0, 0.45, -L / 2);
    box(W * 0.5, 0.14, 0.04, chrome, 0, 0.7, L / 2 + 0.01);
    for (const sx of [-1, 1]) { box(0.36, 0.14, 0.04, lightF, sx * 0.68, 0.76, L / 2 + 0.02); box(0.32, 0.14, 0.04, lightR, sx * 0.7, 0.8, -L / 2 - 0.02); box(0.14, 0.1, 0.18, dark, sx * (W / 2 + 0.06), 1.0, L * 0.18); }
    // conducteur : notre personnage, visible quand on prend le volant (veste kaki, gants, casquette)
    const drv = new THREE.Group(), DX = -0.45;
    const jacket = new THREE.MeshLambertMaterial({ color: 0x5a6a48 }), skin = new THREE.MeshLambertMaterial({ color: 0xd8a880 });
    const glove = new THREE.MeshLambertMaterial({ color: 0x2a2a2a }), cap = new THREE.MeshLambertMaterial({ color: 0x3a4030 }), shades = new THREE.MeshLambertMaterial({ color: 0x101214 });
    this.mats.push(jacket, skin, glove, cap, shades);
    const part = (sx, sy, sz, m, x, y, z, rx = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); b.rotation.x = rx; drv.add(b); return b; };
    part(0.42, 0.4, 0.26, jacket, DX, 0.98, -0.28);                 // buste
    part(0.4, 0.14, 0.42, cap, DX, 0.82, -0.1);                     // jambes (assis)
    part(0.26, 0.26, 0.26, skin, DX, 1.3, -0.3);                    // tête
    part(0.28, 0.07, 0.3, cap, DX, 1.45, -0.28); part(0.28, 0.03, 0.1, cap, DX, 1.43, -0.11); // casquette + visière
    part(0.2, 0.05, 0.02, shades, DX, 1.33, -0.165);                // lunettes
    for (const sx of [-1, 1]) { part(0.1, 0.1, 0.34, jacket, DX + sx * 0.25, 1.06, -0.12, -0.35); part(0.08, 0.08, 0.08, glove, DX + sx * 0.16, 1.04, 0.07); }
    const sw = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 14), glove); sw.position.set(DX, 1.04, 0.12); sw.rotation.x = -0.5; drv.add(sw);
    drv.visible = false; g.add(drv); this.driver = drv; this.steeringWheel = sw;
    this.wheels = [];
    const wGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 10); wGeo.rotateZ(Math.PI / 2);
    const rGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.28, 8); rGeo.rotateZ(Math.PI / 2);
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const piv = new THREE.Group(); piv.position.set(sx * (W / 2 - 0.08), 0.36, sz * L * 0.32);
      const t = new THREE.Mesh(wGeo, dark); const r = new THREE.Mesh(rGeo, chrome);
      piv.add(t); piv.add(r); g.add(piv); this.wheels.push({ piv, front: sz > 0, t, r });
    }
    this.mesh = g;
    this.game.scene.add(g);
    this.syncMesh();
  }
  get forward() { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  get right() { return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); }
  syncMesh() { this.mesh.position.copy(this.pos); this.mesh.rotation.y = this.yaw; }
  footprint(p = this.pos, yaw = this.yaw, dense) {
    const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), r = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const pts = [];
    if (!dense) { for (const a of [-0.48, 0, 0.48]) for (const b of [-0.46, 0.46]) pts.push(p.clone().addScaledVector(f, a * this.L).addScaledVector(r, b * this.W)); return pts; }
    // contour échantillonné tous les ~0,4 m : plus rien ne passe entre deux points
    for (let a = -0.5; a <= 0.501; a += 0.1) for (const b of [-0.48, 0.48]) pts.push(p.clone().addScaledVector(f, a * this.L).addScaledVector(r, b * this.W));
    for (const b of [-0.24, 0, 0.24]) for (const a of [-0.5, 0.5]) pts.push(p.clone().addScaledVector(f, a * this.L).addScaledVector(r, b * this.W));
    return pts;
  }
  updateSolid() {
    const pts = this.footprint();
    const s = this.solid; if (!s) return;
    s.min.set(Infinity, this.pos.y, Infinity); s.max.set(-Infinity, this.pos.y + this.H, -Infinity);
    for (const p of pts) { s.min.x = Math.min(s.min.x, p.x); s.min.z = Math.min(s.min.z, p.z); s.max.x = Math.max(s.max.x, p.x); s.max.z = Math.max(s.max.z, p.z); }
    // boîte un peu resserrée (la boîte englobante d'une voiture tournée est trop large)
    const cx = (s.min.x + s.max.x) / 2, cz = (s.min.z + s.max.z) / 2, k = 0.85;
    s.min.x = cx + (s.min.x - cx) * k; s.max.x = cx + (s.max.x - cx) * k; s.min.z = cz + (s.min.z - cz) * k; s.max.z = cz + (s.max.z - cz) * k;
  }
  blockedAt(p, yaw) {
    const w = this.game.world;
    const pts = this.footprint(p, yaw, true);
    const game = this.game, bordered = game.borderR !== undefined && game.borderR < game.borderFull - 0.5;
    if (bordered) {
      // limite de zone : mur invisible pour les voitures aussi (on peut toujours revenir vers l'intérieur)
      const c = game.borderC, R = game.borderR - 0.3, out = (q) => Math.max(Math.abs(q.x - c.x), Math.abs(q.z - c.y)) - R;
      const old = this.footprint(this.pos, this.yaw, true);
      for (let i = 0; i < pts.length; i++) { const o = out(pts[i]); if (o > 0 && o > out(old[i]) + 1e-3) return true; }
    }
    for (const q of pts) {
      const x = Math.floor(q.x), z = Math.floor(q.z);
      if (w.isSolid(x, Math.floor(p.y + 0.5), z) || w.isSolid(x, Math.floor(p.y + 1.2), z)) return true;
    }
    for (const o of w.solids) {
      if (o === this.solid) continue;
      if (o.max.x < p.x - 4 || o.min.x > p.x + 4 || o.max.z < p.z - 4 || o.min.z > p.z + 4) continue;
      for (const q of pts) if (q.x > o.min.x && q.x < o.max.x && q.z > o.min.z && q.z < o.max.z && p.y + 0.5 < o.max.y && p.y + 1.2 > o.min.y) return true;
    }
    return false;
  }
  update(dt, input) {
    const game = this.game;
    this.hitCD -= dt;
    if (this.dead) {
      this.burnT -= dt;
      if (this.burnT > 0 && Math.random() < dt * 20) game.particles(this.pos.clone().add(new THREE.Vector3(G.rand(-1, 1), 1.4, G.rand(-1.5, 1.5))), Math.random() < 0.5 ? 0xff7020 : 0x2a2a2a, 1, 2, 0.25);
      return;
    }
    // fumée / feu quand le véhicule est abîmé
    const k = this.hp / this.maxHp;
    if (k < 0.4 && Math.random() < dt * (k < 0.2 ? 18 : 6)) game.particles(this.pos.clone().add(this.forward.multiplyScalar(this.L * 0.35)).add(new THREE.Vector3(0, 1.2, 0)), k < 0.2 ? 0xff6a20 : 0x444444, 1, 1.5, 0.22);
    if (this.remote) { this.remoteUpdate(dt); return; }
    if (k < 0.2) { this.burnHurt = (this.burnHurt || 0) + dt; if (this.burnHurt > 0.5) { this.burnHurt = 0; this.damage(25); } }
    if (input) {
      const thr = (input.fwd ? 1 : 0) - (input.back ? 1 : 0);
      if (thr > 0) this.speed += (this.speed < 0 ? 22 : 9) * dt;
      else if (thr < 0) this.speed -= (this.speed > 0 ? 22 : 6) * dt;
      else this.speed *= Math.max(0, 1 - 1.2 * dt);
      if (input.brake) this.speed *= Math.max(0, 1 - 4 * dt);
      this.speed = G.clamp(this.speed, -7, 19);
      this.steer = G.lerp(this.steer, (input.left ? 1 : 0) - (input.right ? 1 : 0), Math.min(1, dt * 6));
    } else { this.speed *= Math.max(0, 1 - 3 * dt); this.steer *= 0.9; }
    if (Math.abs(this.speed) < 0.03) this.speed = 0;
    const sub = Math.max(1, Math.ceil(Math.abs(this.speed) * dt / 0.3));
    for (let si = 0; si < sub && this.speed !== 0; si++) this.step(dt / sub);
    this.wheelRot += this.speed * dt / 0.36;
    if (this.driver) { this.driver.visible = game.player.vehicle === this; this.steeringWheel.rotation.z = this.steer * 1.4; }
    for (const wh of this.wheels) { wh.t.rotation.x = this.wheelRot; wh.r.rotation.x = this.wheelRot; wh.piv.rotation.y = wh.front ? this.steer * 0.45 : 0; }
    this.syncMesh();
    this.updateSolid();
    if (this.pos.distanceTo(this.blockPos) > 0.8 || (this.speed === 0 && this.pos.distanceTo(this.blockPos) > 0.05)) this.reblock();
  }
  // voiture conduite par un équipier : on suit la position reçue (lissée)
  remoteUpdate(dt) {
    const n = this.net; if (!n) return;
    const before = this.pos.clone(), k = Math.min(1, dt * 12);
    this.pos.lerp(n.pos, k);
    let dy = n.yaw - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * k;
    if (this.pos.distanceTo(n.pos) > 8) { this.pos.copy(n.pos); this.yaw = n.yaw; }
    const mv = this.pos.clone().sub(before), sp = mv.length() / Math.max(dt, 0.008) * (mv.dot(this.forward) >= 0 ? 1 : -1);
    this.speed = G.lerp(this.speed, sp, Math.min(1, dt * 8));
    this.steer = G.lerp(this.steer, G.clamp(dy * 3, -1, 1), Math.min(1, dt * 6));
    this.wheelRot += this.speed * dt / 0.36;
    if (this.driver) { this.driver.visible = true; this.steeringWheel.rotation.z = this.steer * 1.4; }
    for (const wh of this.wheels) { wh.t.rotation.x = this.wheelRot; wh.r.rotation.x = this.wheelRot; wh.piv.rotation.y = wh.front ? this.steer * 0.45 : 0; }
    this.syncMesh(); this.updateSolid();
    if (this.pos.distanceTo(this.blockPos) > 0.8) this.reblock();
    // l'hôte applique les ennemis renversés par l'équipier (les points lui reviennent)
    if (this.game.coop && this.game.coop.isHost && !this.game.vs && Math.abs(this.speed) > 3) this.runOver(this.remote);
  }
  step(dt) {
    const game = this.game;
    {
      const nyaw = this.yaw + this.steer * this.speed * 0.16 * dt;
      const np = this.pos.clone().addScaledVector(new THREE.Vector3(Math.sin(nyaw), 0, Math.cos(nyaw)), this.speed * dt);
      // suit le sol (marches d'un bloc au plus)
      const w = game.world;
      const gy = w.standBelow(Math.floor(np.x), this.pos.y + 1.1, Math.floor(np.z));
      if (gy < 999 && gy <= this.pos.y + 1.05) np.y = gy > this.pos.y ? gy : Math.max(gy, this.pos.y - 9 * dt * 3);
      if (this.blockedAt(np, nyaw) || gy >= 999 || gy > this.pos.y + 1.05) {
        const impact = Math.abs(this.speed);
        if (impact > 6 && this.hitCD <= 0) { this.hitCD = 0.5; this.damage(impact * 22); game.shake(Math.min(0.6, impact / 25)); G.Audio.S.slam(); }
        this.speed = -this.speed * 0.25;
      } else { this.pos.copy(np); this.yaw = nyaw; }
      // renverse les ennemis
      if (Math.abs(this.speed) > 3) this.runOver(null);
    }
  }
  runOver(peer) {
    const game = this.game, f = this.forward, r = this.right;
    for (const e of game.enemies) {
      if (e.dead || e.carHitCD > game.time || (peer && e.avatar)) continue;
      const d = e.pos.clone().sub(this.pos);
      if (Math.abs(d.y) > 2) continue;
      if (Math.abs(d.dot(f)) < this.L / 2 + 0.4 && Math.abs(d.dot(r)) < this.W / 2 + 0.4) {
        e.carHitCD = game.time + 0.6;
        const dmg = Math.abs(this.speed) * (e.isBoss ? 25 : 60);
        if (peer) { e.lastBy = peer; game.damageEnemyNet(e, dmg, 'body', 'car'); } else game.damageEnemy(e, dmg, 'body', 'car');
        if (!e.puppet) {
          e.vel.addScaledVector(f, this.speed * 0.8); e.vel.y = 6;
          const side = Math.sign(d.dot(r)) || 1; e.pos.addScaledVector(r, side * (this.W / 2 + 0.6 - Math.abs(d.dot(r))));
        }
        if (!peer) this.damage(e.isBoss ? 120 : 15);
        game.particles(e.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x7a1010, 8, 4);
        if (e.isBoss && !peer) this.speed *= 0.2;
      }
    }
  }
  damage(n) {
    if (this.dead) return;
    // voiture d'un équipier : l'hôte lui transmet les dégâts (c'est son jeu qui fait foi)
    if (this.remote) { const c = this.game.coop; if (c && this.game.vs) c.vsCarHit(this.remote, n); else if (c && c.isHost) c.queueDamage(this.remote, n / 1.2, null); return; }
    this.hp -= n;
    if (this.hp <= 0) this.explode();
  }
  explode() {
    if (this.dead) return;
    this.dead = true; this.burnT = 10; this.speed = 0;
    if (this.driver) this.driver.visible = false;
    const game = this.game;
    if (game.player.vehicle === this) game.exitVehicle(true);
    for (const m of this.mats) { if (m.color) m.color.setHex(0x1e1c1a); if (m.opacity !== undefined) m.opacity = 1; }
    this.mesh.rotation.z = G.rand(-0.08, 0.08);
    for (const wh of this.wheels) wh.piv.visible = false;
    this.mesh.position.y -= 0.25;
    this.solid.wreck = true; this.solid.max.y -= 0.25;
    const at = this.pos.clone().add(new THREE.Vector3(0, 1, 0));
    if (this.remote) { game.boom(at, 0xff8030); G.Audio.S.explosion(at); } // copie d'une voiture d'équipier : effet seulement
    else game.explode(at, 6, 450, 'car', 0xff8030);
    game.shake(1);
  }
  remove() {
    this.game.scene.remove(this.mesh);
    this.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    for (const m of this.mats) m.dispose();
  }
};

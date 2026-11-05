// Monde voxel : stockage, maillage (occlusion ambiante, plantes en croix), lancer de rayons, collisions, navigation 3D
G.B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, LOG: 5, PLANKS: 6, LEAVES: 7, SAND: 8, SANDSTONE: 9,
  SNOW: 10, ICE: 11, BRICK: 12, BASALT: 13, OBSIDIAN: 14, LAVA: 15, WATER: 16, GLOW: 17, CACTUS: 18, PINE: 19,
  METAL: 20, GRAVEL: 21, BEDROCK: 22, DARKBRICK: 23, CRATE: 24, HAY: 25, STONEBRICK: 26, MOSSY: 27, MAGMA: 28, REDSAND: 29,
  FLOWER_R: 30, FLOWER_Y: 31, TALLGRASS: 32, WHEAT: 33, DEADBUSH: 34, FARMLAND: 35, PATH: 36,
  ASPHALT: 37, ASPHALT_LINE: 38, SIDEWALK: 39, CONCRETE: 40, CONCRETE_DARK: 41, GLASS: 42, SEWER: 43, ROOF: 44, GRATE: 45,
  CAR_RED: 46, CAR_BLUE: 47, CAR_WHITE: 48, AWNING: 49, WHITEWALL: 50, TIRE: 51, BOOKSHELF: 52, SNOWGRASS: 53, CLAY: 54,
};

G.BLOCKS = (function () {
  const B = G.B;
  const d = [];
  const def = (id, top, side, bottom, opts = {}) => { d[id] = Object.assign({ top, side: side || top, bottom: bottom || top, solid: true, opaque: true, liquid: false, bright: false, bulletPass: false, plant: false }, opts); };
  const plant = { solid: false, opaque: false, bulletPass: true, plant: true };
  def(B.GRASS, 'grass_top', 'grass_side', 'dirt');
  def(B.DIRT, 'dirt');
  def(B.STONE, 'stone');
  def(B.COBBLE, 'cobble');
  def(B.LOG, 'log_top', 'log_side', 'log_top');
  def(B.PLANKS, 'planks');
  def(B.LEAVES, 'leaves', null, null, { opaque: false, bulletPass: true });
  def(B.SAND, 'sand');
  def(B.SANDSTONE, 'sandstone_top', 'sandstone_side', 'sandstone_top');
  def(B.SNOW, 'snow', 'snow_side', 'dirt');
  def(B.ICE, 'ice');
  def(B.BRICK, 'brick');
  def(B.BASALT, 'basalt');
  def(B.OBSIDIAN, 'obsidian');
  def(B.LAVA, 'lava', null, null, { solid: false, opaque: false, liquid: true, bright: true, bulletPass: true });
  def(B.WATER, 'water', null, null, { solid: false, opaque: false, liquid: true, bulletPass: true });
  def(B.GLOW, 'glowstone', null, null, { bright: true });
  def(B.CACTUS, 'cactus_top', 'cactus_side', 'cactus_top');
  def(B.PINE, 'pine', null, null, { opaque: false, bulletPass: true });
  def(B.METAL, 'metal');
  def(B.GRAVEL, 'gravel');
  def(B.BEDROCK, 'bedrock');
  def(B.DARKBRICK, 'darkbrick');
  def(B.CRATE, 'crate');
  def(B.HAY, 'hay_top', 'hay_side', 'hay_top');
  def(B.STONEBRICK, 'stonebrick');
  def(B.MOSSY, 'mossy');
  def(B.MAGMA, 'magma', null, null, { bright: true });
  def(B.REDSAND, 'redsand');
  def(B.FLOWER_R, 'flower_red', null, null, plant);
  def(B.FLOWER_Y, 'flower_yellow', null, null, plant);
  def(B.TALLGRASS, 'tallgrass', null, null, plant);
  def(B.WHEAT, 'wheat', null, null, plant);
  def(B.DEADBUSH, 'deadbush', null, null, plant);
  def(B.FARMLAND, 'farmland', 'dirt', 'dirt');
  def(B.PATH, 'dirtpath', 'dirt', 'dirt');
  def(B.ASPHALT, 'asphalt');
  def(B.ASPHALT_LINE, 'asphalt_line', 'asphalt', 'asphalt');
  def(B.SIDEWALK, 'sidewalk', 'concrete', 'concrete');
  def(B.CONCRETE, 'concrete');
  def(B.CONCRETE_DARK, 'concrete_dark');
  def(B.GLASS, 'glass', null, null, { opaque: false, bulletPass: true });
  def(B.SEWER, 'sewer');
  def(B.ROOF, 'roof');
  def(B.GRATE, 'grate', null, null, { opaque: false });
  def(B.CAR_RED, 'car_red');
  def(B.CAR_BLUE, 'car_blue');
  def(B.CAR_WHITE, 'car_white');
  def(B.AWNING, 'awning');
  def(B.WHITEWALL, 'whitewall');
  def(B.TIRE, 'tire');
  def(B.BOOKSHELF, 'planks', 'bookshelf', 'planks');
  def(B.SNOWGRASS, 'snowgrass', 'snow_side', 'dirt');
  def(B.CLAY, 'clay');
  return d;
})();

G.World = class {
  constructor(W, H, D) {
    this.W = W; this.H = H; this.D = D;
    this.data = new Uint8Array(W * H * D);
    this.stand = new Int16Array(W * D);
    this.meshes = [];
  }
  idx(x, y, z) { return (y * this.D + z) * this.W + x; }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.W && y < this.H && z < this.D; }
  get(x, y, z) { return this.inside(x, y, z) ? this.data[this.idx(x, y, z)] : 0; }
  set(x, y, z, b) { if (this.inside(x, y, z)) this.data[this.idx(x, y, z)] = b; }
  fill(x0, y0, z0, x1, y1, z1, b) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++)
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, z, b);
  }
  top(x, z) {
    for (let y = this.H - 1; y >= 0; y--) { const b = this.get(x, y, z); if (b && G.BLOCKS[b].solid) return y; }
    return -1;
  }
  isSolid(x, y, z) {
    if (y < 0) return true;
    if (x < 0 || z < 0 || x >= this.W || z >= this.D) return true; // murs invisibles
    if (y >= this.H) return false;
    const b = this.data[this.idx(x, y, z)];
    return b !== 0 && G.BLOCKS[b].solid;
  }
  blockAt(x, y, z) { return this.get(Math.floor(x), Math.floor(y), Math.floor(z)); }
  canStand(x, y, z) { return y >= 1 && this.isSolid(x, y - 1, z) && !this.isSolid(x, y, z) && !this.isSolid(x, y + 1, z); }

  // ---------- Maillage ----------
  buildMesh(scene, shadows) {
    const FACES = [
      { n: [1, 0, 0], t: 'side', v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
      { n: [-1, 0, 0], t: 'side', v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
      { n: [0, 1, 0], t: 'top', v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
      { n: [0, -1, 0], t: 'bottom', v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
      { n: [0, 0, 1], t: 'side', v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
      { n: [0, 0, -1], t: 'side', v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
    ];
    const AO = [0.4, 0.6, 0.8, 1.0];
    const groups = { opaque: this._newGroup(), bright: this._newGroup(), water: this._newGroup() };
    const occ = (x, y, z) => { const b = this.get(x, y, z); return b !== 0 && G.BLOCKS[b].opaque ? 1 : 0; };
    const uvCache = {};
    const getUV = (name) => uvCache[name] || (uvCache[name] = G.Tex.uv(name));
    const rnd = G.mulberry32(5);

    for (let y = 0; y < this.H; y++) for (let z = 0; z < this.D; z++) for (let x = 0; x < this.W; x++) {
      const b = this.data[this.idx(x, y, z)];
      if (!b) continue;
      const def = G.BLOCKS[b];
      if (def.plant) { this._plant(groups.opaque, x, y, z, getUV(def.top), rnd); continue; }
      const grp = def.liquid ? (def.bright ? groups.bright : groups.water) : (def.bright ? groups.bright : groups.opaque);
      for (let f = 0; f < 6; f++) {
        const F = FACES[f];
        const nx = x + F.n[0], ny = y + F.n[1], nz = z + F.n[2];
        const nb = this.get(nx, ny, nz);
        if (nb) {
          const nd = G.BLOCKS[nb];
          if (nd.opaque) continue;
          if (nb === b) continue;
          if (def.liquid && !nd.liquid && !nd.plant) continue;
        }
        if (F.n[1] === -1 && y === 0) continue;
        const [u0, v0, u1, v1] = getUV(def[F.t]);
        const uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
        const a = F.n[0] ? 0 : F.n[1] ? 1 : 2;
        const t1 = (a + 1) % 3, t2 = (a + 2) % 3;
        const aos = [];
        for (let i = 0; i < 4; i++) {
          const c = F.v[i];
          if (def.liquid || def.bright) { aos.push(3); continue; }
          const d1 = c[t1] * 2 - 1, d2 = c[t2] * 2 - 1;
          const p = [nx, ny, nz];
          const s1p = p.slice(); s1p[t1] += d1;
          const s2p = p.slice(); s2p[t2] += d2;
          const cp = p.slice(); cp[t1] += d1; cp[t2] += d2;
          const s1 = occ(s1p[0], s1p[1], s1p[2]), s2 = occ(s2p[0], s2p[1], s2p[2]), co = occ(cp[0], cp[1], cp[2]);
          aos.push(s1 && s2 ? 0 : 3 - (s1 + s2 + co));
        }
        const base = grp.pos.length / 3;
        const liquidTopDrop = def.liquid ? 0.12 : 0;
        for (let i = 0; i < 4; i++) {
          const c = F.v[i];
          let vy = y + c[1];
          if (liquidTopDrop && c[1] === 1 && !(this.get(x, y + 1, z) && G.BLOCKS[this.get(x, y + 1, z)].liquid)) vy -= liquidTopDrop;
          grp.pos.push(x + c[0], vy, z + c[2]);
          grp.nor.push(F.n[0], F.n[1], F.n[2]);
          grp.uv.push(uvs[i][0], uvs[i][1]);
          const l = AO[aos[i]];
          grp.col.push(l, l, l);
        }
        if (aos[0] + aos[2] < aos[1] + aos[3]) grp.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
        else grp.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }

    const mk = (g, mat, cast) => {
      if (!g.idx.length) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nor, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(g.col, 3));
      geo.setIndex(g.idx);
      geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, mat);
      m.matrixAutoUpdate = false;
      if (shadows) { m.castShadow = cast; m.receiveShadow = true; }
      scene.add(m);
      this.meshes.push(m);
      return m;
    };
    mk(groups.opaque, new THREE.MeshLambertMaterial({ map: G.Tex.atlas, vertexColors: true, alphaTest: 0.5, side: THREE.FrontSide }), true);
    mk(groups.bright, new THREE.MeshBasicMaterial({ map: G.Tex.atlas, vertexColors: true }), false);
    const wm = mk(groups.water, new THREE.MeshLambertMaterial({ map: G.Tex.atlas, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false }), false);
    if (wm) wm.renderOrder = 2;
  }
  _plant(g, x, y, z, uvr, rnd) {
    const [u0, v0, u1, v1] = uvr;
    const ox = (rnd() - 0.5) * 0.3, oz = (rnd() - 0.5) * 0.3;
    const quads = [[[0.15, 0.15], [0.85, 0.85]], [[0.85, 0.15], [0.15, 0.85]]];
    for (const [[ax, az], [bx, bz]] of quads) {
      for (const flip of [false, true]) {
        const base = g.pos.length / 3;
        const p = [[ax, 0, az], [bx, 0, bz], [bx, 0.9, bz], [ax, 0.9, az]];
        if (flip) p.reverse();
        const uv = flip ? [[u0, v1], [u1, v1], [u1, v0], [u0, v0]] : [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
        for (let i = 0; i < 4; i++) {
          g.pos.push(x + p[i][0] + ox, y + p[i][1], z + p[i][2] + oz);
          g.nor.push(0, 1, 0);
          g.uv.push(uv[i][0], uv[i][1]);
          const l = p[i][1] > 0 ? 1 : 0.7; g.col.push(l, l, l);
        }
        g.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
  }
  _newGroup() { return { pos: [], nor: [], uv: [], col: [], idx: [] }; }
  dispose(scene) {
    for (const m of this.meshes) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    this.meshes = [];
  }

  // ---------- Lancer de rayon (DDA) ----------
  raycast(ox, oy, oz, dx, dy, dz, maxDist) {
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity, tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity, tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
    let tmx = dx !== 0 ? ((sx > 0 ? x + 1 - ox : ox - x) * tdx) : Infinity;
    let tmy = dy !== 0 ? ((sy > 0 ? y + 1 - oy : oy - y) * tdy) : Infinity;
    let tmz = dz !== 0 ? ((sz > 0 ? z + 1 - oz : oz - z) * tdz) : Infinity;
    let t = 0, nx = 0, ny = 0, nz = 0;
    while (t <= maxDist) {
      const b = this.get(x, y, z);
      if (b && !G.BLOCKS[b].bulletPass) return { dist: t, x, y, z, nx, ny, nz, block: b };
      if (y < 0 || y >= this.H + 4) break;
      if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; nx = -sx; ny = 0; nz = 0; }
      else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; nx = 0; ny = -sy; nz = 0; }
      else { z += sz; t = tmz; tmz += tdz; nx = 0; ny = 0; nz = -sz; }
    }
    return null;
  }
  lineOfSight(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const L = Math.hypot(dx, dy, dz);
    if (L < 0.01) return true;
    return !this.raycast(a.x, a.y, a.z, dx / L, dy / L, dz / L, L);
  }

  // ---------- Collisions AABB ----------
  collides(px, py, pz, hw, h) {
    const x0 = Math.floor(px - hw), x1 = Math.floor(px + hw - 1e-6);
    const y0 = Math.floor(py), y1 = Math.floor(py + h - 1e-6);
    const z0 = Math.floor(pz - hw), z1 = Math.floor(pz + hw - 1e-6);
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (this.isSolid(x, y, z)) return true;
    return false;
  }
  moveEntity(e, dt, stepUp = true) {
    const hw = e.w / 2, h = e.h;
    const p = e.pos;
    let ny = p.y + e.vel.y * dt;
    e.onGround = false;
    if (this.collides(p.x, ny, p.z, hw, h)) {
      if (e.vel.y < 0) { ny = Math.floor(ny) + 1; e.onGround = true; }
      else { ny = Math.ceil(ny + h) - h - 1; if (ny < p.y) ny = p.y; }
      e.vel.y = 0;
    }
    p.y = ny;
    for (const ax of ['x', 'z']) {
      const v = e.vel[ax] * dt;
      if (!v) continue;
      const nx = ax === 'x' ? p.x + v : p.x, nz = ax === 'z' ? p.z + v : p.z;
      if (!this.collides(nx, p.y, nz, hw, h)) { p[ax] += v; continue; }
      if (stepUp && e.onGround && !this.collides(nx, p.y + 1.01, nz, hw, h) && !this.collides(p.x, p.y + 1.01, p.z, hw, h)) {
        p.y = Math.floor(p.y) + 1.0; p[ax] += v; e.stepped = true; continue;
      }
      e.vel[ax] = 0; e.blocked = true;
    }
  }

  // ---------- Navigation 3D (graphe des cases où l'on peut se tenir) ----------
  standAt(x, z) {
    if (x < 0 || z < 0 || x >= this.W || z >= this.D) return 999;
    return this.stand[z * this.W + x];
  }
  // case debout la plus haute sous (ou au niveau de) y
  standBelow(x, y, z) {
    for (let yy = Math.min(this.H - 2, Math.floor(y + 0.6)); yy >= 1; yy--) if (this.canStand(x, yy, z)) return yy;
    return 999;
  }
  buildNav(blockedCells = []) {
    const { W, H, D } = this;
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      let s = 999;
      for (let y = 1; y < H - 1; y++) if (this.canStand(x, y, z)) { s = y; break; }
      this.stand[z * W + x] = s;
    }
    const blocked = new Set(blockedCells.map(([x, z]) => z * W + x));
    const nodeAt = new Int32Array(W * H * D).fill(-1);
    const nx = [], ny = [], nz = [];
    for (let y = 1; y < H - 1; y++) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      if (!this.canStand(x, y, z)) continue;
      if (blocked.has(z * W + x)) continue;
      const b = this.get(x, y, z), bb = this.get(x, y - 1, z);
      if (b === G.B.LAVA || bb === G.B.LAVA || bb === G.B.CACTUS) continue;
      nodeAt[this.idx(x, y, z)] = nx.length;
      nx.push(x); ny.push(y); nz.push(z);
    }
    const N = nx.length;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    const outStart = new Int32Array(N + 1), outList = [];
    const findDest = (x, y, z, tx, tz) => {
      // monte d'un bloc, reste au niveau ou descend jusqu'à 4 blocs
      if (tx < 0 || tz < 0 || tx >= W || tz >= D) return -1;
      if (!this.isSolid(x, y + 2, z)) { const id = nodeAt[this.idx(tx, y + 1, tz)] ; if (id >= 0 && y + 1 < H) return id; }
      for (let yy = y; yy >= Math.max(1, y - 4); yy--) {
        if (yy < y && (this.isSolid(tx, yy + 2, tz))) return -1;
        const id = nodeAt[this.idx(tx, yy, tz)];
        if (id >= 0) return id;
        if (this.isSolid(tx, yy, tz) || this.isSolid(tx, yy + 1, tz)) return -1;
      }
      return -1;
    };
    for (let i = 0; i < N; i++) {
      outStart[i] = outList.length;
      const x = nx[i], y = ny[i], z = nz[i];
      for (const [dx, dz] of dirs) {
        if (dx && dz) {
          // diagonale : les deux cases orthogonales doivent être libres
          if (this.isSolid(x + dx, y, z) || this.isSolid(x + dx, y + 1, z) || this.isSolid(x, y, z + dz) || this.isSolid(x, y + 1, z + dz)) continue;
        }
        const id = findDest(x, y, z, x + dx, z + dz);
        if (id >= 0) outList.push(id);
      }
    }
    outStart[N] = outList.length;
    // arêtes inverses pour le BFS depuis le joueur
    const inCount = new Int32Array(N + 1);
    for (const t of outList) inCount[t + 1]++;
    for (let i = 0; i < N; i++) inCount[i + 1] += inCount[i];
    const inList = new Int32Array(outList.length), fillPos = inCount.slice();
    for (let i = 0; i < N; i++) for (let k = outStart[i]; k < outStart[i + 1]; k++) inList[fillPos[outList[k]]++] = i;
    this.nav = { N, nodeAt, nx: Int16Array.from(nx), ny: Int16Array.from(ny), nz: Int16Array.from(nz), outStart, outList: Int32Array.from(outList), inStart: inCount, inList, dist: new Int32Array(N).fill(-1), queue: new Int32Array(N) };
  }
  // nœud le plus proche d'une position (on cherche sous les pieds)
  nodeNear(x, y, z) {
    const n = this.nav; if (!n) return -1;
    const fx = Math.floor(x), fz = Math.floor(z);
    if (fx < 0 || fz < 0 || fx >= this.W || fz >= this.D) return -1;
    const fy = Math.floor(y + 0.05);
    for (let yy = Math.min(this.H - 2, fy + 1); yy >= Math.max(1, fy - 8); yy--) {
      const id = n.nodeAt[this.idx(fx, yy, fz)];
      if (id >= 0) return id;
    }
    return -1;
  }
  computeFlow(x, y, z) {
    const n = this.nav; if (!n) return;
    n.dist.fill(-1);
    let start = this.nodeNear(x, y, z);
    if (start < 0) {
      // le joueur est sur une case non répertoriée : on cherche un voisin
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { start = this.nodeNear(x + dx, y, z + dz); if (start >= 0) break; }
      if (start < 0) return;
    }
    const q = n.queue; let qh = 0, qt = 0;
    n.dist[start] = 0; q[qt++] = start;
    while (qh < qt) {
      const c = q[qh++], cd = n.dist[c] + 1;
      for (let k = n.inStart[c]; k < n.inStart[c + 1]; k++) {
        const a = n.inList[k];
        if (n.dist[a] !== -1) continue;
        n.dist[a] = cd; q[qt++] = a;
      }
    }
  }
  flowDistAt(x, y, z) { const id = this.nodeNear(x, y, z); return id < 0 ? -1 : this.nav.dist[id]; }
  nextStep(x, y, z) {
    const n = this.nav; const id = this.nodeNear(x, y, z);
    if (id < 0) return null;
    let best = -1, bd = n.dist[id] < 0 ? 1e9 : n.dist[id];
    for (let k = n.outStart[id]; k < n.outStart[id + 1]; k++) {
      const t = n.outList[k], d = n.dist[t];
      if (d >= 0 && d < bd) { bd = d; best = t; }
    }
    if (best < 0) return null;
    return [n.nx[best], n.ny[best], n.nz[best]];
  }
};

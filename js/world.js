// Monde voxel : stockage, maillage (occlusion ambiante, plantes en croix), lancer de rayons, collisions, navigation 3D
G.B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, LOG: 5, PLANKS: 6, LEAVES: 7, SAND: 8, SANDSTONE: 9,
  SNOW: 10, ICE: 11, BRICK: 12, BASALT: 13, OBSIDIAN: 14, LAVA: 15, WATER: 16, GLOW: 17, CACTUS: 18, PINE: 19,
  METAL: 20, GRAVEL: 21, BEDROCK: 22, DARKBRICK: 23, CRATE: 24, HAY: 25, STONEBRICK: 26, MOSSY: 27, MAGMA: 28, REDSAND: 29,
  FLOWER_R: 30, FLOWER_Y: 31, TALLGRASS: 32, WHEAT: 33, DEADBUSH: 34, FARMLAND: 35, PATH: 36,
  ASPHALT: 37, ASPHALT_LINE: 38, SIDEWALK: 39, CONCRETE: 40, CONCRETE_DARK: 41, GLASS: 42, SEWER: 43, ROOF: 44, GRATE: 45,
  CAR_RED: 46, CAR_BLUE: 47, CAR_WHITE: 48, AWNING: 49, WHITEWALL: 50, TIRE: 51, BOOKSHELF: 52, SNOWGRASS: 53, CLAY: 54,
  BIRCH: 55, BIRCH_LEAVES: 56, DARK_LOG: 57, DARK_LEAVES: 58, AUTUMN_LEAVES: 59, SANDBAG: 60, CHISELED: 61, PORTAL: 62, BUSH: 63, MUD: 64, ROCK: 65, SCORIA: 66, SCORIA_DARK: 67, PODZOL: 68, BARBED: 69, WALLPANEL: 70,
  VOLCROCK: 71, BASALT2: 72, ASH: 73, SCORIA3: 74, ASPHALT_CRACK: 75, BARREL: 76, LOCKER: 77, BIN: 78, GRAFFITI1: 79, GRAFFITI2: 80, RUBBLE: 81, CABINET: 82,
  STAIR_STONE: 83, STAIR_WOOD: 84, STAIR_DARK: 85, STAIR_CONCRETE: 86, STAIR_SAND: 87, STAIR_METAL: 88, SNOW_BLOCK: 89, LAVA_FLOW: 90,
  LIMESTONE: 91, ZINC: 92, BROWNSTONE: 93, LADDER: 94,
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
  def(B.BIRCH, 'birch_top', 'birch_side', 'birch_top');
  def(B.BIRCH_LEAVES, 'birch_leaves', null, null, { opaque: false, bulletPass: true });
  def(B.DARK_LOG, 'log_top', 'dark_log', 'log_top');
  def(B.DARK_LEAVES, 'dark_leaves', null, null, { opaque: false, bulletPass: true });
  def(B.AUTUMN_LEAVES, 'autumn_leaves', null, null, { opaque: false, bulletPass: true });
  def(B.SANDBAG, 'sandbag');
  def(B.CHISELED, 'chiseled');
  def(B.PORTAL, 'portal', null, null, { bright: true });
  def(B.BUSH, 'bush', null, null, { opaque: false, bulletPass: true });
  def(B.MUD, 'mud');
  def(B.ROCK, 'rock');
  def(B.SCORIA, 'scoria');
  def(B.SCORIA_DARK, 'scoria_dark');
  def(B.PODZOL, 'podzol', 'podzol_side', 'dirt');
  def(B.BARBED, 'barbed', null, null, { solid: true, opaque: false, bulletPass: true, plant: true });
  def(B.WALLPANEL, 'wallpanel');
  def(B.VOLCROCK, 'volcrock');
  def(B.BASALT2, 'basalt2');
  def(B.ASH, 'ash');
  def(B.SCORIA3, 'scoria3');
  def(B.ASPHALT_CRACK, 'asphalt_crack', 'asphalt', 'asphalt');
  def(B.BARREL, 'barrel_top', 'barrel_side', 'barrel_top');
  def(B.LOCKER, 'cabinet', 'locker', 'cabinet');
  def(B.BIN, 'bin_top', 'bin_side', 'bin_top');
  def(B.GRAFFITI1, 'graffiti1');
  def(B.GRAFFITI2, 'graffiti2');
  def(B.RUBBLE, 'rubble');
  def(B.CABINET, 'cabinet');
  def(B.SNOW_BLOCK, 'snow');
  def(B.LAVA_FLOW, 'lava', null, null, { solid: false, opaque: false, liquid: true, bright: true, bulletPass: true, flow: true });
  def(B.LIMESTONE, 'limestone');
  def(B.ZINC, 'zinc');
  def(B.BROWNSTONE, 'brownstone');
  // échelle : on la traverse, on y grimpe (orientation = côté du mur, via stairDir)
  def(B.LADDER, 'ladder', null, null, { solid: false, opaque: false, bulletPass: true, ladder: true });
  // marches d'escalier (forme de vraie marche, collision d'un bloc plein)
  const stair = { opaque: false, stair: true };
  def(B.STAIR_STONE, 'stonebrick', null, null, stair);
  def(B.STAIR_WOOD, 'planks', null, null, stair);
  def(B.STAIR_DARK, 'darkbrick', null, null, stair);
  def(B.STAIR_CONCRETE, 'concrete', null, null, stair);
  def(B.STAIR_SAND, 'sandstone_top', 'sandstone_side', 'sandstone_top', stair);
  def(B.STAIR_METAL, 'grate', null, null, Object.assign({}, stair, { opaque: false }));
  return d;
})();

G.World = class {
  constructor(W, H, D) {
    this.W = W; this.H = H; this.D = D;
    this.data = new Uint8Array(W * H * D);
    this.stand = new Int16Array(W * D);
    this.meshes = [];
    this.details = [];  // petits éléments décoratifs (cailloux…) sans collision
    this.solids = [];   // obstacles construits (barricades, boucliers)
    this.liquidMats = [];
    this.stairDir = new Map(); // index du bloc -> direction de montée (0:+x 1:-x 2:+z 3:-z)
  }
  idx(x, y, z) { return (y * this.D + z) * this.W + x; }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.W && y < this.H && z < this.D; }
  get(x, y, z) { return this.inside(x, y, z) ? this.data[this.idx(x, y, z)] : 0; }
  set(x, y, z, b) { if (this.inside(x, y, z)) this.data[this.idx(x, y, z)] = b; }
  setStair(x, y, z, b, dir) { if (!this.inside(x, y, z)) return; this.set(x, y, z, b); this.stairDir.set(this.idx(x, y, z), dir); }
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
  isLadder(x, y, z) { return this.get(Math.floor(x), Math.floor(y), Math.floor(z)) === G.B.LADDER; }
  // pose une échelle verticale de y0 à y1 contre le côté "dir" (0:+x 1:-x 2:+z 3:-z)
  setLadder(x, y0, y1, z, dir) { for (let y = y0; y <= y1; y++) this.setStair(x, y, z, G.B.LADDER, dir); }
  canStand(x, y, z) { return y >= 1 && this.isSolid(x, y - 1, z) && !this.isSolid(x, y, z) && !this.isSolid(x, y + 1, z); }

  // ---------- Maillage ----------
  buildMesh(scene, shadows) {
    this.scene = scene; this.shadows = shadows; this.CH = 16;
    this.mats = {
      opaque: new THREE.MeshLambertMaterial({ map: G.Tex.atlas, vertexColors: true, alphaTest: 0.5 }),
      bright: new THREE.MeshBasicMaterial({ map: G.Tex.atlas, vertexColors: true }),
    };
    const waveShader = (mat) => {
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = { value: 0 };
        sh.vertexShader = 'attribute float wave;\nuniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
          'vec3 transformed = vec3(position);\ntransformed.y += wave * (sin(position.x * 1.7 + uTime * 1.5) * 0.045 + cos(position.z * 1.3 + uTime * 1.1) * 0.045 - 0.04);');
        mat.userData.shader = sh;
      };
      this.liquidMats.push(mat);
      return mat;
    };
    this.waterTex = G.Tex.liquidTex('water');
    this.lavaTex = G.Tex.liquidTex('lava');
    this.mats.water = waveShader(new THREE.MeshPhongMaterial({ map: this.waterTex, transparent: true, opacity: 0.8, shininess: 90, specular: 0x6a7a88, depthWrite: false }));
    this.mats.lava = waveShader(new THREE.MeshBasicMaterial({ map: this.lavaTex }));
    this.uvCache = {};
    this.chunks = new Map(); this.dirty = new Set();
    this.detailBuckets = new Map();
    for (const d of this.details) { const k = Math.floor((d.box ? d.x0 : d.x) / this.CH) + ',' + Math.floor((d.box ? d.z0 : d.z) / this.CH); if (!this.detailBuckets.has(k)) this.detailBuckets.set(k, []); this.detailBuckets.get(k).push(d); }
    for (let cz = 0; cz * this.CH < this.D; cz++) for (let cx = 0; cx * this.CH < this.W; cx++) this.buildChunk(cx, cz);
  }
  // modifie un bloc après la génération (verre brisé…) et reconstruit les tronçons concernés
  setBlock(x, y, z, b) {
    if (!this.inside(x, y, z)) return;
    this.data[this.idx(x, y, z)] = b;
    const C = this.CH, cx = Math.floor(x / C), cz = Math.floor(z / C);
    this.dirty.add(cx + ',' + cz);
    if (x % C === 0) this.dirty.add((cx - 1) + ',' + cz); if (x % C === C - 1) this.dirty.add((cx + 1) + ',' + cz);
    if (z % C === 0) this.dirty.add(cx + ',' + (cz - 1)); if (z % C === C - 1) this.dirty.add(cx + ',' + (cz + 1));
  }
  updateDirty() {
    let n = 0;
    for (const k of this.dirty) {
      const [cx, cz] = k.split(',').map(Number);
      if (cx >= 0 && cz >= 0 && cx * this.CH < this.W && cz * this.CH < this.D) this.buildChunk(cx, cz);
      this.dirty.delete(k);
      if (++n >= 3) break;
    }
  }
  buildChunk(cx, cz) {
    const key = cx + ',' + cz;
    const old = this.chunks.get(key);
    if (old) for (const m of old) { this.scene.remove(m); m.geometry.dispose(); const i = this.meshes.indexOf(m); if (i >= 0) this.meshes.splice(i, 1); }
    const x0 = cx * this.CH, x1 = Math.min(this.W, x0 + this.CH), z0 = cz * this.CH, z1 = Math.min(this.D, z0 + this.CH);
    const FACES = [
      { n: [1, 0, 0], t: 'side', v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
      { n: [-1, 0, 0], t: 'side', v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
      { n: [0, 1, 0], t: 'top', v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
      { n: [0, -1, 0], t: 'bottom', v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
      { n: [0, 0, 1], t: 'side', v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
      { n: [0, 0, -1], t: 'side', v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
    ];
    const AO = [0.4, 0.6, 0.8, 1.0];
    const groups = { opaque: this._newGroup(), bright: this._newGroup(), water: this._newGroup(), lava: this._newGroup() };
    const occ = (x, y, z) => { const b = this.get(x, y, z); return b !== 0 && G.BLOCKS[b].opaque ? 1 : 0; };
    const uvCache = this.uvCache;
    const getUV = (name) => uvCache[name] || (uvCache[name] = G.Tex.uv(name));
    const rnd = G.mulberry32(5 + cx * 31 + cz * 977);

    for (let y = 0; y < this.H; y++) for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
      const b = this.data[this.idx(x, y, z)];
      if (!b) continue;
      const def = G.BLOCKS[b];
      if (def.plant) { this._plant(groups.opaque, x, y, z, getUV(def.top), rnd); continue; }
      if (def.ladder) {
        const dir = this.stairDir.get(this.idx(x, y, z)) || 0, uvl = getUV('ladder');
        const a0 = dir === 0 ? x + 0.86 : dir === 1 ? x + 0.08 : x, a1 = dir === 0 ? x + 0.92 : dir === 1 ? x + 0.14 : x + 1;
        const c0 = dir === 2 ? z + 0.86 : dir === 3 ? z + 0.08 : z, c1 = dir === 2 ? z + 0.92 : dir === 3 ? z + 0.14 : z + 1;
        this._boxB(groups.opaque, a0, y, c0, a1, y + 1, c1, uvl, 0.95);
        continue;
      }
      if (def.stair) {
        const dir = this.stairDir.get(this.idx(x, y, z)) || 0, uvr = getUV(def.side);
        const above = this.get(x, y + 1, z);
        if (above && G.BLOCKS[above].solid && !G.BLOCKS[above].stair) { this._boxB(groups.opaque, x, y, z, x + 1, y + 1, z + 1, uvr, 0.9); continue; }
        this._boxB(groups.opaque, x, y, z, x + 1, y + 0.5, z + 1, uvr, 0.95);
        const hx0 = dir === 0 ? x + 0.5 : x, hx1 = dir === 1 ? x + 0.5 : x + 1, hz0 = dir === 2 ? z + 0.5 : z, hz1 = dir === 3 ? z + 0.5 : z + 1;
        this._boxB(groups.opaque, hx0, y + 0.5, hz0, hx1, y + 1, hz1, uvr, 0.85);
        continue;
      }
      const grp = def.liquid ? (def.bright ? groups.lava : groups.water) : (def.bright ? groups.bright : groups.opaque);
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
        const liquidTopDrop = def.liquid ? (def.flow ? 0.4 : 0.12) : 0;
        const surface = def.liquid && !(this.get(x, y + 1, z) && G.BLOCKS[this.get(x, y + 1, z)].liquid);
        for (let i = 0; i < 4; i++) {
          const c = F.v[i];
          let vy = y + c[1];
          if (liquidTopDrop && c[1] === 1 && surface) vy -= liquidTopDrop;
          grp.pos.push(x + c[0], vy, z + c[2]);
          grp.nor.push(F.n[0], F.n[1], F.n[2]);
          if (def.liquid) {
            if (F.n[1] !== 0) grp.uv.push(x + c[0], z + c[2]); else grp.uv.push(x + c[0] + z + c[2], vy);
            grp.wave.push(c[1] === 1 && surface ? 1 : 0);
          } else grp.uv.push(uvs[i][0], uvs[i][1]);
          const l = AO[aos[i]];
          grp.col.push(l, l, l);
        }
        if (aos[0] + aos[2] < aos[1] + aos[3]) grp.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
        else grp.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }


    for (const d of this.detailBuckets.get(key) || []) {
      if (d.box) this._boxB(d.bright ? groups.bright : groups.opaque, d.x0, d.y0, d.z0, d.x1, d.y1, d.z1, getUV(d.tile), d.bright ? 1 : 0.85);
      else this._box(groups.opaque, d, getUV(d.tile));
    }
    const meshes = [];
    const mk = (g, mat, cast) => {
      if (!g.idx.length) return null;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nor, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(g.col, 3));
      if (g.wave.length) geo.setAttribute('wave', new THREE.Float32BufferAttribute(g.wave, 1));
      geo.setIndex(g.idx);
      geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, mat);
      m.matrixAutoUpdate = false;
      if (this.shadows) { m.castShadow = cast; m.receiveShadow = true; }
      this.scene.add(m);
      this.meshes.push(m); meshes.push(m);
      return m;
    };
    mk(groups.opaque, this.mats.opaque, true);
    mk(groups.bright, this.mats.bright, false);
    const wm = mk(groups.water, this.mats.water, false); if (wm) wm.renderOrder = 2;
    mk(groups.lava, this.mats.lava, false);
    this.chunks.set(key, meshes);
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
  _newGroup() { return { pos: [], nor: [], uv: [], col: [], idx: [], wave: [] }; }
  animate(t) {
    if (this.waterTex) { this.waterTex.offset.x = t * 0.03; this.waterTex.offset.y = t * 0.017; }
    if (this.lavaTex) { this.lavaTex.offset.x = t * 0.012; this.lavaTex.offset.y = Math.sin(t * 0.2) * 0.05; }
    for (const m of this.liquidMats) if (m.userData.shader) m.userData.shader.uniforms.uTime.value = t;
  }
  _boxB(g, x0, y0, z0, x1, y1, z1, uvr, light) {
    const [u0, v0, u1, v1] = uvr, du = u1 - u0, dv = v1 - v0;
    const F = [
      [[1, 0, 0], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [z1 - z0, y1 - y0]],
      [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [z1 - z0, y1 - y0]],
      [[0, 1, 0], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [x1 - x0, z1 - z0]],
      [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [x1 - x0, y1 - y0]],
      [[0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [x1 - x0, y1 - y0]],
    ];
    for (const [n, vs, [sw, sh]] of F) {
      const base = g.pos.length / 3;
      const uv = [[u0, v0], [u0 + du * sw, v0], [u0 + du * sw, v0 + dv * sh], [u0, v0 + dv * sh]];
      for (let i = 0; i < 4; i++) { g.pos.push(vs[i][0], vs[i][1], vs[i][2]); g.nor.push(n[0], n[1], n[2]); g.uv.push(uv[i][0], uv[i][1]); const l = light * (n[1] ? 1 : 0.88); g.col.push(l, l, l); }
      g.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  _box(g, d, uvr) {
    const [u0, v0, u1, v1] = uvr;
    const x0 = d.x - d.sx / 2, x1 = d.x + d.sx / 2, y0 = d.y, y1 = d.y + d.sy, z0 = d.z - d.sz / 2, z1 = d.z + d.sz / 2;
    const F = [
      [[1, 0, 0], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]]], [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]],
      [[0, 1, 0], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]]],
      [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]], [[0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]]],
    ];
    const du = (u1 - u0) * 0.4, dv = (v1 - v0) * 0.4;
    const uv = [[u0, v0], [u0 + du, v0], [u0 + du, v0 + dv], [u0, v0 + dv]];
    for (const [n, vs] of F) {
      const base = g.pos.length / 3;
      for (let i = 0; i < 4; i++) { g.pos.push(vs[i][0], vs[i][1], vs[i][2]); g.nor.push(n[0], n[1], n[2]); g.uv.push(uv[i][0], uv[i][1]); const l = n[1] ? 0.95 : 0.75; g.col.push(l, l, l); }
      g.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  dispose(scene) {
    for (const m of this.meshes) { scene.remove(m); m.geometry.dispose(); }
    if (this.mats) for (const k in this.mats) this.mats[k].dispose();
    if (this.waterTex) this.waterTex.dispose(); if (this.lavaTex) this.lavaTex.dispose();
    this.meshes = [];
  }

  // ---------- Lancer de rayon (DDA) ----------
  raycast(ox, oy, oz, dx, dy, dz, maxDist, onPass) {
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
      if (b && onPass) onPass(x, y, z, b, t);
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
    if (this.raycast(a.x, a.y, a.z, dx / L, dy / L, dz / L, L)) return false;
    if (this.solids.length && this.solidOnRay(a, { x: dx / L, y: dy / L, z: dz / L }, L, (s) => s.opaque && s !== this.losIgnore)) return false;
    return true;
  }

  // ---------- Collisions AABB ----------
  collides(px, py, pz, hw, h, who) {
    this.lastSolid = null;
    const x0 = Math.floor(px - hw), x1 = Math.floor(px + hw - 1e-6);
    const y0 = Math.floor(py), y1 = Math.floor(py + h - 1e-6);
    const z0 = Math.floor(pz - hw), z1 = Math.floor(pz + hw - 1e-6);
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (this.isSolid(x, y, z)) return true;
    for (const s of this.solids) {
      if (who === 'player' && !s.blocksPlayer) continue;
      if (who === 'none') continue;
      if (px + hw > s.min.x && px - hw < s.max.x && py + h > s.min.y && py < s.max.y && pz + hw > s.min.z && pz - hw < s.max.z) { this.lastSolid = s; return true; }
    }
    return false;
  }
  // premier obstacle construit touché par un segment
  solidOnRay(o, d, maxD, filter) {
    let best = null, bt = maxD;
    for (const s of this.solids) {
      if (filter && !filter(s)) continue;
      const t = G.rayAABB(o, d, s.min.x, s.min.y, s.min.z, s.max.x, s.max.y, s.max.z);
      if (t !== null && t < bt) { bt = t; best = s; }
    }
    return best ? { s: best, t: bt } : null;
  }
  moveEntity(e, dt, stepUp = true) {
    const hw = e.w / 2, h = e.h, who = e.isPlayer ? 'player' : 'enemy';
    const p = e.pos;
    let ny = p.y + e.vel.y * dt;
    e.onGround = false;
    if (this.collides(p.x, ny, p.z, hw, h, who)) {
      if (e.vel.y < 0) { ny = this.lastSolid ? Math.max(p.y, this.lastSolid.max.y) : Math.floor(ny) + 1; e.onGround = true; }
      else { ny = Math.ceil(ny + h) - h - 1; if (ny < p.y) ny = p.y; }
      e.vel.y = 0;
    }
    p.y = ny;
    for (const ax of ['x', 'z']) {
      const v = e.vel[ax] * dt;
      if (!v) continue;
      const nx = ax === 'x' ? p.x + v : p.x, nz = ax === 'z' ? p.z + v : p.z;
      if (!this.collides(nx, p.y, nz, hw, h, who)) { p[ax] += v; continue; }
      const hitSolid = this.lastSolid;
      if (!hitSolid && stepUp && e.onGround && !this.collides(nx, p.y + 1.01, nz, hw, h, who) && !this.collides(p.x, p.y + 1.01, p.z, hw, h, who)) {
        p.y = Math.floor(p.y) + 1.0; p[ax] += v; e.stepped = true; continue;
      }
      e.vel[ax] = 0; e.blocked = true; if (hitSolid) e.blockedBy = hitSolid;
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
      if (b === G.B.LAVA || bb === G.B.LAVA || b === G.B.LAVA_FLOW || bb === G.B.LAVA_FLOW || bb === G.B.CACTUS) continue;
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
    // échelles : arêtes entre le pied de l'échelle et les cases d'arrivée en haut (dans les deux sens)
    this.ladders = [];
    const extra = new Map();
    const addEdge = (a, b) => { if (!extra.has(a)) extra.set(a, []); extra.get(a).push(b); };
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      for (let y = 1; y < H - 1; y++) {
        if (this.get(x, y, z) !== G.B.LADDER || this.get(x, y - 1, z) === G.B.LADDER) continue;
        let yt = y; while (this.get(x, yt + 1, z) === G.B.LADDER) yt++;
        const base = nodeAt[this.idx(x, y, z)];
        const tops = [];
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const id = nodeAt[this.idx(x + dx, yt + 1, z + dz)]; if (id >= 0) tops.push(id); }
        if (base >= 0) for (const t of tops) { addEdge(base, t); addEdge(t, base); }
        this.ladders.push({ x, z, y0: y, y1: yt });
      }
    }
    if (extra.size) {
      const ol = [], os = new Int32Array(N + 1);
      for (let i = 0; i < N; i++) { os[i] = ol.length; for (let k = outStart[i]; k < outStart[i + 1]; k++) ol.push(outList[k]); for (const t of extra.get(i) || []) ol.push(t); }
      os[N] = ol.length; outStart.set(os); outList.length = 0; for (const t of ol) outList.push(t);
    }
    // arêtes inverses pour le BFS depuis le joueur
    const inCount = new Int32Array(N + 1);
    for (const t of outList) inCount[t + 1]++;
    for (let i = 0; i < N; i++) inCount[i + 1] += inCount[i];
    const inList = new Int32Array(outList.length), fillPos = inCount.slice();
    for (let i = 0; i < N; i++) for (let k = outStart[i]; k < outStart[i + 1]; k++) inList[fillPos[outList[k]]++] = i;
    const big = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      let ok = 1;
      // 3×3 libre sur deux blocs au-dessus des pieds : les marches d'un bloc autour sont acceptées, pas les murs ni les portes
      for (let dz = -1; dz <= 1 && ok; dz++) for (let dx = -1; dx <= 1 && ok; dx++) for (let dy = 1; dy <= 2; dy++) if (this.isSolid(nx[i] + dx, ny[i] + dy, nz[i] + dz)) { ok = 0; break; }
      big[i] = ok;
    }
    this.nav = { big, distBig: new Int32Array(N).fill(-1), blocked: new Int16Array(N), N, nodeAt, nx: Int16Array.from(nx), ny: Int16Array.from(ny), nz: Int16Array.from(nz), outStart, outList: Int32Array.from(outList), inStart: inCount, inList, dist: new Int32Array(N).fill(-1), queue: new Int32Array(N) };
  }
  // nœud le plus proche d'une position (on cherche sous les pieds)
  nodeNear(x, y, z) {
    const n = this.nav; if (!n) return -1;
    const fx = Math.floor(x), fz = Math.floor(z);
    if (fx < 0 || fz < 0 || fx >= this.W || fz >= this.D) return -1;
    const fy = Math.floor(y + 0.05);
    for (let yy = Math.min(this.H - 2, fy + 1); yy >= Math.max(1, fy - 1); yy--) { const id = n.nodeAt[this.idx(fx, yy, fz)]; if (id >= 0) return id; }
    // au bord d'un trou (trémie, palier) : on reste au niveau des pieds en prenant la case voisine la plus proche
    let best = -1, bd = 9;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const cx = fx + dx, cz = fz + dz; if (cx < 0 || cz < 0 || cx >= this.W || cz >= this.D) continue;
      const id = n.nodeAt[this.idx(cx, fy, cz)]; if (id < 0) continue;
      const d = Math.hypot(cx + 0.5 - x, cz + 0.5 - z); if (d < bd && d < 1.0) { bd = d; best = id; }
    }
    if (best >= 0) return best;
    for (let yy = fy - 2; yy >= Math.max(1, fy - 8); yy--) {
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
    const fb = this.flowBounds;
    n.dist[start] = 0; q[qt++] = start;
    while (qh < qt) {
      const c = q[qh++], cd = n.dist[c] + 1;
      for (let k = n.inStart[c]; k < n.inStart[c + 1]; k++) {
        const a = n.inList[k];
        if (n.dist[a] !== -1 || n.blocked[a] > 0) continue;
        if (fb && (Math.abs(n.nx[a] + 0.5 - fb.x) > fb.R || Math.abs(n.nz[a] + 0.5 - fb.z) > fb.R)) continue; // hors de la zone de combat
        n.dist[a] = cd; q[qt++] = a;
      }
    }
  }
  // marque / libère les cases de navigation occupées par un obstacle (voiture, barricade)
  navBlock(min, max, delta) {
    const n = this.nav; if (!n) return;
    const ids = [];
    for (let x = Math.floor(min.x + 0.1); x <= Math.floor(max.x - 0.1); x++) for (let z = Math.floor(min.z + 0.1); z <= Math.floor(max.z - 0.1); z++) {
      if (x < 0 || z < 0 || x >= this.W || z >= this.D) continue;
      for (let y = Math.max(1, Math.floor(min.y) - 1); y <= Math.floor(min.y) + 1; y++) { const id = n.nodeAt[this.idx(x, y, z)]; if (id >= 0) { n.blocked[id] = Math.max(0, n.blocked[id] + delta); ids.push(id); } }
    }
    return ids;
  }
  fieldTo(target) {
    const n = this.nav, dist = new Int32Array(n.N).fill(-1), q = n.queue, fb = this.flowBounds;
    let qh = 0, qt = 0; dist[target] = 0; q[qt++] = target;
    while (qh < qt) { const c = q[qh++], cd = dist[c] + 1; for (let k = n.inStart[c]; k < n.inStart[c + 1]; k++) { const a = n.inList[k]; if (dist[a] !== -1 || n.blocked[a] > 0) continue; if (fb && (Math.abs(n.nx[a] + 0.5 - fb.x) > fb.R || Math.abs(n.nz[a] + 0.5 - fb.z) > fb.R)) continue; dist[a] = cd; q[qt++] = a; } }
    return dist;
  }
  nextStepField(x, y, z, field) {
    const n = this.nav, id = this.nodeNear(x, y, z);
    if (id < 0) return null;
    let best = -1, bd = field[id] < 0 ? 1e9 : field[id];
    for (let k = n.outStart[id]; k < n.outStart[id + 1]; k++) { const t = n.outList[k], d = field[t]; if (d >= 0 && d < bd && !n.blocked[t]) { bd = d; best = t; } }
    return best < 0 ? null : [n.nx[best], n.ny[best], n.nz[best]];
  }
  // champ de flux réservé aux grands boss (ne passent que dans les espaces larges)
  // potentiel des grands boss : chaque case large reçoit (distance « normale » au joueur × 1000), puis on propage par les
  // seules cases larges (Dijkstra) → le boss rejoint la case large atteignable la plus proche du joueur, sans cul-de-sac
  // (au pied d'une tour où il ne passe pas, par exemple)
  computeFlowBig() {
    const n = this.nav; if (!n) return;
    const D = n.distBig; D.fill(-1);
    const heapK = [], heapV = [];
    const push = (k, v) => { heapK.push(k); heapV.push(v); let i = heapK.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heapK[p] <= heapK[i]) break; [heapK[p], heapK[i]] = [heapK[i], heapK[p]]; [heapV[p], heapV[i]] = [heapV[i], heapV[p]]; i = p; } };
    const pop = () => { const k = heapK[0], v = heapV[0], lk = heapK.pop(), lv = heapV.pop(); if (heapK.length) { heapK[0] = lk; heapV[0] = lv; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heapK.length && heapK[l] < heapK[m]) m = l; if (r < heapK.length && heapK[r] < heapK[m]) m = r; if (m === i) break; [heapK[m], heapK[i]] = [heapK[i], heapK[m]]; [heapV[m], heapV[i]] = [heapV[i], heapV[m]]; i = m; } } return [k, v]; };
    for (let i = 0; i < n.N; i++) if (n.big[i] && n.dist[i] >= 0 && !(n.blocked[i] > 0)) { D[i] = n.dist[i] * 1000; push(D[i], i); }
    while (heapK.length) {
      const [k, c] = pop(); if (k !== D[c]) continue;
      for (let e = n.inStart[c]; e < n.inStart[c + 1]; e++) {
        const a = n.inList[e];
        if (!n.big[a] || n.blocked[a] > 0) continue;
        if (D[a] === -1 || k + 1 < D[a]) { D[a] = k + 1; push(k + 1, a); }
      }
    }
  }
  nextStepBig(x, y, z) {
    const n = this.nav; const id = this.nodeNear(x, y, z);
    if (id < 0) return null;
    let best = -1, bd = n.distBig[id] < 0 ? 1e9 : n.distBig[id];
    for (let k = n.outStart[id]; k < n.outStart[id + 1]; k++) {
      const t = n.outList[k], d = n.distBig[t];
      if (d >= 0 && d < bd && n.big[t]) { bd = d; best = t; }
    }
    return best < 0 ? null : [n.nx[best], n.ny[best], n.nz[best]];
  }
  flowDistAt(x, y, z) { const id = this.nodeNear(x, y, z); return id < 0 ? -1 : this.nav.dist[id]; }
  nextStep(x, y, z) {
    const n = this.nav; const id = this.nodeNear(x, y, z);
    if (id < 0) return null;
    let best = -1, bd = n.dist[id] < 0 ? 1e9 : n.dist[id];
    for (let k = n.outStart[id]; k < n.outStart[id + 1]; k++) {
      const t = n.outList[k], d = n.dist[t];
      if (d >= 0 && d < bd && !n.blocked[t]) { bd = d; best = t; }
    }
    if (best < 0) return null;
    return [n.nx[best], n.ny[best], n.nz[best]];
  }
};

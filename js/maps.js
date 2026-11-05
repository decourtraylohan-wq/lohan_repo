// Générateurs des cartes
G.Maps = (function () {
  const B = G.B;

  // ================= Aides de construction =================
  function terrain(w, heightFn, layers) {
    for (let z = 0; z < w.D; z++) for (let x = 0; x < w.W; x++) {
      const h = Math.max(1, Math.round(heightFn(x, z)));
      w.set(x, 0, z, B.BEDROCK);
      for (let y = 1; y <= h; y++) w.set(x, y, z, layers(x, y, z, h));
    }
  }
  function flatten(w, cx, cz, r, h, surface, under) {
    for (let z = cz - r; z <= cz + r; z++) for (let x = cx - r; x <= cx + r; x++) {
      if (Math.hypot(x - cx, z - cz) > r) continue;
      for (let y = 1; y < w.H; y++) {
        if (y < h) w.set(x, y, z, under);
        else if (y === h) w.set(x, y, z, surface);
        else w.set(x, y, z, B.AIR);
      }
    }
  }
  function tree(w, x, y, z, rnd) {
    const th = 4 + Math.floor(rnd() * 2);
    for (let i = 1; i <= th; i++) w.set(x, y + i, z, B.LOG);
    for (let dy = th - 1; dy <= th + 1; dy++) {
      const r = dy === th + 1 ? 1 : 2;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r && rnd() < 0.6) continue;
        const b = w.get(x + dx, y + dy, z + dz);
        if (!b || G.BLOCKS[b].plant) w.set(x + dx, y + dy, z + dz, B.LEAVES);
      }
    }
    w.set(x, y + th + 2, z, B.LEAVES);
  }
  function pine(w, x, y, z, rnd) {
    const th = 5 + Math.floor(rnd() * 3);
    for (let i = 1; i <= th; i++) w.set(x, y + i, z, B.LOG);
    let r = 2;
    for (let dy = 2; dy <= th + 1; dy++) {
      const rr = dy === th + 1 ? 0 : r;
      for (let dz = -rr; dz <= rr; dz++) for (let dx = -rr; dx <= rr; dx++) {
        if (Math.abs(dx) + Math.abs(dz) > rr + 0.5) continue;
        if (!w.get(x + dx, y + dy, z + dz)) w.set(x + dx, y + dy, z + dz, B.PINE);
      }
      if (dy % 2 === 0) r = Math.max(1, r - 1);
    }
    w.set(x, y + th + 2, z, B.PINE);
  }
  function tallPine(w, x, y, z, rnd) {
    const th = 8 + Math.floor(rnd() * 4);
    for (let i = 1; i <= th; i++) w.set(x, y + i, z, B.DARK_LOG);
    for (let dy = 3; dy <= th + 1; dy++) {
      const r = Math.max(0, Math.round((th + 1 - dy) * 0.35));
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dz) > r + (dy % 2)) continue;
        if (!w.get(x + dx, y + dy, z + dz)) w.set(x + dx, y + dy, z + dz, B.PINE);
      }
    }
    w.set(x, y + th + 1, z, B.PINE); w.set(x, y + th + 2, z, B.PINE);
  }
  function bigPine(w, x, y, z, rnd) {
    const th = 12 + Math.floor(rnd() * 5);
    for (let i = 1; i <= th; i++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) w.set(x + dx, y + i, z + dz, B.DARK_LOG);
    for (let dy = 4; dy <= th + 2; dy++) {
      const r = Math.max(1, Math.round((th + 2 - dy) * 0.42)) + (dy % 3 === 0 ? 1 : 0);
      for (let dz = -r; dz <= r + 1; dz++) for (let dx = -r; dx <= r + 1; dx++) {
        if (Math.hypot(dx - 0.5, dz - 0.5) > r + 0.4) continue;
        if (!w.get(x + dx, y + dy, z + dz)) w.set(x + dx, y + dy, z + dz, B.PINE);
      }
    }
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { w.set(x + dx, y + th + 3, z + dz, B.PINE); w.set(x + dx, y + th + 4, z + dz, B.SNOW_BLOCK); }
    for (const [dx, dz] of [[-1, 0], [2, 1], [0, 2], [1, -1]]) if (rnd() < 0.6) w.set(x + dx, y + 1, z + dz, B.DARK_LOG);
  }
  function palm(w, x, y, z) {
    const th = 6;
    for (let i = 1; i <= th; i++) w.set(x, y + i, z, B.LOG);
    const t = y + th + 1;
    w.set(x, t, z, B.LEAVES);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      w.set(x + dx, t, z + dz, B.LEAVES); w.set(x + dx * 2, t, z + dz * 2, B.LEAVES); w.set(x + dx * 3, t - 1, z + dz * 3, B.LEAVES);
    }
  }
  function house(w, x0, z0, sx, sz, gy, door, wall, corner, roof) {
    const x1 = x0 + sx - 1, z1 = z0 + sz - 1;
    w.fill(x0, gy, z0, x1, gy, z1, B.COBBLE);
    w.fill(x0, gy + 1, z0, x1, gy + 6, z1, B.AIR);
    for (let y = gy + 1; y <= gy + 3; y++) {
      for (let x = x0; x <= x1; x++) { w.set(x, y, z0, wall); w.set(x, y, z1, wall); }
      for (let z = z0; z <= z1; z++) { w.set(x0, y, z, wall); w.set(x1, y, z, wall); }
      w.set(x0, y, z0, corner); w.set(x1, y, z0, corner); w.set(x0, y, z1, corner); w.set(x1, y, z1, corner);
    }
    const mx = Math.floor((x0 + x1) / 2), mz = Math.floor((z0 + z1) / 2);
    w.set(x0, gy + 2, mz, B.GLASS); w.set(x1, gy + 2, mz, B.GLASS); w.set(mx, gy + 2, z0, B.GLASS); w.set(mx, gy + 2, z1, B.GLASS);
    const doorCells = door === 'n' ? [[mx, z0], [mx + 1, z0]] : door === 's' ? [[mx, z1], [mx + 1, z1]] : door === 'w' ? [[x0, mz], [x0, mz + 1]] : [[x1, mz], [x1, mz + 1]];
    for (const [dx, dz] of doorCells) { w.set(dx, gy + 1, dz, B.AIR); w.set(dx, gy + 2, dz, B.AIR); }
    w.fill(x0 - 1, gy + 4, z0 - 1, x1 + 1, gy + 4, z1 + 1, roof);
    w.fill(x0 + 1, gy + 5, z0 + 1, x1 - 1, gy + 5, z1 - 1, roof);
    if (sx > 5 && sz > 5) w.fill(x0 + 2, gy + 6, z0 + 2, x1 - 2, gy + 6, z1 - 2, roof);
    w.set(mx, gy + 3, mz, B.GLOW);
    return { mx, mz };
  }
  function ellipse(cx, cz, rx, rz, fn) {
    for (let z = Math.floor(cz - rz - 1); z <= cz + rz + 1; z++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const d = Math.hypot((x - cx) / rx, (z - cz) / rz);
      if (d < 1) fn(x, z, d);
    }
  }
  // lac : on creuse et on remplit d'eau jusqu'au niveau "level"
  function lake(w, cx, cz, rx, rz, level, bed) {
    ellipse(cx, cz, rx, rz, (x, z, d) => {
      const depth = d < 0.55 ? 3 : d < 0.8 ? 2 : 1;
      for (let y = level - depth + 1; y < w.H; y++) w.set(x, y, z, y <= level ? B.WATER : B.AIR);
      w.set(x, level - depth, z, bed);
    });
    ellipse(cx, cz, rx + 1.6, rz + 1.6, (x, z) => { const t = w.top(x, z); if (t >= level && t <= level + 1 && w.get(x, t, z) !== B.WATER) { w.set(x, t, z, bed); for (let y = t + 1; y < w.H; y++) w.set(x, y, z, B.AIR); } });
  }
  function decorate(w, rnd, surface, list) {
    for (let z = 1; z < w.D - 1; z++) for (let x = 1; x < w.W - 1; x++) {
      const t = w.top(x, z);
      if (w.get(x, t, z) !== surface || w.get(x, t + 1, z)) continue;
      const r = rnd(); let acc = 0;
      for (const [b, p] of list) { acc += p; if (r < acc) { w.set(x, t + 1, z, b); break; } }
    }
  }
  function canTree(w, x, z, t, surface) {
    if (w.get(x, t, z) !== surface) return false;
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const b = w.get(x + dx, t + 1, z + dz); if (b && !G.BLOCKS[b].plant) return false; }
    return true;
  }

  // ---- variété de végétation ----
  function birch(w, x, y, z, rnd) {
    const th = 5 + Math.floor(rnd() * 3);
    for (let i = 1; i <= th; i++) w.set(x, y + i, z, B.BIRCH);
    for (let dy = th - 2; dy <= th + 1; dy++) {
      const r = dy >= th ? 1 : 2;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r) continue;
        if (!w.get(x + dx, y + dy, z + dz) || G.BLOCKS[w.get(x + dx, y + dy, z + dz)].plant) w.set(x + dx, y + dy, z + dz, B.BIRCH_LEAVES);
      }
    }
    w.set(x, y + th + 2, z, B.BIRCH_LEAVES);
  }
  function bigOak(w, x, y, z, rnd) {
    const th = 6 + Math.floor(rnd() * 2);
    for (let i = 1; i <= th; i++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) w.set(x + dx, y + i, z + dz, B.DARK_LOG);
    for (let dy = th - 2; dy <= th + 2; dy++) {
      const r = dy === th + 2 ? 2 : dy === th - 2 ? 3 : 4;
      for (let dz = -r; dz <= r + 1; dz++) for (let dx = -r; dx <= r + 1; dx++) {
        if (Math.hypot(dx - 0.5, dz - 0.5) > r + 0.3 || rnd() < 0.08) continue;
        const b = w.get(x + dx, y + dy, z + dz);
        if (!b || G.BLOCKS[b].plant) w.set(x + dx, y + dy, z + dz, B.DARK_LEAVES);
      }
    }
    // racines
    for (const [dx, dz] of [[-1, 0], [2, 1], [0, 2], [1, -1]]) if (rnd() < 0.7) w.set(x + dx, y + 1, z + dz, B.DARK_LOG);
  }
  function autumnTree(w, x, y, z, rnd) {
    tree(w, x, y, z, rnd);
    for (let dy = 2; dy <= 8; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (w.get(x + dx, y + dy, z + dz) === B.LEAVES) w.set(x + dx, y + dy, z + dz, B.AUTUMN_LEAVES);
  }
  function bush(w, x, y, z, rnd) {
    w.set(x, y + 1, z, B.BUSH);
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) if (rnd() < 0.5 && !w.get(x + dx, y + 1, z + dz) && w.isSolid(x + dx, y, z + dz)) w.set(x + dx, y + 1, z + dz, B.BUSH);
    if (rnd() < 0.3) w.set(x, y + 2, z, B.BUSH);
  }
  function deadTree(w, x, y, z, rnd, log = B.DARK_LOG) {
    const th = 3 + Math.floor(rnd() * 3);
    for (let i = 1; i <= th; i++) w.set(x, y + i, z, log);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (rnd() < 0.5) { w.set(x + dx, y + th - 1, z + dz, log); if (rnd() < 0.5) w.set(x + dx * 2, y + th, z + dz * 2, log); }
  }
  function cactus(w, x, y, z, rnd) {
    const hh = 2 + Math.floor(rnd() * 3);
    for (let i = 1; i <= hh; i++) w.set(x, y + i, z, B.CACTUS);
    if (hh >= 3 && rnd() < 0.6) {
      const [dx, dz] = G.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      const ay = y + 2;
      if (!w.get(x + dx, ay, z + dz)) { w.set(x + dx, ay, z + dz, B.CACTUS); w.set(x + dx, ay + 1, z + dz, B.CACTUS); }
    }
  }
  // cailloux et branches au sol (détails sans collision)
  function pebbles(w, rnd, surfaces, count, tile = 'rock') {
    for (let i = 0; i < count; i++) {
      const x = 1 + Math.floor(rnd() * (w.W - 2)), z = 1 + Math.floor(rnd() * (w.D - 2));
      const t = w.top(x, z);
      if (!surfaces.includes(w.get(x, t, z)) || w.get(x, t + 1, z)) continue;
      const n = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const sz = 0.12 + rnd() * 0.25;
        w.details.push({ x: x + 0.2 + rnd() * 0.6, y: t + 1, z: z + 0.2 + rnd() * 0.6, sx: sz * (0.8 + rnd() * 0.6), sy: sz * 0.6, sz, tile });
      }
      if (rnd() < 0.08) w.details.push({ x: x + 0.5, y: t + 1, z: z + 0.5, sx: rnd() < 0.5 ? 1.4 : 0.22, sy: 0.22, sz: rnd() < 0.5 ? 0.22 : 1.4, tile: 'log_side' });
    }
  }
  // abris (sacs de sable, caisses, murets) répartis sur la carte
  function covers(w, rnd, count, opts = {}) {
    const avoid = opts.avoid || [];
    let placed = 0, tries = 0;
    while (placed < count && tries++ < count * 30) {
      const x = 4 + Math.floor(rnd() * (w.W - 8)), z = 4 + Math.floor(rnd() * (w.D - 8));
      if (avoid.some(([ax, az, r]) => Math.hypot(x - ax, z - az) < r)) continue;
      const t = w.top(x, z);
      if (opts.surfaces && !opts.surfaces.includes(w.get(x, t, z))) continue;
      let ok = true;
      for (let dz = -2; dz <= 2 && ok; dz++) for (let dx = -2; dx <= 2 && ok; dx++) {
        const tt = w.top(x + dx, z + dz);
        if (Math.abs(tt - t) > 0 || w.get(x + dx, t + 1, z + dz) && !G.BLOCKS[w.get(x + dx, t + 1, z + dz)].plant || G.BLOCKS[w.get(x + dx, t, z + dz)].liquid) ok = false;
      }
      if (!ok) continue;
      const kind = opts.kinds ? G.pick(opts.kinds) : G.pick(['sand', 'sand', 'crates', 'wall']);
      const along = rnd() < 0.5;
      const put = (dx, dy, dz, b) => w.set(along ? x + dx : x + dz, t + 1 + dy, along ? z + dz : z + dx, b);
      if (kind === 'sand') { for (let i = -1; i <= 1; i++) put(i, 0, 0, B.SANDBAG); if (rnd() < 0.5) { put(-1, 0, 1, B.SANDBAG); } }
      else if (kind === 'crates') { put(0, 0, 0, B.CRATE); put(1, 0, 0, B.CRATE); put(0, 1, 0, B.CRATE); put(0, 0, 1, B.CRATE); }
      else if (kind === 'wall') { const m = opts.wall || B.MOSSY; for (let i = -1; i <= 2; i++) { put(i, 0, 0, m); if (i === 0 || i === 1) put(i, 1, 0, m); } }
      else if (kind === 'barrier') { for (let i = -1; i <= 1; i++) put(i, 0, 0, B.CONCRETE); }
      else if (kind === 'rock') { put(0, 0, 0, B.ROCK); put(1, 0, 0, B.ROCK); put(0, 1, 0, B.ROCK); put(0, 0, 1, B.STONE); }
      placed++;
    }
  }
  function portalPad(w, x, y, z) {
    w.set(x, y, z, B.PORTAL);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { w.set(x + dx, y + 1, z + dz, B.OBSIDIAN); w.set(x + dx, y + 2, z + dz, B.OBSIDIAN); w.set(x + dx, y + 3, z + dz, B.GLOW); }
  }

  function edgeSpawns(size, margin, step) {
    const s = [];
    for (let i = margin; i < size - margin; i += step) { s.push([i, margin]); s.push([i, size - 1 - margin]); s.push([margin, i]); s.push([size - 1 - margin, i]); }
    return s;
  }
  // escalier de 1 de large, monte de "n" marches dans la direction (dx,dz) à partir du sol gy
  const STAIR_OF = { [B.PLANKS]: B.STAIR_WOOD, [B.DARKBRICK]: B.STAIR_DARK, [B.OBSIDIAN]: B.STAIR_DARK, [B.SANDSTONE]: B.STAIR_SAND, [B.CONCRETE]: B.STAIR_CONCRETE, [B.CONCRETE_DARK]: B.STAIR_CONCRETE, [B.SEWER]: B.STAIR_STONE, [B.GRATE]: B.STAIR_METAL, [B.METAL]: B.STAIR_METAL };
  const dirOf = (dx, dz) => (dx > 0 ? 0 : dx < 0 ? 1 : dz > 0 ? 2 : 3);
  function stairs(w, x, z, gy, n, dx, dz, mat, width = 2, exitDir) {
    const px = dz !== 0 ? 1 : 0, pz = dx !== 0 ? 1 : 0;
    const sb = STAIR_OF[mat] || B.STAIR_STONE;
    for (let i = 0; i < n; i++) for (let k = 0; k < width; k++) {
      const cx = x + dx * i + px * k, cz = z + dz * i + pz * k;
      for (let y = gy + 1; y <= gy + i; y++) w.set(cx, y, cz, mat);
      // la dernière marche tourne vers la sortie quand l'escalier débouche sur le côté
      w.setStair(cx, gy + 1 + i, cz, sb, i === n - 1 && exitDir !== undefined ? exitDir : dirOf(dx, dz));
      for (let y = gy + 2 + i; y <= gy + 4 + i; y++) w.set(cx, y, cz, B.AIR);
    }
    // palier : une rangée pleine derrière la dernière marche s'il n'y a rien
    for (let k = 0; k < width; k++) {
      const lx = x + dx * n + px * k, lz = z + dz * n + pz * k;
      if (exitDir === undefined && !w.isSolid(lx, gy + n, lz)) { w.set(lx, gy + n, lz, mat); for (let y = gy + n + 1; y <= gy + n + 2; y++) w.set(lx, y, lz, B.AIR); }
    }
  }
  // volée d'escalier intérieure : marches pleines + trémie dans le plafond au-dessus de TOUTES les marches
  function flight(w, x, z, F, dx, dz, mat, rows, holeRows) {
    const sb = STAIR_OF[mat] || B.STAIR_STONE, dir = dirOf(dx, dz);
    for (let i = 0; i < 3; i++) for (const r of rows) {
      const cx = dx ? x + dx * i : r, cz = dz ? z + dz * i : r;
      for (let y = F + 1; y <= F + i; y++) w.set(cx, y, cz, mat);
      w.setStair(cx, F + 1 + i, cz, sb, dir);
    }
    for (let i = 0; i < 3; i++) for (const r of holeRows) { const cx = dx ? x + dx * i : r, cz = dz ? z + dz * i : r; w.set(cx, F + 4, cz, B.AIR); }
  }

  // ================= Ville : immeubles, égouts =================
  function building(w, x0, z0, x1, z1, nf, o, rnd) {
    const g = o.g, top = g + nf * 4;
    w.fill(x0, g + 1, z0, x1, top + 3, z1, B.AIR);
    const stairA = { x: x0 + 2, z: z0 + 2, d: 1 }, stairB = { x: x1 - 2, z: z1 - 3, d: -1 };
    const nearStair = (x, z) => [stairA, stairB].some((s) => { const xa = Math.min(s.x, s.x + s.d * 4), xb = Math.max(s.x, s.x + s.d * 4); return x >= xa - 1 && x <= xb + 1 && z >= s.z - 1 && z <= s.z + 2; });
    const mx = Math.floor((x0 + x1) / 2), mz = Math.floor((z0 + z1) / 2);
    const wide = x1 - x0 >= 12 && z1 - z0 >= 12;
    for (let k = 0; k <= nf; k++) {
      const F = g + 4 * k;
      w.fill(x0, F, z0, x1, F, z1, k === 0 ? o.floor : k === nf ? B.ROOF : B.CONCRETE);
      if (k > 0) for (let z = z0 + 3; z < z1 - 1; z += 5) for (let x = x0 + 3; x < x1 - 1; x += 5) if (!nearStair(x, z) && x !== mx && z !== mz) w.set(x, F, z, B.GLOW);
    }
    const free = (x, z) => !nearStair(x, z) && !(wide && (x === mx || z === mz && x < mx)) && !(Math.abs(x - mx) <= 1 && (z === z0 + 1 || z === z1 - 1)) && !(Math.abs(z - mz) <= 1 && (x === x0 + 1 || x === x1 - 1));
    for (let k = 0; k < nf; k++) {
      const F = g + 4 * k;
      for (let y = F + 1; y <= F + 3; y++) {
        const ring = [];
        for (let x = x0; x <= x1; x++) { ring.push([x, z0, x - x0]); ring.push([x, z1, x - x0]); }
        for (let z = z0 + 1; z < z1; z++) { ring.push([x0, z, z - z0]); ring.push([x1, z, z - z0]); }
        for (const [x, z, i] of ring) {
          const pillar = i % 4 === 0 || x === x0 && z === z0 || x === x1 && z === z1 || x === x0 && z === z1 || x === x1 && z === z0;
          let b = o.wall;
          if (!pillar && (o.glassFull ? true : y === F + 2)) b = B.GLASS;
          if (!pillar && y === F + 1 && !o.glassFull) b = o.wall;
          if (k === 0 && y <= F + 2 && o.graffiti && b !== B.GLASS && rnd() < 0.35) b = rnd() < 0.5 ? B.GRAFFITI1 : B.GRAFFITI2;
          w.set(x, y, z, b);
        }
      }
      // escaliers alternés (vraies marches)
      const s = k % 2 === 0 ? stairA : stairB;
      flight(w, s.x, 0, F, s.d, 0, o.stair || B.CONCRETE, [s.z, s.z + 1], [s.z - 1, s.z, s.z + 1, s.z + 2]);
      // cloisons : pièces et couloir (portes de 2 blocs)
      if (wide) {
        for (let z = z0 + 1; z < z1; z++) if (Math.abs(z - (z0 + 4)) > 1 && Math.abs(z - (z1 - 4)) > 1 && Math.abs(z - mz) > 0) for (let y = F + 1; y <= F + 3; y++) w.set(mx, y, z, k === 0 ? B.WHITEWALL : B.WALLPANEL);
        for (let x = x0 + 1; x < mx; x++) if (!nearStair(x, mz) && Math.abs(x - (x0 + mx) / 2) > 1) for (let y = F + 1; y <= F + 3; y++) w.set(x, y, mz, B.WALLPANEL);
      }
      const put = (x, z, b, h = 1) => { if (free(x, z) && !w.get(x, F + 1, z)) for (let y = 1; y <= h; y++) w.set(x, F + y, z, b); };
      if (k === 0) {
        // accueil : comptoir, casiers, plantes
        for (let x = mx - 2; x <= mx + 2; x++) put(x, mz + 2, B.PLANKS);
        put(mx - 2, mz + 3, B.PLANKS); put(mx + 2, mz + 3, B.PLANKS);
        for (let z = z0 + 2; z < z1 - 1; z += 1) if (z % 3 !== 0) put(x1 - 1, z, B.LOCKER, 2);
        put(x0 + 1, z1 - 1, B.BUSH); put(x1 - 1, z1 - 1, B.BUSH);
      } else {
        // bureaux : rangées de bureaux, armoires, casiers, bibliothèques
        for (let z = z0 + 2; z < z1 - 1; z += 3) for (let x = mx + 2; x < x1 - 1; x += 3) { put(x, z, B.PLANKS); put(x + 1, z, B.PLANKS); if (rnd() < 0.5) put(x, z + 1, B.CRATE); }
        for (let x = x0 + 2; x < mx - 1; x += 2) if (rnd() < 0.6) put(x, z1 - 1, rnd() < 0.5 ? B.CABINET : B.BOOKSHELF, rnd() < 0.5 ? 2 : 1);
        for (let z = mz + 2; z < z1 - 1; z += 2) if (rnd() < 0.5) put(x0 + 1, z, B.LOCKER, 2);
        if (rnd() < 0.5) put(x0 + 1, z0 + 6, B.CRATE);
      }
    }
    // portes au rez-de-chaussée sur les quatre faces
    for (const [x, z] of [[mx, z0], [mx + 1, z0], [mx, z1], [mx + 1, z1], [x0, mz], [x0, mz + 1], [x1, mz], [x1, mz + 1]]) { w.set(x, g + 1, z, B.AIR); w.set(x, g + 2, z, B.AIR); }
    // toit : parapet et climatiseurs
    for (let x = x0; x <= x1; x++) { w.set(x, top + 1, z0, o.wall); w.set(x, top + 1, z1, o.wall); }
    for (let z = z0; z <= z1; z++) { w.set(x0, top + 1, z, o.wall); w.set(x1, top + 1, z, o.wall); }
    for (let i = 0; i < 3; i++) { const x = x0 + 3 + Math.floor(rnd() * (x1 - x0 - 6)), z = z0 + 5 + Math.floor(rnd() * (z1 - z0 - 8)); if (!nearStair(x, z)) w.set(x, top + 1, z, B.METAL); }
    // dégâts : trous dans la façade, angle effondré, gravats
    if (o.damaged) {
      for (let i = 0; i < 4; i++) {
        const k = 1 + Math.floor(rnd() * (nf - 1)), F = g + 4 * k, side = Math.floor(rnd() * 4);
        const t = 2 + Math.floor(rnd() * Math.max(1, (side < 2 ? x1 - x0 : z1 - z0) - 5));
        for (let dy = 1; dy <= 2; dy++) for (let d = 0; d < 2; d++) {
          const x = side === 0 ? x0 + t + d : side === 1 ? x0 + t + d : side === 2 ? x0 : x1, z = side === 0 ? z0 : side === 1 ? z1 : z0 + t + d;
          w.set(x, F + dy, z, B.AIR);
        }
      }
      if (rnd() < 0.6 && nf >= 3) {
        const cx = rnd() < 0.5 ? x0 : x1 - 3, cz = rnd() < 0.5 ? z0 : z1 - 3;
        for (let x = cx; x <= cx + 3; x++) for (let z = cz; z <= cz + 3; z++) { if (nearStair(x, z)) continue; for (let y = top - 4; y <= top + 2; y++) w.set(x, y, z, B.AIR); }
        for (let i = 0; i < 10; i++) { const x = cx - 2 + Math.floor(rnd() * 8), z = cz - 2 + Math.floor(rnd() * 8); if (w.get(x, g + 1, z) === B.AIR && !nearStair(x, z)) w.set(x, g + 1, z, B.RUBBLE); }
      }
    }
    if (o.fireEscape) fireEscape(w, x0, z0, x1, z1, nf, o.fireEscape, g);
    return top;
  }
  // escalier de secours métallique sur une façade (côté 'e' ou 'w'), à la new-yorkaise
  function fireEscape(w, x0, z0, x1, z1, nf, side, g) {
    const x = side === 'e' ? x1 + 1 : x0 - 1, zs = z0 + 1, wallX = side === 'e' ? x1 : x0;
    if (z1 - z0 < 10) return;
    for (let L = 0; L < nf; L++) {
      const F = g + 4 * L, P = F + 4, even = L % 2 === 0;
      // volée : paire = montée +z (zs+1..zs+3), impaire = montée −z (zs+7..zs+5) ; les paliers se superposent en zs+4
      const steps = even ? [zs + 1, zs + 2, zs + 3] : [zs + 7, zs + 6, zs + 5];
      steps.forEach((z, i) => { for (let y = F + 1; y <= F + i; y++) w.set(x, y, z, B.METAL); w.setStair(x, F + 1 + i, z, B.STAIR_METAL, even ? 2 : 3); });
      // palier au niveau suivant, ouvert au-dessus de la volée et de sa case de départ
      for (let z = zs; z <= zs + 8; z++) {
        const open = even ? z <= zs + 3 : z >= zs + 5;
        if (!open) w.set(x, P, z, B.GRATE);
      }
      // garde-corps (détails sans collision)
      const ox = side === 'e' ? x + 0.92 : x + 0.02;
      w.details.push({ box: true, x0: ox, y0: P + 1, z0: zs, x1: ox + 0.06, y1: P + 1.08, z1: zs + 9, tile: 'metal' });
      for (let z = zs; z <= zs + 9; z += 3) w.details.push({ box: true, x0: ox, y0: P + 1, z0: z, x1: ox + 0.06, y1: P + 2.05, z1: z + 0.06, tile: 'metal' });
      // porte-fenêtre d'accès à l'étage
      if (L < nf - 1) { w.set(wallX, P + 1, zs + 4, B.AIR); w.set(wallX, P + 2, zs + 4, B.AIR); }
    }
  }
  function shop(w, x0, z0, x1, z1, g, wall) {
    w.fill(x0, g + 1, z0, x1, g + 6, z1, B.AIR);
    w.fill(x0, g, z0, x1, g, z1, B.PLANKS);
    for (let y = g + 1; y <= g + 4; y++) for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      if (x !== x0 && x !== x1 && z !== z0 && z !== z1) continue;
      w.set(x, y, z, (y === g + 2 || y === g + 3) && (x - x0) % 3 !== 0 && (z - z0) % 3 !== 0 ? B.GLASS : wall);
    }
    w.fill(x0, g + 5, z0, x1, g + 5, z1, B.ROOF);
    const mx = Math.floor((x0 + x1) / 2), mz = Math.floor((z0 + z1) / 2);
    for (const [x, z] of [[mx, z0], [mx + 1, z0], [mx, z1], [mx + 1, z1], [x0, mz], [x1, mz]]) { w.set(x, g + 1, z, B.AIR); w.set(x, g + 2, z, B.AIR); }
    for (let x = x0 - 1; x <= x1 + 1; x++) { w.set(x, g + 4, z0 - 1, B.AWNING); w.set(x, g + 4, z1 + 1, B.AWNING); }
    for (let x = x0 + 2; x < x1 - 1; x += 3) w.set(x, g + 1, mz + 2, B.CRATE);
    w.set(mx, g + 4, mz, B.GLOW);
  }
  function car(w, x, z, g, along) {
    (w.carSpots = w.carSpots || []).push({ x: x + (along === 'z' ? 1 : 2), z: z + (along === 'z' ? 2 : 1), y: g + 1, yaw: along === 'z' ? 0 : Math.PI / 2 });
  }
  function voxelCar(w, x, z, g, along, rnd) {
    const col = G.pick([B.CAR_RED, B.CAR_BLUE, B.CAR_WHITE]);
    const L = along === 'z' ? [2, 4] : [4, 2];
    for (let dx = 0; dx < L[0]; dx++) for (let dz = 0; dz < L[1]; dz++) w.set(x + dx, g + 1, z + dz, col);
    const cx = along === 'z' ? x : x + 1, cz = along === 'z' ? z + 1 : z;
    for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) w.set(cx + dx, g + 2, cz + dz, rnd() < 0.5 ? B.GLASS : col);
  }

  // ================= CARTES =================
  const list = [];

  // ---------- 1. Village ----------
  list.push({
    id: 'village', name: 'Village Sylvestre', desc: 'Hameau, lac, rivière, champs de blé et collines boisées. Idéal pour débuter.', stars: 1, rpMult: 1.0, size: 80, height: 32,
    sky: [0x6a8db4, 0xc9d3da], fog: [0xb4c0c8, 24, 84], hemi: [0xdde6ee, 0x4a4234, 0.7], sun: [0xfbecd6, 0.85], weather: null,
    build(w, rnd) {
      const n = G.makeNoise(101);
      terrain(w, (x, z) => {
        let h = 6 + (n(x * 0.05, z * 0.05) - 0.5) * 6;
        const dh = Math.hypot(x - 15, z - 15), k = dh < 8 ? 1 : Math.max(0, 1 - (dh - 8) / 13);
        h += 9 * k * k * (3 - 2 * k) + (dh < 8 ? 0 : (n(x * 0.3, z * 0.3) - 0.5) * 1.5);
        return h;
      }, (x, y, z, h) => (y === h ? B.GRASS : y > h - 3 ? B.DIRT : B.STONE));
      flatten(w, 40, 40, 16, 6, B.GRASS, B.DIRT);
      // lac + rivière
      lake(w, 64, 16, 11, 8, 6, B.SAND);
      for (let z = 20; z < 80; z++) {
        const cx = Math.round(66 + Math.sin(z * 0.12) * 3);
        for (let dx = -1; dx <= 1; dx++) { const x = cx + dx; for (let y = 6; y < w.H; y++) w.set(x, y, z, y === 6 ? B.WATER : B.AIR); w.set(x, 5, z, B.SAND); }
        for (const dx of [-2, 2]) { const x = cx + dx; const t = w.top(x, z); if (t > 6) for (let y = 7; y <= t; y++) w.set(x, y, z, B.AIR); w.set(x, 6, z, B.SAND); }
      }
      // chemins (terre battue) jusqu'aux bords
      for (let i = 2; i < 78; i++) for (let d = -1; d <= 0; d++) {
        for (const [x, z] of [[i, 40 + d], [40 + d, i]]) { const t = w.top(x, z); if ([B.GRASS, B.DIRT, B.SAND].includes(w.get(x, t, z))) w.set(x, t, z, i > 24 && i < 56 ? B.GRAVEL : B.PATH); }
      }
      // pont sur la rivière
      for (let x = 62; x <= 70; x++) for (let d = -2; d <= 1; d++) { w.set(x, 6, 40 + d, B.PLANKS); for (let y = 7; y < 12; y++) w.set(x, y, 40 + d, B.AIR); }
      for (let x = 62; x <= 70; x++) { w.set(x, 7, 37, B.LOG); w.set(x, 7, 42, B.LOG); }
      // maisons du village
      house(w, 29, 28, 7, 7, 6, 's', B.PLANKS, B.LOG, B.STONEBRICK);
      house(w, 45, 28, 7, 7, 6, 's', B.PLANKS, B.LOG, B.STONEBRICK);
      house(w, 29, 46, 7, 7, 6, 'n', B.COBBLE, B.LOG, B.PLANKS);
      house(w, 45, 46, 7, 7, 6, 'n', B.PLANKS, B.LOG, B.STONEBRICK);
      house(w, 52, 37, 5, 6, 6, 'w', B.BRICK, B.LOG, B.STONEBRICK);
      // puits
      w.fill(39, 7, 35, 41, 7, 37, B.COBBLE); w.set(40, 7, 36, B.WATER); w.set(40, 6, 36, B.COBBLE);
      for (const [x, z] of [[26, 39], [26, 41], [54, 46], [37, 27], [44, 54]]) w.set(x, 7, z, rnd() < 0.5 ? B.HAY : B.CRATE);
      // champ de blé avec canaux d'irrigation
      for (let z = 54; z < 74; z++) for (let x = 6; x < 28; x++) {
        const t = 6;
        for (let y = t + 1; y < w.H; y++) w.set(x, y, z, B.AIR);
        for (let y = 1; y < t; y++) w.set(x, y, z, B.DIRT);
        if ((z - 54) % 5 === 2) { w.set(x, t, z, B.WATER); w.set(x, t - 1, z, B.DIRT); }
        else { w.set(x, t, z, B.FARMLAND); if (rnd() < 0.92) w.set(x, t + 1, z, B.WHEAT); }
      }
      for (let x = 5; x <= 28; x++) { w.set(x, 7, 53, B.LOG); w.set(x, 7, 74, B.LOG); }
      for (let z = 53; z <= 74; z++) { w.set(5, 7, z, B.LOG); w.set(28, 7, z, B.LOG); }
      w.set(16, 7, 53, B.AIR); w.set(17, 7, 53, B.AIR);
      // grange
      flatten(w, 13, 45, 6, 6, B.GRASS, B.DIRT);
      house(w, 9, 41, 9, 7, 6, 'e', B.BRICK, B.LOG, B.PLANKS);
      w.set(11, 7, 43, B.HAY); w.set(11, 8, 43, B.HAY); w.set(12, 7, 43, B.HAY); w.set(15, 7, 46, B.CRATE);
      // ruine de guet au sommet de la colline
      const ht = w.top(15, 15);
      for (const [x, z] of [[13, 13], [17, 13], [13, 17], [17, 17]]) for (let y = ht + 1; y <= ht + 3; y++) w.set(x, y, z, B.MOSSY);
      w.set(15, ht + 1, 15, B.GLOW);
      // végétation
      for (let i = 0; i < 140; i++) {
        const x = 2 + Math.floor(rnd() * 76), z = 2 + Math.floor(rnd() * 76);
        if (Math.hypot(x - 40, z - 40) < 18) continue;
        if (x < 30 && z > 38) continue;
        const t = w.top(x, z);
        if (!canTree(w, x, z, t, B.GRASS)) continue;
        const r = rnd();
        if (r < 0.45) tree(w, x, t, z, rnd); else if (r < 0.68) birch(w, x, t, z, rnd); else if (r < 0.8 && canTree(w, x + 1, z + 1, t, B.GRASS)) bigOak(w, x, t, z, rnd); else if (r < 0.9) autumnTree(w, x, t, z, rnd); else bush(w, x, t, z, rnd);
      }
      for (let i = 0; i < 60; i++) { const x = 2 + Math.floor(rnd() * 76), z = 2 + Math.floor(rnd() * 76); const t = w.top(x, z); if (Math.hypot(x - 40, z - 40) > 10 && w.get(x, t, z) === B.GRASS && !w.get(x, t + 1, z)) bush(w, x, t, z, rnd); }
      covers(w, rnd, 18, { avoid: [[40, 40, 9], [13, 44, 6], [15, 15, 5]], surfaces: [B.GRASS, B.GRAVEL, B.PATH], kinds: ['sand', 'crates', 'wall', 'sand'] });
      pebbles(w, rnd, [B.GRASS, B.PATH, B.GRAVEL, B.SAND], 260);
      decorate(w, rnd, B.GRASS, [[B.TALLGRASS, 0.12], [B.FLOWER_R, 0.012], [B.FLOWER_Y, 0.012]]);
    },
    player: [40, 42],
    // stations cachées dans les maisons
    stations: [
      { type: 'box', x: 55, z: 41 },
      { type: 'wall', weapon: 'smg', x: 30, z: 33 },
      { type: 'wall', weapon: 'shotgun', x: 50, z: 29 },
      { type: 'wall', weapon: 'rifle', x: 34, z: 51 },
      { type: 'wall', weapon: 'sniper', x: 15, z: 14 },
      { type: 'perk', perk: 'cuirasse', x: 34, z: 29, wave: 1 },
      { type: 'perk', perk: 'rafale', x: 46, z: 29, wave: 3 },
      { type: 'perk', perk: 'mainleste', x: 46, z: 51, wave: 5 },
      { type: 'perk', perk: 'souffle', x: 30, z: 51, wave: 2 },
      { type: 'perk', perk: 'foulee', x: 30, z: 47, wave: 4 },
      { type: 'perk', perk: 'bandouliere', x: 13, z: 44, wave: 7 },
      { type: 'forge', x: 50, z: 51, wave: 8 },
      { type: 'bench', x: 30, z: 29 },
      { type: 'bench', x: 10, z: 46 },
    ],
  });

  // ---------- 2. Désert ----------
  list.push({
    id: 'desert', name: 'Ruines du Désert', desc: 'Ziggourat, canyon de mesas, oasis et un tombeau souterrain à explorer.', stars: 2, rpMult: 1.15, size: 80, height: 32,
    sky: [0xd89a50, 0xf6dcb0], fog: [0xecd0a2, 26, 88], hemi: [0xfff0d0, 0x8a6a40, 0.8], sun: [0xffe0a0, 1.1], weather: null,
    build(w, rnd) {
      const n = G.makeNoise(202), m = G.makeNoise(222);
      terrain(w, (x, z) => {
        let h = 6 + (n(x * 0.045, z * 0.045) - 0.5) * 7;
        if (z < 26) { const mk = m(x * 0.07, z * 0.07); const t = G.clamp((mk - 0.48) / 0.12, 0, 1); h += t * (8 + (z < 12 ? 3 : 0)); }
        return h;
      }, (x, y, z, h) => (z < 26 && y > 8 ? (y % 3 === 0 ? B.CLAY : B.REDSAND) : y > h - 3 ? B.SAND : B.SANDSTONE));
      // plateau du canyon avec rampe
      for (let z = 0; z < 26; z++) for (let x = 46; x < 76; x++) {
        if (Math.hypot(x - 60, z - 12) > 11.5) continue;
        for (let y = 1; y <= 17; y++) w.set(x, y, z, y > 14 ? (y % 3 === 0 ? B.CLAY : B.REDSAND) : B.SANDSTONE);
        for (let y = 18; y < w.H; y++) w.set(x, y, z, B.AIR);
      }
      for (let i = 0; i < 13; i++) for (let x = 58; x <= 62; x++) {
        const z = 23 + i, top = Math.max(6, 17 - i);
        for (let y = 1; y <= top; y++) w.set(x, y, z, y === top ? B.SANDSTONE : B.SAND);
        for (let y = top + 1; y < w.H; y++) w.set(x, y, z, B.AIR);
      }
      // pyramide au sommet, chambre funéraire et portail
      for (let lv = 0; lv < 7; lv++) { const r = 6 - lv; w.fill(60 - r, 18 + lv, 12 - r, 60 + r, 18 + lv, 12 + r, lv === 6 ? B.GLOW : lv % 2 ? B.SANDSTONE : B.CHISELED); }
      w.fill(57, 18, 9, 63, 20, 15, B.AIR);
      w.fill(59, 18, 16, 61, 19, 18, B.AIR);
      for (const [x, z] of [[57, 9], [63, 9], [57, 15], [63, 15]]) { w.set(x, 18, z, B.CHISELED); w.set(x, 19, z, B.CHISELED); w.set(x, 20, z, B.GLOW); }
      portalPad(w, 60, 17, 11);
      flatten(w, 40, 40, 14, 6, B.SAND, B.SANDSTONE);
      for (let lvl = 0; lvl < 6; lvl++) { const r = 7 - lvl; w.fill(40 - r, 7 + lvl, 40 - r, 40 + r, 7 + lvl, 40 + r, lvl % 2 ? B.SANDSTONE : B.STONEBRICK); }
      w.set(40, 13, 40, B.GLOW);
      for (let i = 0; i < 16; i++) {
        if (i % 4 === 0) continue;
        const a = (i / 16) * Math.PI * 2, x = Math.round(40 + Math.cos(a) * 11), z = Math.round(40 + Math.sin(a) * 11);
        const hgt = 2 + Math.floor(rnd() * 4);
        for (let y = 7; y < 7 + hgt; y++) w.set(x, y, z, B.SANDSTONE);
      }
      for (const [ax, az, bx, bz] of [[18, 30, 26, 30], [54, 58, 62, 58], [22, 52, 22, 60], [60, 30, 60, 38]]) {
        for (let x = ax; x <= bx; x++) for (let z = az; z <= bz; z++) { const t = w.top(x, z); const hh = 1 + Math.floor(rnd() * 3); for (let y = t + 1; y <= t + hh; y++) w.set(x, y, z, B.SANDSTONE); }
      }
      // oasis
      lake(w, 62, 64, 9, 6, 6, B.SAND);
      ellipse(62, 64, 12, 9, (x, z) => { const t = w.top(x, z); if (w.get(x, t, z) === B.SAND && rnd() < 0.6) w.set(x, t, z, B.GRASS); });
      for (const [x, z] of [[52, 62], [72, 66], [58, 72], [68, 56]]) palm(w, x, w.top(x, z), z);
      // tombeau souterrain
      const tx = 16, tz = 60;
      w.fill(tx - 5, 1, tz - 5, tx + 5, 6, tz + 5, B.SANDSTONE);
      w.fill(tx - 4, 2, tz - 4, tx + 4, 5, tz + 4, B.AIR);
      w.fill(tx - 4, 1, tz - 4, tx + 4, 1, tz + 4, B.STONEBRICK);
      for (const [x, z] of [[tx - 3, tz - 3], [tx + 3, tz - 3], [tx - 3, tz + 3], [tx + 3, tz + 3]]) { w.set(x, 2, z, B.STONEBRICK); w.set(x, 3, z, B.STONEBRICK); w.set(x, 5, z, B.GLOW); }
      // descente : marches depuis la surface vers le nord du tombeau
      const sy = w.top(tx, tz - 12);
      for (let i = 0; i < 8; i++) {
        const z = tz - 12 + i, floorY = Math.max(1, sy - i - 1);
        for (let dx = -1; dx <= 0; dx++) { for (let y = floorY + 1; y <= sy + 3; y++) w.set(tx + dx, y, z, B.AIR); w.set(tx + dx, floorY, z, B.SANDSTONE); }
      }
      for (let dx = -1; dx <= 0; dx++) for (let y = 2; y <= 3; y++) w.set(tx + dx, y, tz - 4 - 1 + 1, B.AIR);
      for (let dx = -1; dx <= 0; dx++) { w.set(tx + dx, 2, tz - 5, B.AIR); w.set(tx + dx, 3, tz - 5, B.AIR); w.set(tx + dx, 1, tz - 5, B.SANDSTONE); }
      // cactus et buissons morts
      portalPad(w, 16, 1, 61);
      w.desertPath = true;
      // murets (abris) à côté des stations autour de la ziggourat
      for (const [x, z] of [[40, 28], [30, 34], [50, 34], [30, 46], [50, 46], [34, 29], [46, 29], [28, 40], [52, 40], [34, 51], [31, 37]]) {
        const ox = Math.sign(x - 40), oz = Math.sign(z - 40);
        const t = w.top(x, z);
        for (let k = -1; k <= 1; k++) {
          const a = [x + ox * 1 + (oz ? k : 0), z + oz * 1 + (ox ? k : 0)];
          if (ox || oz) for (let y = t + 1; y <= t + 2; y++) w.set(a[0], y, a[1], k === 0 && y === t + 2 ? B.CHISELED : B.SANDSTONE);
        }
        if (ox && oz) { w.set(x + ox, t + 1, z, B.SANDSTONE); w.set(x, t + 1, z + oz, B.SANDSTONE); }
      }
      for (let i = 0; i < 70; i++) {
        const x = 3 + Math.floor(rnd() * 74), z = 3 + Math.floor(rnd() * 74);
        if (Math.hypot(x - 40, z - 40) < 16) continue;
        const t = w.top(x, z);
        if (w.get(x, t, z) !== B.SAND || w.get(x, t + 1, z) || w.get(x + 1, t + 1, z) || w.get(x - 1, t + 1, z)) continue;
        if (rnd() < 0.8) cactus(w, x, t, z, rnd); else deadTree(w, x, t, z, rnd, B.LOG);
      }
      covers(w, rnd, 18, { avoid: [[40, 40, 9], [60, 12, 13], [16, 60, 7]], surfaces: [B.SAND], kinds: ['sand', 'wall', 'crates'], wall: B.SANDSTONE });
      pebbles(w, rnd, [B.SAND, B.REDSAND, B.CLAY], 200, 'sandstone_side');
      decorate(w, rnd, B.SAND, [[B.DEADBUSH, 0.025]]);
      decorate(w, rnd, B.GRASS, [[B.TALLGRASS, 0.3], [B.FLOWER_Y, 0.04]]);
    },
    player: [40, 30],
    stations: [
      { type: 'box', x: 40, z: 28 },
      { type: 'wall', weapon: 'smg', x: 30, z: 34 },
      { type: 'wall', weapon: 'shotgun', x: 50, z: 34 },
      { type: 'wall', weapon: 'rifle', x: 30, z: 46 },
      { type: 'wall', weapon: 'sniper', x: 50, z: 46 },
      { type: 'perk', perk: 'cuirasse', x: 34, z: 29, wave: 1 },
      { type: 'perk', perk: 'souffle', x: 46, z: 29, wave: 2 },
      { type: 'perk', perk: 'rafale', x: 28, z: 40, wave: 3 },
      { type: 'perk', perk: 'foulee', x: 52, z: 40, wave: 4 },
      { type: 'perk', perk: 'mainleste', x: 34, z: 51, wave: 5 },
      { type: 'perk', perk: 'bandouliere', x: 18, z: 62, wave: 7 },
      { type: 'forge', x: 41, z: 40, wave: 8 },
      { type: 'bench', x: 31, z: 37 },
      { type: 'bench', x: 14, z: 63 },
      { type: 'wall', weapon: 'magnum', x: 58, z: 10, price: 1800 },
    ],
    portals: [[[60, 18, 11], [16, 2, 61]]],
  });

  // ---------- 3. Toundra ----------
  list.push({
    id: 'toundra', name: 'Avant-poste Gelé', desc: 'Fort enneigé de nuit, montagne avec belvédère, lac gelé et chalets.', stars: 3, rpMult: 1.3, size: 80, height: 36,
    sky: [0x070b1a, 0x24304e], fog: [0x26324e, 14, 58], hemi: [0x9ab0e0, 0x202838, 0.6], sun: [0xc0d0ff, 0.5], weather: 'snow', stars_: true,
    build(w, rnd) {
      const n = G.makeNoise(303);
      terrain(w, (x, z) => {
        let h = 6 + (n(x * 0.06, z * 0.06) - 0.5) * 8;
        const mt = Math.max(0, 1 - Math.hypot(x - 64, z - 62) / 17); h += mt * 15;
        return h;
      }, (x, y, z, h) => (y === h ? (h > 14 ? B.SNOW : B.SNOW) : y > h - 3 ? B.DIRT : B.STONE));
      flatten(w, 40, 40, 15, 6, B.SNOW, B.DIRT);
      const x0 = 30, x1 = 50, z0 = 30, z1 = 50;
      for (let y = 7; y <= 10; y++) {
        for (let x = x0; x <= x1; x++) { w.set(x, y, z0, B.STONEBRICK); w.set(x, y, z1, B.STONEBRICK); }
        for (let z = z0; z <= z1; z++) { w.set(x0, y, z, B.STONEBRICK); w.set(x1, y, z, B.STONEBRICK); }
      }
      for (let x = x0; x <= x1; x += 2) { w.set(x, 11, z0, B.STONEBRICK); w.set(x, 11, z1, B.STONEBRICK); }
      for (let z = z0; z <= z1; z += 2) { w.set(x0, 11, z, B.STONEBRICK); w.set(x1, 11, z, B.STONEBRICK); }
      for (let d = -1; d <= 1; d++) for (let y = 7; y <= 9; y++) { w.set(40 + d, y, z0, B.AIR); w.set(40 + d, y, z1, B.AIR); w.set(x0, y, 40 + d, B.AIR); w.set(x1, y, 40 + d, B.AIR); }
      // chemin de ronde accessible par escaliers
      for (let x = x0 + 1; x < x1; x++) { w.set(x, 10, z0 + 1, B.PLANKS); w.set(x, 10, z1 - 1, B.PLANKS); }
      stairs(w, x0 + 4, z0 + 2, 6, 3, 1, 0, B.PLANKS, 1, 3); stairs(w, x1 - 4, z1 - 2, 6, 3, -1, 0, B.PLANKS, 1, 2);
      for (const [tx, tz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { w.fill(tx - 1, 7, tz - 1, tx + 1, 12, tz + 1, B.COBBLE); w.set(tx, 13, tz, B.GLOW); }
      house(w, 34, 34, 6, 5, 6, 'e', B.PLANKS, B.LOG, B.SNOW_BLOCK);
      house(w, 42, 43, 6, 5, 6, 'w', B.PLANKS, B.LOG, B.SNOW_BLOCK);
      house(w, 32, 42, 6, 5, 6, 'e', B.STONEBRICK, B.LOG, B.SNOW_BLOCK); // armurerie
      for (const [x, z] of [[37, 41], [44, 38], [40, 22], [40, 58], [22, 40], [58, 40]]) { const t = w.top(x, z); w.set(x, t + 1, z, B.LOG); w.set(x, t + 2, z, B.LOG); w.set(x, t + 3, z, B.GLOW); }
      // lac gelé
      ellipse(16, 18, 12, 8, (x, z) => { const t = w.top(x, z); for (let y = t + 1; y < w.H; y++) w.set(x, y, z, B.AIR); w.set(x, t, z, B.ICE); });
      // chalets
      for (const [cx, cz, d] of [[10, 52, 'e'], [18, 66, 'n'], [60, 14, 's']]) { const t = w.top(cx + 2, cz + 2); flatten(w, cx + 2, cz + 2, 5, t, B.SNOW, B.DIRT); house(w, cx, cz, 5, 5, t, d, B.LOG, B.LOG, B.SNOW_BLOCK); }
      // belvédère au sommet de la montagne
      const mt = w.top(64, 62);
      for (let x = 61; x <= 67; x++) for (let z = 59; z <= 65; z++) { const t = w.top(x, z); for (let y = t + 1; y < mt; y++) w.set(x, y, z, (x + y + z) % 3 ? B.STONE : B.COBBLE); }
      w.fill(61, mt, 59, 67, mt, 65, B.PLANKS);
      for (const [x, z] of [[61, 59], [67, 59], [61, 65], [67, 65]]) for (let y = mt + 1; y <= mt + 3; y++) w.set(x, y, z, B.LOG);
      w.fill(61, mt + 4, 59, 67, mt + 4, 65, B.SNOW_BLOCK); w.set(64, mt + 3, 62, B.GLOW);
      w.belvedere = mt;
      // forêts denses : sol de terre et d'aiguilles, arbres plus hauts et plus gros
      for (const [fx, fz, rx, rz] of [[15, 37, 11, 10], [65, 30, 10, 9]]) {
        ellipse(fx, fz, rx, rz, (x, z, d) => { const t = w.top(x, z); if (w.get(x, t, z) === B.SNOW && (d < 0.8 || rnd() < 0.6)) w.set(x, t, z, rnd() < 0.12 ? B.SNOW : B.PODZOL); });
        for (let i = 0; i < rx * rz * 0.9; i++) {
          const x = Math.round(fx + (rnd() * 2 - 1) * rx), z = Math.round(fz + (rnd() * 2 - 1) * rz);
          if (Math.hypot((x - fx) / rx, (z - fz) / rz) > 1) continue;
          const t = w.top(x, z);
          if (w.get(x, t, z) !== B.PODZOL && w.get(x, t, z) !== B.SNOW) continue;
          let free = true; for (let dz = -2; dz <= 3 && free; dz++) for (let dx = -2; dx <= 3 && free; dx++) { const b = w.get(x + dx, t + 1, z + dz); if (b && !G.BLOCKS[b].plant) free = false; }
          if (!free) continue;
          if (rnd() < 0.45 && w.top(x + 1, z) === t && w.top(x, z + 1) === t && w.top(x + 1, z + 1) === t) bigPine(w, x, t, z, rnd); else tallPine(w, x, t, z, rnd);
        }
        pebbles(w, rnd, [B.PODZOL], 60, 'log_side');
      }
      decorate(w, rnd, B.PODZOL, [[B.TALLGRASS, 0.18], [B.DEADBUSH, 0.03]]);
      for (let i = 0; i < 120; i++) {
        const x = 3 + Math.floor(rnd() * 74), z = 3 + Math.floor(rnd() * 74);
        if (Math.hypot(x - 40, z - 40) < 18) continue;
        const t = w.top(x, z);
        if (!canTree(w, x, z, t, B.SNOW)) continue;
        const r = rnd();
        if (r < 0.75) { pine(w, x, t, z, rnd); for (let y = t + 2; y < w.H - 1; y++) if (w.get(x, y, z) === B.PINE && !w.get(x, y + 1, z) && rnd() < 0.5) w.set(x, y + 1, z, B.SNOW_BLOCK); }
        else if (r < 0.9) birch(w, x, t, z, rnd); else deadTree(w, x, t, z, rnd);
      }
      for (let i = 0; i < 24; i++) {
        const x = 3 + Math.floor(rnd() * 74), z = 3 + Math.floor(rnd() * 74);
        if (Math.hypot(x - 40, z - 40) < 17) continue;
        const t = w.top(x, z); if (w.get(x, t, z) !== B.SNOW) continue;
        w.set(x, t + 1, z, B.STONE); if (rnd() < 0.5) w.set(x + 1, t + 1, z, B.MOSSY);
      }
      covers(w, rnd, 16, { avoid: [[40, 40, 8], [64, 62, 6], [12, 54, 5]], surfaces: [B.SNOW], kinds: ['sand', 'crates', 'rock'] });
      pebbles(w, rnd, [B.SNOW], 160);
      decorate(w, rnd, B.SNOW, [[B.DEADBUSH, 0.01]]);
    },
    player: [38, 39],
    stations: [
      { type: 'box', x: 43, z: 44 },
      { type: 'wall', weapon: 'smg', x: 38, z: 35 },
      { type: 'wall', weapon: 'shotgun', x: 46, z: 44 },
      { type: 'wall', weapon: 'rifle', x: 33, z: 43 },
      { type: 'wall', weapon: 'sniper', x: 63, z: 61 },
      { type: 'perk', perk: 'cuirasse', x: 35, z: 37, wave: 1 },
      { type: 'perk', perk: 'souffle', x: 46, z: 46, wave: 2 },
      { type: 'perk', perk: 'rafale', x: 33, z: 45, wave: 3 },
      { type: 'perk', perk: 'mainleste', x: 19, z: 69, wave: 5 },
      { type: 'perk', perk: 'foulee', x: 21, z: 69, wave: 4 },
      { type: 'perk', perk: 'bandouliere', x: 11, z: 55, wave: 7 },
      { type: 'forge', x: 36, z: 43, wave: 8 },
      { type: 'bench', x: 35, z: 35 },
      { type: 'bench', x: 11, z: 53 },
    ],
  });

  // ---------- 4. Enfer ----------
  // tour à étages avec escaliers alternés (rangées différentes : aucun conflit entre niveaux)
  function tower(w, cx, cz, base, floors, mat, doors) {
    const top = base + floors * 4;
    w.fill(cx - 4, base, cz - 4, cx + 4, top, cz + 4, mat);
    w.fill(cx - 3, base + 1, cz - 3, cx + 3, top - 1, cz + 3, B.AIR);
    for (let k = 1; k < floors; k++) w.fill(cx - 3, base + 4 * k, cz - 3, cx + 3, base + 4 * k, cz + 3, mat);
    for (let k = 0; k < floors; k++) {
      const F = base + 4 * k, even = k % 2 === 0;
      // volée de 3 marches le long d'un mur ; après la dernière marche : palier + 2 rangées libres
      const sx = even ? cx - 2 : cx + 2, d = even ? 1 : -1, rows = even ? [cz - 3, cz - 2] : [cz + 2, cz + 3];
      flight(w, sx, 0, F, d, 0, B.DARKBRICK, rows, even ? [cz - 3, cz - 2, cz - 1] : [cz + 1, cz + 2, cz + 3]);
      // première marche tournée vers la pièce (départ en quart tournant, plus facile à prendre)
      const wz = even ? cz - 1 : cz + 1;
      w.setStair(sx, F + 1, wz, B.STAIR_DARK, even ? 3 : 2);
      w.set(sx - d, F + 4, rows[0], B.AIR); w.set(sx - d, F + 4, rows[1], B.AIR); w.set(sx - d, F + 4, wz, B.AIR);
      for (const [x, z] of [[cx - 4, cz], [cx + 4, cz - 2], [cx, cz - 4], [cx - 2, cz + 4]]) w.set(x, F + 2, z, B.AIR); // meurtrières
    }
    for (let x = cx - 4; x <= cx + 4; x += 2) { w.set(x, top + 1, cz - 4, mat); w.set(x, top + 1, cz + 4, mat); }
    for (let z = cz - 4; z <= cz + 4; z += 2) { w.set(cx - 4, top + 1, z, mat); w.set(cx + 4, top + 1, z, mat); }
    w.set(cx + 3, top + 1, cz + 3, B.GLOW); w.set(cx + 3, base + 3, cz, B.GLOW); w.set(cx - 3, base + 7, cz, B.GLOW); w.set(cx + 3, base + 11, cz, B.GLOW);
    for (const [x, z, y] of doors) { w.set(x, y, z, B.AIR); w.set(x, y + 1, z, B.AIR); }
    return top;
  }
  // chenal de lave avec rives en escalier (on peut toujours remonter)
  function lavaCell(w, x, z) { for (let y = w.top(x, z); y > 4; y--) w.set(x, y, z, B.AIR); w.set(x, 4, z, B.LAVA); w.set(x, 3, z, B.MAGMA); }
  function bankCell(w, x, z, h) {
    if (x < 0 || z < 0 || x >= w.W || z >= w.D) return;
    if (w.get(x, 4, z) === B.LAVA) return;
    const t = w.top(x, z);
    if (t > h) { for (let y = h + 1; y <= t; y++) w.set(x, y, z, B.AIR); w.set(x, h, z, B.SCORIA_DARK); }
  }
  list.push({
    id: 'enfer', name: 'Forteresse Infernale', desc: 'Volcan, lac et rivières de lave, donjon relié à deux tours par une passerelle.', stars: 4, rpMult: 1.5, size: 80, height: 40,
    sky: [0x1a0302, 0x5a1a0a], fog: [0x4a120a, 12, 66], hemi: [0xff9a70, 0x301010, 0.65], sun: [0xff6a3a, 0.6], weather: 'ash',
    build(w, rnd) {
      const n = G.makeNoise(404), m = G.makeNoise(414);
      const VX = 15, VZ = 15;
      const q = G.makeNoise(424);
      terrain(w, (x, z) => {
        let h = 7 + (n(x * 0.05, z * 0.05) - 0.5) * 4;
        const dense = m(x * 0.09, z * 0.09);
        if (dense > 0.62) h += (dense - 0.62) * 18; // zones plus accidentées
        // volcan anguleux et irrégulier
        const d = Math.hypot(x - VX, z - VZ), ang = Math.atan2(z - VZ, x - VX);
        const rough = 1 + 0.22 * Math.sin(3 * ang + 1.3) + 0.12 * Math.sin(7 * ang + 0.4);
        const cone = 18 - d * rough + (q(x * 0.3, z * 0.3) - 0.5) * 4;
        h = Math.max(h, 7 + Math.max(0, Math.round(cone)));
        return h;
      }, (x, y, z, h) => {
        const d = Math.hypot(x - VX, z - VZ);
        if (y < h - 2) return (x + y * 3 + z) % 4 === 0 ? B.VOLCROCK : B.BASALT;
        if (d < 20) { const v = q(x * 0.35 + y * 0.2, z * 0.35); return v > 0.66 ? B.SCORIA_DARK : v > 0.45 ? B.VOLCROCK : v > 0.3 ? B.BASALT : B.ASH; }
        // plusieurs pierres voisines légèrement différentes pour casser la monotonie
        const v = q(x * 0.12, z * 0.12), r = (x * 73856093 ^ z * 19349663) % 7;
        if (n(x * 0.25, z * 0.25) > 0.6) return B.REDSAND;
        const opts = v > 0.62 ? [B.SCORIA_DARK, B.BASALT2, B.SCORIA_DARK] : v > 0.4 ? [B.SCORIA, B.SCORIA3, B.SCORIA] : [B.BASALT2, B.ASH, B.SCORIA3];
        return opts[Math.abs(r) % 3];
      });
      // cratère du volcan
      const peak = w.top(VX, VZ);
      ellipse(VX, VZ, 3.6, 3.6, (x, z) => { for (let y = peak - 3; y <= peak + 1; y++) w.set(x, y, z, B.AIR); w.set(x, peak - 3, z, B.LAVA); w.set(x, peak - 4, z, B.MAGMA); });
      ellipse(VX, VZ, 5.2, 5.2, (x, z, d) => { const t = w.top(x, z); if (d > 0.69 && rnd() < 0.5) w.set(x, t, z, B.MAGMA); });
      w.lavaFlowFrom = { x: VX, z: VZ, peak };
      // plateau construit à l'ouest, cour du donjon
      for (let z = 32; z <= 56; z++) for (let x = 3; x <= 31; x++) { for (let y = 1; y < w.H; y++) w.set(x, y, z, y < 7 ? B.BASALT : y === 7 ? ((x + z) % 7 === 0 ? B.SCORIA_DARK : B.DARKBRICK) : B.AIR); }
      flatten(w, 40, 40, 13, 7, B.DARKBRICK, B.BASALT);
      // zone plate au sud-est
      flatten(w, 60, 56, 7, 7, B.SCORIA_DARK, B.BASALT);
      // rivières de lave + rives en escalier
      const riverZ = (c, x) => Math.round(c === 14 ? 14 + Math.sin(x * 0.12) * 3 : 66 + Math.cos(x * 0.1) * 3);
      for (let x = 0; x < 80; x++) for (const c of [14, 66]) {
        if (c === 14 && x < 27) continue; // la rivière nord naît au pied du volcan
        const zc = riverZ(c, x), hw = c === 14 && x < 44 ? 2 : 1; // plus large juste après le volcan
        for (let dz = -hw; dz <= hw; dz++) lavaCell(w, x, zc + dz);
        for (const s of [-1, 1]) for (let r = 1; r <= 5; r++) bankCell(w, x, zc + s * (hw + r), 3 + r);
      }
      // bras de la rivière qui alimente le lac
      for (let z = 14; z <= 32; z++) { const xc = 62 + Math.round(Math.sin(z * 0.3)); for (let dx = -1; dx <= 1; dx++) lavaCell(w, xc + dx, z); for (const s of [-1, 1]) for (let r = 1; r <= 5; r++) bankCell(w, xc + s * (1 + r), z, 3 + r); }
      // lac de lave à l'est, rives douces
      ellipse(68, 40, 8, 10, (x, z) => lavaCell(w, x, z));
      ellipse(68, 40, 10.5, 12.5, (x, z, d) => { if (Math.hypot((x - 68) / 8, (z - 40) / 10) >= 1) bankCell(w, x, z, d < 0.85 ? 4 : d < 0.93 ? 5 : 6); });
      ellipse(68, 40, 2.5, 3, (x, z) => { for (let y = 5; y <= 7; y++) w.set(x, y, z, B.OBSIDIAN); });
      w.set(68, 8, 40, B.GLOW);
      // ponts surélevés avec rampes qui rejoignent le terrain
      const bridge = (x, zc, half) => {
        const nA = w.top(x, zc - half - 3), nB = w.top(x, zc + half + 3);
        const D = G.clamp(Math.min(nA, nB), 7, 10);
        for (let dz = -half - 3; dz <= half + 3; dz++) {
          const z = zc + dz, a = Math.abs(dz), nat = w.top(x, z);
          const h = a <= half ? D : Math.round(G.lerp(D, Math.max(5, Math.min(nat, 11)), (a - half) / 3));
          const lava = w.get(x, 4, z) === B.LAVA && a <= half;
          for (let y = lava ? h - 1 : 5; y <= h; y++) w.set(x, y, z, a <= half ? B.DARKBRICK : B.SCORIA_DARK);
          for (let y = h + 1; y < w.H; y++) w.set(x, y, z, B.AIR);
        }
        return D;
      };
      for (const bx of [14, 40, 66]) for (const c of [14, 66]) {
        if (c === 14 && bx < 27) continue;
        let D = 7;
        for (let dx = -1; dx <= 1; dx++) D = bridge(bx + dx, riverZ(c, bx + dx), c === 14 && bx < 44 ? 6 : 5);
        for (const dx of [-2, 2]) { const zc = riverZ(c, bx); for (let dz = -4; dz <= 4; dz++) { w.set(bx + dx, D, zc + dz, B.DARKBRICK); w.set(bx + dx, D + 1, zc + dz, dz % 2 ? B.AIR : B.OBSIDIAN); } }
      }
      // pont sur le bras du lac
      for (let dz = -1; dz <= 1; dz++) { const z = 22 + dz; const xc = 62 + Math.round(Math.sin(z * 0.3)); for (let x = xc - 7; x <= xc + 7; x++) { const a = Math.abs(x - xc), nat = w.top(x, z), h = a <= 5 ? 8 : Math.round(G.lerp(8, Math.max(5, Math.min(nat, 11)), (a - 5) / 2)); for (let y = w.get(x, 4, z) === B.LAVA && a <= 5 ? h - 1 : 5; y <= h; y++) w.set(x, y, z, a <= 5 ? B.DARKBRICK : B.SCORIA_DARK); for (let y = h + 1; y < w.H; y++) w.set(x, y, z, B.AIR); } }
      // pont vers l'îlot du lac
      for (let x = 58; x <= 66; x++) for (let dz = 0; dz <= 1; dz++) { w.set(x, 6, 40 + dz, B.DARKBRICK); w.set(x, 5, 40 + dz, B.DARKBRICK); for (let y = 7; y < 12; y++) w.set(x, y, 40 + dz, B.AIR); }
      // donjon
      const k0 = 33, k1 = 47;
      for (let y = 8; y <= 11; y++) for (let i = k0; i <= k1; i++) { w.set(i, y, k0, B.DARKBRICK); w.set(i, y, k1, B.DARKBRICK); w.set(k0, y, i, B.DARKBRICK); w.set(k1, y, i, B.DARKBRICK); }
      for (let d = -1; d <= 1; d++) for (let y = 8; y <= 10; y++) { w.set(40 + d, y, k0, B.AIR); w.set(40 + d, y, k1, B.AIR); w.set(k0, y, 40 + d, B.AIR); w.set(k1, y, 40 + d, B.AIR); }
      for (const [tx, tz] of [[k0, k0], [k1, k0], [k0, k1], [k1, k1]]) { w.fill(tx, 8, tz, tx, 14, tz, B.OBSIDIAN); w.set(tx, 15, tz, B.MAGMA); }
      w.fill(39, 8, 39, 41, 8, 41, B.OBSIDIAN); w.set(40, 9, 40, B.GLOW);
      // recoins du donjon : murets bas et barils autour des stations
      const muret = (x0, z0, x1, z1) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) w.set(x, 8, z, B.DARKBRICK); };
      muret(42, 43, 42, 46); muret(42, 42, 46, 42);          // coin sud-est (caisse)
      muret(36, 37, 38, 37); muret(38, 34, 38, 36);          // coin nord-ouest
      muret(44, 36, 46, 36);                                  // coin nord-est
      muret(36, 43, 39, 43);                                  // coin sud-ouest
      for (const [x, z] of [[46, 41], [46, 40], [41, 34], [37, 46], [39, 46], [36, 38], [43, 34], [44, 46]]) { w.set(x, 8, z, B.BARREL); if ((x + z) % 3 === 0) w.set(x, 9, z, B.BARREL); }
      for (const [x, z] of [[24, 38], [27, 47], [19, 45], [18, 47], [29, 36]]) { w.set(x, 8, z, B.BARREL); w.set(x + 1, 8, z, B.CRATE); }
      // balcon intérieur du donjon + escalier
      w.fill(34, 11, 36, 35, 11, 43, B.DARKBRICK);
      stairs(w, 34, 46, 7, 4, 0, -1, B.DARKBRICK, 2);
      // deux tours reliées entre elles et au donjon
      tower(w, 12, 40, 7, 3, B.DARKBRICK, [[16, 40, 8], [16, 41, 8], [16, 40, 12], [16, 41, 12], [9, 44, 16], [10, 44, 16]]);
      tower(w, 12, 52, 7, 4, B.DARKBRICK, [[16, 52, 8], [16, 53, 8], [9, 48, 16], [10, 48, 16]]);
      // passerelle haute tour 1 → donjon (on passe dessous), piliers sur les côtés
      for (let x = 17; x <= 33; x++) for (const z of [40, 41]) w.set(x, 11, z, B.DARKBRICK);
      for (let x = 17; x <= 33; x++) { w.set(x, 12, 39, B.DARKBRICK); w.set(x, 12, 42, B.DARKBRICK); w.set(x, 11, 39, B.DARKBRICK); w.set(x, 11, 42, B.DARKBRICK); }
      for (let x = 19; x <= 31; x += 4) for (const z of [39, 42]) for (let y = 8; y <= 10; y++) w.set(x, y, z, B.OBSIDIAN);
      for (let x = 22; x <= 30; x += 8) w.set(x, 12, 42, B.AIR);
      // escalier du sol vers la passerelle
      stairs(w, 25, 43, 7, 4, 1, 0, B.DARKBRICK, 2, 3); // on monte vers +x puis on débouche à gauche sur la passerelle
      for (let x = 25; x <= 28; x++) w.set(x, 12, 42, B.AIR);
      // pont couvert entre les deux tours (3e niveau)
      for (let z = 45; z <= 47; z++) for (let x = 9; x <= 10; x++) { w.set(x, 15, z, B.DARKBRICK); w.set(x, 18, z, B.DARKBRICK); w.set(x, 16, z, B.AIR); w.set(x, 17, z, B.AIR); }
      for (let z = 45; z <= 47; z++) { for (let y = 15; y <= 18; y++) { w.set(8, y, z, y === 16 || y === 17 ? (z % 2 ? B.AIR : B.DARKBRICK) : B.DARKBRICK); w.set(11, y, z, y === 16 || y === 17 ? (z % 2 ? B.AIR : B.DARKBRICK) : B.DARKBRICK); } }
      // bâtisses au sol
      house(w, 20, 33, 6, 5, 7, 's', B.DARKBRICK, B.OBSIDIAN, B.DARKBRICK);
      house(w, 21, 48, 7, 6, 7, 'n', B.DARKBRICK, B.OBSIDIAN, B.DARKBRICK);
      house(w, 4, 46, 4, 6, 7, 'e', B.DARKBRICK, B.OBSIDIAN, B.DARKBRICK);
      for (const [x, z] of [[18, 45], [28, 54], [6, 34]]) { w.set(x, 8, z, B.OBSIDIAN); w.set(x, 9, z, B.OBSIDIAN); w.set(x, 10, z, B.MAGMA); }
      // piliers d'obsidienne (moins nombreux), rochers de scories près du volcan
      for (let i = 0; i < 12; i++) {
        const x = 3 + Math.floor(rnd() * 74), z = 3 + Math.floor(rnd() * 74);
        if (Math.hypot(x - 40, z - 40) < 15 || (x < 33 && z > 30 && z < 58) || Math.hypot(x - VX, z - VZ) < 9) continue;
        const t = w.top(x, z); if (t < 6) continue;
        const hh = 2 + Math.floor(rnd() * 5);
        for (let y = t + 1; y <= t + hh; y++) w.set(x, y, z, B.OBSIDIAN);
        if (rnd() < 0.25) w.set(x, t + hh + 1, z, B.GLOW);
      }
      for (let i = 0; i < 40; i++) {
        const a = rnd() * Math.PI * 2, r = 6 + rnd() * 14, x = Math.round(VX + Math.cos(a) * r), z = Math.round(VZ + Math.sin(a) * r);
        if (x < 1 || z < 1 || x > 78 || z > 78) continue;
        const t = w.top(x, z); if (w.get(x, t, z) === B.LAVA || w.get(x, t, z) === B.MAGMA) continue;
        w.set(x, t + 1, z, rnd() < 0.5 ? B.SCORIA : B.SCORIA_DARK); if (rnd() < 0.5) w.set(x + 1, t + 1, z, B.SCORIA); if (rnd() < 0.3) w.set(x, t + 2, z, B.SCORIA_DARK);
      }
      for (let i = 0; i < 30; i++) { const x = 3 + Math.floor(rnd() * 74), z = 3 + Math.floor(rnd() * 74); if (Math.hypot(x - 40, z - 40) < 15 || (x < 33 && z > 30 && z < 58)) continue; const t = w.top(x, z); if ([B.SCORIA, B.SCORIA_DARK, B.REDSAND].includes(w.get(x, t, z)) && !w.get(x, t + 1, z)) deadTree(w, x, t, z, rnd, B.OBSIDIAN); }
      for (let i = 0; i < 30; i++) { const x = Math.floor(rnd() * 80), z = Math.floor(rnd() * 80); const t = w.top(x, z); if (t >= 6 && [B.SCORIA, B.SCORIA_DARK].includes(w.get(x, t, z))) w.set(x, t, z, B.MAGMA); }
      covers(w, rnd, 18, { avoid: [[40, 40, 9], [VX, VZ, 12], [68, 40, 13], [16, 44, 15]], surfaces: [B.SCORIA, B.SCORIA_DARK, B.REDSAND], kinds: ['wall', 'rock', 'wall'], wall: B.DARKBRICK });
      pebbles(w, rnd, [B.SCORIA, B.SCORIA_DARK, B.REDSAND, B.DARKBRICK], 260, 'scoria');
      decorate(w, rnd, B.REDSAND, [[B.DEADBUSH, 0.04]]);
    },
    player: [40, 37],
    stations: [
      { type: 'box', x: 44, z: 44 },
      { type: 'wall', weapon: 'smg', x: 36, z: 35 },
      { type: 'wall', weapon: 'shotgun', x: 45, z: 37 },
      { type: 'wall', weapon: 'rifle', x: 37, z: 45 },
      { type: 'wall', weapon: 'sniper', x: 12, z: 42, top: true },
      { type: 'perk', perk: 'cuirasse', x: 21, z: 34, wave: 1 },
      { type: 'perk', perk: 'souffle', x: 24, z: 34, wave: 2 },
      { type: 'perk', perk: 'rafale', x: 22, z: 52, wave: 3 },
      { type: 'perk', perk: 'mainleste', x: 26, z: 52, wave: 5 },
      { type: 'perk', perk: 'foulee', x: 5, z: 47, wave: 4 },
      { type: 'perk', perk: 'bandouliere', x: 68, z: 42, wave: 7 },
      { type: 'forge', x: 43, z: 40, wave: 8 },
      { type: 'bench', x: 45, z: 35 },
      { type: 'bench', x: 22, z: 50 },
    ],
  });

  // ---------- 5. Ville ----------
  const ROADS = [22, 48, 74, 100];
  list.push({
    id: 'ville', name: 'Ville Fantôme', desc: 'Ville dévastée : immeubles visitables, quartier serré de ruelles, cratère, égouts sous les rues.', stars: 3, rpMult: 1.35, size: 128, height: 48,
    sky: [0x6a7a90, 0xb8bec4], fog: [0xa8aeb4, 24, 110], hemi: [0xd6dce2, 0x4a4a50, 0.72], sun: [0xf6eee0, 0.8], weather: null,
    build(w, rnd) {
      const g = 12, S = 128;
      for (let z = 0; z < S; z++) for (let x = 0; x < S; x++) {
        w.set(x, 0, z, B.BEDROCK);
        for (let y = 1; y < g; y++) w.set(x, y, z, B.STONE);
        w.set(x, g, z, B.CONCRETE);
      }
      const onRoad = (v) => ROADS.some((c) => Math.abs(v - c) <= 3);
      const onWalk = (v) => ROADS.some((c) => Math.abs(v - c) >= 4 && Math.abs(v - c) <= 5);
      for (let z = 0; z < S; z++) for (let x = 0; x < S; x++) {
        if (onRoad(x) || onRoad(z)) {
          const line = (ROADS.includes(x) && !onRoad(z)) || (ROADS.includes(z) && !onRoad(x));
          w.set(x, g, z, line ? B.ASPHALT_LINE : rnd() < 0.08 ? B.ASPHALT_CRACK : B.ASPHALT);
        } else if (onWalk(x) || onWalk(z)) w.set(x, g, z, B.SIDEWALK);
      }
      // égouts : coque puis creusement
      const tunnel = (c, axis, fn) => { for (let a = 0; a < S; a++) for (let o = -2; o <= 2; o++) { const x = axis === 'z' ? c + o : a, z = axis === 'z' ? a : c + o; fn(x, z, o, a); } };
      for (const c of ROADS) for (const axis of ['x', 'z']) tunnel(c, axis, (x, z) => { for (let y = 5; y <= 10; y++) w.set(x, y, z, B.SEWER); });
      for (const c of ROADS) for (const axis of ['x', 'z']) tunnel(c, axis, (x, z, o, a) => {
        if (Math.abs(o) > 1) return;
        for (let y = 7; y <= 9; y++) w.set(x, y, z, B.AIR);
        if (o === 0) w.set(x, 6, z, B.WATER); else w.set(x, 6, z, B.SEWER);
        if (a % 8 === 0 && o === 0) w.set(x, 10, z, B.GLOW);
      });
      const carve = (x0, z0, x1, z1) => {
        const alongX = z0 === z1;
        const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0), sx = Math.sign(x1 - x0), sz = Math.sign(z1 - z0);
        for (let pass = 0; pass < 2; pass++) for (let i = 0; i <= len; i++) for (let o = -2; o <= 2; o++) {
          const x = alongX ? x0 + sx * i : x0 + o, z = alongX ? z0 + o : z0 + sz * i;
          if (pass === 0) { for (let y = 5; y <= 10; y++) { const b = w.get(x, y, z); if (b !== B.AIR && b !== B.WATER && b !== B.GLOW) w.set(x, y, z, B.SEWER); } continue; }
          if (Math.abs(o) > 1) continue;
          for (let y = 7; y <= 9; y++) w.set(x, y, z, B.AIR);
          if (w.get(x, 6, z) !== B.WATER) w.set(x, 6, z, B.SEWER);
          if (i % 7 === 3 && o === 0) w.set(x, 10, z, B.GLOW);
        }
      };
      const room = (cx, cz) => {
        for (let x = cx - 3; x <= cx + 3; x++) for (let z = cz - 3; z <= cz + 3; z++) for (let y = 5; y <= 11; y++) { const b = w.get(x, y, z); if (b !== B.AIR && b !== B.WATER) w.set(x, y, z, B.SEWER); }
        for (let x = cx - 2; x <= cx + 2; x++) for (let z = cz - 2; z <= cz + 2; z++) { for (let y = 7; y <= 10; y++) w.set(x, y, z, B.AIR); w.set(x, 6, z, B.MOSSY); }
        w.set(cx, 6, cz, B.WATER); w.set(cx, 5, cz, B.SEWER); w.set(cx, 11, cz, B.GLOW);
        w.set(cx - 2, 7, cz - 2, B.CRATE); w.set(cx + 2, 7, cz + 2, B.BARREL); w.set(cx + 2, 8, cz + 2, B.CRATE);
      };
      carve(22, 35, 48, 35); carve(61, 22, 61, 48); carve(35, 48, 35, 74); carve(48, 87, 74, 87);
      carve(87, 14, 87, 48); carve(22, 9, 35, 9); carve(9, 61, 9, 74); carve(74, 113, 100, 113); carve(113, 74, 113, 100); carve(87, 100, 87, 120);
      room(87, 14); room(35, 9); room(9, 61); room(61, 35); room(35, 61); room(87, 120); room(113, 87);
      for (const c of ROADS) for (const a of [0, 1, S - 2, S - 1]) for (let o = -2; o <= 2; o++) for (let y = 5; y <= 10; y++) { w.set(c + o, y, a, B.SEWER); w.set(a, y, c + o, B.SEWER); }
      for (const c of ROADS) for (const a of [2, S - 3]) { w.set(c, 8, a, B.GRATE); w.set(a, 8, c, B.GRATE); }
      // accès aux égouts depuis le trottoir : escalier + couloir vers la galerie
      const walkAccess = (c, axis, a0, dir) => {
        const lane = c + 4;
        for (let k = 1; k <= 6; k++) {
          const a = a0 + dir * k, x = axis === 'z' ? lane : a, z = axis === 'z' ? a : lane;
          for (let y = 13 - k; y <= g + 2; y++) w.set(x, y, z, B.AIR);
          w.setStair(x, 12 - k, z, B.STAIR_STONE, axis === 'z' ? (dir > 0 ? 3 : 2) : (dir > 0 ? 1 : 0));
          for (const o of [-1, 1]) { const xx = axis === 'z' ? x + o : x, zz = axis === 'z' ? z : z + o; for (let y = 12 - k; y <= g; y++) if (!w.get(xx, y, zz)) w.set(xx, y, zz, B.SEWER); }
        }
        const ae = a0 + dir * 6;
        for (let l = c + 1; l <= c + 4; l++) { const x = axis === 'z' ? l : ae, z = axis === 'z' ? ae : l; w.set(x, 6, z, B.SEWER); for (let y = 7; y <= 9; y++) w.set(x, y, z, B.AIR); }
        // garde-corps autour de la trémie
        for (let k = 0; k <= 6; k++) { const a = a0 + dir * k, x = axis === 'z' ? lane + 1 : a, z = axis === 'z' ? a : lane + 1; if (k > 0) w.details.push({ box: true, x0: x + 0.45, y0: g + 1, z0: z, x1: x + 0.55, y1: g + 1.9, z1: z + 1, tile: 'metal' }); }
      };
      walkAccess(48, 'z', 56, 1); walkAccess(48, 'x', 40, -1); walkAccess(22, 'z', 30, 1); walkAccess(74, 'z', 66, -1); walkAccess(22, 'x', 60, 1); walkAccess(74, 'x', 30, -1); walkAccess(100, 'z', 60, 1); walkAccess(100, 'x', 84, -1);
      // îlots
      const blocks = [[0, 16], [28, 42], [54, 68], [80, 94], [106, 127]];
      const plan = [
        ['tower6', 'apart4', 'shopPark', 'apart3'],
        ['parking', 'tower7', 'apart5', 'tower6'],
        ['apart4', 'shopPark', 'park', 'shop'],
        ['park', 'tower5', 'apart3', 'tower6'],
      ];
      const damaged = new Set(['0,0', '3,1', '1,3', '3,3', '2,0']);
      for (let bz = 0; bz < 5; bz++) for (let bx = 0; bx < 5; bx++) {
        const [xa, xb] = blocks[bx], [za, zb] = blocks[bz];
        const x0 = xa + 1, x1 = xb - 1, z0 = za + 1, z1 = zb - 1;
        if (bx === 4 || bz === 4) {
          // quartier serré façon New York / Paris : immeubles étroits, ruelles, graffitis, escaliers de secours
          for (let z = za; z <= zb; z++) for (let x = xa; x <= xb; x++) w.set(x, g, z, rnd() < 0.15 ? B.ASPHALT_CRACK : B.COBBLE);
          const xs = bx === 4 ? [[107, 115], [118, 126]] : [[x0, x1]];
          const zs = bz === 4 ? [[107, 115], [118, 126]] : [[z0, z1]];
          for (const [ax, bxx] of xs) for (const [az, bzz] of zs) {
            const nf = 4 + Math.floor(rnd() * 4);
            building(w, ax, az, bxx, bzz, nf, { g, wall: rnd() < 0.5 ? B.BRICK : B.STONEBRICK, floor: B.PLANKS, stair: B.PLANKS, graffiti: true, damaged: rnd() < 0.4, fireEscape: bx === 4 ? (ax === 107 ? 'e' : null) : (rnd() < 0.5 ? 'e' : 'w') }, rnd);
          }
          // poubelles et caisses dans les ruelles
          for (let i = 0; i < 6; i++) { const x = bx === 4 ? 116 + (i % 2) : x0 + Math.floor(rnd() * (x1 - x0)), z = bz === 4 ? 116 + (i % 2) : z0 + Math.floor(rnd() * (z1 - z0)); if (!w.get(x, g + 1, z) && x > 0 && z > 0 && x < S - 1 && z < S - 1) w.set(x, g + 1, z, G.pick([B.BIN, B.BIN, B.CRATE, B.BARREL])); }
          continue;
        }
        const type = plan[bz][bx], dmg = damaged.has(bx + ',' + bz);
        if (type.startsWith('tower')) building(w, x0, z0, x1, z1, Number(type.slice(5)), { g, wall: B.CONCRETE_DARK, floor: B.CONCRETE, glassFull: true, damaged: dmg }, rnd);
        else if (type.startsWith('apart')) building(w, x0 + 1, z0 + 1, x1 - 1, z1 - 1, Number(type.slice(5)), { g, wall: B.BRICK, floor: B.PLANKS, stair: B.PLANKS, damaged: dmg }, rnd);
        else if (type === 'shop') { shop(w, x0 + 2, z0 + 2, x1 - 2, z1 - 6, g, B.WHITEWALL); }
        else if (type === 'shopPark') {
          shop(w, x0 + 1, z0 + 1, x1 - 1, z0 + 6, g, B.WHITEWALL);
          for (let z = z0 + 9; z <= z1; z++) for (let x = x0; x <= x1; x++) w.set(x, g, z, (x - x0) % 4 === 0 ? B.ASPHALT_LINE : B.ASPHALT);
          for (let x = x0 + 1; x < x1 - 2; x += 4) if (rnd() < 0.7) car(w, x, z0 + 10, g, 'z');
        } else if (type === 'parking') {
          for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) w.set(x, g, z, (z - z0) % 5 === 0 ? B.ASPHALT_LINE : B.ASPHALT);
          for (let z = z0 + 1; z < z1 - 2; z += 5) for (let x = x0 + 1; x < x1 - 3; x += 6) if (rnd() < 0.7) car(w, x, z, g, 'x');
        } else if (type === 'park') {
          for (let z = za; z <= zb; z++) for (let x = xa; x <= xb; x++) if (!onRoad(x) && !onRoad(z) && !onWalk(x) && !onWalk(z)) w.set(x, g, z, B.GRASS);
          const cx = Math.floor((xa + xb) / 2), cz = Math.floor((za + zb) / 2);
          lake(w, cx + 2, cz + 2, 3.5, 2.5, g, B.SAND);
          for (let i = 0; i < 9; i++) { const x = x0 + 1 + Math.floor(rnd() * (x1 - x0 - 2)), z = z0 + 1 + Math.floor(rnd() * (z1 - z0 - 2)); if (Math.hypot(x - cx - 2, z - cz - 2) < 6) continue; if (canTree(w, x, z, g, B.GRASS)) (rnd() < 0.5 ? tree : deadTree)(w, x, g, z, rnd); }
          for (let x = x0 + 1; x < x1; x += 4) w.set(x, g + 1, z0 + 1, B.PLANKS);
        }
      }
      // routes cassées : nids-de-poule et gravats
      for (let i = 0; i < 26; i++) {
        const c = G.pick(ROADS), a = 3 + Math.floor(rnd() * (S - 6)), o = Math.floor(rnd() * 7) - 3;
        const x = rnd() < 0.5 ? c + o : a, z = x === c + o ? a : c + o;
        if (Math.abs(x - 48) < 4 && Math.abs(z - 48) < 4) continue;
        for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [-1, 0]]) if (rnd() < 0.8 && w.get(x + dx, g, z + dz) !== B.GRATE) w.set(x + dx, g, z + dz, rnd() < 0.5 ? B.GRAVEL : B.RUBBLE);
        if (rnd() < 0.4) w.set(x, g + 1, z, B.RUBBLE);
      }
      // cratère de bombe qui ouvre sur les égouts
      const crater = (cx, cz, r) => {
        const cn = G.makeNoise(77);
        for (let x = cx - r - 3; x <= cx + r + 3; x++) for (let z = cz - r - 3; z <= cz + r + 3; z++) {
          const d = Math.hypot(x - cx, z - cz), ang = Math.atan2(z - cz, x - cx);
          const rr = r * (0.78 + 0.32 * cn(Math.cos(ang) * 2 + 5, Math.sin(ang) * 2 + 5) + 0.08 * Math.sin(ang * 5));
          if (d > rr) continue;
          const tunnel = w.get(x, 8, z) === B.AIR && w.get(x, 7, z) === B.AIR; // couloir d'égout sous le cratère
          let floor = Math.max(6, g - Math.round((1 - d / rr) * 7 + (cn(x * 0.7, z * 0.7) - 0.5) * 2));
          if (tunnel || floor <= 7 && Math.abs(x - 74) <= 1) floor = 6;
          for (let y = floor + 1; y <= g + 3; y++) w.set(x, y, z, B.AIR);
          if (!tunnel && w.get(x, floor, z) !== B.WATER) w.set(x, floor, z, d > rr - 1.5 ? B.ASPHALT_CRACK : rnd() < 0.45 ? B.RUBBLE : rnd() < 0.5 ? B.GRAVEL : B.ASH);
          if (!tunnel && floor > 7 && rnd() < 0.06) w.set(x, floor + 1, z, rnd() < 0.5 ? B.RUBBLE : B.ASPHALT_CRACK);
        }
        for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI * 2, x = Math.round(cx + Math.cos(a) * (r + 1)), z = Math.round(cz + Math.sin(a) * (r + 1)); if (!w.get(x, g + 1, z)) w.set(x, g + 1, z, B.RUBBLE); }
      };
      crater(74, 36, 7);
      // voitures abandonnées sur les routes
      for (const c of ROADS) for (let a = 4; a < S - 6; a += 10) {
        if (onRoad(a) || onRoad(a + 3) || rnd() < 0.45) continue;
        if (Math.abs(c - 74) < 1 && Math.abs(a - 36) < 9) continue;
        car(w, c - 3, a, g, 'z');
        if (rnd() < 0.4) car(w, a, c + 2, g, 'x');
      }
      // vrais lampadaires : mât, bras et lanterne
      for (const c of ROADS) for (let a = 6; a < S - 2; a += 12) {
        if (onRoad(a)) continue;
        for (const [x, z, ax, az] of [[c - 4, a, 1, 0], [a, c + 4, 0, -1]]) {
          if (w.get(x, g + 1, z) || w.get(x, g, z) !== B.SIDEWALK) continue;
          w.details.push({ box: true, x0: x + 0.42, y0: g + 1, z0: z + 0.42, x1: x + 0.58, y1: g + 4.9, z1: z + 0.58, tile: 'concrete_dark' });
          w.details.push({ box: true, x0: x + 0.4 + Math.min(0, ax) * 1.2, y0: g + 4.75, z0: z + 0.4 + Math.min(0, az) * 1.2, x1: x + 0.6 + Math.max(0, ax) * 1.2, y1: g + 4.9, z1: z + 0.6 + Math.max(0, az) * 1.2, tile: 'metal' });
          const lx = x + 0.5 + ax * 1.25, lz = z + 0.5 + az * 1.25;
          w.details.push({ box: true, x0: lx - 0.22, y0: g + 4.45, z0: lz - 0.22, x1: lx + 0.22, y1: g + 4.75, z1: lz + 0.22, tile: 'glowstone', bright: true });
          w.details.push({ box: true, x0: x + 0.35, y0: g + 1, z0: z + 0.35, x1: x + 0.65, y1: g + 1.3, z1: z + 0.65, tile: 'concrete_dark' });
        }
      }
      // poubelles sur les trottoirs
      for (let i = 0; i < 40; i++) { const c = G.pick(ROADS), a = 3 + Math.floor(rnd() * (S - 6)), side = rnd() < 0.5 ? -5 : 5; const x = rnd() < 0.5 ? c + side : a, z = x === c + side ? a : c + side; if (w.get(x, g, z) === B.SIDEWALK && !w.get(x, g + 1, z)) w.set(x, g + 1, z, rnd() < 0.85 ? B.BIN : B.RUBBLE); }
      // mur d'enceinte surmonté de barbelés
      for (let i = 0; i < S; i++) for (const [x, z] of [[i, 0], [i, S - 1], [0, i], [S - 1, i]]) {
        for (let y = g + 1; y <= g + 4; y++) w.set(x, y, z, i % 6 === 0 ? B.CONCRETE_DARK : B.WALLPANEL);
        w.set(x, g + 5, z, i % 6 === 0 ? B.CONCRETE_DARK : B.BARBED);
      }
      covers(w, rnd, 34, { avoid: [[48, 48, 4], [74, 36, 8]], surfaces: [B.ASPHALT, B.ASPHALT_LINE, B.SIDEWALK, B.CONCRETE, B.COBBLE], kinds: ['barrier', 'sand', 'barrier', 'crates'] });
      pebbles(w, rnd, [B.ASPHALT, B.SIDEWALK, B.CONCRETE, B.GRASS, B.COBBLE], 320, 'concrete_dark');
      decorate(w, rnd, B.GRASS, [[B.TALLGRASS, 0.2], [B.DEADBUSH, 0.04]]);
    },
    player: [48, 48],
    // stations dans les bâtiments autour du point d'apparition
    stations: [
      { type: 'box', x: 58, z: 58 },
      { type: 'wall', weapon: 'smg', x: 40, z: 40 },
      { type: 'wall', weapon: 'shotgun', x: 65, z: 39 },
      { type: 'wall', weapon: 'rifle', x: 39, z: 57 },
      { type: 'wall', weapon: 'sniper', x: 35, z: 35, top: true },
      { type: 'perk', perk: 'cuirasse', x: 40, z: 30, wave: 1 },
      { type: 'perk', perk: 'souffle', x: 30, z: 40, wave: 2 },
      { type: 'perk', perk: 'rafale', x: 65, z: 31, wave: 3 },
      { type: 'perk', perk: 'mainleste', x: 66, z: 57, wave: 5 },
      { type: 'perk', perk: 'foulee', x: 31, z: 57, wave: 4 },
      { type: 'perk', perk: 'bandouliere', x: 34, z: 38, wave: 7, top: true },
      { type: 'forge', x: 49, z: 30, wave: 8 },
      { type: 'bench', x: 34, z: 57 },
      { type: 'bench', x: 39, z: 31 },
    ],
    spawnsFn(S) {
      const s = [];
      for (const c of ROADS) {
        s.push([c - 3, 2], [c - 3, S - 3], [2, c - 3], [S - 3, c - 3]);
        s.push([c + 1, 3], [c + 1, S - 4], [3, c + 1], [S - 4, c + 1]);
      }
      for (const [x, z] of [[8, 8], [116, 8], [8, 116], [116, 116], [8, 48], [116, 48], [48, 8], [48, 116], [87, 14], [35, 9], [9, 61], [87, 120], [113, 87]]) s.push([x, z]);
      return s;
    },
  });

  // vue de dessus colorée (mini-carte et vignettes)
  const COLS = { 1: 0x5fa83a, 2: 0x8a5a35, 3: 0x7d7d7d, 4: 0x8a8a8a, 5: 0x6b4c2c, 6: 0xa98653, 7: 0x3e7d24, 8: 0xdccf8e, 9: 0xd2bf7e, 10: 0xf2f6fa, 11: 0x9cc7f0, 12: 0x9c4a3a, 13: 0x3b3a40, 14: 0x2d1f40, 15: 0xf06a10, 16: 0x2e64c8, 17: 0xffe080, 18: 0x2f7424, 19: 0x2b5a3a, 20: 0xc6c9cc, 21: 0x857f7b, 23: 0x4a1a20, 24: 0xb58a4e, 25: 0xd6b23a, 26: 0x7a7a7a, 27: 0x5c7a44, 28: 0xa04010, 29: 0xb8643a, 30: 0x5fa83a, 31: 0x5fa83a, 32: 0x5aa03a, 33: 0xd8b040, 34: 0xa08050, 35: 0x6a4426, 36: 0x9a7a48, 37: 0x3a3b3e, 38: 0x4a4b3e, 39: 0xb0b0aa, 40: 0xa8a6a0, 41: 0x6a6a6e, 42: 0x8ab0c8, 43: 0x5a5e52, 44: 0x4a3a3e, 45: 0x303030, 46: 0xb02020, 47: 0x2050b0, 48: 0xd8d8d8, 49: 0xc03030, 50: 0xe2ddd2, 52: 0x8a6a40, 53: 0xe8eef4, 54: 0xb06a40 };
  function topDown(w) {
    const c = document.createElement('canvas'); c.width = w.W; c.height = w.D;
    const ctx = c.getContext('2d');
    for (let z = 0; z < w.D; z++) for (let x = 0; x < w.W; x++) {
      let y = w.H - 1, b = 0;
      for (; y >= 0; y--) { b = w.get(x, y, z); if (b && !G.BLOCKS[b].plant) break; }
      const col = COLS[b] || 0x555555;
      const shade = G.clamp(0.55 + y * (w.H > 40 ? 0.02 : 0.04), 0.5, 1.25);
      ctx.fillStyle = 'rgb(' + Math.min(255, ((col >> 16) & 255) * shade) + ',' + Math.min(255, ((col >> 8) & 255) * shade) + ',' + Math.min(255, (col & 255) * shade) + ')';
      ctx.fillRect(x, z, 1, 1);
    }
    return c;
  }
  G.topDown = topDown;

  // lave qui s'écoule comme dans Minecraft : elle tombe, puis s'étale vers la pente la plus proche
  function lavaFlow(w, { x: VX, z: VZ, peak }) {
    const ly = peak - 3;
    // brèche dans le bord du cratère, côté est
    for (let x = VX + 2; x <= VX + 6; x++) for (let z = VZ - 1; z <= VZ + 1; z++) { for (let y = ly; y <= peak + 2; y++) w.set(x, y, z, B.AIR); w.set(x, ly - 1, z, B.MAGMA); if (Math.abs(z - VZ) <= 0) w.set(x, ly, z, x <= VX + 3 ? B.LAVA : B.LAVA_FLOW); }
    let x = VX + 6, y = ly, z = VZ, prevDir = [1, 0];
    const target = (xx) => Math.round(14 + Math.sin(xx * 0.12) * 3);
    const place = (px, py, pz) => { if (w.get(px, py, pz) !== B.LAVA) w.set(px, py, pz, B.LAVA_FLOW); };
    for (let step = 0; step < 500; step++) {
      place(x, y, z);
      if (w.get(x, 4, z) === B.LAVA && y <= 6) break; // arrivée dans la rivière
      if (y <= 4) break;
      // chute
      const below = w.get(x, y - 1, z);
      if (!w.isSolid(x, y - 1, z) && below !== B.LAVA) { y--; continue; }
      if (below === B.LAVA) break;
      // cherche la pente la plus proche (jusqu'à 5 blocs), comme la lave qui coule
      let best = null, bd = 99;
      for (const [dx, dz] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
        for (let k = 1; k <= 5; k++) {
          const cx = x + dx * k, cz = z + dz * k;
          if (w.isSolid(cx, y, cz)) break;
          if (!w.isSolid(cx, y - 1, cz)) { const score = k + (dx === -1 ? 2 : 0) + (dz !== 0 && Math.sign(target(cx) - cz) !== dz ? 1 : 0); if (score < bd) { bd = score; best = [dx, dz]; } break; }
        }
      }
      if (!best) {
        // terrain plat ou bosse : on avance vers la rivière, quitte à creuser un peu
        const dz = Math.sign(target(x) - z);
        best = dz && Math.abs(target(x) - z) > 1 && Math.random() < 0.5 ? [0, dz] : [1, 0];
        if (w.isSolid(x + best[0], y, z + best[1])) { w.set(x + best[0], y, z + best[1], B.AIR); w.set(x + best[0], y + 1, z + best[1], B.AIR); }
      }
      // un peu de largeur sur les replats
      if (Math.random() < 0.35) { const [sx, sz] = [-best[1], best[0]]; if (!w.isSolid(x + sx, y, z + sz) && w.isSolid(x + sx, y - 1, z + sz)) place(x + sx, y, z + sz); }
      x += best[0]; z += best[1]; prevDir = best;
      if (x >= w.W - 1) break;
    }
  }
  // comblement des cuvettes : depuis chaque case on peut toujours ressortir (descendre, ou monter d'un bloc au plus)
  function fillPits(w, X0, Z0, X1, Z1, sides, topB, underB) {
    const W = X1 - X0 + 1, D = Z1 - Z0 + 1;
    const hgt = new Int16Array(W * D), done = new Uint8Array(W * D);
    const liquid = (x, z) => { const t = w.top(x, z), a = w.get(x, t + 1, z); return a && G.BLOCKS[a].liquid; };
    for (let z = Z0; z <= Z1; z++) for (let x = X0; x <= X1; x++) hgt[(z - Z0) * W + (x - X0)] = w.top(x, z);
    const pq = [];
    const push = (i, h) => { pq.push([h, i]); let k = pq.length - 1; while (k > 0) { const q = (k - 1) >> 1; if (pq[q][0] <= pq[k][0]) break; [pq[q], pq[k]] = [pq[k], pq[q]]; k = q; } };
    const pop = () => { const top = pq[0], last = pq.pop(); if (pq.length) { pq[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < pq.length && pq[l][0] < pq[m][0]) m = l; if (r < pq.length && pq[r][0] < pq[m][0]) m = r; if (m === k) break; [pq[m], pq[k]] = [pq[k], pq[m]]; k = m; } } return top; };
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const i = z * W + x;
      if (liquid(x + X0, z + Z0)) { done[i] = 1; continue; }
      const edge = (sides.includes('s') && z === D - 1) || (sides.includes('n') && z === 0) || (sides.includes('w') && x === 0) || (sides.includes('e') && x === W - 1);
      if (edge) { done[i] = 1; push(i, hgt[i]); }
    }
    while (pq.length) {
      const [h, i] = pop(); const x = i % W, z = (i / W) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= D) continue;
        const j = nz * W + nx; if (done[j]) continue; done[j] = 1;
        if (hgt[j] < h - 1) { const wx = nx + X0, wz = nz + Z0; for (let y = hgt[j] + 1; y <= h - 1; y++) w.set(wx, y, wz, y === h - 1 ? topB : underB); hgt[j] = h - 1; }
        push(j, Math.max(hgt[j], h - 1));
      }
    }
  }
  // désert : chemin de pierre naturel et sinueux qui descend du plateau de la pyramide vers l'ouest,
  // et comblement des crevasses où l'on restait bloqué
  function desertPath(w, rnd) {
    fillPits(w, 0, 0, 79, 30, ['s'], B.REDSAND, B.SANDSTONE);
    // chemin sinueux : du bord ouest du plateau jusqu'au sol au sud-ouest
    const A = [49, 13], Bp = [33, 31];
    const hA = 17, hB = w.top(Bp[0], Bp[1]);
    let prevH = hA;
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const px = A[0] + (Bp[0] - A[0]) * t + Math.sin(t * Math.PI * 2.4) * 3.5, pz = A[1] + (Bp[1] - A[1]) * t + Math.cos(t * Math.PI * 1.7) * 2.5;
      let h = Math.round(hA + (hB - hA) * Math.pow(t, 0.85));
      if (h < prevH - 1) h = prevH - 1; prevH = h;
      const rad = 1.4 + Math.sin(t * 17) * 0.5 + rnd() * 0.4;
      for (let x = Math.floor(px - rad); x <= Math.ceil(px + rad); x++) for (let z = Math.floor(pz - rad); z <= Math.ceil(pz + rad); z++) {
        if (Math.hypot(x - px, z - pz) > rad) continue;
        const top = w.top(x, z);
        for (let y = h + 1; y <= Math.max(top, h + 3); y++) if (w.get(x, y, z) !== B.WATER) w.set(x, y, z, B.AIR);
        for (let y = Math.min(top, h); y <= h; y++) w.set(x, y, z, y === h ? G.pick([B.STONE, B.STONE, B.GRAVEL, B.COBBLE, B.SANDSTONE]) : B.STONE);
      }
      // rochers et marches irrégulières sur les bords
      if (rnd() < 0.25) { const a = rnd() * Math.PI * 2, bx = Math.round(px + Math.cos(a) * (rad + 1)), bz = Math.round(pz + Math.sin(a) * (rad + 1)); const tt = w.top(bx, bz); if (tt >= h) { w.set(bx, tt + 1, bz, rnd() < 0.5 ? B.ROCK : B.STONE); } }
    }
  }
  // toundra : escalier vers le belvédère, salle en dessous et mine qui ressort au pied de la montagne
  function belvedereMine(w, mt) {
    // escalier extérieur (côté sud)
    let n = 1; for (; n <= 9; n++) if (w.top(63, 65 + n) <= mt - n + 1) break;
    stairs(w, 63, 65 + n, mt - n, n, 0, -1, B.COBBLE, 2);
    // salle sous le belvédère
    w.fill(62, mt - 4, 60, 66, mt - 1, 64, B.AIR);
    w.fill(62, mt - 5, 60, 66, mt - 5, 64, B.PLANKS);
    for (const [x, z] of [[62, 60], [66, 60], [62, 64], [66, 64]]) for (let y = mt - 4; y <= mt - 1; y++) w.set(x, y, z, B.LOG);
    w.set(64, mt - 1, 64, B.GLOW); w.set(65, mt - 4, 63, B.CRATE); w.set(65, mt - 4, 62, B.BARREL);
    // trappe + escalier qui descend du plancher du belvédère dans la salle
    stairs(w, 62, 61, mt - 5, 5, 1, 0, B.PLANKS, 1);
    // galerie de mine en pente vers l'ouest, puis à plat jusqu'à la sortie
    let fy = mt - 5, x = 61;
    for (let guard = 0; guard < 60 && x > 2; guard++, x--) {
      const z0 = 61, z1 = 62;
      const nextFy = Math.max(6, fy - 1);
      const sloping = nextFy < fy;
      fy = nextFy;
      for (let z = z0 - 1; z <= z1 + 1; z++) for (let y = fy; y <= fy + 4; y++) if (!w.isSolid(x, y, z) && (z < z0 || z > z1 || y === fy || y === fy + 4)) w.set(x, y, z, B.STONE);
      for (let z = z0; z <= z1; z++) { w.set(x, fy, z, B.GRAVEL); for (let y = fy + 1; y <= fy + 3; y++) w.set(x, y, z, B.AIR); }
      if (sloping) for (let z = z0; z <= z1; z++) w.setStair(x, fy, z, B.STAIR_STONE, 0);
      // boisage tous les 3 blocs, lanternes
      if (x % 3 === 0) { for (let y = fy + 1; y <= fy + 3; y++) { w.set(x, y, z0 - 1, B.LOG); w.set(x, y, z1 + 1, B.LOG); } for (let z = z0 - 1; z <= z1 + 1; z++) w.set(x, fy + 4, z, B.PLANKS); }
      if (x % 6 === 0) w.set(x, fy + 3, z0 - 1, B.GLOW);
      w.details.push({ box: true, x0: x, y0: fy + 1, z0: z0 + 0.15, x1: x + 1, y1: fy + 1.06, z1: z0 + 0.25, tile: 'metal' });
      w.details.push({ box: true, x0: x, y0: fy + 1, z0: z1 + 0.75, x1: x + 1, y1: fy + 1.06, z1: z1 + 0.85, tile: 'metal' });
      // sortie : le terrain au-dessus n'est plus plus haut que la galerie
      if (fy === 6 && w.top(x - 1, z0) <= fy + 1 && w.top(x - 2, z0) <= fy + 1) {
        for (let k = 1; k <= 2; k++) for (let z = z0; z <= z1; z++) for (let y = fy + 1; y <= fy + 4; y++) w.set(x - k, y, z, B.AIR);
        break;
      }
    }
  }
  function create(id) {
    const def = list.find((m) => m.id === id) || list[0];
    const S = def.size;
    const w = new G.World(S, def.height, S);
    def.build(w, G.mulberry32(def.id.length * 1337 + def.stars));
    if (w.lavaFlowFrom) { fillPits(w, 0, 0, 26, 30, ['s', 'e'], B.VOLCROCK, B.BASALT); lavaFlow(w, w.lavaFlowFrom); }
    if (w.desertPath) desertPath(w, G.mulberry32(9));
    if (w.belvedere) belvedereMine(w, w.belvedere);
    // aucune eau ou lave ne doit « flotter » : on borde chaque liquide par un bloc solide
    for (let y = 1; y < w.H; y++) for (let z = 0; z < w.D; z++) for (let x = 0; x < w.W; x++) {
      const b = w.data[w.idx(x, y, z)];
      if (b !== B.WATER && b !== B.LAVA) continue;
      const fillB = b === B.LAVA ? B.SCORIA_DARK : def.id === 'ville' ? B.SEWER : def.id === 'toundra' ? B.STONE : B.SAND;
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0]]) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (!w.inside(nx, ny, nz)) continue;
        const nb = w.get(nx, ny, nz);
        if (nb === B.AIR || (G.BLOCKS[nb] && G.BLOCKS[nb].plant)) w.set(nx, ny, nz, fillB);
      }
    }
    for (const s of def.stations) {
      let t = -1;
      if (s.top) { for (let y = w.H - 2; y >= 1; y--) if (w.canStand(s.x, y, s.z)) { t = y - 1; break; } }
      else for (let y = 1; y < w.H - 2; y++) if (w.canStand(s.x, y, s.z)) { t = y - 1; break; }
      if (t < 0) t = w.top(s.x, s.z);
      for (let y = t + 1; y < t + 4; y++) w.set(s.x, y, s.z, B.AIR);
      s.y = t + 1;
      const tall = s.type === 'perk' ? 2 : 1;
      for (let y = 0; y < tall; y++) w.set(s.x, s.y + y, s.z, B.METAL);
    }
    w.buildNav(def.stations.map((s) => [s.x, s.z]));
    const px = def.player[0], pz = def.player[1];
    let py = 1; for (let y = w.H - 2; y >= 1; y--) if (w.canStand(px, y, pz)) { py = y; break; }
    const raw = def.spawnsFn ? def.spawnsFn(S) : edgeSpawns(S, 3, 6);
    const spawns = [];
    for (const [x, z] of raw) { const y = w.standAt(x, z); if (y < 999 && w.nodeNear(x + 0.5, y, z + 0.5) >= 0) spawns.push([x, y, z]); }
    // perchoirs : cases en hauteur à ciel ouvert (toits, tours, sommets) pour les tireurs
    const perches = [];
    w.computeFlow(px + 0.5, py, pz + 0.5);
    for (let z = 2; z < S - 2; z += 2) for (let x = 2; x < S - 2; x += 2) {
      const low = w.standAt(x, z); if (low >= 999) continue;
      for (let y = w.H - 2; y >= low + 6; y--) {
        const id = w.nav.nodeAt[w.idx(x, y, z)];
        if (id < 0) continue;
        let open = true; for (let yy = y + 2; yy < w.H; yy++) if (w.isSolid(x, yy, z)) { open = false; break; }
        if (open && w.nav.dist[id] >= 0) perches.push({ x, y, z, id });
        break;
      }
    }
    return { def, world: w, playerSpawn: new THREE.Vector3(px + 0.5, py, pz + 0.5), spawns, portals: def.portals || [], carSpots: w.carSpots || [], perches };
  }

  return { list, create };
})();

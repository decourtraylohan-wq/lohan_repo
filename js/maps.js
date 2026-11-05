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
  function stairs(w, x, z, gy, n, dx, dz, mat, width = 2) {
    const px = dz !== 0 ? 1 : 0, pz = dx !== 0 ? 1 : 0;
    for (let i = 0; i < n; i++) for (let k = 0; k < width; k++) {
      const cx = x + dx * i + px * k, cz = z + dz * i + pz * k;
      for (let y = gy + 1; y <= gy + 1 + i; y++) w.set(cx, y, cz, mat);
      for (let y = gy + 2 + i; y <= gy + 4 + i; y++) w.set(cx, y, cz, B.AIR);
    }
  }

  // ================= Ville : immeubles, égouts =================
  function building(w, x0, z0, x1, z1, nf, o, rnd) {
    const g = o.g, top = g + nf * 4;
    w.fill(x0, g + 1, z0, x1, top + 3, z1, B.AIR);
    const stairA = { x: x0 + 2, z: z0 + 2, d: 1 }, stairB = { x: x1 - 2, z: z1 - 3, d: -1 };
    const nearStair = (x, z) => [stairA, stairB].some((s) => { const xa = Math.min(s.x, s.x + s.d * 4), xb = Math.max(s.x, s.x + s.d * 4); return x >= xa - 1 && x <= xb + 1 && z >= s.z - 1 && z <= s.z + 2; });
    for (let k = 0; k <= nf; k++) {
      const F = g + 4 * k;
      w.fill(x0, F, z0, x1, F, z1, k === 0 ? o.floor : k === nf ? B.ROOF : B.CONCRETE);
      if (k > 0) for (let z = z0 + 3; z < z1 - 1; z += 5) for (let x = x0 + 3; x < x1 - 1; x += 5) if (!nearStair(x, z)) w.set(x, F, z, B.GLOW);
    }
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
          w.set(x, y, z, b);
        }
      }
      // escaliers alternés
      const s = k % 2 === 0 ? stairA : stairB;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        const cx = s.x + s.d * i, cz = s.z + j;
        for (let y = F + 1; y <= F + 1 + i; y++) w.set(cx, y, cz, o.stair || B.STONEBRICK);
        if (i >= 1) w.set(cx, F + 4, cz, B.AIR);
      }
      // mobilier
      for (let n = 0; n < (x1 - x0) * (z1 - z0) / 18; n++) {
        const x = x0 + 2 + Math.floor(rnd() * (x1 - x0 - 3)), z = z0 + 2 + Math.floor(rnd() * (z1 - z0 - 3));
        if (nearStair(x, z) || Math.abs(x - (x0 + x1) / 2) < 2 || Math.abs(z - (z0 + z1) / 2) < 2) continue;
        w.set(x, F + 1, z, G.pick([B.CRATE, B.BOOKSHELF, B.PLANKS, B.CRATE]));
        if (rnd() < 0.3) w.set(x, F + 2, z, B.CRATE);
      }
    }
    // portes au rez-de-chaussée sur les quatre faces
    const mx = Math.floor((x0 + x1) / 2), mz = Math.floor((z0 + z1) / 2);
    for (const [x, z] of [[mx, z0], [mx + 1, z0], [mx, z1], [mx + 1, z1], [x0, mz], [x0, mz + 1], [x1, mz], [x1, mz + 1]]) { w.set(x, g + 1, z, B.AIR); w.set(x, g + 2, z, B.AIR); }
    // toit : parapet et climatiseurs
    for (let x = x0; x <= x1; x++) { w.set(x, top + 1, z0, o.wall); w.set(x, top + 1, z1, o.wall); }
    for (let z = z0; z <= z1; z++) { w.set(x0, top + 1, z, o.wall); w.set(x1, top + 1, z, o.wall); }
    for (let i = 0; i < 3; i++) { const x = x0 + 3 + Math.floor(rnd() * (x1 - x0 - 6)), z = z0 + 5 + Math.floor(rnd() * (z1 - z0 - 8)); if (!nearStair(x, z)) w.set(x, top + 1, z, B.METAL); }
    return top;
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
  function car(w, x, z, g, along, rnd) {
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
        const hill = Math.max(0, 1 - Math.hypot(x - 15, z - 15) / 16); h += hill * hill * 11;
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
      w.fill(39, 7, 35, 41, 7, 37, B.COBBLE); w.set(40, 7, 36, B.WATER); w.set(40, 6, 36, B.WATER);
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
    stations: [
      { type: 'box', x: 42, z: 42 },
      { type: 'wall', weapon: 'smg', x: 36, z: 35 },
      { type: 'wall', weapon: 'shotgun', x: 44, z: 35 },
      { type: 'wall', weapon: 'rifle', x: 36, z: 45 },
      { type: 'wall', weapon: 'sniper', x: 15, z: 14 },
      { type: 'perk', perk: 'cuirasse', x: 32, z: 31, wave: 1 },
      { type: 'perk', perk: 'rafale', x: 48, z: 31, wave: 3 },
      { type: 'perk', perk: 'mainleste', x: 32, z: 49, wave: 5 },
      { type: 'perk', perk: 'souffle', x: 48, z: 49, wave: 2 },
      { type: 'perk', perk: 'foulee', x: 27, z: 44, wave: 4 },
      { type: 'perk', perk: 'bandouliere', x: 13, z: 44, wave: 7 },
      { type: 'forge', x: 38, z: 38, wave: 8 },
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
      stairs(w, x0 + 4, z0 + 2, 6, 3, 1, 0, B.PLANKS, 1); stairs(w, x1 - 4, z1 - 2, 6, 3, -1, 0, B.PLANKS, 1);
      for (const [tx, tz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { w.fill(tx - 1, 7, tz - 1, tx + 1, 12, tz + 1, B.COBBLE); w.set(tx, 13, tz, B.GLOW); }
      house(w, 34, 34, 6, 5, 6, 'e', B.PLANKS, B.LOG, B.SNOW);
      house(w, 42, 43, 6, 5, 6, 'w', B.PLANKS, B.LOG, B.SNOW);
      for (const [x, z] of [[37, 41], [44, 38], [40, 22], [40, 58], [22, 40], [58, 40]]) { const t = w.top(x, z); w.set(x, t + 1, z, B.LOG); w.set(x, t + 2, z, B.LOG); w.set(x, t + 3, z, B.GLOW); }
      // lac gelé
      ellipse(16, 18, 12, 8, (x, z) => { const t = w.top(x, z); for (let y = t + 1; y < w.H; y++) w.set(x, y, z, B.AIR); w.set(x, t, z, B.ICE); });
      // chalets
      for (const [cx, cz, d] of [[10, 52, 'e'], [18, 66, 'n'], [60, 14, 's']]) { const t = w.top(cx + 2, cz + 2); flatten(w, cx + 2, cz + 2, 5, t, B.SNOW, B.DIRT); house(w, cx, cz, 5, 5, t, d, B.LOG, B.LOG, B.SNOW); }
      // belvédère au sommet de la montagne
      const mt = w.top(64, 62);
      w.fill(61, mt, 59, 67, mt, 65, B.PLANKS);
      for (const [x, z] of [[61, 59], [67, 59], [61, 65], [67, 65]]) for (let y = mt + 1; y <= mt + 3; y++) w.set(x, y, z, B.LOG);
      w.fill(61, mt + 4, 59, 67, mt + 4, 65, B.SNOW); w.set(64, mt + 3, 62, B.GLOW);
      for (let i = 0; i < 120; i++) {
        const x = 3 + Math.floor(rnd() * 74), z = 3 + Math.floor(rnd() * 74);
        if (Math.hypot(x - 40, z - 40) < 18) continue;
        const t = w.top(x, z);
        if (!canTree(w, x, z, t, B.SNOW)) continue;
        const r = rnd();
        if (r < 0.75) { pine(w, x, t, z, rnd); for (let y = t + 2; y < w.H - 1; y++) if (w.get(x, y, z) === B.PINE && !w.get(x, y + 1, z) && rnd() < 0.5) w.set(x, y + 1, z, B.SNOW); }
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
      { type: 'box', x: 40, z: 40 },
      { type: 'wall', weapon: 'smg', x: 32, z: 40 },
      { type: 'wall', weapon: 'shotgun', x: 48, z: 40 },
      { type: 'wall', weapon: 'rifle', x: 40, z: 32 },
      { type: 'wall', weapon: 'sniper', x: 63, z: 61 },
      { type: 'perk', perk: 'cuirasse', x: 32, z: 32, wave: 1 },
      { type: 'perk', perk: 'souffle', x: 48, z: 32, wave: 2 },
      { type: 'perk', perk: 'rafale', x: 32, z: 48, wave: 3 },
      { type: 'perk', perk: 'mainleste', x: 48, z: 48, wave: 5 },
      { type: 'perk', perk: 'foulee', x: 36, z: 45, wave: 4 },
      { type: 'perk', perk: 'bandouliere', x: 12, z: 54, wave: 7 },
      { type: 'forge', x: 43, z: 41, wave: 8 },
      { type: 'bench', x: 35, z: 35 },
      { type: 'bench', x: 11, z: 53 },
    ],
  });

  // ---------- 4. Enfer ----------
  list.push({
    id: 'enfer', name: 'Forteresse Infernale', desc: 'Lac et rivières de lave, donjon maudit, passerelle surélevée et tour de guet.', stars: 4, rpMult: 1.5, size: 80, height: 34,
    sky: [0x1a0302, 0x5a1a0a], fog: [0x4a120a, 12, 62], hemi: [0xff9a70, 0x301010, 0.65], sun: [0xff6a3a, 0.6], weather: 'ash',
    build(w, rnd) {
      const n = G.makeNoise(404);
      terrain(w, (x, z) => 7 + (n(x * 0.07, z * 0.07) - 0.5) * 8, (x, y, z, h) => (y === h ? (n(x * 0.3, z * 0.3) > 0.55 ? B.REDSAND : B.BASALT) : B.BASALT));
      flatten(w, 40, 40, 13, 7, B.DARKBRICK, B.BASALT);
      // rivières de lave
      const riverZ = (c, x) => Math.round(c === 14 ? 14 + Math.sin(x * 0.12) * 3 : 66 + Math.cos(x * 0.1) * 3);
      for (let x = 0; x < 80; x++) for (const c of [14, 66]) for (let dz = -1; dz <= 1; dz++) {
        const z = riverZ(c, x) + dz; const t = w.top(x, z);
        for (let y = t; y > 4; y--) w.set(x, y, z, B.AIR);
        w.set(x, 4, z, B.LAVA); w.set(x, 3, z, B.MAGMA);
      }
      // lac de lave à l'est
      ellipse(68, 40, 8, 10, (x, z) => { const t = w.top(x, z); for (let y = t; y > 4; y--) w.set(x, y, z, B.AIR); w.set(x, 4, z, B.LAVA); w.set(x, 3, z, B.MAGMA); });
      ellipse(68, 40, 2.5, 3, (x, z) => { for (let y = 5; y <= 7; y++) w.set(x, y, z, B.OBSIDIAN); });
      w.set(68, 8, 40, B.GLOW);
      // ponts
      for (const bx of [14, 40, 66]) for (const c of [14, 66]) for (let dx = -1; dx <= 1; dx++) {
        const x = bx + dx, zc = riverZ(c, x);
        for (let dz = -5; dz <= 5; dz++) { const z = zc + dz; for (let y = 7; y < w.H; y++) w.set(x, y, z, B.AIR); w.set(x, 5, z, B.DARKBRICK); w.set(x, 6, z, B.DARKBRICK); }
      }
      // pont vers l'îlot du lac
      for (let x = 58; x <= 66; x++) for (let dz = 0; dz <= 1; dz++) { w.set(x, 6, 40 + dz, B.DARKBRICK); w.set(x, 5, 40 + dz, B.DARKBRICK); for (let y = 7; y < 12; y++) w.set(x, y, 40 + dz, B.AIR); }
      // donjon
      const k0 = 33, k1 = 47;
      for (let y = 8; y <= 11; y++) for (let i = k0; i <= k1; i++) { w.set(i, y, k0, B.DARKBRICK); w.set(i, y, k1, B.DARKBRICK); w.set(k0, y, i, B.DARKBRICK); w.set(k1, y, i, B.DARKBRICK); }
      for (let d = -1; d <= 1; d++) for (let y = 8; y <= 10; y++) { w.set(40 + d, y, k0, B.AIR); w.set(40 + d, y, k1, B.AIR); w.set(k0, y, 40 + d, B.AIR); w.set(k1, y, 40 + d, B.AIR); }
      for (const [tx, tz] of [[k0, k0], [k1, k0], [k0, k1], [k1, k1]]) { w.fill(tx, 8, tz, tx, 14, tz, B.OBSIDIAN); w.set(tx, 15, tz, B.MAGMA); }
      w.fill(39, 8, 39, 41, 8, 41, B.OBSIDIAN); w.set(40, 9, 40, B.GLOW);
      // tour de guet à l'ouest + passerelle surélevée
      const wx = 12, wz = 40;
      w.fill(wx - 3, 7, wz - 3, wx + 3, 19, wz + 3, B.DARKBRICK);
      w.fill(wx - 2, 8, wz - 2, wx + 2, 18, wz + 2, B.AIR);
      for (let lv = 0; lv < 3; lv++) {
        const F = 7 + lv * 4;
        if (lv > 0) w.fill(wx - 2, F, wz - 2, wx + 2, F, wz + 2, B.DARKBRICK);
        const d = lv % 2 ? -1 : 1, sx = lv % 2 ? wx + 1 : wx - 1;
        for (let i = 0; i < 3; i++) { for (let y = F + 1; y <= F + 1 + i; y++) { w.set(sx + d * i, y, wz - 2, B.OBSIDIAN); w.set(sx + d * i, y, wz - 1, B.OBSIDIAN); } if (i >= 1) { w.set(sx + d * i, F + 4, wz - 2, B.AIR); w.set(sx + d * i, F + 4, wz - 1, B.AIR); } }
      }
      for (let x = wx - 3; x <= wx + 3; x += 2) { w.set(x, 20, wz - 3, B.DARKBRICK); w.set(x, 20, wz + 3, B.DARKBRICK); }
      w.set(wx + 2, 20, wz + 2, B.GLOW);
      for (let y = 8; y <= 9; y++) { w.set(wx + 3, y, wz, B.AIR); w.set(wx + 3, y, wz + 1, B.AIR); }
      // passerelle vers le donjon (niveau 11) avec escalier de chaque côté
      for (let x = wx + 4; x <= k0 - 1; x++) for (let dz = 3; dz <= 4; dz++) { w.set(x, 11, wz + dz, B.DARKBRICK); w.set(x, 12, wz + dz + (dz === 3 ? -1 : 1), B.DARKBRICK); }
      stairs(w, k0 - 5, wz + 3, 7, 4, 1, 0, B.DARKBRICK, 2);
      for (let x = wx + 4; x <= k0 - 1; x += 3) { const t = w.top(x, wz + 3); for (let y = 8; y < 11; y++) if (!w.get(x, y, wz + 3)) w.set(x, y, wz + 3, B.OBSIDIAN); }
      stairs(w, wx + 8, wz + 3, w.top(wx + 8, wz + 6) > 6 ? 7 : 7, 4, -1, 0, B.DARKBRICK, 2);
      // piliers et lumières
      for (let i = 0; i < 36; i++) {
        const x = 3 + Math.floor(rnd() * 74), z = 3 + Math.floor(rnd() * 74);
        if (Math.hypot(x - 40, z - 40) < 16 || Math.hypot(x - 12, z - 40) < 7) continue;
        const t = w.top(x, z); if (t < 6) continue;
        const hh = 2 + Math.floor(rnd() * 6);
        for (let y = t + 1; y <= t + hh; y++) w.set(x, y, z, rnd() < 0.8 ? B.OBSIDIAN : B.BASALT);
        if (rnd() < 0.4) w.set(x, t + hh + 1, z, B.GLOW);
      }
      for (let i = 0; i < 40; i++) { const x = Math.floor(rnd() * 80), z = Math.floor(rnd() * 80); const t = w.top(x, z); if (t >= 6 && w.get(x, t, z) !== B.LAVA) w.set(x, t, z, B.MAGMA); }
      for (let i = 0; i < 25; i++) { const x = 3 + Math.floor(rnd() * 74), z = 3 + Math.floor(rnd() * 74); if (Math.hypot(x - 40, z - 40) < 15) continue; const t = w.top(x, z); if ((w.get(x, t, z) === B.BASALT || w.get(x, t, z) === B.REDSAND) && !w.get(x, t + 1, z)) deadTree(w, x, t, z, rnd, B.OBSIDIAN); }
      covers(w, rnd, 18, { avoid: [[40, 40, 9], [12, 40, 6], [68, 40, 11]], surfaces: [B.BASALT, B.REDSAND, B.MAGMA], kinds: ['wall', 'rock', 'wall'], wall: B.DARKBRICK });
      pebbles(w, rnd, [B.BASALT, B.REDSAND], 200, 'basalt');
      decorate(w, rnd, B.REDSAND, [[B.DEADBUSH, 0.04]]);
    },
    player: [40, 37],
    stations: [
      { type: 'box', x: 40, z: 43 },
      { type: 'wall', weapon: 'smg', x: 35, z: 37 },
      { type: 'wall', weapon: 'shotgun', x: 45, z: 37 },
      { type: 'wall', weapon: 'rifle', x: 35, z: 44 },
      { type: 'wall', weapon: 'sniper', x: 12, z: 42, top: true },
      { type: 'perk', perk: 'cuirasse', x: 29, z: 33, wave: 1 },
      { type: 'perk', perk: 'souffle', x: 51, z: 33, wave: 2 },
      { type: 'perk', perk: 'rafale', x: 29, z: 47, wave: 3 },
      { type: 'perk', perk: 'mainleste', x: 51, z: 47, wave: 5 },
      { type: 'perk', perk: 'foulee', x: 40, z: 29, wave: 4 },
      { type: 'perk', perk: 'bandouliere', x: 68, z: 42, wave: 7 },
      { type: 'forge', x: 37, z: 40, wave: 8 },
      { type: 'bench', x: 45, z: 35 },
      { type: 'bench', x: 10, z: 41 },
    ],
  });

  // ---------- 5. Ville ----------
  const ROADS = [22, 48, 74];
  list.push({
    id: 'ville', name: 'Ville Fantôme', desc: 'Grande ville : immeubles visitables jusqu\'au toit, magasins, parc et égouts sous les rues.', stars: 3, rpMult: 1.35, size: 96, height: 48,
    sky: [0x6f8cb0, 0xc8d2dc], fog: [0xb0bcc8, 26, 100], hemi: [0xdfe8f0, 0x4a4a50, 0.75], sun: [0xfff4e0, 0.85], weather: null,
    build(w, rnd) {
      const g = 12, S = 96;
      // sol
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
          w.set(x, g, z, line ? B.ASPHALT_LINE : B.ASPHALT);
        } else if (onWalk(x) || onWalk(z)) w.set(x, g, z, B.SIDEWALK);
      }
      // égouts : coque puis creusement
      const tunnel = (c, axis, fn) => { for (let a = 0; a < S; a++) for (let o = -2; o <= 2; o++) { const x = axis === 'z' ? c + o : a, z = axis === 'z' ? a : c + o; fn(x, z, o, a); } };
      for (const c of ROADS) for (const axis of ['x', 'z']) tunnel(c, axis, (x, z, o) => { for (let y = 5; y <= 10; y++) w.set(x, y, z, B.SEWER); });
      for (const c of ROADS) for (const axis of ['x', 'z']) tunnel(c, axis, (x, z, o, a) => {
        if (Math.abs(o) > 1) return;
        for (let y = 7; y <= 9; y++) w.set(x, y, z, B.AIR);
        if (o === 0) { w.set(x, 6, z, B.WATER); } else w.set(x, 6, z, B.SEWER);
        if (a % 8 === 0 && o === 0) w.set(x, 10, z, B.GLOW);
      });
      // bouches d'égout avec escaliers
      const manhole = (c, axis, a0, dir) => {
        for (let k = 1; k <= 6; k++) {
          const a = a0 + dir * k, lane = c + 1;
          const x = axis === 'z' ? lane : a, z = axis === 'z' ? a : lane;
          for (let y = 13 - k; y <= g; y++) w.set(x, y, z, B.AIR);
          w.set(x, 12 - k, z, B.SEWER);
        }
        const x = axis === 'z' ? c + 1 : a0, z = axis === 'z' ? a0 : c + 1;
        w.set(x, g, z, B.GRATE);
      };
      manhole(48, 'z', 57, 1); manhole(48, 'x', 39, -1); manhole(22, 'z', 30, 1); manhole(74, 'z', 66, -1); manhole(22, 'x', 60, 1); manhole(74, 'x', 30, -1);
      // îlots
      const blocks = [[0, 16], [28, 42], [54, 68], [80, 95]];
      const plan = [
        ['tower6', 'apart4', 'shopPark', 'apart3'],
        ['parking', 'tower7', 'apart5', 'tower6'],
        ['apart4', 'shopPark', 'park', 'shop'],
        ['park', 'tower5', 'apart3', 'tower6'],
      ];
      for (let bz = 0; bz < 4; bz++) for (let bx = 0; bx < 4; bx++) {
        const [xa, xb] = blocks[bx], [za, zb] = blocks[bz];
        const x0 = xa + 1, x1 = xb - 1, z0 = za + 1, z1 = zb - 1;
        const type = plan[bz][bx];
        if (type.startsWith('tower')) building(w, x0, z0, x1, z1, Number(type.slice(5)), { g, wall: B.CONCRETE_DARK, floor: B.CONCRETE, glassFull: true }, rnd);
        else if (type.startsWith('apart')) building(w, x0 + 1, z0 + 1, x1 - 1, z1 - 1, Number(type.slice(5)), { g, wall: B.BRICK, floor: B.PLANKS, stair: B.PLANKS }, rnd);
        else if (type === 'shop') { shop(w, x0 + 2, z0 + 2, x1 - 2, z1 - 6, g, B.WHITEWALL); }
        else if (type === 'shopPark') {
          shop(w, x0 + 1, z0 + 1, x1 - 1, z0 + 6, g, B.WHITEWALL);
          for (let z = z0 + 9; z <= z1; z++) for (let x = x0; x <= x1; x++) w.set(x, g, z, (x - x0) % 4 === 0 ? B.ASPHALT_LINE : B.ASPHALT);
          for (let x = x0 + 1; x < x1 - 2; x += 4) if (rnd() < 0.7) car(w, x, z0 + 10, g, 'z', rnd);
        } else if (type === 'parking') {
          for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) w.set(x, g, z, (z - z0) % 5 === 0 ? B.ASPHALT_LINE : B.ASPHALT);
          for (let z = z0 + 1; z < z1 - 2; z += 5) for (let x = x0 + 1; x < x1 - 3; x += 6) if (rnd() < 0.7) car(w, x, z, g, 'x', rnd);
        } else if (type === 'park') {
          for (let z = za; z <= zb; z++) for (let x = xa; x <= xb; x++) if (!onRoad(x) && !onRoad(z) && !onWalk(x) && !onWalk(z)) w.set(x, g, z, B.GRASS);
          const cx = Math.floor((xa + xb) / 2), cz = Math.floor((za + zb) / 2);
          lake(w, cx + 2, cz + 2, 3.5, 2.5, g, B.SAND);
          for (let i = 0; i < 9; i++) { const x = x0 + 1 + Math.floor(rnd() * (x1 - x0 - 2)), z = z0 + 1 + Math.floor(rnd() * (z1 - z0 - 2)); if (Math.hypot(x - cx - 2, z - cz - 2) < 6) continue; if (canTree(w, x, z, g, B.GRASS)) tree(w, x, g, z, rnd); }
          for (let x = x0 + 1; x < x1; x += 4) w.set(x, g + 1, z0 + 1, B.PLANKS);
        }
      }
      // voitures abandonnées sur les routes
      for (const c of ROADS) for (let a = 4; a < S - 6; a += 9) {
        if (onRoad(a) || onRoad(a + 3) || rnd() < 0.4) continue;
        car(w, c - 3, a, g, 'z', rnd);
        if (rnd() < 0.5) car(w, a, c + 2, g, 'x', rnd);
      }
      // lampadaires
      for (const c of ROADS) for (let a = 6; a < S; a += 12) {
        if (onRoad(a)) continue;
        for (const [x, z] of [[c - 4, a], [a, c + 4]]) { if (w.get(x, g + 1, z)) continue; w.set(x, g + 1, z, B.METAL); w.set(x, g + 2, z, B.METAL); w.set(x, g + 3, z, B.GLOW); }
      }
      // barrières de chantier et sacs de sable sur les routes et trottoirs
      covers(w, rnd, 26, { avoid: [[48, 48, 4]], surfaces: [B.ASPHALT, B.ASPHALT_LINE, B.SIDEWALK, B.CONCRETE], kinds: ['barrier', 'sand', 'barrier', 'crates'] });
      pebbles(w, rnd, [B.ASPHALT, B.SIDEWALK, B.CONCRETE, B.GRASS], 180, 'concrete_dark');
      decorate(w, rnd, B.GRASS, [[B.TALLGRASS, 0.15], [B.FLOWER_R, 0.02], [B.FLOWER_Y, 0.02]]);
    },
    player: [48, 48],
    stations: [
      { type: 'box', x: 58, z: 58 },
      { type: 'wall', weapon: 'smg', x: 43, z: 36 },
      { type: 'wall', weapon: 'shotgun', x: 53, z: 36 },
      { type: 'wall', weapon: 'rifle', x: 36, z: 53 },
      { type: 'wall', weapon: 'sniper', x: 35, z: 35, top: true },
      { type: 'perk', perk: 'cuirasse', x: 53, z: 60, wave: 1 },
      { type: 'perk', perk: 'souffle', x: 43, z: 60, wave: 2 },
      { type: 'perk', perk: 'rafale', x: 60, z: 43, wave: 3 },
      { type: 'perk', perk: 'mainleste', x: 66, z: 57, wave: 5 },
      { type: 'perk', perk: 'foulee', x: 36, z: 43, wave: 4 },
      { type: 'perk', perk: 'bandouliere', x: 34, z: 38, wave: 7, top: true },
      { type: 'forge', x: 49, z: 30, wave: 8 },
      { type: 'bench', x: 34, z: 57 },
      { type: 'bench', x: 39, z: 31 },
    ],
    spawnsFn(S) {
      const s = [];
      for (const c of ROADS) {
        s.push([c - 3, 2], [c - 3, S - 3], [2, c - 3], [S - 3, c - 3]);
        s.push([c + 1, 2], [c + 1, S - 3], [2, c + 1], [S - 3, c + 1]); // sorties d'égout
      }
      for (const [x, z] of [[8, 8], [88, 8], [8, 88], [88, 88], [8, 48], [88, 48], [48, 8], [48, 88]]) s.push([x, z]);
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

  function create(id) {
    const def = list.find((m) => m.id === id) || list[0];
    const S = def.size;
    const w = new G.World(S, def.height, S);
    def.build(w, G.mulberry32(def.id.length * 1337 + def.stars));
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
    return { def, world: w, playerSpawn: new THREE.Vector3(px + 0.5, py, pz + 0.5), spawns, portals: def.portals || [] };
  }

  return { list, create };
})();

// Réseau en ligne : connexion directe entre navigateurs (WebRTC).
// Même interface que le salon temps réel de claude.ai (presence / peers / onPeers / onConnection),
// avec l'hôte comme relais : chaque invité lui envoie sa présence, il la renvoie à tous.
// Mise en relation : par le code de partie (serveur public PeerJS), ou par invitation à copier-coller.
G.PLAY_URL = 'https://decourtraylohan-wq.github.io/lohan_repo/';
G.NET_ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
G.NetRoom = class {
  constructor() {
    this.me = 'p' + Math.random().toString(36).slice(2, 10);
    this.pres = {}; this.others = new Map(); // id -> présence
    this.peerH = []; this.connH = [];
    this.links = new Map(); // hôte : id -> lien ; invité : 'hub' -> lien
    this.isHub = false; this.status = 'idle'; this.code = null;
    this.left = []; this.pend = false; this.flushT = null;
    this.snap = null;
  }
  // ---------- interface « salon » ----------
  presence(patch) {
    for (const k in patch) { if (patch[k] === null) delete this.pres[k]; else this.pres[k] = patch[k]; }
    this.dirtyMe = true; this.schedule(); this.notify();
    return Promise.resolve();
  }
  peers() {
    if (!this.snap) {
      const l = [{ peer: this.me, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: this.pres }];
      for (const [id, pr] of this.others) l.push({ peer: id, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: pr });
      this.snap = l;
    }
    return this.snap;
  }
  onPeers(h) { this.peerH.push(h); this.notify(); return () => {}; }
  onConnection(h) { this.connH.push(h); setTimeout(() => h(this.connected()), 0); return () => {}; }
  connected() { return this.isHub ? this.status === 'ready' || this.links.size > 0 : this.status === 'connected'; }
  notify() {
    this.snap = null;
    if (this.pend) return; this.pend = true;
    setTimeout(() => {
      this.pend = false; this.snap = null;
      const c = { peers: this.peers(), joined: [], left: this.left.map((id) => ({ peer: id })), updated: [] };
      this.left = [];
      for (const h of this.peerH) h(c);
    }, 0);
  }
  setStatus(s) { this.status = s; for (const h of this.connH) h(this.connected()); this.notify(); if (this.onStatus) this.onStatus(s); }
  // ---------- envoi groupé (au plus ~30 fois par seconde) ----------
  schedule() {
    if (this.flushT) return;
    this.flushT = setTimeout(() => { this.flushT = null; this.flush(); }, 33);
  }
  flush() {
    if (!this.dirtyMe) return; this.dirtyMe = false;
    const msg = { t: 'p', id: this.me, pres: this.pres };
    for (const l of this.links.values()) l.send(msg);
  }
  // ---------- messages ----------
  onMsg(from, m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'p' && m.pres && typeof m.pres === 'object') {
      const id = this.isHub ? from : String(m.id || '');
      if (!id || id === this.me) return;
      this.others.set(id, m.pres); this.notify();
      if (this.isHub) for (const [lid, l] of this.links) if (lid !== from) l.send({ t: 'p', id, pres: m.pres });
    } else if (m.t === 'x' && !this.isHub) {
      const id = String(m.id || ''); if (this.others.delete(id)) { this.left.push(id); this.notify(); }
    }
  }
  addLink(id, link) {
    this.links.set(id, link);
    if (this.isHub) {
      // le nouveau venu reçoit tout le monde
      link.send({ t: 'p', id: this.me, pres: this.pres });
      for (const [oid, pr] of this.others) if (oid !== id) link.send({ t: 'p', id: oid, pres: pr });
    } else { link.send({ t: 'p', id: this.me, pres: this.pres }); this.setStatus('connected'); }
  }
  dropLink(id) {
    if (!this.links.has(id)) return;
    this.links.delete(id);
    if (this.isHub) {
      if (this.others.delete(id)) { this.left.push(id); this.notify(); }
      for (const l of this.links.values()) l.send({ t: 'x', id });
    } else {
      for (const oid of this.others.keys()) this.left.push(oid);
      this.others.clear(); this.notify();
      if (this.status === 'connected') this.setStatus('lost');
    }
  }
  // ---------- mise en relation par code (PeerJS) ----------
  peerOpts() { return Object.assign({ debug: 0, config: { iceServers: G.NET_ICE } }, G.NET_PEER_OPTS || {}); }
  hubId(code) { return 'deadblock-v1-' + code; }
  host(code) {
    this.close(); this.isHub = true; this.code = code; this.setStatus('starting');
    if (!window.Peer) { this.setStatus('noserver'); return; }
    let p;
    try { p = this.pj = new window.Peer(this.hubId(code), this.peerOpts()); } catch (e) { this.setStatus('noserver'); return; }
    const to = setTimeout(() => { if (this.status === 'starting') this.setStatus('noserver'); }, 9000);
    p.on('open', () => { clearTimeout(to); if (this.pj === p) this.setStatus('ready'); });
    p.on('connection', (c) => {
      if (this.links.size >= 3) { c.on('open', () => c.close()); return; }
      const id = 'c' + Math.random().toString(36).slice(2, 9);
      c.on('open', () => this.addLink(id, { send: (m) => { try { c.send(m); } catch (e) { /* fermé */ } }, close: () => c.close() }));
      c.on('data', (d) => this.onMsg(id, d));
      c.on('close', () => this.dropLink(id));
      c.on('error', () => this.dropLink(id));
    });
    p.on('disconnected', () => { /* le serveur de relation n'est plus utile une fois connectés */ });
    p.on('error', (e) => {
      if (this.pj !== p) return;
      if (e.type === 'unavailable-id') this.setStatus('taken');
      else if (this.status === 'starting' && ['network', 'server-error', 'socket-error', 'socket-closed', 'browser-incompatible', 'ssl-unavailable'].includes(e.type)) { clearTimeout(to); this.setStatus('noserver'); }
    });
  }
  join(code) {
    this.close(); this.isHub = false; this.code = code; this.setStatus('connecting');
    if (!window.Peer) { this.setStatus('noserver'); return; }
    let p;
    try { p = this.pj = new window.Peer(undefined, this.peerOpts()); } catch (e) { this.setStatus('noserver'); return; }
    const to = setTimeout(() => { if (this.status === 'connecting') this.setStatus(this.pjOpen ? 'nogame' : 'noserver'); }, 15000);
    p.on('open', () => {
      this.pjOpen = true;
      const c = p.connect(this.hubId(code), { reliable: true, serialization: 'json' });
      c.on('open', () => { clearTimeout(to); this.addLink('hub', { send: (m) => { try { c.send(m); } catch (e) { /* fermé */ } }, close: () => c.close() }); });
      c.on('data', (d) => this.onMsg('hub', d));
      c.on('close', () => this.dropLink('hub'));
    });
    p.on('error', (e) => {
      if (this.pj !== p) return;
      if (e.type === 'peer-unavailable') { clearTimeout(to); this.setStatus('nogame'); }
      else if (this.status === 'connecting' && ['network', 'server-error', 'socket-error', 'socket-closed', 'browser-incompatible', 'ssl-unavailable'].includes(e.type)) { clearTimeout(to); this.setStatus('noserver'); }
    });
  }
  close() {
    for (const l of this.links.values()) { try { l.close(); } catch (e) { /* déjà fermé */ } }
    this.links.clear();
    for (const id of this.others.keys()) this.left.push(id);
    this.others.clear();
    if (this.pj) { try { this.pj.destroy(); } catch (e) { /* ignoré */ } this.pj = null; }
    for (const pc of this.manual || []) { try { pc.close(); } catch (e) { /* ignoré */ } }
    this.manual = []; this.pjOpen = false; this.isHub = false; this.code = null;
    this.setStatus('idle');
  }
  // ---------- invitation manuelle (sans serveur : on copie-colle deux textes) ----------
  async pack(o) {
    const bytes = new TextEncoder().encode(JSON.stringify(o));
    let out = bytes;
    if (window.CompressionStream) out = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
    let s = ''; for (let i = 0; i < out.length; i++) s += String.fromCharCode(out[i]);
    return (window.CompressionStream ? 'Z' : 'J') + btoa(s);
  }
  async unpack(t) {
    t = String(t || '').replace(/\s+/g, '');
    const kind = t[0], raw = atob(t.slice(1)), b = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) b[i] = raw.charCodeAt(i);
    let txt;
    if (kind === 'Z') txt = await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    else txt = new TextDecoder().decode(b);
    return JSON.parse(txt);
  }
  gathered(pc) {
    return new Promise((res) => {
      if (pc.iceGatheringState === 'complete') return res();
      const t = setTimeout(res, 4000);
      pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
    });
  }
  wire(id, ch) {
    ch.onopen = () => this.addLink(id, { send: (m) => { if (ch.readyState === 'open') ch.send(JSON.stringify(m)); }, close: () => ch.close() });
    ch.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } this.onMsg(id, m); };
    ch.onclose = () => this.dropLink(id);
  }
  // hôte : crée une invitation pour un joueur
  async manualOffer(code) {
    if (!this.isHub) { this.isHub = true; this.code = code; }
    const pc = new RTCPeerConnection({ iceServers: G.NET_ICE });
    this.manual = this.manual || []; this.manual.push(pc);
    const id = 'm' + Math.random().toString(36).slice(2, 9);
    this.wire(id, pc.createDataChannel('deadblock', { ordered: true }));
    await pc.setLocalDescription(await pc.createOffer());
    await this.gathered(pc);
    this.pendingOffer = pc;
    return this.pack({ c: code, d: pc.localDescription.sdp });
  }
  // hôte : colle la réponse du joueur
  async manualAccept(token) {
    const o = await this.unpack(token);
    if (!o || !o.a || !this.pendingOffer) throw new Error('réponse invalide');
    await this.pendingOffer.setRemoteDescription({ type: 'answer', sdp: o.a });
    this.pendingOffer = null;
  }
  // invité : lit l'invitation et prépare la réponse
  async manualAnswer(token) {
    const o = await this.unpack(token);
    if (!o || !o.d || !o.c) throw new Error('invitation invalide');
    this.close(); this.isHub = false; this.code = o.c; this.setStatus('connecting');
    const pc = new RTCPeerConnection({ iceServers: G.NET_ICE });
    this.manual = [pc];
    pc.ondatachannel = (ev) => this.wire('hub', ev.channel);
    await pc.setRemoteDescription({ type: 'offer', sdp: o.d });
    await pc.setLocalDescription(await pc.createAnswer());
    await this.gathered(pc);
    return { code: o.c, token: await this.pack({ a: pc.localDescription.sdp }) };
  }
};

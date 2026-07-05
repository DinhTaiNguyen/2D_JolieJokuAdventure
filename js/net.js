'use strict';
/* ============ PeerJS networking — Joku hosts, Jolie joins with a code ============ */
const NET = {
  mode: 'solo', peer: null, conn: null, code: '',
  connected: false,
  _peerOpened: false,
  onMsg: null,       // set by Game
  onStatus: null,    // set by menu UI
  onPeerJoin: null,  // host: guest arrived
  onDrop: null,
  _keepAlive: null,

  ALPHA: 'ABCDEFGHJKMNPQRSTUVWXYZ123456789',
  PEER_OPTIONS: {
    debug: 0,
    config: {
      iceCandidatePoolSize: 6,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    }
  },

  _newCode() {
    let c = '';
    for (let i = 0; i < 4; i++) c += this.ALPHA[Math.random() * this.ALPHA.length | 0];
    return c;
  },
  normalizeCode(raw) {
    let text = String(raw || '').trim();
    try {
      const url = new URL(text, location.href);
      text = url.searchParams.get('join') || text;
    } catch (e) {
      const m = text.match(/[?&]join=([^&#]+)/i);
      if (m) text = decodeURIComponent(m[1]);
    }
    return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  },
  validCode(code) {
    return code.length === 4 && [...code].every(ch => this.ALPHA.includes(ch));
  },
  _id(code) { return 'joku-jolie-love-' + this.normalizeCode(code).toLowerCase(); },

  available() { return typeof Peer !== 'undefined'; },
  _options() {
    return JSON.parse(JSON.stringify(this.PEER_OPTIONS));
  },
  _watchPeer() {
    if (!this.peer) return;
    this.peer.on('disconnected', () => {
      if (!this._peerOpened) return;
      this._status('info', 'Connection signal paused. Trying to reconnect...');
      try { this.peer.reconnect(); } catch (e) {}
    });
  },

  host(code = '1234') {
    if (!this.available()) { this._status('err', 'No internet — online play needs a connection.'); return; }
    const desired = this.normalizeCode(code || '1234');
    if (!this.validCode(desired)) {
      this._status('err', 'Enter a 4-character room code.');
      return;
    }
    this.close();
    this.mode = 'host';
    this.code = desired;
    this._peerOpened = false;
    this._status('info', 'Opening the magic portal…');
    this.peer = new Peer(this._id(this.code), this._options());
    this._watchPeer();
    this.peer.on('open', () => { this._peerOpened = true; this._status('code', this.code); });
    this.peer.on('connection', conn => {
      if (this.conn && this.conn.open) { conn.close(); return; } // room for two only
      this.conn = conn;
      this._wire(conn);
    });
    this.peer.on('error', err => {
      if (err.type === 'unavailable-id') { this._status('err', 'Room code ' + this.code + ' is already in use. Change the code and host again.'); return; }
      this._status('err', 'Portal error: ' + err.type + '. Try again.');
    });
  },

  join(code) {
    if (!this.available()) { this._status('err', 'No internet — online play needs a connection.'); return; }
    this.close();
    this.mode = 'guest';
    this.code = this.normalizeCode(code);
    if (!this.validCode(this.code)) {
      this._status('err', 'Enter the 4-character room code from Joku.');
      return;
    }
    const attempt = (this._joinAttempt = (this._joinAttempt || 0) + 1);
    this._peerOpened = false;
    this._status('info', 'Finding Joku…');
    this.peer = new Peer(this._options());
    this._watchPeer();
    this.peer.on('open', () => {
      this._peerOpened = true;
      const conn = this.peer.connect(this._id(this.code), { reliable: true, serialization: 'json' });
      this.conn = conn;
      this._wire(conn);
      setTimeout(() => {
        if (attempt === this._joinAttempt && !this.connected && this.mode === 'guest') this._status('err', 'Could not find that room. Check the code!');
      }, 12000);
    });
    this.peer.on('error', err => {
      if (err.type === 'peer-unavailable') this._status('err', 'Room not found — is Joku hosting?');
      else this._status('err', 'Connection error: ' + err.type);
    });
  },

  _wire(conn) {
    conn.on('open', () => {
      this.connected = true;
      this._status('ok', 'Connected! 💞');
      clearInterval(this._keepAlive);
      this._keepAlive = setInterval(() => this.send({ t: 'ping', at: Date.now() }, { volatile: true, maxBuffered: 8192 }), 3000);
      if (this.mode === 'host' && this.onPeerJoin) this.onPeerJoin();
    });
    conn.on('data', d => { if (d && d.t === 'ping') return; if (this.onMsg) this.onMsg(d); });
    conn.on('close', () => {
      const was = this.connected;
      this.connected = false;
      clearInterval(this._keepAlive); this._keepAlive = null;
      if (was && this.onDrop) this.onDrop();
    });
    conn.on('error', () => {
      clearInterval(this._keepAlive); this._keepAlive = null;
      if (this.connected && this.onDrop) { this.connected = false; this.onDrop(); }
    });
  },

  send(obj, opt = {}) {
    if (this.connected && this.conn && this.conn.open) {
      const dc = this.conn.dataChannel || this.conn._dc;
      if (opt.volatile && dc && dc.bufferedAmount > (opt.maxBuffered || 32768)) return false;
      try { this.conn.send(obj); } catch (e) { /* transient */ }
    }
  },

  close() {
    this._joinAttempt = (this._joinAttempt || 0) + 1;
    this.connected = false;
    this._peerOpened = false;
    clearInterval(this._keepAlive); this._keepAlive = null;
    if (this.conn) { try { this.conn.close(); } catch (e) {} this.conn = null; }
    if (this.peer) { try { this.peer.destroy(); } catch (e) {} this.peer = null; }
  },

  _status(kind, msg) { if (this.onStatus) this.onStatus(kind, msg); }
};

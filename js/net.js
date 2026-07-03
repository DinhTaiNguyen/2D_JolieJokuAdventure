'use strict';
/* ============ PeerJS networking — Joku hosts, Jolie joins with a code ============ */
const NET = {
  mode: 'solo', peer: null, conn: null, code: '',
  connected: false,
  onMsg: null,       // set by Game
  onStatus: null,    // set by menu UI
  onPeerJoin: null,  // host: guest arrived
  onDrop: null,

  ALPHA: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',

  _newCode() {
    let c = '';
    for (let i = 0; i < 4; i++) c += this.ALPHA[Math.random() * this.ALPHA.length | 0];
    return c;
  },
  _id(code) { return 'joku-jolie-love-' + code.toLowerCase(); },

  available() { return typeof Peer !== 'undefined'; },

  host() {
    if (!this.available()) { this._status('err', 'No internet — online play needs a connection.'); return; }
    this.close();
    this.mode = 'host';
    this.code = this._newCode();
    this._status('info', 'Opening the magic portal…');
    this.peer = new Peer(this._id(this.code), { debug: 0 });
    this.peer.on('open', () => this._status('code', this.code));
    this.peer.on('connection', conn => {
      if (this.conn && this.conn.open) { conn.close(); return; } // room for two only
      this.conn = conn;
      this._wire(conn);
    });
    this.peer.on('error', err => {
      if (err.type === 'unavailable-id') { this.host(); return; } // rare code clash — reroll
      this._status('err', 'Portal error: ' + err.type + '. Try again.');
    });
  },

  join(code) {
    if (!this.available()) { this._status('err', 'No internet — online play needs a connection.'); return; }
    this.close();
    this.mode = 'guest';
    this.code = code.toUpperCase().trim();
    this._status('info', 'Finding Joku…');
    this.peer = new Peer({ debug: 0 });
    this.peer.on('open', () => {
      const conn = this.peer.connect(this._id(this.code), { reliable: true });
      this.conn = conn;
      this._wire(conn);
      setTimeout(() => {
        if (!this.connected && this.mode === 'guest') this._status('err', 'Could not find that room. Check the code!');
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
      if (this.mode === 'host' && this.onPeerJoin) this.onPeerJoin();
    });
    conn.on('data', d => { if (this.onMsg) this.onMsg(d); });
    conn.on('close', () => {
      const was = this.connected;
      this.connected = false;
      if (was && this.onDrop) this.onDrop();
    });
    conn.on('error', () => {
      if (this.connected && this.onDrop) { this.connected = false; this.onDrop(); }
    });
  },

  send(obj) {
    if (this.connected && this.conn && this.conn.open) {
      try { this.conn.send(obj); } catch (e) { /* transient */ }
    }
  },

  close() {
    this.connected = false;
    if (this.conn) { try { this.conn.close(); } catch (e) {} this.conn = null; }
    if (this.peer) { try { this.peer.destroy(); } catch (e) {} this.peer = null; }
  },

  _status(kind, msg) { if (this.onStatus) this.onStatus(kind, msg); }
};

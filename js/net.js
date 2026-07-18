'use strict';
/* ============ PeerJS networking: Joku hosts, Jolie joins with a code ============ */
const NET = {
  mode: 'solo', peer: null, conn: null, code: '',
  connected: false, route: '', rtt: null,
  _peerOpened: false,
  _initialized: false,
  _allowReconnect: false,
  _keepAlive: null,
  _connectTimer: null,
  _retryTimer: null,
  _attemptToken: 0,
  _operationToken: 0,
  _joinStep: 0,
  _joinCycle: 0,
  _forceRelay: false,
  _iceServers: null,
  _iceExpiresAt: 0,
  _relaySource: 'public',
  _lastReceive: 0,
  onMsg: null,       // set by Game
  onStatus: null,    // set by menu UI
  onPeerJoin: null,  // host: guest arrived
  onDrop: null,

  PROTOCOL: 5,
  ALPHA: 'ABCDEFGHJKMNPQRSTUVWXYZ123456789',
  STUN_SERVERS: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: ['stun:stun.cloudflare.com:3478', 'stun:openrelay.metered.ca:80'] }
  ],
  // Best-effort fallback. Set the joku-turn-endpoint meta tag for a dedicated relay.
  PUBLIC_RELAY_SERVERS: [
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  JOIN_PLAN: [
    { relayOnly: false, timeout: 10000 },
    { relayOnly: true, timeout: 16000 }
  ],

  init() {
    if (this._initialized) return;
    this._initialized = true;
    addEventListener('online', () => {
      if (this.mode === 'guest' && this._allowReconnect && !this.connected) {
        this._status('info', this._t('networkBackOnline', 'Internet is back. Reconnecting...'));
        this._scheduleGuestReconnect(100);
      } else if (this.mode === 'host' && this._allowReconnect && (!this.peer || this.peer.destroyed)) {
        this._status('info', this._t('networkBackOnline', 'Internet is back. Reconnecting...'));
        this._scheduleHostRestart(100);
      }
    });
    addEventListener('offline', () => {
      if (this.mode !== 'solo') this._status('err', this._t('networkOffline', 'Internet connection lost. Waiting for it to return...'));
    });
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.connected && this.conn && this._lastReceive && Date.now() - this._lastReceive > 15000) {
        this._connectionEnded(this.conn, this._attemptToken);
      }
    });
  },

  _t(key, fallback, vars) {
    if (typeof Story !== 'undefined' && Story.t) {
      const value = Story.t(key, vars || {});
      if (value !== key) return value;
    }
    return String(fallback).replace(/\{(\w+)\}/g, (_, k) => vars && vars[k] != null ? vars[k] : '');
  },

  _newCode() {
    let c = '';
    for (let i = 0; i < 4; i++) c += this.ALPHA[Math.random() * this.ALPHA.length | 0];
    return c;
  },

  normalizeCode(raw) {
    let value = String(raw || '').trim();
    try {
      const url = new URL(value, location.href);
      value = url.searchParams.get('join') || value;
    } catch (e) {
      const match = value.match(/[?&]join=([^&#]+)/i);
      if (match) value = decodeURIComponent(match[1]);
    }
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  },

  validCode(code) {
    return code.length === 4 && [...code].every(ch => this.ALPHA.includes(ch));
  },

  _meta(name) {
    const el = document.querySelector('meta[name="' + name + '"]');
    return el ? String(el.content || '').trim() : '';
  },

  _networkId() {
    const configured = this._meta('joku-network-id') || 'dinhtainguyen-2d-joliejoku-v5';
    return configured.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 52);
  },

  _id(code) {
    return 'joku-jolie-' + this._networkId() + '-' + this.normalizeCode(code).toLowerCase();
  },

  isLocalOrigin() {
    const host = location.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host === '::1' || host === '0.0.0.0' || host.endsWith('.local')) return true;
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
    const match = host.match(/^172\.(\d+)\./);
    return !!(match && +match[1] >= 16 && +match[1] <= 31);
  },

  inviteUrl(code) {
    const publicUrl = this._meta('joku-public-url');
    const base = this.isLocalOrigin() && publicUrl ? publicUrl : location.href;
    const url = new URL(base, location.href);
    url.hash = '';
    url.search = '';
    url.searchParams.set('join', this.normalizeCode(code) || '1234');
    return url.href;
  },

  available() {
    return typeof Peer !== 'undefined' && typeof RTCPeerConnection !== 'undefined';
  },

  _cloneServers(servers) {
    return JSON.parse(JSON.stringify(servers));
  },

  _sanitizeIceServers(raw) {
    const source = raw && Array.isArray(raw.iceServers) ? raw.iceServers : raw;
    if (!Array.isArray(source)) return [];
    const clean = [];
    for (const entry of source.slice(0, 16)) {
      if (!entry || !entry.urls) continue;
      const urls = (Array.isArray(entry.urls) ? entry.urls : [entry.urls])
        .map(String)
        .filter(url => /^(stun|turn|turns):/i.test(url));
      if (!urls.length) continue;
      const server = { urls: urls.length === 1 ? urls[0] : urls };
      if (entry.username != null) server.username = String(entry.username);
      if (entry.credential != null) server.credential = String(entry.credential);
      clean.push(server);
    }
    return clean;
  },

  async _loadIceServers() {
    if (this._iceServers && Date.now() < this._iceExpiresAt) return this._cloneServers(this._iceServers);

    let relayServers = this.PUBLIC_RELAY_SERVERS;
    this._relaySource = 'public';
    const endpoint = this._meta('joku-turn-endpoint');
    if (endpoint) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeout = setTimeout(() => { if (controller) controller.abort(); }, 6500);
      try {
        const response = await fetch(endpoint, {
          cache: 'no-store',
          credentials: 'omit',
          signal: controller ? controller.signal : undefined
        });
        if (!response.ok) throw new Error('TURN endpoint returned ' + response.status);
        const configured = this._sanitizeIceServers(await response.json());
        if (!configured.some(server => (Array.isArray(server.urls) ? server.urls : [server.urls]).some(url => /^turns?:/i.test(url)))) {
          throw new Error('TURN endpoint returned no relay server');
        }
        relayServers = configured;
        this._relaySource = 'dedicated';
      } catch (e) {
        this._relaySource = 'public';
      } finally {
        clearTimeout(timeout);
      }
    }

    this._iceServers = this._sanitizeIceServers(this.STUN_SERVERS.concat(relayServers));
    // Keep credentials fresh: providers may issue short-lived TURN passwords.
    this._iceExpiresAt = Date.now() + (this._relaySource === 'dedicated' ? 4 * 60 * 1000 : 30 * 1000);
    return this._cloneServers(this._iceServers);
  },

  _options(relayOnly, iceServers) {
    return {
      debug: 0,
      pingInterval: 5000,
      config: {
        iceCandidatePoolSize: relayOnly ? 0 : 4,
        bundlePolicy: 'max-bundle',
        iceTransportPolicy: relayOnly ? 'relay' : 'all',
        iceServers: this._cloneServers(iceServers)
      }
    };
  },

  host(code = '1234') {
    if (!this.available()) {
      this._status('err', this._t('networkUnavailable', 'Online play is not available in this browser.'));
      return;
    }
    const desired = this.normalizeCode(code || '1234');
    if (!this.validCode(desired)) {
      this._status('err', this._t('enterCode', 'Enter a 4-character room code.'));
      return;
    }

    this.close();
    this.mode = 'host';
    this.code = desired;
    this._allowReconnect = true;
    this._peerOpened = false;
    const operation = ++this._operationToken;
    this._status('info', this._t('networkOpening', 'Opening the online room...'));
    this._startHost(operation);
  },

  async _startHost(operation) {
    if (!this._allowReconnect || this.mode !== 'host' || operation !== this._operationToken) return;
    if (navigator.onLine === false) {
      this._status('err', this._t('networkOffline', 'Internet connection lost. Waiting for it to return...'));
      this._scheduleHostRestart(1800);
      return;
    }

    const iceServers = await this._loadIceServers();
    if (!this._allowReconnect || this.mode !== 'host' || operation !== this._operationToken) return;

    this._destroyTransport();
    const peer = new Peer(this._id(this.code), this._options(false, iceServers));
    this.peer = peer;
    this._watchPeer(peer);

    peer.on('open', () => {
      if (peer !== this.peer) return;
      this._peerOpened = true;
      this._status('code', this.code);
    });

    peer.on('connection', conn => {
      if (peer !== this.peer) { try { conn.close(); } catch (e) {} return; }
      const meta = conn.metadata || {};
      if (meta.protocol != null && +meta.protocol !== this.PROTOCOL) {
        try { conn.close(); } catch (e) {}
        this._status('err', this._t('networkVersionMismatch', 'Both players must open the latest published game.'));
        return;
      }
      const previous = this.conn;
      this.conn = null;
      if (previous) { try { previous.close(); } catch (e) {} }
      this.connected = false;
      this.conn = conn;
      this._wire(conn, this._attemptToken);
    });

    peer.on('error', err => {
      if (peer !== this.peer) return;
      const type = err && err.type ? err.type : 'network';
      if (type === 'unavailable-id') {
        this._allowReconnect = false;
        this._status('err', this._t('networkRoomInUse', 'Room {code} is already in use. Change the code and host again.', { code: this.code }));
        return;
      }
      if (type === 'browser-incompatible') {
        this._allowReconnect = false;
        this._status('err', this._t('networkUnavailable', 'Online play is not available in this browser.'));
        return;
      }
      this._status('info', this._t('networkSignalRetry', 'The connection service paused. Reconnecting...'));
      this._scheduleHostRestart(1800);
    });
  },

  join(code) {
    if (!this.available()) {
      this._status('err', this._t('networkUnavailable', 'Online play is not available in this browser.'));
      return;
    }
    const desired = this.normalizeCode(code);
    if (!this.validCode(desired)) {
      this._status('err', this._t('enterCode', 'Enter the 4-character room code from Joku.'));
      return;
    }

    this.close();
    this.mode = 'guest';
    this.code = desired;
    this._allowReconnect = true;
    this._forceRelay = new URLSearchParams(location.search).has('relay');
    this._joinStep = this._forceRelay ? 1 : 0;
    this._joinCycle = 0;
    ++this._operationToken;
    this._startJoinAttempt();
  },

  async _startJoinAttempt() {
    if (!this._allowReconnect || this.mode !== 'guest' || this.connected) return;
    if (navigator.onLine === false) {
      this._status('err', this._t('networkOffline', 'Internet connection lost. Waiting for it to return...'));
      this._scheduleGuestReconnect(1800);
      return;
    }

    this._destroyTransport();
    const token = ++this._attemptToken;
    const step = this.JOIN_PLAN[this._joinStep] || this.JOIN_PLAN[0];
    this._status('info', step.relayOnly
      ? this._t('networkFindingRelay', 'Direct connection was blocked. Trying the worldwide relay...')
      : this._t('networkFindingHost', 'Finding Joku online...'));

    const iceServers = await this._loadIceServers();
    if (token !== this._attemptToken || !this._allowReconnect || this.mode !== 'guest') return;

    const peer = new Peer(this._options(step.relayOnly, iceServers));
    this.peer = peer;
    this._peerOpened = false;
    this._watchPeer(peer);

    peer.on('open', () => {
      if (peer !== this.peer || token !== this._attemptToken) return;
      this._peerOpened = true;
      const conn = peer.connect(this._id(this.code), {
        reliable: true,
        serialization: 'json',
        metadata: {
          network: this._networkId(),
          protocol: this.PROTOCOL,
          role: 'guest',
          relayOnly: !!step.relayOnly
        }
      });
      this.conn = conn;
      this._wire(conn, token);
      clearTimeout(this._connectTimer);
      this._connectTimer = setTimeout(() => this._advanceJoin(token), step.timeout);
    });

    peer.on('error', err => {
      if (peer !== this.peer || token !== this._attemptToken) return;
      const type = err && err.type ? err.type : 'network';
      if (type === 'browser-incompatible') {
        this._allowReconnect = false;
        this._status('err', this._t('networkUnavailable', 'Online play is not available in this browser.'));
        return;
      }
      this._advanceJoin(token, type === 'peer-unavailable' ? 900 : 1400);
    });
  },

  _advanceJoin(token, delay = 500) {
    if (token !== this._attemptToken || !this._allowReconnect || this.mode !== 'guest' || this.connected) return;
    this._destroyTransport();
    this._joinStep++;
    if (this._joinStep >= this.JOIN_PLAN.length) {
      this._joinStep = this._forceRelay ? 1 : 0;
      this._joinCycle++;
      delay = Math.min(7000, 2200 + this._joinCycle * 700);
      const publicRelayFailed = this._relaySource === 'public';
      this._status(this._joinCycle >= 2 ? 'err' : 'info', publicRelayFailed
        ? this._t(
          'networkRelayUnavailable',
          'The shared relay is unavailable. Keep Joku hosting room {code}; retrying direct and relay paths...',
          { code: this.code }
        )
        : this._t(
          'networkStillTrying',
          'Could not connect yet. Keep Joku hosting room {code}; retrying automatically...',
          { code: this.code }
        ));
    }
    this._scheduleGuestReconnect(delay);
  },

  _scheduleGuestReconnect(delay = 1200) {
    if (!this._allowReconnect || this.mode !== 'guest' || this.connected || this._retryTimer) return;
    clearTimeout(this._retryTimer);
    this._retryTimer = setTimeout(() => {
      this._retryTimer = null;
      this._startJoinAttempt();
    }, delay);
  },

  _scheduleHostRestart(delay = 1500) {
    if (!this._allowReconnect || this.mode !== 'host' || this._retryTimer) return;
    clearTimeout(this._retryTimer);
    this._retryTimer = setTimeout(() => {
      this._retryTimer = null;
      if (!this._allowReconnect || this.mode !== 'host') return;
      const operation = ++this._operationToken;
      this._startHost(operation);
    }, delay);
  },

  _watchPeer(peer) {
    peer.on('disconnected', () => {
      if (peer !== this.peer || !this._peerOpened || peer.destroyed) return;
      this._status('info', this._t('networkSignalRetry', 'The connection service paused. Reconnecting...'));
      try { peer.reconnect(); } catch (e) {
        if (this.mode === 'host') this._scheduleHostRestart();
        else if (!this.connected) this._scheduleGuestReconnect();
      }
    });
  },

  _wire(conn, token) {
    conn.on('open', () => {
      if (conn !== this.conn) return;
      clearTimeout(this._connectTimer); this._connectTimer = null;
      clearTimeout(this._retryTimer); this._retryTimer = null;
      this.connected = true;
      this.route = 'checking';
      this.rtt = null;
      this._lastReceive = Date.now();
      this._joinStep = 0;
      this._joinCycle = 0;
      this._status('ok', this._t('connectedShort', 'Connected!'));
      this._startKeepAlive();
      this._inspectRoute(conn, 0);
      if (this.mode === 'host' && this.onPeerJoin) this.onPeerJoin();
    });

    conn.on('data', data => {
      if (!data) return;
      this._lastReceive = Date.now();
      if (data.t === 'ping') {
        try { conn.send({ t: 'pong', id: data.id, at: data.at }); } catch (e) {}
        return;
      }
      if (data.t === 'pong') {
        if (data.at) this.rtt = Math.max(0, Date.now() - data.at);
        return;
      }
      if (this.onMsg) this.onMsg(data);
    });

    conn.on('close', () => this._connectionEnded(conn, token));
    conn.on('error', () => this._connectionEnded(conn, token));
  },

  _connectionEnded(conn, token) {
    if (conn !== this.conn || conn._jokuEnded) return;
    conn._jokuEnded = true;
    const wasConnected = this.connected;
    this.conn = null;
    this.connected = false;
    this.route = '';
    this.rtt = null;
    clearInterval(this._keepAlive); this._keepAlive = null;
    this._lastReceive = 0;
    clearTimeout(this._connectTimer); this._connectTimer = null;

    if (wasConnected && this.onDrop) this.onDrop();
    if (this.mode === 'guest' && this._allowReconnect) {
      if (wasConnected) {
        this._joinStep = this._forceRelay ? 1 : 0;
        this._status('info', this._t('networkAutoReconnect', 'Connection lost. Reconnecting automatically...'));
        this._scheduleGuestReconnect(900);
      } else {
        this._advanceJoin(token, 350);
      }
    } else if (this.mode === 'host' && this._allowReconnect) {
      this._status('info', this._t('networkWaitingReconnect', 'Waiting for Jolie to reconnect with room {code}...', { code: this.code }));
    }
  },

  _startKeepAlive() {
    clearInterval(this._keepAlive);
    this._keepAlive = setInterval(() => {
      if (document.visibilityState === 'visible' && this.conn && this._lastReceive && Date.now() - this._lastReceive > 15000) {
        this._connectionEnded(this.conn, this._attemptToken);
        return;
      }
      this.send({ t: 'ping', id: Date.now().toString(36), at: Date.now() }, { volatile: true, maxBuffered: 8192 });
    }, 3000);
  },

  async _inspectRoute(conn, retry) {
    try {
      const pc = conn.peerConnection;
      if (!pc || !pc.getStats) return;
      const stats = await pc.getStats();
      let selected = null;
      let local = null;
      let remote = null;
      stats.forEach(report => {
        if (report.type === 'transport' && report.selectedCandidatePairId) selected = stats.get(report.selectedCandidatePairId) || selected;
        if (report.type === 'candidate-pair' && report.state === 'succeeded' && (report.selected || report.nominated)) selected = report;
      });
      if (selected) {
        local = stats.get(selected.localCandidateId);
        remote = stats.get(selected.remoteCandidateId);
      }
      if (!selected && retry < 2) {
        setTimeout(() => this._inspectRoute(conn, retry + 1), 800 + retry * 700);
        return;
      }
      if (conn !== this.conn || !this.connected) return;
      const relayed = !!((local && local.candidateType === 'relay') || (remote && remote.candidateType === 'relay'));
      this.route = relayed ? 'relay' : 'direct';
      this._status('route', relayed
        ? this._t('networkConnectedRelay', 'Connected through the worldwide relay.')
        : this._t('networkConnectedDirect', 'Connected directly over the internet.'));
    } catch (e) {
      // Route details are optional and vary between browser implementations.
    }
  },

  send(obj, options = {}) {
    if (!this.connected || !this.conn || !this.conn.open) return false;
    const channel = this.conn.dataChannel || this.conn._dc;
    if (options.volatile && channel && channel.bufferedAmount > (options.maxBuffered || 32768)) return false;
    try {
      this.conn.send(obj);
      return true;
    } catch (e) {
      return false;
    }
  },

  _destroyTransport() {
    clearTimeout(this._connectTimer); this._connectTimer = null;
    clearInterval(this._keepAlive); this._keepAlive = null;
    const conn = this.conn;
    const peer = this.peer;
    this.conn = null;
    this.peer = null;
    this.connected = false;
    this._peerOpened = false;
    this.route = '';
    this.rtt = null;
    this._lastReceive = 0;
    if (conn) { try { conn.close(); } catch (e) {} }
    if (peer) { try { peer.destroy(); } catch (e) {} }
  },

  close() {
    this._allowReconnect = false;
    ++this._attemptToken;
    ++this._operationToken;
    clearTimeout(this._retryTimer); this._retryTimer = null;
    this._destroyTransport();
    this.mode = 'solo';
  },

  _status(kind, message) {
    if (this.onStatus) this.onStatus(kind, message);
  }
};

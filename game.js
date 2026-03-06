import { Octokit } from "https://cdn.skypack.dev/@octokit/rest";

/**
 * 1. Audio Module (Sound Design)
 */
class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    trigger(freq, dur, type = 'sine') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + dur);
    }
}

/**
 * 2. Network Module (P2P Interface)
 */
class NetworkController {
    constructor(onDataCallback) {
        this.peer = new Peer();
        this.conn = null;
        this.onData = onDataCallback;
        this.init();
    }
    init() {
        this.peer.on('open', id => document.getElementById('local-id').innerText = id);
        this.peer.on('connection', c => this.setupConnection(c));
    }
    connect(targetId) {
        this.setupConnection(this.peer.connect(targetId));
    }
    setupConnection(conn) {
        this.conn = conn;
        this.conn.on('data', data => this.onData(data));
    }
    send(payload) {
        if (this.conn) this.conn.send(payload);
    }
}

/**
 * 3. Core Engine (Main Logic)
 */
class TerminalEngine {
    constructor() {
        this.state = {
            hp: { p: 100, e: 100 },
            field: { p: [], e: [] },
            hand: [],
            isRemoteTurn: false
        };
        this.audio = new AudioManager();
        this.network = new NetworkController((d) => this.handleRemoteData(d));
        this.init();
    }

    init() {
        this.bindDOM();
        this.generateInitialDeck();
        this.render();
    }

    bindDOM() {
        document.getElementById('ctrl-panel-trigger').onclick = () => document.getElementById('overlay').classList.remove('hidden');
        document.getElementById('commit-btn').onclick = () => this.processTurn();
        // Dynamic event delegation for cards
        document.getElementById('hand-mount').onclick = (e) => {
            const cardEl = e.target.closest('.card-unit');
            if (cardEl) this.deploy(parseInt(cardEl.dataset.idx));
        };
    }

    generateInitialDeck() {
        // プロレベルのデータ生成ロジック
        const pool = [];
        ['W','D','S','C'].forEach(attr => {
            for(let i=1; i<=15; i++) pool.push({ id: `${attr}-${i}`, name: `MODULE_${attr}_${i}`, cost: 10, atk: 5, ls: 3 });
        });
        this.state.hand = pool.sort(() => Math.random() - 0.5).slice(0, 5);
    }

    deploy(idx) {
        const card = this.state.hand[idx];
        if (this.state.hp.p >= card.cost) {
            this.state.hp.p -= card.cost;
            const instance = { ...card, currentLS: card.ls };
            this.state.field.p.push(instance);
            this.state.hand.splice(idx, 1);
            
            this.audio.trigger(440, 0.1, 'triangle');
            this.network.send({ type: 'DEPLOY', card: instance });
            this.render();
        }
    }

    processTurn() {
        // UI Feedback
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 200);

        // Logic
        const damage = this.state.field.p.reduce((acc, c) => acc + c.atk, 0);
        this.state.hp.e -= damage;
        
        this.state.field.p = this.state.field.p.map(c => ({...c, currentLS: c.currentLS - 1})).filter(c => c.currentLS > 0);
        
        this.state.hp.p = Math.min(this.state.hp.p + 15, 100);
        this.audio.trigger(150, 0.3, 'sawtooth');
        
        this.network.send({ type: 'END_TURN' });
        this.render();
    }

    handleRemoteData(data) {
        if (data.type === 'DEPLOY') this.state.field.e.push({...data.card, currentLS: data.card.ls});
        if (data.type === 'END_TURN') this.processTurn(true);
        this.render();
    }

    render() {
        document.getElementById('p-gauge').style.width = `${this.state.hp.p}%`;
        document.getElementById('e-gauge').style.width = `${this.state.hp.e}%`;
        
        const cardHTML = (c, i, hand) => `
            <div class="card-unit" data-idx="${i}">
                <div class="ls-bar">${c.currentLS || c.ls}</div>
                <div class="name">${c.name}</div>
                <div class="atk">ATK: ${c.atk}</div>
            </div>`;
            
        document.getElementById('hand-mount').innerHTML = this.state.hand.map((c, i) => cardHTML(c, i, true)).join('');
        document.getElementById('player-zone').innerHTML = this.state.field.p.map((c, i) => cardHTML(c, i, false)).join('');
        document.getElementById('enemy-zone').innerHTML = this.state.field.e.map((c, i) => cardHTML(c, i, false)).join('');
    }
}

// 起動
window.engine = new TerminalEngine();

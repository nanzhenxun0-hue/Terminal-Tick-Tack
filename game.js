import { Octokit } from "https://cdn.skypack.dev/@octokit/rest";

const state = { pTime: 100, eTime: 100, pField: [], eField: [], hand: [], turn: 1 };
const DB = [];
['W','D','S','C'].forEach(p => { 
    for(let i=1; i<=50; i++) DB.push({ id: p+i, name: p+'_Mod_'+i, cost: i%10+5, atk: i%5+2, ls: i%3+2, color: '#00ff41'}); 
});

const ctx = new (window.AudioContext || window.webkitAudioContext)();
function sfx(f, d) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = f; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + d);
}

window.deploy = (i) => {
    const c = state.hand[i];
    if(state.pTime >= c.cost) {
        state.pTime -= c.cost; state.pField.push({...c, currLS: c.ls});
        state.hand.splice(i, 1); sfx(440, 0.2); render();
    }
};

window.nextTurn = () => {
    state.eTime -= state.pField.reduce((a, b) => a + b.atk, 0);
    state.pField = state.pField.map(c => ({...c, currLS: c.currLS - 1})).filter(c => c.currLS > 0);
    state.pTime = Math.min(state.pTime + 10, 100); render();
};

function render() {
    document.getElementById('player-time').innerText = state.pTime;
    const draw = (id, cards, hand) => {
        document.getElementById(id).innerHTML = cards.map((c, i) => `
            <div class="card" onclick="${hand?`deploy(${i})`:''}" style="border-color:${c.color}">
                <div class="ls-bar">${Array.from({length:c.ls}).map((_,li)=>`<div class="ls-block ${li<c.currLS?'':'off'} ${c.currLS==1?'warning':''}"></div>`).join('')}</div>
                <div style="font-size:10px;text-align:center;margin-top:40px">${c.name}<br>ATK:${c.atk}</div>
            </div>`).join('');
    };
    draw('player-field', state.pField); draw('hand-area', state.hand, true);
}

state.hand = DB.slice(0, 5);
document.getElementById('end-turn-btn').onclick = nextTurn;
render();

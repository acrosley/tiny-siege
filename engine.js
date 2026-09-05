/* Tiny Siege rules. Pure state transitions; shared by the browser and Node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Siege = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const W = 7, H = 6, CAP = 20;
  const PIECES = Object.freeze({
    timber: { name: 'Timber', cost: 2, hp: 6, icon: '▤', color: '#b97e50', desc: 'Cheap cover. Build more fortress for less.', role: 'BUDGET COVER' },
    stone: { name: 'Stone', cost: 3, hp: 10, icon: '▦', color: '#87959d', desc: 'Dependable protection with 10 health.', role: 'SOLID DEFENSE' },
    iron: { name: 'Iron', cost: 5, hp: 14, armor: 1, icon: '▣', color: '#657c89', desc: '14 health. Reduces each weapon hit by 1.', role: 'HEAVY ARMOR' },
    brace: { name: 'Brace', cost: 3, hp: 7, icon: '╳', color: '#d6ab6a', desc: 'Connects diagonally as well as sideways. Saves overhangs.', role: 'STRUCTURAL SUPPORT' },
    sandbag: { name: 'Sandbag', cost: 3, hp: 8, blastArmor: 3, icon: '≋', color: '#b7b081', desc: 'Reduces mortar, scatter and explosion damage by 3.', role: 'BLAST RESISTANCE' },
    mint: { name: 'Mint', cost: 4, hp: 5, icon: '◆', color: '#d9b94b', desc: '+1 supply each round while standing. Maximum +2.', role: 'ECONOMY' },
    arsenal: { name: 'Arsenal', cost: 4, hp: 6, icon: '✦', color: '#d07450', desc: '+1 damage to each weapon hit. Maximum +2.', role: 'FIREPOWER' },
    powder: { name: 'Powder', cost: 1, hp: 9, icon: '✹', color: '#ad6258', desc: 'Cheap, sturdy, dangerous. Explodes for 6 damage to its four neighbors.', role: 'VOLATILE COVER' }
  });
  const WEAPONS = Object.freeze({
    cannon: { name: 'Cannon', cost: 2, damage: 8, icon: '●', desc: '8 damage. Hits the first block in the selected row.', role: 'BREAK THE FRONT' },
    mortar: { name: 'Mortar', cost: 6, damage: 7, blast: true, icon: '◒', desc: '7 blast damage. Drops directly on your chosen cell, bypassing cover.', role: 'OVER THE WALL' },
    drill: { name: 'Drill shot', cost: 4, damage: 5, icon: '➤', desc: '5 damage to each of the first two blocks in the selected row.', role: 'PIERCE TWO BLOCKS' },
    scatter: { name: 'Scatter', cost: 4, damage: 5, blast: true, icon: '⁙', desc: '5 blast damage to the first block in the row; 3 to its four neighbors.', role: 'SHATTER A CLUSTER' }
  });
  const key = (x, y) => `${x},${y}`;
  const inside = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < W && y >= 0 && y < H;
  const neighbors = (x, y) => [[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
  const clone = x => JSON.parse(JSON.stringify(x));
  function cell(type, max) { const hp = type === 'command' ? max : PIECES[type].hp; return { type, hp, max: hp, ward: 0 }; }
  function newGame(names = ['Ember', 'Tide'], mode = 'standard') {
    if (!['standard','quick'].includes(mode)) mode = 'standard';
    const max = mode === 'quick' ? 18 : 24;
    return { round: 1, mode, result: null, players: names.slice(0,2).map((name,i) => {
      const board = {};
      board[key(4,0)] = cell('command', max);
      for (const [x,y,type] of [[1,0,'stone'],[1,1,'timber'],[3,0,'timber'],[4,1,'stone'],[5,0,'timber'],[5,1,'timber']]) board[key(x,y)] = cell(type);
      return { name: String(name || (i ? 'Tide' : 'Ember')).slice(0,20), supply: 10, board };
    }), history: [] };
  }
  function supported(board) {
    const found = new Set(Object.keys(board).filter(k => k.endsWith(',0')));
    const queue = [...found];
    while (queue.length) {
      const k = queue.shift(), [x,y] = k.split(',').map(Number);
      const possible = [...neighbors(x,y), [x-1,y-1],[x-1,y+1],[x+1,y-1],[x+1,y+1]];
      for (const [a,b] of possible) {
        const nk = key(a,b), c = board[nk];
        if (!c || found.has(nk)) continue;
        const diagonal = a !== x && b !== y;
        if (diagonal && c.type !== 'brace' && board[k].type !== 'brace') continue;
        found.add(nk); queue.push(nk);
      }
    }
    return found;
  }
  function planCost(plan) {
    if (!plan) return 0;
    if (plan.kind === 'build') return (plan.placements || []).reduce((n,p) => n + (PIECES[p.type]?.cost || 0), 0);
    if (plan.kind === 'reinforce') return (plan.targets || []).length * 2;
    if (plan.kind === 'fire') return WEAPONS[plan.weapon]?.cost || 0;
    return 0;
  }
  function validate(game, side, plan) {
    const p = game.players[side];
    if (game.result) return 'This match has ended.';
    if (!p || !plan) return 'Choose an order.';
    if (planCost(plan) > p.supply) return 'Not enough supplies.';
    if (plan.kind === 'pass') return null;
    if (plan.kind === 'build') {
      if (!Array.isArray(plan.placements) || !plan.placements.length || plan.placements.length > 3) return 'Place 1–3 pieces.';
      const board = clone(p.board);
      for (const a of plan.placements) {
        if (!inside(a.x,a.y) || !PIECES[a.type]) return 'Invalid building piece.';
        if (board[key(a.x,a.y)]) return 'That cell is occupied.';
        board[key(a.x,a.y)] = cell(a.type);
      }
      const connected = supported(board);
      if (Object.keys(board).some(k => !connected.has(k))) return 'Every piece needs a connected path to the ground.';
      return null;
    }
    if (plan.kind === 'reinforce') {
      if (!Array.isArray(plan.targets) || !plan.targets.length || plan.targets.length > 3) return 'Choose 1–3 friendly blocks.';
      const used = new Set();
      for (const a of plan.targets) {
        if (!inside(a.x,a.y) || !p.board[key(a.x,a.y)]) return 'Choose an existing friendly block.';
        if (used.has(key(a.x,a.y))) return 'Choose each block only once.';
        used.add(key(a.x,a.y));
      }
      return null;
    }
    if (plan.kind === 'fire') {
      if (!WEAPONS[plan.weapon] || !plan.target || !inside(plan.target.x, plan.target.y)) return 'Choose a weapon and an enemy cell.';
      return null;
    }
    return 'Unknown order.';
  }
  function bonus(player, type) { return Math.min(2,Object.values(player.board).filter(c => c.type === type).length); }
  function hitsFor(player, enemy, plan) {
    if (plan.kind !== 'fire') return [];
    const weapon = WEAPONS[plan.weapon], extra = bonus(player,'arsenal'), {x,y} = plan.target;
    if (plan.weapon === 'mortar') return [{x,y,damage:weapon.damage+extra,blast:true}];
    const row = Object.keys(enemy.board).map(k => k.split(',').map(Number)).filter(a => a[1] === y).sort((a,b) => a[0]-b[0]);
    if (!row.length) return [{x,y,damage:0,blast:!!weapon.blast}];
    const [a,b] = row[0];
    if (plan.weapon === 'drill') return row.slice(0,2).map(([x,y]) => ({x,y,damage:weapon.damage+extra,blast:false}));
    if (plan.weapon === 'scatter') return [{x:a,y:b,damage:5+extra,blast:true}, ...neighbors(a,b).filter(([x,y])=>inside(x,y)).map(([x,y]) => ({x,y,damage:3+extra,blast:true}))];
    return [{x:a,y:b,damage:weapon.damage+extra,blast:false}];
  }
  function pressure(game) { const start = game.mode === 'quick' ? 9 : 13; return game.round < start ? 0 : 2 + Math.floor((game.round-start)/2)*2; }
  function resolve(game, plans) {
    if (!Array.isArray(plans) || plans.length !== 2) throw new Error('Two orders required.');
    for(let i=0;i<2;i++) { const e=validate(game,i,plans[i]); if(e) throw new Error(e); }
    const next=clone(game), events=[];
    next.players.forEach((p,i) => {
      for(const c of Object.values(p.board)) c.ward=0;
      p.supply-=planCost(plans[i]);
      const plan=plans[i];
      if(plan.kind==='build') for(const a of plan.placements) { p.board[key(a.x,a.y)]=cell(a.type); events.push({kind:'build',side:i,...a}); }
      if(plan.kind==='reinforce') for(const a of plan.targets) { const c=p.board[key(a.x,a.y)]; c.hp=Math.min(c.max,c.hp+6); c.ward=4; events.push({kind:'reinforce',side:i,...a}); }
    });
    // Snapshot both attacks BEFORE applying either: destroyed arsenals still fire this round.
    const attacks=plans.map((plan,i)=>hitsFor(next.players[i],next.players[1-i],plan));
    function damage(side, hit, source) {
      const c=next.players[side].board[key(hit.x,hit.y)];
      if(!c) { if(source==='shot') events.push({kind:'miss',side,...hit}); return; }
      const spec=PIECES[c.type] || {}, armor=(spec.armor||0)+(hit.blast ? spec.blastArmor||0 : 0);
      const raw=Math.max(0,hit.damage-armor), absorbed=Math.min(c.ward,raw), amount=raw-absorbed;
      c.ward-=absorbed; c.hp-=amount;
      events.push({kind:'damage',side,x:hit.x,y:hit.y,amount,absorbed,source});
    }
    attacks.forEach((hits,i)=>{ if(plans[i].kind==='fire') events.push({kind:'shot',side:i,weapon:plans[i].weapon,target:plans[i].target,hits}); hits.forEach(h=>damage(1-i,h,'shot')); });
    // Chain reactions happen once per powder block. Collapse itself never detonates powder.
    next.players.forEach((p,side)=>{
      let dead;
      while((dead=Object.entries(p.board).filter(([,c])=>c.hp<=0)).length) {
        for(const [k,c] of dead) {
          if(!p.board[k]) continue;
          const [x,y]=k.split(',').map(Number); delete p.board[k];
          events.push({kind:'destroy',side,x,y,type:c.type});
          if(c.type==='powder') { events.push({kind:'explosion',side,x,y}); neighbors(x,y).forEach(([a,b])=>damage(side,{x:a,y:b,damage:6,blast:true},'explosion')); }
        }
      }
      const connected=supported(p.board);
      for(const k of Object.keys(p.board)) if(!connected.has(k)) { const [x,y]=k.split(',').map(Number); events.push({kind:'collapse',side,x,y,type:p.board[k].type}); delete p.board[k]; }
    });
    const storm=pressure(game);
    if(storm) next.players.forEach((p,side)=>{ const c=p.board['4,0']; if(c) { c.hp-=storm; events.push({kind:'pressure',side,amount:storm,x:4,y:0}); if(c.hp<=0) {delete p.board['4,0']; events.push({kind:'destroy',side,x:4,y:0,type:'command'});} } });
    const alive=next.players.map(p=>!!p.board['4,0']);
    if(!alive[0]&&!alive[1]) next.result={winner:null,reason:'mutual'};
    else if(!alive[0]||!alive[1]) next.result={winner:alive[0]?0:1,reason:'command'};
    else if(game.round>=30) next.result={winner:null,reason:'limit'};
    next.players.forEach(p=>{ for(const c of Object.values(p.board)) c.ward=0; if(!next.result) p.supply=Math.min(CAP,p.supply+4+bonus(p,'mint')); });
    next.history.push({round:game.round,plans:clone(plans),events:clone(events)});
    if(!next.result) next.round++;
    return {game:next,events,attacks};
  }
  return {W,H,CAP,PIECES,WEAPONS,key,inside,cell,clone,newGame,supported,planCost,validate,bonus,hitsFor,pressure,resolve};
});

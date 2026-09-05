import S from '../engine.js';
const DAY=24*60*60*1000;
const encoder=new TextEncoder();
const random=()=>crypto.randomUUID().replaceAll('-','');
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function name(value){if(typeof value!=='string'||!value.trim())fail(400,'Enter your commander name.');return value.trim().slice(0,20);}
function cleanPlan(p){
  if(!p||typeof p!=='object')fail(400,'Choose an order.');
  const coord=a=>{if(!a||!S.inside(a.x,a.y))fail(400,'Invalid cell.');return {x:a.x,y:a.y};};
  if(p.kind==='pass')return {kind:'pass'};
  if(p.kind==='build'){
    if(!Array.isArray(p.placements)||p.placements.length<1||p.placements.length>3)fail(400,'Choose 1–3 pieces.');
    return {kind:'build',placements:p.placements.map(a=>{if(!Object.hasOwn(S.PIECES,a?.type))fail(400,'Unknown piece.');return {...coord(a),type:a.type};})};
  }
  if(p.kind==='reinforce'){
    if(!Array.isArray(p.targets)||p.targets.length<1||p.targets.length>3)fail(400,'Choose 1–3 blocks.');
    return {kind:'reinforce',targets:p.targets.map(coord)};
  }
  if(p.kind==='fire'&&Object.hasOwn(S.WEAPONS,p.weapon))return {kind:'fire',weapon:p.weapon,target:coord(p.target)};
  fail(400,'Unknown order.');
}
function view(room,side,revision){
  // Never serialize pending plans, seat secrets, or credentials into the public view.
  return {code:room.code,side,revision,match:room.match,phase:room.phase,game:room.game,
    names:room.names,mode:room.mode,locked:room.pending.map(Boolean),ready:room.ready,
    rematch:room.rematch,closed:room.closed||false,
    resolution:room.phase==='report'?room.resolution:null,
    expires:room.updated+DAY};
}
async function read(db,code){
  const row=await db.prepare('SELECT data, revision FROM rooms WHERE code = ?').bind(code).first();
  if(!row)fail(404,'Room not found. Check the code or create a new room.');
  const room=JSON.parse(row.data);if(Date.now()-room.updated>DAY)fail(410,'This room expired. Create a new room.');
  return {room,revision:row.revision};
}
async function update(db,code,callback){
  for(let attempt=0;attempt<8;attempt++){
    const {room,revision}=await read(db,code);
    const side=await callback(room);
    room.updated=Date.now();
    const result=await db.prepare('UPDATE rooms SET data = ?, revision = ?, updated = ? WHERE code = ? AND revision = ?').bind(JSON.stringify(room),revision+1,room.updated,code,revision).run();
    if(result.meta.changes===1)return view(room,side,revision+1);
  }
  fail(409,'Your rival updated the room at the same moment. Please retry.');
}
async function body(request){
  if(Number(request.headers.get('content-length'))>8192)fail(413,'Order is too large.');
  const text=await request.text();if(text.length>8192)fail(413,'Order is too large.');
  try{return JSON.parse(text);}catch{fail(400,'Invalid request.');}
}
export async function api(request,env){
  try{
    const url=new URL(request.url),db=env.DB;
    if(!db)fail(503,'Online rooms are unavailable on this server. Local play still works.');
    if(request.method!=='GET'){
      const origin=request.headers.get('origin');
      if(origin&&origin!==url.origin)fail(403,'Please use this game’s own page.');
      if(!request.headers.get('content-type')?.includes('application/json'))fail(415,'Use JSON.');
    }
    if(url.pathname==='/api/health')return json({online:true});
    if(url.pathname==='/api/rooms'&&request.method==='POST'){
      const b=await body(request),player=name(b.name),mode=b.mode==='quick'?'quick':'standard';
      await db.prepare('DELETE FROM rooms WHERE updated < ?').bind(Date.now()-DAY).run();
      const count=await db.prepare('SELECT COUNT(*) AS total FROM rooms').first();
      if(count.total>=2000)fail(503,'All rooms are busy. Please try again later.');
      const token=random()+random(),hash=await digest(token);
      for(let attempt=0;attempt<5;attempt++){
        const code=random().slice(0,8).toUpperCase();
        const room={code,mode,names:[player,null],tokens:[hash,null],joinIds:[null,null],match:random(),phase:'lobby',game:null,pending:[null,null],ready:[false,false],rematch:[false,false],resolution:null,updated:Date.now()};
        const insert=await db.prepare('INSERT OR IGNORE INTO rooms (code, data, revision, updated) VALUES (?, ?, 0, ?)').bind(code,JSON.stringify(room),room.updated).run();
        if(insert.meta.changes)return json({...view(room,0,0),token},201);
      }
      fail(503,'Could not create a room. Try again.');
    }
    const match=url.pathname.match(/^\/api\/rooms\/([A-F0-9]{8})(?:\/(join|order|next|rematch|leave))?$/);
    if(!match)fail(404,'Not found.');
    const [,code,action]=match;
    if(action==='join'&&request.method==='POST'){
      const b=await body(request),player=name(b.name);
      // A caller-generated, unguessable secret makes retrying a lost join response safe.
      if(typeof b.token!=='string'||!/^[a-f0-9]{64}$/.test(b.token))fail(400,'Refresh the page and try joining again.');
      const hash=await digest(b.token);
      const result=await update(db,code,room=>{
        if(room.tokens[1]===hash)return 1;
        if(room.phase!=='lobby'||room.tokens[1])fail(409,'This room already has two commanders.');
        room.tokens[1]=hash;room.names[1]=player;room.game=S.newGame(room.names,room.mode);room.phase='planning';return 1;
      });
      return json(result);
    }
    const token=request.headers.get('authorization')?.replace(/^Bearer /,'');
    if(!token||!/^[a-f0-9]{64}$/.test(token))fail(401,'Your seat could not be verified. Rejoin using your original browser.');
    const hash=await digest(token);
    function seat(room){const side=room.tokens.indexOf(hash);if(side<0)fail(403,'This room belongs to other commanders.');return side;}
    if(!action&&request.method==='GET'){const {room,revision}=await read(db,code);return json(view(room,seat(room),revision));}
    if(request.method!=='POST')fail(405,'Method not allowed.');
    const b=await body(request);
    return json(await update(db,code,room=>{
      const side=seat(room);
      if(action==='leave'){
        room.closed=true;
        if(room.game&&!room.game.result){room.game.result={winner:1-side,reason:'forfeit'};room.phase='result';room.pending=[null,null];room.resolution=null;}
        else if(!room.game)room.phase='closed';
        return side;
      }
      if(room.closed)fail(409,'This room has closed. Create a new duel.');
      if(b.match!==room.match)fail(409,'A new match has started. Refresh your room.');
      if(action==='order'){
        if(room.phase!=='planning'||b.round!==room.game.round)fail(409,'That round has already ended.');
        const p=cleanPlan(b.plan);
        if(room.pending[side]){
          if(JSON.stringify(room.pending[side])===JSON.stringify(p))return side;
          fail(409,'Your order is already locked.');
        }
        const error=S.validate(room.game,side,p);if(error)fail(400,error);
        room.pending[side]=p;
        if(room.pending.every(Boolean)){
          const before=room.game,result=S.resolve(before,room.pending);
          room.game=result.game;room.resolution={before,events:result.events,attacks:result.attacks,plans:room.pending};
          room.pending=[null,null];room.ready=[false,false];room.phase='report';
        }
        return side;
      }
      if(action==='next'){
        if(room.phase!=='report'||b.round!==room.game.history.at(-1).round)fail(409,'The round has already advanced.');
        room.ready[side]=true;
        if(room.ready.every(Boolean)){room.phase=room.game.result?'result':'planning';room.resolution=null;room.ready=[false,false];}
        return side;
      }
      if(action==='rematch'){
        if(!room.game?.result)fail(409,'Finish this match first.');
        room.rematch[side]=true;
        if(room.rematch.every(Boolean)){
          room.game=S.newGame(room.names,room.mode);room.match=random();room.phase='planning';room.pending=[null,null];room.ready=[false,false];room.rematch=[false,false];room.resolution=null;
        }
        return side;
      }
      fail(404,'Unknown room action.');
    }));
  }catch(e){return json({error:e.status?e.message:'The room service had a problem. Please retry.'},e.status||500);}
}

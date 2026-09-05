/* Original canvas artwork. Coordinates are deterministic and shared with cell controls. */
window.SiegeScene = (() => {
  const SIZE=46, BW=1400, BH=530;
  const colors=['#dc704b','#41838a'];
  function pos(side,x,y) {return {x:side===0?490-x*SIZE:864+x*SIZE,y:362-y*SIZE};}
  function poly(c,points,fill,stroke) {c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
  function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
  function line(c,x,y,a,b,color,width=1){c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  function circle(c,x,y,r,color){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
  function cloud(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='#f5f3e794';c.beginPath();c.ellipse(0,0,57,12,0,0,Math.PI*2);c.ellipse(-17,-9,25,13,0,0,Math.PI*2);c.ellipse(14,-13,26,18,0,0,Math.PI*2);c.fill();c.restore();}
  function flag(c,x,y,side,time=0,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);line(c,0,0,0,-55,'#536f6d',3);const wave=Math.sin(time*.0015+side)*2;poly(c,[[1,-55],[30,-51+wave],[25,-39+wave],[1,-41]],colors[side]);line(c,4,-53,4,-43,'#fff2d75c',2);circle(c,0,-58,2.5,'#e4be73');c.restore();}
  function block(c,type,x,y,side,hp,max,alpha=1,time=0){
    c.save();c.globalAlpha=alpha;c.translate(x,y);
    const spec=Siege.PIECES[type], base=spec?.color||'#e3d6b7';
    rect(c,1,4,44,42,'#233a4133');rect(c,1,1,43,42,base);rect(c,1,1,43,5,'#ffffff25');rect(c,39,3,5,40,'#172f4025');rect(c,1,39,43,4,'#192e3228');
    c.lineWidth=1.2;c.strokeStyle='#30464680';c.strokeRect(1.5,1.5,42,41);
    if(type==='timber'){for(const v of [14,28])line(c,2,v,40,v,'#725240',1.5);line(c,11,2,11,13,'#725240');line(c,29,15,29,27,'#725240');line(c,16,29,16,40,'#725240');for(const [a,b] of [[5,7],[35,20],[6,34]])circle(c,a,b,1,'#ead4a1');}
    if(type==='stone'){line(c,2,20,41,20,'#536970',2);line(c,22,2,22,19,'#536970',2);line(c,12,21,12,40,'#536970',2);line(c,33,21,33,40,'#536970',2);line(c,4,5,18,5,'#cfdbd477');line(c,25,24,30,24,'#cfdbd477');}
    if(type==='iron'){rect(c,7,7,29,28,'#57717e');c.strokeStyle='#adbbaf';c.strokeRect(7.5,7.5,28,27);for(const a of [5,38])for(const b of [5,37])circle(c,a,b,2,'#d5d3b8');line(c,10,32,32,10,'#a1b6b855',2);}
    if(type==='brace'){rect(c,7,7,29,29,'#506b6c');poly(c,[[4,4],[10,4],[40,35],[40,40],[34,40],[4,10]],'#dfb777');poly(c,[[34,4],[40,4],[40,10],[10,40],[4,40],[4,34]],'#eac68d');for(const a of [7,37])for(const b of [7,37])circle(c,a,b,1.5,'#6f634c');}
    if(type==='sandbag'){for(let r=0;r<3;r++){for(let j=0;j<2;j++){const a=3+j*20,b=4+r*12;c.fillStyle=r%2?'#b2a777':'#c2b78c';c.beginPath();c.roundRect(a,b,19,11,4);c.fill();line(c,a+3,b+8,a+16,b+8,'#8e8e67');}}}
    if(type==='mint'){rect(c,7,7,29,29,'#7c8c6a');circle(c,22,22,12,'#e8c456');circle(c,22,22,8,'#bd9640');c.fillStyle='#ffe6a0';c.font='bold 16px Georgia';c.textAlign='center';c.fillText('◆',22,28);}
    if(type==='arsenal'){rect(c,6,6,31,30,'#825847');line(c,12,31,31,11,'#e0cfa1',6);line(c,12,11,31,31,'#e0cfa1',6);circle(c,22,21,6,'#495654');circle(c,22,21,2,'#1f393d');}
    if(type==='powder'){rect(c,7,4,29,35,'#8b524c');rect(c,6,11,31,4,'#403f3d');rect(c,6,29,31,4,'#403f3d');circle(c,22,21,6,'#e7b279');c.fillStyle='#70483e';c.font='bold 10px sans-serif';c.textAlign='center';c.fillText('×',22,25);line(c,23,4,27,-3,'#5e5f43',2);circle(c,28,-4,2,'#e9b951');}
    if(type==='command'){
      rect(c,2,2,41,8,'#f1e4c5');for(const a of [2,17,32])rect(c,a,-5,11,9,'#e2d2b0');rect(c,9,15,25,26,colors[side]);poly(c,[[9,15],[34,15],[34,32],[22,40],[9,32]],colors[side]);poly(c,[[15,20],[18,24],[22,19],[27,24],[30,20],[28,31],[17,31]],'#f9e6b3');flag(c,22,-5,side,time,.9);
    }
    if(hp<max){const f=hp/max;c.strokeStyle='#243d4299';c.lineWidth=1.6;c.beginPath();c.moveTo(25,2);c.lineTo(22,12);c.lineTo(29,16);c.lineTo(20,24);if(f<.5){c.lineTo(25,31);c.lineTo(19,40);}c.stroke();rect(c,5,37,33,3,'#283d4860');rect(c,5,37,33*Math.max(0,f),3,f<.35?'#faaf70':'#e8d8a2');}
    c.restore();
  }
  function cannon(c,x,y,side,time=0){c.save();c.translate(x,y);c.scale(side===0?1:-1,1);circle(c,-11,-10,18,'#2e4648');circle(c,-11,-10,11,'#a58b62');circle(c,-11,-10,4,'#344b4c');for(let i=0;i<6;i++){let a=i*Math.PI/3;line(c,-11,-10,-11+Math.cos(a)*9,-10+Math.sin(a)*9,'#3e5352',2);}poly(c,[[-30,-24],[21,-41],[45,-37],[48,-25],[-15,-8]],'#334c50');poly(c,[[-25,-24],[22,-37],[43,-34],[41,-31],[-20,-15]],'#577375');poly(c,[[40,-37],[50,-39],[55,-26],[47,-22]],'#203c43');rect(c,-37,0,66,5,'#64746a');c.restore();}
  function backdrop(c,time,hero=false){
    const grad=c.createLinearGradient(0,0,0,530);grad.addColorStop(0,'#e8ebdc');grad.addColorStop(.7,'#d4e1d8');grad.addColorStop(1,'#b1c5bd');rect(c,0,0,BW,BH,grad);
    circle(c,705,120,55,'#e9b397');circle(c,705,120,43,'#e8b092');cloud(c,194,91,.85);cloud(c,1130,110,1);cloud(c,846,54,.65);
    poly(c,[[0,286],[88,241],[166,274],[257,205],[347,267],[437,231],[512,282],[603,222],[678,267],[743,214],[831,258],[932,201],[1040,251],[1174,204],[1300,263],[1400,225],[1400,530],[0,530]],'#bbcdc6');
    poly(c,[[0,328],[107,289],[211,311],[330,262],[426,307],[537,284],[655,330],[780,266],[893,310],[995,276],[1104,322],[1237,273],[1400,310],[1400,530],[0,530]],'#9eb7ac');
    poly(c,[[0,363],[91,337],[191,360],[300,320],[401,347],[550,338],[674,372],[808,322],[900,352],[1014,342],[1147,366],[1274,327],[1400,344],[1400,530],[0,530]],'#86a494');
    for(const [x,y,s] of [[49,330,1],[88,337,.7],[588,347,.8],[1233,330,1],[1266,342,.7],[761,337,.6]]){rect(c,x-2,y,4,27*s,'#648775');poly(c,[[x,y-35*s],[x-15*s,y+10*s],[x+15*s,y+10*s]],'#729784');poly(c,[[x,y-20*s],[x-19*s,y+20*s],[x+19*s,y+20*s]],'#729784');}
    for(const [x,y] of [[651,94],[668,99],[1014,65]]){c.beginPath();c.moveTo(x-4,y);c.quadraticCurveTo(x-1,y-4,x+2,y);c.quadraticCurveTo(x+5,y-4,x+8,y);c.strokeStyle='#78918b';c.lineWidth=1.3;c.stroke();}
    // A quiet river and a tiny broken bridge between the two islands.
    poly(c,[[662,390],[726,390],[812,530],[571,530]],'#a8c6bf');for(let i=0;i<5;i++)line(c,647-i*7,422+i*19,724+i*11,422+i*19,'#d2e2d76b',2);
  }
  function island(c,side){c.save();if(side)c.translate(1400,0),c.scale(-1,1);
    poly(c,[[76,408],[568,408],[598,436],[559,449],[554,487],[487,515],[163,518],[107,488]],'#7c8776');
    poly(c,[[76,413],[568,414],[580,438],[537,461],[511,502],[464,519],[414,480],[328,510],[280,472],[222,516],[154,501],[111,473]],'#92927b');
    poly(c,[[97,422],[164,438],[155,482],[126,469]],'#aaa188');poly(c,[[291,431],[348,423],[365,466],[327,505]],'#767f70');poly(c,[[459,430],[542,420],[527,465],[493,499],[475,477]],'#a69b81');
    poly(c,[[68,405],[562,405],[583,418],[570,432],[98,431],[71,423]],'#536f57');rect(c,86,405,465,9,'#94a471');
    for(let i=0;i<25;i++){const x=93+i*19,y=408+(i%3);line(c,x,y,x-3,y-5-(i%4),'#799267',1.5);}
    for(const [x,y] of [[192,458],[392,453],[234,479],[451,492],[99,438]]){poly(c,[[x,y],[x+10,y-3],[x+15,y+4],[x+4,y+5]],'#6e7f6b');}
    c.restore();}
  function render(canvas,game,opts={}){
    if(!canvas)return;
    const dpr=Math.min(window.devicePixelRatio||1,2);const width=1400,height=530;
    if(canvas.width!==width*dpr){canvas.width=width*dpr;canvas.height=height*dpr;}
    const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);
    const time=opts.time||0;backdrop(c,time);island(c,0);island(c,1);
    if(opts.planning){
      const aim=opts.kind==='fire',side=aim?1-opts.side:opts.side;
      for(let y=0;y<Siege.H;y++)for(let x=0;x<Siege.W;x++){
        const p=pos(side,x,y);c.fillStyle=(x+y)%2?'#faf8e709':'#faf8e71a';c.fillRect(p.x,p.y,SIZE-2,SIZE-2);c.strokeStyle='#fbf8e82c';c.lineWidth=1;c.strokeRect(p.x+.5,p.y+.5,SIZE-2,SIZE-2);
      }
      for(let y=0;y<6;y++){const p=pos(side,6,y);c.fillStyle='#5d7973';c.font='9px Segoe UI';c.textAlign=side===0?'right':'left';c.fillText(String(y+1),side===0?p.x-10:p.x+55,p.y+25);}
    }
    game.players.forEach((player,side)=>{
      Object.entries(player.board).sort((a,b)=>Number(a[0].split(',')[1])-Number(b[0].split(',')[1])).forEach(([k,b])=>{const [x,y]=k.split(',').map(Number),p=pos(side,x,y);block(c,b.type,p.x,p.y,side,b.hp,b.max,1,time);});
      cannon(c,side?815:588,407,side,time);
      // Spare shot and camp pennants make the battlefield feel inhabited.
      for(const [a,b] of [[0,0],[11,0],[5,-9]])circle(c,(side?786:623)+a,401+b,6,'#4a6262');
      flag(c,side?1201:191,404,side,time,.72);
    });
    const plan=opts.plan;
    if(plan?.kind==='build')for(const a of plan.placements){const p=pos(opts.side,a.x,a.y);block(c,a.type,p.x,p.y,opts.side,Siege.PIECES[a.type].hp,Siege.PIECES[a.type].hp,.63,time);c.strokeStyle='#fff5bf';c.lineWidth=2;c.setLineDash([5,3]);c.strokeRect(p.x,p.y,44,44);c.setLineDash([]);}
    if(plan?.kind==='reinforce')for(const a of plan.targets){const p=pos(opts.side,a.x,a.y);rect(c,p.x,p.y,44,44,'#b5e6d44d');c.strokeStyle='#f4f5c0';c.lineWidth=3;c.strokeRect(p.x+2,p.y+2,40,39);c.fillStyle='#fdfbd8';c.font='bold 22px Segoe UI';c.textAlign='center';c.fillText('+',p.x+22,p.y+30);}
    if(plan?.kind==='fire'&&plan.target){
      const side=1-opts.side,p=pos(side,plan.target.x,plan.target.y);const hits=Siege.hitsFor(game.players[opts.side],game.players[side],plan);
      if(plan.weapon!=='mortar'){const first=pos(side,0,plan.target.y),last=pos(side,6,plan.target.y);rect(c,Math.min(first.x,last.x),p.y,320,44,'#df704816');line(c,side?811:587,p.y+22,side?1183:215,p.y+22,'#b9584980',1);}
      hits.forEach(h=>{const q=pos(side,h.x,h.y);rect(c,q.x+1,q.y+1,42,42,'#dc6c4b40');c.strokeStyle='#b35136';c.lineWidth=2;c.strokeRect(q.x+1,q.y+1,42,42);});
      c.strokeStyle='#fff4d3';c.lineWidth=2;c.beginPath();c.arc(p.x+22,p.y+22,15,0,Math.PI*2);c.stroke();line(c,p.x+22,p.y+1,p.x+22,p.y+12,'#fff4d3',2);line(c,p.x+22,p.y+32,p.x+22,p.y+43,'#fff4d3',2);line(c,p.x+1,p.y+22,p.x+12,p.y+22,'#fff4d3',2);line(c,p.x+32,p.y+22,p.x+43,p.y+22,'#fff4d3',2);
    }
    if(opts.animation){
      const {t,events,attacks}=opts.animation;
      if(t<.62)attacks.forEach((hits,i)=>{if(!hits.length)return;const h=hits[0],to=pos(1-i,h.x,h.y),start={x:i?815:588,y:373},q=Math.min(1,t/.62),x=start.x+(to.x+22-start.x)*q,y=start.y+(to.y+22-start.y)*q-180*Math.sin(q*Math.PI);for(let j=5;j>0;j--)circle(c,x-(i?-1:1)*j*6,y+j*1.5,5-j*.6,'#f5e8bf70');circle(c,x,y,7,'#283f45');circle(c,x-2,y-2,2,'#879995');});
      if(t>=.57){const q=(t-.57)/.43;events.filter(e=>['damage','destroy','collapse','pressure'].includes(e.kind)).forEach((e,index)=>{
        const p=pos(e.side,e.x,e.y);if(e.kind==='damage'||e.kind==='pressure'){c.globalAlpha=Math.max(0,1-q*.7);c.fillStyle=e.amount?'#fff7dd':'#c4ead7';c.strokeStyle='#334641';c.lineWidth=3;c.font='bold 20px Segoe UI';c.textAlign='center';const txt=e.amount?`−${e.amount}`:'BLOCK';c.strokeText(txt,p.x+22,p.y-10-q*37);c.fillText(txt,p.x+22,p.y-10-q*37);c.globalAlpha=1;}
        if(e.kind==='destroy'||e.kind==='collapse')for(let j=0;j<6;j++){const a=j*1.05+index;c.globalAlpha=1-q;rect(c,p.x+22+Math.cos(a)*q*53,p.y+20+Math.sin(a)*q*33+q*q*45,6,6,j%2?'#e5cd99':'#788776');c.globalAlpha=1;}
      });}
    }
  }
  function hero(canvas,time=0){
    const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=850*dpr;canvas.height=680*dpr;const c=canvas.getContext('2d');c.scale(dpr,dpr);
    c.clearRect(0,0,850,680);circle(c,468,257,225,'#dde3d8');circle(c,491,156,61,'#e5aa8c');cloud(c,629,145,.8);cloud(c,231,211,.65);
    poly(c,[[167,407],[237,306],[326,372],[422,291],[509,355],[592,276],[739,417]],'#c7d6ca');poly(c,[[128,443],[275,359],[408,399],[530,356],[757,444]],'#b4c9b7');
    // Hero fortress: improbable silhouette, deliberate structural connections.
    c.save();c.translate(116,39);c.scale(.96,.96);island(c,0);c.restore();
    c.save();c.translate(185,449);c.scale(1.35,1.35);
    const pieces=[[0,0,'stone'],[1,0,'stone'],[2,0,'command'],[3,0,'stone'],[4,0,'timber'],[5,0,'powder'],[0,1,'timber'],[1,1,'stone'],[2,1,'stone'],[3,1,'timber'],[4,1,'brace'],[0,2,'stone'],[1,2,'mint'],[2,2,'timber'],[3,2,'stone'],[0,3,'timber'],[1,3,'stone'],[2,3,'brace'],[0,4,'stone'],[1,4,'arsenal'],[1,5,'timber']];
    pieces.forEach(([x,y,type])=>block(c,type,x*44,-(y+1)*44,0,Siege.PIECES[type]?.hp||24,Siege.PIECES[type]?.hp||24,1,time));flag(c,63,-264,0,time,1.1);flag(c,156,-176,0,time,.7);cannon(c,281,-1,0);c.restore();
    c.save();c.translate(701,391);c.rotate(-.25);poly(c,[[-15,3],[17,3],[19,20],[-10,26]],'#8fa299');line(c,-12,10,15,10,'#526d66',2);c.restore();
    const shotX=677,shotY=255;circle(c,shotX,shotY,10,'#30494d');line(c,shotX+18,shotY-7,shotX+48,shotY-21,'#9bb2a4',2);line(c,shotX+19,shotY+3,shotX+40,shotY-4,'#9bb2a4',2);
    for(const [x,y,s] of [[185,479,1],[599,485,1.2],[218,523,.6]]){c.save();c.translate(x,y);c.rotate(.2);rect(c,0,0,12*s,7*s,'#9da58e');c.restore();}
    c.fillStyle='#879486';c.font='10px Segoe UI';c.textAlign='center';c.fillText('ENGINEERED WITH QUESTIONABLE CONFIDENCE',441,603);
  }
  return {pos,render,hero,SIZE,BW,BH};
})();

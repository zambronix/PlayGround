(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const overlay = $('gameOverlay');
  const overlayCard = $('overlayCard');
  const p1Health = $('p1Health');
  const p2Health = $('p2Health');
  const timerEl = $('timer');
  const statusEl = $('matchStatus');
  const arena = document.querySelector('.arena-frame');
  const keys = new Set();
  const W = 960, H = 550;
  let dpr = 1, running = false, started = false, last = 0, elapsed = 0, timeLeft = 99;
  let soundOn = true, audioContext = null, fighterColor = '#fa4c42', avatar = null, customScene = null, stage = 'rooftop';
  let p1Rounds = 0, p2Rounds = 0, round = 1, cpuThink = .8, cpuAttackWait = 1.2, attackFlash = 0;
  let lastKAt = 0, activeOpponent = null, onlineMatch = false;
  const playerId = Math.random().toString(36).slice(2, 9);
  const peers = new Map();
  const p1 = {x:285, y:0, vz:0, jumps:0, hp:100, facing:1, action:'idle', actionTime:0, cooldown:0, block:false, tint:'#fa4c42', name:'VOLT'};
  const p2 = {x:675, y:0, vz:0, jumps:0, hp:100, facing:-1, action:'idle', actionTime:0, cooldown:0, block:false, tint:'#6471e8', name:'BYTE'};

  function resize(){
    const r=canvas.getBoundingClientRect(); dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(r.width*dpr)); canvas.height=Math.max(1,Math.round(r.height*dpr));
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  }
  new ResizeObserver(resize).observe(canvas); resize();

  function roundedRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
  function cityBackdrop(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,stage==='dojo'?'#415052':'#302334');sky.addColorStop(.58,stage==='dojo'?'#9a7359':'#a84060');sky.addColorStop(1,'#30232a');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    if(stage==='rooftop'){
      ctx.save();ctx.globalAlpha=.72;ctx.fillStyle='#ffcb9c';ctx.beginPath();ctx.arc(754,122,39,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.25;ctx.beginPath();ctx.arc(754,122,61,0,Math.PI*2);ctx.fill();ctx.restore();
      for(let i=0;i<18;i++){let x=i*59-22,h=80+(Math.sin(i*12.7)+1)*69;ctx.fillStyle=['#221f2b','#29202b','#32212d','#24212e'][i%4];ctx.fillRect(x,244-h*.38,46,h);ctx.fillStyle='#ffb55f';for(let j=0;j<3;j++)for(let k=0;k<3;k++)if((i+j+k)%3!==0){ctx.globalAlpha=.55;ctx.fillRect(x+7+j*12,250-h*.38+k*17,4,7)}ctx.globalAlpha=1}
      // neon rooftops and signs
      ctx.fillStyle='#201c27';ctx.fillRect(0,274,W,45);ctx.fillStyle='#ee5676';ctx.fillRect(116,260,5,45);ctx.fillRect(116,260,66,5);ctx.fillStyle='#5de4dc';ctx.fillRect(829,250,6,54);ctx.fillRect(794,250,41,5);ctx.fillStyle='#ff5470';ctx.font='bold 17px sans-serif';ctx.fillText('夜',132,286);ctx.fillStyle='#8de4d9';ctx.font='bold 12px sans-serif';ctx.fillText('FIGHT',794,275);
    }else{
      // dojo roof and timber beams
      ctx.fillStyle='#292520';ctx.beginPath();ctx.moveTo(75,231);ctx.lineTo(480,119);ctx.lineTo(885,231);ctx.lineTo(855,247);ctx.lineTo(480,151);ctx.lineTo(105,247);ctx.closePath();ctx.fill();ctx.fillStyle='#bc8b56';ctx.fillRect(143,241,674,6);ctx.fillStyle='#553829';ctx.fillRect(169,247,18,105);ctx.fillRect(773,247,18,105);ctx.fillStyle='#e4c798';ctx.fillRect(370,204,220,39);ctx.strokeStyle='#553829';ctx.lineWidth=4;ctx.strokeRect(370,204,220,39);ctx.fillStyle='#a5433b';ctx.font='bold 21px serif';ctx.textAlign='center';ctx.fillText('武道',480,232);ctx.textAlign='left';
      for(let i=0;i<8;i++){ctx.fillStyle=i%2?'#493226':'#382921';ctx.fillRect(i*126,285,80,54)}
    }
  }
  function drawStage(){
    if(customScene){const ratio=Math.max(W/customScene.width,H/customScene.height),sw=W/ratio,sh=H/ratio,sx=(customScene.width-sw)/2,sy=(customScene.height-sh)/2;ctx.drawImage(customScene,sx,sy,sw,sh,0,0,W,H)}else cityBackdrop();
    // silhouettes, stage lights, low haze
    const haze=ctx.createLinearGradient(0,300,0,410);haze.addColorStop(0,'#e9b59a00');haze.addColorStop(1,stage==='dojo'?'#dca56b50':'#f6507250');ctx.fillStyle=haze;ctx.fillRect(0,290,W,125);
    ctx.fillStyle='#18191f';ctx.beginPath();ctx.moveTo(0,328);ctx.lineTo(960,316);ctx.lineTo(960,550);ctx.lineTo(0,550);ctx.fill();
    const floor=ctx.createLinearGradient(0,350,0,550);floor.addColorStop(0,stage==='dojo'?'#6c4537':'#64323f');floor.addColorStop(.28,stage==='dojo'?'#56372f':'#472c39');floor.addColorStop(1,'#201e27');ctx.fillStyle=floor;ctx.beginPath();ctx.moveTo(0,328);ctx.lineTo(960,316);ctx.lineTo(960,550);ctx.lineTo(0,550);ctx.fill();
    ctx.strokeStyle=stage==='dojo'?'#e1aa6d39':'#e17c8d38';ctx.lineWidth=2;
    for(let i=0;i<11;i++){let x=-500+i*196;ctx.beginPath();ctx.moveTo(480,328);ctx.lineTo(x,550);ctx.stroke()}
    for(let y=367;y<550;y+=Math.pow(y-350,1.3)*.035+15){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y-((y-328)*.035));ctx.stroke()}
    ctx.fillStyle='#f8b279';ctx.globalAlpha=.16;ctx.fillRect(0,324,960,2);ctx.globalAlpha=1;
  }
  function drawFighter(f,isPlayer,now){
    const ground=374+Math.abs(f.x-480)*.105; const scale=.9+Math.abs(f.x-480)*.00032;
    const lift=f.y||0;
    const moving=(isPlayer?(keys.has('a')||keys.has('d')||keys.has('arrowleft')||keys.has('arrowright')):f.action==='walk');
    const bob=moving?Math.sin(now*.018)*4:Math.sin(now*.005+(isPlayer?0:1))*1.6;
    const attack=f.action==='punch'||f.action==='kick'||f.action==='spinKick'; const kick=f.action==='kick'||f.action==='spinKick';
    ctx.save();ctx.translate(f.x,ground);ctx.scale(scale,scale);ctx.globalAlpha=.32;ctx.fillStyle='#0a0a10';ctx.beginPath();ctx.ellipse(0,3,54-Math.min(18,lift*.08),9,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.translate(0,-lift);if(f.action==='spinKick')ctx.rotate(Math.sin(now*.04)*.22);
    // character direction transform: common facing right, then mirror
    if(f.facing<0)ctx.scale(-1,1);
    const skin=isPlayer?'#d99a78':'#bc897a', dark=isPlayer?'#29242b':'#1c2433', kit=f.tint;
    const yy=bob;
    // back leg and shoe
    ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(-17,yy+87);ctx.lineTo(6,yy+89);ctx.lineTo(10,yy+133);ctx.lineTo(-2,yy+136);ctx.lineTo(-18,yy+112);ctx.closePath();ctx.fill();
    ctx.fillStyle='#17171c';ctx.beginPath();ctx.moveTo(-2,yy+128);ctx.lineTo(12,yy+131);ctx.lineTo(17,yy+140);ctx.lineTo(-14,yy+140);ctx.lineTo(-13,yy+136);ctx.closePath();ctx.fill();
    // front leg (extends during kick)
    if(kick){ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(13,yy+77);ctx.lineTo(31,yy+79);ctx.lineTo(57,yy+103);ctx.lineTo(86,yy+106);ctx.lineTo(88,yy+117);ctx.lineTo(53,yy+117);ctx.lineTo(18,yy+100);ctx.closePath();ctx.fill();ctx.fillStyle='#17171c';ctx.fillRect(75,yy+103,24,13)}else{ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(3,yy+84);ctx.lineTo(26,yy+84);ctx.lineTo(30,yy+126);ctx.lineTo(22,yy+137);ctx.lineTo(6,yy+137);ctx.lineTo(-2,yy+105);ctx.closePath();ctx.fill();ctx.fillStyle='#17171c';ctx.beginPath();ctx.moveTo(7,yy+132);ctx.lineTo(27,yy+132);ctx.lineTo(38,yy+141);ctx.lineTo(4,yy+141);ctx.closePath();ctx.fill()}
    // torso
    ctx.fillStyle=kit;ctx.beginPath();ctx.moveTo(-22,yy+35);ctx.quadraticCurveTo(-31,yy+42,-27,yy+77);ctx.lineTo(-20,yy+91);ctx.lineTo(25,yy+91);ctx.lineTo(30,yy+57);ctx.lineTo(18,yy+36);ctx.lineTo(0,yy+28);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ffffff25';ctx.beginPath();ctx.moveTo(-18,yy+42);ctx.lineTo(-4,yy+39);ctx.lineTo(-2,yy+82);ctx.lineTo(-21,yy+79);ctx.closePath();ctx.fill();
    // sash and belt
    ctx.fillStyle=isPlayer?'#f0d7a4':'#c74250';ctx.fillRect(-25,yy+75,53,9);ctx.fillStyle='#2a2029';ctx.fillRect(-1,yy+76,8,7);
    // arms
    ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=14;ctx.strokeStyle=skin;
    if(attack&&!kick){ctx.beginPath();ctx.moveTo(17,yy+47);ctx.lineTo(37,yy+49);ctx.lineTo(59,yy+43);ctx.stroke();ctx.fillStyle='#f7d8c4';ctx.beginPath();ctx.arc(62,yy+43,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle=kit;ctx.lineWidth=16;ctx.beginPath();ctx.moveTo(15,yy+52);ctx.lineTo(37,yy+52);ctx.stroke()}
    else{ctx.beginPath();ctx.moveTo(16,yy+46);ctx.lineTo(29,yy+62);ctx.lineTo(27,yy+74);ctx.stroke();ctx.beginPath();ctx.moveTo(-18,yy+48);ctx.lineTo(-29,yy+67);ctx.lineTo(-20,yy+73);ctx.stroke();if(f.block){ctx.beginPath();ctx.moveTo(15,yy+48);ctx.lineTo(27,yy+28);ctx.stroke();ctx.beginPath();ctx.moveTo(-14,yy+47);ctx.lineTo(-27,yy+26);ctx.stroke()}}
    ctx.strokeStyle=kit;ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(-17,yy+42);ctx.lineTo(-23,yy+56);ctx.stroke();
    // neck and face
    ctx.fillStyle=skin;ctx.fillRect(-9,yy+22,19,18);ctx.fillStyle=isPlayer?'#cf916f':'#b77d70';ctx.beginPath();ctx.ellipse(0,yy+13,20,23,0,0,Math.PI*2);ctx.fill();
    // face details, facing right
    ctx.fillStyle='#292026';ctx.beginPath();ctx.moveTo(5,yy+6);ctx.lineTo(17,yy+8);ctx.lineTo(17,yy+12);ctx.lineTo(6,yy+12);ctx.fill();ctx.fillStyle='#352329';ctx.fillRect(12,yy+9,3,3);ctx.fillStyle='#773f42';ctx.fillRect(9,yy+25,8,2);
    // hair silhouettes
    ctx.fillStyle=isPlayer?'#30242b':'#181f2c';ctx.beginPath();if(isPlayer){ctx.moveTo(-20,yy+12);ctx.lineTo(-18,yy-5);ctx.lineTo(-7,yy+1);ctx.lineTo(-3,yy-13);ctx.lineTo(5,yy-1);ctx.lineTo(15,yy-8);ctx.lineTo(20,yy+10);ctx.lineTo(8,yy+3);ctx.lineTo(-2,yy+10);ctx.closePath()}else{ctx.moveTo(-20,yy+6);ctx.lineTo(-18,yy-10);ctx.lineTo(4,yy-13);ctx.lineTo(20,yy+1);ctx.lineTo(13,yy+8);ctx.closePath()}ctx.fill();
    // photo face customization
    if(isPlayer&&avatar){ctx.save();ctx.beginPath();ctx.ellipse(0,yy+14,16,19,0,0,Math.PI*2);ctx.clip();ctx.drawImage(avatar,-17,yy-5,34,39);ctx.restore();}
    // gloves and guard sparkle
    if(f.block){ctx.strokeStyle='#fff4a8aa';ctx.lineWidth=3;ctx.beginPath();ctx.arc(7,yy+22,39,-1.3,.45);ctx.stroke()}
    if(attack){ctx.globalAlpha=.35;ctx.strokeStyle=kit;ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(30,yy+44);ctx.lineTo(77,yy+42);ctx.stroke();ctx.globalAlpha=1}
    ctx.restore();
  }
  function paint(now=performance.now()){
    ctx.clearRect(0,0,W,H);drawStage();
    // ambient spotlights
    ctx.save();let glow=ctx.createRadialGradient(480,312,8,480,312,240);glow.addColorStop(0,'#ffb76212');glow.addColorStop(1,'#ffb76200');ctx.fillStyle=glow;ctx.fillRect(190,100,580,400);ctx.restore();
    drawFighter(p1,true,now);drawFighter(p2,false,now);
    if(running){
      if(attackFlash>0){ctx.save();ctx.globalAlpha=Math.min(.48,attackFlash*1.6);ctx.fillStyle='#fff2dd';ctx.beginPath();ctx.arc((p1.x+p2.x)/2,323,25+attackFlash*20,0,Math.PI*2);ctx.fill();ctx.restore()}
    }
    // slight film grain-like scanlines
    ctx.fillStyle='#ffffff08';for(let y=1;y<H;y+=4)ctx.fillRect(0,y,W,1);
  }

  function speak(text){if(!soundOn||!text||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=.92;u.pitch=.82;const selected=$('voiceSelect').value;const voices=window.speechSynthesis.getVoices();const v=voices.find(x=>x.name===selected);if(v)u.voice=v;window.speechSynthesis.speak(u)}
  function populateVoices(){if(!('speechSynthesis'in window))return;const select=$('voiceSelect');const keep=select.value;const voices=window.speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith('en'));for(const v of voices){if(![...select.options].some(o=>o.value===v.name)){const op=document.createElement('option');op.value=v.name;op.textContent=v.name.toUpperCase().replace(/[^A-Z0-9 ]/g,'').slice(0,24);select.append(op)}}if([...select.options].some(o=>o.value===keep))select.value=keep}
  if('speechSynthesis'in window){populateVoices();speechSynthesis.onvoiceschanged=populateVoices}
  function updateHud(){p1Health.style.width=Math.max(0,p1.hp)+'%';p2Health.style.width=Math.max(0,p2.hp)+'%';$('p2Percent').textContent=Math.ceil(p2.hp)+'%';timerEl.textContent=Math.max(0,Math.ceil(timeLeft)).toString().padStart(2,'0');$('p1Wins').textContent='● '.repeat(p1Rounds)+'○ '.repeat(3-p1Rounds-p2Rounds);$('p1HudName').textContent=p1.name.slice(0,12);$('p2HudName').textContent=(p2.name||'BYTE').slice(0,12);$('p2HudName').nextElementSibling.textContent=onlineMatch?'ONLINE RIVAL':'CPU RIVAL';$('fighterName').value=p1.name}
  function setStatus(s){statusEl.textContent=s}
  function send(message){if(!channel)return;channel.postMessage({...message,from:playerId,ts:Date.now()})}
  function renderLobby(){
    const list=$('playerList');if(!list)return;
    for(const [id,peer] of peers)if(Date.now()-peer.ts>6000)peers.delete(id);
    const online=[...peers.values()].filter(peer=>peer.id!==playerId);
    $('onlineCount').textContent=online.length?`${online.length} FIGHTER${online.length===1?'':'S'} ONLINE`:'NO FIGHTERS FOUND';
    list.replaceChildren();
    if(!online.length){const empty=document.createElement('div');empty.className='empty-lobby';empty.innerHTML='<span class="radar-icon">◎</span><span>Looking for fighters...</span><small>Open this game in another tab to test a live duel.</small>';list.append(empty);return}
    for(const peer of online){const tile=document.createElement('div');tile.className='player-tile';const avatarBox=document.createElement('div');avatarBox.className='player-avatar';avatarBox.textContent=(peer.name||'F').slice(0,1);const info=document.createElement('div');info.className='player-info';const name=document.createElement('b');name.textContent=peer.name||'FIGHTER';const status=document.createElement('div');status.className='player-status';const isActiveRival=onlineMatch&&activeOpponent?.id===peer.id;status.innerHTML=`<i></i>${isActiveRival?'FIGHTING NOW':'READY TO FIGHT'}`;info.append(name,status);const button=document.createElement('button');button.className='challenge-button';button.textContent=peer.incoming?'ACCEPT':isActiveRival?'IN MATCH':'CHALLENGE';button.disabled=onlineMatch||!!activeOpponent;
      if(peer.incoming)button.classList.add('lobby-invite');
      button.addEventListener('click',()=>{if(peer.incoming){peer.incoming=false;peers.set(peer.id,peer);activeOpponent={id:peer.id,name:peer.name};onlineMatch=true;p2.name=peer.name||'RIVAL';send({type:'accepted',to:peer.id});startFight();renderLobby()}else{send({type:'challenge',to:peer.id});button.textContent='SENT ✓';button.disabled=true;toast(`Challenge sent to ${peer.name||'fighter'}.`)}});
      tile.append(avatarBox,info,button);list.append(tile)
    }
  }
  let channel=null;
  if('BroadcastChannel'in window){channel=new BroadcastChannel('ring-riot-lobby-v1');channel.onmessage=({data:m})=>{
    if(!m||m.from===playerId)return;
    if(m.type==='goodbye'){peers.delete(m.from);renderLobby();return}
    if(m.type==='presence'){const existing=peers.get(m.from)||{};peers.set(m.from,{...existing,id:m.from,name:m.name||'FIGHTER',ts:Date.now()});renderLobby();return}
    if(m.to&&m.to!==playerId)return;
    const peer=peers.get(m.from)||{id:m.from,name:'RIVAL',ts:Date.now()};peer.ts=Date.now();
    if(m.type==='challenge'){peer.incoming=true;peers.set(m.from,peer);renderLobby()}
    if(m.type==='accepted'){peer.incoming=false;peers.set(m.from,peer);activeOpponent={id:m.from,name:peer.name};onlineMatch=true;p2.name=peer.name||'RIVAL';startFight();renderLobby()}
    if(m.type==='state'&&onlineMatch&&activeOpponent?.id===m.from){p2.x=Math.max(70,Math.min(890,m.x));p2.y=Math.max(0,m.y||0);p2.action=['idle','walk','jump','punch','kick','spinKick'].includes(m.action)?m.action:'idle';p2.actionTime=m.actionTime||0;p2.block=!!m.block;if(m.name)p2.name=m.name}
    if(m.type==='damage'&&onlineMatch&&activeOpponent?.id===m.from){const amount=m.amount;p1.hp=Math.max(0,p1.hp-amount);playImpact(!!m.blocked);updateHud();if(p1.hp<=0)endRound('p2')}
  };
    const announce=()=>send({type:'presence',name:p1.name});announce();setInterval(announce,1800);setInterval(renderLobby,1800);window.addEventListener('beforeunload',()=>send({type:'goodbye'}))
  }else{$('onlineCount').textContent='LOBBY UNAVAILABLE';$('playerList').textContent='This browser does not support live lobby discovery.'}
  function showOverlay(title,sub,button){overlayCard.innerHTML=`<div class="overlay-kicker">${sub}</div><h2>${title}</h2><p>${title.includes('VICTORY')?'The ring remembers. The crowd does too.':'Step into the spotlight. Make it personal.'}</p><button class="primary-button" id="startButton">${button} <span>↗</span></button><div class="overlay-hint">BEST OF 3 <b>·</b> NO MERCY</div>`;document.getElementById('startButton').addEventListener('click',startFight);overlay.classList.remove('hidden')}
  function startFight(){if(p1Rounds>=2||p2Rounds>=2){p1Rounds=0;p2Rounds=0;round=1}p1.hp=100;p2.hp=100;p1.x=285;p2.x=675;p1.y=p2.y=p1.vz=p2.vz=0;p1.jumps=p2.jumps=0;p1.action=p2.action='idle';p1.block=p2.block=false;timeLeft=99;elapsed=0;running=true;started=true;last=performance.now();$('roundNumber').textContent=String(round).padStart(2,'0');overlay.classList.add('hidden');setStatus(onlineMatch?'LIVE ONLINE MATCH':'FIGHT IN PROGRESS');updateHud();if(round===1)speak($('voiceLine').value.trim());requestAnimationFrame(loop)}
  function endRound(winner){if(!running)return;running=false;round++;if(winner==='p1')p1Rounds++;else if(winner==='p2')p2Rounds++;const done=p1Rounds>=2||p2Rounds>=2;setStatus(done?(p1Rounds>p2Rounds?'MATCH WON — CHAMPION':'MATCH LOST — RUN IT BACK'):(winner==='p1'?'ROUND WON — KEEP THE PRESSURE':'ROUND LOST — GET BACK IN THERE'));if(done){showOverlay(p1Rounds>p2Rounds?'<em>VICTORY!</em>':'<em>DEFEATED.</em>',p1Rounds>p2Rounds?'THE CROWD IS YOURS':'THE RIVAL TAKES THIS ONE',p1Rounds>p2Rounds?'FIGHT AGAIN':'REMATCH')}else{showOverlay(winner==='p1'?'<em>ROUND WON.</em>':'<em>ROUND LOST.</em>',`ROUND ${round-1} COMPLETE`, 'NEXT ROUND')}}
  function playImpact(blocked){if(!soundOn)return;try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const osc=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;osc.type=blocked?'sine':'triangle';osc.frequency.setValueAtTime(blocked?320:145,now);osc.frequency.exponentialRampToValueAtTime(blocked?170:48,now+.12);gain.gain.setValueAtTime(blocked?.045:.11,now);gain.gain.exponentialRampToValueAtTime(.001,now+.13);osc.connect(gain);gain.connect(audioContext.destination);osc.start(now);osc.stop(now+.14)}catch(_){}}
  function hit(target,damage){const blocked=target.block;if(blocked){damage=Math.max(2,damage*.16)}playImpact(blocked);target.hp=Math.max(0,target.hp-damage);if(target===p2&&onlineMatch)send({type:'damage',to:activeOpponent.id,amount:damage,blocked});attackFlash=.24;const flash=$('impactFlash');flash.classList.remove('hit');void flash.offsetWidth;flash.classList.add('hit');if(target===p2&&target.hp<=0)endRound('p1');if(target===p1&&target.hp<=0)endRound('p2');updateHud()}
  function doAttack(f,type){const spin=type==='spinKick';if(!running||(!spin&&f.cooldown>0)||f.block)return;f.action=type;f.actionTime=spin?.62:type==='kick'?.42:.28;f.cooldown=spin?.92:type==='kick'?.58:.36;const opponent=f===p1?p2:p1;const reach=spin?150:type==='kick'?126:97;const delay=spin?.22:type==='kick'?.16:.1;setTimeout(()=>{if(running&&Math.abs(opponent.x-f.x)<reach){hit(opponent,spin?22+Math.random()*5:type==='kick'?13+Math.random()*5:8+Math.random()*5)}},delay*1000)}
  function loop(now){
    if(!running)return;
    const dt=Math.min(.04,(now-last)/1000);last=now;elapsed+=dt;timeLeft-=dt;attackFlash=Math.max(0,attackFlash-dt*1.4);
    p1.cooldown=Math.max(0,p1.cooldown-dt);p2.cooldown=Math.max(0,p2.cooldown-dt);
    p1.actionTime=Math.max(0,p1.actionTime-dt);p2.actionTime=Math.max(0,p2.actionTime-dt);
    if(p1.actionTime===0&&['punch','kick','spinKick'].includes(p1.action))p1.action='idle';
    if(p2.actionTime===0&&['punch','kick','spinKick'].includes(p2.action))p2.action='idle';
    p1.facing=p1.x<p2.x?1:-1;p2.facing=-p1.facing;
    p1.block=keys.has('l')||keys.has('arrowdown');
    let moving=false;if(keys.has('a')||keys.has('arrowleft')){p1.x-=320*dt;moving=true}if(keys.has('d')||keys.has('arrowright')){p1.x+=320*dt;moving=true}
    if(moving&&p1.action==='idle')p1.action='walk';else if(!moving&&p1.action==='walk')p1.action='idle';
    p1.x=Math.max(70,Math.min(890,p1.x));
    for(const f of [p1,p2]){if(f.y>0||f.vz>0){f.y+=f.vz*dt;f.vz-=1050*dt;if(f.y<=0){f.y=0;f.vz=0;f.jumps=0;if(f.action==='jump')f.action='idle'}}}
    const dist=Math.abs(p2.x-p1.x);cpuThink-=dt;cpuAttackWait-=dt;
    if(onlineMatch){if(dist<130)p2.block=!!p2.block;else p2.block=false}
    else if(dist>100){if(cpuThink<=0){p2.action='walk';p2.x+=p2.x>p1.x?-Math.min(150*dt,dist-98):Math.min(150*dt,dist-98);cpuThink=.04}else if(!['punch','kick','spinKick'].includes(p2.action))p2.action='walk';p2.block=false}
    else{p2.action='idle';if(cpuAttackWait<=0){if(Math.random()<.17){p2.block=true;setTimeout(()=>p2.block=false,480)}else doAttack(p2,Math.random()<.52?'punch':'kick');cpuAttackWait=.78+Math.random()*1.05}}
    p2.x=Math.max(70,Math.min(890,p2.x));
    if(onlineMatch&&Math.floor(now/50)!==Math.floor((now-dt*1000)/50))send({type:'state',to:activeOpponent.id,x:p1.x,y:p1.y,action:p1.action,actionTime:p1.actionTime,block:p1.block,name:p1.name});
    if(timeLeft<=0){endRound(p1.hp>=p2.hp?'p1':'p2');return}
    if(Math.floor(timeLeft)!==Math.floor(timeLeft+dt))updateHud();paint(now);requestAnimationFrame(loop)
  }

  function jump(f=p1){if(!running||f.jumps>=3)return;const power=[500,455,410][f.jumps];f.vz=power;f.jumps++;if(f.action==='idle'||f.action==='walk')f.action='jump'}
  $('startButton').addEventListener('click',startFight);
  window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['a','d','j','k','l','arrowleft','arrowright','arrowdown',' '].includes(key))e.preventDefault();keys.add(key);if(key==='j'&&!e.repeat)doAttack(p1,'punch');if(key==='k'&&!e.repeat){const now=performance.now();if(now-lastKAt<330)doAttack(p1,'spinKick');else doAttack(p1,'kick');lastKAt=now}if(key===' '&&!e.repeat)jump();if(key==='enter'&&!running)startFight()});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
  document.querySelectorAll('[data-control]').forEach(btn=>{const c=btn.dataset.control;const down=e=>{e.preventDefault();btn.classList.add('pressed');if(c==='punch')doAttack(p1,'punch');else if(c==='kick'){const now=performance.now();if(now-lastKAt<330)doAttack(p1,'spinKick');else doAttack(p1,'kick');lastKAt=now}else if(c==='jump')jump();else if(c==='left')keys.add('arrowleft');else if(c==='right')keys.add('arrowright');else if(c==='block')keys.add('l')};const up=e=>{e.preventDefault();btn.classList.remove('pressed');if(c==='left')keys.delete('arrowleft');if(c==='right')keys.delete('arrowright');if(c==='block')keys.delete('l')};btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointerleave',up);btn.addEventListener('pointercancel',up)});
  $('fighterName').addEventListener('input',e=>{p1.name=e.target.value.toUpperCase()||'VOLT';$('p1HudName').textContent=p1.name});
  document.querySelectorAll('.swatch').forEach(btn=>btn.addEventListener('click',()=>{document.querySelector('.swatch.active')?.classList.remove('active');btn.classList.add('active');fighterColor=btn.dataset.color;p1.tint=fighterColor;document.documentElement.style.setProperty('--fighter-color',fighterColor);document.querySelector('.fighter-preview').style.background=`radial-gradient(ellipse at 50% 77%,${fighterColor}60,transparent 52%),linear-gradient(135deg,#24242b,#311e28 65%,#1b2029)`;paint()}));
  $('avatarUploadBtn').addEventListener('click',()=>$('avatarInput').click());
  $('avatarInput').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;if(!file.type.startsWith('image/'))return toast('Choose an image file.');if(file.size>10*1024*1024)return toast('Image must be under 10 MB.');const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{avatar=img;$('fighterPortrait').src=reader.result;document.querySelector('.art-head').classList.add('has-image');paint();toast('Fighter portrait equipped.')};img.src=reader.result};reader.readAsDataURL(file);e.target.value=''});
  document.querySelectorAll('.stage-option').forEach(btn=>btn.addEventListener('click',()=>{document.querySelector('.stage-option.active')?.classList.remove('active');btn.classList.add('active');stage=btn.dataset.stage;customScene=null;arena.classList.toggle('dojo',stage==='dojo');$('arenaLabel').textContent=stage==='dojo'?'THE OLD DOJO  ·  KYOTO':'ROOFTOP RUMBLE  ·  TOKYO';paint()}));
  $('sceneInput').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;if(!file.type.startsWith('image/'))return toast('Choose an image file.');if(file.size>10*1024*1024)return toast('Scene must be under 10 MB.');const img=new Image();img.onload=()=>{customScene=img;arena.classList.remove('dojo');$('arenaLabel').textContent='CUSTOM SCENE  ·  YOUR STAGE';document.querySelectorAll('.stage-option').forEach(x=>x.classList.remove('active'));paint();toast('Custom fighting stage loaded.')};img.src=URL.createObjectURL(file);e.target.value=''});
  $('previewVoice').addEventListener('click',()=>speak($('voiceLine').value.trim()));$('testVoice').addEventListener('click',()=>speak($('voiceLine').value.trim()||'I am ready to fight.'));$('voiceLine').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();speak(e.target.value.trim())}});
  $('soundToggle').addEventListener('click',()=>{soundOn=!soundOn;$('soundToggle').setAttribute('aria-pressed',String(soundOn));$('soundToggle').lastElementChild.textContent=soundOn?'SOUND ON':'SOUND OFF';$('soundToggle').classList.toggle('sound-off',!soundOn);if(!soundOn&&'speechSynthesis'in window)speechSynthesis.cancel()});
  $('resetButton').addEventListener('click',()=>{p1.name='VOLT';$('fighterName').value='VOLT';p1.tint='#fa4c42';fighterColor='#fa4c42';document.documentElement.style.setProperty('--fighter-color',fighterColor);document.querySelector('.swatch.active')?.classList.remove('active');document.querySelector('.swatch').classList.add('active');avatar=null;$('fighterPortrait').removeAttribute('src');document.querySelector('.art-head').classList.remove('has-image');$('voiceLine').value='You picked the wrong ring.';stage='rooftop';customScene=null;arena.classList.remove('dojo');$('arenaLabel').textContent='ROOFTOP RUMBLE  ·  TOKYO';document.querySelectorAll('.stage-option').forEach((b,i)=>b.classList.toggle('active',i===0));paint();toast('Fighter lab reset.')});
  let toastTimer;function toast(message){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.append(t)}t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2100)}
  function idleDraw(){if(!running){paint(performance.now());requestAnimationFrame(idleDraw)}}requestAnimationFrame(idleDraw);updateHud();
})();

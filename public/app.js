const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],E=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const BACKEND_URL=(window.WATCH_PARTY_BACKEND_URL||'').trim();const BACKEND_MISSING=location.hostname.endsWith('github.io')&&!BACKEND_URL;const BACKEND_BASE=new URL((BACKEND_URL||location.origin).replace(/\/+$/,''));const backendUrl=p=>new URL(p,BACKEND_BASE).toString();const clock=new Sync.Clock(),v=$('#v'),cid=sessionStorage.cid||(sessionStorage.cid=Math.random().toString(36).slice(2,10)),oid=()=>Math.random().toString(36).slice(2,10);
let ws,room,me,want,retry=0,applied=-1,drift=0,stop=false,movies={},cat='',hostMediaStream=null,hostMediaMode=null,hostVideoUrl=null,peerConnections=new Map(),pendingIce=new Map(),stoppingMedia=false;
$('#name').value=localStorage.name||'';const qc=new URLSearchParams(location.search).get('room');if(qc)$('#code').value=qc.toUpperCase();
const tx=o=>ws&&ws.readyState===1&&ws.send(JSON.stringify(o)),ctl=o=>tx({t:'ctl',opId:oid(),...o});
const toast=m=>{const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(t.h);t.h=setTimeout(()=>t.style.display='none',2800)};
const ping=()=>tx({t:'ping',c:Date.now()});setInterval(ping,3000);
function connect(code){
  if(BACKEND_MISSING){$('#lerr').textContent='The website is online, but its room server is not connected yet. Deploy the backend on Render, then set its URL in public/config.js.';return}
  want=code;stop=false;
  let target;
  try{
    const wsBase=new URL(BACKEND_BASE);
    target=new WebSocket((wsBase.protocol==='https:'?'wss://':'ws://')+wsBase.host+'/ws');
  }catch(err){$('#lerr').textContent='Invalid backend URL in public/config.js';return}
  ws=target;
  target.onopen=()=>{
    if(ws!==target)return;
    retry=0;$('#lerr').textContent='';$('#conn').textContent='';
    target.send(JSON.stringify({t:'join',room:want,name:localStorage.name,cid}));
    for(let i=0;i<6;i++)setTimeout(ping,i*120);
  };
  target.onerror=()=>{if(ws===target)$('#lerr').textContent='Could not connect to the room server. Check the backend URL and make sure Render is running.'};
  target.onmessage=e=>{if(ws===target){try{on(JSON.parse(e.data))}catch(err){console.error('Invalid server message',err)}}};
  target.onclose=()=>{
    if(ws!==target||stop)return;
    $('#conn').textContent=room?'⚠ reconnecting…':'';
    setTimeout(()=>{if(!stop&&ws===target)connect(room?room.code:want)},Math.min(8000,500*2**retry++));
  };
}
const rtcConfig={iceServers:[{urls:'stun:stun.l.google.com:19302'}]};
function signal(to,data){return tx({t:'rtc',to,data})}
function closePeer(id){const pc=peerConnections.get(id);if(pc){pc.onicecandidate=null;pc.ontrack=null;try{pc.close()}catch{}peerConnections.delete(id)}pendingIce.delete(id)}
async function flushIce(id,pc){const q=pendingIce.get(id)||[];pendingIce.delete(id);for(const c of q){try{await pc.addIceCandidate(c)}catch(err){console.warn('Unable to add ICE candidate',err)}}}
function makePeer(id,isHost){
  const pc=new RTCPeerConnection(rtcConfig);peerConnections.set(id,pc);
  pc.onicecandidate=e=>{if(e.candidate)signal(id,{type:'candidate',candidate:e.candidate})};
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed')toast('Media connection failed. Try sharing a browser tab or reconnecting.')};
  if(!isHost)pc.ontrack=e=>{
    if(!room||room.hostId!==id)return;
    const stream=e.streams&&e.streams[0]?e.streams[0]:new MediaStream([e.track]);
    v.pause();v.removeAttribute('src');v.srcObject=stream;v.play().catch(()=>toast('Press ▶ on the video player to show shared media'));
    $('#mediaStatus').textContent='Receiving shared media from the host.';
  };
  return pc;
}
async function connectParticipant(id){
  if(!hostMediaStream||!room||room.hostId!==me||id===me||peerConnections.has(id))return;
  try{
    const pc=makePeer(id,true);
    hostMediaStream.getTracks().forEach(track=>pc.addTrack(track,hostMediaStream));
    const offer=await pc.createOffer();await pc.setLocalDescription(offer);
    signal(id,{type:'offer',sdp:pc.localDescription});
  }catch(err){closePeer(id);console.error('Could not start media connection',err);toast('Could not connect shared media to one participant.')}
}
function syncPeers(){
  if(!room||room.hostId!==me||!hostMediaStream)return;
  room.members.filter(m=>m.online&&m.id!==me).forEach(m=>connectParticipant(m.id));
  for(const id of [...peerConnections.keys()])if(!room.members.some(m=>m.id===id&&m.online))closePeer(id);
}
async function handleSignal(m){
  if(!room||!m.data||!m.from)return;
  const d=m.data;
  try{
    if(d.type==='stop'){
      closePeer(m.from);
      if(room.hostId!==me){v.pause();v.srcObject=null;v.removeAttribute('src');$('#mediaStatus').textContent='The host stopped sharing media.'}
      return;
    }
    if(d.type==='offer'){
      if(m.from!==room.hostId||room.hostId===me)return;
      closePeer(m.from);const pc=makePeer(m.from,false);
      await pc.setRemoteDescription(d.sdp);await flushIce(m.from,pc);
      const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
      signal(m.from,{type:'answer',sdp:pc.localDescription});return;
    }
    const pc=peerConnections.get(m.from);if(!pc)return;
    if(d.type==='answer'){
      if(room.hostId!==me)return;
      await pc.setRemoteDescription(d.sdp);await flushIce(m.from,pc);
    }else if(d.type==='candidate'){
      if(pc.remoteDescription)await pc.addIceCandidate(d.candidate);
      else{const q=pendingIce.get(m.from)||[];q.push(d.candidate);pendingIce.set(m.from,q)}
    }
  }catch(err){console.error('Media signaling error',err);toast('Could not establish media connection. Refresh and try again.')}
}
function resetHostMedia(notifyPeers=true){
  if(notifyPeers)for(const id of [...peerConnections.keys()])signal(id,{type:'stop'});
  for(const id of [...peerConnections.keys()])closePeer(id);
  if(hostMediaStream)for(const track of hostMediaStream.getTracks())try{track.stop()}catch{}
  hostMediaStream=null;hostMediaMode=null;
}
function updateMediaControls(){
  const isHost=!!room&&room.hostId===me;
  $('#videoFile').disabled=!isHost;$('#shareScreen').disabled=!isHost;
  $('#stopShare').disabled=!isHost||!hostMediaMode;
  if(hostMediaMode==='upload')$('#mediaStatus').textContent='Uploaded video is being streamed to the room.';
  else if(hostMediaMode==='screen')$('#mediaStatus').textContent='Screen/tab sharing is live. Select a tab and enable tab audio for movie sound.';
  else if(isHost)$('#mediaStatus').textContent='You are the host. Upload a video or share a tab with audio.';
}
async function activateHostMedia(stream,mode,title){
  hostMediaStream=stream;hostMediaMode=mode;
  const source='room-stream:'+mode+':'+oid();
  ctl({op:'load',src:source,title:title|| (mode==='screen'?'Host screen':'Uploaded video')});
  updateMediaControls();syncPeers();
}
async function startUpload(file){
  if(!room||room.hostId!==me)return toast('Only the host can upload and play a video.');
  if(!file)return;
  if(!file.type.startsWith('video/'))return toast('Choose a valid video file, such as MP4.');
  try{
    resetHostMedia(true);
    if(hostVideoUrl){URL.revokeObjectURL(hostVideoUrl);hostVideoUrl=null}
    v.pause();v.srcObject=null;
    hostVideoUrl=URL.createObjectURL(file);v.src=hostVideoUrl;v.load();
    await new Promise((resolve,reject)=>{
      if(v.readyState>=1)return resolve();
      const ok=()=>{cleanup();resolve()},bad=()=>{cleanup();reject(new Error('Browser could not open this video file'))};
      const cleanup=()=>{v.removeEventListener('loadedmetadata',ok);v.removeEventListener('error',bad)};
      v.addEventListener('loadedmetadata',ok,{once:true});v.addEventListener('error',bad,{once:true});
    });
    const capture=v.captureStream||v.mozCaptureStream;
    if(!capture)throw new Error('This browser cannot stream an uploaded video. Use a recent version of Chrome or Edge.');
    v.currentTime=0;await v.play();
    const stream=capture.call(v);
    if(!stream.getVideoTracks().length)throw new Error('No video track was captured from this file.');
    await activateHostMedia(stream,'upload',file.name);
    toast('Video is playing and streaming to the room.');
  }catch(err){console.error('Upload playback failed',err);resetHostMedia(false);$('#mediaStatus').textContent=err.message;toast(err.message||'Could not play this video file.')}
}
async function startScreenShare(){
  if(!room||room.hostId!==me)return toast('Only the host can share their screen.');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia)return toast('Screen sharing needs a supported browser and a secure HTTPS page.');
  try{
    const stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30},audio:true});
    resetHostMedia(true);
    if(hostVideoUrl){URL.revokeObjectURL(hostVideoUrl);hostVideoUrl=null}
    v.pause();v.removeAttribute('src');v.srcObject=stream;await v.play();
    await activateHostMedia(stream,'screen','Host screen');
    const vt=stream.getVideoTracks()[0];
    if(vt)vt.addEventListener('ended',()=>{if(hostMediaMode==='screen')stopSharedMedia()},{once:true});
    toast('Screen sharing started. For audio, choose a browser tab and enable Share tab audio.');
  }catch(err){if(err&&err.name!=='NotAllowedError')toast(err.message||'Could not share the screen');console.warn('Screen sharing was not started',err)}
}
function stopSharedMedia(){
  if(stoppingMedia||!room||room.hostId!==me)return;
  stoppingMedia=true;
  resetHostMedia(true);
  if(hostVideoUrl){URL.revokeObjectURL(hostVideoUrl);hostVideoUrl=null}
  v.pause();v.srcObject=null;v.removeAttribute('src');v.load();
  tx({t:'media_stop',opId:oid()});
  updateMediaControls();$('#mediaStatus').textContent='Shared media stopped.';
  setTimeout(()=>{stoppingMedia=false},500);
}

function on(m){switch(m.t){case'welcome':me=m.you;room=m.room;applied=-1;$('#lobby').hidden=true;$('#app').hidden=false;$('#conn').textContent='';history.replaceState(0,'','?room='+room.code);$('#chatlog').innerHTML='';m.chat.forEach(addChat);render();applyPb();break;case'room':room=m.room;render();applyPb();break;case'pb':room.pb=m.pb;applyPb();break;case'chat':addChat(m.msg);break;case'react':{const f=document.createElement('div');f.className='fl';f.style.left=Math.random()*85+'%';f.textContent=m.emoji;f.title=m.name;$('#float').append(f);setTimeout(()=>f.remove(),2600);break}case'pong':clock.add(m.c,m.s,Date.now());break;case'fatal':stop=true;ws.close();$('#lerr').textContent=m.m;break;case'err':toast(m.m)}}
const expected=()=>{const p=room.pb;return p.playing?p.pos+(clock.now()-p.at)/1000:p.pos};
function applyPb(){const p=room.pb;if(p.seq===applied)return;applied=p.seq;if(!p.src){v.removeAttribute('src');return}if(v.getAttribute('src')!==p.src)v.src=p.src;const go=()=>{const q=room.pb;v.currentTime=Math.max(0,expected());q.playing?v.play().catch(()=>toast('Press ▶ to start (autoplay blocked)')):v.pause()};v.readyState>0?go():v.addEventListener('loadedmetadata',go,{once:true});renderPb()}
function renderPb(){$('#ptitle').textContent=room.pb.title;$('#pp').textContent=room.pb.playing?'⏸':'▶'}
setInterval(()=>{if(!room)return;const p=room.pb;if(p.src&&p.playing&&!v.paused&&v.readyState>2){drift=v.currentTime-expected();const a=Sync.plan(drift);if(a.action==='seek')v.currentTime=expected();v.playbackRate=a.rate}else{v.playbackRate=1;drift=0}$('#sync').textContent=`${Math.abs(drift)<.15?'● In sync':'◐ Correcting'} · ±${Math.round(Math.abs(drift)*1000)}ms · rtt ${Math.round(clock.rtt)}ms`;if(document.activeElement!==$('#seek')&&v.duration)$('#seek').value=v.currentTime/v.duration*1000;const s=v.currentTime|0;$('#tm').textContent=`${s/60|0}:${String(s%60).padStart(2,'0')}`},500);
setInterval(()=>room&&tx({t:'drift',ms:drift*1000}),5000);v.onended=()=>tx({t:'ended',src:room.pb.src});
$('#pp').onclick=()=>{const p=room.pb;if(!p.src)return toast('Pick a movie first');if(p.playing&&v.paused){v.currentTime=expected();v.play();return}ctl({op:p.playing?'pause':'play',pos:expected()})};$('#seek').onchange=e=>v.duration&&ctl({op:'seek',pos:e.target.value/1000*v.duration});
$('#emo').innerHTML=['👍','😂','😮','❤️','🔥','👏'].map(e=>`<button>${e}</button>`).join('');$('#emo').onclick=e=>e.target.tagName==='BUTTON'&&tx({t:'react',emoji:e.target.textContent});
const start=code=>{const n=$('#name').value.trim();if(!n)return $('#lerr').textContent='Enter a name';localStorage.name=n;$('#lerr').textContent='';connect(code)};$('#create').onclick=()=>start(null);$('#join').onclick=()=>start($('#code').value.trim().toUpperCase());
$('#copy').onclick=()=>navigator.clipboard.writeText(location.origin+location.pathname+'?room='+room.code).then(()=>toast('Invite link copied'));
$$('.tabs button').forEach(b=>b.onclick=()=>{$$('.tabs button').forEach(x=>x.classList.toggle('on',x===b));$$('.tab').forEach(t=>t.hidden=t.id!=='t-'+b.dataset.t)});
const addChat=g=>{const d=document.createElement('div');d.className='msg';d.innerHTML=`<b>${E(g.name)}</b> ${E(g.text)}`;$('#chatlog').append(d);$('#chatlog').scrollTop=1e9};const sendChat=()=>{const i=$('#ci');if(i.value.trim())tx({t:'chat',text:i.value});i.value=''};$('#cs').onclick=sendChat;$('#ci').onkeydown=e=>e.key==='Enter'&&sendChat();$('#qa').onclick=()=>{const u=$('#qu').value.trim();if(u)tx({t:'q_add',src:u});$('#qu').value=''};$('#pc').onclick=()=>{tx({t:'poll_new',q:$('#pq').value,opts:$('#po').value.split('\n')});$('#pq').value=$('#po').value=''};$('#ctlmode').onchange=e=>tx({t:'settings',controls:e.target.value});
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const d=b.dataset,mv=movies[d.id];({play:()=>ctl({op:'load',src:mv.url,title:mv.title}),queue:()=>tx({t:'q_add',movieId:d.id}),qplay:()=>tx({t:'q_play',id:d.id}),qrm:()=>tx({t:'q_rm',id:d.id}),qmv:()=>tx({t:'q_mv',id:d.id,dir:+d.dir}),vote:()=>tx({t:'vote',pid:d.id,i:+d.i}),close:()=>tx({t:'poll_close',pid:d.id}),host:()=>tx({t:'host',to:d.id})})[d.a]()});
function render(){const r=room,host=r.hostId===me;$('#rc').textContent=r.code;$('#ctlmode').value=r.controls;$('#ctlmode').disabled=!host;renderPb();$('#people').innerHTML=r.members.map(m=>`<div class="item"><i class="dot ${m.online?'':'off'}"></i><span>${E(m.name)}${m.id===me?' (you)':''}${m.id===r.hostId?' 👑':''} <small class="mut">${m.online?Math.abs(m.drift)+'ms':'offline'}</small></span>${host&&m.online&&m.id!==me?`<button data-a="host" data-id="${m.id}">Make host</button>`:''}</div>`).join('');$('#ql').innerHTML=r.queue.map(q=>`<div class="item"><span>${E(q.title)}</span><button data-a="qplay" data-id="${q.id}">▶</button><button data-a="qmv" data-dir="-1" data-id="${q.id}">▲</button><button data-a="qmv" data-dir="1" data-id="${q.id}">▼</button><button data-a="qrm" data-id="${q.id}">✕</button></div>`).join('')||'<p class="mut">Queue is empty. Add from Discover.</p>';$('#pl').innerHTML=r.polls.slice().reverse().map(p=>{const tot=p.opts.reduce((s,o)=>s+o.v.length,0);return`<div class="poll"><b>${E(p.q)}</b>${p.opts.map((o,i)=>`<button class="opt" data-a="vote" data-id="${p.id}" data-i="${i}" ${p.open?'':'disabled'}><i style="width:${tot?o.v.length/tot*100:0}%"></i><span>${E(o.t)} — ${o.v.length}${o.v.includes(me)?' ✓':''}</span></button>`).join('')}${p.open&&(p.by===me||host)?`<button data-a="close" data-id="${p.id}">Close poll</button>`:p.open?'':'<small class="mut"> closed</small>'}</div>`}).join('')||'<p class="mut">No polls yet.</p>'}
async function find(){
  if(BACKEND_MISSING){$('#cats').innerHTML='';$('#movies').innerHTML='<p class="mut">Movie catalogue is waiting for the backend connection.</p>';return}
  try{
    const u=new URLSearchParams({q:$('#q').value,cat,minRating:$('#minr').value,sort:$('#sort').value});
    const res=await fetch(backendUrl('/api/movies?'+u));
    if(!res.ok)throw new Error('HTTP '+res.status);
    const d=await res.json();
    $('#cats').innerHTML=['',...d.cats].map(c=>`<button class="${c===cat?'on':''}" data-c="${c}">${c||'All'}</button>`).join('');
    $('#movies').innerHTML=d.movies.map(m=>{movies[m.id]=m;const h=[...m.id].reduce((a,c)=>a*31+c.charCodeAt(0),7)%360;return`<div class="mc"><div class="art" style="background:linear-gradient(135deg,hsl(${h} 60% 35%),hsl(${h+50} 60% 25%))">${E(m.title)}</div><div class="b"><small>${m.year} · ★ ${m.rating} · ${m.mins}m</small><small>${m.cats.join(' · ')}</small><div class="row"><button data-a="play" data-id="${m.id}">▶ Play</button><button data-a="queue" data-id="${m.id}">+ Queue</button></div></div></div>`}).join('')||'<p class="mut">No matches.</p>';
  }catch(err){
    $('#cats').innerHTML='';
    $('#movies').innerHTML='<p class="mut">Could not load movies. Check the backend URL in public/config.js and confirm the backend is running.</p>';
    console.error('Watch Party backend request failed:',err);
  }
}
$('#cats').onclick=e=>{if(e.target.dataset.c!==undefined){cat=e.target.dataset.c;find()}};let ft;$('#q').oninput=()=>{clearTimeout(ft);ft=setTimeout(find,150)};$('#sort').onchange=$('#minr').onchange=find;find();
const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const {Room}=require('../lib/room'),{search,CATS,byId}=require('../lib/catalog');
const PUB=path.join(__dirname,'../public'),MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',MAX=50,EMO=['👍','😂','😮','❤️','🔥','👏'];
const code5=()=>Array.from({length:5},()=>A[Math.random()*A.length|0]).join('');
async function readBody(req,max=2_000_000){let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>max)throw new Error('request too large');chunks.push(c)}return Buffer.concat(chunks).toString()}
async function start({port=+process.env.PORT||3000,host=process.env.HOST||'0.0.0.0',hostGraceMs=+process.env.HOST_GRACE_MS||15000}={}){
  const rooms=new Map();
  const srv=http.createServer(async(req,res)=>{
    const u=new URL(req.url,'http://x');
    if(u.pathname==='/healthz')return res.end('ok; webrtc-signaling=1; captions='+(process.env.OPENAI_API_KEY?'1':'0'));
    if(u.pathname==='/api/caption-config'){
      res.setHeader('access-control-allow-origin','https://anujj3431.github.io');res.setHeader('cache-control','no-store');res.setHeader('content-type','application/json');return res.end(JSON.stringify({enabled:!!process.env.OPENAI_API_KEY}));
    }
    if(u.pathname==='/api/transcribe'){
      res.setHeader('access-control-allow-origin','https://anujj3431.github.io');res.setHeader('access-control-allow-methods','POST, OPTIONS');res.setHeader('content-type','application/json');
      if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:'method not allowed'}))}
      if(!process.env.OPENAI_API_KEY){res.statusCode=503;return res.end(JSON.stringify({error:'Live captions are not configured'}))}
      try{const body=JSON.parse(await readBody(req));const audio=String(body.audio||'');const mime=String(body.mime||'audio/webm').split(';')[0];if(!audio||audio.length>1_600_000){res.statusCode=413;return res.end(JSON.stringify({error:'audio chunk too large'}));}const ext=mime.includes('mp4')?'mp4':mime.includes('ogg')?'ogg':'webm';const bytes=Buffer.from(audio,'base64');const form=new FormData();form.append('file',new Blob([bytes],{type:mime}),`caption.${ext}`);form.append('model',process.env.CAPTION_MODEL||'gpt-4o-mini-transcribe');const r=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:form});const data=await r.json();if(!r.ok){res.statusCode=502;return res.end(JSON.stringify({error:data?.error?.message||'Transcription failed'}))}return res.end(JSON.stringify({text:String(data.text||'').trim()}))}catch(err){console.error('Caption transcription failed:',err);res.statusCode=400;return res.end(JSON.stringify({error:'Invalid audio transcription request'}))}
    }
    if(u.pathname==='/api/ice-config'){
      res.setHeader('access-control-allow-origin','https://anujj3431.github.io');res.setHeader('access-control-allow-methods','GET, OPTIONS');res.setHeader('cache-control','no-store');
      if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}if(req.method!=='GET'){res.statusCode=405;return res.end('method not allowed')}
      const iceServers=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}];
      const turnUrls=String(process.env.TURN_URLS||'').split(',').map(x=>x.trim()).filter(Boolean),turnUsername=String(process.env.TURN_USERNAME||'').trim(),turnCredential=String(process.env.TURN_CREDENTIAL||'').trim();
      if(turnUrls.length&&turnUsername&&turnCredential)iceServers.push({urls:turnUrls,username:turnUsername,credential:turnCredential});
      try{const extra=JSON.parse(process.env.TURN_ICE_SERVERS_JSON||'[]');if(Array.isArray(extra))for(const s of extra)if(s&&s.urls)iceServers.push(s)}catch(err){console.warn('Invalid TURN_ICE_SERVERS_JSON:',err.message)}
      res.setHeader('content-type','application/json');return res.end(JSON.stringify({iceServers,turnEnabled:iceServers.some(s=>String(s.urls).includes('turn:')||String(s.urls).includes('turns:'))}));
    }
    if(u.pathname==='/api/movies'){
      res.setHeader('access-control-allow-origin','*');res.setHeader('access-control-allow-methods','GET, OPTIONS');if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}if(req.method!=='GET'){res.statusCode=405;return res.end('method not allowed')}
      const p=u.searchParams;res.setHeader('content-type','application/json');return res.end(JSON.stringify({cats:CATS,movies:search({q:p.get('q')||'',cat:p.get('cat')||'',minRating:+p.get('minRating')||0,sort:p.get('sort')||''})}))
    }
    const f=path.join(PUB,u.pathname==='/'?'index.html':u.pathname);if(!f.startsWith(PUB)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.statusCode=404;return res.end('not found')}res.setHeader('content-type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
  });
  const wss=new WebSocketServer({server:srv,path:'/ws',maxPayload:16384,perMessageDeflate:false});
  const bc=(r,o)=>{const s=JSON.stringify(o);r.conns.forEach(w=>w.readyState===1&&w.send(s))};const push=r=>bc(r,{t:'room',room:r.snapshot()});const notice=(r,text)=>bc(r,{t:'notice',text:String(text||'').slice(0,180),at:Date.now()});
  function handle(r,id,m,send){const e=x=>x&&x.err&&send({t:'err',m:x.err}),pbOut=(x,opId)=>x&&!x.err&&bc(r,{t:'pb',pb:x,by:id,opId});switch(m.t){
    case'ctl':{const x=r.control(id,m);e(x);pbOut(x,m.opId);if(x&&!x.err&&String(x.src||'').startsWith('room-stream:'))notice(r,`${r.members.get(id)?.name||'The host'} started ${x.src.startsWith('room-stream:screen:')?'screen sharing':'a shared video'}`);break}
    case'q_play':{const x=r.qPlay(id,m.id);e(x);pbOut(x);push(r);break}
    case'ended':{const x=r.ended(m.src);if(x){bc(r,{t:'pb',pb:x,by:null});push(r)}break}
    case'chat':{const g=r.addChat(id,m.text);if(g)bc(r,{t:'chat',msg:g});break}
    case'caption':{if(id!==r.hostId)return send({t:'err',m:'Only a host can publish live captions'});const text=String(m.text||'').trim().slice(0,300);if(text)bc(r,{t:'caption',text,at:Date.now()});break}
    case'react':if(EMO.includes(m.emoji))bc(r,{t:'react',emoji:m.emoji,name:r.members.get(id).name});break;
    case'q_add':{const mv=byId(m.movieId);const it=mv?{src:mv.url,title:mv.title,movieId:mv.id}:/^https?:\/\//.test(m.src||'')?{src:String(m.src).slice(0,500),title:String(m.title||m.src).slice(0,80)}:null;if(!it)return send({t:'err',m:'Invalid video URL'});if(!r.qAdd(id,it))return send({t:'err',m:'Queue is full (100 items maximum)'});notice(r,`${r.members.get(id)?.name||'Someone'} added “${it.title}” to the queue`);push(r);break}
    case'q_rm':r.qRm(m.id);push(r);break;case'q_mv':r.qMv(m.id,m.dir);push(r);break;
    case'poll_new':{const x=r.pollNew(id,m.q,m.opts,m.allowMultiple);if(x&&x.err)return e(x);notice(r,`${r.members.get(id)?.name||'Someone'} created a poll: ${String(m.q||'').slice(0,100)}`);push(r);break}
    case'vote':r.vote(id,m.pid,m.i);push(r);break;case'poll_close':r.pollClose(id,m.pid);push(r);break;
    case'host':{const x=r.transferHost(id,m.to);e(x);if(!x||!x.err){notice(r,`${r.members.get(id)?.name||'The host'} transferred host control`);push(r)}break}
    case'kick':{const x=r.kick(id,String(m.id||''));if(x&&x.err)return e(x);const target=r.conns.get(x.id);if(target&&target.readyState===1)target.send(JSON.stringify({t:'fatal',m:'The host removed you from this room'}));r.conns.delete(x.id);if(target)target.close(4003,'removed by host');notice(r,`${x.name} was removed by the host`);push(r);break}
    case'rtc':{const to=String(m.to||'').slice(0,16),d=m.data;if(!to||!d||!['offer','answer','candidate','stop'].includes(d.type))return send({t:'err',m:'Invalid media signaling message'});const fromHost=id===r.hostId;if((d.type==='offer'||d.type==='stop')&&!fromHost)return send({t:'err',m:'Only the host can start or stop shared media'});if(fromHost){const member=r.members.get(to);if(!member||!member.online||to===id)return send({t:'err',m:'Participant is no longer connected'})}else if(to!==r.hostId)return send({t:'err',m:'Media signaling must go through the host'});const dest=r.conns.get(to);if(!dest||dest.readyState!==1)return send({t:'err',m:'Participant is offline'});dest.send(JSON.stringify({t:'rtc',from:id,data:d}));break}
    case'media_stop':{if(id!==r.hostId)return send({t:'err',m:'Only the host can stop shared media'});const x=r.control(id,{op:'clear',opId:String(m.opId||'media-stop')});if(x&&!x.err){pbOut(x,m.opId);notice(r,`${r.members.get(id)?.name||'The host'} stopped shared media`);push(r)}else e(x);break}
    case'media_ended':{if(id!==r.hostId||!String(r.pb.src||'').startsWith('room-stream:'))return;r.pb.playing=false;r.pb.pos=0;r.pb.at=Date.now();r.pb.seq++;bc(r,{t:'pb',pb:{...r.pb},by:id});notice(r,'The shared video has finished');push(r);break}
    case'settings':r.setControls(id,m.controls);push(r);break;case'drift':r.setDrift(id,m.ms);push(r);break;
  }}
  wss.on('connection',ws=>{let r,id,tok=60,last=Date.now();const send=o=>ws.readyState===1&&ws.send(JSON.stringify(o));ws.on('message',raw=>{const n=Date.now();tok=Math.min(60,tok+(n-last)*.03);last=n;let m;try{m=JSON.parse(raw)}catch{return}if(m.t==='ping')return send({t:'pong',c:m.c,s:n});if(--tok<0)return send({t:'err',m:'Slow down (rate limited)'});if(m.t==='join'){if(r)return;const c=String(m.room||'').toUpperCase().slice(0,8);let room=c&&rooms.get(c);if(c&&!room)return send({t:'fatal',m:'Room not found'});if(!room){let k;do k=code5();while(rooms.has(k));room=new Room(k);room.conns=new Map();rooms.set(k,room)}const cid=String(m.cid||'').replace(/\W/g,'').slice(0,16)||Math.random().toString(36).slice(2,10);if(room.kicked&&room.kicked.has(cid))return send({t:'fatal',m:'You were removed from this room by the host'});if(!room.members.has(cid)&&room.members.size>=MAX)return send({t:'fatal',m:'Room is full'});const previous=room.members.get(cid),wasOnline=!!(previous&&previous.online);const old=room.conns.get(cid);if(old&&old!==ws)old.close(4000,'replaced');r=room;id=cid;r.conns.set(id,ws);r.join(id,String(m.name||'Guest').slice(0,24));send({t:'welcome',you:id,room:r.snapshot(),chat:r.chat});if(!wasOnline)notice(r,`${r.members.get(id)?.name||'Someone'} joined the room`);push(r);return}if(r)handle(r,id,m,send)});ws.on('close',()=>{if(!r||r.conns.get(id)!==ws)return;r.conns.delete(id);r.leave(id);if(r.members.has(id))notice(r,`${r.members.get(id)?.name||'A participant'} left the room`);if(r.hostId===id)setTimeout(()=>{const mm=r.members.get(id);if(r.hostId===id&&mm&&!mm.online){r.electHost();push(r)}},hostGraceMs).unref();push(r)})});
  const gc=setInterval(()=>{const n=Date.now();for(const[k,r]of rooms){for(const[i,m]of r.members)if(!m.online&&n-m.off>3e5&&i!==r.hostId)r.members.delete(i);if([...r.members.values()].every(m=>!m.online&&n-m.off>6e5))rooms.delete(k)}},6e4);gc.unref();await new Promise(r=>srv.listen(port,host,r));return{port:srv.address().port,rooms,close:()=>new Promise(r=>{clearInterval(gc);wss.clients.forEach(c=>c.terminate());srv.close(r)})};}
module.exports={start};if(require.main===module)start().then(s=>console.log(`Watch Party running on http://localhost:${s.port}`));
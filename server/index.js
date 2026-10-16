const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const {Room}=require('../lib/room'),{search,CATS,byId}=require('../lib/catalog');
const PUB=path.join(__dirname,'../public'),MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',MAX=50,EMO=['👍','😂','😮','❤️','🔥','👏'];
const code5=()=>Array.from({length:5},()=>A[Math.random()*A.length|0]).join('');
async function start({port=+process.env.PORT||3000,hostGraceMs=+process.env.HOST_GRACE_MS||15000}={}){
  const rooms=new Map();
  const srv=http.createServer((req,res)=>{
    const u=new URL(req.url,'http://x');
    if(u.pathname==='/healthz')return res.end('ok');
    if(u.pathname==='/api/movies'){const p=u.searchParams;res.setHeader('content-type','application/json');return res.end(JSON.stringify({cats:CATS,movies:search({q:p.get('q')||'',cat:p.get('cat')||'',minRating:+p.get('minRating')||0,sort:p.get('sort')||''})}))}
    const f=path.join(PUB,u.pathname==='/'?'index.html':u.pathname);
    if(!f.startsWith(PUB)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.statusCode=404;return res.end('not found')}
    res.setHeader('content-type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
  });
  const wss=new WebSocketServer({server:srv,path:'/ws',maxPayload:16384,perMessageDeflate:false});
  const bc=(r,o)=>{const s=JSON.stringify(o);r.conns.forEach(w=>w.readyState===1&&w.send(s))};
  const push=r=>bc(r,{t:'room',room:r.snapshot()});
  function handle(r,id,m,send){
    const e=x=>x&&x.err&&send({t:'err',m:x.err}),pbOut=(x,opId)=>x&&!x.err&&bc(r,{t:'pb',pb:x,by:id,opId});
    switch(m.t){
      case'ctl':{const x=r.control(id,m);e(x);pbOut(x,m.opId);break}
      case'q_play':{const x=r.qPlay(id,m.id);e(x);pbOut(x);push(r);break}
      case'ended':{const x=r.ended(m.src);if(x){bc(r,{t:'pb',pb:x,by:null});push(r)}break}
      case'chat':{const g=r.addChat(id,m.text);if(g)bc(r,{t:'chat',msg:g});break}
      case'react':if(EMO.includes(m.emoji))bc(r,{t:'react',emoji:m.emoji,name:r.members.get(id).name});break;
      case'q_add':{const mv=byId(m.movieId);const it=mv?{src:mv.url,title:mv.title,movieId:mv.id}:/^https?:\/\//.test(m.src||'')?{src:String(m.src).slice(0,500),title:String(m.title||m.src).slice(0,80)}:null;if(!it)return send({t:'err',m:'Invalid video'});r.qAdd(id,it);push(r);break}
      case'q_rm':r.qRm(m.id);push(r);break;
      case'q_mv':r.qMv(m.id,m.dir);push(r);break;
      case'poll_new':e(r.pollNew(id,m.q,m.opts));push(r);break;
      case'vote':r.vote(id,m.pid,m.i);push(r);break;
      case'poll_close':r.pollClose(id,m.pid);push(r);break;
      case'host':e(r.transferHost(id,m.to));push(r);break;
      case'settings':r.setControls(id,m.controls);push(r);break;
      case'drift':r.setDrift(id,m.ms);push(r);break;
    }
  }
  wss.on('connection',ws=>{
    let r,id,tok=60,last=Date.now();
    const send=o=>ws.readyState===1&&ws.send(JSON.stringify(o));
    ws.on('message',raw=>{
      const n=Date.now();tok=Math.min(60,tok+(n-last)*.03);last=n;
      let m;try{m=JSON.parse(raw)}catch{return}
      if(m.t==='ping')return send({t:'pong',c:m.c,s:n});
      if(--tok<0)return send({t:'err',m:'Slow down (rate limited)'});
      if(m.t==='join'){
        if(r)return;
        const c=String(m.room||'').toUpperCase().slice(0,8);let room=c&&rooms.get(c);
        if(c&&!room)return send({t:'fatal',m:'Room not found'});
        if(!room){let k;do k=code5();while(rooms.has(k));room=new Room(k);room.conns=new Map();rooms.set(k,room)}
        const cid=String(m.cid||'').replace(/\W/g,'').slice(0,16)||Math.random().toString(36).slice(2,10);
        if(!room.members.has(cid)&&room.members.size>=MAX)return send({t:'fatal',m:'Room is full'});
        const old=room.conns.get(cid);if(old&&old!==ws)old.close(4000,'replaced');
        r=room;id=cid;r.conns.set(id,ws);r.join(id,String(m.name||'Guest').slice(0,24));
        send({t:'welcome',you:id,room:r.snapshot(),chat:r.chat});push(r);return;
      }
      if(r)handle(r,id,m,send);
    });
    ws.on('close',()=>{
      if(!r||r.conns.get(id)!==ws)return;
      r.conns.delete(id);r.leave(id);
      if(r.hostId===id)setTimeout(()=>{const mm=r.members.get(id);if(r.hostId===id&&mm&&!mm.online){r.electHost();push(r)}},hostGraceMs).unref();
      push(r);
    });
  });
  const gc=setInterval(()=>{const n=Date.now();for(const[k,r]of rooms){for(const[i,m]of r.members)if(!m.online&&n-m.off>3e5&&i!==r.hostId)r.members.delete(i);if([...r.members.values()].every(m=>!m.online&&n-m.off>6e5))rooms.delete(k)}},6e4);gc.unref();
  await new Promise(r=>srv.listen(port,r));
  return{port:srv.address().port,rooms,close:()=>new Promise(r=>{clearInterval(gc);wss.clients.forEach(c=>c.terminate());srv.close(r)})};
}
module.exports={start};
if(require.main===module)start().then(s=>console.log(`Watch Party running on http://localhost:${s.port}`));
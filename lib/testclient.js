const WebSocket=require('ws');
function connect(url){return new Promise((res,rej)=>{
  const ws=new WebSocket(url),c={ws,msgs:[],ls:[]};
  ws.on('message',d=>{const m=JSON.parse(d);c.msgs.push(m);c.ls.slice().forEach(l=>l(m))});ws.on('error',rej);
  c.send=o=>ws.send(JSON.stringify(o));c.clear=()=>{c.msgs.length=0};
  c.wait=(p,ms=2000)=>new Promise((r,j)=>{const f=c.msgs.find(p);if(f)return r(f);const t=setTimeout(()=>j(new Error('timeout')),ms);const l=m=>{if(p(m)){clearTimeout(t);c.ls=c.ls.filter(x=>x!==l);r(m)}};c.ls.push(l)});
  c.join=(room,name,cid)=>{c.send({t:'join',room,name,cid});return c.wait(m=>m.t==='welcome'||m.t==='fatal')};
  ws.on('open',()=>res(c));});}
module.exports={connect};
// Measures control propagation latency: sender timestamp -> receipt at every other client (same host => shared clock, so no skew).
const {connect}=require('../lib/testclient'),{start}=require('../server');
const pct=(a,p)=>a.length?a.slice().sort((x,y)=>x-y)[Math.min(a.length-1,Math.ceil(p/100*a.length)-1)]:0;
async function run({url,users=12,ops=100,gap=15}){
  const cs=await Promise.all(Array.from({length:users},()=>connect(url)));const w=await cs[0].join(null,'u0','c0');for(let i=1;i<users;i++)await cs[i].join(w.room.code,'u'+i,'c'+i);
  cs[0].send({t:'ctl',op:'load',src:'http://x/v.mp4',title:'bench'});await cs[0].wait(m=>m.t==='pb');
  const t0=new Map(),lat=[],fan=new Map();let got=0;cs.forEach(c=>c.ws.on('message',d=>{const n=performance.now(),m=JSON.parse(d);if(m.t!=='pb'||!t0.has(m.opId))return;const l=n-t0.get(m.opId);lat.push(l);got++;fan.set(m.opId,Math.max(fan.get(m.opId)||0,l))}));
  for(let i=0;i<ops;i++){const id='op'+i;t0.set(id,performance.now());cs[i%users].send({t:'ctl',opId:id,op:['play','pause','seek'][i%3],pos:i});await new Promise(r=>setTimeout(r,gap))}
  for(let k=0;k<100&&got<ops*users;k++)await new Promise(r=>setTimeout(r,20));cs.forEach(c=>c.ws.close());const f=[...fan.values()];const r=a=>+a.toFixed(2);return{users,ops,deliveries:got,expected:ops*users,p50:r(pct(lat,50)),p95:r(pct(lat,95)),p99:r(pct(lat,99)),max:r(Math.max(...lat)),fanoutP95:r(pct(f,95))};
}
module.exports={run};
if(require.main===module)(async()=>{const s=process.env.BENCH_URL?null:await start({port:0});const url=process.env.BENCH_URL||`ws://localhost:${s.port}/ws`;console.log(JSON.stringify(await run({url,users:+process.env.USERS||12,ops:+process.env.OPS||300}),null,1));if(s)await s.close();process.exit(0)})();
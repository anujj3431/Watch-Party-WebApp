// Pure room state machine (no I/O). The server is the single source of truth:
// every playback mutation is serialized, stamped with server time `at` and a monotonically increasing `seq`.
const rid=()=>require('crypto').randomBytes(4).toString('hex');
const num=(v,d)=>v!==null&&v!==''&&Number.isFinite(+v)?Math.max(0,+v):d;
class Room{
  constructor(code,now=Date.now){Object.assign(this,{code,now,hostId:null,members:new Map(),chat:[],queue:[],polls:[],controls:'all',seen:new Set(),kicked:new Set()});this.pb={src:null,title:'',playing:false,pos:0,at:now(),seq:0}}
  expected(){const p=this.pb;return p.playing?p.pos+(this.now()-p.at)/1000:p.pos}
  join(id,name){let m=this.members.get(id);if(!m)this.members.set(id,m={id,name,online:true,drift:0});m.online=true;m.off=null;m.name=name||m.name;if(!this.hostId||!this.members.get(this.hostId))this.hostId=id;return m}
  leave(id){const m=this.members.get(id);if(m){m.online=false;m.off=this.now()}}
  electHost(){const h=this.members.get(this.hostId);if(h&&h.online)return;const n=[...this.members.values()].find(m=>m.online);if(n)this.hostId=n.id}
  canControl(id){return this.members.has(id)&&(this.controls==='all'||id===this.hostId)}
  control(id,c){
    if(!this.canControl(id))return{err:'Only the host can control playback'};
    if(c.opId){const k=id+c.opId;if(this.seen.has(k))return null;this.seen.add(k);if(this.seen.size>2000)this.seen.delete(this.seen.values().next().value)}
    const p=this.pb;if(c.op!=='load'&&c.op!=='clear'&&!p.src)return{err:'Nothing loaded'};const pos=num(c.pos,this.expected());
    if(c.op==='load'){const src=String(c.src||'');const stream=/^room-stream:(upload|screen):[A-Za-z0-9_-]+$/.test(src);if(!/^https?:\/\//.test(src)&&!stream)return{err:'Invalid source'};if(stream&&id!==this.hostId)return{err:'Only the host can share media'};p.src=src;p.title=String(c.title||'Video').slice(0,80);p.pos=0;p.playing=true}
    else if(c.op==='clear'){if(id!==this.hostId)return{err:'Only the host can stop shared media'};p.src=null;p.title='';p.pos=0;p.playing=false}
    else if(c.op==='play'){p.pos=pos;p.playing=true}else if(c.op==='pause'){p.pos=pos;p.playing=false}else if(c.op==='seek'){p.pos=pos}else return{err:'Bad op'};
    p.at=this.now();p.seq++;return{...p};
  }
  ended(src){const p=this.pb;if(p.src!==src||!p.playing)return null;const n=this.queue.shift();if(n){p.src=n.src;p.title=n.title;p.pos=0;p.playing=true}else{p.pos=0;p.playing=false}p.at=this.now();p.seq++;return{...p}}
  qAdd(id,it){if(this.queue.length<100)this.queue.push({id:rid(),by:id,...it})}
  qRm(i){this.queue=this.queue.filter(q=>q.id!==i)}
  qMv(i,d){const k=this.queue.findIndex(q=>q.id===i),j=k+(d<0?-1:1);if(k<0||j<0||j>=this.queue.length)return;[this.queue[k],this.queue[j]]=[this.queue[j],this.queue[k]]}
  qPlay(id,i){if(!this.canControl(id))return{err:'Only the host can control playback'};const k=this.queue.findIndex(q=>q.id===i);if(k<0)return null;const[it]=this.queue.splice(k,1);return this.control(id,{op:'load',src:it.src,title:it.title})}
  addChat(id,t){t=String(t||'').trim().slice(0,500);const m=this.members.get(id);if(!t||!m)return null;const g={id:rid(),from:id,name:m.name,text:t,ts:this.now()};this.chat.push(g);if(this.chat.length>100)this.chat.shift();return g}
  pollNew(id,q,o,allowMultiple=false){q=String(q||'').trim().slice(0,120);o=(Array.isArray(o)?o:[]).map(x=>String(x).trim().slice(0,60)).filter(Boolean).slice(0,6);if(!q||o.length<2)return{err:'A poll needs a question and 2+ options'};if(this.polls.length>=20)this.polls.shift();this.polls.push({id:rid(),q,by:id,open:true,allowMultiple:!!allowMultiple,opts:o.map(t=>({t,v:[]}))})}
  vote(id,pid,i){const p=this.polls.find(x=>x.id===pid);if(!p||!p.open||!p.opts[i]||!this.members.has(id))return;if(p.allowMultiple){const v=p.opts[i].v,k=v.indexOf(id);if(k>=0)v.splice(k,1);else v.push(id)}else{p.opts.forEach(o=>o.v=o.v.filter(u=>u!==id));p.opts[i].v.push(id)}}
  pollClose(id,pid){const p=this.polls.find(x=>x.id===pid);if(p&&(id===p.by||id===this.hostId))p.open=false}
  transferHost(id,to){if(id!==this.hostId)return{err:'Only the host can transfer host'};const m=this.members.get(to);if(!m||!m.online)return{err:'User unavailable'};this.hostId=to}
  kick(id,to){if(id!==this.hostId)return{err:'Only the host can remove participants'};if(to===this.hostId)return{err:'The host cannot remove themselves'};const m=this.members.get(to);if(!m||!m.online)return{err:'Participant is unavailable'};this.kicked.add(to);this.members.delete(to);return{id:to,name:m.name}}
  setControls(id,v){if(id===this.hostId&&['all','host'].includes(v))this.controls=v}
  setDrift(id,ms){const m=this.members.get(id);if(m)m.drift=Math.max(-99999,Math.min(99999,Math.round(+ms||0)))}
  snapshot(){return{code:this.code,hostId:this.hostId,controls:this.controls,members:[...this.members.values()].map(({id,name,online,drift})=>({id,name,online,drift})),queue:this.queue,polls:this.polls,pb:{...this.pb}}}
}
module.exports={Room};
// Shared by browser and tests: clock-offset estimation + drift correction policy.
(function(root,f){typeof module==='object'?module.exports=f():root.Sync=f()})(this,function(){
  class Clock{
    constructor(){this.s=[];this.offset=0;this.rtt=0}
    add(t0,serverTs,t1){const rtt=t1-t0;this.s.push({rtt,off:serverTs+rtt/2-t1});if(this.s.length>10)this.s.shift();const b=this.s.reduce((a,x)=>x.rtt<a.rtt?x:a);this.offset=b.off;this.rtt=b.rtt}
    now(){return Date.now()+this.offset}
  }
  function plan(d,o={}){const hard=o.hard??.4,soft=o.soft??.08,a=Math.abs(d);if(a>hard)return{action:'seek',rate:1};if(a>soft)return{action:'rate',rate:Math.min(1.1,Math.max(.9,1-d*.8))};return{action:'none',rate:1}}
  return{Clock,plan};
});
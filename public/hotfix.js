(()=>{
  const $=s=>document.querySelector(s);
  const send=o=>typeof tx==='function'&&tx(o);
  function switchTab(t){document.querySelectorAll('.tabs button[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===t));document.querySelectorAll('[id^="t-"]').forEach(x=>x.hidden=x.id!==`t-${t}`);if(t==='chat'&&typeof clearNotifications==='function')clearNotifications()}
  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('.tabs button[data-t]');
    if(tab){e.preventDefault();e.stopImmediatePropagation();switchTab(tab.dataset.t);return}
    const sendBtn=e.target.closest?.('#cs');
    if(sendBtn){e.preventDefault();e.stopImmediatePropagation();const i=$('#ci'),text=i?.value.trim();if(text&&ws?.readyState===1){send({t:'chat',text});i.value=''}return}
    if(e.target.closest?.('#enableAudio'))return;
    if(typeof unlockAudio==='function'&&typeof v!=='undefined'&&v.srcObject&&room&&room.hostId!==me)unlockAudio(false);
  },true);
  document.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&e.target?.id==='ci'&&!e.shiftKey){e.preventDefault();e.stopImmediatePropagation();$('#cs')?.click();return}
    if(typeof unlockAudio==='function'&&typeof v!=='undefined'&&v.srcObject&&room&&room.hostId!==me&&e.key!=='Tab')unlockAudio(false);
  },true);
  const enable=()=>{const b=$('#enableAudio');if(b&&typeof v!=='undefined'&&v.srcObject){b.disabled=false;b.textContent=typeof audioEnabled!=='undefined'&&audioEnabled?'Mute audio':'Join audio'}};
  setInterval(enable,1000);
  const cards=$('#movies');
  cards?.addEventListener('click',e=>{
    const b=e.target.closest?.('button');if(!b)return;
    const id=b.dataset.movieId||b.dataset.id||b.getAttribute('data-movie')||b.getAttribute('data-id');
    if(id&&typeof movies!=='undefined'&&movies[id]){e.preventDefault();e.stopImmediatePropagation();send({t:'q_add',movieId:id});}
  },true);
})();
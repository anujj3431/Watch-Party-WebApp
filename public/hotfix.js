(()=>{
  const $=s=>document.querySelector(s);
  function switchTab(t){
    document.querySelectorAll('.tabs button[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
    document.querySelectorAll('[id^="t-"]').forEach(x=>x.hidden=x.id!==`t-${t}`);
    if(t==='chat'&&typeof clearNotifications==='function')clearNotifications();
  }
  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('.tabs button[data-t]');
    if(!tab)return;
    e.preventDefault();
    switchTab(tab.dataset.t);
  },true);
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#fullscreen');
    if(!btn)return;
    e.preventDefault();
    const video=$('#v');
    if(!video)return;
    if(document.fullscreenElement||document.webkitFullscreenElement){
      (document.exitFullscreen||document.webkitExitFullscreen)?.call(document);
      return;
    }
    const enter=video.requestFullscreen||video.webkitRequestFullscreen;
    if(enter)enter.call(video).catch?.(()=>{});
  });
})();

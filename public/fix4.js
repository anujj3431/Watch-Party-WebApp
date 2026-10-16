(()=>{
  const $=s=>document.querySelector(s);
  const getTx=()=>typeof tx==='function'?tx:null;
  let installed=false;

  function chat(){
    const old=$('#ci'), send=$('#cs');
    if(!old||!send)return;
    if(old.dataset.fix4!=='1'){
      old.dataset.fix4='1';
      old.disabled=false;
      old.readOnly=false;
      old.removeAttribute('disabled');
      old.removeAttribute('readonly');
      old.tabIndex=0;
      old.style.pointerEvents='auto';
      old.style.userSelect='text';
      old.style.webkitUserSelect='text';
      old.addEventListener('focus',()=>{old.disabled=false;old.readOnly=false});
      old.addEventListener('keydown',e=>{
        if(e.key!=='Enter'||e.shiftKey)return;
        e.preventDefault();
        const text=old.value.trim();
        if(!text)return;
        const sendFn=getTx();
        if(!sendFn)return;
        sendFn({t:'chat',text});
        old.value='';
      });
    }
    if(send.dataset.fix4!=='1'){
      send.dataset.fix4='1';
      send.type='button';
      send.addEventListener('click',e=>{
        e.preventDefault();
        e.stopImmediatePropagation();
        const text=old.value.trim();
        if(!text)return old.focus();
        const sendFn=getTx();
        if(!sendFn)return;
        sendFn({t:'chat',text});
        old.value='';
        old.focus();
      },true);
    }
  }

  function playMovie(e){
    const b=e.target.closest?.('#movies button[data-a="play"]');
    if(!b)return;
    const id=b.dataset.id;
    const mv=typeof movies==='object'?movies[id]:null;
    const sendFn=getTx();
    if(!mv||!sendFn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    sendFn({t:'ctl',opId:(typeof oid==='function'?oid():Math.random().toString(36).slice(2)),op:'load',src:mv.url,title:mv.title});
    if(typeof toast==='function')toast('▶ Playing '+mv.title);
  }

  function audio(){
    const b=$('#enableAudio'),v=$('#v');
    if(!b||!v)return;
    b.disabled=false;
    b.textContent=(v.muted?'Join audio':'Mute audio');
    b.onclick=e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      if(v.muted){
        v.muted=false;
        v.volume=1;
        const p=v.play();
        if(p?.catch)p.catch(()=>{v.muted=true;if(typeof toast==='function')toast('Click Join audio again to allow browser audio.')});
      }else{
        v.muted=true;
      }
      b.textContent=v.muted?'Join audio':'Mute audio';
      b.disabled=false;
    };
  }

  function fullscreen(){
    const tools=$('.media-tools');
    if(!tools||$('#fullscreenShared'))return;
    const b=document.createElement('button');
    b.id='fullscreenShared';
    b.type='button';
    b.textContent='⛶ Full screen';
    tools.insertBefore(b,$('#mediaStatus'));
    b.onclick=async()=>{
      const v=$('#v');
      try{
        if(document.fullscreenElement)await document.exitFullscreen();
        else if(v.requestFullscreen)await v.requestFullscreen();
        else if(v.webkitEnterFullscreen)v.webkitEnterFullscreen();
      }catch(e){if(typeof toast==='function')toast('Full screen was blocked by the browser.')}
    };
  }

  function keepControls(){
    const b=$('#enableAudio'),v=$('#v');
    if(!b||!v)return;
    if(v.src||v.currentSrc||v.srcObject)b.disabled=false;
  }

  function boot(){chat();audio();fullscreen();keepControls();}
  document.addEventListener('click',playMovie,true);
  document.addEventListener('DOMContentLoaded',boot);
  [100,500,1000,2000].forEach(ms=>setTimeout(boot,ms));
  setInterval(boot,1000);
})();

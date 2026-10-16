(()=>{
  const $=s=>document.querySelector(s);
  const sendChat=()=>{
    const input=$('#ci');
    if(!input)return;
    const text=input.value.trim();
    if(!text)return;
    if(typeof tx==='function')tx({t:'chat',text});
    input.value='';
    input.focus();
  };

  function installChat(){
    const input=$('#ci'),button=$('#cs');
    if(!input||!button)return;

    // Never let the room state disable or lock the guest chat box.
    input.disabled=false;
    input.readOnly=false;
    input.removeAttribute('disabled');
    input.removeAttribute('readonly');
    input.tabIndex=0;
    input.style.pointerEvents='auto';
    input.style.userSelect='text';
    input.style.webkitUserSelect='text';

    if(input.dataset.chatFix!=='1'){
      input.dataset.chatFix='1';
      input.addEventListener('keydown',e=>{
        if(e.key==='Enter'&&!e.shiftKey){
          e.preventDefault();
          sendChat();
        }
      });
    }
    if(button.dataset.chatFix!=='1'){
      button.dataset.chatFix='1';
      button.type='button';
      button.addEventListener('click',e=>{
        e.preventDefault();
        sendChat();
      });
    }
  }

  function installPlay(){
    document.querySelectorAll('#movies button[data-a="play"]').forEach(button=>{
      if(button.dataset.playFix==='1')return;
      button.dataset.playFix='1';
      button.addEventListener('click',e=>{
        const id=button.dataset.id;
        const mv=typeof movies==='object'?movies[id]:null;
        if(!mv||typeof tx!=='function')return;
        e.preventDefault();
        tx({t:'ctl',opId:typeof oid==='function'?oid():Math.random().toString(36).slice(2),op:'load',src:mv.url,title:mv.title});
      });
    });
  }

  function installAudio(){
    const b=$('#enableAudio'),v=$('#v');
    if(!b||!v)return;
    b.disabled=false;
    b.textContent=v.muted?'Join audio':'Mute audio';
    if(b.dataset.audioFix==='1')return;
    b.dataset.audioFix='1';
    b.addEventListener('click',e=>{
      e.preventDefault();
      if(v.muted){
        v.muted=false;
        v.volume=1;
        const p=v.play();
        if(p?.catch)p.catch(()=>{});
      }else v.muted=true;
      b.textContent=v.muted?'Join audio':'Mute audio';
    });
  }

  function boot(){installChat();installPlay();installAudio();}
  document.addEventListener('DOMContentLoaded',boot);
  [100,500,1000,2000].forEach(ms=>setTimeout(boot,ms));
  setInterval(boot,1000);
})();

(()=>{
  const $=s=>document.querySelector(s);
  const send=o=>{try{if(typeof tx==='function')tx(o)}catch(e){console.error(e)}};
  let joinedAudio=false;
  let audioEl=null;

  function ensureAudio(){
    if(audioEl)return audioEl;
    audioEl=document.createElement('audio');
    audioEl.id='sharedAudio';
    audioEl.autoplay=true;
    audioEl.playsInline=true;
    audioEl.controls=false;
    audioEl.style.display='none';
    document.body.appendChild(audioEl);
    return audioEl;
  }

  function syncRemoteAudio(){
    const v=$('#v');
    const a=ensureAudio();
    if(v?.srcObject && a.srcObject!==v.srcObject)a.srcObject=v.srcObject;
    if(v?.srcObject && joinedAudio){
      a.muted=false;
      a.volume=1;
      const p=a.play();
      if(p?.catch)p.catch(()=>{});
    }
  }

  function audioButton(){
    const b=$('#enableAudio');
    if(!b)return;
    b.disabled=false;
    b.textContent=joinedAudio?'Mute audio':'Join audio';
    b.title='Enable or mute shared audio';
  }

  function toggleAudio(e){
    if(e){e.preventDefault();e.stopImmediatePropagation();}
    const v=$('#v');
    const a=ensureAudio();
    if(v?.srcObject)a.srcObject=v.srcObject;
    if(joinedAudio){
      joinedAudio=false;
      a.muted=true;
      a.pause();
      if(v)v.muted=true;
      audioButton();
      return;
    }
    if(!v?.srcObject){
      const msg=typeof toast==='function'?'The host has not shared audio/media yet.':null;
      if(msg)toast('The host has not shared media yet.');
      return;
    }
    joinedAudio=true;
    a.muted=false;
    a.volume=1;
    if(v)v.muted=true;
    const p=a.play();
    if(p?.catch)p.catch(()=>toast('Click Join audio again to allow browser audio.'));
    audioButton();
    if(typeof toast==='function')toast('🔊 Shared audio enabled');
  }

  function addFullscreenButton(){
    const tools=$('.media-tools');
    if(!tools||$('#fullscreenShared'))return;
    const b=document.createElement('button');
    b.id='fullscreenShared';
    b.type='button';
    b.textContent='⛶ Full screen shared media';
    b.disabled=true;
    b.title='Open the shared screen/video in full screen';
    tools.insertBefore(b,$('#mediaStatus'));
    b.addEventListener('click',async e=>{
      e.preventDefault();
      const v=$('#v');
      if(!v?.srcObject){if(typeof toast==='function')toast('Full screen is available when shared media is playing.');return}
      try{
        if(document.fullscreenElement)await document.exitFullscreen();
        else if(v.requestFullscreen)await v.requestFullscreen();
        else if(v.webkitEnterFullscreen)v.webkitEnterFullscreen();
      }catch(err){console.warn(err);if(typeof toast==='function')toast('Your browser blocked full screen. Use the video controls or press F11.');}
    });
  }

  function update(){
    const v=$('#v');
    const hasMedia=!!v?.srcObject;
    const full=$('#fullscreenShared');
    if(full)full.disabled=!hasMedia;
    audioButton();
    syncRemoteAudio();
    const ci=$('#ci');
    if(ci){
      ci.disabled=false;
      ci.readOnly=false;
      ci.removeAttribute('disabled');
      ci.removeAttribute('readonly');
      ci.style.pointerEvents='auto';
      ci.style.userSelect='text';
      ci.style.webkitUserSelect='text';
    }
  }

  function installChat(){
    const input=$('#ci'),button=$('#cs');
    if(!input||!button||input.dataset.fix2==='1')return;
    input.dataset.fix2='1';
    input.disabled=false;input.readOnly=false;
    const doSend=()=>{
      const text=input.value.trim();
      if(!text)return;
      if(!ws||ws.readyState!==1){if(typeof toast==='function')toast('Chat is reconnecting…');return}
      send({t:'chat',text});
      input.value='';
      input.focus();
    };
    button.addEventListener('click',e=>{e.preventDefault();doSend()});
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();doSend();}
    });
    input.addEventListener('focus',()=>{input.disabled=false;input.readOnly=false});
  }

  function installEmoji(){
    const input=$('#ci');
    if(!input||$('#emojiBar'))return;
    const bar=document.createElement('div');
    bar.id='emojiBar';
    bar.style.cssText='display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px';
    ['😀','😂','😍','🔥','❤️','👍','👏','🎉','😎','😭','🤣','🍿','🎬','👀','💀','😡','🤯','🥳'].forEach(x=>{
      const b=document.createElement('button');b.type='button';b.textContent=x;b.title='Add '+x;b.style.cssText='padding:3px 6px;min-width:32px';
      b.addEventListener('click',()=>{input.disabled=false;input.readOnly=false;input.focus();const a=input.selectionStart??input.value.length,z=input.selectionEnd??a;input.value=input.value.slice(0,a)+x+input.value.slice(z);input.setSelectionRange(a+x.length,a+x.length);});
      bar.appendChild(b);
    });
    input.parentElement?.parentElement?.insertBefore(bar,input.parentElement);
  }

  function installUpload(){
    const f=$('#videoFile');
    if(!f||f.dataset.fix2==='1')return;
    f.dataset.fix2='1';
    f.addEventListener('change',()=>{
      const file=f.files?.[0];
      if(file&&typeof startUpload==='function')startUpload(file);
    });
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#enableAudio')){toggleAudio(e);return;}
  },true);

  document.addEventListener('DOMContentLoaded',()=>{installChat();installEmoji();installUpload();addFullscreenButton();update();});
  setTimeout(()=>{installChat();installEmoji();installUpload();addFullscreenButton();update();},300);
  setInterval(update,1000);
})();

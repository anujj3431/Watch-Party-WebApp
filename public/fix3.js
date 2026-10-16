(()=>{
  const $=s=>document.querySelector(s);
  let chatInput=null, chatSend=null, audioJoined=false;

  function toastMsg(m){if(typeof toast==='function')toast(m);}

  function replaceChatInput(){
    const old=$('#ci'), btn=$('#cs');
    if(!old||!btn)return;
    if(!chatInput){
      chatInput=old.cloneNode(true);
      chatInput.disabled=false;
      chatInput.readOnly=false;
      chatInput.removeAttribute('disabled');
      chatInput.removeAttribute('readonly');
      chatInput.style.pointerEvents='auto';
      chatInput.style.userSelect='text';
      chatInput.style.webkitUserSelect='text';
      old.replaceWith(chatInput);
      chatSend=btn.cloneNode(true);
      btn.replaceWith(chatSend);
      chatSend.addEventListener('click',sendChat);
      chatInput.addEventListener('keydown',e=>{
        if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}
      });
      chatInput.addEventListener('input',()=>{chatInput.disabled=false;chatInput.readOnly=false;});
    }
  }

  function sendChat(){
    if(!chatInput)return;
    const text=chatInput.value.trim();
    if(!text)return;
    if(typeof ws==='undefined'||!ws||ws.readyState!==1){toastMsg('Chat is reconnecting…');return;}
    ws.send(JSON.stringify({t:'chat',text}));
    chatInput.value='';
    chatInput.focus();
  }

  function ensureAudioButton(){
    const b=$('#enableAudio'), v=$('#v');
    if(!b)return;
    const hasMedia=!!(v?.srcObject||v?.currentSrc||v?.getAttribute('src'));
    b.disabled=false;
    b.textContent=audioJoined?'Mute audio':'Join audio';
    b.title=hasMedia?'Click to enable shared movie/screen audio':'Join audio when the host starts media';
  }

  async function joinAudio(){
    const v=$('#v');
    if(!v)return;
    if(audioJoined){
      audioJoined=false;
      v.muted=true;
      ensureAudioButton();
      return;
    }
    const hasMedia=!!(v.srcObject||v.currentSrc||v.getAttribute('src'));
    if(!hasMedia){toastMsg('Waiting for the host to start a movie or shared media.');return;}
    try{
      v.muted=false;
      v.volume=1;
      audioJoined=true;
      await v.play();
      ensureAudioButton();
      toastMsg('🔊 Audio joined');
    }catch(err){
      audioJoined=false;
      v.muted=false;
      ensureAudioButton();
      toastMsg('Click Join audio once more to allow browser audio.');
    }
  }

  function installAudio(){
    const b=$('#enableAudio');
    if(!b||b.dataset.fix3==='1')return;
    b.dataset.fix3='1';
    b.disabled=false;
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();joinAudio();});
  }

  function installFullscreen(){
    const tools=$('.media-tools');
    if(!tools||$('#fullscreenShared'))return;
    const b=document.createElement('button');
    b.id='fullscreenShared';
    b.type='button';
    b.textContent='⛶ Full screen shared media';
    tools.insertBefore(b,$('#mediaStatus'));
    b.addEventListener('click',async()=>{
      const v=$('#v');
      if(!v)return;
      try{
        if(document.fullscreenElement)await document.exitFullscreen();
        else if(v.requestFullscreen)await v.requestFullscreen();
        else if(v.webkitEnterFullscreen)v.webkitEnterFullscreen();
      }catch(err){toastMsg('Full screen was blocked by the browser.');}
    });
  }

  function protectVideoPlayback(){
    const v=$('#v');
    if(!v||v.dataset.fix3==='1')return;
    v.dataset.fix3='1';
    v.addEventListener('loadedmetadata',()=>{
      if(v.getAttribute('src')||v.srcObject){
        v.muted=true;
        ensureAudioButton();
      }
    });
    v.addEventListener('canplay',()=>ensureAudioButton());
    v.addEventListener('error',()=>{
      if(v.src)toastMsg('This online video could not be loaded. Try another movie.');
    });
  }

  function boot(){
    replaceChatInput();
    installAudio();
    installFullscreen();
    protectVideoPlayback();
    ensureAudioButton();
  }

  document.addEventListener('DOMContentLoaded',boot);
  setTimeout(boot,100);
  setTimeout(boot,500);
  setInterval(()=>{replaceChatInput();ensureAudioButton();},1000);
})();

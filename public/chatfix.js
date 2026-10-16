(()=>{
  const $=s=>document.querySelector(s);
  let chatSocket=null;
  const NativeSend=WebSocket.prototype.send;
  if(!WebSocket.prototype.__watchPartyChatPatched){
    WebSocket.prototype.__watchPartyChatPatched=true;
    WebSocket.prototype.send=function(data){
      try{if(this.readyState===1&&String(this.url||'').includes('/ws'))chatSocket=this}catch{}
      return NativeSend.call(this,data);
    };
  }
  function sendChat(){
    const input=$('#ci');
    if(!input)return;
    const text=String(input.value||'').trim();
    if(!text)return;
    try{
      if(chatSocket&&chatSocket.readyState===1)chatSocket.send(JSON.stringify({t:'chat',text}));
      else if(typeof tx==='function')tx({t:'chat',text});
      else throw new Error('not connected');
      input.value='';input.focus();
    }catch(err){console.error('Chat send failed',err);if(typeof toast==='function')toast('Chat is not connected. Please wait a moment and try again.')}
  }
  function install(){
    const input=$('#ci'),button=$('#cs');
    if(!input||!button)return;
    input.disabled=false;input.readOnly=false;input.removeAttribute('disabled');input.removeAttribute('readonly');input.tabIndex=0;
    input.style.pointerEvents='auto';input.style.userSelect='text';input.style.webkitUserSelect='text';
    input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopPropagation();sendChat()}};
    button.type='button';button.onclick=e=>{e.preventDefault();e.stopPropagation();sendChat()};
  }
  document.addEventListener('DOMContentLoaded',install);[100,500,1000,2000].forEach(ms=>setTimeout(install,ms));setInterval(install,1000);
})();

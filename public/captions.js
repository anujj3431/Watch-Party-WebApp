(()=>{
  const $=s=>document.querySelector(s),v=$('#v');
  if(!v)return;
  let trackEl=null,trackUrl=null,liveRecorder=null,liveTimer=null,liveBusy=false,captionOn=false;
  const catalogTracks={
    'https://media.w3.org/2010/05/sintel/trailer.mp4':'https://raw.githubusercontent.com/chrisdavidmills/html5-captions-and-subtitles-content-kit/gh-pages/demo/step4/vtt/sintel-captions-en.vtt'
  };
  function ensureUi(){
    const tools=document.querySelector('.media-tools');if(!tools||$('#captionToggle'))return;
    const b=document.createElement('button');b.id='captionToggle';b.type='button';b.textContent='CC';b.title='Toggle captions';
    const file=document.createElement('input');file.id='captionFile';file.type='file';file.accept='.vtt,.srt,text/vtt,application/x-subrip';file.hidden=true;
    const pick=document.createElement('button');pick.type='button';pick.textContent='Load captions';pick.onclick=()=>file.click();
    const live=document.createElement('button');live.id='liveCaptionToggle';live.type='button';live.textContent='Live CC';live.title='Generate live captions from the playing media';
    const status=document.createElement('span');status.id='captionStatus';status.className='mut';status.textContent='Captions: off';
    b.onclick=()=>toggle();live.onclick=()=>toggleLive();file.onchange=()=>{if(file.files?.[0])loadFile(file.files[0])};
    tools.append(b,pick,file,live,status);
  }
  function removeTrack(){if(trackEl){try{trackEl.remove()}catch{}trackEl=null}if(trackUrl){URL.revokeObjectURL(trackUrl);trackUrl=null}}
  function setTrack(url,label='English',defaultOn=true){
    removeTrack();if(!url)return;
    const t=document.createElement('track');t.kind='captions';t.label=label;t.srclang='en';t.src=url;t.default=defaultOn;v.appendChild(t);trackEl=t;
    setTimeout(()=>{if(v.textTracks[0])v.textTracks[0].mode=defaultOn?'showing':'hidden';},50);
    captionOn=defaultOn;updateStatus();
  }
  function setVttText(text,label='English'){
    removeTrack();const blob=new Blob([text],{type:'text/vtt'});trackUrl=URL.createObjectURL(blob);setTrack(trackUrl,label,true);
  }
  function srtToVtt(text){
    let out='WEBVTT\n\n';const blocks=String(text).replace(/\r/g,'').split(/\n\s*\n/);
    for(const b of blocks){const lines=b.split('\n').filter(Boolean);if(!lines.length)continue;const i=lines.findIndex(x=>x.includes('-->'));if(i<0)continue;const times=lines[i].replace(/,/g,'.');const body=lines.slice(i+1).join('\n');out+=times+'\n'+body+'\n\n'}return out;
  }
  async function loadFile(file){try{const text=await file.text();const vtt=/^\s*WEBVTT/i.test(text)?text:srtToVtt(text);setVttText(vtt,file.name);toastMsg('Captions loaded: '+file.name)}catch(err){console.error(err);toastMsg('Could not load that caption file.')}}
  function toggle(){if(!trackEl){const src=String(v.currentSrc||v.src||'').split('?')[0];const known=catalogTracks[src];if(known)setTrack(known,'English',true);else return toastMsg('No built-in captions for this video. Use Load captions or Live CC.')}else{const tt=v.textTracks[0];captionOn=!captionOn;if(tt)tt.mode=captionOn?'showing':'hidden';updateStatus()}}
  function updateStatus(){const s=$('#captionStatus');if(s)s.textContent=captionOn?'Captions: on':'Captions: off'}
  function toastMsg(x){if(typeof toast==='function')toast(x);else console.log(x)}
  async function toggleLive(){
    if(liveRecorder){stopLive();return}
    if(!window.MediaRecorder)return toastMsg('Live captions need a modern Chrome/Edge browser.');
    if(!window.WATCH_PARTY_LIVE_CAPTIONS)return toastMsg('Live captions are not configured on the room server yet.');
    let stream=null;
    try{
      if(v.srcObject)stream=v.srcObject;else if(v.captureStream)stream=v.captureStream();
      if(!stream||!stream.getAudioTracks().length)return toastMsg('This video does not expose an audio track to the browser.');
      const audio=new MediaStream(stream.getAudioTracks());
      const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(x=>MediaRecorder.isTypeSupported(x));
      liveRecorder=new MediaRecorder(audio,mime?{mimeType:mime}:undefined);
      liveRecorder.ondataavailable=e=>{if(e.data.size)sendChunk(e.data)};
      liveRecorder.onerror=e=>{console.error(e);toastMsg('Live captions recorder stopped.');stopLive()};
      liveRecorder.start(5000);$('#liveCaptionToggle').textContent='Stop Live CC';$('#captionStatus').textContent='Live captions: listening…';
    }catch(err){console.error(err);stopLive();toastMsg('Could not start live captions. '+(err.message||''))}
  }
  async function sendChunk(blob){if(liveBusy||!liveRecorder)return;liveBusy=true;try{const buf=await blob.arrayBuffer();let binary='';const bytes=new Uint8Array(buf);for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));const base64=btoa(binary);const res=await fetch((window.WATCH_PARTY_BACKEND_URL||location.origin).replace(/\/+$/,'')+'/api/transcribe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({audio:base64,mime:blob.type||'audio/webm'})});if(!res.ok)return;const data=await res.json();if(data.text&&typeof tx==='function')tx({t:'caption',text:data.text})}catch(err){console.warn('Live caption chunk failed',err)}finally{liveBusy=false}}
  function stopLive(){if(liveRecorder){try{liveRecorder.stop()}catch{}liveRecorder=null}$('#liveCaptionToggle')?.replaceChildren(document.createTextNode('Live CC'));if($('#captionStatus'))$('#captionStatus').textContent=captionOn?'Captions: on':'Captions: off'}
  window.WATCH_PARTY_LIVE_CAPTIONS=window.WATCH_PARTY_LIVE_CAPTIONS||false;
  const oldOn=window.on;
  document.addEventListener('DOMContentLoaded',()=>{ensureUi();setTimeout(ensureUi,500);v.addEventListener('emptied',()=>{removeTrack();captionOn=false;updateStatus()});v.addEventListener('loadedmetadata',()=>{const src=String(v.currentSrc||v.src||'').split('?')[0];const known=catalogTracks[src];if(known)setTrack(known,'English',true)});});
  window.addEventListener('beforeunload',stopLive);
  window.WatchPartyCaptions={setTrack,setVttText,stopLive};
  document.addEventListener('watchparty-caption',e=>{if(e.detail?.text){const line=E(e.detail.text);}});
  const NativeOn=window.on;
  window.addEventListener('message',()=>{});
  // Receive room captions through the app's WebSocket message handler by wrapping tx-independent DOM updates.
  const captionObserver=new MutationObserver(()=>{});captionObserver.observe(v,{childList:true});
})();
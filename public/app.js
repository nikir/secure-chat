let socket, cryptoKey, msgId=0, typingTimer;
if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.body.classList.add('dark');
function toggleDark(){document.body.classList.toggle('dark')}

async function deriveKey(p){
  const e=new TextEncoder();
  const b=await crypto.subtle.importKey('raw',e.encode(p),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:e.encode('secure-room'),iterations:100000,hash:'SHA-256'},b,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encrypt(t){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const enc=await crypto.subtle.encrypt({name:'AES-GCM',iv},cryptoKey,new TextEncoder().encode(t));
  return {iv:[...iv],data:[...new Uint8Array(enc)]};
}
async function decrypt(p){
  const dec=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(p.iv)},cryptoKey,new Uint8Array(p.data));
  return new TextDecoder().decode(dec);
}

async function join(){
  cryptoKey=await deriveKey(password.value);
  socket=new WebSocket(`wss://${location.host}`);
  socket.onopen=()=>{socket.send(JSON.stringify({type:'join',room:room.value}));chat.style.display='block'};
  socket.onmessage=async e=>{
    const m=JSON.parse(e.data);
    if(m.type==='typing'){typing.textContent='typing...';clearTimeout(typingTimer);typingTimer=setTimeout(()=>typing.textContent='',1200);return;}
    if(m.type==='ack'){const t=document.getElementById(m.id);if(t)t.textContent='✓✓';return;}
    const text=await decrypt(m.payload);
    showMessage(text,false);
    socket.send(JSON.stringify({type:'ack',id:m.ack}));
  };
}

function showMessage(text,mine=false,id=null){
  const d=document.createElement('div');
  d.className='msg '+(mine?'me':'other');
  d.textContent=text;
  if(mine){
    const t=document.createElement('div');
    t.className='ticks';t.id=id;t.textContent='✓';
    d.appendChild(t);
  }
  messages.appendChild(d);
  messages.scrollTop=messages.scrollHeight;
  setTimeout(()=>d.remove(),30*60*1000);
}

async function sendMsg(){
  const text=msg.value.trim();
  if(!text)return;
  const id='m'+(++msgId);
  const payload=await encrypt(text);
  socket.send(JSON.stringify({type:'message',payload,ack:id}));
  showMessage(text,true,id);
  msg.value='';
  sendBtn.disabled=true;
}

msg.addEventListener('input',()=>{
  sendBtn.disabled=!msg.value.trim();
  if(socket && msg.value.trim()) socket.send(JSON.stringify({type:'typing'}));
});
msg.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)location.reload()});

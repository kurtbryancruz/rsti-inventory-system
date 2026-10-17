const $=s=>document.querySelector(s);
const nextUrl=()=>{let n=null;try{n=sessionStorage.getItem('rsti_next');sessionStorage.removeItem('rsti_next')}catch(e){}return n&&/^\/warehouse\.html\?inventory=[A-Za-z0-9-]+$/.test(n)?n:'dashboard.html'};
fetch('/api/state').then(r=>{if(r.ok)location.replace(nextUrl())});
function showErr(m){const e=$('#err');e.textContent=m;e.classList.remove('shake');void e.offsetWidth;if(m)e.classList.add('shake')}
function busy(on){const b=$('#go');b.disabled=on}
function showPw(){const p=$('#p'),on=p.type==='password';p.type=on?'text':'password';$('#ps').textContent=on?'Hide':'Show';$('#ps').setAttribute('aria-pressed',on);$('#ps').setAttribute('aria-label',on?'Hide password':'Show password');p.focus()}
function caps(e){if(e.getModifierState)$('#caps').hidden=!e.getModifierState('CapsLock')}
async function login(e){e.preventDefault();showErr('');busy(true);
 try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:$('#u').value,pw:$('#p').value})});
  if(!r.ok){const j=await r.json().catch(()=>({}));showErr(j.error||'Wrong username or password.');busy(false);$('#p').select();return}
  location.href=nextUrl()}
 catch(x){showErr('Cannot reach the server. Check your connection and try again.');busy(false)}}

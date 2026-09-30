(()=>{const ROOT=document.currentScript.src.replace(/js\/site\.js.*$/,'');const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const nav=$('#nav'),menu=$('#mobileMenu'),mb=$('#menuBtn');
const setMenu=o=>{menu.classList.toggle('open',o);mb.classList.toggle('open',o);mb.setAttribute('aria-expanded',o);menu.inert=!o;document.body.style.overflow=o?'hidden':''};
menu.inert=true;
if(!$('script[src$="main.js"]')){const on=()=>nav.classList.toggle('scrolled',scrollY>60);addEventListener('scroll',on,{passive:true});on();
 mb.onclick=()=>setMenu(!menu.classList.contains('open'));
 }
menu.addEventListener('click',e=>{if(e.target===menu||e.target.closest('a'))setMenu(false)});
addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('open')){setMenu(false);mb.focus()}});
const money=n=>'$'+Math.round(n).toLocaleString('en-US'),usd=n=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const fv=(pv,pmt,rate,yrs)=>{const r=rate/100/12,n=Math.round(yrs*12);if(!n)return pv;const g=r?Math.pow(1+r,n):1;return pv*g+(r?pmt*(g-1)/r:pmt*n)};
/* calculators */
$$('[data-calc]').forEach(f=>{f.addEventListener('submit',e=>e.preventDefault());const v=k=>Math.max(0,parseFloat(f.elements[k].value)||0);
 const run=()=>{const yrs=f.dataset.calc==='save'?v('yrs'):Math.max(0,v('rage')-v('age')),bal=fv(v('pv'),v('pmt'),v('rate'),yrs),con=v('pv')+v('pmt')*Math.round(yrs*12);
  $('[data-o=bal]',f).textContent=money(bal);$('[data-o=con]',f).textContent=money(con);$('[data-o=int]',f).textContent=money(bal-con);window.dispatchEvent(new Event('calc'))};
 f.addEventListener('input',run);run()});
const tl=$('#timeline');if(tl){const f=$('[data-calc=ret]'),out=$('#tlOut');let y=0;const show=()=>{const v=k=>Math.max(0,parseFloat(f.elements[k].value)||0);out.textContent=money(fv(v('pv'),v('pmt'),v('rate'),y))};
 $$('[data-y]',tl).forEach(b=>b.onclick=()=>{$$('[data-y]',tl).forEach(x=>x.classList.remove('on'));b.classList.add('on');y=+b.dataset.y;show()});addEventListener('calc',show);show()}
/* filter / help search */
$$('[data-filter]').forEach(i=>{const items=$$('.res'),c=$('#hc');i.addEventListener('input',()=>{const q=i.value.trim().toLowerCase();let n=0;items.forEach(e=>{const m=!q||e.textContent.toLowerCase().includes(q);e.hidden=!m;if(m)n++});c.textContent=q?n+' result'+(n===1?'':'s'):''})});
/* API calls + account state */
const post=(path,data)=>fetch('/api'+path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data||{})}).then(async r=>{let b={};try{b=await r.json()}catch(e){}if(!r.ok)throw Object.assign(new Error(b.error||'Request failed. Please try again.'),{fields:b.fields});return b});
const IDS={login:{email:'lem',password:'lpw2'},signup:{name:'sn',email:'sem',password:'spw'},contact:{firstName:'fn',lastName:'ln',email:'em2',phone:'ph',topic:'tp',message:'ms'}};
/* newsletter */
const nf=$('#news');if(nf)nf.onsubmit=async e=>{e.preventDefault();const i=$('#em'),m=$('#newsMsg');
 if(!/^\S+@\S+\.\S+$/.test(i.value)){m.textContent='Please enter a valid email address.';return}
 try{await post('/newsletter',{email:i.value});m.textContent='Thanks — you are subscribed.';i.value=''}catch(err){m.textContent=err.message}};
/* nav: show account actions when signed in */
fetch('/api/auth/me',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(d=>{const u=d&&d.user;if(!u)return;
 const first=u.name.split(' ')[0].replace(/[<>&"]/g,''),cta=$('.nav-cta');
 if(cta)cta.innerHTML='<a class="btn ghost" href="'+ROOT+'invest/index.html#portfolio">'+first+'</a><button class="btn" type="button" data-logout>Log Out</button>';
 $$('#mobileMenu a.btn').forEach((a,i)=>{if(i)a.remove();else{a.textContent='Log Out';a.removeAttribute('href');a.setAttribute('data-logout','')}})}).catch(()=>{});
document.addEventListener('click',async e=>{if(!e.target.closest('[data-logout]'))return;e.preventDefault();try{await post('/auth/logout')}catch(x){}location.href=ROOT+'index.html'});
/* forms */
$$('form[data-form]').forEach(f=>{const note=$('.fmsg',f);const ln=$('[data-note]',f);if(ln)ln.onclick=()=>note.textContent=ln.dataset.note;
 f.addEventListener('submit',async e=>{e.preventDefault();let bad=null;
  $$('input,select,textarea',f).forEach(el=>{if(el.type==='checkbox')return;let m='';const val=el.value.trim();
   if(el.required&&!val)m='This field is required.';else if(el.type==='email'&&val&&!/^\S+@\S+\.\S+$/.test(val))m='Enter a valid email address.';
   else if(el.dataset.min&&val.length<+el.dataset.min)m='Enter at least '+el.dataset.min+' characters.';
   else if(el.dataset.match&&val!==$('#'+el.dataset.match).value)m='Passwords do not match.';
   const er=$('#e-'+el.id);if(er)er.textContent=m;el.setAttribute('aria-invalid',!!m);if(m&&!bad)bad=el});
  if(bad){bad.focus();note.textContent='Please fix the highlighted fields.';return}
  const k=f.dataset.form,btn=$('button[type=submit]',f),v=id=>$('#'+id).value.trim();btn.disabled=true;note.textContent='';
  try{
   if(k==='contact'){await post('/contact',{firstName:v('fn'),lastName:v('ln'),email:v('em2'),phone:v('ph')||undefined,topic:$('#tp').value,message:v('ms')});note.textContent='Thanks. Your message has been sent.';f.reset();return}
   await(k==='login'?post('/auth/login',{email:v('lem'),password:$('#lpw2').value,remember:f.elements.rm.checked}):post('/auth/signup',{name:v('sn'),email:v('sem'),password:$('#spw').value}));
   const nx=new URLSearchParams(location.search).get('next');
   note.textContent=(k==='login'?'Logged in':'Account created')+'. Taking you to your account…';
   setTimeout(()=>location.href=/^\/[^/\\]/.test(nx||'')?nx:ROOT+'invest/index.html',600);return
  }catch(err){
   const map=IDS[k]||{};let first=null;
   for(const key in(err.fields||{})){const id=map[key],er=id&&$('#e-'+id);if(er){er.textContent=err.fields[key];$('#'+id).setAttribute('aria-invalid',true);first=first||$('#'+id)}}
   note.textContent=err.message;if(first)first.focus()
  }finally{btn.disabled=false}})});
/* trade */
const app=$('#tradeApp');if(app){const A={};$$('.mk').forEach(b=>A[b.dataset.s]={p:+b.dataset.p,c:+b.dataset.c,n:$('b',b).firstChild.textContent.trim()});
 let sel='BTC',range='1D',H={BTC:.25,AAPL:40,NVDA:60};const N={'1D':24,'1W':28,'1M':30,'3M':36,'1Y':48};
 const series=(s,r)=>{const k=[...s].reduce((a,c)=>a+c.charCodeAt(0),0),n=N[r];return Array.from({length:n},(_,i)=>+(50+i*(A[s].c/6)+Math.sin(i*(k%7+1)*.6+r.length)*6+Math.cos(i*.9+k)*3).toFixed(2)).join(',')};
 const draw=()=>{const svg=$('#tchart');svg.dataset.chart=series(sel,range);Charts.line(svg);requestAnimationFrame(()=>Charts.draw(svg));$('#ch').textContent=A[sel].n+' ('+sel+')';$$('.mk').forEach(b=>b.classList.toggle('on',b.dataset.s===sel));$('#oa').value=sel;est()};
 const price=()=>$('#ot').value==='Limit'&&+$('#lp').value>0?+$('#lp').value:A[$('#oa').value].p;
 function est(){$('#lpw').hidden=$('#ot').value!=='Limit';$('#op').textContent=usd(price());$('#oT').textContent=usd(price()*(Math.max(0,+$('#oq').value||0)))}
 const COL=['#0A0A0A','#3d3d3d','#6b6b6b','#979797','#bdbdbd'];
 const hold=()=>{const rows=Object.entries(H).filter(([,q])=>q>0).map(([s,q])=>[s,q,q*A[s].p]),t=rows.reduce((a,r)=>a+r[2],0)||1;
  $('#hold').innerHTML=rows.map(([s,q,v])=>`<li><span>${A[s].n}<small>${s} · ${q}</small></span><b>${usd(v)}</b></li>`).join('')||'<li>No holdings yet.</li>';
  $('#hbar').innerHTML=rows.map(([s,q,v],i)=>`<i style="flex:${v/t};background:${COL[i%5]}"></i>`).join('');$('#hkey').innerHTML=rows.map(([s,q,v],i)=>`<li><i style="background:${COL[i%5]}"></i>${s}<b>${(v/t*100).toFixed(1)}%</b></li>`).join('')};
 $$('.mk').forEach(b=>b.onclick=()=>{sel=b.dataset.s;draw()});
 $('.tabs',app.parentElement)&&$$('[data-r]').forEach(b=>b.onclick=()=>{$$('[data-r]').forEach(x=>x.classList.remove('on'));b.classList.add('on');range=b.dataset.r;draw()});
 $('#oa').onchange=e=>{sel=e.target.value;draw()};['#ot','#oq','#lp'].forEach(s=>$(s).addEventListener('input',est));
 $('#ts').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();let n=0;$$('.mk').forEach(b=>{const m=!q||b.textContent.toLowerCase().includes(q);b.hidden=!m;if(m)n++});$('#tc').textContent=q?n+' asset'+(n===1?'':'s')+' found':''});
 $$('[data-side]').forEach(b=>b.onclick=e=>{e.preventDefault();const s=$('#oa').value,q=+$('#oq').value;if(!(q>0)){$('#om').textContent='Enter a quantity greater than zero.';return}
  if(b.dataset.side==='Sell'&&q>(H[s]||0)){$('#om').textContent='Demo: you only hold '+(H[s]||0)+' '+s+'.';return}
  H[s]=+((H[s]||0)+(b.dataset.side==='Buy'?q:-q)).toFixed(6);$('#om').textContent='Simulated '+b.dataset.side.toLowerCase()+': '+q+' '+s+' ≈ '+usd(price()*q)+'. Demo only. No order was placed.';hold()});
 draw();hold()}})();

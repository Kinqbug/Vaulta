/* 401(k) page: loads the signed-in user's plan from /api/retirement and wires the plan + contribution forms. */
(()=>{
const $=(s,r=document)=>r.querySelector(s);
const usd=n=>'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2});
const cash=n=>'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
async function http(method,path,data){
 const r=await fetch('/api'+path,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined});
 let b=null;try{b=await r.json()}catch(e){}
 if(!r.ok)throw Object.assign(new Error((b&&b.error)||'Request failed. Please try again.'),{status:r.status});
 return b}

const plan=$('#planForm'),contrib=$('#contribForm');

function render(d){
 const p=d.plan,pr=d.projection,l=d.limits;
 $('#rBadge').textContent='Your account';
 $('#rBal').textContent=usd(p.balance);
 $('#rEmp').textContent=usd(p.employeeMonthly)+' / mo';
 $('#rEr').textContent=usd(p.employerMonthly)+' / mo';
 $('#rAge').textContent=p.retirementAge;
 $('#rInc').textContent=usd(pr.monthlyIncome)+' / mo';
 const svg=$('#rChart');svg.dataset.chart=pr.series.join(',');Charts.line(svg);requestAnimationFrame(()=>Charts.draw(svg));
 $('#gTarget').textContent=usd(p.goal);
 $('#gMeta').textContent='Target · '+p.goalYear;
 const bar=$('#gBar');bar.dataset.w=pr.goalProgressPct;bar.style.width=pr.goalProgressPct+'%';
 $('#gText').textContent=pr.goalProgressPct+'% complete · '+usd(p.balance)+' saved';
 for(const k of ['currentAge','retirementAge','employeeMonthly','employerMonthly','goal','goalYear'])if(document.activeElement!==plan.elements[k])plan.elements[k].value=p[k];
 $('#limitNote').textContent='You can add up to '+usd(l.remainingThisYear)+' more this year (annual limit '+usd(l.annual)+').';
 $('#contribList').innerHTML=d.contributions.map(c=>`<li><span>Contribution<small>${c.id} · ${c.date}</small></span><b>${usd(c.amount)}</b></li>`).join('')||'<li><span>No contributions yet.</span></li>';
 /* feed the calculator below with the real plan */
 const calc=$('[data-calc=ret]');
 if(calc){const set=(k,v)=>calc.elements[k].value=v;set('age',p.currentAge);set('rage',p.retirementAge);set('pv',p.balance);set('pmt',p.employeeMonthly+p.employerMonthly);calc.dispatchEvent(new Event('input',{bubbles:true}))}
}

function signedOut(){$('#rGate').hidden=false;$('#manage').hidden=true}

async function load(){
 try{
  const [d,pf]=await Promise.all([http('GET','/retirement'),http('GET','/portfolio')]);
  $('#manage').hidden=false;$('#cBal').textContent=cash(pf.balance);render(d);
 }catch(e){if(e.status===401)signedOut();else{$('#rBadge').textContent='Could not load';console.error(e)}}
}

const num=(f,k)=>f.elements[k].value===''?undefined:Number(f.elements[k].value);

plan.addEventListener('submit',async e=>{e.preventDefault();const m=$('#planMsg'),b=$('button',plan);b.disabled=true;m.textContent='';
 try{
  const body={};for(const k of ['currentAge','retirementAge','employeeMonthly','employerMonthly','goal','goalYear'])body[k]=num(plan,k);
  render(await http('PUT','/retirement',body));m.textContent='Plan saved.';
 }catch(err){m.textContent=err.message}
 b.disabled=false});

contrib.addEventListener('submit',async e=>{e.preventDefault();const m=$('#contribMsg'),b=$('button',contrib);m.textContent='';
 const amount=num(contrib,'amount');if(!(amount>0)){m.textContent='Enter an amount greater than zero.';return}
 b.disabled=true;
 try{
  const d=await http('POST','/retirement/contributions',{amount});
  $('#cBal').textContent=cash(d.cashBalance);render(d);contrib.elements.amount.value='';m.textContent='Contribution added.';
 }catch(err){m.textContent=err.message}
 b.disabled=false});

load();
})();

/* VAULTA data layer: talks to the Next.js API (/api/*). Session is an httpOnly cookie set by the server. */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const fmt=n=>'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const signed=n=>(n<0?'−':'+')+fmt(Math.abs(n)),pct=n=>(n<0?'−':'+')+Math.abs(n).toFixed(2)+'%';
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const ser=(k,r)=>Array.from({length:12},(_,i)=>+(100+r*i/11+Math.sin(i*k)*Math.abs(r)*.12).toFixed(2));
const withSeries=d=>({...d,series:ser(d.id.length,d.ret)});
let DATA=[];
const EMPTY={user:null,balance:0,totals:{invested:0,value:0,ret:0,pct:0},alloc:[],txns:[]};
let S={...EMPTY};
const totals=()=>S.totals;
const alloc=()=>S.alloc;
const COL=['#0A0A0A','#3d3d3d','#6b6b6b','#979797','#bdbdbd','#dedede'];
const allocBar=a=>a.map((x,i)=>`<i style="flex:${x.p};background:${COL[i%6]}" title="${x.k}"></i>`).join('');
const allocKey=a=>a.map((x,i)=>`<li><i style="background:${COL[i%6]}"></i>${x.k}<b>${x.p.toFixed(1)}%</b></li>`).join('');

async function http(method,path,data){
 const r=await fetch('/api'+path,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined});
 let b=null;try{b=await r.json()}catch(e){}
 if(!r.ok)throw Object.assign(new Error((b&&b.error)||'Request failed. Please try again.'),{status:r.status,fields:b&&b.fields});
 return b}

const api={
 async list(){if(/[?&]error/.test(location.search))throw new Error('Failed');DATA=(await http('GET','/investments')).investments.map(withSeries);return DATA},
 async get(id){return DATA.find(d=>d.id===id)||withSeries((await http('GET','/investments/'+encodeURIComponent(id))).investment)},
 /** Reloads account state. Signed-out visitors get the empty state. */
 async refresh(){try{S=await http('GET','/portfolio')}catch(e){if(e.status!==401)throw e;S={...EMPTY}}return S},
 async order(d,amount){const r=await http('POST','/orders',{investmentId:d.id,amount});await api.refresh();return r.order},
 async addFunds(n){await http('POST','/funds',{amount:n});await api.refresh()}
};

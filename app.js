const DAYS=[["Maandag",23],["Dinsdag",24],["Woensdag",25],["Donderdag",26],["Vrijdag",27],["Zaterdag",28],["Zondag",29]];let sights=[],prefs=JSON.parse(localStorage.getItem("l4prefs")||"{}"),plans=JSON.parse(localStorage.getItem("l4plans")||"{}"),day=1;
function removeCrossDayDuplicates(){
  const seen=new Set();
  Object.keys(plans).sort((a,b)=>Number(a)-Number(b)).forEach(d=>{
    const kept=[];
    (plans[d]||[]).forEach(e=>{
      if(!e.sightId){kept.push(e);return;}
      if(seen.has(e.sightId))return;
      seen.add(e.sightId);kept.push(e);
    });
    plans[d]=kept;
  });
}
const $=s=>document.querySelector(s),esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function pref(id){return prefs[id]||"maybe"}function save(){localStorage.setItem("l4prefs",JSON.stringify(prefs));localStorage.setItem("l4plans",JSON.stringify(plans))}
function route(a,b,m){return `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lng}&destination=${b.lat},${b.lng}&travelmode=${m}`}
function travel(a,b){return `<div class="travel"><b>Reis naar ${esc(b.name)}</b><div class="modes"><a href="${route(a,b,'walking')}" target="_blank">🚶 Lopend · actuele tijd in Maps ↗</a><a href="${route(a,b,'driving')}" target="_blank">🚕 Taxi · actuele tijd in Maps ↗</a><a href="${route(a,b,'transit')}" target="_blank">🚇 OV · actuele tijd in Maps ↗</a></div><small>Google Maps berekent de actuele reistijd; de app verzint geen minuten.</small></div>`}
function renderDays(){$("#days").innerHTML=DAYS.map((d,i)=>`<button class="day ${i===day?'active':''}" data-d="${i}">${d[0].slice(0,2)} ${d[1]}</button>`).join("");document.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{day=+b.dataset.d;renderPlanner()});$("#daytitle").textContent=`${DAYS[day][0]} ${DAYS[day][1]} november`}
function renderPlanner(){
  renderDays();
  let es=(plans[day]||[]).slice().sort((a,b)=>a.order-b.order),h="";
  if(day===0)h+='<div class="event">Aankomst 18.00 uur · inchecken en rustig eten</div>';
  es.forEach((e,i)=>{
    h+=`<div class="event"><b>${esc(e.name)}</b><button onclick="removeEvent('${e.id}')">×</button></div>`;
    let n=es[i+1],a=sights.find(s=>s.id===e.sightId),b=n&&sights.find(s=>s.id===n.sightId);
    if(a&&b)h+=travel(a,b);
  });
  $("#schedule").innerHTML=h||"<p>Nog niets ingepland. Markeer plekken als Ja en maak een weekvoorstel.</p>";
  renderDayMap(es);
}
function renderDayMap(es){
  const box=$("#daymap"),legend=$("#maplegend");
  if(!box||!legend)return;
  const points=es.map(e=>sights.find(s=>s.id===e.sightId)).filter(Boolean);
  if(!points.length){box.innerHTML='<p class="map-empty">Er staan nog geen bezienswaardigheden op deze dag.</p>';legend.innerHTML="";return;}
  const minLat=Math.min(...points.map(s=>s.lat)),maxLat=Math.max(...points.map(s=>s.lat));
  const minLng=Math.min(...points.map(s=>s.lng)),maxLng=Math.max(...points.map(s=>s.lng));
  const padLat=Math.max((maxLat-minLat)*.18,.002),padLng=Math.max((maxLng-minLng)*.18,.002);
  const W=760,H=330,L=55,R=55,T=38,B=38;
  const x=s=>L+(s.lng-(minLng-padLng))/((maxLng-minLng)+2*padLng)*(W-L-R);
  const y=s=>H-B-(s.lat-(minLat-padLat))/((maxLat-minLat)+2*padLat)*(H-T-B);
  const coords=points.map(s=>`${x(s)},${y(s)}`).join(" ");
  const dots=points.map((s,i)=>`<g><circle cx="${x(s)}" cy="${y(s)}" r="14" fill="#174b46" stroke="white" stroke-width="3"/><text x="${x(s)}" y="${y(s)+5}" text-anchor="middle" font-size="12" font-weight="700" fill="white">${i+1}</text></g>`).join("");
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Schematische kaart met de bezienswaardigheden van deze dag"><rect width="${W}" height="${H}" rx="12" fill="#edf2ec"/><path d="M0 250 Q180 205 330 250 T760 220" fill="none" stroke="#d4e3df" stroke-width="26"/><path d="M0 250 Q180 205 330 250 T760 220" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="7 8"/><polyline points="${coords}" fill="none" stroke="#e77c5c" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="7 6"/>${dots}<text x="18" y="22" fill="#63776d" font-size="11">Schematische ligging · noord boven</text></svg>`;
  legend.innerHTML=points.map((s,i)=>`<div><b>${i+1}</b> ${esc(s.name)} <small>(${esc(s.area)})</small></div>`).join("");
}
function card(s){let p=pref(s.id);return `<article class="card"><img loading="lazy" src="${esc(s.photo)}" alt="${esc(s.name)}" onerror="this.style.display='none'"><div class="body"><span class="tag">${esc(s.area)} · ${s.minutes} min</span><h3>${s.icon} ${esc(s.name)}</h3><p>${esc(s.description)}</p><div class="actions"><a href="${esc(s.website)}" target="_blank">Website ↗</a><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name+' Lisboa')}" target="_blank">Kaart ↗</a><button onclick="add('${s.id}')">＋ Plan</button></div><div class="prefs"><button class="${p==='yes'?'selected':''}" onclick="setPref('${s.id}','yes')">✓ Ja</button><button class="maybe ${p==='maybe'?'selected':''}" onclick="setPref('${s.id}','maybe')">? Misschien</button><button class="no ${p==='no'?'selected':''}" onclick="setPref('${s.id}','no')">✕ Nee</button></div></div></article>`}
function renderDiscover(){let q=$("#search").value.toLowerCase();let list=sights.filter(s=>(s.name+" "+s.area).toLowerCase().includes(q));$("#cards").innerHTML=list.map(card).join("");let c={yes:0,maybe:0,no:0};sights.forEach(s=>c[pref(s.id)]++);$("#stats").textContent=`${c.yes} Ja · ${c.maybe} Misschien · ${c.no} Nee`}
function setPref(id,p){prefs[id]=p;save();renderDiscover()}
function add(id){
  let s=sights.find(x=>x.id===id);if(!s)return;
  const already=Object.entries(plans).find(([d,arr])=>(arr||[]).some(e=>e.sightId===id));
  if(already){toast(`Deze bezienswaardigheid staat al op ${DAYS[Number(already[0])][0]}.`);return;}
  plans[day]=plans[day]||[];
  plans[day].push({id:crypto.randomUUID(),sightId:id,name:s.name,order:plans[day].length});
  save();renderPlanner();toast("Toegevoegd aan deze dag");
}
function removeEvent(id){plans[day]=(plans[day]||[]).filter(x=>x.id!==id);save();renderPlanner()}
function replan(){let current=plans[day]||[],ids=new Set(Object.values(plans).flat().map(e=>e.sightId).filter(Boolean));let areas=new Set(current.map(e=>sights.find(s=>s.id===e.sightId)?.area));let candidates=sights.filter(s=>pref(s.id)!=="no"&&!ids.has(s.id)&&(pref(s.id)==="yes"||areas.has(s.area)));$("#suggestions").innerHTML=candidates.map(s=>`<label style="display:block;padding:7px"><input type="checkbox" value="${s.id}" ${pref(s.id)==="yes"?"checked":""}> ${s.icon} ${esc(s.name)} · ${esc(s.area)} (${pref(s.id)})</label>`).join("")||"Geen passende extra suggesties. Geef meer plekken de keuze Ja of Misschien.";$("#proposal").showModal()}
$("#replan").onclick=replan;$("#accept").onclick=()=>{let ids=[...$("#suggestions").querySelectorAll("input:checked")].map(x=>x.value);ids.forEach(id=>{let s=sights.find(x=>x.id===id);add(id)});$("#proposal").close()};
$("#weekplan").onclick=()=>{let chosen=sights.filter(s=>pref(s.id)==="yes");if(!chosen.length){alert("Markeer eerst bezienswaardigheden als Ja.");return}if(!confirm("Weekvoorstel maken op basis van Ja-keuzes?"))return;plans={};chosen.forEach((s,i)=>{let d=Math.min(5,Math.floor(i/4)+1);plans[d]=plans[d]||[];plans[d].push({id:crypto.randomUUID(),sightId:s.id,name:s.name,order:i%4})});save();day=1;renderPlanner()};
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".view").forEach(v=>v.hidden=v.id!==b.dataset.tab)});
$("#search").oninput=renderDiscover;
$("#export").onclick=()=>{let txt=DAYS.map((d,i)=>d.join(" ")+ "\\n"+(plans[i]||[]).map(e=>"- "+e.name).join("\\n")).join("\\n\\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt]));a.download="lissabon-planning.txt";a.click()};
function toast(t){$("#toast").textContent=t;$("#toast").classList.add("show");setTimeout(()=>$("#toast").classList.remove("show"),1800)}
const foods=[["Time Out Market","Cais do Sodré","https://www.timeoutmarket.com/lisboa/"],["Pastéis de Belém","Belém","https://pasteisdebelem.pt/"],["Mercado de Campo de Ourique","Campo de Ourique","https://www.mercadodecampodeourique.pt/"]];
function init(){removeCrossDayDuplicates();save();fetch("attractions.json").then(r=>r.json()).then(d=>{sights=d;renderDiscover();$("#guidecards").innerHTML=sights.map(card).join("");$("#foodcards").innerHTML=foods.map(f=>`<article class="card"><div class="body"><h3>${f[0]}</h3><p>${f[1]}</p><a href="${f[2]}" target="_blank">Website ↗</a></div></article>`).join("");renderPlanner()})}
init();if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");
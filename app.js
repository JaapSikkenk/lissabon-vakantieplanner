const DAYS = [
  {date:"2026-11-23",name:"Maandag",short:"MA",day:23},
  {date:"2026-11-24",name:"Dinsdag",short:"DI",day:24},
  {date:"2026-11-25",name:"Woensdag",short:"WO",day:25},
  {date:"2026-11-26",name:"Donderdag",short:"DO",day:26},
  {date:"2026-11-27",name:"Vrijdag",short:"VR",day:27},
  {date:"2026-11-28",name:"Zaterdag",short:"ZA",day:28},
  {date:"2026-11-29",name:"Zondag",short:"ZO",day:29}
];
const START=8*60, END=23*60, STEP=30;
let sights=[], plans={}, selectedDay=0, selectedCategory="Alles", pendingSight=null, deferredInstall=null, map=null, mapMarkers=[], mapLine=null;
const $=s=>document.querySelector(s);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const timeLabel=m=>`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
const allEvents=()=>Object.values(plans).flat();
const plannedSightIds=()=>new Set(allEvents().filter(e=>e.sightId).map(e=>e.sightId));
function load(){try{plans=JSON.parse(localStorage.getItem("lisboa-plans")||"{}")}catch{plans={}}}
function save(){localStorage.setItem("lisboa-plans",JSON.stringify(plans));render()}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function slots(){let a=[];for(let m=START;m<END;m+=STEP)a.push(m);return a}
function dayOptions(sel){return DAYS.map((d,i)=>`<option value="${i}" ${i===sel?"selected":""}>${d.name} ${d.day} november</option>`).join("")}
function timeOptions(sel=9*60){return slots().map(m=>`<option value="${m}" ${m===sel?"selected":""}>${timeLabel(m)}</option>`).join("")}
function init(){
  load();
  fetch("attractions.json").then(r=>r.json()).then(data=>{sights=data;$("#sightTotal").textContent=`${sights.length} plekken`;render()}).catch(()=>toast("Bezienswaardigheden konden niet worden geladen."));
  $("#dialogDay").innerHTML=dayOptions(0);$("#dialogTime").innerHTML=timeOptions(9*60);
  $("#customDay").innerHTML=dayOptions(0);$("#customTime").innerHTML=timeOptions(9*60);
  renderDays();renderTimeline();wire();
}
function renderDays(){
  $("#dayPicker").innerHTML=DAYS.map((d,i)=>`<button class="day-btn ${i===selectedDay?"active":""}" data-day="${i}"><strong>${d.day}</strong><small>${d.short}</small></button>`).join("");
  $("#dayPicker").querySelectorAll("button").forEach(b=>b.onclick=()=>{selectedDay=+b.dataset.day;render()});
  $("#selectedDayTitle").textContent=`${DAYS[selectedDay].name} ${DAYS[selectedDay].day} november`;
}
function renderTimeline(){
  const events=(plans[selectedDay]||[]).slice().sort((a,b)=>a.start-b.start);
  const total=events.reduce((n,e)=>n+e.duration,0);
  const sightEvents=events.filter(e=>e.sightId);
  const routeByEvent=new Map();
  for(let i=0;i<events.length;i++){
    const current=events[i];
    if(!current.sightId) continue;
    const next=events.slice(i+1).find(e=>e.sightId);
    if(next) routeByEvent.set(current.id, travelHtml(current,next));
  }
  const travelTotal=[...routeByEvent.values()].length;
  const travelNote=travelTotal?` · ${travelTotal} verplaatsingen` : '';
  $("#dayStats").textContent=events.length?`${events.length} activiteiten · ${Math.floor(total/60)} uur ${total%60?total%60+" min":""} ingepland${travelNote}`:"Nog niets gepland";
  const html=slots().map(m=>{
    const at=events.filter(e=>e.start===m);
    return `<div class="slot" data-time="${m}"><div class="slot-time">${timeLabel(m)}</div><div class="slot-drop">${at.map(e=>eventHtml(e)+(routeByEvent.has(e.id)?routeByEvent.get(e.id):"")).join("")}</div></div>`;
  }).join("");
  $("#timeline").innerHTML=html;
  $("#timeline").querySelectorAll(".slot").forEach(slot=>{
    slot.addEventListener("dragover",e=>{e.preventDefault();slot.classList.add("drop-target")});
    slot.addEventListener("dragleave",()=>slot.classList.remove("drop-target"));
    slot.addEventListener("drop",e=>{e.preventDefault();slot.classList.remove("drop-target");const id=e.dataTransfer.getData("text/plain");moveEvent(id,+slot.dataset.time,selectedDay)});
    slot.addEventListener("click",e=>{if(e.target===slot||e.target.classList.contains("slot-drop")){openAddAt(+slot.dataset.time)}});
  });
  $("#timeline").querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>removeEvent(b.dataset.delete));
  $("#timeline").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editEvent(b.dataset.edit));
  $("#timeline").querySelectorAll(".slot-event[draggable=true]").forEach(el=>el.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",el.dataset.event)));
}
function travelHtml(from,to){
  const a=sights.find(s=>s.id===from.sightId), b=sights.find(s=>s.id===to.sightId);
  if(!a||!b||!Number.isFinite(a.lat)||!Number.isFinite(b.lat)) return "";
  const origin=`${a.lat},${a.lng}`, destination=`${b.lat},${b.lng}`;
  const link=mode=>`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${mode}`;
  return `<div class="travel-options"><div class="travel-heading">Naar ${escapeHtml(b.name)} <small>Bekijk actuele reistijd en route</small></div><div class="travel-links"><a href="${link("walking")}" target="_blank" rel="noopener">🚶 Lopend ↗</a><a href="${link("driving")}" target="_blank" rel="noopener">🚕 Taxi ↗</a><a href="${link("transit")}" target="_blank" rel="noopener">🚇 OV ↗</a></div></div>`;
}

function eventHtml(e){
  return `<div class="slot-event ${e.custom?"custom":""}" style="min-height:${Math.max(32,e.duration/30*38-4)}px" draggable="true" data-event="${e.id}">
    <div class="event-info"><b>${escapeHtml(e.name)}</b><small>${timeLabel(e.start)} – ${timeLabel(e.start+e.duration)} · ${e.duration>=60?`${e.duration/60} uur`:`${e.duration} min`}</small></div>
    <div class="event-actions"><button data-edit="${e.id}" aria-label="Verplaatsen">↗</button><button data-delete="${e.id}" aria-label="Verwijderen">×</button></div>
  </div>`;
}
function renderSights(){
  const q=$("#searchInput").value.toLowerCase();
  const filtered=sights.filter(s=>(selectedCategory==="Alles"||s.area===selectedCategory)&&(`${s.name} ${s.area} ${s.description}`).toLowerCase().includes(q));
  $("#sightList").innerHTML=filtered.map(s=>`<article class="sight-card">
    <div class="sight-top"><span class="sight-icon">${s.icon}</span><span class="category-tag">${escapeHtml(s.area)}</span></div>
    <h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.description)}</p>
    <div class="sight-bottom"><span class="duration">◷ ${s.minutes>=60?`${s.minutes/60} uur`:`${s.minutes} min`}</span>
      <div class="card-actions"><button onclick="mapSearch('${encodeURIComponent(s.name+" Lisbon")}')">Kaart ↗</button><button class="add-btn" onclick="scheduleSight('${s.id}')">＋ Plan</button></div>
    </div></article>`).join("")||`<p class="empty">Geen plekken gevonden.</p>`;
  const cats=["Alles",...new Set(sights.map(s=>s.area))];
  $("#categoryFilters").innerHTML=cats.map(c=>`<button class="filter ${c===selectedCategory?"active":""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");
  $("#categoryFilters").querySelectorAll("button").forEach(b=>b.onclick=()=>{selectedCategory=b.dataset.cat;renderSights()});
  const planned=plannedSightIds(), remaining=sights.filter(s=>!planned.has(s.id));
  $("#remainingCount").textContent=remaining.length;
  $("#unplannedList").innerHTML=remaining.length?remaining.map(s=>`<div class="unplanned-item"><span>${s.icon} ${escapeHtml(s.name)}</span><button onclick="scheduleSight('${s.id}')">＋</button></div>`).join(""):`<p class="empty">Alles ingepland. Lekker bezig!</p>`;
}
function render(){renderDays();renderTimeline();renderSights()}
function mapSearch(q){window.open(`https://www.google.com/maps/search/?api=1&query=${q}`,"_blank","noopener")}
function scheduleSight(id){
  const s=sights.find(x=>x.id===id);if(!s)return;
  pendingSight=s;$("#dialogTitle").textContent=s.name;$("#dialogDuration").textContent=`Geschatte bezoektijd: ${s.minutes} minuten. De tijdsduur is aanpasbaar door de activiteit later te verplaatsen of te verwijderen; dit is een eerste richtlijn.`;
  $("#dialogDay").value=selectedDay;$("#dialogTime").value=nextFreeTime(selectedDay,s.minutes);
  $("#scheduleDialog").showModal();
}
function nextFreeTime(day,duration){
  const used=plans[day]||[];
  for(let t=9*60;t+duration<=END;t+=30)if(!used.some(e=>t<e.start+e.duration&&t+duration>e.start))return t;
  return 9*60;
}
function addEvent(event,day){
  const arr=plans[day]||[];
  if(event.start<START||event.start+event.duration>END){toast("Kies een tijd tussen 08:00 en 23:00.");return false}
  if(arr.some(e=>event.start<e.start+e.duration&&event.start+event.duration>e.start)){toast("Dit tijdstip overlapt met een andere activiteit.");return false}
  arr.push(event);plans[day]=arr;selectedDay=day;save();return true;
}
function openAddAt(time){$("#dialogDay").value=selectedDay;$("#dialogTime").value=time;$("#searchInput").focus({preventScroll:true});}
function moveEvent(id,start,day){
  let found=null,oldDay=null;
  for(const [d,arr] of Object.entries(plans)){const idx=arr.findIndex(e=>e.id===id);if(idx>=0){found=arr.splice(idx,1)[0];oldDay=+d;break}}
  if(!found)return;
  found.start=Math.floor(start/30)*30;
  const arr=plans[day]||[];
  if(found.start<START||found.start+found.duration>END||arr.some(e=>found.start<e.start+e.duration&&found.start+found.duration>e.start)){
    (plans[oldDay]|| (plans[oldDay]=[])).push(found);toast("Verplaatsen lukt niet: tijdslot bezet.");render();return;
  }
  plans[day]=arr;arr.push(found);selectedDay=day;save();
}
function removeEvent(id){for(const arr of Object.values(plans)){const i=arr.findIndex(e=>e.id===id);if(i>=0){arr.splice(i,1);break}}save();toast("Activiteit verwijderd.")}
function editEvent(id){
  let ev,day;for(const [d,a] of Object.entries(plans)){ev=a.find(e=>e.id===id);if(ev){day=+d;break}}
  if(!ev)return;pendingSight={editId:id,name:ev.name,minutes:ev.duration};
  $("#dialogTitle").textContent="Verplaats activiteit";$("#dialogDuration").textContent=`${ev.name} · ${ev.duration} minuten`;
  $("#dialogDay").value=day;$("#dialogTime").value=ev.start;$("#scheduleDialog").showModal();
}

function dayEvents(day){return (plans[day]||[]).slice().sort((a,b)=>a.start-b.start)}
function buildAutoPlan(){
  // Arrival evening remains light; the five full days are grouped by nearby districts.
  const groups=[
    {day:1,areas:["Baixa","Chiado","Bairro Alto","Cais do Sodré"]},
    {day:2,areas:["Alfama","Graça"]},
    {day:3,areas:["Belém","Alcântara"]},
    {day:4,areas:["Avenidas Novas","Centrum","Benfica"]},
    {day:5,areas:["Parque das Nações","Oost-Lissabon"]}
  ];
  const next={0:[{id:crypto.randomUUID(),name:"Aankomst om 18.00 uur · inchecken en rustig eten",start:18*60,duration:180,custom:true,generated:true}]};
  groups.forEach(({day,areas})=>{
    let t=9*60+30, events=[], lunchDone=false;
    const list=sights.filter(s=>areas.includes(s.area));
    const roundSlot=m=>Math.ceil(m/30)*30;
    for(const sight of list){
      if(!lunchDone && t>=12*60+30){
        const lunchStart=roundSlot(t);events.push({id:crypto.randomUUID(),name:"Lunch / pauze",start:lunchStart,duration:60,custom:true,generated:true});t=lunchStart+60;lunchDone=true;
      }
      const start=roundSlot(t);
      if(start+sight.minutes>20*60) break;
      events.push({id:crypto.randomUUID(),sightId:sight.id,name:sight.name,start,duration:sight.minutes,custom:false,generated:true});
      t=roundSlot(start+sight.minutes);
      if(!lunchDone && t>=12*60+30){events.push({id:crypto.randomUUID(),name:"Lunch / pauze",start:t,duration:60,custom:true,generated:true});t+=60;lunchDone=true;}
    }
    next[day]=events;
  });
  // Friday onward stays flexible because the second hotel and departure time are not known yet.
  next[6]=[];
  return next;
}
function makeAutoPlan(){
  if(!sights.length){toast("De bezienswaardigheden worden nog geladen.");return;}
  if(!confirm("Een nieuw voorstel maken? Dit vervangt de huidige weekplanning. Maandagavond blijft licht en zondag blijft vrij; je kunt alles daarna aanpassen."))return;
  plans=buildAutoPlan();selectedDay=0;save();toast("Je dagvoorstel is klaar. Pas het gerust aan!");
}

function renderMap(){
  const select=$("#mapDaySelect");
  if(!select)return;
  const previous=select.value||"all";
  select.innerHTML='<option value="all">Alle bezienswaardigheden</option>'+DAYS.map((d,i)=>`<option value="${i}">${d.name} ${d.day} november</option>`).join("");
  select.value=previous;
  if(!window.L){$("#mapSummary").textContent="De kaartbibliotheek kon niet laden. Controleer je internetverbinding en ververs de app.";return;}
  if(!map){map=L.map("lisbonMap").setView([38.7223,-9.1393],12);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);}
  mapMarkers.forEach(m=>map.removeLayer(m));mapMarkers=[];if(mapLine){map.removeLayer(mapLine);mapLine=null;}
  const val=select.value, day=val==="all"?null:+val;
  const dayIds=new Set(day===null?[]:dayEvents(day).filter(e=>e.sightId).map(e=>e.sightId));
  const plannedOrder=day===null?[]:dayEvents(day).filter(e=>e.sightId).map(e=>sights.find(s=>s.id===e.sightId)).filter(Boolean);
  const shown=sights.filter(s=>day===null||dayIds.has(s.id));
  shown.forEach(s=>{
    const planned=dayIds.has(s.id), marker=L.marker([s.lat,s.lng]).addTo(map);
    marker.bindPopup(`<strong>${escapeHtml(s.name)}</strong><br>${escapeHtml(s.area)} · ${s.minutes} min${planned?"<br><b>In dagplanning</b>":""}<br><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}">Open in Google Maps ↗</a>`);
    mapMarkers.push(marker);
  });
  if(plannedOrder.length>1){mapLine=L.polyline(plannedOrder.map(s=>[s.lat,s.lng]),{color:"#174b46",weight:4,opacity:.75,dashArray:"7 7"}).addTo(map);}
  if(shown.length){const bounds=L.latLngBounds(shown.map(s=>[s.lat,s.lng]));map.fitBounds(bounds.pad(.12));}
  const routeBtn=$("#openRouteBtn");routeBtn.disabled=!plannedOrder.length;
  routeBtn.onclick=()=>{if(!plannedOrder.length)return;const origin=plannedOrder[0],dest=plannedOrder[plannedOrder.length-1],waypoints=plannedOrder.slice(1,-1).map(s=>`${s.lat},${s.lng}`).join("|");const url=`https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&travelmode=walking${waypoints?`&waypoints=${encodeURIComponent(waypoints)}`:""}`;window.open(url,"_blank","noopener");};
  $("#mapSummary").textContent=day===null?`${sights.length} bezienswaardigheden op de kaart. Kies een dag om alleen de ingeplande stops en hun volgorde te bekijken.`:plannedOrder.length?`${DAYS[day].name} ${DAYS[day].day} november: ${plannedOrder.length} ingeplande locaties. De stippellijn verbindt de stops in je geplande volgorde.`:`${DAYS[day].name} ${DAYS[day].day} november: nog geen bezienswaardigheden ingepland.`;
  setTimeout(()=>map.invalidateSize(),100);
}

function wire(){
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));$("#plannerView").hidden=b.dataset.tab!=="planner";$("#discoverView").hidden=b.dataset.tab!=="discover";$("#mapView").hidden=b.dataset.tab!=="map";if(b.dataset.tab==="map")renderMap();});
  $("#searchInput").oninput=renderSights;
  $("#confirmSchedule").onclick=e=>{
    e.preventDefault();if(!pendingSight)return;
    const day=+$("#dialogDay").value,start=+$("#dialogTime").value;
    if(pendingSight.editId){
      const id=pendingSight.editId;let ev,oldDay;
      for(const [d,a] of Object.entries(plans)){ev=a.find(x=>x.id===id);if(ev){oldDay=+d;break}}
      if(!ev)return;const copy={...ev,start};plans[oldDay]=plans[oldDay].filter(x=>x.id!==id);
      if(!addEvent(copy,day)){plans[oldDay].push(ev);render();return}
    }else{
      const ok=addEvent({id:crypto.randomUUID(),sightId:pendingSight.id,name:pendingSight.name,start,duration:pendingSight.minutes,custom:false},day);
      if(!ok)return;
    }
    $("#scheduleDialog").close();pendingSight=null;toast("Toegevoegd aan je planning.");
  };
  $("#autoPlanBtn").onclick=makeAutoPlan;
  $("#mapDaySelect").onchange=renderMap;
  $("#addCustomBtn").onclick=()=>{$("#customDay").value=selectedDay;$("#customTime").value=nextFreeTime(selectedDay,60);$("#customDialog").showModal()};
  $("#saveCustom").onclick=e=>{e.preventDefault();const name=$("#customName").value.trim();if(!name)return;const duration=+$("#customDuration").value,day=+$("#customDay").value,start=+$("#customTime").value;if(addEvent({id:crypto.randomUUID(),name,start,duration,custom:true},day)){$("#customDialog").close();$("#customName").value="";toast("Eigen activiteit toegevoegd.")}};
  $("#clearDayBtn").onclick=()=>{if(confirm(`Alle activiteiten van ${DAYS[selectedDay].name} verwijderen?`)){plans[selectedDay]=[];save()}};
  $("#exportBtn").onclick=()=>{const data=DAYS.map((d,i)=>`${d.name} ${d.day} november\n${(plans[i]||[]).sort((a,b)=>a.start-b.start).map(e=>`${timeLabel(e.start)}–${timeLabel(e.start+e.duration)}  ${e.name}`).join("\n")||"Nog niets gepland"}`).join("\n\n");const blob=new Blob([data],{type:"text/plain;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="lissabon-planning.txt";a.click();URL.revokeObjectURL(a.href)};
  if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("#installBtn").hidden=false});
  $("#installBtn").onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("#installBtn").hidden=true};
}
init();
window.scheduleSight=scheduleSight;window.mapSearch=mapSearch;

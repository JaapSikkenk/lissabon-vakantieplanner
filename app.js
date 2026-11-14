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
let sights=[], plans={}, selectedDay=0, selectedCategory="Alles", pendingSight=null, deferredInstall=null;
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
  $("#dayStats").textContent=events.length?`${events.length} activiteiten · ${Math.floor(total/60)} uur ${total%60?total%60+" min":""} ingepland`:"Nog niets gepland";
  const html=slots().map(m=>{
    const at=events.filter(e=>e.start===m);
    return `<div class="slot" data-time="${m}"><div class="slot-time">${timeLabel(m)}</div><div class="slot-drop">${at.map(e=>eventHtml(e)).join("")}</div></div>`;
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
function wire(){
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));$("#plannerView").hidden=b.dataset.tab!=="planner";$("#discoverView").hidden=b.dataset.tab!=="discover";});
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

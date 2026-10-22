(() => {
  "use strict";
  const SAVE_KEY = "continent-life-save-v1";
  const ARCHIVE_KEY = "continent-life-archive-v1";
  const $ = (id) => document.getElementById(id);
  const sections = ["landing", "creation", "game", "records", "ending"];
  const statMeta = [
    ["strength","근력","근접 전투와 육체노동"],["agility","민첩","회피와 손재주"],["intelligence","지능","학문과 마법 이해"],
    ["wisdom","지혜","판단과 통찰"],["charm","매력","교섭과 인간관계"],["luck","행운","예상 밖의 기회"]
  ];
  const origins = {
    commoner:{label:"평민",gold:20,stats:{strength:1,agility:0,intelligence:0,wisdom:1,charm:0,luck:0},desc:"평범하지만 단단한 시작. 삶은 이제부터입니다."},
    merchant:{label:"상인 가문",gold:65,stats:{strength:0,agility:0,intelligence:1,wisdom:0,charm:2,luck:0},desc:"가문의 작은 자본과 사람을 읽는 감각을 물려받았습니다."},
    noble:{label:"몰락 귀족",gold:35,stats:{strength:0,agility:0,intelligence:1,wisdom:1,charm:1,luck:0},desc:"오래된 이름과 희미한 교육의 흔적이 남아 있습니다."},
    orphan:{label:"고아",gold:8,stats:{strength:0,agility:2,intelligence:0,wisdom:1,charm:0,luck:1},desc:"기댈 곳은 적지만, 거리에서 배운 생존 감각이 있습니다."}
  };
  const backgrounds = {village:"변경의 작은 마을",capital:"왕도 외곽",frontier:"위험한 국경지대"};
  let life = null;
  let toastTimer = null;

  function showSection(name) { sections.forEach(s => $(s).classList.toggle("hidden", s !== name)); window.scrollTo({top:0,behavior:"smooth"}); }
  function toast(message) { const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2300); }
  function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
  function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
  function safeName(name){return String(name||"").trim().slice(0,16);}
  function saveLife(){if(life) localStorage.setItem(SAVE_KEY,JSON.stringify(life));}
  function loadLife(){try{const raw=localStorage.getItem(SAVE_KEY);if(raw){life=JSON.parse(raw);return true;}}catch(e){console.warn("저장 데이터 읽기 실패",e);}return false;}
  function getArchive(){try{return JSON.parse(localStorage.getItem(ARCHIVE_KEY)||"[]");}catch(e){return [];}}
  function setArchive(items){localStorage.setItem(ARCHIVE_KEY,JSON.stringify(items.slice(0,100)));}
  function addLog(title,detail){life.logs.unshift({age:life.age,year:life.year,title,detail});life.logs=life.logs.slice(0,120);}
  function makeLife(name,originKey,bg){
    const o=origins[originKey], stats={strength:3,agility:3,intelligence:3,wisdom:3,charm:3,luck:3};
    Object.entries(o.stats).forEach(([k,v])=>stats[k]+=v);
    return {id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,origin:originKey,background:bg,age:12,year:100,health:100,maxHealth:100,gold:o.gold,xp:0,level:1,fame:0,stats,job:"견습생",alive:true,ended:false,logs:[],createdAt:new Date().toISOString()};
  }
  function startLife(){
    const name=safeName($("characterName").value)||"이름 없는 여행자";
    const originKey=document.querySelector('input[name="origin"]:checked').value;
    const bg=$("background").value;
    if(life && !life.ended){archiveCurrent("새로운 인생을 선택함");}
    life=makeLife(name,originKey,bg);
    addLog("탄생",`${origins[originKey].label}으로 ${backgrounds[bg]}에서 태어났습니다.`);
    addLog("새로운 시작","당신의 이야기가 시작되었습니다.");
    saveLife();renderGame();showSection("game");toast(`${name}의 인생이 시작되었습니다.`);
  }
  function archiveCurrent(reason){
    if(!life)return;
    const archive=getArchive();
    archive.unshift({id:life.id,name:life.name,age:life.age,origin:life.origin,job:life.job,level:life.level,gold:life.gold,fame:life.fame,endedAt:new Date().toISOString(),reason,logs:life.logs.slice(0,30)});
    setArchive(archive);
  }
  function ageYear(){life.age+=1;life.year+=1;if(life.age===16){life.job="견습생";addLog("성년의 문턱","일을 배우거나 새로운 길을 찾아 나설 수 있게 되었습니다.");}if(life.age===18)addLog("성년","이제 스스로 인생의 방향을 정할 수 있습니다.");if(life.age>=70 && Math.random()<0.12){life.health=Math.max(0,life.health-20);addLog("세월의 무게","긴 세월이 몸에 흔적을 남겼습니다.");}}
  function gainXP(n){life.xp+=n;let leveled=false;while(life.xp>=life.level*100){life.xp-=life.level*100;life.level++;life.stats[ pick(["strength","agility","intelligence","wisdom","charm","luck"]) ]+=1;leveled=true;}if(leveled)addLog("성장","경험이 쌓여 레벨이 올랐습니다. 능력치 하나가 상승했습니다.");}
  const actionText={
    work:{title:"하루의 노동",detail:"당신은 하루 동안 일을 도왔습니다."},
    train:{title:"훈련",detail:"기초 훈련을 반복하며 몸과 마음을 단련했습니다."},
    study:{title:"공부",detail:"책과 스승에게서 새로운 지식을 배웠습니다."},
    adventure:{title:"작은 모험",detail:"낯선 길을 걸으며 위험과 기회를 마주했습니다."},
    rest:{title:"휴식",detail:"잠시 일상을 내려놓고 몸을 회복했습니다."},
    social:{title:"사람들과의 만남",detail:"사람들과 이야기를 나누며 인연을 쌓았습니다."}
  };
  function act(type){
    if(!life||life.ended){toast("먼저 새로운 인생을 시작하세요.");return;}
    const oldAge=life.age;let title=actionText[type].title,detail=actionText[type].detail;
    switch(type){
      case "work":{
        const pay=rand(5,12)+Math.floor(life.stats.strength/2)+(life.job==="상인"?3:0);
        life.gold+=pay;gainXP(15);life.health=Math.max(1,life.health-rand(2,7));
        detail=`하루의 품삯으로 ${pay}골드를 받았습니다.`;
        break;
      }
      case "train":{
        const key=pick(["strength","agility"]);life.stats[key]+=1;life.health=Math.max(1,life.health-rand(5,12));gainXP(22);
        detail=`반복 훈련으로 ${statMeta.find(x=>x[0]===key)[1]}이(가) 1 상승했습니다.`;
        break;
      }
      case "study":{
        const key=pick(["intelligence","wisdom"]);life.stats[key]+=1;gainXP(20);life.gold=Math.max(0,life.gold-rand(1,5));
        detail=`공부를 통해 ${statMeta.find(x=>x[0]===key)[1]}이(가) 1 상승했습니다.`;
        break;
      }
      case "adventure":{
        const roll=rand(1,20)+Math.floor(life.stats.luck/2)+Math.floor(life.stats.agility/3);
        if(roll>=17){const reward=rand(12,28);life.gold+=reward;life.fame+=2;gainXP(30);detail=`운 좋게 작은 유물을 발견했습니다. ${reward}골드와 명성 2를 얻었습니다.`;}
        else if(roll>=10){gainXP(18);detail="큰 위험은 피했지만, 길 위에서 많은 것을 배웠습니다.";}
        else{const damage=rand(8,20);life.health=Math.max(0,life.health-damage);detail=`위험한 짐승을 만나 체력 ${damage}를 잃었습니다.`;}
        break;
      }
      case "rest":{
        const heal=rand(18,30);life.health=Math.min(life.maxHealth,life.health+heal);detail=`충분히 쉬어 체력 ${heal}을 회복했습니다.`;break;
      }
      case "social":{
        const bonus=rand(1,3);life.stats.charm+=Math.random()<.55?1:0;life.fame+=bonus;gainXP(10);detail=`사람들과의 만남으로 명성 ${bonus}을 얻었습니다.`;break;
      }
    }
    ageYear();
    addLog(title,detail);
    maybeEvent();
    if(life.health<=0){life.health=1;addLog("간신히 살아남다","위험한 하루였지만 주변의 도움으로 목숨을 건졌습니다.");}
    saveLife();renderGame();showEventSummary(title,detail);
    if(life.age-oldAge>0)toast(`${oldAge}세에서 ${life.age}세가 되었습니다.`);
  }
  function maybeEvent(){
    if(Math.random()>.34)return;
    const events=[
      {title:"길 잃은 상인",text:"길에서 짐을 잃은 상인을 만났습니다. 짐을 찾는 일을 도와줄까요?",choices:[
        {label:"도와준다",run:()=>{life.gold+=8;life.fame+=1;return "상인은 고마움의 표시로 8골드를 건넸습니다.";}},
        {label:"지나친다",run:()=>"당신은 갈 길을 계속 갔습니다."}]},
      {title:"낡은 훈련 교본",text:"먼지 쌓인 훈련 교본을 발견했습니다.",choices:[
        {label:"읽어본다",run:()=>{life.stats.intelligence+=1;gainXP(10);return "교본에서 유용한 지식을 얻었습니다. 지능 +1.";}},
        {label:"팔아버린다",run:()=>{life.gold+=5;return "교본을 팔아 5골드를 얻었습니다.";}}]},
      {title:"마을 축제",text:"마을에 작은 축제가 열렸습니다.",choices:[
        {label:"축제에 참여한다",run:()=>{life.gold=Math.max(0,life.gold-3);life.stats.charm+=1;life.fame+=1;return "사람들과 어울리며 매력 +1, 명성 +1을 얻었습니다. 비용 3골드.";}},
        {label:"조용히 쉰다",run:()=>{life.health=Math.min(life.maxHealth,life.health+8);return "조용히 쉬며 체력 8을 회복했습니다.";}}]},
      {title:"수상한 의뢰",text:"낯선 이가 작은 심부름을 제안합니다. 보수는 괜찮지만 어딘가 수상합니다.",choices:[
        {label:"의뢰를 받는다",run:()=>{if(Math.random()<.5){life.gold+=14;life.fame+=1;return "심부름은 무사히 끝났습니다. 14골드를 받았습니다.";}life.health=Math.max(1,life.health-10);return "예상보다 위험한 일이었습니다. 체력 10을 잃었습니다.";}},
        {label:"거절한다",run:()=>"당신은 신중하게 제안을 거절했습니다."}]}
    ];
    if(Math.random()<.7){
      const e=pick(events);
      // Queue an event to be resolved by the UI after the action.
      life.pendingEvent={title:e.title,text:e.text,choices:e.choices.map(c=>({label:c.label,choiceId:c.label}))};
      window.__eventChoices=e.choices;
    }
  }
  function showEventSummary(title,detail){
    const box=$("eventBox");
    if(life.pendingEvent){
      const e=life.pendingEvent;box.classList.remove("hidden");
      box.innerHTML=`<h4>✦ 사건 발생 · ${escapeHtml(e.title)}</h4><p>${escapeHtml(e.text)}</p><div class="event-choices">${e.choices.map((c,i)=>`<button class="secondary-btn event-choice" data-choice="${i}">${escapeHtml(c.label)}</button>`).join(" ")}</div>`;
      box.querySelectorAll(".event-choice").forEach(btn=>btn.addEventListener("click",()=>resolveEvent(Number(btn.dataset.choice))));
    }else{
      box.classList.remove("hidden");box.innerHTML=`<h4>${escapeHtml(title)}</h4><p>${escapeHtml(detail)}</p>`;
    }
  }
  function resolveEvent(index){
    const e=life.pendingEvent, choices=window.__eventChoices||[];
    if(!e||!choices[index])return;
    const result=choices[index].run();addLog(`사건: ${e.title}`,result);life.pendingEvent=null;window.__eventChoices=null;saveLife();renderGame();
    const box=$("eventBox");box.classList.remove("hidden");box.innerHTML=`<h4>사건의 결과</h4><p>${escapeHtml(result)}</p>`;toast("선택이 인생 기록에 추가되었습니다.");
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function renderGame(){
    if(!life)return;
    $("characterTitle").textContent=life.name;$("characterSubtitle").textContent=`${origins[life.origin]?.label||"여행자"} · ${backgrounds[life.background]||"미지의 땅"} · ${life.job}`;
    $("ageValue").textContent=life.age;$("yearValue").textContent=`왕국력 ${life.year}년`;$("healthValue").textContent=`${life.health} / ${life.maxHealth}`;$("healthMeter").style.width=`${life.health/life.maxHealth*100}%`;
    $("xpValue").textContent=`${life.xp} / ${life.level*100} XP`;$("xpMeter").style.width=`${life.xp/(life.level*100)*100}%`;
    $("goldValue").textContent=`${life.gold} G`;$("fameValue").textContent=life.fame;$("lifeStatus").textContent=life.ended?"기록 완료":"생존";
    $("chapterLabel").textContent=`CHAPTER ${String(Math.max(1,life.age-11)).padStart(2,"0")} · ${life.age<16?"CHILDHOOD":life.age<20?"COMING OF AGE":"LIFE JOURNEY"}`;
    $("statsGrid").innerHTML=statMeta.map(([key,label,desc])=>`<div class="stat"><span>${label}</span><strong>${life.stats[key]}</strong><small>↗</small></div>`).join("");
    $("chronicleList").innerHTML=life.logs.length?life.logs.slice(0,30).map(l=>`<li><time>${l.age}세 · 왕국력 ${l.year}년</time><strong>${escapeHtml(l.title)}</strong><br>${escapeHtml(l.detail)}</li>`).join(""):`<li class="empty-log">아직 기록이 없습니다.</li>`;
    $("logCount").textContent=`${life.logs.length} 기록`;
    document.querySelectorAll(".action-card").forEach(b=>b.disabled=life.ended);
  }
  function showRecords(){
    const archive=getArchive();const current=life?[{id:life.id,name:life.name,age:life.age,origin:life.origin,job:life.job,level:life.level,gold:life.gold,fame:life.fame,endedAt:life.createdAt,reason:life.ended?"인생을 마무리함":"진행 중인 인생",logs:life.logs.slice(0,30),current:true}]:[];
    const items=[...current,...archive];
    $("recordsList").innerHTML=items.length?items.map(r=>`<article class="record-card"><span class="record-meta">${r.current?"진행 중":"보관된 기록"} · ${origins[r.origin]?.label||"여행자"}</span><h3>${escapeHtml(r.name)}</h3><p>${r.age}세 · ${escapeHtml(r.job||"미정")} · 레벨 ${r.level||1}</p><p>골드 ${r.gold||0} · 명성 ${r.fame||0}</p><p>${escapeHtml(r.reason||"인생의 기록")}</p><button class="secondary-btn view-record" data-id="${escapeHtml(r.id)}">연대기 보기</button></article>`).join(""):`<p class="muted">아직 저장된 인생이 없습니다.</p>`;
    $("recordsList").querySelectorAll(".view-record").forEach(btn=>btn.addEventListener("click",()=>viewRecord(btn.dataset.id)));
    showSection("records");
  }
  function viewRecord(id){
    const r=([...(life?[{...life,current:true}]:[]),...getArchive()]).find(x=>x.id===id);if(!r)return;
    $("recordsList").innerHTML=`<article class="record-card"><h3>${escapeHtml(r.name)}의 연대기</h3><p>${r.age}세 · ${origins[r.origin]?.label||"여행자"} · ${escapeHtml(r.job||"미정")}</p>${(r.logs||[]).map(l=>`<p><b>${l.age}세 · ${escapeHtml(l.title)}</b><br>${escapeHtml(l.detail)}</p>`).join("")}<button id="recordsBack" class="secondary-btn">목록으로</button></article>`;
    $("recordsBack").addEventListener("click",showRecords);
  }
  function endLife(){
    if(!life||life.ended){toast("마무리할 인생이 없습니다.");return;}
    if(!confirm("이 인생을 기록으로 마무리할까요? 이후에는 행동할 수 없습니다."))return;
    life.ended=true;addLog("인생을 마무리하다","당신의 여정은 여기서 한 장을 덮습니다. 기록은 이 기기에 보관됩니다.");archiveCurrent("인생을 마무리함");saveLife();
    $("endingTitle").textContent=`${life.name}의 생애`; $("endingSummary").textContent=`${life.name}은(는) ${life.age}년의 세월을 살아냈습니다. 이 인생의 선택과 사건은 당신만의 이야기로 남았습니다.`;
    $("endingStats").innerHTML=[["나이",`${life.age}세`],["레벨",life.level],["골드",`${life.gold} G`],["명성",life.fame]].map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
    $("endingChronicle").innerHTML=life.logs.slice(0,12).map(l=>`<p><b>${l.age}세 · ${escapeHtml(l.title)}</b><br>${escapeHtml(l.detail)}</p>`).join("");
    showSection("ending");
  }
  function exportData(){
    const data={format:"continent-life-save-v1",exportedAt:new Date().toISOString(),current:life,archive:getArchive()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="continent-life-backup.json";a.click();URL.revokeObjectURL(url);toast("저장 데이터 내보내기를 시작했습니다.");
  }
  function importData(file){
    if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(data.format!=="continent-life-save-v1")throw new Error("형식이 맞지 않습니다.");if(data.current)localStorage.setItem(SAVE_KEY,JSON.stringify(data.current));if(Array.isArray(data.archive))setArchive(data.archive);life=data.current||null;if(life){renderGame();showSection("game");}else showRecords();toast("저장 데이터를 가져왔습니다.");}catch(e){alert("파일을 읽을 수 없습니다. 이 사이트에서 내보낸 백업 파일인지 확인해 주세요.");}};reader.readAsText(file);
  }
  function updateBirthPreview(){const key=document.querySelector('input[name="origin"]:checked').value;$("birthPreview").textContent=origins[key].desc;}
  function init(){
    $("newLifeBtn").addEventListener("click",()=>{if(loadLife()&&!life.ended){$("characterName").value="";}showSection("creation");});
    $("creationForm").addEventListener("submit",e=>{e.preventDefault();startLife();});
    document.querySelectorAll('input[name="origin"]').forEach(el=>el.addEventListener("change",updateBirthPreview));
    document.querySelectorAll(".action-card").forEach(btn=>btn.addEventListener("click",()=>act(btn.dataset.action)));
    $("leaderboardBtn").addEventListener("click",showRecords);$("backToGameBtn").addEventListener("click",()=>life?showSection("game"):showSection("landing"));
    $("endLifeBtn").addEventListener("click",endLife);$("saveExportBtn").addEventListener("click",exportData);$("importFile").addEventListener("change",e=>importData(e.target.files[0]));
    $("rebirthBtn").addEventListener("click",()=>showSection("creation"));
    $("menuBtn").addEventListener("click",()=>$("menuDialog").showModal());$("closeMenuBtn").addEventListener("click",()=>$("menuDialog").close());
    $("menuContinue").addEventListener("click",()=>{$("menuDialog").close();if(loadLife()){renderGame();showSection("game");}else showSection("landing");});
    $("menuRecords").addEventListener("click",()=>{$("menuDialog").close();showRecords();});
    $("menuNew").addEventListener("click",()=>{$("menuDialog").close();showSection("creation");});
    if(loadLife()){renderGame();showSection("game");}else showSection("landing");
    updateBirthPreview();
  }
  document.addEventListener("DOMContentLoaded",init);
})();
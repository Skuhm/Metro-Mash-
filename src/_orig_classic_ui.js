function viewState(){return {st:S.st,cur:S.cur,up:S.up,sel}}

// ================= rendering =================
const $=q=>document.querySelector(q);
let reveal=null;
function sanitize(){
 if(!S||S.phase!=="play")return;
 if(!S.deckV17){S.deckV17=1;S.pile=(S.pile||[]).filter(id=>CARD[id]);for(const id of ["S13","S14"])if(!S.pile.includes(id))S.pile.splice(Math.floor(Math.random()*(S.pile.length+1)),0,id)}
 S.open=S.open.map(o=>o&&(o.lock?LOCKS[o.id]:CARD[o.id])?o:null);if(S.park)S.park=S.park.map(o=>o&&(o.lock?LOCKS[o.id]:CARD[o.id])?o:null);
 if(!S.layLast)S.layLast=now();
}
function render(){
 if(!S)S=fresh();sanitize();
 const top=$("#top"),main=$("#main"),tabs=$("#tabs");
 if(S.phase==="setup"){document.body.classList.remove("playing","onmap","oncard");tabs.hidden=true;top.innerHTML=`<div class="r"><div><div class="lbl">Turf</div><h1 class="d">Every station, downtown to the beach</h1></div></div>`;renderSetup(main);renderOv();return}
 tabs.hidden=false;
 const anyOpen=S.open[0]||S.open[1],needDisc=S.hand.some(h=>h.length>3);
 const nc=S.hand[1-S.up].length;
 tabs.innerHTML=[["map","Map"],["cards","Card"+(anyOpen?'<span class="dot"></span>':"")],["curses","Curses"+(nc?`<span class="cnt">${nc}</span>`:"")+(needDisc?'<span class="dot"></span>':"")],["more","More"]].map(([k,l])=>`<button role="tab" data-act="tab" data-t="${k}" aria-selected="${tab===k}">${l}</button>`).join("");
 renderTop(top);
 main.classList.toggle("maptab",tab==="map");
 document.body.classList.toggle("playing",true);document.body.classList.toggle("onmap",tab==="map");document.body.classList.toggle("oncard",tab==="cards");
 ({map:renderMap,cards:renderCards,curses:renderCurses,more:renderMore})[tab]?.(main);
 renderOv();
}
function clockLeft(){const ml=minsLeft();return ml>=60?Math.floor(ml/60)+"h "+String(ml%60).padStart(2,"0")+"m":ml+" min"}
function renderTop(t){
 const u=S.up,c=1-u;
 const pl=p=>`<div class="pl p${p+1} ${p===u?"up":""}"><span class="nm">${esc(pn(p))}</span><span class="role">${p===u?"up":"camera"}</span><span class="bank">${S.bank[p]}</span></div>`;
 const chips=[];
 if(locked())chips.push(`<span class="chip bad">Hard stop</span>`);
 if(S.hij!=null)chips.push(`<span class="chip warn">${esc(pn(S.hij))} hijacks the next hop</span>`);
 const C=(k,who,extra)=>{const cu=CURSES.find(x=>x.k===k);chips.push(`<span class="chip curse" data-act="curseinfo" data-k="${k}" title="${esc(cu?cu.eff:"")}">${who}: ${cu?cu.n:k}${extra||""}</span>`)};
 for(const p of [0,1]){const f=S.fx[p];const who=esc(pn(p));
  if(f.jury)C("jury",who);if(f.silent)C("silent",who," "+f.silent);if(f.wrong)C("wrong",who);if(f.fare)C("fare",who);if(f.road)C("road",who);if(f.rush)C("rush",who);if(f.second)C("second",who);
  if(f.bankrun)chips.push(`<span class="chip">${who}: Bank Run ${f.bankrun.done} of ${f.bankrun.declared}, ${f.bankrun.left} left</span>`);}
 if(S.sz)chips.push(`<span class="chip ok">Layover ${fmt(S.sz.end-now())}</span>`);
 const nc=S.hand[c].length;
 t.innerHTML=`<div class="hud">${pl(u)}${pl(c)}</div>
 <div class="tnav">${tab==="cards"?`<span class="status">${unvisited().length} left · ${clockLeft()} to the stop</span>`:`<button class="back" data-act="back">‹ Back to the game</button><span></span>`}<button data-act="tab" data-t="curses" aria-pressed="${tab==="curses"}">Curses${nc?` <span class="cnt">${nc}</span>`:""}</button><button data-act="tab" data-t="more" aria-pressed="${tab==="more"}">More</button></div>
 ${chips.length?`<div class="chips">${chips.join("")}</div>`:""}`;
}
function renderSetup(m){
 m.innerHTML=`<div class="stack">
 <div class="mapwrap">${mapSVG({st:S.st,cur:null,up:0})}</div>
 <div class="card"><h2 class="d">Players</h2>
  <label class="lbl" for="n1">Player 1 (pink)</label><input id="n1" value="${esc(S.players[0].name)}" autocomplete="off">
  <label class="lbl" for="n2">Player 2 (blue)</label><input id="n2" value="${esc(S.players[1].name)}" autocomplete="off"></div>
 <div class="card"><h2 class="d">The stake</h2>
  <label class="lbl" for="c1">Player 1's consequence for Player 2</label><input id="c1" value="${esc(S.players[0].cons)}">
  <label class="lbl" for="c2">Player 2's consequence for Player 1</label><input id="c2" value="${esc(S.players[1].cons)}"></div>
 <div class="card"><label class="lbl" for="hs">Hard stop</label><input id="hs" type="time" value="${esc(S.stop)}"><div class="small muted">16:15 on game day. Set it later for a test run.</div></div>
 <div class="card small muted">For a full-screen app on your phone, open this page in Safari or Chrome and add it to your home screen. Inside the Claude app it keeps the app's own frame.</div>
 <div class="card small"><b>The day.</b> Every rail station from Union Station to Santa Monica on the A, B, D and E Lines, 38 in all, tied together by buses, bike lanes, walks and Angels Flight. Start at Union Station. It's a hub, so the day opens with a bid. Whoever is Up picks the direction. You alternate being Up every hop and a card draws every hop. Thirteen gold stations hold sealed challenges. A layover every three hours: a stranger picks where you eat.</div>
 <button class="bigbtn" data-act="howto">How the game works</button>
 <button class="ink bigbtn" data-act="start">Toss the coin and start</button></div>`;
 m.querySelectorAll("input").forEach(i=>i.addEventListener("input",()=>{S.players[0].name=$("#n1").value;S.players[1].name=$("#n2").value;S.players[0].cons=$("#c1").value;S.players[1].cons=$("#c2").value;S.stop=$("#hs").value||"16:15";try{localStorage.setItem("turfla1",JSON.stringify(S))}catch(e){}}));
}
// ---- the Now panel: always exactly the next thing to do ----
function viaTxt(a,b){const e=EDGE[a+">"+b];return e?LINE_NAME[e.m]+", about "+e.t+" min":""}
function navHTML(info){
 const h=S.hop,u=S.up,c=1-u;
 const go=(attrs,t1,t2)=>`<button class="fgo" ${attrs}><b>${t1}</b>${t2?`<span>${t2}</span>`:""}</button>`;
 const side=(attrs,t1,t2)=>`<button class="fside" ${attrs}>${t1}${t2?`<small>${t2}</small>`:""}</button>`;
 let main="",sides="",chips="";
 if(locked()){main=S.done?go('data-act="reopen"',"Reopen the game","The count is locked"):go('data-act="tab" data-t="more"',"Go to the count","It's past "+esc(S.stop)+". Time.");if(!S.done)sides=side('data-act="extend" data-m="60"',"+1 hour","move the stop")}
 else if(S.sz)main=go('data-act="szend"',"Back to the game",`Layover near ${esc(ST[S.sz.id].n)}, <span id="szleft">${fmt(S.sz.end-now())}</span> left`);
 else if(!S.cur)main=go(`data-act="hop" data-id="${START_ID}"`,"We're at "+esc(ST[START_ID].n),ST[START_ID].p===4?`${esc(pn(u))} won the toss and goes first. It's a hub, so it opens with a bid`:`${esc(pn(u))} won the toss and gets first option on it`);
 else if(h&&!h.arrived){main=go('data-act="arrive"',"Doors open at "+esc(ST[h.to].n),`${esc(pn(u))} riding, ${esc(viaTxt(h.from||h.to,h.to))}`);sides=side('data-act="tab" data-t="cards"',"Card","")}
 else if(h&&!h.settled)main=go('data-act="tab" data-t="cards"',"Settle "+esc(ST[h.to].n),"You're on the platform");
 else if(szHere()){main=go('data-act="szstart"',"Start the layover",`Near ${esc(ST[S.cur].n)}. A rider picks the place, ${LAY_MIN} minutes`);sides=side('data-act="szskip"',"Skip","")}
 else{
  const rec=nextRec();
  if(rec){
   const cand=(sel&&ADJ[S.cur].includes(sel))?sel:rec;
   const nextUp=S.hij!=null?S.hij:(S.boards===0?u:c),wrong=S.fx[nextUp].wrong;
   const bits=[viaTxt(S.cur,cand),esc(pn(nextUp))+"'s turn"+(wrong?", "+esc(pn(1-nextUp))+" picks":"")];
   if(sealed(cand))bits.push("sealed");
   if(S.open[nextUp])bits.push(esc(spec(S.open[nextUp]).n)+" carries on");
   main=go(`data-act="hop" data-id="${cand}"`,"Doors closing: "+esc(ST[cand].n),bits.join(", "));
   if(S.boards>0)sides=S.hij==null?side(`data-act="hijack" ${S.bank[u]>=HIJACK?"":"disabled"}`,"Hijack",HIJACK+" chips"):side('data-act="unhijack"',"Undo","hijack");
   const others=ADJ[S.cur].filter(x=>x!==cand);
   chips=others.map(id=>`<button class="fchip${S.st[id].vis?"":" new"}" data-act="pick" data-id="${id}"><b>${esc(ST[id].n)}</b><span>${esc(viaTxt(S.cur,id))}</span></button>`).join("");
   if(rec!==cand&&unvisited().length)chips=`<button class="fchip hint" data-act="pick" data-id="${rec}"><b>Nearest new stop</b><span>${esc(ST[rec].n)}</span></button>`+chips;
  }
 }
 return `<div class="fbottom">${info||""}${showKey?legendHTML():""}${chips?`<div class="fchips">${chips}</div>`:""}<div class="fnav sheet">${main}${sides}</div></div>`;
}
let MAPBOX=null,mapZoom=null,mapFocus=null,mapScroll=null,showKey=false;
function zMax(){return MAPBOX?Math.max(5,2.6*MAPBOX.W/Math.max(320,innerWidth)):5}
function legendHTML(){
 const row=(c,dash,t1,t2)=>`<div class="krow"><svg width="26" height="10"><line x1="2" y1="5" x2="24" y2="5" stroke="${c}" stroke-width="${dash?3:6}" stroke-linecap="round"${dash?` stroke-dasharray="${dash}"`:""}/></svg><b>${t1}</b><span>${t2}</span></div>`;
 return `<div class="key">${row("var(--la)",0,"A Line","Pomona to Long Beach")}${row("var(--lb)",0,"B Line","to North Hollywood")}${row("var(--ld)",0,"D Line","to Wilshire/La Cienega")}${row("var(--le)",0,"E Line","East LA to Santa Monica")}${row("var(--lk)",0,"K Line","to LAX and Redondo Beach")}${row("var(--rail)","10 4","Amtrak · Metrolink","Union Station")}${row("#e0592a","3 3","Angels Flight","up Bunker Hill")}${row("var(--ink)","1 5","Walk","")}${row("var(--ink)","6 4","One bus","")}${row("var(--ink)","9 3 2 3","Bike or trail","")}<div class="small muted">Buses and bikes show from the station you're at.</div></div>`;
}
function renderMap(m){
 const pops=STATIONS.filter(s=>lastOwners[s.id]!==undefined&&lastOwners[s.id]!==S.st[s.id].o).map(s=>s.id);
 lastOwners=Object.fromEntries(STATIONS.map(s=>[s.id,S.st[s.id].o]));
 const old=m.querySelector(".mapview");if(old)mapScroll={l:old.scrollLeft,t:old.scrollTop};
 if(mapZoom==null){mapSVG(viewState(),{noLegend:true,box:true});mapZoom=Math.min(zMax(),Math.max(1,1.15*MAPBOX.W/Math.max(320,innerWidth)))}
 const u=S.up,nc=S.hand[1-u].length;
 const fp=p=>`<div class="fp p${p+1} ${p===u?"up":""}"><b>${esc(pn(p))}</b><span>${S.bank[p]}</span></div>`;
 const fx=[];for(const p of [0,1]){const f=S.fx[p];for(const k of ["jury","silent","wrong","fare","road","rush","second"])if(f[k]){const cu=CURSES.find(x=>x.k===k);fx.push(`<button class="fx" data-act="curseinfo" data-k="${k}">${esc(pn(p))}: ${cu.n}</button>`)}}
 const fhud=`<div class="fhud"><div class="fplates">${fp(u)}${fp(1-u)}</div><div class="fmenu"><button data-act="tab" data-t="curses" aria-label="Curses, count and settings">☰${nc?` <span class="cnt">${nc}</span>`:""}</button></div>${fx.length?`<div class="ffx">${fx.join("")}</div>`:""}<div class="fclock">${unvisited().length} stations left · ${clockLeft()} to the stop</div></div>`;
 const h=S.hop;const next=h&&!h.arrived?h.to:(!h||h.settled)?((sel&&S.cur&&ADJ[S.cur].includes(sel))?sel:nextRec()):null;
 let info="";
 if(sel&&sel!==S.cur){const v=S.st[sel],s=ST[sel];info=`<div class="selinfo"><b>${esc(s.n)}</b> · ${v.o==null?(sealed(sel)?"Sealed":"Unowned"):"Owned by "+esc(pn(v.o))} · price ${price(sel)}${v.o!=null&&v.o!==S.up?" · buyout "+tkoPrice(sel):""}</div>`}
 m.innerHTML=`<div class="mapframe"><div class="mapview" id="mapview"><div class="mapinner" style="width:${mapZoom*100}%">${mapSVG(viewState(),{pops,next,noLegend:true,box:true})}</div></div>
  ${fhud}<div class="mapctl"><button data-act="zoom" data-z="1.25" aria-label="Zoom in">+</button><button data-act="zoom" data-z="0.8" aria-label="Zoom out">−</button><button data-act="recenter" aria-label="Back to the train">◎</button><button data-act="key" aria-pressed="${showKey}">Key</button></div>
  ${navHTML(info)}</div>`;
 const mv=m.querySelector(".mapview");
 const focusId=S.cur?(S.cur+">"+(next||"")):"start";
 if(focusId!==mapFocus||!mapScroll){mapFocus=focusId;requestAnimationFrame(()=>centerMap(S.cur||START_ID,next,false))}
 else{mv.scrollLeft=mapScroll.l;mv.scrollTop=mapScroll.t}
 pinch(mv);
 const tr=m.querySelector(".train");
 if(tr&&S.cur){const s=ST[S.cur],p=XY(s),v=S.st[S.cur],owned=v.o===0||v.o===1,z=owned?(s.p===4?22:s.p===2?14:9):(s.lock?9:4),to={x:p.x,y:p.y-z-16};
  if(lastTrain&&(lastTrain.x!==to.x||lastTrain.y!==to.y)){tr.style.transition="none";tr.style.transform=`translate(${lastTrain.x}px,${lastTrain.y}px)`;tr.getBoundingClientRect();tr.style.transition="";tr.style.transform=`translate(${to.x}px,${to.y}px)`}
  lastTrain=to}
}
function centerMap(a,b,smooth){
 const mv=document.getElementById("mapview");if(!mv||!MAPBOX)return;const svg=mv.querySelector("svg");if(!svg)return;
 const sr=svg.getBoundingClientRect(),mr=mv.getBoundingClientRect(),k=sr.width/MAPBOX.W;
 const A=XY(ST[a]),B=b?XY(ST[b]):A;
 const px=mv.scrollLeft+(sr.left-mr.left)+((A.x+B.x)/2-MAPBOX.X0)*k,py=mv.scrollTop+(sr.top-mr.top)+((A.y+B.y)/2-MAPBOX.Y0)*k;
 const hud=document.querySelector(".fhud"),bot=document.querySelector(".fbottom");
 const T=hud?Math.max(0,hud.getBoundingClientRect().bottom-mr.top):0,Bm=bot?Math.max(0,mr.bottom-bot.getBoundingClientRect().top):0;
 mv.scrollTo({left:px-mv.clientWidth/2,top:py-(T+(mv.clientHeight-T-Bm)/2),behavior:smooth?"smooth":"auto"});
}
function setZoom(z,mv,px,py){
 mv=mv||document.getElementById("mapview");if(!mv)return;const inner=mv.querySelector(".mapinner");
 const nz=Math.max(1,Math.min(zMax(),z)),f=nz/mapZoom;px=px??mv.clientWidth/2;py=py??mv.clientHeight/2;
 const ax=mv.scrollLeft+px,ay=mv.scrollTop+py;mapZoom=nz;inner.style.width=(nz*100)+"%";
 mv.scrollLeft=ax*f-px;mv.scrollTop=ay*f-py;
}
function pinch(mv){
 let d0=0,z0=0,mid=null;const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
 mv.addEventListener("touchstart",e=>{if(e.touches.length===2){d0=dist(e.touches);z0=mapZoom;const r=mv.getBoundingClientRect();mid={x:(e.touches[0].clientX+e.touches[1].clientX)/2-r.left,y:(e.touches[0].clientY+e.touches[1].clientY)/2-r.top}}},{passive:true});
 mv.addEventListener("touchmove",e=>{if(e.touches.length===2&&d0){e.preventDefault();setZoom(z0*dist(e.touches)/d0,mv,mid.x,mid.y)}},{passive:false});
 mv.addEventListener("touchend",()=>{d0=0},{passive:true});
 mv.addEventListener("wheel",e=>{if(e.ctrlKey){e.preventDefault();const r=mv.getBoundingClientRect();setZoom(mapZoom*(e.deltaY<0?1.1:0.9),mv,e.clientX-r.left,e.clientY-r.top)}},{passive:false});
}
function stationPanel(id){
 const s=ST[id],v=S.st[id],u=S.up,c=1-u,pr=price(id),h=S.hop;
 let x=`<div class="stp"><div class="hd"><div><h2 class="d">${esc(s.n)}</h2><div class="small muted">${v.o==null?(sealed(id)?"Sealed":"Unowned"):"Owned by "+esc(pn(v.o))}${v.gild?" · gilded":""}</div></div><span class="price">${pr}</span></div>`;
 const o=S.open[u];
 if(S.auc)return x+aucPanel()+`</div>`;
 if(v.o==null){
  if(sealed(id)){
   if(o&&o.lock)x+=`<div class="banner" style="border-color:var(--gold)">${esc(LOCKS[id].n)} is open. Run it from the Cards tab.</div><div class="small muted">Run it below.</div>`;
   else if(o&&!spec(o).span)x+=`<div class="banner warn">${esc(pn(u))}'s card ${esc(spec(o).n)} is still open. Settle it (it pays chips), then open the sealed challenge.</div><div class="small muted">It's below.</div>`;
   else if(o)x+=`<div class="banner" style="border-color:var(--gold)">A sealed challenge waits here. ${esc(spec(o).n)} pauses while ${esc(pn(u))} attempts it.</div><button class="ink bigbtn" data-act="lockopen">Open the sealed challenge</button>`;
   else x+=`<div class="banner" style="border-color:var(--gold)">A sealed challenge waits here. ${esc(pn(u))} opens it on camera.${v.failedBy!=null&&v.failedBy!==u?" <b>Pays double:</b> "+esc(pn(v.failedBy))+" failed it.":v.failedBy===u?" You failed it before; same payout.":""}</div><button class="ink bigbtn" data-act="lockopen">Open the sealed challenge</button>`;
  }else{
   const f=firstOpt();
   if(f==="wait"){x+=`<div class="banner">${esc(pn(u))} is on ${esc(spec(o).n)} here. Pass it for first option on ${esc(s.n)}; fail or veto and ${esc(pn(c))} gets it.</div><div class="small muted">Run it below.</div>`}
   else if(f===u&&s.p<4){const noBuy=S.fx[f].jury;
    x+=`<div class="banner">${esc(pn(f))} has first option${h.card==="none"?"":h.first==null?" (card still going)":" ("+(f===u?"passed the card":esc(pn(u))+" failed")+")"}.</div><div class="row"><button class="p${f+1} bigbtn" data-act="buy" data-p="${f}" ${S.bank[f]<pr*(S.fx[f].fare?2:1)||noBuy?"disabled":""}>${esc(pn(f))} buys for ${pr*(S.fx[f].fare?2:1)}${S.fx[f].fare?" (Double Fare)":""}</button><button class="bigbtn" data-act="aucopen">Pass: auction it</button></div>${noBuy?`<div class="small muted">Jury Duty: ${esc(pn(f))} can't buy until the take is recorded.</div>`:S.bank[f]<pr?`<div class="small muted">${esc(pn(f))} can't afford it.</div>`:""}`}
   else{const why=s.p===4?"Hubs (4-point stations) can't be bought outright. They always go to auction.":h.aucWhy==="road"?"Roadblock: the pass paid chips but can't win the station.":h.card==="none"?"No card this hop, so nobody earned the right to buy it.":esc(pn(u))+" failed or vetoed the card, so nobody gets to buy it outright.";
    x+=`<div class="banner">${why} Either of you can bid, or leave it unowned.</div><div class="row"><button class="ink bigbtn" data-act="aucopen">Start the bidding</button><button class="bigbtn" data-act="aucskip">Leave it unowned</button></div>`}
  }
 }else if(v.o===c){
  const o2=S.open[u];const tk=tkoPrice(id)*(S.fx[u].fare?2:1);const can=S.bank[u]>=tk&&!S.fx[u].jury;
  if(v.gild)x+=`<div class="banner" style="border-color:var(--curse)">Gilded: a card pass doesn't take it here. Only a buyout.</div>`;
  else if(o2&&!o2.lock&&!spec(o2).span&&!spec(o2).ride)x+=`<div class="banner">${esc(pn(c))}'s station. Pass ${esc(spec(o2).n)} here and it's yours.</div><div class="small muted">Run it below.</div>`;
  else x+=`<div class="banner">${esc(pn(c))}'s station.${h.first===u?"":" No pass this hop."}</div>`;
  x+=`<div class="row"><button class="p${u+1} bigbtn" data-act="tko" ${can?"":"disabled"}>Buy it out for ${tk}${v.gild?" (gilded)":""}</button><button class="bigbtn" data-act="done">Leave it</button></div>`;
  if(!can)x+=`<div class="small muted">${S.fx[u].jury?"Jury Duty: no buying.":"Buyout costs "+tk+" (double its value, capped at "+TKO_CAP+")."}</div>`;
 }else x+=`<div class="banner ok">Yours.</div><button class="ink bigbtn" data-act="done">Ride on</button>`;
 return x+`</div>`;
}
function aucPanel(){
 const a=S.auc,cap=p=>S.fx[p].fare?Math.floor(S.bank[p]/2):S.bank[p];
 const can=(p,n)=>a.hi!==p&&a.bid+n<=cap(p)&&!S.fx[p].jury;
 return `<div class="lbl">Bidding · ${esc(ST[a.id].n)}</div>
  <div class="meter"><div><div class="lbl">High bid</div><div class="v num">${a.bid||"—"}</div></div><div class="small">${a.hi==null?"Either of you opens. Raise by 1, 5 or 10.":esc(pn(a.hi))+" leads. "+esc(pn(1-a.hi))+" raises or passes."}</div></div>
  ${[0,1].map(p=>`<div class="bidrow"><b style="color:var(--p${p+1})">${esc(pn(p))}</b>${[1,5,10].map(n=>`<button class="p${p+1}" data-act="bid" data-p="${p}" data-n="${n}" ${can(p,n)?"":"disabled"}>${a.bid+n}</button>`).join("")}</div>`).join("")}
  <div class="row">${a.hi!=null?`<button class="ink bigbtn" data-act="aucwin">${esc(pn(1-a.hi))} passes: ${esc(pn(a.hi))} buys it for ${a.bid}</button>`:`<button data-act="aucnone">Nobody bids: leave it unowned</button>`}</div>
  <div class="small muted">Banks: ${esc(pn(0))} ${S.bank[0]}${S.fx[0].fare?" (Double Fare)":""} · ${esc(pn(1))} ${S.bank[1]}${S.fx[1].fare?" (Double Fare)":""}. You can't bid more than you can pay.</div>`;
}
function cardFace(fam,n,body,extra){
 return `<div class="cf ${fam}"><div class="band"><span class="fam">${fam==="Locked"?"Sealed challenge":fam}</span>${extra||""}</div><div class="bd"><h2 class="d">${esc(n)}</h2>${body}</div></div>`;
}
function hopStrip(){
 const h=S.hop,u=S.up;if(!h)return "";
 const to=ST[h.to],from=h.from?ST[h.from]:null;
 return `<div class="strip"><div class="s-route">${from?esc(from.n)+" <i>›</i> ":""}<b>${esc(to.n)}</b></div><div class="s-meta">${h.arrived?"On the platform.":esc(viaTxt(h.from||h.to,h.to))+"."} ${esc(pn(u))} is up, ${esc(pn(1-u))} films${S.hand[1-u].length?" and holds "+S.hand[1-u].length+(S.hand[1-u].length>1?" curses":" curse"):""}.</div></div>`;
}
function actionBar(){
 const h=S.hop;if(locked()||S.sz||!h)return "";
 if(!h.arrived)return `<div class="actbar"><button class="ink go" data-act="arrive">Doors open at ${esc(ST[h.to].n)}</button></div>`;
 if(h.settled)return `<div class="actbar"><button class="ink go" data-act="tab" data-t="map">Back to the map</button></div>`;
 return "";
}
function renderCards(m){
 const h=S.hop;let x=`<div class="stack">${hopStrip()}`;
 if(h&&h.arrived&&!h.settled)x+=`<div class="card settle">${stationPanel(h.to)}</div>`;
 const order=[S.up,1-S.up];let any=false;
 for(const p of order){const o=S.open[p];if(o){any=true;x+=(p!==S.up?`<div class="lbl" style="color:var(--p${p+1})">${esc(pn(p))}'s card, still running</div>`:"")+openPanel(o)}}
 if(!any&&!(h&&h.arrived&&!h.settled))x+=`<div class="card"><h2 class="d">No card open</h2><div class="small muted">${h&&!h.arrived?"This hop has no card.":"The next card draws itself when the doors close."} ${S.pile.length} cards in the deck.</div></div>`;
 x+=`${actionBar()}</div>`;
 m.innerHTML=x;bindInputs(m);
}
function openPanel(o){
 const sp=spec(o),fam=o.lock?"Locked":sp.fam,p=o.p,q=1-p;
 let rewardTxt=typeof sp.r==="number"?String(sp.r)+" chips":sp.r;
 if(!o.lock&&sp.balance)rewardTxt=[8,12,16][Math.min(S.balanceN,3)-1]+" chips · object at least "+[12,24,36][Math.min(S.balanceN,3)-1]+" inches long";
 let body=`<dl><dt>Do this</dt><dd>${esc(sp.d)}</dd><dt>Counts</dt><dd>${esc(sp.c)}</dd><dt>Limit</dt><dd>${esc(sp.t)}${o.rush?" <b>Halved: Rush Hour.</b>":""}</dd><dt>${o.lock?"Win":"Reward"}</dt><dd>${esc(o.lock?(sp.two?"The station, and "+sp.r+" to the winner (×1.5 if two stations behind, ×0.5 if two ahead)":"The station and "+o.pay+" chips"+(o.boost>1?" (doubled after their fail)":"")+(o.band>1?" (behind: ×1.5)":o.band<1?" (ahead: ×0.5)":"")):rewardTxt)}${!o.lock&&sp.fam!=="Gambit"?", and first option on the station if you pass":""}</dd>${!o.lock&&o.id==="S1"?`<dt>Landmark</dt><dd><b>${esc(o.lm||ST[S.hop?S.hop.to:START_ID].lm)}</b></dd>`:""}</dl>`;
 if(o.sooth)body+=`<div class="banner warn">Soothsayer ${o.sooth==="hit"?"called it: this card pays nothing.":"missed: this card pays double."}</div>`;
 if(!o.lock&&sp.fam!=="Gambit"&&!o.started){
  body+=`<div><div class="lbl" style="margin-bottom:6px">Say your stakes on camera</div><div class="stakes">
   <button aria-pressed="${o.stakes==="safe"}" data-act="stake" data-p="${p}" data-k="safe" ${o.forced?"disabled":""}>Safe<span>Pays as printed. Fail it and the station goes to bidding.</span></button>
   <button aria-pressed="${o.stakes==="allin"}" data-act="stake" data-p="${p}" data-k="allin" ${o.forced?"disabled":""}>All-in<span>Pays double. Fail it and ${esc(pn(q))} also gets 3 of your chips.</span></button></div></div>`;
 }
 if(!o.started){
  if(!o.lock&&sp.declare)body+=`<div><label class="lbl" for="decl${p}">Declare</label><select id="decl${p}" data-in="decl" data-p="${p}"><option value="">Choose…</option>${sp.declare.map(n=>`<option ${o.declared==n?"selected":""}>${n}</option>`).join("")}</select></div>`;
  if(!o.lock&&o.id==="S1")body+=`<div><label class="lbl" for="est${p}">Stranger's estimate (minutes)</label><input id="est${p}" data-in="est" data-p="${p}" type="number" inputmode="numeric" min="1" max="60" value="${o.est||""}"></div>`;
  if(!o.lock&&o.id==="G1")body+=`<div><label class="lbl" for="stunt${p}">Stunt</label><select id="stunt${p}" data-in="stunt" data-p="${p}"><option value="">Choose…</option>${STATION_STUNTS.map(id=>`<option value="${id}" ${o.stunt===id?"selected":""}>${esc(CARD[id].n)}</option>`).join("")}</select></div>${o.stunt?`<div class="small"><b>${esc(CARD[o.stunt].n)}:</b> ${esc(CARD[o.stunt].d)} Counts: ${esc(CARD[o.stunt].c)}</div>`:""}`;
  if(!o.lock&&o.id==="G3"){const here=S.cur||START_ID;const dd=dist(here);const opts=STATIONS.filter(x=>(dd[x.id]||0)>=18);body+=`<div class="grid2"><div><label class="lbl" for="tgt${p}">Station</label><select id="tgt${p}" data-in="tgt" data-p="${p}"><option value="">Choose…</option>${opts.map(x=>`<option value="${x.id}" ${o.target===x.id?"selected":""}>${esc(x.n)}</option>`).join("")}</select></div><div><label class="lbl" for="dl${p}">By</label><input id="dl${p}" data-in="dl" data-p="${p}" type="time" value="${o.deadline?hhmm(o.deadline):""}"></div></div>`;}
  const cs=canStart(o);
  body+=`<div class="row"><button class="ink bigbtn" data-act="begin" data-p="${p}" ${cs.ok?"":"disabled"}>${sp.duel?"Start the duel":o.lock?"Start the challenge":o.id==="G5"?"Lock in the declaration":"Start"}</button>${!o.lock?`<button class="bad" data-act="veto" data-p="${p}">Veto</button>`:""}</div>${cs.why?`<div class="small muted">${esc(cs.why)}</div>`:""}${!o.lock&&(unplayable(p,o.id)||(!cs.ok&&spec(o).span))?`<button data-act="redraw" data-p="${p}">Can't be played here (${esc(unplayable(p,o.id)||cs.why)}): redraw, no penalty</button>`:""}`;
  if(o.lock)body+=`<div class="small muted">Attempt it here. Leaving without finishing fails it.</div>`;
 }else body+=livePanel(o,sp);
 const f0=cardFace(fam,sp.n,body,`<span class="fam">${esc(pn(p))}</span>`);return now()-o.drawnAt<1500?f0.replace('class="cf ','class="cf new '):f0;
}
function livePanel(o,sp){
 const p=o.p,q=1-p;let x="";
 if(o.awaitSecond)return `<div class="call"><div class="d" style="font-size:20px">Second Opinion</div><div class="small">Put one of your takes to strangers, one at a time. One agree saves the card. Three disagrees fail it.</div><div class="meter"><div><div class="lbl">Disagrees</div><div class="v num">${o.secondNo||0} / 3</div></div></div><div class="grid2"><button class="good" data-act="secondyes" data-p="${p}">Agrees</button><button class="bad" data-act="secondno" data-p="${p}">Disagrees</button></div></div>`;
 const meter=(lab,v,extra)=>`<div class="meter"><div><div class="lbl">${lab}</div><div class="v num">${v}</div></div>${extra||""}</div>`;
 if(o.expired)x+=`<div class="call"><div class="d" style="font-size:20px">Time is up.</div><div class="grid2"><button class="bad" data-act="timefail" data-p="${p}">It fails</button><button class="good" data-act="timeplus" data-p="${p}">Camera grants 2 more minutes</button></div></div>`;
 else if(o.tEnd)x+=meter("Time left",`<span data-live="tleft" data-p="${p}">${fmt(o.tEnd-now())}</span>`);
 if(sp.watch){x+=meter("Stopwatch",`<span data-live="watch" data-p="${p}">${o.wStart?Math.floor((now()-o.wStart)/1000):0}</span> / ${sp.watch}`,`<button data-act="${o.wStart?"pause":"wstart"}" data-p="${p}" class="${o.wStart?"bad":"ink"}">${o.wStart?"Paused over 3 s":"Start"}</button>`)}
 if(sp.lap){x+=meter("Attempt "+(o.strikes+1)+" of "+sp.strikes.max,`<span data-live="lapleft" data-p="${p}">${o.lapEnd?fmt(o.lapEnd-now()):fmt(sp.lap*1000)}</span>`,o.lapEnd?"":`<button class="ink" data-act="lapstart" data-p="${p}">Start 60 s</button>`)}
 if(sp.hold){x+=meter(o.lock?"Level with the wheel":"Hands off",`<span data-live="hold" data-p="${p}">${o.hStart?Math.min(sp.hold,Math.floor((now()-o.hStart)/1000)):0}</span> / ${sp.hold} s`,`<button class="ink" data-act="holdstart" data-p="${p}" ${o.hStart?"disabled":""}>${o.lock?"Go":"Hands off"}</button>`)}
 if(sp.study){x+=meter("Study the map",`<span data-live="study" data-p="${p}">${o.sEnd?fmt(o.sEnd-now()):"1:00"}</span>`,`<button data-act="studystart" data-p="${p}" ${o.sEnd?"disabled":""}>Start 60 s</button>`)}
 if(sp.poll){const v=o.votes||[0,0];x+=meter("Votes",`${v[0]+v[1]} / ${sp.poll}`,`<div class="small num">For ${v[0]} · Against ${v[1]}</div>`)+`<div class="grid2"><button class="good" data-act="vote" data-p="${p}" data-v="0">For</button><button class="bad" data-act="vote" data-p="${p}" data-v="1">Against</button></div>`}
 if(sp.tally){const tg=sp.tally.target||(o.declared||0);
  x+=meter(sp.tally.label+"s",`${o.tally}${tg?" / "+tg:""}`,`<div class="row" style="flex:0 0 auto"><button class="good" data-act="tally" data-p="${p}" ${sp.tally.perBoard&&!o.canStep?"disabled":""}>${sp.tally.label}</button>${sp.tally.reset?`<button class="bad" data-act="treset" data-p="${p}">${sp.tally.reset}</button>`:""}${sp.tally.failOn?`<button class="bad" data-act="tfail" data-p="${p}">${sp.tally.failOn}</button>`:""}</div>`);
  if(sp.tally.perBoard)x+=`<div class="small muted">One step per ride. ${o.canStep?"This ride's step is available.":"Step done on this ride; the next opens on your next hop as Up."}</div>`;
 }
 if(sp.strikes&&!sp.lap)x+=meter(sp.strikes.label,`${o.strikes} / ${sp.strikes.max}`,`<button class="bad" data-act="strike" data-p="${p}">${sp.strikes.label}</button>`);
 if(sp.stopGoal){const prog=S.stops-(o.resetAt??o.startStops);x+=meter("Stops in a row",`${prog} / ${sp.stopGoal}`,`<button class="bad" data-act="sreset" data-p="${p}">${sp.resetLabel}</button>`)}
 if(sp.throws){x+=meter("In the cup",`${o.tally} / ${sp.throws.target}`,`<div class="small num">Throws ${o.strikes} / ${sp.throws.max}</div>`)+`<div class="grid2"><button class="good" data-act="throwin" data-p="${p}">In</button><button data-act="throwout" data-p="${p}">Miss</button></div>`}
 if(sp.list)x+=meter("Checked",`${o.list.length} / ${sp.listTarget||sp.list.length}`)+`<div class="checks">${sp.list.map((it,i)=>`<button data-act="check" data-p="${p}" data-i="${i}" aria-pressed="${o.list.includes(i)}">${o.list.includes(i)?"✓":"○"} ${esc(it)}${(sp.req||[]).includes(i)?" (required)":""}</button>`).join("")}</div>`;
 if(sp.hands)x+=`<div class="grid2"><div><label class="lbl" for="hands${p}">Hands up</label><input id="hands${p}" data-in="hands" data-p="${p}" type="number" inputmode="numeric" min="0" value="${o.hands??""}"></div><button class="ink" data-act="handsdone" data-p="${p}" style="align-self:end">Count it</button></div>`;
 if(!o.lock&&o.id==="G3")x+=meter("Target",`${esc(ST[o.target].n)}`,`<div class="small num">by ${hhmm(o.deadline)}</div>`);
 if(!o.lock&&o.id==="G4")x+=`<div class="small muted">Stations passed: ${(o.seen||[]).map(id=>esc(ST[id].n)).join(", ")||"none yet"} of 3. Seven takes by the third; the middle one is the prize.</div>`;
 if(!o.lock&&o.id==="G0"){x+=`<div class="grid2"><div><label class="lbl" for="dc${p}">${esc(pn(p))}'s number</label><input id="dc${p}" data-in="dc" data-p="${p}" type="number" inputmode="numeric" value="${o.dc??""}"></div><div><label class="lbl" for="sc${p}">${esc(pn(q))}'s count</label><input id="sc${p}" data-in="sc" data-p="${p}" type="number" inputmode="numeric" value="${o.sc??""}"></div></div><button class="ink" data-act="dblcheck" data-p="${p}">Compare</button>`}
 if(sp.duel==="pong"){const dd=o.dd;x+=`<div class="grid2">${[0,1].map(r=>`<div class="card" style="padding:10px;border-color:var(--p${r+1})"><div class="d">${esc(pn(r))}</div><div class="num">In ${dd.h[r]} · Throws ${dd.t[r]}/10</div><div class="grid2"><button class="good" data-act="dthrow" data-p="${p}" data-r="${r}" data-in1="1" ${dd.t[r]>=10?"disabled":""}>In</button><button data-act="dthrow" data-p="${p}" data-r="${r}" data-in1="0" ${dd.t[r]>=10?"disabled":""}>Miss</button></div></div>`).join("")}</div>`}
 if(sp.duel==="agree"){const dd=o.dd;x+=`<div class="grid2">${[0,1].map(r=>`<div class="card" style="padding:10px;border-color:var(--p${r+1})"><div class="d">${esc(pn(r))}</div><div class="big num">${dd.s[r]}</div><div class="grid2"><button class="good" data-act="dag" data-p="${p}" data-r="${r}">Agree</button><button class="bad" data-act="ddis" data-p="${p}" data-r="${r}">Disagree</button></div></div>`).join("")}</div>`}
 if(o.lock&&sp.two)x+=callBlock(o,true);
 else if(o.call)x+=callBlock(o,false);
 else if(needsCall(o,sp))x+=`<div class="lbl">${esc(pn(q))} (Camera) calls it</div><div class="grid2"><button class="good" data-act="call" data-p="${p}" data-v="win">It counts</button><button class="bad" data-act="call" data-p="${p}" data-v="fail">It doesn't</button></div>`;
 if(!o.lock&&sp.vetoAny)x+=`<button class="bad" data-act="veto" data-p="${p}">Veto</button>`;
 if(!o.lock&&(sp.span||!sp.ride)&&!sp.duel)x+=`<button class="bad ghost" data-act="giveup" data-p="${p}">Give up (counts as a fail)</button>`;
 return x;
}
const CALLED=["T1","T6","S0","S1","S3","S5","S7","S9","S11","S12","G1"];
function needsCall(o,sp){return o.lock?!!sp.callOnly:CALLED.includes(o.id)}
function callBlock(o,two){
 const p=o.p;
 if(two&&!o.call)return `<div class="lbl">Who won? Both of you call it.</div><div class="grid2">${[0,1].map(r=>`<button class="p${r+1}" data-act="call" data-p="${p}" data-v="p${r}">${esc(pn(r))}</button>`).join("")}</div>`;
 const what=o.call.startsWith("p")?esc(pn(+o.call[1]))+" wins":o.call==="win"?"It counts":"It doesn't count";
 if(o.dispute)return `<div class="call"><div class="d">Replay the clip together now.</div><div class="grid2"><button class="good" data-act="agree" data-p="${p}" data-v="${o.call}">Agreed: ${what}</button><button class="bad" data-act="agree" data-p="${p}" data-v="${flip(o.call)}">Agreed: ${o.call.startsWith("p")?esc(pn(1-(+o.call[1])))+" wins":o.call==="win"?"it doesn't":"it counts"}</button></div><button data-act="coin" data-p="${p}">Still split: flip a coin</button></div>`;
 return `<div class="call"><div><span class="lbl">${two?"The call":"Camera's call"}</span><div class="d" style="font-size:20px">${what}</div></div><div class="grid2"><button class="ink" data-act="accept" data-p="${p}">${two?"Both accept":esc(pn(p))+" accepts"}</button><button data-act="dispute" data-p="${p}">Dispute</button></div></div>`;
}
const flip=v=>v==="win"?"fail":v==="fail"?"win":v==="p0"?"p1":"p0";
function settle(p,v,note){
 const o=S.open[p];
 if(v==="p0"||v==="p1"){const w=+v[1];if(o.lock)lockTwoEnd(p,w);else duelEnd(p,w);return}
 finishFor(p,v,note);
}
const fmt=ms=>{ms=Math.max(0,ms);const s=Math.ceil(ms/1000);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};

function renderCurses(m){
 const cam=1-S.up;
 let x=`<div class="stack"><div class="card small muted">Camera plays curses on the Up player, any time. You draw one whenever the other player gains a station. Hand of three. Curse pile: ${S.cpile.length}.</div>`;
 for(const p of [cam,S.up]){const hand=S.hand[p],need=hand.length>3,q=1-p,isCam=p===cam;
  x+=`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h2 class="d" style="color:var(--p${p+1})">${esc(pn(p))}'s curses</h2><span class="small muted">${isCam?"on Camera: can play":"Up: holds until next hop"}</span></div>${need?`<div class="banner bad">Four curses in hand. Discard one before playing.</div>`:""}`;
  hand.forEach((ci,i)=>{const c=CURSES[ci];
   let extra="";
   if(c.k==="gilded")extra=`<select id="g${p}_${i}"><option value="">Your station…</option>${STATIONS.filter(s=>S.st[s.id].o===p&&!S.st[s.id].gild).map(s=>`<option value="${s.id}">${esc(s.n)}</option>`).join("")}</select>`;
   if(c.k==="sooth")extra=`<select id="s${p}_${i}"><option value="">Call a family…</option><option>Take</option><option>Stunt</option><option>Gambit</option></select>`;
   const afford=S.bank[p]>=c.chips;
   x+=`<div class="cur"><b>${esc(c.n)}</b><div class="small">${esc(c.eff)}</div><div class="small muted">When: ${esc(c.when)} · ${esc(c.dur)} · ${esc(c.cost)}</div>${extra}
   <div class="row"><button class="ink" data-act="cplay" data-p="${p}" data-i="${i}" ${need||!afford||!isCam||locked()?"disabled":""}>Play on ${esc(pn(q))}${!isCam?" (when on Camera)":!afford?" (need "+c.chips+")":""}</button><button data-act="cdisc" data-p="${p}" data-i="${i}">Discard</button></div></div>`;});
  if(!hand.length)x+=`<div class="small muted">No curses in hand.</div>`;
  if(S.fx[p].jury)x+=`<div class="cur"><b>Jury Duty on ${esc(pn(p))}</b><div class="small">Recorded a take from someone under 25 or over 65? ${esc(pn(q))} confirms.</div><button class="good" data-act="jurydone" data-p="${p}">${esc(pn(q))} confirms: done</button></div>`;
  x+=`</div>`;}
 m.innerHTML=x+`</div>`;
}
function renderMore(m){
 const a=document.createElement("div"),b=document.createElement("div"),c=document.createElement("div");
 renderCount(a);renderLog(b);renderShowTab(c);
 const sealedList=`<div class="card"><h3 class="d">Sealed stations</h3>${LOCK_IDS.map(id=>{const v=S.st[id];return `<div class="small">${esc(ST[id].n)}: ${v.o!=null?"won by "+esc(pn(v.o)):v.failedBy!=null?"sealed, "+esc(pn(v.failedBy))+" failed it, pays double to "+esc(pn(1-v.failedBy)):v.opened?"opened":"sealed"}</div>`}).join("")}</div>`;
 m.innerHTML=`<div class="stack">${a.innerHTML.replace(/^<div class="stack">|<\/div>$/g,"")}${sealedList}${c.innerHTML.replace(/^<div class="stack">|<\/div>$/g,"")}${b.innerHTML.replace(/^<div class="stack">|<\/div>$/g,"")}</div>`;
}
function renderLog(m){
 m.innerHTML=`<div class="stack"><div class="row"><button data-act="undo" ${undo.length?"":"disabled"}>Undo last action</button><button data-act="copy">Copy game state</button><button data-act="howto">How the game works</button></div>
 <div class="card"><label class="lbl" for="hs2">Hard stop (${minsLeft()} min left)</label><div class="row"><input id="hs2" type="time" value="${esc(S.stop)}" style="flex:1"><button data-act="setstop">Set</button><button data-act="extend" data-m="60">+1 h</button></div></div>
 <div class="card"><h2 class="d">Ledger</h2><div class="log">${S.log.map(e=>`<div><time class="num">${hhmm(e.t)}</time><span>${esc(e.x)}</span></div>`).join("")||'<div class="muted">Nothing yet.</div>'}</div></div>
 <div class="card"><h3 class="d">New game</h3><button class="bad" data-act="reset">Wipe the day and start over</button><div id="rc" hidden class="banner bad">This deletes the whole day. <button class="bad" data-act="reallyreset">Wipe it</button></div></div></div>`;
}
function renderCount(m){
 const r=score(),h=[held(0),held(1)],col=p=>`style="color:var(--p${p+1})"`;
 const u=unvisited();
 m.innerHTML=`<div class="stack"><div class="card"><h2 class="d">${S.done?"Final count":"Live count"}</h2>
 <div class="sg"><div class="lbl">Points</div><div class="lbl" ${col(0)}>${esc(pn(0))}</div><div class="lbl" ${col(1)}>${esc(pn(1))}</div>
  <div>Property · ${h[0]} / ${h[1]} stations</div><div class="num">${r.prop[0]}</div><div class="num">${r.prop[1]}</div>
  <div>Line majorities</div><div class="num">${r.ch[0]}</div><div class="num">${r.ch[1]}</div>${majorities().rows.map(x=>`<div class="small muted" style="padding-left:10px">${esc(x.m.n)} · ${x.c[0]} / ${x.c[1]} of ${x.m.ids.length} · worth ${x.m.pts}</div><div class="small num muted">${x.a}</div><div class="small num muted">${x.b}</div>`).join("")}
  <div>Chips earned ÷ 20</div><div class="num">${r.cr[0]}</div><div class="num">${r.cr[1]}</div>
  <div>Bonus stars</div><div class="num">${r.stars[0]}</div><div class="num">${r.stars[1]}</div>
  <div class="d">Total</div><div class="big num" ${col(0)}>${r.tot[0]}</div><div class="big num" ${col(1)}>${r.tot[1]}</div></div>
 <div class="small"><b>${esc(pn(0))}:</b> ${r.names[0].join(", ")||"no stars"}<br><b>${esc(pn(1))}:</b> ${r.names[1].join(", ")||"no stars"}</div>
 ${S.done?`<div class="banner ok">${esc(pn(r.w))} wins. ${esc(pn(1-r.w))} owes: ${esc(S.players[r.w].cons||"the consequence named at the start")}.</div>`:""}
 ${u.length?`<div class="banner ${S.done?"bad":"warn"}">${u.length} station(s) not reached: ${u.map(s=>esc(s.n)).join(", ")}.</div>`:`<div class="banner ok">Every station from downtown to the beach reached.</div>`}
 ${S.done?`<button data-act="reopen">Reopen the game</button>`:`<button class="ink bigbtn" data-act="final">Hard stop: lock the count</button>`}</div></div>`;
}
function renderShowTab(m){
 m.innerHTML=`<div class="stack"><div class="card"><h2 class="d">Show mode</h2><p class="small">Full-screen graphics for the edit. Turn on your phone's screen recording, open a graphic, and tap the screen once to hide the buttons.</p>
 <button class="ink bigbtn" data-act="showopen" data-m="live">Live board and score</button>
 <button class="bigbtn" data-act="showopen" data-m="replay">Replay the day</button>
 <button class="bigbtn" data-act="showopen" data-m="explain">Rules explainer</button><p class="small muted" style="margin:0">The explainer waits for you: tap or swipe to go on. Press Play to run it on its own, nine seconds a step, and Record to hide the buttons for screen recording.</p></div></div>`;
}

// ================= overlays =================
function renderOv(){
 const ov=$("#ov");
 if(howto){ov.hidden=false;ov.className="ov";ov.removeAttribute("data-act");
  ov.innerHTML=`<div class="howto"><div class="lbl">How a hop works</div><h2 class="d">You take turns. Every hop.</h2><ol>
  <li><b>Doors close.</b> Up picks the direction: tap a neighbouring station on the map or in the list. The app draws Up a card. Up swaps every hop.</li>
  <li><b>Play the card.</b> Train cards finish before the doors open. Platform cards happen at the next station. Pick Safe (×1) or All-in (×2, a miss costs 3 chips).</li>
  <li><b>Doors open.</b> Pass the card and you may buy the station at its price. Fail, veto, or pass on buying: it goes to auction, both of you bidding. Big hubs always auction.</li>
  <li><b>Their station:</b> pass the card there and it's yours. Or buy it out for double its value, capped at ${TKO_CAP}. No rent.</li>
  <li><b>Gold stations</b> are sealed: whoever is Up opens the challenge there, after the card. Fail it and it stays sealed; the other player's attempt pays double. Pay ${HIJACK} chips to Hijack a hop and stay Up out of turn. Most points at ${esc(S.stop)} wins: stations, longest chain, chips, bonus stars.</li></ol>
  <button class="ink bigbtn" data-act="howtoclose">Got it</button></div>`;return}
 if(reveal&&now()<revealUntil){
  const r=reveal;ov.hidden=false;ov.className="ov";ov.setAttribute("data-act","closereveal");
  ov.innerHTML=`<div class="reveal">${cardFace(r.fam,r.n,`<p>${esc(r.d)}</p><div class="small muted">Tap to continue</div>`,r.sub?`<span class="fam">${esc(r.sub)}</span>`:"")}</div>`;
  clearTimeout(renderOv.t);if(revealUntil-now()<1e9)renderOv.t=setTimeout(()=>{reveal=null;renderOv()},Math.max(0,revealUntil-now()));
 }else{ov.hidden=true;ov.innerHTML=""}
 let tz=$("#toast");if(!tz){tz=document.createElement("div");tz.id="toast";document.body.appendChild(tz)}
 if(S&&S.toast&&now()-S.toast.t<4000&&!S.toast.gone){tz.hidden=false;const sh=document.querySelector(".fbottom")||document.querySelector(".sheet"),tb=$("#top");if(tab==="map"&&sh){tz.style.top="auto";tz.style.bottom=(innerHeight-sh.getBoundingClientRect().top+8)+"px"}else{tz.style.bottom="auto";tz.style.top=((tb&&tb.offsetParent?tb.getBoundingClientRect().bottom:0)+8)+"px"}tz.innerHTML=`<div class="tst" data-act="toastx">${esc(S.toast.n)} · tap to dismiss</div>`;clearTimeout(renderOv.tt);renderOv.tt=setTimeout(()=>{tz.hidden=true},4000-(now()-S.toast.t))}else tz.hidden=true;
}
function flash(title,body,fam){reveal={fam:fam||"Curse",n:title,d:body};revealUntil=now()+2200}

// ----- Show mode -----
let showTimer=null,showRev=-1;
function openShow(mode){
 showMode=mode;const el=$("#show");el.hidden=false;el.className="show";clearTimeout(showTimer);
 if(mode==="live")drawShow({st:S.st,cur:S.cur,up:S.up},{},liveCap());
 if(mode==="replay")runReplay();
 if(mode==="explain")runExplain();
}
function closeShow(){showMode=null;clearTimeout(showTimer);const el=$("#show");el.hidden=true;el.innerHTML=""}
function liveCap(){const u=unvisited().length;return {t:u?u+" stations to go":"Every station reached",s:minsLeft()+" minutes to "+S.stop}}
function blankSt(){return Object.fromEntries(STATIONS.map(s=>[s.id,{o:null,vis:false,gild:false}]))}
function drawShow(V,opt,cap,score2){
 const el=$("#show");
 const pts=score2||[0,1].map(p=>STATIONS.filter(s=>V.st[s.id].o===p).reduce((a,s)=>a+s.p,0)+majorities(V.st).t[p]);
 const cnt=[0,1].map(p=>STATIONS.filter(s=>V.st[s.id].o===p).length);
 el.innerHTML=`<div class="sb"><div class="team t1"><span class="tn">${esc(pn(0))}</span><span class="tp num">${pts[0]}</span><span class="small">${cnt[0]} stations</span></div><div class="clock num">${cap&&cap.clock||hhmm(now())}</div><div class="team t2"><span class="tn">${esc(pn(1))}</span><span class="tp num">${pts[1]}</span><span class="small">${cnt[1]} stations</span></div></div>
 <div class="stage" data-act="showtap">${mapSVG(V,Object.assign({noLegend:true},opt))}${cap?`<div class="cap"><div>${esc(cap.t)}${cap.s?`<small>${esc(cap.s)}</small>`:""}</div></div>`:""}</div>
 <div class="ctl"><button data-act="showopen" data-m="live">Live</button><button data-act="showopen" data-m="replay">Replay</button><button data-act="showopen" data-m="explain">Explainer</button><button class="ink" data-act="showclose">Close</button></div>`;
}
function runReplay(){
 const H=[...S.hist].sort((a,b)=>a.t-b.t);const st=blankSt();let i=0;
 drawShow({st,cur:null,up:0},{},{t:"The day, station by station",s:H.length+" claims"});
 const step=()=>{
  if(showMode!=="replay")return;
  if(i>=H.length){drawShow({st,cur:null,up:0},{},{t:"Final board",s:"Most points wins"});return}
  const e=H[i++];st[e.id].o=e.o;st[e.id].vis=true;
  drawShow({st,cur:e.id,up:e.o},{pops:[e.id]},{t:pn(e.o)+" takes "+ST[e.id].n,s:hhmm(e.t)});
  showTimer=setTimeout(step,900);
 };
 showTimer=setTimeout(step,1200);
}
function runExplain(){xpOpen("show")}

// ================= the app shell: pick a game, or jump back into one =================
const APP_KEY="turf.app";
function appState(){return Object.assign({mode:"home",city:"la"},lsGet(APP_KEY)||{})}
// switching games reloads the page, so each game starts from a clean slate
function reloadClean(){try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}location.reload()}
function enterMode(mode,city,extra){lsSet(APP_KEY,Object.assign(appState(),{mode,city},extra||{}));reloadClean()}
function goHome(){lsSet(APP_KEY,Object.assign(appState(),{mode:"home"}));reloadClean()}
function homeRender(){
 const A=appState();
 document.body.classList.remove("playing","onmap","oncard");
 $("#tabs").hidden=true;$("#top").innerHTML="";$("#top").hidden=true;
 const cl=lsGet("turf.classic."+CITY.id),clLive=cl&&cl.phase==="play";
 const tm=typeof teamsSaved==="function"?teamsSaved():null;
 $("#main").innerHTML=`<div class="home">
  <div class="home-hero"><h1 class="d">Metro Mash</h1><p>Race a city's trains, card by card. Claim the stations, curse your rivals.</p></div>
  ${tm?`<button class="resume" data-act="h-resume"><b>Back to your game</b><span>${esc(tm.label)}</span></button>`:""}
  <div class="citypick" role="group" aria-label="City">${Object.values(CITIES).map(c=>`<button data-act="h-city" data-c="${c.id}" aria-pressed="${c.id===CITY.id}">${esc(c.name)}</button>`).join("")}</div>
  <div class="homethumb"><div class="ht-in">${mapSVG({st:Object.fromEntries(STATIONS.map(s=>[s.id,{o:null,vis:true,gild:false}])),cur:null,up:0},{noLegend:true,still:true})}</div></div>
  <div class="small muted ht-hint" hidden>Swipe the map to see the whole board.</div>
  <div class="mode"><h2 class="d">Teams</h2><p>Two to six teams of two race the same board, each on its own phone, all synced live. Complete a card to buy a station; fail it and every team bids. Steal stations with trivia duels.</p>
   <div class="row"><button class="ink bigbtn" data-act="h-host">Start a game</button><button class="bigbtn" data-act="h-join">Join with a code</button></div></div>
  <div class="mode"><h2 class="d">One phone, everyone</h2><p>Two to six players sharing one phone, each with their own colour. Same cards, auctions, duels and curses: pass the phone to whoever is up.</p>
   <div class="row one"><button class="bigbtn" data-act="h-local">Play ${esc(CITY.name)} on this phone</button></div>
   <button class="linkbtn" data-act="h-classic">${clLive?"Resume the original two-player "+esc(CITY.short)+" game":"The original two-player game"}</button></div>
  <div class="homefoot">On iPhone, open this page in Safari, tap Share, then Add to Home Screen. It opens full screen like an app.</div>
 </div>`;
 homeThumbFit();
}
document.addEventListener("click",e=>{
 if(MODE!=="home")return;
 const b=e.target.closest("[data-act]");if(!b||b.disabled)return;
 const a=b.dataset.act;
 if(a==="h-city"){lsSet(APP_KEY,Object.assign(appState(),{city:b.dataset.c}));loadCity(b.dataset.c);homeRender();return}
 if(a==="h-classic"){enterMode("classic",CITY.id);return}
 if(a==="h-host"){enterMode("teams",CITY.id,{intent:"host"});return}
 if(a==="h-local"){enterMode("teams",CITY.id,{intent:"local"});return}
 if(a==="h-join"){enterMode("teams",CITY.id,{intent:"join"});return}
 if(a==="h-resume"){const tm=teamsSaved();enterMode("teams",tm.city,{intent:"resume"});return}
});
function homeThumbFit(){
 const box=document.querySelector(".homethumb");if(!box)return;const svg=box.querySelector("svg"),vb=svg.viewBox.baseVal,k=0.5;
 const w=Math.max(box.clientWidth,Math.round(vb.width*k));svg.style.width=w+"px";svg.style.maxWidth="none";
 const wide=w>box.clientWidth+8;const hint=document.querySelector(".ht-hint");if(hint)hint.hidden=!wide;
 if(wide){const f=CITY.map.thumbFocus&&ST[CITY.map.thumbFocus];const fx=f?(XY(f).x-vb.x)*(w/vb.width):w/2;box.scrollLeft=Math.max(0,fx-box.clientWidth/2)}
}
function appBoot(){
 // the landmark and sign art brings its own styles
 if(typeof DECOR_CSS==="string"&&DECOR_CSS){const st=document.createElement("style");st.id="decorcss";st.textContent=DECOR_CSS;document.head.appendChild(st)}
 const A=appState();
 // an invite link opens straight into joining: #join=CODE
 const h=new URLSearchParams(location.hash.slice(1));
 if(h.get("join")){A.mode="teams";A.intent="join";A.joinCode=h.get("join").toUpperCase();if(h.get("relay"))A.relay=h.get("relay");if(CITIES[h.get("city")])A.city=h.get("city");lsSet(APP_KEY,A);try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}}
 if(!CITIES[A.city])A.city="la";
 loadCity(A.city);MODE=A.mode;
 if(MODE==="classic"){$("#top").hidden=false;classicBoot();return}
 if(MODE==="teams"&&typeof teamsBoot==="function"){$("#top").hidden=false;teamsBoot(A);return}
 MODE="home";homeRender();
}
appBoot();

// Mobile Safari: size the app to the visible viewport, and never let the page itself scroll
(function(){const vv=window.visualViewport;
 // with the keyboard up, Safari shrinks and offsets the visual viewport: follow it, and keep the field being typed in on screen
 const typing=()=>{const a=document.activeElement;return a&&/INPUT|SELECT|TEXTAREA/.test(a.tagName)?a:null};
 const show=()=>{const a=typing();if(a)a.scrollIntoView({block:"start"})};
 let t=null;
 // the app is sized to the visible viewport only while no field has focus: resizing under the keyboard blanked the screen on iPhones.
 // While typing, the field is scrolled to the top of the screen instead, above the keyboard.
 const fit=()=>{clearTimeout(t);t=setTimeout(()=>{if(typing()){show();return}if(vv)document.documentElement.style.setProperty("--vvh",Math.round(vv.height)+"px");if(window.scrollY)window.scrollTo(0,0)},120)};
 if(vv)vv.addEventListener("resize",fit);window.addEventListener("resize",fit);window.addEventListener("orientationchange",()=>setTimeout(fit,300));
 document.addEventListener("focusin",e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))setTimeout(show,400)});
 document.addEventListener("focusout",()=>setTimeout(fit,250));
 if(vv)document.documentElement.style.setProperty("--vvh",Math.round(vv.height)+"px")})();

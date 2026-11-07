"use strict";
// ================= shared helpers =================
const now=()=>Date.now();
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const hhmm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=ms=>{ms=Math.max(0,ms);const s=Math.ceil(ms/1000);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
const $=q=>document.querySelector(q);
const rid=(n=10)=>{const a="abcdefghijkmnpqrstuvwxyz23456789";let s="";const r=crypto.getRandomValues(new Uint8Array(n));for(const b of r)s+=a[b%a.length];return s};
const lsGet=k=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
// which mode and city this page load runs
let MODE="home";

// ================= cities =================
// Each city is data: stations on a schematic grid, the lines through them, extra connectors, sealed challenges,
// scoring areas, map decor, explainer scenes and the copy that names the place. loadCity() turns one into the globals below.
const CITIES={};
let CITY=null,STATIONS=[],ST={},START_ID=null,LINE_PATHS={},LINES=[],LINE_NAME={},RAIL_MODES=[],EDGES=[],ADJ={},EDGE={},LOCKS={},LOCK_IDS=[],MAJ=[],LINE_ORDER=[],LCOL={},SHARED={};
const START=50,HIJACK=5,TKO_CAP=10;
// a station is worth its stars at the count, and costs 5 monies per star to buy
const STAR_COST=10;   // monies per star: a 2-star station costs 20
function loadCity(id){
 const C=CITIES[id]||CITIES.la;CITY=C;
 STATIONS=C.stations;ST=Object.fromEntries(STATIONS.map(s=>[s.id,s]));START_ID=C.start;
 LINE_PATHS=Object.fromEntries(Object.entries(C.lines).map(([k,l])=>[k,l.path]));LINES=Object.values(LINE_PATHS);
 LINE_NAME=Object.assign({walk:"walk",bus:"one bus",bike:"bike or trail"},C.modeNames);
 LINE_ORDER=C.lineOrder;
 LCOL=Object.assign({x:"var(--ink)",rail:"var(--rail)"},Object.fromEntries(Object.entries(C.lines).map(([k,l])=>[k,l.col])),C.extraCols||{});
 // rail edges from the line paths; a segment two lines share gets both letters ("bd": B or D Line)
 SHARED={};EDGES=[];
 for(const [k,ids] of Object.entries(LINE_PATHS))for(let i=0;i<ids.length-1;i++){const a=ids[i],b=ids[i+1],key=a<b?a+"|"+b:b+"|"+a;(SHARED[key]=SHARED[key]||[]).push(k)}
 const seen={};
 for(const [k,ids] of Object.entries(LINE_PATHS))for(let i=0;i<ids.length-1;i++){const a=ids[i],b=ids[i+1],key=a<b?a+"|"+b:b+"|"+a;if(seen[key])continue;seen[key]=1;
  const on=SHARED[key].slice().sort(),m=on.join("");const t=(C.slow||{})[key]||(C.fast&&C.fast.has(a)&&C.fast.has(b)?2:Math.min(...on.map(x=>C.lines[x].min)));EDGES.push([a,b,m,t])}
 RAIL_MODES=[...new Set(EDGES.map(e=>e[2]))];
 for(const e of C.extraEdges)EDGES.push(e);
 ADJ={};STATIONS.forEach(s=>ADJ[s.id]=[]);EDGE={};
 for(const [a,b,m,t] of EDGES){const k=a+">"+b;if(EDGE[k]){if(t<EDGE[k].t)EDGE[k]=EDGE[b+">"+a]={m,t};continue}ADJ[a].push(b);ADJ[b].push(a);EDGE[k]=EDGE[b+">"+a]={m,t}}
 LOCKS=C.locks;LOCK_IDS=STATIONS.filter(s=>s.lock).map(s=>s.id);
 MAJ=C.areas;
 if(typeof CARD_BASE!=="undefined")for(const [cid,base] of Object.entries(CARD_BASE)){const c=CARD[cid];for(const k of Object.keys(c))if(!(k in base))delete c[k];Object.assign(c,JSON.parse(JSON.stringify(base)))}
 for(const [cid,ov] of Object.entries(C.cardText||{}))Object.assign(CARD[cid],ov);
}

// ================= deck =================
// Every card: a shot, a number the team can judge, a fail state, a city placeholder, a limit. Complete it: its monies, and the station is yours to buy. Fail it: lose half its monies, the station goes to auction, and you draw a curse.
// ride: done on the vehicle during the hop (no clock cost). span: may run over several hops. Others: done on the platform.
const CARDS=[
 // Takes: opinions, yours and strangers', and getting people to rule on them
 {id:"T0",fam:"Take",n:"Four Agrees In A Row",w:"This ride",d:"Get four people to agree with your hot take, in a row. If one disagrees you reset to zero. Complete it before your next stop.",c:"The fourth agree in a row before the doors open.",t:"This hop. Unlimited riders.",r:10,ride:1,vetoAny:1,tally:{target:4,label:"Agree",reset:"Disagree"}},
 {id:"T1",fam:"Take",n:"Three Rulings",w:"This ride",d:"Come up with the craziest take you actually believe and tell three people. It has to be genuinely shocking or controversial.",c:"Three people hear it and rule on it, agree or disagree, before the doors open.",t:"One take for all three.",r:10,ride:1,tally:{target:3,label:"Ruling"}},
 {id:"T2",fam:"Take",n:"Filibuster",w:"Train or platform",d:"Find a stranger and ask for their most controversial opinion (it has to be genuinely controversial). Argue against it for the next 90 seconds, whatever you actually think of it.",c:"The stopwatch reaches 90. Any pause over three seconds stops it.",t:"Two attempts.",r:10,watch:90,strikes:{max:2,label:"Paused"}},
 {id:"T3",fam:"Take",n:"Chain Of Custody",w:"Three rides",d:"Ask a stranger for their hot take and add on to what they're saying. Share this dual take with a new stranger at each of your next two stops, adding to the take's explanation each time.",c:"Three strangers over three rides, the take growing each time, on camera.",t:"Your next three rides.",r:15,span:1,tally:{target:3,label:"Step",perBoard:1}},
 {id:"T4",fam:"Take",n:"Call Your Takes",w:"This ride",d:"Earn more by collecting more takes, but declare how many you'll get before you start. Fall short and you lose as many stars as you were going for.",c:"The declared number of takes before the doors open.",t:"This hop.",r:"6–24",rtxt:"2 takes +6 · 3 takes +11 · 4 takes +17 · 5 takes +24. Miss, and you lose the same number",ride:1,declare:[2,3,4,5],cyt:1,tally:{label:"Take"}},
 {id:"T5",fam:"Take",n:"Lightning Round",w:"Train or platform",d:"Find a group of strangers and get a hot take from each of them. Then argue against all of their takes in one combined response, under 30 seconds.",c:"Three or more takes, then one response under 30 seconds that answers every one of them, on camera.",t:"5 minutes.",r:10,timer:300,tally:{target:3,label:"Take"}},
 {id:"T6",fam:"Take",n:"Two Sides",w:"This ride",d:"Find a couple or a small group of strangers and get them to give you opposing takes. Agree with one of them, and tell the other why their take was so wrong.",c:"Two opposing takes and your verdict, on camera, before the doors open.",t:"This hop.",r:8,ride:1},
 {id:"S0",fam:"Take",n:"Prove Me Wrong",w:"The platform",d:"Get materials and make a sign with a HEINOUS take on it. Stand somewhere with heavy foot traffic and defend it to anyone who walks by, until you've collected three takes on it.",c:"Three strangers give you their take on your sign, on camera.",t:"25 minutes, sign-making included.",r:12,timer:1500,tally:{target:3,label:"Take"}},
 {id:"S5",fam:"Take",n:"Hometown Advantage",w:"This ride",d:"Find a stranger who has lived here for more than three years and ask for a take on how the city has changed. Argue against it, then ask if they agree with you. If they don't, ask them why you're wrong.",c:"Their take, your argument and their verdict, on camera, before the doors open.",t:"One stranger.",r:10,ride:1},
 {id:"S7",fam:"Take",n:"Sell Me The City",w:"This ride",d:"Ask a rider to explain why this city is the best in the country (or in the state, if they're struggling). Then disagree, and make the case that a different city is better.",c:"Their pitch and your rebuttal, on camera, before the doors open.",t:"Up to two riders.",r:8,ride:1,strikes:{max:2,label:"Declined"}},
 // Stunts: things you do with strangers and the city
 {id:"S1",fam:"Stunt",n:"Directions Only",w:"The station",d:"A landmark has been chosen for you. Find a stranger and ask how long it takes to get there: that is your time limit. No phone for directions, only other strangers.",c:"You are touching the landmark before the timer hits zero.",t:"The stranger's estimate. One attempt.",r:12,dirs:1},
 {id:"S6",fam:"Stunt",n:"Scavenger",w:"Train or platform",d:"Photograph all five on the list. The list changes with the part of town you're in.",c:"Fifth photo taken.",t:"20 minutes.",r:12,timer:1200,list:["A taco truck","Someone in a Dodgers cap","A mural taller than you","Someone on a rental scooter","Someone asleep"]},
 {id:"S8",fam:"Stunt",n:"Train Pong",w:"This ride",d:"Set an empty cup on one side of the car and sit on the opposite side, as far away as you can. You have ten throws to land three in a row before the next stop.",c:"Three in the cup in a row before the doors open.",t:"Ten throws.",r:10,ride:1,throws:{max:10,target:3,row:1}},
 {id:"S9",fam:"Stunt",n:"Bike It",w:"The next hop",d:"At the next stop, get off and ride rental bikes (Metro Bike Share, Lime, Bird, whatever is docked nearby) to the station after it, instead of taking the train or bus. Both of you ride.",c:"Both of you on the platform at the next station, bikes parked, before the timer hits zero.",t:"20 minutes from the doors opening.",r:12,timer:1200,span:1},
 {id:"S11",fam:"Stunt",n:"Local Plate",w:"The station",d:"Buy and finish one: a street taco from a truck or stand, a bacon-wrapped hot dog, a pastrami sandwich, a pupusa, a Double-Double. Then give a 60-second review to the most senior staff member on the premises, found by asking.",c:"The staff member gives their verdict on your verdict.",t:"No clock: lines and kitchens take what they take. Settle it before you board again.",r:10},
 {id:"S12",fam:"Stunt",n:"Seatmate",w:"Train or platform",d:"Sit next to a stranger on the train, or stop one on the street at the next stop. Get them to show you one photo on their phone and tell you the story behind it.",c:"The story on camera, 30 seconds or more.",t:"10 minutes at the stop. Up to three strangers.",r:10,timer:600,strikes:{max:3,label:"Declined"}},
 {id:"S13",fam:"Stunt",n:"Trade Up",w:"Three rides",d:"Trade something from your pocket with a rider for something of theirs, or buy something for under $5 to start with. On each of your next two rides, trade what you have for something better. The more it is worth at the end, the more it pays.",c:"Three trades on camera, one per ride.",t:"Your next three rides.",r:15,rtxt:"15 monies, or 20 if your last item is worth $20 or more",span:1,tally:{target:3,label:"Trade",perBoard:1},bonus:{label:"Last item worth $20 or more",chips:5}},
];
const CARD=Object.fromEntries(CARDS.map(c=>[c.id,c]));
// the printed card text as shipped, so a city's wording never leaks into the next city loaded on the same page
const CARD_BASE=JSON.parse(JSON.stringify(CARD));
const STATION_STUNTS=["S0","S1","S6","S9","S11","S12"];
// what a failed card costs: half its printed monies (Call Your Takes: the whole declared amount)
const CYT_PAY={2:6,3:11,4:17,5:24};
function cardLoss(c,o){if(c.cyt)return CYT_PAY[o.declared]||0;return typeof c.r==="number"?Math.ceil(c.r/2):0}
// a card whose list depends on the part of town
function cardListFor(c,at){if(!c.lists)return null;const a=MAJ.find(x=>x.ids.includes(at));return (a&&c.lists[a.n])||c.list}


// ================= curses: either player plays one on the other =================
const CURSES=[
 {n:"Rush Hour",when:"Before their next card",eff:"Their next card's time limit is halved.",dur:"One card",cost:"2 monies",k:"rush",chips:2},
 {n:"Roadblock",when:"Before their next card",eff:"Their next Take or Stunt can't win them the station. Pass it and they keep the monies, but the station goes to auction.",dur:"One card",cost:"2 monies",k:"road",chips:2},
 {n:"Wrong Platform",when:"Before their next hop",eff:"You pick where their next hop goes, from the neighbouring stations.",dur:"One hop",cost:"2 monies",k:"wrong",chips:2},
 {n:"Double Fare",when:"Any time",eff:"Their next buy, bid or buyout costs double.",dur:"One purchase",cost:"2 monies",k:"fare",chips:2},
 {n:"Gilded Station",when:"At a station you own",eff:"Buying it out costs 10, and a card pass there does not take it. Only a buyout does.",dur:"Rest of the day",cost:"2 monies",k:"gilded",chips:2},
 {n:"Silent Car",when:"Any time",eff:"They may not speak to a stranger until the doors open at their second stop from now.",dur:"Two stops",cost:"2 monies",k:"silent",chips:2},
 {n:"Jury Duty",when:"Any time",eff:"They can't buy, bid or challenge a station until they record a political take from someone under 25 or over 65.",dur:"Until done",cost:"3 monies",k:"jury",chips:3},
];


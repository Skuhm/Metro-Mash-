// ================= teams: two to six teams of two, every team on its own phone =================
// Each team's phone is the only writer of that team's state. Everything shared (who owns what, curses between teams,
// sealed fails, payments) is derived from the teams' own event lists, so phones never overwrite each other.
const TEAM_NAMES=["Pink","Blue","Green","Orange","Teal","Violet"];
// team colours to pick from: [key, name, light-mode colour, dark-mode colour]
const T_PAL=[["pink","Pink","#e23d6d","#ff5c8a"],["blue","Blue","#2f5ae8","#6b8cff"],["green","Green","#17a05a","#38c97b"],["orange","Orange","#ee7a12","#ff9a3d"],
 ["teal","Teal","#0a9fb4","#2cc7dc"],["violet","Violet","#8a4fe0","#a67cff"],["red","Red","#d02b2b","#ff5a52"],["gold","Gold","#c08a00","#f5c21b"],
 ["lime","Lime","#5f9c12","#93d63c"],["magenta","Magenta","#c0269f","#f05cd6"],["brown","Brown","#8a5a2b","#c9945c"],["slate","Slate","#4a5568","#a3b0c2"]];
const T_DEFCOL=["pink","blue","green","orange","teal","violet"];
const palOf=k=>T_PAL.find(c=>c[0]===k)||T_PAL[0];
// each team's colour fills its slot (--p1…--p6), so every place that draws a team picks it up
function tApplyColors(cols){
 let el=document.getElementById("tcolcss");if(!el){el=document.createElement("style");el.id="tcolcss";document.head.appendChild(el)}
 const vars=(dark)=>cols.map((k,i)=>{const c=palOf(k)[dark?3:2],n=i+1;
  return `--p${n}:${c};--p${n}-l:color-mix(in srgb,${c} 62%,#000);--p${n}-r:color-mix(in srgb,${c} 84%,#000);--p${n}-soft:color-mix(in srgb,${c} ${dark?22:14}%,${dark?"#121821":"#fff"});`}).join("");
 el.textContent=`:root{${vars(0)}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${vars(1)}}}:root[data-theme="dark"]{${vars(1)}}`;
}
const tMetaCols=()=>teamList().map((t,i)=>t.col||T_DEFCOL[i]);
const TKEY="turf.teams.game";
const TEAM_DECK=()=>CARDS.filter(c=>!c.duel).map(c=>c.id);
const TM={phone:null,code:null,relay:"hivemq",meta:null,my:null,teams:{},net:"off",keys:null,R:null,tab:"map",sel:null,pubT:null,heard:{},heardRev:{},reveal:null,revealUntil:0,toast:null,setup:null,join:null,lastOwn:null,show:null};
function teamsSaved(){const g=lsGet(TKEY);if(!g||!g.meta||!g.code)return null;const t=g.meta.teams.find(x=>x.id===g.my);return {label:g.relay==="local"?`${(CITIES[g.meta.city]||{}).name||""} · one phone, ${g.meta.teams.length} players`:`${(CITIES[g.meta.city]||{}).name||""} · game ${g.code}${t?" · Team "+t.name:""}`,city:g.meta.city}}
function tSave(){lsSet(TKEY,{code:TM.code,relay:TM.relay,meta:TM.meta,my:TM.my,teams:TM.teams})}
const me=()=>TM.teams[TM.my];
const tLocal=()=>TM.relay==="local";   // one phone, everyone: no relay, pass the phone between players
const teamList=()=>TM.meta?TM.meta.teams:[];
const tIdx=id=>teamList().findIndex(t=>t.id===id);
const tInfo=id=>teamList().find(t=>t.id===id)||{name:"?",mates:[]};
const tName=id=>"Team "+tInfo(id).name;
const tCol=id=>`var(--p${tIdx(id)+1})`;
const mateName=(T,i)=>tInfo(T.id).mates[i]||("Player "+(i+1));
const upName=T=>tInfo(T.id).name,camName=T=>tInfo(T.id).name;
const tLocked=()=>!!TM.meta&&(TM.meta.done||now()>=TM.meta.stopTs);
const tMinsLeft=()=>TM.meta?Math.max(0,Math.round((TM.meta.stopTs-now())/60000)):0;
const tClockLeft=()=>{const ml=tMinsLeft();return ml>=60?Math.floor(ml/60)+"h "+String(ml%60).padStart(2,"0")+"m":ml+" min"};
const tBlankFx=()=>({road:false,silent:0,jury:false,rush:false,wrong:null,fare:false,second:false,bankrun:null,cool:0});
function tLog(x,T){T=T||me();T.log.unshift({t:now(),x});if(T.log.length>80)T.log.length=80}
function tFresh(t,meta){
 return {id:t.id,rev:1,at:now(),by:TM.phone,mate:Math.random()<.5?0:1,cur:t.start,hop:null,stops:0,boards:0,open:null,park:null,
  pile:shuffle(TEAM_DECK()),cpile:shuffle(CURSES.flatMap((c,i)=>[i,i])),hand:[],fx:tBlankFx(),bank:START,credits:0,
  stats:{cards:0,tko:0,locks:0},vis:{[t.start]:1},claims:[],ev:[],seen:{},layLast:meta.startedAt,sz:null,duel:null,coolS:null,
  log:[{t:now(),x:"Start at "+ST[t.start].n+". "+START+" chips."}]};
}

// ---------- the shared world, derived from every team's events ----------
// Auctions and trivia duels are events too. Their results are worked out the same way on every phone,
// from the events alone, so no phone has to be in charge.
let AUC_MS=120000,AUC_GRACE=15000;               // a failed card's station is auctioned for two minutes
let DUEL_Q=5,DUEL_S=15,DUEL_WIN=20*60000;         // five questions, fifteen seconds each; the other team has 20 minutes
let DUEL_LATE=120000,DUEL_GRACE=30000;            // a duel started just before the deadline may still be finished
const GILD_MS=2*3600000;                            // Gilded Station: no challenges for two hours
let _W=null;const tInvalidate=()=>{_W=null};
function tWorld(){
 if(_W)return _W;
 const ids=teamList().map(t=>t.id),claims=[],evs=[],T0=now();
 for(const id of ids){const T=TM.teams[id];if(!T)continue;for(const c of T.claims)claims.push(Object.assign({team:id},c));for(const e of T.ev)evs.push(Object.assign({team:id},e))}
 // auctions: highest bid placed before the close wins; ties go to the earlier bid
 const auctions=[],bidsBy={};
 for(const e of evs)if(e.k==="bid")(bidsBy[e.ref]=bidsBy[e.ref]||[]).push(e);
 for(const e of evs)if(e.k==="auction"){
  const bids=(bidsBy[e.id]||[]).filter(b=>b.t<=e.end).sort((a,b)=>b.n-a.n||a.t-b.t||(a.team<b.team?-1:1));
  const high=bids[0]||null,closed=T0>=e.end+AUC_GRACE;
  auctions.push({id:e.id,s:e.s,by:e.team,t:e.t,end:e.end,high,bids,closed,open:T0<e.end});
  if(closed&&high)claims.push({id:"au:"+e.id,team:high.team,s:e.s,t:e.end,how:"auction",n:high.n});
 }
 // trivia duels: more right answers wins; equal scores go to the faster team; no answer in time forfeits
 const duels=[],ans={};
 for(const e of evs)if(e.k==="duelans")ans[e.ref]=e;
 for(const e of evs)if(e.k==="duel"){
  const a=ans[e.id]&&ans[e.id].team===e.target&&ans[e.id].t<=e.end+DUEL_LATE?ans[e.id]:null;
  let res=null,at=null;
  if(a){res=(e.score>a.score||(e.score===a.score&&e.ms<a.ms))?"attacker":"defender";at=a.t}
  else if(T0>=e.end+DUEL_LATE+DUEL_GRACE){res="attacker";at=e.end}
  duels.push({id:e.id,s:e.s,by:e.team,target:e.target,t:e.t,end:e.end,score:e.score,ms:e.ms,qs:e.qs,seed:e.seed,ans:a,res,at,forfeit:!a&&res==="attacker"});
  if(res==="attacker")claims.push({id:"du:"+e.id,team:e.team,s:e.s,t:at,how:"duel",cond:e.target});
 }
 claims.sort((a,b)=>a.t-b.t||(a.team<b.team?-1:a.team>b.team?1:0)||(a.id<b.id?-1:a.id>b.id?1:0));
 const own={},prev={},applied=[],takes={};for(const id of ids)takes[id]=0;
 for(const c of claims){const cur=own[c.s]??null;
  // a duel only takes the station if the team that was challenged still holds it when it ends
  if(c.cond&&cur!==c.cond)continue;
  prev[c.id]=cur;own[c.s]=c.team;applied.push(c);if(cur&&cur!==c.team&&takes[c.team]!=null)takes[c.team]++}
 for(const D of duels)D.void=D.res==="attacker"&&!applied.some(c=>c.id==="du:"+D.id);
 const fails={},gild={},held={};for(const id of ids)held[id]=0;
 for(const e of evs){if(e.k==="lockfail")(fails[e.s]=fails[e.s]||{})[e.team]=1;if(e.k==="gild")gild[e.s]=Math.max(gild[e.s]||0,e.t)}
 for(const s in own)if(held[own[s]]!=null)held[own[s]]++;
 return _W={own,prev,claims:applied,fails,gild,held,auctions,duels,takes};
}
const tSealed=id=>!!ST[id].lock&&tWorld().own[id]==null;
const tPrice=id=>ST[id].p*STAR_COST;
const tGildedUntil=id=>{const g=tWorld().gild[id];return g&&now()<g+GILD_MS?g+GILD_MS:0};
const tOpenAuction=sid=>tWorld().auctions.find(A=>A.s===sid&&!A.closed)||null;
function tClaim(sid,how){const T=me();T.claims.push({id:T.id+"."+rid(7),s:sid,t:now(),how});tInvalidate()}
function tEv(e){const T=me();e.id=T.id+"."+rid(7);e.t=now();T.ev.push(e);tInvalidate();return e}

// ---------- sync ----------
function tPublishSoon(){clearTimeout(TM.pubT);TM.pubT=setTimeout(tPublish,120)}
async function tPublish(){
 if(tLocal()||!TM.R||!TM.keys)return;const T=me();
 if(TM.meta)TM.R.publish(TM.keys.base+"/meta",await sealMsg(TM.keys.key,{k:"meta",meta:TM.meta}),true);
 if(T)TM.R.publish(TM.keys.base+"/t/"+T.id,await sealMsg(TM.keys.key,{k:"team",team:T}),true);
 // the phone that started the game also carries every team nobody has picked up yet, so joiners can find them
 for(const U of Object.values(TM.teams))if(U!==T&&U.rev===1&&U.by===TM.phone)TM.R.publish(TM.keys.base+"/t/"+U.id,await sealMsg(TM.keys.key,{k:"team",team:U}),true);
}
async function tOnMsg(topic,bytes){
 const m=await openMsg(TM.keys.key,bytes);if(!m)return;
 if(m.k==="meta"&&m.meta){
  if(!TM.meta||(m.meta.rev||0)>(TM.meta.rev||0)){const first=!TM.meta;TM.meta=m.meta;if(first){loadCity(TM.meta.city);tApplyTeamText()}tSave();tRender()}
  return}
 if(m.k==="team"&&m.team){const U=m.team,mine=TM.teams[U.id];
  TM.heard[U.id]=now();TM.heardRev[U.id]=Math.max(TM.heardRev[U.id]||0,U.rev||0);
  if(mine&&U.id===TM.my){
   // another phone on my own team moved us on; the newer state wins, ties go to the later write
   if(U.rev>mine.rev||(U.rev===mine.rev&&U.by!==TM.phone&&(U.at>mine.at||(U.at===mine.at&&U.by>TM.phone)))){TM.teams[U.id]=U;tInvalidate();tAfterSync();tSave();tRender()}
   return}
  if(!mine||U.rev>mine.rev||(U.rev===mine.rev&&U.at>mine.at)){TM.teams[U.id]=U;tInvalidate();tAfterSync();tSave();if(!TM.my||U.id!==TM.my)tRender()}
 }
}
// after (re)connecting, give the relay any team it doesn't have a copy of (a new relay, or one that dropped its memory),
// but never push a copy older than what the relay just sent us
async function tBackfill(){
 if(!TM.R||TM.net!=="live"||!TM.keys)return;
 for(const U of Object.values(TM.teams)){if(U.id===TM.my)continue;const h=TM.heardRev[U.id];
  if(h==null||h<U.rev)TM.R.publish(TM.keys.base+"/t/"+U.id,await sealMsg(TM.keys.key,{k:"team",team:U}),true)}
}
function tAfterSync(){
 if(!TM.my||!me())return;
 if(tProcessIncoming()){tCommitQuiet()}
}
async function tConnect(){
 if(TM.R){TM.R.close();TM.R=null}
 if(tLocal()){TM.net="local";return}
 try{TM.keys=await gameKeys(TM.code)}catch(e){TM.net="insecure";tRender();return}
 TM.R=new Relay(relayUrl(TM.relay),TM.keys.base+"/#",(t,b)=>tOnMsg(t,b),s=>{TM.net=s;if(s==="live"){TM.heardRev={};tPublish();clearTimeout(TM.bfT);TM.bfT=setTimeout(tBackfill,3500)}tRenderNet()});
 TM.R.connect();
}

// ---------- my team's moves ----------
function tCommitQuiet(){const T=me();T.rev++;T.at=now();T.by=TM.phone;tInvalidate();tSave();tPublishSoon()}
const tHopKey=()=>{const h=me().hop;return h?me().boards+":"+(h.arrived?1:0)+":"+(h.settled?1:0):"none"};
function tAct(fn){const k0=tHopKey();fn();if(tHopKey()!==k0)TM.tab=(me().hop&&!me().hop.settled)?"cards":"map";tCommitQuiet();tRender()}
function tCanMove(){const T=me();return !tLocked()&&!T.sz&&(!T.hop||T.hop.settled)&&!T.duel&&!tDuelsDue().length}
function tNextFrom(T){return T.hop&&!T.hop.settled?T.hop.to:T.cur}
function tStartHop(to){
 const T=me();if(!tCanMove()||!ADJ[T.cur].includes(to))return;
 if(T.fx.wrong&&to!==T.fx.wrong.to)return;
 if(T.fx.wrong){tLog("Wrong Platform: "+tName(T.fx.wrong.by)+" picked this stop.");T.fx.wrong=null}
 if(T.boards>0)T.mate=1-T.mate;
 T.boards++;
 T.hop={to,from:T.cur,at:now(),arrived:false,settled:false,first:null,card:null,lock:false};
 tLog(ST[T.cur].n+" to "+ST[to].n+".");
 if(tSealed(to)){T.hop.lock=true;tLog(ST[to].n+" is sealed. The challenge opens on the platform; the card is for chips.")}
 if(T.open){T.hop.card="cont";tLog("Still on "+spec(T.open).n+". No new card until it settles.")}
 else tDrawCard();
 if(T.open&&!T.open.lock&&T.open.started&&CARD[T.open.id].tally&&CARD[T.open.id].tally.perBoard)T.open.canStep=true;
}
function tUnplayable(id){
 const T=me();
 if(id==="G3"&&T.cur&&!STATIONS.some(x=>(dist(T.cur)[x.id]||0)>=18))return "nowhere far enough";
 const h=T.hop,e=h&&h.from?EDGE[h.from+">"+h.to]:null,c=CARD[id];
 if(e&&["walk","bike","funi"].includes(e.m)&&c.ride&&!c.span)return "no train or bus on this hop";
 if(e&&id==="S3"&&!RAIL_MODES.includes(e.m))return "no train car map on this hop";
 return null;
}
function tDrawCard(){
 const T=me();
 if(!T.pile.length){T.pile=shuffle(TEAM_DECK());tLog("The deck is reshuffled.")}
 for(let tries=0;tries<T.pile.length+1&&T.pile.length;tries++){
  const id=T.pile.pop(),why=tUnplayable(id);
  if(why){T.pile.unshift(id);continue}
  tOpenCard(id);T.hop.card=id;return;
 }
 T.hop.card="none";tLog("Nothing playable in the deck right now.");
}
function tOpenCard(id){
 const T=me(),c=CARD[id],f=T.fx;
 const road=f.road&&c.fam!=="Gambit";if(road){f.road=false;tLog("Roadblock: a pass on this card won't win the station.")}
 const second=!!f.second;if(second){f.second=false;tLog("Second Opinion: a stranger has to agree before this card counts.")}
 const rush=!!f.rush;if(rush){f.rush=false;tLog("Rush Hour: time limit halved.")}
 T.open={id,lock:false,drawnAt:now(),drawStops:T.stops,stakes:"set",rush,road,second,started:false,tally:0,strikes:0,list:[],declared:null,listItems:cardListFor(c,T.hop?T.hop.to:T.cur)};
 tLog("You draw "+c.n+".");
}
function tRedraw(){const T=me(),o=T.open;if(!o||o.lock||o.started)return;T.open=null;T.pile.unshift(o.id);tLog(CARD[o.id].n+" can't be played here. Back to the bottom, no penalty.");if(T.hop&&!T.hop.arrived)tDrawCard()}
function tOpenLock(id){
 const T=me(),L=LOCKS[id],W=tWorld();
 if(T.open&&!T.open.lock){T.park=T.open;tLog(spec(T.park).n+" is parked while the sealed challenge runs.")}
 const mine=W.held[T.id]||0,best=Math.max(0,...teamList().filter(t=>t.id!==T.id).map(t=>W.held[t.id]||0));
 const band=mine-best>=2?0.5:best-mine>=2?1.5:1;
 const boost=Object.keys(W.fails[id]||{}).some(x=>x!==T.id)?2:1;
 const pay=Math.round(L.r*band*boost);
 T.open={id,lock:true,drawnAt:now(),drawStops:T.stops,stakes:"lock",started:false,tally:0,strikes:0,list:[],band,boost,pay};
 tLog("Sealed challenge at "+ST[id].n+": "+L.n+". Pays "+pay+(boost>1?" (doubled: another team failed it)":"")+(band!==1?" ("+(band>1?"behind, ×1.5":"ahead, ×0.5")+")":"")+".");
}
function tCanStart(o){
 if(!o||o.started)return {ok:false};
 const sp=spec(o),T=me();
 if(sp.declare&&!o.declared)return {ok:false,why:"Declare a number first."};
 if(sp.ride&&!o.lock&&T.hop&&T.hop.arrived&&!sp.span)return {ok:false,why:"Start it on the train."};
 if(o.lock&&sp.bridge&&!o.bridgeBoarded)return {ok:false,why:sp.bridge.need};
 if(o.id==="G1"&&!o.lock&&!o.stunt)return {ok:false,why:"Pick the Stunt first."};
 if(o.id==="G3"&&!o.lock&&(!o.target||!o.deadline))return {ok:false,why:"Name the station and the minute."};
 if(o.id==="G3"&&!o.lock&&o.deadline<=now())return {ok:false,why:"Pick a minute that hasn't passed."};
 if(o.id==="S1"&&!o.lock&&!(o.est>0))return {ok:false,why:"Enter the stranger's estimate."};
 if(!o.lock&&STATION_STUNTS.includes(o.id)&&!(T.hop&&T.hop.arrived))return {ok:false,why:"Start it on the platform when you arrive."};
 return {ok:true};
}
function tBegin(o){
 const sp=spec(o),T=me();
 o.started=true;o.startStops=T.stops;o.startedAt=now();
 if(sp.timer)o.tEnd=now()+sp.timer*1000*(o.rush?0.5:1);
 if(o.id==="S1"&&!o.lock){o.tEnd=now()+o.est*60000*(o.rush?0.5:1);o.lm=ST[T.cur].lm}
 if(o.id==="G1"&&!o.lock){o.pickAt=T.hop?T.hop.to:T.cur;if(T.hop&&!T.hop.arrived){o.tEnd=null;o.clockOnArrive=true}}
 if(o.id==="G2"&&!o.lock)o.emAt=T.hop?T.hop.to:T.cur;
 if(o.id==="T3"&&!o.lock)o.canStep=true;
 if(o.id==="G5"&&!o.lock){T.fx.bankrun={declared:o.declared,done:0,left:3};tLog("Bank Run: "+o.declared+" of the next three cards.");T.open=null;if(T.hop&&T.hop.first==null)T.hop.first=true;return}
 if(o.id==="G0"&&!o.lock)o.tEnd=now()+10000;
 tLog("Started: "+sp.n+".");
}
function tAfterStop(id){
 const T=me(),o=T.open;if(!o||o.lock)return;const sp=CARD[o.id];
 if(!o.started){if(sp.ride&&!sp.span)tFinish("fail","Doors opened before it started.");return}
 if(o.id==="G4"){o.seen=(o.seen||[]).concat(id);if(o.seen.length>=3)tFinish(o.tally>=7?"win":"fail",o.tally>=7?"":"Doors opened at the third with "+o.tally+" of seven takes.");return}
 if(o.id==="G3"){if(id===o.target)tFinish(now()<=o.deadline?"win":"fail",now()<=o.deadline?"On the platform by "+hhmm(o.deadline)+".":"Late.");return}
 if(o.id==="T4"){tFinish(o.tally>=o.declared?"win":"fail",o.tally>=o.declared?"Declared "+o.declared+", recorded "+o.tally+".":"Got "+o.tally+" of "+o.declared+".");return}
 if(sp.ride&&!sp.span)tFinish("fail","Doors opened first.");
}
function tArrive(){
 const T=me(),h=T.hop;if(!h||h.arrived)return;const id=h.to;
 T.cur=id;T.stops++;h.arrived=true;h.arrivedAt=now();
 const fresh=!T.vis[id];T.vis[id]=1;
 tLog("Doors open at "+ST[id].n+"."+(fresh&&Object.keys(T.vis).length===STATIONS.length?" "+CITY.copy.reached:""));
 if(tSealed(id))tTip("sealed","Sealed station","Gold stations hold a challenge you only see on the platform. Win it for the station and a payout. Fail it and it stays sealed, and the next team to try it gets double. No curse for failing one.");
 if(T.fx.silent>0){T.fx.silent--;if(!T.fx.silent)tLog("Silent Car is over.")}
 const o=T.open;if(o&&o.clockOnArrive){o.tEnd=now()+1800000;o.clockOnArrive=false;tLog(CARD[o.id].n+": 30 minutes from now.")}
 // after a lost duel, the next station reached can't be bought, challenged for or bid on
 T.coolS=null;if(T.fx.cool>0){h.cool=true;T.fx.cool--;T.coolS=id;tLog("Cooling off after the lost duel: no buying, challenging or bidding at "+ST[id].n+".")}
 tAfterStop(id);
 const W=tWorld(),ow=W.own[id];
 if(ow===T.id){h.settled=true;tLog(ST[id].n+" is yours already.")}
 else tMaybeAuction();
}
// may this team buy (or challenge for) the station it's at? true: the card was completed. false: failed, vetoed or no card.
// "wait": a card is still running. Cards that run over several rides decide the station where they finish.
function tFirstOpt(){
 const T=me(),h=T.hop,o=T.open;
 if(h.first!=null)return h.first;
 if(h.card==="none")return false;
 if(o&&!o.lock)return "wait";
 return false;
}
// a failed card puts an unowned station up for auction
function tMaybeAuction(){
 const T=me(),h=T.hop;if(!h||!h.arrived||h.settled||h.lock||h.auc||tLocked())return;
 const id=h.to,W=tWorld();if(W.own[id]!=null||tSealed(id)||tFirstOpt()!==false)return;
 const open=tOpenAuction(id);if(open){h.auc=open.id;return}
 const e=tEv({k:"auction",s:id,end:now()+AUC_MS});h.auc=e.id;
 tLog(ST[id].n+" goes to auction. Every team can bid for two minutes.");
 tTip("auction","Auction","Fail or veto a card at an unowned station and it goes up for auction. Every team bids from their own phone for two minutes, in steps of 5, 10 or 20. Highest bid wins and pays the bank.");
}
function tSetFirst(out){
 const T=me(),h=T.hop;if(!h||h.settled)return;
 h.first=out==="win";if(out==="blocked")h.road=true;
 if(h.arrived)tMaybeAuction();
}
// what completing or failing a card means at the stop this hop is heading for
function tStopHint(win){
 const T=me(),h=T.hop;if(!h||h.lock||h.settled)return "";
 const ow=tWorld().own[h.to];
 if(ow===T.id)return "";
 if(win){if(h.road)return " Roadblock: the station goes to auction instead.";if(h.cool)return " Cooling off: no buying or challenging at this stop.";return ow?" You can challenge "+tName(ow)+" for the station.":" You can buy the station."}
 return ow?" No challenge this visit.":" The station goes to auction.";
}
function tBankrunTick(win){const T=me(),b=T.fx.bankrun;if(!b)return;if(win)b.done++;b.left--;if(b.left<=0||b.done>=b.declared){const ok=b.done>=b.declared,d=ok?10*b.done:-10;T.bank=Math.max(0,T.bank+d);if(d>0)T.credits+=d;tLog("Bank Run: "+b.done+" of "+b.declared+". "+(d>0?"+":"")+d+" chips.");T.fx.bankrun=null}}
function tDrawCurse(why){const T=me();if(!T.cpile.length)T.cpile=shuffle(CURSES.flatMap((c,i)=>[i,i]));const c=T.cpile.pop();
 // four in hand is the most: a fifth pushes out the oldest
 if(T.hand.length>=4){const o=T.hand.shift();tLog("Four curses is the most you can hold. "+CURSES[o].n+", your oldest, is discarded.")}
 T.hand.push(c);tLog(why+". You draw a curse: "+CURSES[c].n+".");
 tTip("curse","Failure creates curses","Fail a card and you draw a random curse to give you an edge on your opponents. Play it on any team, any time, from the Curses screen: it lands on their phone.");tToast("You draw "+CURSES[c].n,CURSES[c].eff+(CURSES[c].k==="gilded"?" Play it from the Curses screen.":" Play it on any team from the Curses screen."))}
function tFinish(out,note){
 const T=me(),o=T.open;if(!o)return;const sp=spec(o);
 if(out==="win"&&!o.lock&&o.second&&!o.secondDone){o.awaitSecond=true;return}
 if(T.hop)T.hop.stakes=o.stakes;
 T.open=null;
 if(o.lock){const id=o.id;
  if(T.park){T.open=T.park;T.park=null;tLog(spec(T.open).n+" resumes.")}
  if(out==="win"){tClaim(id,"lock");T.bank+=o.pay;T.credits+=o.pay;T.stats.locks++;T.stats.cards++;tLog("You win "+ST[id].n+": "+sp.n+(note?" ("+note+")":"")+". +"+o.pay+".");if(T.hop&&T.hop.to===id)T.hop.settled=true;tFlash("Unlocked","You take "+ST[id].n+" and "+o.pay+" chips.","Locked")}
  else{tEv({k:"lockfail",s:id});tLog("You fail "+sp.n+(note?" ("+note+")":"")+". "+ST[id].n+" stays sealed; another team's attempt pays double.");if(T.hop&&T.hop.to===id)T.hop.settled=true;tFlash("Still sealed","Another team's attempt here pays double.","Locked")}
  return}
 const c=CARD[o.id],W=tWorld();
 if(out==="win"){
  let base=typeof c.r==="number"?c.r:0,gain=0;
  if(c.cyt)base=CYT_PAY[o.declared]||0;
  if(c.bonus&&o.bonus)base+=c.bonus.chips;
  if(c.id==="G0"||c.id==="G3"){const b=T.bank;T.bank=Math.floor(b*1.5);T.credits+=T.bank-b;tLog(c.n+": bank "+b+" → "+T.bank+".")}
  const grab=(sid,how,what)=>{if(!sid||!ST[sid])return;const ow=W.own[sid];if(ow&&ow!==T.id)T.stats.tko++;if(ow!==T.id){tClaim(sid,how);tLog(what+" "+ST[sid].n+(ow&&ow!==T.id?" from "+tName(ow):"")+".")}if(T.hop&&T.hop.to===sid)T.hop.settled=true};
  if(c.id==="G1")grab(o.pickAt,"pick","You pickpocket");
  if(c.id==="G2")grab(o.emAt,"eminent","Eminent Domain:");
  if(c.id==="G4"&&o.seen&&o.seen[1])grab(o.seen[1],"grab","You smash and grab");
  if(base>0){gain=base;T.bank+=gain;T.credits+=gain}
  T.stats.cards++;
  tLog("You complete "+c.n+(gain?": +"+gain:"")+(note?" ("+note+")":"")+".");
  if(o.road&&T.hop)T.hop.road=true;
  tBankrunTick(true);tSetFirst(o.road?"blocked":"win");
  tFlash("Complete",(gain?"+"+gain+" chips.":"You complete "+c.n+".")+tStopHint(true),"Take");
  return}
 if(out==="veto"){tLog("You veto "+c.n+"."+tStopHint(false));tSetFirst("fail");return}
 if(c.fam==="Gambit"){
  if(c.id==="G0"||c.id==="G3"){const b=T.bank;T.bank=Math.floor(b/2);tLog("You miss "+c.n+(note?" ("+note+")":"")+": bank "+b+" → "+T.bank+".")}
  else if(c.id==="G1"){const n=Math.floor(T.bank*.3);T.bank-=n;tLog("Pickpocket missed: you lose "+n+" chips.")}
  else tLog("You fail "+c.n+(note?" ("+note+")":"")+".");
 }else{const n=Math.min(cardLoss(c,o),T.bank);T.bank-=n;o.lost=n;tLog("You fail "+c.n+(note?" ("+note+")":"")+(n?". You lose "+n+" chips.":"."))}
 tBankrunTick(false);tSetFirst("fail");
 tDrawCurse("You failed "+c.n);
 tFlash("Fail",(o.lost?"−"+o.lost+" chips.":"Missed.")+(T.hop&&!T.hop.lock&&!T.hop.settled?" "+tStopHint(false).trim():""),"Stunt");
}
function tSettle(v,note){tFinish(v,note)}

// ---------- curses between teams ----------
function tPlayCurse(idx,target,extra){
 const T=me(),ci=T.hand[idx],c=CURSES[ci];if(c==null)return "That curse is gone.";
 if(T.hand.length>3)return "Four in hand: discard one first.";
 if(T.bank<c.chips)return "You need "+c.chips+" chips.";
 const W=tWorld();
 if(c.k==="gilded"){if(!extra||W.own[extra]!==T.id)return "Pick a station you own.";if(W.gild[extra])return "It's already gilded."}
 else if(!target||target===T.id||!TM.teams[target])return "Pick a team.";
 let basis=null;
 if(c.k==="wrong"){const U=TM.teams[target];basis=tNextFrom(U);if(!extra||!ADJ[basis].includes(extra))return "Pick their next stop."}
 T.bank-=c.chips;T.hand.splice(idx,1);
 if(c.k==="gilded"){tEv({k:"gild",s:extra});tLog("You gild "+ST[extra].n+". Nobody can challenge for it until "+hhmm(now()+GILD_MS)+".")}
 else{tEv({k:"curse",c:ci,target,basis,to:extra||null});tLog("You play "+c.n+" on "+tName(target)+(c.k==="wrong"?": their next stop is "+ST[extra].n:"")+".")}
 tFlash(c.n,c.k==="gilded"?"Gilded: "+ST[extra].n+".":"On "+tName(target)+". "+c.eff,"Curse");
 return null;
}
function tApplyCurse(k){const f=me().fx;if(k==="rush")f.rush=true;if(k==="road")f.road=true;if(k==="fare")f.fare=true;if(k==="second")f.second=true;if(k==="silent")f.silent=2;if(k==="jury")f.jury=true}
function tProcessIncoming(){
 const T=me();if(!T||!TM.meta)return false;let ch=false;
 for(const t of teamList()){if(t.id===T.id)continue;const U=TM.teams[t.id];if(!U)continue;
  for(const e of U.ev){
   if(e.k==="curse"&&e.target===T.id&&!T.seen[e.id]){T.seen[e.id]=1;ch=true;const c=CURSES[e.c];let ok=true,why="You'd already moved on, so it fizzles.";
    if(c.k==="wrong"){const b=tNextFrom(T);if(T.fx.wrong){ok=false;why="Another team already picked your next stop, so it fizzles."}else if(b===e.basis&&ADJ[b].includes(e.to))T.fx.wrong={to:e.to,by:t.id};else ok=false}
    else tApplyCurse(c.k);
    T.ev.push({id:T.id+"."+rid(7),k:"cack",ref:e.id,ok,t:now()});
    const said=c.k==="wrong"?"Your next stop is "+ST[e.to].n+".":(c.you||c.eff);
    tLog(tName(t.id)+" plays "+c.n+" on you. "+(ok?said:why));
    tToast(tName(t.id)+" played "+c.n+" on you",ok?said:why);}
   if(e.k==="cack"&&!T.seen["r:"+e.ref]){const mine=T.ev.find(x=>x.id===e.ref&&x.k==="curse");if(mine){T.seen["r:"+e.ref]=1;ch=true;if(!e.ok){const c=CURSES[mine.c];T.bank+=c.chips;tLog(c.n+" on "+tName(t.id)+" fizzled. "+c.chips+" monies back.");tToast(c.n+" fizzled",tName(t.id)+" had already moved on or been picked for. "+c.chips+" monies back.")}}}
  }}
 tInvalidate();const W=tWorld();
 // auctions: the winning team's phone pays once the bidding has closed
 for(const A of W.auctions){if(!A.closed||T.seen["ac:"+A.id])continue;T.seen["ac:"+A.id]=1;ch=true;
  if(A.high&&A.high.team===T.id){const due=A.high.n*(T.fx.fare?2:1),paid=Math.min(due,T.bank);T.bank-=paid;if(T.fx.fare){T.fx.fare=false;tLog("Double Fare on the auction.")}tLog("You win "+ST[A.s].n+" at auction for "+paid+".");tToast("You win "+ST[A.s].n,"Auction, "+paid+" chips.")}
  else if(A.by===T.id||A.bids.some(b=>b.team===T.id))tLog(A.high?tName(A.high.team)+" wins "+ST[A.s].n+" at auction for "+A.high.n+".":"No bids for "+ST[A.s].n+". It stays open.")}
 // trivia duels: a challenge lands, and later the result
 for(const D of W.duels){
  if(D.target===T.id&&!D.res&&!T.seen["dl:"+D.id]){T.seen["dl:"+D.id]=1;ch=true;
   tLog(tName(D.by)+" challenges you for "+ST[D.s].n+": a trivia duel. They got "+D.score+" of "+DUEL_Q+".");
   tToast(tName(D.by)+" challenges you for "+ST[D.s].n,"Trivia duel: beat "+D.score+" of "+DUEL_Q+" to keep it. Play it before your next hop; you have 20 minutes.")}
  if(!D.res||(D.by!==T.id&&D.target!==T.id)||T.seen["dr:"+D.id])continue;
  T.seen["dr:"+D.id]=1;ch=true;const sc=D.ans?D.score+" to "+D.ans.score:"";
  if(D.by===T.id){
   if(D.res==="attacker"&&!D.void){tLog("You win the duel for "+ST[D.s].n+(D.forfeit?": "+tName(D.target)+" didn't play in time.":", "+sc+".")+" It's yours.");tToast("Duel won: "+ST[D.s].n+" is yours",D.forfeit?tName(D.target)+" didn't play in time.":"You beat "+tName(D.target)+", "+sc+".")}
   else if(D.res==="attacker")tLog("Your duel for "+ST[D.s].n+" ended after it had already changed hands, so nothing changes.");
   else{T.fx.cool=1;tLog("You lose the duel for "+ST[D.s].n+", "+sc+". Cooling off: no buying, challenging or bidding at your next station.");tToast("Duel lost: "+tName(D.target)+" keeps "+ST[D.s].n,"No buying, challenging or bidding at your next station.")}
  }else{
   if(D.res==="defender")tLog("You keep "+ST[D.s].n+", "+D.ans.score+" to "+D.score+".");
   else if(!D.void){tLog(tName(D.by)+" takes "+ST[D.s].n+(D.forfeit?": you didn't play the duel in time.":", "+sc+"."));tToast(tName(D.by)+" takes "+ST[D.s].n,D.forfeit?"You didn't play the duel in time.":"They won the duel, "+sc+".")}
  }}
 if(ch)tInvalidate();
 return ch;
}

// ---------- auctions ----------
function tBidBlock(A){
 const T=me();
 if(!A||!A.open)return "The bidding has closed.";
 if(TM.net!=="live"&&!tLocal())return "Reconnect to bid.";
 if(tLocked())return "The hard stop has passed.";
 if(T.fx.jury)return "Jury Duty: no bidding until the take is recorded.";
 if(T.coolS===A.s)return "Cooling off after the lost duel: you can't bid on this one.";
 return null;
}
function tBid(aid,n){
 const T=me(),A=tWorld().auctions.find(x=>x.id===aid),why=tBidBlock(A);if(why)return why;
 if(A.high&&n<=A.high.n)return "Bid more than "+A.high.n+".";
 if(A.high&&A.high.team===T.id)return "You're already the high bid.";
 const cost=n*(T.fx.fare?2:1);if(cost>T.bank)return "You have "+T.bank+" monies"+(T.fx.fare?" (Double Fare doubles it)":"")+".";
 tEv({k:"bid",ref:aid,n});tLog("You bid "+n+" for "+ST[A.s].n+".");return null;
}
function tAucRow(A){
 const T=me(),why=tBidBlock(A),hi=A.high,base=hi?hi.n:0,lead=hi&&hi.team===T.id,fare=T.fx.fare?2:1;
 const btn=k=>{const n=base+k;return `<button data-act="t-bid" data-ref="${A.id}" data-n="${n}" ${why||lead||n*fare>T.bank?"disabled":""}>Bid ${n}</button>`};
 return `<div class="aucrow"><div class="ab-t"><b>Auction: ${esc(ST[A.s].n)}</b><span>worth ${ST[A.s].p} · <span class="num" data-live="auc" data-end="${A.end}">${fmt(A.end-now())}</span></span></div>
  <div class="ab-h small">${hi?(lead?"You lead with "+hi.n:esc(tName(hi.team))+" leads with "+hi.n):"No bids yet. "+(A.by===T.id?"You failed the card here; you can still bid.":esc(tName(A.by))+" failed the card here.")}</div>
  ${why?`<div class="small muted">${esc(why)}</div>`:`<div class="ab-b">${btn(5)}${btn(10)}${btn(20)}</div>`}</div>`;
}
function tAucBar(){const W=tWorld(),open=W.auctions.filter(A=>A.open);return open.length?`<div class="aucbar">${open.map(tAucRow).join("")}</div>`:""}

// ---------- trivia duels ----------
// questions come from the city's trivia bank, plus one question about the board itself
function tRng(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19}let a=h>>>0;
 return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const tShuf=(arr,R)=>{const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const T_RAIL_ORDER={la:["a","b","d","e"],sea:["l1"]};   // lines whose stops on the board run in the real order both ways
function tBoardQ(id){
 const [kind,...p]=id.split(":");
 if(kind==="bn"){const k=p[0],j=+p[1],d=+p[2],path=LINE_PATHS[k];if(!path||!CITY.lines[k])return null;const A=path[j],B=path[j+d],end=d>0?path[path.length-1]:path[0];if(!A||!B||A===end)return null;
  const others=path.filter((x,n)=>Math.abs(n-j)>1);if(others.length<3)return null;
  return {q:"On the "+CITY.lines[k].name+" toward "+ST[end].n+", which stop comes after "+ST[A].n+"?",a:ST[B].n,w:tShuf(others,tRng(id)).slice(0,3).map(x=>ST[x].n)}}
 if(kind==="bl"){const sid=p[0],ks=Object.keys(LINE_PATHS).filter(k=>LINE_PATHS[k].includes(sid));if(!ST[sid]||ks.length!==1)return null;const others=Object.keys(LINE_PATHS).filter(k=>k!==ks[0]);if(others.length<3)return null;
  return {q:"Which line stops at "+ST[sid].n+"?",a:CITY.lines[ks[0]].name,w:tShuf(others,tRng(id)).slice(0,3).map(k=>CITY.lines[k].name)}}
 if(kind==="bh"){const R=tRng(id),hubs=STATIONS.filter(x=>x.p===4),non=STATIONS.filter(x=>x.p<4);if(!hubs.length||non.length<3)return null;const h=hubs[Math.floor(R()*hubs.length)];
  return {q:"Which of these stations is a 4-star hub on the board?",a:h.n,w:tShuf(non,R).slice(0,3).map(x=>x.n)}}
 return null;
}
function tBoardQId(R){
 for(let tries=0;tries<20;tries++){const r=R();
  if(r<0.45){const ks=(T_RAIL_ORDER[CITY.id]||[]).filter(k=>LINE_PATHS[k]);if(!ks.length)continue;const k=ks[Math.floor(R()*ks.length)],n=LINE_PATHS[k].length,d=R()<.5?1:-1,j=d>0?Math.floor(R()*(n-1)):1+Math.floor(R()*(n-1));const id="bn:"+k+":"+j+":"+d;if(tBoardQ(id))return id}
  else if(r<0.85){const single=STATIONS.filter(x=>Object.keys(LINE_PATHS).filter(k=>LINE_PATHS[k].includes(x.id)).length===1);if(!single.length)continue;const id="bl:"+single[Math.floor(R()*single.length)].id;if(tBoardQ(id))return id}
  else{const id="bh:"+Math.floor(R()*1e6);if(tBoardQ(id))return id}}
 return null;
}
function tQuestion(id,seed){
 let raw=null;
 if(id[0]==="c"){const bank=(typeof TRIVIA!=="undefined"&&TRIVIA[CITY.id])||[];raw=bank[+id.slice(1)]||null}else raw=tBoardQ(id);
 if(!raw)return {q:"Question unavailable on this phone. Pick any answer.",opts:["A","B","C","D"],ans:0};
 const opts=tShuf([raw.a,...raw.w.slice(0,3)],tRng(seed+"|"+id));
 return {q:raw.q,opts,ans:opts.indexOf(raw.a)};
}
function tPickQuestions(seed){
 const R=tRng(seed),bank=(typeof TRIVIA!=="undefined"&&TRIVIA[CITY.id])||[];
 const used=new Set(tWorld().duels.flatMap(D=>D.qs||[]));
 let pool=bank.map((q,i)=>({id:"c"+i,d:q.d||2})).filter(x=>!used.has(x.id));
 if(pool.length<DUEL_Q)pool=bank.map((q,i)=>({id:"c"+i,d:q.d||2}));
 const take=(d,n,out)=>{const c=tShuf(pool.filter(x=>x.d===d&&!out.includes(x.id)),R);for(const x of c.slice(0,n))out.push(x.id)};
 const out=[];const b=tBoardQId(R),want=DUEL_Q-(b?1:0);
 take(1,2,out);take(2,2,out);take(3,1,out);
 for(const x of tShuf(pool,R))if(out.length<want&&!out.includes(x.id))out.push(x.id);
 out.length=Math.min(out.length,want);
 if(b)out.push(b);
 while(out.length<DUEL_Q){const x=tBoardQId(R);if(!x)break;if(!out.includes(x))out.push(x)}
 return tShuf(out,R);
}
// the defending team: challenges it still has to answer
function tDuelsDue(){const T=me();if(!T)return [];return tWorld().duels.filter(D=>D.target===T.id&&!D.res&&now()<=D.end&&!T.ev.some(e=>e.k==="duelans"&&e.ref===D.id))}
const tMyChallenge=sid=>{const T=me();return tWorld().duels.find(D=>D.by===T.id&&D.s===sid&&!D.res)||null};
function tCanChallenge(sid){
 const T=me(),h=T.hop,ow=tWorld().own[sid];
 if(!h||!h.arrived||h.settled||h.to!==sid||!ow||ow===T.id||tLocked())return {ok:false};
 if(h.cool)return {ok:false,why:"Cooling off after the lost duel: no challenge here."};
 if(h.road)return {ok:false,why:"Roadblock: this card can't win the station."};
 if(T.fx.jury)return {ok:false,why:"Jury Duty: no challenges until the take is recorded."};
 const g=tGildedUntil(sid);if(g)return {ok:false,why:"Gilded until "+hhmm(g)+": nobody can challenge for it."};
 if(tMyChallenge(sid))return {ok:false,why:"Your challenge here is still waiting on "+tName(ow)+"."};
 const f=tFirstOpt();if(f!==true)return {ok:false,why:f==="wait"?"":"No completed card, so no challenge this visit."};
 return {ok:true,ow};
}
function tStartChallenge(sid){
 const T=me(),cc=tCanChallenge(sid);if(!cc.ok)return;
 const seed=rid(8);
 T.duel={mode:"attack",s:sid,other:cc.ow,qs:tPickQuestions(seed),seed,i:0,qStart:null,picks:[],ms:0,phone:TM.phone,done:false};
 tLog("You challenge "+tName(cc.ow)+" for "+ST[sid].n+": a trivia duel.");
}
function tStartDefense(ref){
 const T=me(),D=tDuelsDue().find(x=>x.id===ref);if(!D||T.duel)return;
 T.duel={mode:"defend",ref:D.id,s:D.s,other:D.by,qs:D.qs,seed:D.seed,i:0,qStart:null,picks:[],ms:0,phone:TM.phone,done:false,beat:D.score,beatMs:D.ms,end:D.end};
}
function tDuelAnswer(pick){
 const T=me(),d=T.duel;if(!d||d.done||d.qStart==null||now()<d.qStart)return;
 const Q=tQuestion(d.qs[d.i],d.seed),took=Math.min(DUEL_S*1000,now()-d.qStart),ok=pick!=null&&pick===Q.ans;
 d.picks.push({o:pick,ok,ms:took});d.ms+=took;d.last={i:d.i,pick,ans:Q.ans,ok};d.i++;
 if(d.i>=d.qs.length)tDuelFinish();else d.qStart=now()+1200;   // a beat to see the answer; it doesn't count toward the next question
}
function tDuelFinish(){
 const T=me(),d=T.duel,score=d.picks.filter(p=>p.ok).length;d.done=true;d.score=score;d.doneAt=now();
 if(d.mode==="attack"){
  const e=tEv({k:"duel",s:d.s,target:d.other,qs:d.qs,seed:d.seed,score,ms:d.ms,end:now()+DUEL_WIN});d.ref=e.id;
  tLog("Duel for "+ST[d.s].n+": you got "+score+" of "+d.qs.length+" in "+Math.round(d.ms/1000)+" s. "+tName(d.other)+" has 20 minutes to beat it.");
  if(T.hop&&T.hop.to===d.s&&!T.hop.settled)T.hop.settled=true;
 }else{tEv({k:"duelans",ref:d.ref,score,ms:d.ms});tLog("You answer "+tName(d.other)+"'s duel for "+ST[d.s].n+": "+score+" of "+d.qs.length+".")}
}


// ---------- the count ----------
function tScore(){
 const W=tWorld(),ids=teamList().map(t=>t.id),R={};
 for(const id of ids)R[id]={prop:0,maj:0,cr:0,stars:0,names:[],tot:0,held:W.held[id]||0};
 for(const s of STATIONS){const o=W.own[s.id];if(o&&R[o])R[o].prop+=s.p}
 const rows=[];
 for(const m of MAJ){const cnt=Object.fromEntries(ids.map(id=>[id,m.ids.filter(x=>W.own[x]===id).length])),mx=Math.max(0,...Object.values(cnt)),win=mx>0?ids.filter(id=>cnt[id]===mx):[];for(const id of win)R[id].maj+=m.pts/win.length;rows.push({m,cnt,win})}
 for(const id of ids){const T=TM.teams[id];if(T)R[id].cr=Math.floor((T.credits+T.bank)/20)}
 // bonus stars are only worked out at the final count: nobody sees who's leading for them while the game is on
 if(tLocked())for(const [k,lab] of [["cards","Showman"],["tko","Highwayman"],["locks","Lockpick"],["vis","Explorer"]]){
  const v=Object.fromEntries(ids.map(id=>{const T=TM.teams[id];return [id,!T?0:k==="vis"?Object.keys(T.vis).length:k==="tko"?W.takes[id]||0:T.stats[k]||0]})),mx=Math.max(0,...Object.values(v));if(mx<=0)continue;
  const win=ids.filter(id=>v[id]===mx);for(const id of win){R[id].stars+=3/win.length;R[id].names.push(lab+(win.length>1?" (shared)":""))}}
 for(const id of ids){const r=R[id];r.tot=Math.round((r.prop+r.maj+r.cr+r.stars)*10)/10}
 const order=ids.slice().sort((a,b)=>R[b].tot-R[a].tot||R[b].held-R[a].held);
 return {R,rows,order};
}
const n1=x=>Math.round(x*10)/10;

// ---------- layovers ----------
// layovers come every three hours from the start of the game, for every team at the same time
const tLayWin=()=>TM.meta?Math.floor((now()-TM.meta.startedAt)/LAY_EVERY):0;
const tLayDue=()=>{const T=me();return !!TM.meta&&tLayWin()>=1&&(T.layWin||0)<tLayWin()};
const tLayHere=()=>{const T=me();if(T.sz||(T.hop&&!T.hop.settled))return false;return tLayDue()};

// ---------- wording for team play ----------
// curses: the victim's phone reads them in the second person. Failed cards send stations to auction, and stations
// change hands between teams by trivia duel.
const T_CURSE_TEXT={
 rush:["Their next card's time limit is halved.","Your next card's time limit is halved."],
 road:["Their next Take or Stunt can't win them the station. Complete it and they keep the monies, but the station goes to auction.","Your next Take or Stunt can't win you the station. Complete it and you keep the monies, but the station goes to auction."],
 wrong:["You pick their next stop from the stations next to them.","They picked your next stop."],
 fare:["Their next buy or winning bid costs double.","Your next buy or winning bid costs double."],
 gilded:["Pick a station you own. Nobody can challenge for it for the next two hours.","","Two hours"],
 silent:["They may not speak to a stranger until the doors open at their second stop from now.","Don't speak to a stranger until the doors open at your second stop from now."],
 jury:["They can't buy, bid or challenge a station until they record a political take from someone under 25 or over 65.","You can't buy, bid or challenge a station until you record a political take from someone under 25 or over 65."],
};
function tApplyTeamText(){
 for(const c of CURSES){const x=T_CURSE_TEXT[c.k];if(x){c.eff=x[0];c.you=x[1];if(x[2])c.dur=x[2]}}
}

// ================= teams: screens =================
const tUnvisited=()=>{const T=me();return STATIONS.filter(s=>!T.vis[s.id])};
function tNextRec(){
 const T=me(),c=T.cur,u=tUnvisited();if(!u.length)return ADJ[c][0];
 let best=null,bt=1e9;
 for(const n of ADJ[c]){const d=dist(n);const t=Math.min(...u.map(s=>(s.id===n?0:d[s.id]??1e9)))+EDGE[c+">"+n].t;if(t<bt){bt=t;best=n}}
 return best;
}
function tView(extra){
 const T=me(),W=tWorld();
 const st=Object.fromEntries(STATIONS.map(s=>[s.id,{o:W.own[s.id]!=null?tIdx(W.own[s.id]):null,vis:T?!!T.vis[s.id]:true,gild:!!W.gild[s.id]}]));
 const trains=teamList().map(t=>{const U=TM.teams[t.id];if(!U)return null;const riding=U.hop&&!U.hop.arrived;return {at:riding?U.hop.to:U.cur,from:riding?U.hop.from:null,k:tIdx(t.id),me:t.id===TM.my}}).filter(Boolean);
 return Object.assign({st,cur:T?T.cur:null,sel:TM.sel,trains},extra||{});
}
const go=(attrs,t1,t2)=>`<button class="fgo" ${attrs}><b>${t1}</b>${t2?`<span>${t2}</span>`:""}</button>`;
const side=(attrs,t1,t2)=>`<button class="fside" ${attrs}>${t1}${t2?`<small>${t2}</small>`:""}</button>`;
function tNav(info){
 const T=me(),h=T.hop,due=tDuelsDue();let main="",sides="",chips="";
 if(T.duel)main=go('data-act="t-duelopen"',"Back to the trivia duel",T.duel.mode==="attack"?"For "+esc(ST[T.duel.s].n):esc(tName(T.duel.other))+" wants "+esc(ST[T.duel.s].n));
 else if(due.length&&!(h&&!h.arrived)){const D=due[0];main=go(`data-act="t-duelplay" data-ref="${D.id}"`,"Trivia duel: "+esc(tName(D.by))+" wants "+esc(ST[D.s].n),`Beat ${D.score} of ${DUEL_Q} · <span class="num" data-live="duel" data-end="${D.end}">${fmt(D.end-now())}</span> left to play`)}
 else if(tLocked())main=go('data-act="t-tab" data-t="more"',"Time: go to the count","The hard stop has passed");
 else if(T.sz)main=(now()<T.sz.end?go('data-act="t-szend"',"Layover","Ask the staff about the place and the neighbourhood, then review the food. <span id=\"szleft\">"+fmt(T.sz.end-now())+"</span> left").replace('class="fgo"','class="fgo" disabled'):go('data-act="t-szend"',"Back to the game",`Layover near ${esc(ST[T.sz.id].n)} is over`));
 else if(h&&!h.arrived){main=go('data-act="t-arrive"',"Doors open at "+esc(ST[h.to].n),esc(viaTxt(h.from,h.to)));sides=due.length?side(`data-act="t-duelplay" data-ref="${due[0].id}"`,"Duel",""):side('data-act="t-tab" data-t="cards"',"Card","")}
 else if(h&&!h.settled)main=go('data-act="t-tab" data-t="cards"',"Settle "+esc(ST[h.to].n),"You're on the platform");
 else if(tLayHere()){main=go('data-act="t-szstart"',"Start the layover",`Every team eats now. Riders from your last train pick the place, ${LAY_MIN} minutes`)}
 else if(T.fx.wrong){const to=T.fx.wrong.to;main=go(`data-act="t-hop" data-id="${to}"`,"Doors closing: "+esc(ST[to].n),`${esc(tName(T.fx.wrong.by))} picked it with Wrong Platform · ${esc(viaTxt(T.cur,to))}`)}
 else{
  const rec=tNextRec(),picked=TM.sel&&ADJ[T.cur].includes(TM.sel),W=tWorld();
  if(T.boards===0&&!picked){main=`<div class="fgo ask"><b>Where to first?</b><span>Pick a station next door</span></div>`;
   chips=ADJ[T.cur].map(id=>`<button class="fchip" data-act="t-pick" data-id="${id}"><b>${esc(ST[id].n)}</b><span>${esc(viaTxt(T.cur,id))}${tSealed(id)?" · sealed":""}</span></button>`).join("");
   return `<div class="fbottom">${info||""}${showKey?legendHTML():""}${tAucBar()}<div class="fchips">${chips}</div><div class="fnav sheet">${main}</div></div>`}
  const cand=picked?TM.sel:rec,ow=W.own[cand];
  const bits=[viaTxt(T.cur,cand)];if(tSealed(cand))bits.push("sealed");else if(ow)bits.push(ow===T.id?"yours":esc(tName(ow))+"'s");
  if(T.open)bits.push(esc(spec(T.open).n)+" carries on");
  main=go(`data-act="t-hop" data-id="${cand}"`,"Doors closing: "+esc(ST[cand].n),bits.join(", "));
  chips=ADJ[T.cur].filter(x=>x!==cand).map(id=>`<button class="fchip" data-act="t-pick" data-id="${id}"><b>${esc(ST[id].n)}</b><span>${esc(viaTxt(T.cur,id))}</span></button>`).join("");
  if(rec!==cand&&tUnvisited().length)chips=`<button class="fchip hint" data-act="t-pick" data-id="${rec}"><b>Nearest new stop</b><span>${esc(ST[rec].n)}</span></button>`+chips;
 }
 return `<div class="fbottom">${info||""}${showKey?legendHTML():""}${tAucBar()}${chips?`<div class="fchips">${chips}</div>`:""}<div class="fnav sheet">${main}${sides}</div></div>`;
}
const netDot=()=>tLocal()?"":`<i class="net ${TM.net}" title="${{live:"Synced",connecting:"Connecting",offline:"Offline: moves sync when you're back",off:"Not connected",refused:"Relay refused",insecure:"Needs https"}[TM.net]||""}"></i>`;
function tHud(){
 const T=me(),W=tWorld(),sc=tScore(),rivals=teamList().filter(t=>t.id!==T.id);
 const fx=[];for(const k of ["jury","silent","wrong","fare","road","rush","second"])if(T.fx[k]){const cu=CURSES.find(x=>x.k===k);fx.push(`<button class="fx" data-act="t-curseinfo" data-k="${k}">${cu.n}</button>`)}
 if(T.fx.cool>0||(T.hop&&T.hop.cool&&!T.hop.settled))fx.push(`<button class="fx" data-act="t-curseinfo" data-k="cool">Cooling off</button>`);
 return `<div class="fhud"><div class="fplates${rivals.length>=4?" many":""}"><div class="fp tm up" style="--tc:${tCol(T.id)}"><b>${esc(tInfo(T.id).name)}</b><span>${T.bank}</span></div>${rivals.map(t=>`<button class="frv" style="--tc:${tCol(t.id)}" data-act="${tLocal()?"t-switch":"t-tab"}" data-t="${tLocal()?t.id:"more"}" aria-label="${tLocal()?"Switch to "+esc(tName(t.id)):esc(tName(t.id))+": "+W.held[t.id]+" stations"}"><i></i>${tLocal()?esc(tName(t.id).slice(0,8))+" ":""}${W.held[t.id]}</button>`).join("")}</div>
  <div class="fmenu"><button data-act="t-tab" data-t="curses" aria-label="Curses, count and settings">☰${T.hand.length?` <span class="cnt">${T.hand.length}</span>`:""}</button></div>${fx.length?`<div class="ffx">${fx.join("")}</div>`:""}
  <div class="fclock tclock">${netDot()} ${tUnvisited().length} left · ${tClockLeft()} to the stop</div></div>`;
}
function tRenderNet(){for(const el of document.querySelectorAll("i.net"))el.className="net "+TM.net;}
function tRenderMap(m){
 const T=me(),W=tWorld();
 const own=JSON.stringify(W.own),pops=[];if(TM.lastOwn){const old=JSON.parse(TM.lastOwn);for(const s of STATIONS)if((old[s.id]??null)!==(W.own[s.id]??null))pops.push(s.id)}TM.lastOwn=own;
 const h=T.hop,next=h&&!h.arrived?h.to:(!h||h.settled)?(T.fx.wrong?T.fx.wrong.to:(TM.sel&&ADJ[T.cur].includes(TM.sel))?TM.sel:tNextRec()):null;
 let info="";
 if(TM.sel&&TM.sel!==T.cur){const s=ST[TM.sel],ow=W.own[TM.sel];info=`<div class="selinfo"><b>${esc(s.n)}</b> · ${ow==null?(tSealed(TM.sel)?"Sealed":"Unowned"):ow===T.id?"Yours":"Owned by "+esc(tName(ow))} · ${ST[TM.sel].p} ${ST[TM.sel].p===1?"star":"stars"} · costs ${tPrice(TM.sel)}${tGildedUntil(TM.sel)?" · gilded until "+hhmm(tGildedUntil(TM.sel)):""}${tOpenAuction(TM.sel)?" · up for auction":""}</div>`}
 const chrome=`${tHud()}<div class="mapctl"><button data-act="t-zoom" data-z="1.25" aria-label="Zoom in">+</button><button data-act="t-zoom" data-z="0.8" aria-label="Zoom out">−</button><button data-act="t-recenter" aria-label="Back to your train">◎</button><button data-act="t-key" aria-pressed="${showKey}">Key</button></div>${tNav(info)}`;
 liveMap(m,tView(),{pops,next},chrome);
 const focusId=T.cur+">"+(next||"");
 if(focusId!==mapFocus){mapFocus=focusId;requestAnimationFrame(()=>centerMap(T.cur,next,false))}
}
function tRenderTop(t){
 const T=me(),W=tWorld();
 t.innerHTML=`<div class="hud thud"><div class="pl tm up" style="--tc:${tCol(T.id)}"><span class="nm">${esc(tInfo(T.id).name)}</span><span class="bank">${T.bank}</span></div><div class="trow">${teamList().filter(x=>x.id!==T.id).map(x=>tLocal()?`<button class="tdot sw" style="--tc:${tCol(x.id)}" data-act="t-switch" data-t="${x.id}" aria-label="Switch to ${esc(tName(x.id))}"><i></i>${W.held[x.id]}</button>`:`<span class="tdot" style="--tc:${tCol(x.id)}"><i></i>${W.held[x.id]}</span>`).join("")}</div></div>
 <div class="tnav"><button class="back" data-act="t-back">‹ Back to the game</button><span></span><button data-act="t-tab" data-t="curses" aria-pressed="${TM.tab==="curses"}">Curses${T.hand.length?` <span class="cnt">${T.hand.length}</span>`:""}</button><button data-act="t-tab" data-t="more" aria-pressed="${TM.tab==="more"}">More</button></div>`;
}
function tHopStrip(){
 const T=me(),h=T.hop;if(!h)return "";const to=ST[h.to],from=h.from?ST[h.from]:null;
 return `<div class="strip"><div class="s-route">${from?esc(from.n)+" <i>›</i> ":""}<b>${esc(to.n)}</b></div><div class="s-meta">${h.arrived?"On the platform.":esc(viaTxt(h.from||h.to,h.to))+"."}</div></div>`;
}
function tActionBar(){
 const T=me(),h=T.hop;if(tLocked()||T.sz||!h)return "";
 if(!h.arrived)return `<div class="actbar"><button class="ink go" data-act="t-arrive">Doors open at ${esc(ST[h.to].n)}</button></div>`;
 if(h.settled)return `<div class="actbar"><button class="ink go" data-act="t-tab" data-t="map">Back to the map</button></div>`;
 return "";
}
function tStationPanel(id){
 const T=me(),s=ST[id],W=tWorld(),ow=W.own[id],pr=tPrice(id),h=T.hop,o=T.open,fare=T.fx.fare?2:1,g=tGildedUntil(id);
 const rideOn=`<button class="ink bigbtn" data-act="t-done">Ride on</button>`;
 let x=`<div class="stp"><div class="hd"><div><h2 class="d">${esc(s.n)}</h2><div class="small muted">${ow==null?(tSealed(id)?"Sealed":"Unowned"):ow===T.id?"Yours":"Owned by "+esc(tName(ow))}${g?" · gilded until "+hhmm(g):""}</div></div><span class="price" title="Stars at the count">★ ${s.p}</span></div>`;
 if(ow==null){
  if(tSealed(id)){
   const dbl=Object.keys(W.fails[id]||{}).some(x=>x!==T.id);
   if(o&&o.lock)x+=`<div class="banner" style="border-color:var(--gold)">${esc(LOCKS[id].n)} is open. Run it below.</div>`;
   else if(o&&!spec(o).span)x+=`<div class="banner warn">${esc(spec(o).n)} is still open. Settle it (it pays monies), then open the sealed challenge.</div>`;
   else x+=`<div class="banner" style="border-color:var(--gold)">A sealed challenge waits here. Open it on camera.${dbl?" <b>Pays double:</b> another team failed it.":""}${o?" "+esc(spec(o).n)+" pauses while you try.":""}</div><button class="ink bigbtn" data-act="t-lockopen">Open the sealed challenge</button>`;
  }else{
   const f=tFirstOpt(),cost=pr*fare,A=tOpenAuction(id);
   if(A)x+=`<div class="banner">${A.by===T.id?"The card failed, so ":esc(tName(A.by))+" failed a card here, so "}${esc(s.n)} is up for auction. Every team can bid from their phone until the clock runs out.</div>${tAucRow(A)}${rideOn}`;
   else if(f==="wait")x+=`<div class="banner">You're on ${esc(spec(o).n)}. Complete it here and you can buy ${esc(s.n)}. Fail it and the station goes to auction.</div>`;
   else if(f===true&&h.cool)x+=`<div class="banner warn">Cooling off after the lost duel: no buying at ${esc(s.n)}. Buying opens again at your next station.</div>${rideOn}`;
   else if(f===true)x+=`<div class="banner">You completed the card: ${esc(s.n)} is yours to buy.</div><div class="row"><button class="tc bigbtn" style="--tc:${tCol(T.id)}" data-act="t-buy" ${T.bank<cost||T.fx.jury?"disabled":""}>Buy it for ${cost}${fare>1?" (Double Fare)":""}</button><button class="bigbtn" data-act="t-done">Leave it</button></div>${T.fx.jury?`<div class="small muted">Jury Duty: no buying until the take is recorded.</div>`:T.bank<cost?`<div class="small muted">Not enough chips.</div>`:""}`;
   else{const closed=h.auc&&W.auctions.find(a=>a.id===h.auc);
    x+=`<div class="banner">${closed?(closed.high?esc(tName(closed.high.team))+" won it at auction for "+closed.high.n+".":"The auction closed with no bids. It stays open for the next team that completes a card here."):h.road?"Roadblock: the card paid monies but can't win the station.":h.card==="none"?"No card this hop.":"The card didn't count."}</div>${rideOn}`}
  }
 }else if(ow!==T.id){
  const cc=tCanChallenge(id),mine=tMyChallenge(id),f=tFirstOpt();
  if(mine)x+=`<div class="banner">Your challenge for ${esc(s.n)} is waiting on ${esc(tName(ow))}: they have until ${hhmm(mine.end)} to play it.</div>${rideOn}`;
  else if(f==="wait"&&!cc.why)x+=`<div class="banner">${esc(tName(ow))}'s station. Complete ${esc(spec(o).n)} here and you can challenge them for it.</div>`;
  else if(cc.ok)x+=`<div class="banner">You completed the card. Challenge ${esc(tName(ow))} for ${esc(s.n)}?</div><div class="small">A trivia duel: ${DUEL_Q} questions, ${DUEL_S} seconds each. You answer now. ${esc(tName(ow))} then has 20 minutes to beat your score and can't start a hop until they've played. Same score: the faster team wins. Lose, and you can't buy, challenge or bid at your next station.</div><div class="row"><button class="tc bigbtn" style="--tc:${tCol(T.id)}" data-act="t-challenge">Challenge</button><button class="bigbtn" data-act="t-done">Leave it</button></div>`;
  else x+=`<div class="banner">${esc(tName(ow))}'s station.${cc.why?" "+esc(cc.why):""}</div>${rideOn}`;
 }else x+=`<div class="banner ok">Yours.</div>${rideOn}`;
 return x+`</div>`;
}
function tOpenPanel(o){
 const sp=spec(o),fam=o.lock?"Locked":sp.fam,T=me();
 const rewardTxt=sp.rtxt||(typeof sp.r==="number"?String(sp.r)+" monies":sp.r);
 let body=`<dl><dt>Do this</dt><dd>${esc(sp.d)}</dd><dt>Counts</dt><dd>${esc(sp.c)}</dd><dt>Limit</dt><dd>${esc(sp.t)}${o.rush?" <b>Halved: Rush Hour.</b>":""}</dd><dt>${o.lock?"Win":"Reward"}</dt><dd>${esc(o.lock?"The station and "+o.pay+" monies"+(o.boost>1?" (doubled after another team's fail)":"")+(o.band>1?" (behind: ×1.5)":o.band<1?" (ahead: ×0.5)":""):rewardTxt)}${!o.lock?". Complete it and you can buy the station (or challenge for it)":""}</dd>${!o.lock?`<dt>Fail</dt><dd>Lose ${sp.cyt?"the monies you declared":Math.ceil((typeof sp.r==="number"?sp.r:0)/2)+" monies"}, the station goes to auction, and you draw a curse</dd>`:""}${!o.lock&&o.id==="S1"?`<dt>Landmark</dt><dd><b>${esc(o.lm||ST[T.hop?T.hop.to:T.cur].lm)}</b></dd>`:""}</dl>`;
 if(!o.started){
  if(!o.lock&&sp.declare)body+=`<div><div class="lbl" style="margin-bottom:6px">Declare how many takes</div><div class="stakes decl">${sp.declare.map(n=>`<button aria-pressed="${o.declared==n}" data-act="t-decl" data-n="${n}">${n} takes<span>+${CYT_PAY[n]} if you get them · −${CYT_PAY[n]} if you don't</span></button>`).join("")}</div></div>`;
  if(!o.lock&&o.id==="S1")body+=`<div><label class="lbl" for="test">Stranger's estimate (minutes)</label><input id="test" data-in="est" type="number" inputmode="numeric" min="1" max="60" value="${o.est||""}"></div>`;
  if(!o.lock&&o.id==="G1")body+=`<div><label class="lbl" for="tstunt">Stunt</label><select id="tstunt" data-in="stunt"><option value="">Choose…</option>${STATION_STUNTS.map(id=>`<option value="${id}" ${o.stunt===id?"selected":""}>${esc(CARD[id].n)}</option>`).join("")}</select></div>${o.stunt?`<div class="small"><b>${esc(CARD[o.stunt].n)}:</b> ${esc(CARD[o.stunt].d)} Counts: ${esc(CARD[o.stunt].c)}</div>`:""}`;
  if(!o.lock&&o.id==="G3"){const dd=dist(T.cur);const opts=STATIONS.filter(x=>(dd[x.id]||0)>=18);body+=`<div class="grid2"><div><label class="lbl" for="ttgt">Station</label><select id="ttgt" data-in="tgt"><option value="">Choose…</option>${opts.map(x=>`<option value="${x.id}" ${o.target===x.id?"selected":""}>${esc(x.n)}</option>`).join("")}</select></div><div><label class="lbl" for="tdl">By</label><input id="tdl" data-in="dl" type="time" value="${o.deadline?hhmm(o.deadline):""}"></div></div>`}
  if(o.lock&&sp.bridge)body+=`<button data-act="t-bridgeboard" ${o.bridgeBoarded?"disabled":""}>${esc(o.bridgeBoarded?sp.bridge.boarded:sp.bridge.board)}</button>`;
  const cs=tCanStart(o),why=!o.lock?tUnplayable(o.id):null;
  body+=`<div class="row"><button class="ink bigbtn" data-act="t-begin" ${cs.ok?"":"disabled"}>${o.lock?"Start the challenge":o.id==="G5"?"Lock in the declaration":"Start"}</button>${!o.lock?`<button class="bad" data-act="t-veto">Veto</button>`:""}</div>${cs.why?`<div class="small muted">${esc(cs.why)}</div>`:""}${!o.lock&&(why||(!cs.ok&&sp.span))?`<button data-act="t-redraw">Can't be played here (${esc(why||cs.why)}): redraw, no penalty</button>`:""}`;
  if(o.lock)body+=`<div class="small muted">Attempt it here. Leaving without finishing fails it.</div>`;
 }else body+=tLivePanel(o,sp);
 const f0=cardFace(fam,sp.n,body,`<span class="fam">${esc(tInfo(T.id).name)}</span>`);return now()-o.drawnAt<1500?f0.replace('class="cf ','class="cf new '):f0;
}
function tLivePanel(o,sp){
 const T=me();let x="";
 if(o.awaitSecond)return `<div class="call"><div class="d" style="font-size:20px">Second Opinion</div><div class="small">Put one of your takes to strangers, one at a time. One agree saves the card. Three disagrees fail it.</div><div class="meter"><div><div class="lbl">Disagrees</div><div class="v num">${o.secondNo||0} / 3</div></div></div><div class="grid2"><button class="good" data-act="t-secondyes">Agrees</button><button class="bad" data-act="t-secondno">Disagrees</button></div></div>`;
 const meter=(lab,v,extra)=>`<div class="meter"><div><div class="lbl">${lab}</div><div class="v num">${v}</div></div>${extra||""}</div>`;
 if(o.expired)x+=`<div class="call"><div class="d" style="font-size:20px">Time is up.</div><div class="grid2"><button class="bad" data-act="t-timefail">It fails</button><button class="good" data-act="t-timeplus">Grant 2 more minutes</button></div></div>`;
 else if(o.tEnd)x+=meter("Time left",`<span data-live="tleft" data-p="t">${fmt(o.tEnd-now())}</span>`);
 if(sp.watch)x+=meter("Stopwatch",`<span data-live="watch" data-p="t">${o.wStart?Math.floor((now()-o.wStart)/1000):0}</span> / ${sp.watch}`,`<button data-act="${o.wStart?"t-pause":"t-wstart"}" class="${o.wStart?"bad":"ink"}">${o.wStart?"Paused over 3 s":"Start"}</button>`);
 if(sp.lap)x+=meter("Attempt "+(o.strikes+1)+" of "+sp.strikes.max,`<span data-live="lapleft" data-p="t">${o.lapEnd?fmt(o.lapEnd-now()):fmt(sp.lap*1000)}</span>`,o.lapEnd?"":`<button class="ink" data-act="t-lapstart">Start 60 s</button>`);
 if(sp.hold)x+=meter(o.lock?"Level with the wheel":"Hands off",`<span data-live="hold" data-p="t">${o.hStart?Math.min(sp.hold,Math.floor((now()-o.hStart)/1000)):0}</span> / ${sp.hold} s`,`<button class="ink" data-act="t-holdstart" ${o.hStart?"disabled":""}>${o.lock?"Go":"Hands off"}</button>`);
 if(sp.study)x+=meter("Study the map",`<span data-live="study" data-p="t">${o.sEnd?fmt(o.sEnd-now()):"1:00"}</span>`,`<button data-act="t-studystart" ${o.sEnd?"disabled":""}>Start 60 s</button>`);
 if(sp.poll){const v=o.votes||[0,0];x+=meter("Votes",`${v[0]+v[1]} / ${sp.poll}`,`<div class="small num">For ${v[0]} · Against ${v[1]}</div>`)+`<div class="grid2"><button class="good" data-act="t-vote" data-v="0">For</button><button class="bad" data-act="t-vote" data-v="1">Against</button></div>`}
 if(sp.tally){const tg=sp.tally.target||(o.declared||0);
  x+=meter(sp.tally.label+"s",`${o.tally}${tg?" / "+tg:""}`,`<div class="row" style="flex:0 0 auto"><button class="good" data-act="t-tally" ${sp.tally.perBoard&&!o.canStep?"disabled":""}>${sp.tally.label}</button>${sp.tally.reset?`<button class="bad" data-act="t-treset">${sp.tally.reset}</button>`:""}${sp.tally.failOn?`<button class="bad" data-act="t-tfail">${sp.tally.failOn}</button>`:""}</div>`);
  if(sp.tally.perBoard)x+=`<div class="small muted">One step per ride. ${o.canStep?"This ride's step is available.":"Step done on this ride; the next opens on your next hop."}</div>`}
 if(sp.strikes&&!sp.lap)x+=meter(sp.strikes.label,`${o.strikes} / ${sp.strikes.max}`,`<button class="bad" data-act="t-strike">${sp.strikes.label}</button>`);
 if(sp.throws)x+=meter("In the cup",`${o.tally} / ${sp.throws.target}`,`<div class="small num">Throws ${o.strikes} / ${sp.throws.max}</div>`)+`<div class="grid2"><button class="good" data-act="t-throwin">In</button><button data-act="t-throwout">Miss</button></div>`;
 if(sp.list)x+=meter("Checked",`${o.list.length} / ${sp.listTarget||sp.list.length}`)+`<div class="checks">${sp.list.map((it,i)=>`<button data-act="t-check" data-i="${i}" aria-pressed="${o.list.includes(i)}">${o.list.includes(i)?"✓":"○"} ${esc(it)}${(sp.req||[]).includes(i)?" (required)":""}</button>`).join("")}</div>`;
 if(sp.bonus)x+=`<button data-act="t-bonus" aria-pressed="${!!o.bonus}">${o.bonus?"✓":"○"} ${esc(sp.bonus.label)} (+${sp.bonus.chips})</button>`;
 if(!o.lock&&o.id==="G4")x+=`<div class="small muted">Stations passed: ${(o.seen||[]).map(id=>esc(ST[id].n)).join(", ")||"none yet"} of 3. Seven takes by the third; the middle one is the prize.</div>`;
 if(!o.lock&&o.id==="G0")x+=`<div class="grid2"><div><label class="lbl" for="tdc">${esc(upName(T))}'s number</label><input id="tdc" data-in="dc" type="number" inputmode="numeric" value="${o.dc??""}"></div><div><label class="lbl" for="tsc">${esc(camName(T))}'s count</label><input id="tsc" data-in="sc" type="number" inputmode="numeric" value="${o.sc??""}"></div></div><button class="ink" data-act="t-dblcheck">Compare</button>`;
 if(o.lock&&sp.bridge)x+=`<button class="ink" data-act="t-bridgeend">${esc(sp.bridge.end)}</button>`;
 if(o.call){const what=o.call==="win"?"It counts":"It doesn't count";
  x+=o.dispute?`<div class="call"><div class="d">Replay the clip together now.</div><div class="grid2"><button class="good" data-act="t-agree" data-v="${o.call}">Agreed: ${what}</button><button class="bad" data-act="t-agree" data-v="${flip(o.call)}">Agreed: ${o.call==="win"?"it doesn't":"it counts"}</button></div><button data-act="t-coin">Still split: flip a coin</button></div>`
   :`<div class="call"><div><span class="lbl">${esc(camName(T))}'s call</span><div class="d" style="font-size:20px">${what}</div></div><div class="grid2"><button class="ink" data-act="t-accept">${esc(upName(T))} accepts</button><button data-act="t-dispute">Dispute</button></div></div>`}
 else if(needsCall(o,sp))x+=`<div class="lbl">Does it count? Be honest on camera.</div><div class="grid2"><button class="good" data-act="t-call" data-v="win">It counts</button><button class="bad" data-act="t-call" data-v="fail">It doesn't</button></div>`;
 if(!o.lock&&sp.vetoAny)x+=`<button class="bad" data-act="t-veto">Veto</button>`;
 if(!o.lock&&(sp.span||!sp.ride))x+=`<button class="bad ghost" data-act="t-giveup">Give up (counts as a fail)</button>`;
 return x;
}
function tRenderCards(m){
 const T=me(),h=T.hop;let x=`<div class="stack">${tHopStrip()}${h&&h.arrived&&!h.settled?"":tAucBar()}`;
 if(h&&h.arrived&&!h.settled)x+=`<div class="card settle">${tStationPanel(h.to)}</div>`;
 if(T.open)x+=tOpenPanel(T.open);
 if(T.park)x+=`<div class="card small muted">${esc(spec(T.park).n)} is parked and resumes after the sealed challenge.</div>`;
 if(!T.open&&!(h&&h.arrived&&!h.settled))x+=`<div class="card"><h2 class="d">No card open</h2><div class="small muted">${h&&!h.arrived?"This hop has no card.":"The next card draws itself when the doors close."}</div></div>`;
 x+=tActionBar()+`</div>`;m.innerHTML=x;tBindInputs(m);
}
function tRenderCurses(m){
 const T=me(),W=tWorld(),rivals=teamList().filter(t=>t.id!==T.id),need=T.hand.length>3;
 let x=`<div class="stack">${tAucBar()}<div class="card small muted">You draw a curse when you fail a card or a sealed challenge. Play it on any team, any time: it lands on their phone. Keep three at most.</div><div class="card"><h2 class="d">Your curses</h2>${need?`<div class="banner bad">Four curses in hand. Discard one before playing.</div>`:""}`;
 T.hand.forEach((ci,i)=>{const c=CURSES[ci],afford=T.bank>=c.chips,pk=TM.cpick&&TM.cpick.i===i?TM.cpick:{};
  x+=`<div class="cur"><b>${esc(c.n)}</b><div class="small">${esc(c.eff)}</div><div class="small muted">When: ${esc(c.when)} · ${esc(c.dur)} · ${esc(c.cost)}</div>`;
  if(c.k==="gilded"){const mine=STATIONS.filter(s=>W.own[s.id]===T.id&&!W.gild[s.id]);
   x+=`<label class="lbl" for="tg${i}">Your station</label><select id="tg${i}"><option value="">Pick one…</option>${mine.map(s=>`<option value="${s.id}">${esc(s.n)}</option>`).join("")}</select><div class="row"><button class="ink" data-act="t-cplay" data-i="${i}" ${need||!afford||tLocked()||!mine.length?"disabled":""}>Gild it${!afford?" (need "+c.chips+")":""}</button><button data-act="t-cdisc" data-i="${i}">Discard</button></div>`}
  else{x+=`<div class="tchips">${rivals.map(t=>`<button class="tchip" style="--tc:${tCol(t.id)}" aria-pressed="${pk.target===t.id}" data-act="t-ctarget" data-i="${i}" data-t="${t.id}">${esc(t.name)}</button>`).join("")}</div>`;
   if(c.k==="wrong"&&pk.target&&TM.teams[pk.target]){const U=TM.teams[pk.target],b=tNextFrom(U);x+=`<label class="lbl" for="tw${i}">${esc(tName(pk.target))}'s next stop after ${esc(ST[b].n)}</label><select id="tw${i}">${ADJ[b].map(id=>`<option value="${id}">${esc(ST[id].n)}</option>`).join("")}</select>`}
   x+=`<div class="row"><button class="ink" data-act="t-cplay" data-i="${i}" ${need||!afford||tLocked()||!pk.target?"disabled":""}>${pk.target?"Play on "+esc(tName(pk.target)):"Pick a team"}${!afford?" (need "+c.chips+")":""}</button><button data-act="t-cdisc" data-i="${i}">Discard</button></div>`}
  x+=`</div>`});
 if(!T.hand.length)x+=`<div class="small muted">No curses in hand.</div>`;
 x+=`</div>`;
 const on=[];const f=T.fx;
 for(const k of ["jury","silent","wrong","fare","road","rush","second"])if(f[k]){const cu=CURSES.find(c=>c.k===k);on.push(`<div class="cur"><b>${cu.n}</b><div class="small">${k==="wrong"?esc(tName(f.wrong.by))+" picked your next stop: "+esc(ST[f.wrong.to].n)+".":k==="silent"?esc(cu.you||cu.eff)+" "+f.silent+" to go.":esc(cu.you||cu.eff)}</div>${k==="jury"?`<button class="good" data-act="t-jurydone">${esc(camName(T))} confirms: the take is recorded</button>`:""}</div>`)}
 x+=`<div class="card"><h2 class="d">On you</h2>${on.join("")||`<div class="small muted">Nothing right now.</div>`}</div>`;
 m.innerHTML=x+`</div>`;
}
function tFeed(){
 const W=tWorld(),items=[],how={buy:"buys",take:"takes",buyout:"buys out",lock:"wins the sealed",pick:"pickpockets",eminent:"claims, by Eminent Domain,",grab:"smashes and grabs",auction:"wins at auction",duel:"wins the duel for"};
 for(const c of W.claims){const p=W.prev[c.id];items.push({t:c.t,k:c.team,x:`${tName(c.team)} ${how[c.how]||"claims"} ${ST[c.s].n}${c.how==="auction"?" for "+c.n:""}${p&&p!==c.team?" from "+tName(p):""}`})}
 for(const A of W.auctions){items.push({t:A.t,k:A.by,x:`${ST[A.s].n} goes to auction after ${tName(A.by)} fails a card there`});if(A.closed&&!A.high)items.push({t:A.end,k:A.by,x:`No bids for ${ST[A.s].n}`})}
 for(const D of W.duels){items.push({t:D.t,k:D.by,x:`${tName(D.by)} challenges ${tName(D.target)} for ${ST[D.s].n}: ${D.score} of ${DUEL_Q}`});if(D.res==="defender")items.push({t:D.at,k:D.target,x:`${tName(D.target)} keeps ${ST[D.s].n}, ${D.ans.score} to ${D.score}`})}
 for(const t of teamList()){const U=TM.teams[t.id];if(!U)continue;for(const e of U.ev){
  if(e.k==="curse")items.push({t:e.t,k:t.id,x:`${tName(t.id)} curses ${tName(e.target)}: ${CURSES[e.c].n}`});
  if(e.k==="lockfail")items.push({t:e.t,k:t.id,x:`${tName(t.id)} fails the sealed challenge at ${ST[e.s].n}`});
  if(e.k==="gild")items.push({t:e.t,k:t.id,x:`${tName(t.id)} gilds ${ST[e.s].n}`})}}
 return items.sort((a,b)=>b.t-a.t).slice(0,40);
}
function tInviteLink(){const base=location.href.split("#")[0];return base+"#join="+TM.code+"&city="+TM.meta.city+(TM.relay&&TM.relay!=="hivemq"?"&relay="+encodeURIComponent(TM.relay):"")}
function tRenderMore(m){
 const T=me(),W=tWorld(),sc=tScore(),host=TM.meta.host===TM.phone;
 const seen=id=>tLocal()||id===TM.my?"this phone":TM.heard[id]?(now()-TM.heard[id]<120000?"live":"seen "+Math.round((now()-TM.heard[id])/60000)+" min ago"):"not heard yet";
 let x=`<div class="stack">${tAucBar()}<div class="card"><h2 class="d">${tLocked()?"Final count":"Live count"}</h2><div class="board">${sc.order.map((id,i)=>{const r=sc.R[id],U=TM.teams[id];return `<div class="brow" style="--tc:${tCol(id)}"><span class="rk num">${i+1}</span><div class="bn"><b>${esc(tInfo(id).name)}${id===TM.my?" (you)":""}</b><span>${esc(tInfo(id).mates.filter(Boolean).join(" & "))} · ${r.held} station${r.held===1?"":"s"} · ${seen(id)}</span><span class="bd">Monies ${U?U.bank:"?"} · Stars ${n1(r.tot)} · Curses ${U?U.hand.length:"?"}${tLocked()&&r.names.length?` · Bonus: ${esc(r.names.join(", "))}`:""}</span></div><span class="bt num">${n1(r.tot)}</span></div>`}).join("")}</div>
 ${tLocked()?`<div class="banner ok">${esc(tName(sc.order[0]))} wins.</div>`:""}</div>`;
 x+=`<div class="card"><h3 class="d">Areas</h3>${sc.rows.map(r=>`<div class="arow"><b>${esc(r.m.n)}</b><span class="small muted">${r.m.ids.length} stations, worth ${r.m.pts}</span><div class="tchips">${teamList().map(t=>`<span class="tdot" style="--tc:${tCol(t.id)}"><i></i>${r.cnt[t.id]}</span>`).join("")}${r.win.length?`<span class="small">${r.win.length>1?"split":esc(tInfo(r.win[0]).name)+" leads"}</span>`:""}</div></div>`).join("")}</div>`;
 x+=`<div class="card"><h3 class="d">What's happening</h3><div class="log">${tFeed().map(e=>`<div><time class="num">${hhmm(e.t)}</time><span><i class="tdot" style="--tc:${tCol(e.k)}"><i></i></i> ${esc(e.x)}</span></div>`).join("")||'<div class="muted">Nothing yet.</div>'}</div></div>`;
 x+=`<div class="card"><h3 class="d">Sealed stations</h3>${LOCK_IDS.map(id=>{const ow=W.own[id],f=Object.keys(W.fails[id]||{});return `<div class="small">${esc(ST[id].n)}: ${ow?"won by "+esc(tName(ow)):f.length?"sealed; "+f.map(tName).map(esc).join(", ")+" failed it, so it pays double to anyone else":"sealed"}</div>`}).join("")}</div>`;
 if(!tLocal())x+=`<div class="card invite"><h3 class="d">Invite a phone</h3><div class="code num">${TM.code}</div><div class="small muted">Open Metro Mash, tap Join with a code, and type this in. Or send the link.${TM.relay!=="hivemq"?" Relay: "+esc(relayName(TM.relay))+".":""}</div><div id="qr" class="qr"></div><div class="row"><button data-act="t-copylink">Copy invite link</button><button data-act="t-qr">Show QR code</button></div></div>`;
 x+=`<div class="card"><h2 class="d">Show mode</h2><p class="small">Full-screen graphics for the edit. Turn on screen recording, open a graphic, and tap the screen once to hide the buttons.</p><button class="ink bigbtn" data-act="t-showopen" data-m="live">Live board and leaderboard</button><button class="bigbtn" data-act="t-showopen" data-m="replay">Replay the day</button><button class="bigbtn" data-act="t-showopen" data-m="explain">Rules explainer</button></div>`;
 x+=`<div class="card"><label class="lbl">Hard stop: ${hhmm(TM.meta.stopTs)} (${tMinsLeft()} min left)</label>${host?`<div class="row"><button data-act="t-extend" data-m="60">+1 hour for everyone</button><button data-act="t-extend" data-m="-30">−30 min</button></div>`:`<div class="small muted">The phone that started the game can move it.</div>`}<div class="small muted">Sync: ${esc(relayName(TM.relay))}, ${TM.net==="live"?"connected":TM.net}. Messages are encrypted with the game code.</div><div class="row"><button data-act="t-howto">How the game works</button><button data-act="t-resync">Reconnect</button></div>
  <label class="lbl" for="tmrelay">Switch relay</label><select id="tmrelay">${RELAYS.map(r=>`<option value="${r.id}" ${TM.relay===r.id?"selected":""}>${r.n}</option>`).join("")}${RELAYS.find(r=>r.id===TM.relay)?"":`<option value="${esc(TM.relay)}" selected>Custom relay</option>`}</select><div class="small muted">If phones stop syncing, switch every phone in the game to the same relay here. Nothing is lost: each phone sends its team again.</div></div>`;
 x+=`<div class="card"><h2 class="d">Your ledger</h2><div class="log">${T.log.map(e=>`<div><time class="num">${hhmm(e.t)}</time><span>${esc(e.x)}</span></div>`).join("")}</div></div>`;
 x+=`<div class="card"><h3 class="d">Leave</h3><div class="small muted">Leaving keeps the game on this phone; come back from the Metro Mash menu.</div><div class="row"><button data-act="t-home">Back to all games</button><button class="bad" data-act="t-forget">Remove this game from this phone</button></div><div id="tfg" hidden class="banner bad">Your team's state stays on the other phones and the relay. <button class="bad" data-act="t-reallyforget">Remove it</button></div></div>`;
 m.innerHTML=x+`</div>`;
 const rs=$("#tmrelay");if(rs)rs.addEventListener("change",()=>{TM.relay=rs.value;tSave();tConnect();tToast("Relay: "+relayName(TM.relay),"Every phone in the game has to use the same one.");tRender()});
}
// ---------- the trivia duel screen ----------
function tRenderDuel(force){
 let el=$("#duel");if(!el){el=document.createElement("div");el.id="duel";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.hidden=true;document.body.appendChild(el)}
 const T=MODE==="teams"&&TM.my?TM.teams[TM.my]:null,d=T&&T.duel;
 if(!d){clearTimeout(tRenderDuel.t);TM.duelKey=null;if(!el.hidden){el.hidden=true;el.innerHTML=""}document.body.classList.remove("induel");return}
 const key=[d.i,d.qStart,d.done,d.phone,d.mode,d.ref||"",now()<(d.qStart||0)?"beat":"q",d.mode==="defend"&&d.qStart==null&&now()>d.end?"late":"",d.done?JSON.stringify((tWorld().duels.find(x=>x.id===d.ref)||{}).res||""):""].join("|");
 if(!force&&key===TM.duelKey&&!el.hidden)return;
 TM.duelKey=key;clearTimeout(tRenderDuel.t);el.hidden=false;document.body.classList.add("induel");
 const st=esc(ST[d.s].n),other=esc(tName(d.other)),n=d.qs.length,right=d.picks.filter(p=>p.ok).length;
 const head=`<div class="dhd"><span>Trivia duel · ${st}</span><span>${d.mode==="attack"?"You vs "+other:other+" vs you"}</span></div>`;
 const prog=i=>`<div class="dprog"><span>Question ${Math.min(i+1,n)} of ${n}</span><span>${right} right</span></div>`;
 if(d.phone!==TM.phone){el.innerHTML=`${head}<div class="dbody"><h2 class="d">Your teammate's phone is running this duel.</h2><p class="small muted">Answer on that phone. If it's gone, run the duel here instead.</p><button class="ink bigbtn" data-act="t-duelhere">Run it on this phone</button></div>`;return}
 if(d.done){
  let msg="",sub="";
  if(d.mode==="attack"){msg=`You got ${d.score} of ${n}`;sub=`${other} has until ${hhmm(d.doneAt+DUEL_WIN)} to beat it, and can't start a hop until they've played. You'll hear how it went.`}
  else{const D=tWorld().duels.find(x=>x.id===d.ref)||{};
   if(D.res==="defender"){msg=`You keep ${st}`;sub=`You got ${d.score} of ${n}; ${other} got ${D.score}.`}
   else if(D.res==="attacker"){msg=`${other} takes ${st}`;sub=D.ans?`You got ${d.score} of ${n}; they got ${D.score}${d.score===D.score?", and they were faster":""}.`:"The answer came in too late."}
   else{msg=`You got ${d.score} of ${n}`;sub="Waiting for the result to sync."}}
  el.innerHTML=`${head}<div class="dbody"><div class="dscore num">${d.score}<small>/${n}</small></div><h2 class="d">${msg}</h2><p class="small">${sub}</p><p class="small muted">${Math.round(d.ms/1000)} seconds in all.</p><button class="ink bigbtn" data-act="t-dueldone">Back to the game</button></div>`;return}
 if(d.qStart==null){
  if(d.mode==="attack")el.innerHTML=`${head}<div class="dbody"><h2 class="d">Challenge ${other} for ${st}</h2><p>Five questions about ${esc(CITY.name)}, ${DUEL_S} seconds each. Both of you can call the answer; the first tap counts.</p><p class="small muted">${other} then has 20 minutes to beat your score. Same score: the faster team wins. Lose, and you can't buy, challenge or bid at your next station.</p><button class="ink bigbtn" data-act="t-duelstart">Start</button><button class="bigbtn" data-act="t-duelcancel">Not now</button></div>`;
  else if(now()>d.end)el.innerHTML=`${head}<div class="dbody"><h2 class="d">Time ran out</h2><p>The 20 minutes to play ${other}'s duel are up, so ${st} goes to them.</p><button class="ink bigbtn" data-act="t-duelcancel">Back to the game</button></div>`;
  else el.innerHTML=`${head}<div class="dbody"><h2 class="d">${other} challenges you for ${st}</h2><p>They got <b>${d.beat} of ${n}</b> in ${Math.round(d.beatMs/1000)} seconds. Beat it to keep the station; same score, the faster team wins.</p><p class="small muted">Five questions, ${DUEL_S} seconds each. <span class="num" data-live="duel" data-end="${d.end}">${fmt(d.end-now())}</span> left to start.</p><button class="ink bigbtn" data-act="t-duelstart">Start</button><button class="bigbtn" data-act="t-duelcancel">Later</button></div>`;
  return}
 if(now()<d.qStart&&d.last){const Q=tQuestion(d.qs[d.last.i],d.seed);
  el.innerHTML=`${head}${prog(d.last.i)}<div class="dq">${esc(Q.q)}</div><div class="dopts">${Q.opts.map((o,j)=>`<button disabled class="${j===Q.ans?"right":j===d.last.pick?"wrong":""}">${esc(o)}</button>`).join("")}</div><div class="dnote">${d.last.pick==null?"Out of time.":d.last.ok?"Right.":"Not that one."}</div>`;
  tRenderDuel.t=setTimeout(()=>tRenderDuel(),d.qStart-now()+20);return}
 const Q=tQuestion(d.qs[d.i],d.seed),el0=now()-d.qStart,left=Math.max(0,DUEL_S*1000-el0);
 el.innerHTML=`${head}${prog(d.i)}<div class="dbar"><i style="animation-duration:${DUEL_S*1000}ms;animation-delay:-${Math.min(el0,DUEL_S*1000)}ms"></i></div><div class="dq">${esc(Q.q)}</div><div class="dopts">${Q.opts.map((o,j)=>`<button data-act="t-dpick" data-i="${d.i}" data-o="${j}">${esc(o)}</button>`).join("")}</div>`;
 const i0=d.i,q0=d.qStart;
 tRenderDuel.t=setTimeout(()=>{const T2=me(),d2=T2&&T2.duel;if(d2&&!d2.done&&d2.i===i0&&d2.qStart===q0&&d2.phone===TM.phone){tDuelAnswer(null);tCommitQuiet();tRender()}},left+40);
}
function tFlash(title,body,fam){TM.reveal={fam:fam||"Curse",n:title,d:body};TM.revealUntil=now()+2200}
// toasts queue up, so a curse landing and a curse drawn at the same moment are both seen
// a quick explainer the first two times something happens on this phone
function tTip(k,n,d){const t=lsGet("mm.tips")||{};if((t[k]||0)>=2)return;t[k]=(t[k]||0)+1;lsSet("mm.tips",t);tToast(n,d)}
function tToast(n,d){TM.toastQ=TM.toastQ||[];const l=TM.toastQ[TM.toastQ.length-1];if(!(l&&l.n===n&&l.d===d))TM.toastQ.push({n,d});if(TM.toastQ.length>6)TM.toastQ.shift()}
function tRenderOv(){
 const ov=$("#ov");
 if(TM.reveal&&now()<TM.revealUntil){const r=TM.reveal;ov.hidden=false;ov.className="ov";ov.setAttribute("data-act","t-closereveal");
  ov.innerHTML=`<div class="reveal">${cardFace(r.fam,r.n,`<p>${esc(r.d)}</p><div class="small muted">Tap to continue</div>`,r.sub?`<span class="fam">${esc(r.sub)}</span>`:"")}</div>`;
  clearTimeout(tRenderOv.t);if(TM.revealUntil-now()<1e9)tRenderOv.t=setTimeout(()=>{TM.reveal=null;tRenderOv()},Math.max(0,TM.revealUntil-now()));
 }else{ov.hidden=true;ov.innerHTML=""}
 let tz=$("#toast");if(!tz){tz=document.createElement("div");tz.id="toast";document.body.appendChild(tz)}
 let t=TM.toast;
 if((!t||t.gone||now()-t.t>=6000)&&TM.toastQ&&TM.toastQ.length){t=TM.toast=Object.assign(TM.toastQ.shift(),{t:now()})}
 if(t&&now()-t.t<6000&&!t.gone){tz.hidden=false;const sh=document.querySelector(".fbottom"),tb=$("#top");if(TM.tab==="map"&&sh){tz.style.top="auto";tz.style.bottom=(innerHeight-sh.getBoundingClientRect().top+8)+"px"}else{tz.style.bottom="auto";tz.style.top=((tb&&tb.offsetParent?tb.getBoundingClientRect().bottom:0)+8)+"px"}
  tz.innerHTML=`<div class="tst" data-act="t-toastx"><b>${esc(t.n)}</b>${t.d?`<span>${esc(t.d)}</span>`:""}</div>`;clearTimeout(tRenderOv.tt);tRenderOv.tt=setTimeout(()=>{tz.hidden=true;if(TM.toastQ&&TM.toastQ.length)tRenderOv()},6000-(now()-t.t)+20)}else tz.hidden=true;
}

// ---------- before play: start a game, join one, pick your team ----------
function tSetupDefaults(){
 const st=new Date();st.setHours(16,15,0,0);
 return {n:3,start:"together",stop:"16:15",relay:"hivemq",custom:"",teams:TEAM_NAMES.map((n,i)=>({name:n,m:["","","",""],pc:2,col:T_DEFCOL[i]}))};
}
function tRenderSetup(){
 const U=TM.setup,top=$("#top"),m=$("#main");
 document.body.classList.remove("playing","onmap","oncard");
 top.innerHTML=`<div class="r"><div><div class="lbl">Metro Mash · ${esc(CITY.name)}${U.local?" · one phone":""}</div><h1 class="d">Team selector</h1></div><button class="back" data-act="t-home">‹ All games</button></div>`;
 const ends=CITY.ends;
 m.innerHTML=`<div class="stack">
  <div class="card"><div class="r"><h2 class="d">${U.local?"Players":"Teams"}</h2>
   <div class="stepper"><button data-act="t-n" data-d="-1" ${U.n<=2?"disabled":""} aria-label="One fewer">−</button><b class="num">${U.n} ${U.local?"players":"teams"}</b><button data-act="t-n" data-d="1" ${U.n>=6?"disabled":""} aria-label="One more">+</button></div></div>
   ${U.teams.slice(0,U.n).map((t,i)=>`<div class="tset" style="--tc:var(--p${i+1})"><label class="lbl" for="tn${i}">${U.local?"Player":"Team"} ${i+1}</label><input id="tn${i}" data-tf="name" data-i="${i}" value="${esc(t.name)}" autocomplete="off" maxlength="16" placeholder="${U.local?"Name":""}"><div class="mates" ${U.local?"hidden":""}><div class="mrow">${t.m.slice(0,t.pc).map((nm,j)=>`<input id="tm${i}_${j}" data-tf="m" data-i="${i}" data-j="${j}" value="${esc(nm)}" placeholder="Player ${j+1}" autocomplete="off" aria-label="Team ${i+1}, player ${j+1}">`).join("")}<button class="pc" data-act="t-pc" data-i="${i}" data-d="-1" ${t.pc<=1?"disabled":""} aria-label="One player fewer">−</button><button class="pc" data-act="t-pc" data-i="${i}" data-d="1" ${t.pc>=4?"disabled":""} aria-label="One player more">+</button></div></div><div class="swatches" role="radiogroup" aria-label="Team ${i+1} colour">${T_PAL.map(c=>{const taken=U.teams.slice(0,U.n).some((o,j)=>j!==i&&o.col===c[0]);return `<button class="sw" role="radio" style="--sw:${c[2]};--swd:${c[3]}" aria-checked="${t.col===c[0]}" aria-label="${c[1]}${taken?", taken":""}" ${taken?"disabled":""} data-act="t-col" data-i="${i}" data-k="${c[0]}"></button>`}).join("")}</div></div>`).join("")}
  </div>
  <div class="card setrow"><div><div class="lbl">Start</div><div class="stakes slim${U.flash?" flash":""}"><button aria-pressed="${U.start==="together"}" data-act="t-start" data-k="together">Together</button><button aria-pressed="${U.start==="spread"}" data-act="t-start" data-k="spread" ${U.local?"disabled":""}>Spread out</button></div></div><div><label class="lbl" for="tstop">Hard stop</label><input id="tstop" type="time" data-tf="stop" value="${esc(U.stop)}"></div></div>
  <div class="startpick${U.flash?" flash":""}" role="status" data-k="${U.start}">${U.start==="together"?`✓ Everyone starts at <b>${esc(ST[START_ID].n)}</b>.`:`✓ ${U.teams.slice(0,U.n).map((t,i)=>`<span class="sp" style="--tc:var(--p${i+1})">${esc(t.name||TEAM_NAMES[i])} · ${esc(ST[ends[i%ends.length]].n)}</span>`).join("")}`}</div>
  <button class="ink bigbtn" data-act="t-create">${U.local?"Start the game":"Create the game"}</button>
  <details class="card" ${U.relay!==RELAYS[0].id?"open":""} ${U.local?"hidden":""}><summary class="lbl">Sync relay</summary><div class="small muted">Phones talk through a free public relay. Every phone in the game must use the same one; invite links carry it. Messages are encrypted with the game code.</div><select id="trelay" data-tf="relay">${RELAYS.map(r=>`<option value="${r.id}" ${U.relay===r.id?"selected":""}>${r.n}</option>`).join("")}<option value="custom" ${U.relay==="custom"?"selected":""}>Custom (wss://…)</option></select>${U.relay==="custom"?`<input id="tcustom" data-tf="custom" value="${esc(U.custom)}" placeholder="wss://your-broker/mqtt" autocomplete="off">`:""}</details>
 </div>`;
 m.querySelectorAll("[data-tf]").forEach(el=>el.addEventListener(el.tagName==="SELECT"?"change":"input",()=>{const k=el.dataset.tf,i=+el.dataset.i;if(k==="m")U.teams[i].m[+el.dataset.j]=el.value;else if(k==="name")U.teams[i][k]=el.value;else U[k]=el.value;if(k==="relay")tRender()}));
 U.flash=0;
}
function tCreate(){
 const U=TM.setup;const n=U.n;
 const [hh,mm]=(U.stop||"16:15").split(":").map(Number);const d=new Date();d.setHours(hh,mm,0,0);if(d.getTime()<=now()+5*60000)d.setDate(d.getDate()+1);
 const relay=U.local?"local":U.relay==="custom"?(U.custom||"").trim():U.relay;
 if(!U.local&&U.relay==="custom"&&!/^wss?:\/\//.test(relay)){tFlash("Relay address","A custom relay starts with wss://","Curse");tRenderOv();return}
 const teams=U.teams.slice(0,n).map((t,i)=>({id:"t"+(i+1),name:(t.name||TEAM_NAMES[i]).trim().slice(0,16)||TEAM_NAMES[i],mates:t.m.slice(0,t.pc).map(x=>x.trim().slice(0,24)),col:t.col||T_DEFCOL[i],start:U.start==="spread"?CITY.ends[i%CITY.ends.length]:START_ID}));
 const meta={v:2,rev:1,city:CITY.id,startedAt:now(),stopTs:d.getTime(),start:U.start,teams,host:TM.phone,done:false,first:teams[Math.floor(Math.random()*teams.length)].id};
 TM.code=newCode();TM.relay=relay;TM.meta=meta;TM.teams={};for(const t of teams)TM.teams[t.id]=tFresh(t,meta);TM.my=U.local?meta.first:null;TM.setup=null;
 lsSet(APP_KEY,Object.assign(appState(),{intent:"resume",joinCode:null}));
 tApplyTeamText();tInvalidate();tSave();tConnect();tRender();
}
function tRenderJoin(){
 const J=TM.join,top=$("#top"),m=$("#main");
 document.body.classList.remove("playing","onmap","oncard");
 top.innerHTML=`<div class="r"><div><div class="lbl">Metro Mash · Teams</div><h1 class="d">Join a game</h1></div><button class="back" data-act="t-home">‹ All games</button></div>`;
 m.innerHTML=`<div class="stack"><div class="card"><label class="lbl" for="tcode">Game code</label><input id="tcode" class="codein num" value="${esc(J.code)}" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC123">
  ${J.waiting?`<div class="banner">${TM.net==="live"?"Connected. Looking for game "+esc(J.code)+"…":"Connecting to the relay…"}</div>`:""}${J.err?`<div class="banner bad">${esc(J.err)}</div>`:""}
  <button class="ink bigbtn" data-act="t-joingo" ${J.waiting?"disabled":""}>Join</button></div>
  <details class="card" ${J.custom||TM.relay!==RELAYS[0].id?"open":""}><summary class="lbl">Sync relay</summary><div class="small muted">Use the same relay as the phone that started the game. An invite link sets it for you.</div><select id="tjrelay">${RELAYS.map(r=>`<option value="${r.id}" ${TM.relay===r.id?"selected":""}>${r.n}</option>`).join("")}<option value="custom" ${J.custom?"selected":""}>Custom (wss://…)</option></select>${J.custom?`<input id="tjcustom" value="${esc(J.customUrl||"")}" placeholder="wss://your-broker/mqtt" autocomplete="off" autocapitalize="off" spellcheck="false">`:""}</details></div>`;
 const inp=$("#tcode");inp.addEventListener("input",()=>{J.code=cleanCode(inp.value);if(inp.value!==J.code)inp.value=J.code});
 $("#tjrelay").addEventListener("change",e=>{const v=e.target.value;J.custom=v==="custom";if(!J.custom)TM.relay=v;else if(J.customUrl)TM.relay=J.customUrl;tRender()});
 const cu=$("#tjcustom");if(cu)cu.addEventListener("input",()=>{J.customUrl=cu.value.trim();if(/^wss?:\/\//.test(J.customUrl))TM.relay=J.customUrl});
}
function tJoinGo(){
 const J=TM.join;J.code=cleanCode(($("#tcode")||{}).value||J.code);J.err=null;
 if(J.code.length!==6){J.err="Codes are six letters and numbers.";tRender();return}
 TM.code=J.code;TM.meta=null;TM.teams={};J.waiting=true;tConnect();tRender();
 clearTimeout(J.t);J.t=setTimeout(()=>{if(!TM.meta&&TM.join){TM.join.waiting=false;TM.join.err=TM.net==="live"?"No game with that code on this relay. Check the code, or the relay the host picked.":"Can't reach the relay. Check your connection, or try another relay.";if(TM.R){TM.R.close();TM.R=null}tRender()}},12000);
}
function tRenderPick(){
 const top=$("#top"),m=$("#main");document.body.classList.remove("playing","onmap","oncard");
 top.innerHTML=`<div class="r"><div><div class="lbl">Metro Mash · ${esc(CITY.name)} · game ${esc(TM.code)}</div><h1 class="d">Team selector</h1></div><button class="back" data-act="t-home">‹ All games</button></div>`;
 m.innerHTML=`<div class="stack compact"><div class="tpicks">${teamList().map(t=>`<button class="tpick" style="--tc:${tCol(t.id)}" data-act="t-pickteam" data-t="${t.id}"><b>${esc(t.name)}</b><span>${esc(t.mates.filter(Boolean).join(" & ")||t.mates.length+(t.mates.length===1?" player":" players"))}</span></button>`).join("")}</div>
  <button class="bigbtn" data-act="t-howto">How the game works</button><div class="card invite"><div class="lbl">Game code</div><div class="code num">${TM.code}</div><div class="small muted">Other phones: open Metro Mash, tap Join with a code, type this in. ${TM.net==="live"?"Synced.":"Connecting…"}</div><div id="qr" class="qr"></div><div class="row"><button data-act="t-copylink">Copy invite link</button><button data-act="t-qr">Show QR code</button></div></div></div>`;
}
function tRender(){
 if(MODE!=="teams")return;
 if(TM.meta)tApplyColors(tMetaCols());else if(TM.setup)tApplyColors(TM.setup.teams.map(t=>t.col));
 const top=$("#top"),m=$("#main");$("#tabs").hidden=true;
 if(TM.net==="insecure"){top.innerHTML=`<div class="r"><div><div class="lbl">Metro Mash · Teams</div><h1 class="d">Open it from a web address</h1></div><button class="back" data-act="t-home">‹ All games</button></div>`;m.innerHTML=`<div class="stack"><div class="card">Team games encrypt everything with the game code, and browsers only allow that on pages opened from an https address. Put this file on GitHub Pages or Netlify and open that link.</div></div>`;return}
 if(!TM.meta){if(TM.setup)tRenderSetup();else tRenderJoin();tRenderOv();return}
 if(!TM.my||!TM.teams[TM.my]){tRenderPick();tRenderOv();return}
 // one phone: the coin toss card waits until the tutorial is out of the way, then stays until it's tapped
 if(tLocal()&&TM.meta.first&&!TM.meta.tossShown&&!(typeof xp!=="undefined"&&xp)){TM.meta.tossShown=true;tFlash("Coin toss",tName(TM.meta.first)+" goes first. Pass the phone when it's the next player's turn: tap their colour at the top.","Take");TM.revealUntil=now()+1e10;tSave()}
 document.body.classList.add("playing");document.body.classList.toggle("onmap",TM.tab==="map");document.body.classList.toggle("oncard",TM.tab==="cards");
 if(TM.tab!=="map")tRenderTop(top);
 m.classList.toggle("maptab",TM.tab==="map");
 ({map:tRenderMap,cards:tRenderCards,curses:tRenderCurses,more:tRenderMore})[TM.tab](m);
 tRenderOv();tRenderDuel();
}
// a remote update must not wipe out what someone is typing
function tRemoteRender(){const a=document.activeElement;if(a&&a.closest&&a.closest("#main")&&/INPUT|SELECT|TEXTAREA/.test(a.tagName))return;tRender()}
function tBindInputs(m){
 m.querySelectorAll("[data-in]").forEach(el=>{
  const ev=el.tagName==="SELECT"?"change":"input";
  el.addEventListener(ev,()=>{const o=me().open;if(!o)return;const k=el.dataset.in;
   if(k==="decl")o.declared=+el.value||null;
   if(k==="est")o.est=+el.value||null;
   if(k==="stunt")o.stunt=el.value||null;
   if(k==="tgt")o.target=el.value||null;
   if(k==="dl"){if(el.value){const [hh,mm]=el.value.split(":").map(Number);const t=new Date();t.setHours(hh,mm,59,999);o.deadline=t.getTime()}else o.deadline=null}
   if(k==="dc")o.dc=el.value===""?null:+el.value;
   if(k==="sc")o.sc=el.value===""?null:+el.value;
   tCommitQuiet();
   if(ev==="change"||k==="est")tRender();
  });
 });
}
async function tShowQR(){
 const box=$("#qr");if(!box)return;const link=tInviteLink();
 const draw=()=>{try{const q=qrcode(0,"M");q.addData(link);q.make();box.innerHTML=q.createSvgTag({cellSize:5,margin:2,scalable:true})}catch(e){box.textContent=link}};
 if(window.qrcode){draw();return}
 box.innerHTML=`<div class="small muted">Loading…</div>`;
 for(const src of ["https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js","https://unpkg.com/qrcode-generator@1.4.4/qrcode.js"]){
  const ok=await new Promise(r=>{const s=document.createElement("script");s.src=src;s.onload=()=>r(true);s.onerror=()=>r(false);document.head.appendChild(s)});
  if(ok&&window.qrcode){draw();return}}
 box.innerHTML=`<div class="small muted">Couldn't load the QR maker. Send the link instead:</div><div class="small num" style="overflow-wrap:anywhere">${esc(link)}</div>`;
}

// ---------- show mode for teams ----------
let tShowT=null;
function tOpenShow(mode){
 TM.show=mode;const el=$("#show");el.hidden=false;el.className="show";clearTimeout(tShowT);
 if(mode==="live")tDrawShow(tView(),{},tShowCap());
 if(mode==="replay")tRunReplay();
 if(mode==="explain")xpOpen("show");
}
// the big-screen caption is about the whole game, not this phone's team
function tShowCap(){
 const sc=tScore(),a=sc.order[0],b=sc.order[1],A=sc.R[a],B=b?sc.R[b]:null,top=n1(A.tot);
 const level=B&&B.tot===A.tot,tie=level&&B.held===A.held;
 if(tLocked())return {t:tie?"Final count: a tie at "+top:"Final count: "+tName(a)+" wins",s:tie?"Same stars, same stations held":level?top+" stars each; more stations held breaks it":top+" stars"};
 return {t:A.tot<=0?"Nobody is on the board yet":tie?"Level at the top on "+top:tName(a)+" leads with "+top,s:tClockLeft()+" to the hard stop at "+hhmm(TM.meta.stopTs)};
}
function tCloseShow(){TM.show=null;clearTimeout(tShowT);const el=$("#show");el.hidden=true;el.innerHTML="";el.className="show"}
function tDrawShow(V,opt,cap,scores){
 const el=$("#show"),sc=scores||tScore();requestAnimationFrame(()=>fitStage(el.querySelector(".stage"),(opt&&opt.pops&&opt.pops[0])||null));
 el.innerHTML=`<div class="sbt">${sc.order.map(id=>`<div class="sbteam" style="--tc:${tCol(id)}"><span class="tn">${esc(tInfo(id).name)}</span><span class="tp num">${n1(sc.R[id].tot)}</span></div>`).join("")}<div class="clock num">${hhmm(now())}</div></div>
 <div class="stage" data-act="t-showtap">${mapSVG(V,Object.assign({noLegend:true},opt))}${cap?`<div class="cap"><div>${esc(cap.t)}${cap.s?`<small>${esc(cap.s)}</small>`:""}</div></div>`:""}</div>
 <div class="ctl"><button data-act="t-showopen" data-m="live">Live</button><button data-act="t-showopen" data-m="replay">Replay</button><button data-act="t-showopen" data-m="explain">Explainer</button><button class="ink" data-act="t-showclose">Close</button></div>`;
}
function tRunReplay(){
 const W=tWorld(),C=W.claims,st=blankSt();let i=0;
 const scoreAt=()=>{const R={};for(const t of teamList())R[t.id]={tot:0};for(const s of STATIONS){const o=st[s.id].o;if(o!=null)R[teamList()[o].id].tot+=s.p}return {R,order:teamList().map(t=>t.id).sort((a,b)=>R[b].tot-R[a].tot)}};
 tDrawShow({st,cur:null,up:0},{},{t:"The day, station by station",s:C.length+" claims"},scoreAt());
 const step=()=>{if(TM.show!=="replay")return;
  if(i>=C.length){tDrawShow({st,cur:null,up:0},{},{t:"Final board",s:"Most stars wins"},scoreAt());return}
  const c=C[i++];st[c.s].o=tIdx(c.team);st[c.s].vis=true;
  tDrawShow({st,cur:c.s,up:tIdx(c.team)},{pops:[c.s]},{t:tName(c.team)+({auction:" wins "+ST[c.s].n+" at auction",duel:" wins "+ST[c.s].n+" in a trivia duel",lock:" unlocks "+ST[c.s].n}[c.how]||" takes "+ST[c.s].n),s:hhmm(c.t)},scoreAt());
  tShowT=setTimeout(step,900)};
 tShowT=setTimeout(step,1200);
}

// ---------- the explainer, team edition ----------
function teamsXpSteps(){
 const X=CITY.xp,P=X.path,T0=CARD.T0,MR=LOCKS[X.sealed],TA=X.teams;
 const tst=own=>xst(own);
 const trainsAt=at=>Object.entries(at).map(([id,k])=>({at:id,k,me:k===0}));
 return [
  {t:"Race For The Most Stars",b:(tLocal()?"Two to six players, all on this phone.":"Teams")+" race through the "+STATIONS.length+" stops on the train lines to gain the most stations. Bonuses can also be earned to win at the end.",scene:()=>({st:blankSt(),sweep:1})},
  {t:"Draw Cards Between Stops",b:"Complete Takes in between stops to earn monies for buying stations later. Walk or bike between stations and you'll only play a card at the next platform.",
   scene:()=>({st:tst(),cur:X.card[0],next:X.card[1],up:0,focus:X.card,z:2.6}),over:()=>cardFace("Take",T0.n,`<p class="small">${esc(T0.d)}</p>`)},
  {t:"Win It To Buy It",b:"Complete a station's card to earn monies and the right to buy the station: 10 monies per star, so a 1-star stop costs 10 and a 4-star hub costs 40. Veto the card or fail it and you lose monies, and the station goes to auction.",
   scene:()=>({st:tst({[X.buy.id]:0}),cur:X.buy.id,up:0,pops:[X.buy.id],floats:[{id:X.buy.id,t:X.buy.float,c:"var(--p1)"}],focus:X.buy.focus,z:2.4})},
  {t:"Steal With Smarts",b:"Complete the card at another team's stop and you can challenge them to a Trivia Duel: five city questions, 15 seconds each. They have 20 minutes to beat your score and can't hop stations until they play. Lose, and your next station is off limits until you visit a new one.",w:"duel",
   scene:()=>({st:tst(X.take.st),cur:X.take.cur,up:0,pops:[X.take.cur],focus:X.take.focus,z:2.4})},
  {t:"Score Stars & Steal Lines",b:"Every station you own scores its stars, but the team that owns the most stations on a line takes that line's bonus; ties split it. Monies you earned add one star per 20, and these bonus stars land at the count. Tap one:",w:"stars",
   scene:w=>({st:tst(X.split),hl:MAJ[w.line??0].ids})},
 ];
}
function teamsXpWidget(k,w){
 const T=TM.my&&me(),N=T?[esc(mateName(T,0)||"Player 1"),esc(mateName(T,1)||"Player 2")]:["Player 1","Player 2"],P=CITY.xp.path;
 if(k==="wl"){return `<dl class="xw-out"><dt>Complete</dt><dd>+10 monies, and you can buy the station (or challenge for it)</dd><dt>Fail</dt><dd>−5 monies, the station goes to auction, and you draw a curse</dd></dl>`}
 if(k==="duel"){const bank=(typeof TRIVIA!=="undefined"&&TRIVIA[CITY.id])||[];if(!bank.length)return `<div class="xw-msg">Five questions, fifteen seconds each.</div>`;
   const i=(w.q??0)%bank.length,Q=tQuestion("c"+i,"xp"),picked=w.pick;
   return `<div class="xw-msg"><b>${esc(Q.q)}</b>${picked!=null?` <span class="xw-fb">${picked===Q.ans?"Right.":"Not that one."}</span> <button class="xw-next" data-act="xpw" data-k="dnext">Another ›</button>`:""}</div><div class="xw-opts">${Q.opts.map((o,j)=>`<button data-act="xpw" data-k="dpick" data-v="${j}" class="${picked==null?"":j===Q.ans?"right":j===picked?"wrong":""}" ${picked!=null?"disabled":""}>${esc(o)}</button>`).join("")}</div>`}
 if(k==="stars"){const S=[["Showman","Most cards completed."],["Highwayman","Most stations taken from other teams."],["Lockpick","Most sealed stations won."],["Explorer","Most stations visited."]];const g=w.star??0;
  return `<div class="xw-chips">${S.map((x,i)=>`<button data-act="xpw" data-k="star" data-v="${i}" aria-pressed="${i===g}">★ ${x[0]}</button>`).join("")}</div><div class="xw-msg"><b>${S[g][0]}.</b> ${S[g][1]} Worth 3 stars, split on a tie.</div>`}
 if(k==="lines"){const g=w.line??0,m=MAJ[g],st=xst(CITY.xp.split),c=[0,1].map(p=>m.ids.filter(id=>st[id].o===p).length),win=c[0]>c[1]?0:c[1]>c[0]?1:null,nm=["Team "+(teamList()[0]?teamList()[0].name:"Pink"),"Team "+(teamList()[1]?teamList()[1].name:"Blue")];
  return `<div class="xw-chips">${MAJ.map((x,i)=>`<button data-act="xpw" data-k="line" data-v="${i}" aria-pressed="${i===g}">${x.n}</button>`).join("")}</div><div class="xw-msg">${m.ids.length} stations, worth ${m.pts}. Here ${esc(nm[0])} owns ${c[0]} and ${esc(nm[1])} owns ${c[1]}, so ${win==null?"they split it":esc(nm[win])+" takes the "+m.pts}.</div>`}
 if(k==="curses"){const c=CURSES.find(x=>x.k===(w.curse||"rush"));return `<div class="xw-chips">${CURSES.map(x=>`<button data-act="xpw" data-k="curse" data-v="${x.k}" aria-pressed="${x.k===c.k}">${x.n}</button>`).join("")}</div><div class="xw-msg"><b>${c.n}.</b> ${esc(c.eff.replace(/\bthey\b/g,"they").replace(/^Their/,"The other team's"))} <span class="muted">Costs ${c.cost}.</span></div>`}
 return null;
}

// ---------- input ----------
document.addEventListener("click",e=>{
 if(MODE!=="teams")return;
 const b=e.target.closest("[data-act]");if(!b||b.disabled)return;
 const a=b.dataset.act,D=b.dataset;if(!a.startsWith("t-"))return;
 const T=TM.my?me():null,o=T?T.open:null,sp=o?spec(o):null;
 switch(a){
  case"t-home":if(TM.R)TM.R.close();goHome();return;
  case"t-n":TM.setup.n=Math.max(2,Math.min(6,TM.setup.n+(+D.d)));tRender();return;
  case"t-start":TM.setup.start=D.k;TM.setup.flash=1;tRender();return;
  case"t-col":{const U=TM.setup,t=U.teams[+D.i],old=palOf(t.col)[1];if(U.teams.slice(0,U.n).some((o,j)=>j!==+D.i&&o.col===D.k))return;
   t.col=D.k;if(!t.name||t.name===old||TEAM_NAMES.includes(t.name))t.name=palOf(D.k)[1];tRender();return}
  case"t-pc":{const t=TM.setup.teams[+D.i];t.pc=Math.max(1,Math.min(4,t.pc+ +D.d));tRender();return}
  case"t-create":tCreate();return;
  case"t-switch":{if(!TM.teams[D.t]||D.t===TM.my)return;TM.my=D.t;TM.tab="map";TM.sel=null;tSave();tRender();tFlash("Pass the phone",tName(D.t)+" is playing now.","Take");return}
  case"t-joingo":tJoinGo();return;
  case"t-pickteam":{if(!TM.teams[D.t])return;TM.my=D.t;TM.tab="map";TM.join=null;tSave();if(tProcessIncoming())tCommitQuiet();tPublish();tRender();if(!lsGet("turf.teams.seenhelp")){lsSet("turf.teams.seenhelp",1);xpOpen("help")}return}
  case"t-copylink":{const l=tInviteLink();try{navigator.clipboard.writeText(l).then(()=>{tFlash("Copied","The invite link is on your clipboard.","Take");tRenderOv()},()=>{tFlash("Invite link",l,"Take");tRenderOv()})}catch(err){tFlash("Invite link",l,"Take");tRenderOv()}return}
  case"t-qr":tShowQR();return;
  case"t-howto":xpOpen("help");return;
  case"t-closereveal":TM.reveal=null;tRenderOv();return;
  case"t-toastx":if(TM.toast)TM.toast.gone=1;$("#toast").hidden=true;tRenderOv();return;
  case"t-showopen":tOpenShow(D.m);return;
  case"t-showclose":tCloseShow();return;
  case"t-showtap":$("#show").classList.toggle("rec");return;
 }
 if(!T)return;
 switch(a){
  case"t-tab":TM.tab=D.t;tRender();$("#main").scrollTop=0;return;
  case"t-back":TM.tab=(T.hop&&!T.hop.settled)?"cards":"map";tRender();return;
  case"t-pick":TM.sel=D.id;tRender();return;
  case"t-zoom":setZoom(mapZoom*(+D.z));return;
  case"t-recenter":{const h=T.hop;centerMap(T.cur,h&&!h.arrived?h.to:null,true);return}
  case"t-key":showKey=!showKey;tRender();return;
  case"t-curseinfo":{if(D.k==="cool"){TM.reveal={fam:"Curse",n:"Cooling off",d:"You lost a trivia duel you started. At your next station you can't buy, challenge or bid. After that, everything opens again.",sub:"On you"};TM.revealUntil=now()+1e12;tRenderOv();return}
   const c=CURSES.find(c=>c.k===D.k);if(c){TM.reveal={fam:"Curse",n:c.n,d:(c.you||c.eff)+" · Lasts: "+c.dur,sub:"On you"};TM.revealUntil=now()+1e12;tRenderOv()}return}
  case"t-resync":tConnect();return;
  case"t-forget":document.getElementById("tfg").hidden=false;return;
  case"t-reallyforget":try{localStorage.removeItem(TKEY)}catch(err){}if(TM.R)TM.R.close();goHome();return;
  case"t-extend":{if(TM.meta.host!==TM.phone)return;TM.meta.stopTs=Math.max(now()+5*60000,TM.meta.stopTs+(+D.m)*60000);TM.meta.rev=(TM.meta.rev||1)+1;tSave();tPublish();tRender();return}
  case"t-hop":tAct(()=>{tStartHop(D.id);TM.sel=null});return;
  case"t-arrive":tAct(()=>tArrive());return;
  case"t-done":tAct(()=>{T.hop.settled=true});return;
  case"t-buy":tAct(()=>{const id=T.cur,pr=tPrice(id)*(T.fx.fare?2:1);if(T.bank<pr||T.fx.jury||!T.hop||T.hop.cool||tFirstOpt()!==true||tWorld().own[id]!=null||tOpenAuction(id))return;T.bank-=pr;if(T.fx.fare){T.fx.fare=false;tLog("Double Fare.")}tClaim(id,"buy");tLog("You buy "+ST[id].n+" for "+pr+".");T.hop.settled=true});return;
  case"t-bid":{const err=tBid(D.ref,+D.n);if(err){tFlash("Can't bid",err,"Curse");tRenderOv();return}tCommitQuiet();tRender();return}
  case"t-challenge":tAct(()=>tStartChallenge(T.cur));tRenderDuel();return;
  case"t-duelplay":tAct(()=>tStartDefense(D.ref));tRenderDuel();return;
  case"t-duelopen":tRenderDuel();return;
  case"t-duelhere":tAct(()=>{if(T.duel)T.duel.phone=TM.phone});tRenderDuel();return;
  case"t-duelstart":tAct(()=>{const d=T.duel;if(d&&d.qStart==null&&d.phone===TM.phone&&!(d.mode==="defend"&&now()>d.end))d.qStart=now()});tRenderDuel();return;
  case"t-dpick":{const d=T.duel;if(!d||d.phone!==TM.phone||+D.i!==d.i)return;tDuelAnswer(+D.o);tCommitQuiet();tRender();tRenderDuel();return}
  case"t-dueldone":tAct(()=>{if(T.duel&&T.duel.done)T.duel=null});tRenderDuel();return;
  case"t-duelcancel":tAct(()=>{if(T.duel&&T.duel.qStart==null)T.duel=null});tRenderDuel();return;
  case"t-lockopen":tAct(()=>tOpenLock(T.cur));return;
  case"t-szstart":tAct(()=>{T.sz={id:T.cur,start:now(),end:now()+LAY_MIN*60000};tLog("Layover at "+ST[T.cur].n+".");tToast("Layover","Riders from your last train pick where you eat nearby. A mandatory "+LAY_MIN+" minutes for every team at once: ask the staff about the history of the restaurant and the neighbourhood, then give a detailed review of the food. Card timers pause.")});return;
  case"t-szend":tAct(()=>{if(now()<T.sz.end)return;const el=now()-T.sz.start;if(T.open&&T.open.tEnd)T.open.tEnd+=el;T.layWin=tLayWin();tLog("Layover over ("+Math.round(el/60000)+" min).");T.sz=null});return;
  case"t-ctarget":TM.cpick={i:+D.i,target:D.t};tRender();return;
  case"t-cplay":{const i=+D.i,c=CURSES[T.hand[i]];let target=TM.cpick&&TM.cpick.i===i?TM.cpick.target:null,extra=null;
   if(c&&c.k==="gilded")extra=(document.getElementById("tg"+i)||{}).value||null;
   if(c&&c.k==="wrong")extra=(document.getElementById("tw"+i)||{}).value||null;
   const err=tPlayCurse(i,target,extra);if(err){tFlash("Not yet",err,"Curse");tRenderOv();return}
   TM.cpick=null;tCommitQuiet();tRender();return}
  case"t-cdisc":tAct(()=>{const g=T.hand.splice(+D.i,1)[0];tLog("You discard "+CURSES[g].n+".");TM.cpick=null});return;
  case"t-jurydone":tAct(()=>{T.fx.jury=false;tLog("Jury Duty done.")});return;
 }
 if(!o)return;
 switch(a){
  case"t-decl":tAct(()=>{o.declared=+D.n;tLog("Call Your Takes: "+o.declared+" declared.")});return;
  case"t-bonus":tAct(()=>{o.bonus=!o.bonus});return;
  case"t-begin":if(!tCanStart(o).ok)return;tAct(()=>tBegin(o));return;
  case"t-veto":tAct(()=>tFinish("veto"));return;
  case"t-redraw":tAct(()=>tRedraw());return;
  case"t-bridgeboard":tAct(()=>{o.bridgeBoarded=true;tLog(sp.bridge.boarded+".")});return;
  case"t-bridgeend":tAct(()=>tFinish(o.tally>=3?"win":"fail",o.tally>=3?"":sp.bridge.endNote+" "+o.tally+" rulings."));return;
  case"t-vote":tAct(()=>{o.votes=o.votes||[0,0];o.votes[+D.v]++;const v=o.votes;if(v[0]+v[1]>=sp.poll){if(sp.callOnly)tLog("Ten votes: "+v[0]+" for, "+v[1]+" against. Announce it to the plaza, then call it.");else if(v[0]&&v[1])tFinish("win",v[0]+" for, "+v[1]+" against");else tLog("All one way so far. Keep going until someone breaks it.")}});return;
  case"t-secondyes":tAct(()=>{o.secondDone=true;o.awaitSecond=false;T.open=o;tFinish("win","A stranger agreed with the take.")});return;
  case"t-secondno":tAct(()=>{o.secondNo=(o.secondNo||0)+1;if(o.secondNo>=3){o.awaitSecond=false;tFinish("fail","Second Opinion: three strangers disagreed.")}});return;
  case"t-timefail":tAct(()=>tFinish("fail","Time."));return;
  case"t-timeplus":tAct(()=>{o.expired=false;o.tEnd=now()+120000;tLog("Two more minutes on "+sp.n+".")});return;
  case"t-giveup":tAct(()=>tFinish("fail","Gave up."));return;
  case"t-tally":tAct(()=>{
   if(sp.tally.perBoard){if(!o.canStep){tFlash("Same ride","The next step opens on your next hop.");return}o.canStep=false}
   o.tally++;
   if(o.id==="G4"&&!o.lock)return;
   if(sp.need&&o.tally>=sp.tally.target){o.call=null;return}
   if(sp.tally.target&&o.tally>=sp.tally.target)tFinish("win",o.tally+" "+sp.tally.label.toLowerCase()+"s.")});return;
  case"t-treset":tAct(()=>{o.tally=0;tLog(sp.tally.reset+": back to zero.")});return;
  case"t-tfail":tAct(()=>tFinish("fail",sp.tally.failOn));return;
  case"t-strike":tAct(()=>{o.strikes++;if(sp.hold)o.hStart=null;if(o.strikes>=sp.strikes.max)tFinish("fail",o.strikes+" × "+sp.strikes.label.toLowerCase())});return;
  case"t-throwin":tAct(()=>{o.strikes++;o.tally++;if(o.tally>=sp.throws.target)tFinish("win",o.tally+" in "+o.strikes+" throws.");else if(o.strikes>=sp.throws.max)tFinish("fail","Out of throws.")});return;
  case"t-throwout":tAct(()=>{o.strikes++;if(sp.throws.row)o.tally=0;if(o.strikes>=sp.throws.max)tFinish("fail","Out of throws.")});return;
  case"t-check":tAct(()=>{const i=+D.i;if(o.list.includes(i))o.list=o.list.filter(x=>x!==i);else o.list.push(i);const tg=sp.listTarget||sp.list.length;const reqOk=!(sp.req||[]).some(r=>!o.list.includes(r));if(o.list.length>=tg&&reqOk)tFinish("win",o.list.length+" of "+sp.list.length+".")});return;
  case"t-wstart":tAct(()=>{o.wStart=now()});return;
  case"t-pause":tAct(()=>{o.wStart=null;o.strikes++;if(o.strikes>=sp.strikes.max)tFinish("fail","Paused twice.");else tLog("Paused. One attempt left.")});return;
  case"t-lapstart":tAct(()=>{o.lapEnd=now()+sp.lap*1000;o.tally=0});return;
  case"t-holdstart":tAct(()=>{o.hStart=now()});return;
  case"t-studystart":tAct(()=>{o.sEnd=now()+60000});return;
  case"t-dblcheck":tAct(()=>{if(o.dc==null||o.sc==null)return;tFinish(Math.abs(o.dc-o.sc)<=2?"win":"fail","Said "+o.dc+", counted "+o.sc+".")});return;
  case"t-call":tAct(()=>tFinish(D.v));return;
  case"t-accept":tAct(()=>tFinish(o.call));return;
  case"t-dispute":tAct(()=>{o.dispute=true;tLog("Disputed. Replaying the clip.")});return;
  case"t-agree":tAct(()=>tFinish(D.v));return;
  case"t-coin":tAct(()=>{const heads=Math.random()<.5,v=heads?o.call:flip(o.call);tLog("Still split. Coin: "+(heads?"heads, the call stands.":"tails, the call flips."));tFlash("Coin flip",heads?"Heads. The call stands.":"Tails. The call flips.");tFinish(v)});return;
 }
});
document.addEventListener("click",e=>{if(MODE!=="teams")return;const s=e.target.closest('#main g.st[data-act="sel"]');if(!s||!TM.my)return;
 const T=me(),id=s.dataset.id,h=T.hop;
 if(!tLocked()&&!T.sz){
  if(h&&!h.arrived&&id===h.to){tAct(()=>tArrive());return}
  if((!h||h.settled)&&ADJ[T.cur].includes(id)&&(!T.fx.wrong||T.fx.wrong.to===id)){if(TM.sel===id){tAct(()=>{tStartHop(id);TM.sel=null});return}TM.sel=id;tRender();return}
 }
 TM.sel=TM.sel===id?null:id;tRender()});

// ---------- the clock ----------
let tBeat=0;
setInterval(()=>{
 if(MODE!=="teams"||!TM.my||!me())return;
 const T=me(),o=T.open;let changed=false;
 if(o&&o.started&&!o.awaitSecond&&!o.expired&&!T.sz){const sp=spec(o);
  if(o.tEnd&&now()>=o.tEnd&&!(o.id==="G0"&&!o.lock)){o.expired=true;tLog(sp.n+": time is up. Call it.");tToast("Time is up: "+sp.n,"Call it a fail, or grant two more minutes.");changed=true}
  else if(sp.lap&&o.lapEnd&&now()>=o.lapEnd){o.strikes++;o.lapEnd=null;o.tally=0;if(o.strikes>=sp.strikes.max)tFinish("fail","Out of time twice.");else tLog("Out of time. One attempt left.");changed=true}
  else if(sp.watch&&o.wStart&&now()-o.wStart>=sp.watch*1000){tFinish("win","90 seconds.");changed=true}
  else if(sp.hold&&o.hStart&&now()-o.hStart>=sp.hold*1000){tFinish("win",sp.hold+" seconds.");changed=true}
  else if(!o.lock&&o.id==="G3"&&now()>o.deadline){tFinish("fail","Late.");changed=true}}
 const dl=T.duel;if(dl&&!dl.done&&dl.qStart!=null&&dl.phone===TM.phone&&now()-dl.qStart>=DUEL_S*1000+400){tDuelAnswer(null);changed=true}
 if(changed){tCommitQuiet();tRender();return}
 for(const el of document.querySelectorAll('[data-live="auc"],[data-live="duel"]'))el.textContent=fmt(Math.max(0,+el.dataset.end-now()));
 // auctions close and duels time out with the clock, not with a message, so look for that every second
 tInvalidate();const W=tWorld(),sig=W.auctions.map(a=>a.id+(a.closed?"c":a.open?"o":"x")).join()+"|"+W.duels.map(d=>d.id+(d.res||(now()>d.end?"l":"p"))).join();
 if(sig!==TM.wsig){const first=TM.wsig==null;TM.wsig=sig;if(!first){if(tProcessIncoming())tCommitQuiet();tRemoteRender()}}
 if(o&&o.started){const q=k=>document.querySelector(`[data-live="${k}"][data-p="t"]`);
  if(q("tleft")&&o.tEnd)q("tleft").textContent=fmt(o.tEnd-now());
  if(q("watch")&&o.wStart)q("watch").textContent=Math.floor((now()-o.wStart)/1000);
  if(q("lapleft")&&o.lapEnd)q("lapleft").textContent=fmt(o.lapEnd-now());
  if(q("hold")&&o.hStart)q("hold").textContent=Math.min(spec(o).hold,Math.floor((now()-o.hStart)/1000));
  if(q("study")&&o.sEnd)q("study").textContent=fmt(o.sEnd-now())}
 if(T.sz&&document.getElementById("szleft")){document.getElementById("szleft").textContent=fmt(T.sz.end-now());if(now()>=T.sz.end)tRender()}
 // a heartbeat keeps the relay's copy fresh and tells the others we're alive
 if(++tBeat%45===0)tPublish();
 if(TM.show==="live"&&tBeat%5===0)tOpenShow("live");
},1000);

// ---------- boot ----------
function teamsBoot(A){
 TM.phone=lsGet("turf.phone")||rid(10);lsSet("turf.phone",TM.phone);tApplyTeamText();
 const g=lsGet(TKEY);
 if(A.intent==="host"){TM.setup=tSetupDefaults();TM.relay=TM.setup.relay;tRender();return}
 if(A.intent==="local"){TM.setup=tSetupDefaults();TM.setup.local=true;TM.relay="local";tRender();return}
 if(A.intent==="join"&&!(g&&g.code&&A.joinCode===g.code)){
  TM.join={code:A.joinCode||"",waiting:false,err:null};TM.relay=A.relay||"hivemq";
  if(!RELAYS.find(r=>r.id===TM.relay)){TM.join.custom=true;TM.join.customUrl=TM.relay}
  lsSet(APP_KEY,Object.assign(appState(),{intent:"resume",joinCode:null}));
  tRender();if(TM.join.code.length===6)tJoinGo();return}
 if(g&&g.meta){Object.assign(TM,{code:g.code,relay:g.relay||"hivemq",meta:g.meta,my:g.my,teams:g.teams||{}});loadCity(TM.meta.city);tApplyTeamText();tInvalidate();tConnect();tRender();return}
 TM.join={code:"",waiting:false,err:null};tRender();
}

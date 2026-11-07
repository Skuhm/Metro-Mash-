// ================= state =================
let lastTrain=null,S=null,tab="map",sel=null,undo=[],dbDoc=null,writing=Promise.resolve(),pending=null,lastOwners={},revealUntil=0,showMode=null,howto=false;
const blankFx=()=>({road:false,sooth:null,silent:0,jury:false,rush:false,wrong:false,fare:false,bankrun:null});
function fresh(){
 return {v:5,rev:0,phase:"setup",stop:"16:15",players:[{name:"",cons:""},{name:"",cons:""}],up:0,hij:null,
  bank:[START,START],credits:[0,0],cur:null,hop:null,stops:0,boards:0,
  st:Object.fromEntries(STATIONS.map(s=>[s.id,{o:null,vis:false,failedBy:null,last:0,gild:false,opened:false}])),
  pile:[],cpile:[],hand:[[],[]],open:[null,null],balanceN:0,fx:[blankFx(),blankFx()],
  auc:null,sz:null,
  stats:{cards:[0,0],tko:[0,0],auc:[0,0],locks:[0,0]},hist:[],log:[],done:false};
}
const now=()=>Date.now();
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const hhmm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")};
const stopAt=()=>{if(S&&S.stopTs)return S.stopTs;const [h,m]=((S&&S.stop)||"16:15").split(":").map(Number);const d=new Date();d.setHours(h,m,0,0);if(d.getTime()<=Date.now())d.setDate(d.getDate()+1);return d.getTime()};
const minsLeft=()=>Math.max(0,Math.round((stopAt()-now())/60000));
const pn=i=>S.players[i].name||("Player "+(i+1));
const up=()=>S.up,cam=()=>1-S.up;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function log(t){S.log.unshift({t:now(),x:t});if(S.log.length>600)S.log.length=600}
function price(id){return ST[id].p*(S.st[id].gild?2:1)}
function held(p){return STATIONS.filter(s=>S.st[s.id].o===p).length}
const MAJ=[{n:"E Line",ids:L_E.filter(id=>!DTOWN.has(id)),pts:8},{n:"Downtown",ids:[...DTOWN,"wvermont"],pts:5},{n:"Hollywood",ids:L_B.slice(6),pts:4},{n:"Wilshire",ids:L_D.slice(6),pts:3}];
function majorities(st){st=st||S.st;const t=[0,0],rows=[];for(const m of MAJ){const c=[0,1].map(p=>m.ids.filter(id=>st[id].o===p).length);let a=0,b=0;if(c[0]>c[1])a=m.pts;else if(c[1]>c[0])b=m.pts;else if(c[0]){a=b=m.pts/2}t[0]+=a;t[1]+=b;rows.push({m,c,a,b})}return {t,rows}}
function chainLen(p,st){st=st||S.st;let b=0;for(const line of LINES){let c=0;for(const id of line){c=st[id].o===p?c+1:0;b=Math.max(b,c)}}return b}
function tkoPrice(id){return S.st[id].gild?TKO_CAP:Math.min(TKO_CAP,2*ST[id].p)}
function unvisited(){return STATIONS.filter(s=>!S.st[s.id].vis)}
function sealed(id){const v=S.st[id];return !!ST[id].lock&&v.o==null}
function dist(from){const d={[from]:0},q=[from];while(q.length){const a=q.shift();for(const b of ADJ[a]){const t=d[a]+EDGE[a+">"+b].t;if(d[b]==null||t<d[b]){d[b]=t;if(!q.includes(b))q.push(b)}}}return d}
function paceNeed(){
 let m=0;const u=unvisited();for(const s of u){m+=4;if(sealed(s.id))m+=15}
 m+=Math.floor(minsLeft()/180)*LAY_MIN;
 if(S.cur){const d=dist(S.cur);m+=Math.max(0,...u.map(s=>d[s.id]||0))*0.5}
 return Math.round(m);
}
function canDraw(){return !S.sz&&minsLeft()-paceNeed()>10}
function locked(){return S.done||now()>=stopAt()}
function hops(a,b){const d=dist(a);return Math.round((d[b]||0)/4)}
function spec(o){return o.lock?LOCKS[o.id]:CARD[o.id]}
function nextRec(){
 const c=S.cur;if(!c)return START_ID;
 const u=unvisited();if(!u.length)return ADJ[c][0];
 // first step toward the nearest unvisited station
 let best=null,bt=1e9;
 for(const n of ADJ[c]){const d=dist(n);const t=Math.min(...u.map(s=>(s.id===n?0:d[s.id]??1e9)))+EDGE[c+">"+n].t;if(t<bt){bt=t;best=n}}
 return best;
}
const LAY_EVERY=3*3600000,LAY_MIN=25;
function layDue(){return S.phase==="play"&&now()-(S.layLast||S.startedAt||now())>=LAY_EVERY}
function szHere(){if(!S.cur||S.sz||!S.hop||!S.hop.settled)return null;return layDue()?S.cur:null}

// ================= persistence =================
function persist(){
 S.rev=(S.rev||0)+1;
 try{localStorage.setItem("turfla1",JSON.stringify(S))}catch(e){}
 if(!dbDoc)return;
 const body=JSON.parse(JSON.stringify(S));pending=body;
 writing=writing.then(async()=>{if(pending!==body)return;try{await dbDoc.set(body)}catch(e){}});
}
function commit(){persist();render()}
const hopKey=()=>S&&S.hop?S.boards+":"+(S.hop.arrived?1:0)+":"+(S.hop.settled?1:0):"none";
function routeTab(){if(S.phase!=="play")return;tab=(S.hop&&!S.hop.settled)?"cards":"map"}
function act0(fn){undo.push(JSON.stringify(S));if(undo.length>25)undo.shift();const k0=hopKey();fn();if(hopKey()!==k0)routeTab();commit()}
async function boot(){
 try{const raw=localStorage.getItem("turfla1");if(raw){const d=JSON.parse(raw);if(d&&d.v===5)S=d}}catch(e){}
 if(!S){S=fresh();}
 render();
 try{
  const db=await claude.use("db");
  if(db){
   dbDoc=db.doc("games/current");
   dbDoc.onSnapshot(snap=>{
    if(!snap.exists)return;const d=snap.data();
    if(d&&d.v!==5&&Array.isArray(d.players)&&S.phase==="setup"&&!S.players[0].name&&!S.players[1].name){S.players=d.players.slice(0,2).map(p=>({name:String(p.name||""),cons:String(p.cons||"")}));persist();render();return}
    const sameGame=d&&d.gid&&d.gid===S.gid,newerGame=d&&d.gid&&d.gid!==S.gid&&(d.startedAt||0)>(S.startedAt||0);
    if(d&&d.v===5&&((sameGame&&(d.rev||0)>(S.rev||0))||newerGame)){S=JSON.parse(JSON.stringify(d));try{localStorage.setItem("turfla1",JSON.stringify(S))}catch(e){}render()}
   },()=>{});
  }
 }catch(e){}
}

// ================= core flow: one hop = one turn =================
function startGame(){
 S.pile=shuffle(CARDS.map(c=>c.id));
 S.cpile=shuffle(CURSES.flatMap((c,i)=>[i,i]));
 S.gid=Math.random().toString(36).slice(2);S.startedAt=now();S.layLast=now();S.up=Math.random()<.5?0:1;S.phase="play";S.bank=[START,START];S.stopTs=stopAt();if(S.stopTs-now()>18*3600000)log("Hard stop "+S.stop+" has already passed today; it is set for tomorrow. Change it in the Log tab.");
 log("Coin toss: "+pn(S.up)+" is Up first. Deck and curse pile shuffled. "+START+" chips each.");

}
function own(id,p){const prev=S.st[id].o;S.st[id].o=p;S.st[id].last=now();S.hist.push({t:now(),id,o:p});if(prev!==p)drawCurse(1-p)}
function drawCurse(p){if(!S.cpile.length){log("Curse pile is empty.");return}const c=S.cpile.pop();S.hand[p].push(c);log(pn(p)+" draws a curse: "+CURSES[c].n+".");S.toast={fam:"Curse",n:pn(p)+" draws "+CURSES[c].n,d:CURSES[c].eff+" Play it from the Curses tab when you're on Camera.",t:now()}}
function startHop(to){
 const first=S.boards===0;
 let who=first?S.up:(S.hij!=null?S.hij:1-S.up);
 if(!first&&S.hij!=null){log(pn(S.hij)+" hijacked the hop for "+HIJACK+".");S.hij=null}
 const f=S.fx[who];
 if(f.wrong){f.wrong=false;log("Wrong Platform: "+pn(1-who)+" chose this hop.")}
 S.up=who;S.boards++;
 S.hop={to,from:S.cur,up:who,at:now(),arrived:false,settled:false,first:null,card:null,lock:false};
 log(pn(who)+" is Up. "+(S.cur?ST[S.cur].n+" to ":"Starting at ")+ST[to].n+".");
 // what's the challenge this hop?
 if(first){S.hop.first=who;S.hop.card="none";log("First station: "+pn(who)+" has first option.");arrive();return}
 if(sealed(to)){S.hop.lock=true;log(ST[to].n+" is sealed. The challenge opens on the platform; the card is for chips.")}
 if(S.open[who]){S.hop.card="cont";log(pn(who)+" is still on "+spec(S.open[who]).n+". No new card until it settles.")}
 else if(S.pile.length){drawCard(who);if(!canDraw())log("Pace warning: "+paceNeed()+" min of riding left, "+minsLeft()+" on the clock.")}
 else{S.hop.card="none";log("Deck empty. The station goes to auction.")}
 // boarding hooks for open cards
 for(const p of [0,1]){const o=S.open[p];if(o&&o.started&&!o.lock&&CARD[o.id].tally&&CARD[o.id].tally.perBoard&&p===who)o.canStep=true}
}
function arrive(){
 const h=S.hop;if(!h||h.arrived)return;const id=h.to;
 S.cur=id;S.stops++;h.arrived=true;h.arrivedAt=now();
 const st=S.st[id];if(!st.vis){st.vis=true;log("Doors open at "+ST[id].n+(unvisited().length?".":". Every station from downtown to the beach reached."))}else log("Doors open at "+ST[id].n+".");
 for(const p of [0,1]){if(S.fx[p].silent>0&&p===h.up){S.fx[p].silent--;if(!S.fx[p].silent)log("Silent Car is over for "+pn(p)+".")}}
 for(const p of [0,1]){const oo=S.open[p];if(oo&&oo.clockOnArrive){oo.tEnd=now()+1800000;oo.clockOnArrive=false;log(CARD[oo.id].n+": 30 minutes from now.")}afterStop(p,id)}
 S.auc=null;
 const o=st.o;
 if(o===h.up){h.settled=true;log(ST[id].n+" is "+pn(h.up)+"'s already.")}
 else if(o===1-h.up&&h.takeOnArrive&&!S.fx[h.up].jury){own(id,h.up);S.stats.tko[h.up]++;log(pn(h.up)+" passed the card on the way in and takes "+ST[id].n+".");flash("Takeover",pn(h.up)+" takes "+ST[id].n+".","Take");h.settled=true}
 maybeAuction();

}
function firstOpt(){
 const h=S.hop,p=h.up,o=S.open[p];
 if(h.first!=null)return h.first;
 if(h.card==="none")return null;
 if(o){const sp=spec(o);if(sp.ride||sp.span)return p;return "wait"}
 return null;
}
function maybeAuction(){
 const h=S.hop;if(!h||!h.arrived||h.settled||S.auc)return;const id=h.to,v=S.st[id];
 if(v.o!=null||sealed(id))return;
 const f=firstOpt();
 if(f==="wait"&&ST[id].p<4)return;
 if(f===null||f==="wait"||f!==h.up||ST[id].p===4){h.aucWhy=ST[id].p===4?"hub":h.road?"road":h.card==="none"?"nocard":"fail"}
}
function afterStop(p,id){
 const o=S.open[p];if(!o)return;const sp=spec(o);const isUp=p===S.hop.up;
 if(o.lock)return;
 if(!o.started){
  if(sp.ride&&!sp.span&&isUp)return finishFor(p,"fail","Doors opened before it started.");
  return;
 }
 const n=S.stops-o.startStops;
 if(o.id==="G4"){
  o.seen=(o.seen||[]).concat(id);
  if(o.seen.length>=3)return finishFor(p,o.tally>=7?"win":"fail",o.tally>=7?"":"Doors opened at the third with "+o.tally+" of seven takes.");
  return;
 }
 if(o.id==="G3"){if(id===o.target)return finishFor(p,now()<=o.deadline?"win":"fail",now()<=o.deadline?"On the platform by "+hhmm(o.deadline)+".":"Late.");return}
 if(o.id==="T4")return finishFor(p,o.tally>=o.declared?"win":"fail",o.tally>=o.declared?"Declared "+o.declared+", recorded "+o.tally+".":"Got "+o.tally+" of "+o.declared+".");
 if(o.id==="G7"){log("Duel ends at the doors with nobody at seven. No chips move.");S.open[p]=null;return}
 if(sp.stopGoal){const prog=S.stops-(o.resetAt??o.startStops);if(prog>=sp.stopGoal)return finishFor(p,"win",sp.stopGoal+" stops in a row.");return}
 if(sp.ride&&!sp.span)return finishFor(p,"fail","Doors opened first.");
}

// ================= cards =================
function unplayable(p,id){
 // a card is only dealt if it can actually be started on THIS hop, from where the train is going
 if(id==="G3"&&S.cur&&!STATIONS.some(x=>(dist(S.cur)[x.id]||0)>=18))return "nowhere far enough";
 const h=S.hop,e=h&&h.from?EDGE[h.from+">"+h.to]:null,c=CARD[id];
 if(e&&["walk","bike","funi"].includes(e.m)&&c.ride&&!c.span)return "no train or bus on this hop";
 if(e&&id==="S3"&&!RAIL_MODES.includes(e.m))return "no train car map on this hop";
 return null;
}
function drawCard(p){
 for(let tries=0;tries<S.pile.length+1&&S.pile.length;tries++){
  const id=S.pile.pop();const why=unplayable(p,id);
  if(why){S.pile.unshift(id);log(CARD[id].n+" goes to the bottom ("+why+").");continue}
  openCard(p,id);S.hop.card=id;return;
 }
 S.hop.card="none";log("Nothing playable in the deck right now. The station goes to auction.");
}
function redraw(p){
 const o=S.open[p];if(!o||o.lock||o.started)return;
 S.open[p]=null;S.pile.unshift(o.id);log(pn(p)+" redraws: "+CARD[o.id].n+" can't be played here. Back to the bottom, no penalty.");
 if(S.hop&&S.hop.up===p&&!S.hop.arrived)drawCard(p);
}
function openCard(p,id){
 const c=CARD[id],f=S.fx[p];
 let sooth=null;if(f.sooth){sooth=f.sooth===c.fam?"hit":"miss";log("Soothsayer called "+f.sooth+": "+(sooth==="hit"?"right, this card pays nothing.":"wrong, this card pays double."));f.sooth=null}
 const forced=false;const road=f.road&&c.fam!=="Gambit";if(road){f.road=false;log("Roadblock: a pass on this card won't win the station.")}
 const second=!!f.second;if(second){f.second=false;log("Second Opinion: a stranger has to agree this card counts.")}
 const rush=f.rush;if(rush){f.rush=false;log("Rush Hour: time limit halved.")}
 if(id==="S10")S.balanceN++;
 S.open[p]={id,p,lock:false,drawnAt:now(),drawStops:S.stops,stakes:c.fam==="Gambit"?"gambit":(forced?"allin":null),forced,rush,sooth,road,second,started:false,tally:0,strikes:0,list:[],declared:null};
 log(pn(p)+" draws "+c.n+".");

}
function openLock(id){
 const L=LOCKS[id],p=S.hop.up;S.st[id].opened=true;
 if(S.open[p]){S.park=S.park||[null,null];S.park[p]=S.open[p];log(spec(S.open[p]).n+" is parked while the sealed challenge runs.")}
 const lead=held(p)-held(1-p);const band=lead>=2?0.5:lead<=-2?1.5:1;const boost=S.st[id].failedBy!=null&&S.st[id].failedBy!==p?2:1;const pay=Math.round(L.r*band*boost);
 S.open[p]={id,p,lock:true,drawnAt:now(),drawStops:S.stops,stakes:"lock",started:false,tally:0,strikes:0,list:[],band,boost,pay};
 log("Sealed challenge opened at "+ST[id].n+": "+L.n+". Pays "+pay+(boost>1?" (doubled: "+pn(1-p)+" failed it)":"")+(band!==1?" ("+(band>1?"behind, x1.5":"ahead, x0.5")+")":"")+".");

}
function canStart(o){
 if(!o||o.started)return {ok:false};
 const sp=spec(o),p=o.p;
 if(!o.stakes)return {ok:false,why:"Pick Safe or All-in."};
 if(sp.declare&&!o.declared)return {ok:false,why:"Declare a number first."};
 if(sp.ride&&!o.lock&&S.hop&&S.hop.arrived&&!sp.span)return {ok:false,why:"Start it on the train."};
 if(o.id==="G1"&&!o.lock&&!o.stunt)return {ok:false,why:"Pick the Stunt first."};
 if(o.id==="G3"&&!o.lock&&(!o.target||!o.deadline))return {ok:false,why:"Name the station and the minute."};
 if(o.id==="G3"&&!o.lock&&o.deadline<=now())return {ok:false,why:"Pick a minute that hasn't passed."};
 if(o.id==="S1"&&!o.lock&&!(o.est>0))return {ok:false,why:"Enter the stranger's estimate."};
 if(!o.lock&&STATION_STUNTS.includes(o.id)&&!(S.hop&&S.hop.arrived)&&o.id!=="S9")return {ok:false,why:"Start it on the platform when you arrive."};
 return {ok:true};
}
function begin(o){
 const sp=spec(o),p=o.p;
 o.started=true;o.startStops=S.stops;o.startedAt=now();
 if(sp.timer)o.tEnd=now()+sp.timer*1000*(o.rush?0.5:1);
 if(o.id==="S1"&&!o.lock){o.tEnd=now()+o.est*60000*(o.rush?0.5:1);o.lm=ST[S.cur||START_ID].lm}
 if(o.id==="G1"&&!o.lock){o.pickAt=S.hop?S.hop.to:S.cur;if(S.hop&&!S.hop.arrived){o.tEnd=null;o.clockOnArrive=true}}
 if(o.id==="G2"&&!o.lock)o.emAt=S.hop?S.hop.to:S.cur;
 if(o.id==="T3"&&!o.lock){o.canStep=true}
 if(o.id==="G5"&&!o.lock){S.fx[p].bankrun={declared:o.declared,done:0,left:3};log(pn(p)+" declares "+o.declared+" of the next three cards.");S.open[p]=null;if(S.hop&&S.hop.up===p&&!S.hop.first)S.hop.first=p;maybeAuction();return}
 if(sp.duel)o.dd=sp.duel==="pong"?{h:[0,0],t:[0,0]}:{s:[0,0]};
 if(o.id==="G0"&&!o.lock)o.tEnd=now()+10000;
 log("Started: "+sp.n+".");
}
function mult(o){return o.stakes==="allin"?2:1}
function reinsertBalance(){const i=Math.floor(Math.random()*(S.pile.length+1));S.pile.splice(i,0,"S10");log("Balance Act goes back into the pile.")}
function setFirst(p,out){
 const h=S.hop;if(!h||h.settled||h.up!==p)return;
 h.first=out==="win"?p:out==="blocked"?null:1-p;
 const v=S.st[h.to];
 if(out==="win"&&v.o===1-p&&h.arrived&&!S.fx[p].jury&&!v.gild){own(h.to,p);S.stats.tko[p]++;log(pn(p)+" passes the card at "+ST[h.to].n+" and takes it.");flash("Takeover",pn(p)+" takes "+ST[h.to].n+".","Take");h.settled=true;return}
 if(out==="win"&&v.o===1-p&&!h.arrived&&!v.gild)h.takeOnArrive=true;
 if(h.arrived)maybeAuction();
}
function bankrunTick(p,win){const b=S.fx[p].bankrun;if(!b)return;if(win)b.done++;b.left--;if(b.left<=0||b.done>=b.declared){const ok=b.done>=b.declared;const d=ok?10*b.done:-10;S.bank[p]=Math.max(0,S.bank[p]+d);if(d>0)S.credits[p]+=d;log("Bank Run: "+b.done+" of "+b.declared+". "+(d>0?"+":"")+d+" chips.");S.fx[p].bankrun=null}}
function finishFor(p,out,note){
 const o=S.open[p];if(!o)return;const sp=spec(o),q=1-p;
 if(out==="win"&&!o.lock&&o.second&&!o.secondDone){o.awaitSecond=true;return}
 if(S.hop&&S.hop.up===p)S.hop.stakes=o.stakes;
 S.open[p]=null;
 if(o.lock){
  const id=o.id;
  if(S.park&&S.park[p]){S.open[p]=S.park[p];S.park[p]=null;log(spec(S.open[p]).n+" resumes.")}
  if(out==="win"){const pay=o.pay??sp.r;own(id,p);S.bank[p]+=pay;S.credits[p]+=pay;S.stats.locks[p]++;S.stats.cards[p]++;log(pn(p)+" wins "+ST[id].n+": "+sp.n+(note?" ("+note+")":"")+". +"+pay+".");if(S.hop&&S.hop.to===id)S.hop.settled=true;flash("Unlocked",pn(p)+" takes "+ST[id].n+" and "+pay+" chips.","Locked")}
  else{S.st[id].failedBy=p;log(pn(p)+" fails "+sp.n+(note?" ("+note+")":"")+". "+ST[id].n+" stays sealed; "+pn(1-p)+"'s attempt pays double.");if(S.hop&&S.hop.to===id)S.hop.settled=true;flash("Still sealed",pn(1-p)+"'s attempt here pays double.","Locked")}
  return;
 }
 const c=CARD[o.id];
 if(out==="win"){
  let base=typeof c.r==="number"?c.r:0,gain=0;
  if(c.cyt)base=({2:6,3:11,4:17,5:24})[o.declared]||0;
  if(c.balance)base=[8,12,16][Math.min(S.balanceN,3)-1];
  if(c.id==="G0"||c.id==="G3"){const b=S.bank[p];S.bank[p]=Math.floor(b*1.5);S.credits[p]+=S.bank[p]-b;log(pn(p)+" wins "+c.n+": bank "+b+" → "+S.bank[p]+".")}
  if(c.id==="G1"){const id=o.pickAt;if(S.st[id].o===q)S.stats.tko[p]++;if(S.st[id].o!==p){own(id,p);log(pn(p)+" pickpockets "+ST[id].n+".")}if(S.hop&&S.hop.to===id){S.hop.settled=true;S.auc=null}}
  if(c.id==="G2"){const id=o.emAt,pr=ST[id].p;if(S.st[id].o===q){const n=Math.min(pr,S.bank[q]);S.bank[q]-=n;S.bank[p]+=n;S.credits[p]+=n;S.stats.tko[p]++;log(pn(q)+" pays "+n+" with it.")}if(S.st[id].o!==p)own(id,p);log(pn(p)+" claims "+ST[id].n+" by Eminent Domain.");if(S.hop&&S.hop.to===id){S.hop.settled=true;S.auc=null}}
  if(c.id==="G4"){const mid=o.seen[1];if(S.st[mid].o===q)S.stats.tko[p]++;if(S.st[mid].o!==p)own(mid,p);log(pn(p)+" smashes and grabs "+ST[mid].n+".")}
  if(base>0){gain=Math.floor(base*mult(o));if(o.sooth==="hit")gain=0;if(o.sooth==="miss")gain*=2;S.bank[p]+=gain;S.credits[p]+=gain}
  S.stats.cards[p]++;
  if(c.fam!=="Gambit")log(pn(p)+" passes "+c.n+(o.stakes==="allin"?" All-in":"")+(gain?": +"+gain:"")+(note?" ("+note+")":"")+".");
  if(c.balance)reinsertBalance();
  if(o.road&&S.hop)S.hop.road=true;bankrunTick(p,true);setFirst(p,o.road?"blocked":"win");
  flash("Pass",pn(p)+(gain?" +"+gain+" chips.":" passes "+c.n+".")+(o.road?" Roadblock: the station goes to auction.":S.hop&&S.hop.up===p&&!S.hop.lock&&!S.hop.settled?" First option on the station.":""),"Take");
  return;
 }
 if(out==="veto"){
  log(pn(p)+" vetoes "+c.n+". "+pn(q)+" gets first option.");if(c.balance)reinsertBalance();setFirst(p,"fail");return;
 }
 // fail
 if(c.fam==="Gambit"){
  if(c.id==="G0"||c.id==="G3"){const b=S.bank[p];S.bank[p]=Math.floor(b/2);log(pn(p)+" misses "+c.n+(note?" ("+note+")":"")+": bank "+b+" → "+S.bank[p]+".")}
  else if(c.id==="G1"){const n=Math.floor(S.bank[p]*.3);S.bank[p]-=n;S.bank[q]+=n;S.credits[q]+=n;log(pn(p)+" fails Pickpocket: "+n+" to "+pn(q)+".")}
  else log(pn(p)+" fails "+c.n+(note?" ("+note+")":"")+".");
 }else{
  if(o.stakes==="allin"){const n=Math.min(3,S.bank[p]);S.bank[p]-=n;S.bank[q]+=n;S.credits[q]+=n;log(pn(p)+" fails "+c.n+" All-in"+(note?" ("+note+")":"")+". "+n+" chips to "+pn(q)+".")}
  else log(pn(p)+" fails "+c.n+(note?" ("+note+")":"")+".");
  if(c.balance)reinsertBalance();
 }
 bankrunTick(p,false);setFirst(p,"fail");
 flash("Fail",(S.hop&&S.hop.up===p&&!S.hop.lock&&!S.hop.settled?pn(q)+" gets first option on the station.":pn(p)+" misses."),"Stunt");
}
function duelEnd(p,w){
 const o=S.open[p],c=CARD[o.id];S.open[o.p]=null;const l=1-w;const n=Math.min(c.amt,S.bank[l]);S.bank[l]-=n;S.bank[w]+=n;S.credits[w]+=n;
 log(pn(w)+" wins "+c.n+" and takes "+n+" chips.");setFirst(o.p,w===o.p?"win":"fail");
}
function lockTwoEnd(p,w){
 const o=S.open[p],L=LOCKS[o.id];S.open[o.p]=null;const lead=held(w)-held(1-w);const pay=Math.round(L.r*(lead>=2?0.5:lead<=-2?1.5:1));own(o.id,w);S.bank[w]+=pay;S.credits[w]+=pay;S.stats.locks[w]++;S.stats.cards[w]++;
 log(pn(w)+" wins "+L.n+": "+ST[o.id].n+" and "+pay+".");if(S.hop&&S.hop.to===o.id)S.hop.settled=true;
}

// ================= curses =================
function playCurse(p,idx,extra,dIdx){
 const q=1-p,ci=S.hand[p][idx],c=CURSES[ci];
 if(c.chips&&S.bank[p]<c.chips)return false;
 if(c.k==="gilded"&&(!extra||S.st[extra].o!==p))return false;
 if(c.k==="sooth"&&!extra)return false;
 if(c.chips)S.bank[p]-=c.chips;
 S.hand[p]=S.hand[p].filter((_,j)=>j!==idx);
 log(pn(p)+" plays "+c.n+" on "+pn(q)+".");revealUntil=now()+1e12;reveal={fam:"Curse",n:c.n,d:c.eff,sub:pn(p)+" → "+pn(q)};
 const f=S.fx[q];
 if(c.k==="rush")f.rush=true;
 if(c.k==="road")f.road=true;
 if(c.k==="wrong")f.wrong=true;
 if(c.k==="fare")f.fare=true;
 if(c.k==="gilded"){S.st[extra].gild=true;log(ST[extra].n+" is gilded.")}
 if(c.k==="sooth")f.sooth=extra;
 if(c.k==="second")f.second=true;
 if(c.k==="silent")f.silent=2;
 if(c.k==="jury")f.jury=true;
 return true;
}

// ================= scoring =================
function score(){
 const prop=[0,1].map(p=>STATIONS.filter(s=>S.st[s.id].o===p).reduce((a,s)=>a+s.p,0));
 const ch=majorities().t;
 const cr=[0,1].map(p=>Math.floor((S.credits[p]+S.bank[p])/20));
 const stars=[0,0],names=[[],[]];
 for(const [k,lab] of [["cards","Showman"],["tko","Highwayman"],["auc","Auctioneer"],["locks","Lockpick"]]){
  const a=S.stats[k][0],b=S.stats[k][1];
  if(a>b){stars[0]+=3;names[0].push(lab)}else if(b>a){stars[1]+=3;names[1].push(lab)}else{stars[0]+=1.5;stars[1]+=1.5;names[0].push(lab+" (split)");names[1].push(lab+" (split)")}
 }
 const tot=[0,1].map(p=>prop[p]+ch[p]+cr[p]+stars[p]);
 let w=tot[0]>tot[1]?0:tot[1]>tot[0]?1:null;
 if(w===null){const h=[held(0),held(1)];w=h[0]>h[1]?0:h[1]>h[0]?1:null}
 if(w===null){const c=S.stats.cards;w=c[0]>c[1]?0:c[1]>c[0]?1:null}
 if(w===null){const last=[0,1].map(p=>Math.max(0,...S.hist.filter(h=>h.o===p).map(h=>h.t)));w=last[0]<last[1]?0:1}
 return {prop,ch,cr,stars,names,tot,w};
}


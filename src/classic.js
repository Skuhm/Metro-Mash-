// ================= classic: two players, one phone =================
const classicKey=()=>"turf.classic."+CITY.id;
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
const stopAt=()=>{if(S&&S.stopTs)return S.stopTs;const [h,m]=((S&&S.stop)||"16:15").split(":").map(Number);const d=new Date();d.setHours(h,m,0,0);if(d.getTime()<=Date.now())d.setDate(d.getDate()+1);return d.getTime()};
const minsLeft=()=>Math.max(0,Math.round((stopAt()-now())/60000));
const pn=i=>S.players[i].name||("Player "+(i+1));
const up=()=>S.up,cam=()=>1-S.up;
function log(t){S.log.unshift({t:now(),x:t});if(S.log.length>600)S.log.length=600}
function price(id){return ST[id].p*STAR_COST*(S.st[id].gild?2:1)}
function held(p){return STATIONS.filter(s=>S.st[s.id].o===p).length}
function majorities(st){st=st||S.st;const t=[0,0],rows=[];for(const m of MAJ){const c=[0,1].map(p=>m.ids.filter(id=>st[id].o===p).length);let a=0,b=0;if(c[0]>c[1])a=m.pts;else if(c[1]>c[0])b=m.pts;else if(c[0]){a=b=m.pts/2}t[0]+=a;t[1]+=b;rows.push({m,c,a,b})}return {t,rows}}
function chainLen(p,st){st=st||S.st;let b=0;for(const line of LINES){let c=0;for(const id of line){c=st[id].o===p?c+1:0;b=Math.max(b,c)}}return b}
function tkoPrice(id){return S.st[id].gild?TKO_CAP*STAR_COST:Math.min(TKO_CAP,2*ST[id].p)*STAR_COST}
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
function spec(o){const b=o.lock?LOCKS[o.id]:CARD[o.id];return o.listItems?Object.assign({},b,{list:o.listItems}):b}
function nextRec(){
 const c=S.cur;if(!c)return START_ID;
 const u=unvisited();if(!u.length)return ADJ[c][0];
 // first step toward the nearest unvisited station
 let best=null,bt=1e9;
 for(const n of ADJ[c]){const d=dist(n);const t=Math.min(...u.map(s=>(s.id===n?0:d[s.id]??1e9)))+EDGE[c+">"+n].t;if(t<bt){bt=t;best=n}}
 return best;
}
const LAY_EVERY=3*3600000,LAY_MIN=45;
function layDue(){return S.phase==="play"&&now()-(S.layLast||S.startedAt||now())>=LAY_EVERY}
function szHere(){if(!S.cur||S.sz||!S.hop||!S.hop.settled)return null;return layDue()?S.cur:null}

// ================= persistence =================
function persist(){
 S.rev=(S.rev||0)+1;
 lsSet(classicKey(),S)
 if(!dbDoc)return;
 const body=JSON.parse(JSON.stringify(S));pending=body;
 writing=writing.then(async()=>{if(pending!==body)return;try{await dbDoc.set(body)}catch(e){}});
}
function commit(){persist();render()}
const hopKey=()=>S&&S.hop?S.boards+":"+(S.hop.arrived?1:0)+":"+(S.hop.settled?1:0):"none";
function routeTab(){if(S.phase!=="play")return;tab=(S.hop&&!S.hop.settled)?"cards":"map"}
function act0(fn){undo.push(JSON.stringify(S));if(undo.length>25)undo.shift();const k0=hopKey();fn();if(hopKey()!==k0)routeTab();commit()}
async function classicBoot(){
 {const d=lsGet(classicKey());if(d&&d.v===5)S=d}
 if(!S){S=fresh();}
 render();
 try{
  const db=await claude.use("db");
  if(db){
   dbDoc=db.doc("games/"+CITY.id);
   dbDoc.onSnapshot(snap=>{
    if(!snap.exists)return;const d=snap.data();
    if(d&&d.v!==5&&Array.isArray(d.players)&&S.phase==="setup"&&!S.players[0].name&&!S.players[1].name){S.players=d.players.slice(0,2).map(p=>({name:String(p.name||""),cons:String(p.cons||"")}));persist();render();return}
    const sameGame=d&&d.gid&&d.gid===S.gid,newerGame=d&&d.gid&&d.gid!==S.gid&&(d.startedAt||0)>(S.startedAt||0);
    if(d&&d.v===5&&((sameGame&&(d.rev||0)>(S.rev||0))||newerGame)){S=JSON.parse(JSON.stringify(d));lsSet(classicKey(),S);render()}
   },()=>{});
  }
 }catch(e){}
}

// ================= core flow: one hop = one turn =================
function startGame(){
 S.pile=shuffle(CARDS.map(c=>c.id));
 S.cpile=shuffle(CURSES.flatMap((c,i)=>[i,i]));
 S.gid=Math.random().toString(36).slice(2);S.startedAt=now();S.layLast=now();S.up=Math.random()<.5?0:1;S.phase="play";S.bank=[START,START];S.stopTs=stopAt();if(S.stopTs-now()>18*3600000)log("Hard stop "+S.stop+" has already passed today; it is set for tomorrow. Change it in the Log tab.");
 log("Coin toss: "+pn(S.up)+" is Up first. Deck and curse pile shuffled. "+START+" monies each.");

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
 if(o.id==="G7"){log("Duel ends at the doors with nobody at seven. No monies move.");S.open[p]=null;return}
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
 S.open[p]={id,p,lock:false,drawnAt:now(),drawStops:S.stops,stakes:"set",forced,listItems:cardListFor(c,S.hop?S.hop.to:(S.cur||START_ID)),rush,sooth,road,second,started:false,tally:0,strikes:0,list:[],declared:null};
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
 if(sp.declare&&!o.declared)return {ok:false,why:"Declare a number first."};
 if(sp.ride&&!o.lock&&S.hop&&S.hop.arrived&&!sp.span)return {ok:false,why:"Start it on the train."};
 if(o.lock&&sp.bridge&&!o.bridgeBoarded)return {ok:false,why:sp.bridge.need};
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
function mult(o){return 1}
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
  if(c.bonus&&o.bonus)base+=c.bonus.chips;
  if(base>0){gain=Math.floor(base*mult(o));if(o.sooth==="hit")gain=0;if(o.sooth==="miss")gain*=2;S.bank[p]+=gain;S.credits[p]+=gain}
  S.stats.cards[p]++;
  if(c.fam!=="Gambit")log(pn(p)+" passes "+c.n+(gain?": +"+gain:"")+(note?" ("+note+")":"")+".");
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
  {const n=Math.min(cardLoss(c,o),S.bank[p]);S.bank[p]-=n;log(pn(p)+" fails "+c.n+(note?" ("+note+")":"")+(n?". Loses "+n+" chips.":"."))}
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
 const cr=[0,1].map(p=>S.done?Math.floor(S.credits[p]/20):0);
 const stars=[0,0],names=[[],[]];
 if(S.done)for(const [k,lab] of [["cards","Showman"],["tko","Highwayman"],["auc","Auctioneer"],["locks","Lockpick"]]){
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


function viewState(){return {st:S.st,cur:S.cur,up:S.up,sel}}

// ================= rendering =================
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
 if(S.phase==="setup"){document.body.classList.remove("playing","onmap","oncard");tabs.hidden=true;top.innerHTML=`<div class="r"><div><div class="lbl">Metro Mash</div><h1 class="d">${esc(CITY.copy.title)}</h1></div><button class="back" data-act="home">‹ All games</button></div>`;renderSetup(main);renderOv();return}
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
 <div class="card small"><b>The day.</b> ${esc(classicDay())}</div>
 <button class="bigbtn" data-act="howto">How the game works</button>
 <button class="ink bigbtn" data-act="start">Toss the coin and start</button></div>`;
 m.querySelectorAll("input").forEach(i=>i.addEventListener("input",()=>{S.players[0].name=$("#n1").value;S.players[1].name=$("#n2").value;S.players[0].cons=$("#c1").value;S.players[1].cons=$("#c2").value;S.stop=$("#hs").value||"16:15";lsSet(classicKey(),S)}));
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
   if(S.boards>0)sides=S.hij==null?side(`data-act="hijack" ${S.bank[u]>=HIJACK?"":"disabled"}`,"Hijack",HIJACK+" monies"):side('data-act="unhijack"',"Undo","hijack");
   const others=ADJ[S.cur].filter(x=>x!==cand);
   chips=others.map(id=>`<button class="fchip${S.st[id].vis?"":" new"}" data-act="pick" data-id="${id}"><b>${esc(ST[id].n)}</b><span>${esc(viaTxt(S.cur,id))}</span></button>`).join("");
   if(rec!==cand&&unvisited().length)chips=`<button class="fchip hint" data-act="pick" data-id="${rec}"><b>Nearest new stop</b><span>${esc(ST[rec].n)}</span></button>`+chips;
  }
 }
 return `<div class="fbottom">${info||""}${showKey?legendHTML():""}${chips?`<div class="fchips">${chips}</div>`:""}<div class="fnav sheet">${main}${sides}</div></div>`;
}
function renderMap(m){
 const pops=STATIONS.filter(s=>lastOwners[s.id]!==undefined&&lastOwners[s.id]!==S.st[s.id].o).map(s=>s.id);
 lastOwners=Object.fromEntries(STATIONS.map(s=>[s.id,S.st[s.id].o]));
 const u=S.up,nc=S.hand[1-u].length;
 const fp=p=>`<div class="fp p${p+1} ${p===u?"up":""}"><b>${esc(pn(p))}</b><span>${S.bank[p]}</span></div>`;
 const fx=[];for(const p of [0,1]){const f=S.fx[p];for(const k of ["jury","silent","wrong","fare","road","rush","second"])if(f[k]){const cu=CURSES.find(x=>x.k===k);fx.push(`<button class="fx" data-act="curseinfo" data-k="${k}">${esc(pn(p))}: ${cu.n}</button>`)}}
 const fhud=`<div class="fhud"><div class="fplates">${fp(u)}${fp(1-u)}</div><div class="fmenu"><button data-act="tab" data-t="curses" aria-label="Curses, count and settings">☰${nc?` <span class="cnt">${nc}</span>`:""}</button></div>${fx.length?`<div class="ffx">${fx.join("")}</div>`:""}<div class="fclock">${unvisited().length} stations left · ${clockLeft()} to the stop</div></div>`;
 const h=S.hop;const next=h&&!h.arrived?h.to:(!h||h.settled)?((sel&&S.cur&&ADJ[S.cur].includes(sel))?sel:nextRec()):null;
 let info="";
 if(sel&&sel!==S.cur){const v=S.st[sel],s=ST[sel];info=`<div class="selinfo"><b>${esc(s.n)}</b> · ${v.o==null?(sealed(sel)?"Sealed":"Unowned"):"Owned by "+esc(pn(v.o))} · price ${price(sel)}${v.o!=null&&v.o!==S.up?" · buyout "+tkoPrice(sel):""}</div>`}
 const chrome=`${fhud}<div class="mapctl"><button data-act="zoom" data-z="1.25" aria-label="Zoom in">+</button><button data-act="zoom" data-z="0.8" aria-label="Zoom out">−</button><button data-act="recenter" aria-label="Back to the train">◎</button><button data-act="key" aria-pressed="${showKey}">Key</button></div>${navHTML(info)}`;
 liveMap(m,viewState(),{pops,next},chrome);
 const focusId=S.cur?(S.cur+">"+(next||"")):"start";
 if(focusId!==mapFocus){mapFocus=focusId;requestAnimationFrame(()=>centerMap(S.cur||START_ID,next,false))}
}
function stationPanel(id){
 const s=ST[id],v=S.st[id],u=S.up,c=1-u,pr=price(id),h=S.hop;
 let x=`<div class="stp"><div class="hd"><div><h2 class="d">${esc(s.n)}</h2><div class="small muted">${v.o==null?(sealed(id)?"Sealed":"Unowned"):"Owned by "+esc(pn(v.o))}${v.gild?" · gilded":""}</div></div><span class="price">${pr}</span></div>`;
 const o=S.open[u];
 if(S.auc)return x+aucPanel()+`</div>`;
 if(v.o==null){
  if(sealed(id)){
   if(o&&o.lock)x+=`<div class="banner" style="border-color:var(--gold)">${esc(LOCKS[id].n)} is open. Run it from the Cards tab.</div><div class="small muted">Run it below.</div>`;
   else if(o&&!spec(o).span)x+=`<div class="banner warn">${esc(pn(u))}'s card ${esc(spec(o).n)} is still open. Settle it (it pays monies), then open the sealed challenge.</div><div class="small muted">It's below.</div>`;
   else if(o)x+=`<div class="banner" style="border-color:var(--gold)">A sealed challenge waits here. ${esc(spec(o).n)} pauses while ${esc(pn(u))} attempts it.</div><button class="ink bigbtn" data-act="lockopen">Open the sealed challenge</button>`;
   else x+=`<div class="banner" style="border-color:var(--gold)">A sealed challenge waits here. ${esc(pn(u))} opens it on camera.${v.failedBy!=null&&v.failedBy!==u?" <b>Pays double:</b> "+esc(pn(v.failedBy))+" failed it.":v.failedBy===u?" You failed it before; same payout.":""}</div><button class="ink bigbtn" data-act="lockopen">Open the sealed challenge</button>`;
  }else{
   const f=firstOpt();
   if(f==="wait"){x+=`<div class="banner">${esc(pn(u))} is on ${esc(spec(o).n)} here. Pass it for first option on ${esc(s.n)}; fail or veto and ${esc(pn(c))} gets it.</div><div class="small muted">Run it below.</div>`}
   else if(f===u&&s.p<4){const noBuy=S.fx[f].jury;
    x+=`<div class="banner">${esc(pn(f))} has first option${h.card==="none"?"":h.first==null?" (card still going)":" ("+(f===u?"passed the card":esc(pn(u))+" failed")+")"}.</div><div class="row"><button class="p${f+1} bigbtn" data-act="buy" data-p="${f}" ${S.bank[f]<pr*(S.fx[f].fare?2:1)||noBuy?"disabled":""}>${esc(pn(f))} buys for ${pr*(S.fx[f].fare?2:1)}${S.fx[f].fare?" (Double Fare)":""}</button><button class="bigbtn" data-act="aucopen">Pass: auction it</button></div>${noBuy?`<div class="small muted">Jury Duty: ${esc(pn(f))} can't buy until the take is recorded.</div>`:S.bank[f]<pr?`<div class="small muted">${esc(pn(f))} can't afford it.</div>`:""}`}
   else{const why=s.p===4?"Hubs (4-star stations) can't be bought outright. They always go to auction.":h.aucWhy==="road"?"Roadblock: the pass paid monies but can't win the station.":h.card==="none"?"No card this hop, so nobody earned the right to buy it.":esc(pn(u))+" failed or vetoed the card, so nobody gets to buy it outright.";
    x+=`<div class="banner">${why} Either of you can bid, or leave it unowned.</div><div class="row"><button class="ink bigbtn" data-act="aucopen">Start the bidding</button><button class="bigbtn" data-act="aucskip">Leave it unowned</button></div>`}
  }
 }else if(v.o===c){
  const o2=S.open[u];const tk=tkoPrice(id)*(S.fx[u].fare?2:1);const can=S.bank[u]>=tk&&!S.fx[u].jury;
  if(v.gild)x+=`<div class="banner" style="border-color:var(--curse)">Gilded: a card pass doesn't take it here. Only a buyout.</div>`;
  else if(o2&&!o2.lock&&!spec(o2).span&&!spec(o2).ride)x+=`<div class="banner">${esc(pn(c))}'s station. Pass ${esc(spec(o2).n)} here and it's yours.</div><div class="small muted">Run it below.</div>`;
  else x+=`<div class="banner">${esc(pn(c))}'s station.${h.first===u?"":" No pass this hop."}</div>`;
  x+=`<div class="row"><button class="p${u+1} bigbtn" data-act="tko" ${can?"":"disabled"}>Buy it out for ${tk}${v.gild?" (gilded)":""}</button><button class="bigbtn" data-act="done">Leave it</button></div>`;
  if(!can)x+=`<div class="small muted">${S.fx[u].jury?"Jury Duty: no buying.":"Buyout costs "+tk+" (double its value, capped at "+TKO_CAP*STAR_COST+")."}</div>`;
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
 let rewardTxt=sp.rtxt||(typeof sp.r==="number"?String(sp.r)+" monies":sp.r);
 if(!o.lock&&sp.balance)rewardTxt=[8,12,16][Math.min(S.balanceN,3)-1]+" monies · object at least "+[12,24,36][Math.min(S.balanceN,3)-1]+" inches long";
 let body=`<dl><dt>Do this</dt><dd>${esc(sp.d)}</dd><dt>Counts</dt><dd>${esc(sp.c)}</dd><dt>Limit</dt><dd>${esc(sp.t)}${o.rush?" <b>Halved: Rush Hour.</b>":""}</dd><dt>${o.lock?"Win":"Reward"}</dt><dd>${esc(o.lock?(sp.two?"The station, and "+sp.r+" to the winner (×1.5 if two stations behind, ×0.5 if two ahead)":"The station and "+o.pay+" monies"+(o.boost>1?" (doubled after their fail)":"")+(o.band>1?" (behind: ×1.5)":o.band<1?" (ahead: ×0.5)":"")):rewardTxt)}${!o.lock&&sp.fam!=="Gambit"?", and first option on the station if you pass":""}</dd>${!o.lock&&o.id==="S1"?`<dt>Landmark</dt><dd><b>${esc(o.lm||ST[S.hop?S.hop.to:START_ID].lm)}</b></dd>`:""}</dl>`;
 if(o.sooth)body+=`<div class="banner warn">Soothsayer ${o.sooth==="hit"?"called it: this card pays nothing.":"missed: this card pays double."}</div>`;
 if(!o.started){
  if(!o.lock&&sp.declare)body+=`<div><div class="lbl" style="margin-bottom:6px">Declare how many takes</div><div class="stakes decl">${sp.declare.map(n=>`<button aria-pressed="${o.declared==n}" data-act="decl" data-p="${p}" data-n="${n}">${n} takes<span>+${CYT_PAY[n]} if you get them · −${CYT_PAY[n]} if you don't</span></button>`).join("")}</div></div>`;
  if(!o.lock&&o.id==="S1")body+=`<div><label class="lbl" for="est${p}">Stranger's estimate (minutes)</label><input id="est${p}" data-in="est" data-p="${p}" type="number" inputmode="numeric" min="1" max="60" value="${o.est||""}"></div>`;
  if(!o.lock&&o.id==="G1")body+=`<div><label class="lbl" for="stunt${p}">Stunt</label><select id="stunt${p}" data-in="stunt" data-p="${p}"><option value="">Choose…</option>${STATION_STUNTS.map(id=>`<option value="${id}" ${o.stunt===id?"selected":""}>${esc(CARD[id].n)}</option>`).join("")}</select></div>${o.stunt?`<div class="small"><b>${esc(CARD[o.stunt].n)}:</b> ${esc(CARD[o.stunt].d)} Counts: ${esc(CARD[o.stunt].c)}</div>`:""}`;
  if(o.lock&&sp.bridge)body+=`<button data-act="bridgeboard" data-p="${p}" ${o.bridgeBoarded?"disabled":""}>${esc(o.bridgeBoarded?sp.bridge.boarded:sp.bridge.board)}</button>`;
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
 if(sp.bonus)x+=`<button data-act="bonus" data-p="${p}" aria-pressed="${!!o.bonus}">${o.bonus?"✓":"○"} ${esc(sp.bonus.label)} (+${sp.bonus.chips})</button>`;
 if(!o.lock&&o.id==="G4")x+=`<div class="small muted">Stations passed: ${(o.seen||[]).map(id=>esc(ST[id].n)).join(", ")||"none yet"} of 3. Seven takes by the third; the middle one is the prize.</div>`;
 if(!o.lock&&o.id==="G0"){x+=`<div class="grid2"><div><label class="lbl" for="dc${p}">${esc(pn(p))}'s number</label><input id="dc${p}" data-in="dc" data-p="${p}" type="number" inputmode="numeric" value="${o.dc??""}"></div><div><label class="lbl" for="sc${p}">${esc(pn(q))}'s count</label><input id="sc${p}" data-in="sc" data-p="${p}" type="number" inputmode="numeric" value="${o.sc??""}"></div></div><button class="ink" data-act="dblcheck" data-p="${p}">Compare</button>`}
 if(o.lock&&sp.bridge)x+=`<button class="ink" data-act="bridgeend" data-p="${p}">${esc(sp.bridge.end)}</button>`;
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

function renderCurses(m){
 const cam=1-S.up;
 let x=`<div class="stack"><div class="card small muted">Camera plays curses on the Up player, any time. You draw one whenever the other player gains a station. Hand of three. Curse pile: ${S.cpile.length}.</div>`;
 for(const p of [cam,S.up]){const hand=S.hand[p],need=hand.length>3,q=1-p,isCam=p===cam;
  x+=`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h2 class="d" style="color:var(--p${p+1})">${esc(pn(p))}'s curses</h2><span class="small muted">${isCam?"on Camera: can play":"Up: holds until next hop"}</span></div>${need?`<div class="banner bad">Four curses in hand. Discard one before playing.</div>`:""}`;
  hand.forEach((ci,i)=>{const c=CURSES[ci];
   let extra="";
   if(c.k==="gilded")extra=`<select id="g${p}_${i}"><option value="">Your station…</option>${STATIONS.filter(s=>S.st[s.id].o===p&&!S.st[s.id].gild).map(s=>`<option value="${s.id}">${esc(s.n)}</option>`).join("")}</select>`;
   if(c.k==="sooth")extra=`<select id="s${p}_${i}"><option value="">Call a family…</option><option>Take</option><option>Stunt</option></select>`;
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
 <div class="card"><h3 class="d">New game</h3><button data-act="home">Back to all games</button><button class="bad" data-act="reset">Wipe the day and start over</button><div id="rc" hidden class="banner bad">This deletes the whole day. <button class="bad" data-act="reallyreset">Wipe it</button></div></div></div>`;
}
function renderCount(m){
 const r=score(),h=[held(0),held(1)],col=p=>`style="color:var(--p${p+1})"`;
 const u=unvisited();
 m.innerHTML=`<div class="stack"><div class="card"><h2 class="d">${S.done?"Final count":"Live count"}</h2>
 <div class="sg"><div class="lbl">Stars</div><div class="lbl" ${col(0)}>${esc(pn(0))}</div><div class="lbl" ${col(1)}>${esc(pn(1))}</div>
  <div>Property · ${h[0]} / ${h[1]} stations</div><div class="num">${r.prop[0]}</div><div class="num">${r.prop[1]}</div>
  <div>Line majorities</div><div class="num">${r.ch[0]}</div><div class="num">${r.ch[1]}</div>${majorities().rows.map(x=>`<div class="small muted" style="padding-left:10px">${esc(x.m.n)} · ${x.c[0]} / ${x.c[1]} of ${x.m.ids.length} · worth ${x.m.pts}</div><div class="small num muted">${x.a}</div><div class="small num muted">${x.b}</div>`).join("")}
  ${S.done?`<div>Monies earned ÷ 20</div><div class="num">${r.cr[0]}</div><div class="num">${r.cr[1]}</div>
  <div>Bonus stars</div><div class="num">${r.stars[0]}</div><div class="num">${r.stars[1]}</div>`:`<div class="muted">Monies earned ÷ 20</div><div class="num muted">?</div><div class="num muted">?</div>
  <div class="muted">Bonus stars</div><div class="num muted">?</div><div class="num muted">?</div>`}
  <div class="d">Total</div><div class="big num" ${col(0)}>${r.tot[0]}</div><div class="big num" ${col(1)}>${r.tot[1]}</div></div>
 ${S.done?`<div class="small"><b>${esc(pn(0))}:</b> ${r.names[0].join(", ")||"no stars"}<br><b>${esc(pn(1))}:</b> ${r.names[1].join(", ")||"no stars"}</div>`:`<div class="small muted">Monies stars and bonus stars are revealed at the final count.</div>`}
 ${S.done?`<div class="banner ok">${esc(pn(r.w))} wins. ${esc(pn(1-r.w))} owes: ${esc(S.players[r.w].cons||"the consequence named at the start")}.</div>`:""}
 ${u.length?`<div class="banner ${S.done?"bad":"warn"}">${u.length} station(s) not reached: ${u.map(s=>esc(s.n)).join(", ")}.</div>`:`<div class="banner ok">${esc(CITY.copy.reached)}</div>`}
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
  <li><b>Play the card.</b> Train cards finish before the doors open. Platform cards happen at the next station. Pass it and you bank its monies; fail it and you lose half of them.</li>
  <li><b>Doors open.</b> Pass the card and you may buy the station at its price. Fail, veto, or pass on buying: it goes to auction, both of you bidding. Big hubs always auction.</li>
  <li><b>Their station:</b> pass the card there and it's yours. Or buy it out for double its value, capped at ${TKO_CAP*STAR_COST}. No rent.</li>
  <li><b>Gold stations</b> are sealed: whoever is Up opens the challenge there, after the card. Fail it and it stays sealed; the other player's attempt pays double. Pay ${HIJACK} monies to Hijack a hop and stay Up out of turn. Most stars at ${esc(S.stop)} wins: stations, longest chain, monies, bonus stars.</li></ol>
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
 const el=$("#show");requestAnimationFrame(()=>fitStage(el.querySelector(".stage"),(opt&&opt.pops&&opt.pops[0])||null));
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
  if(i>=H.length){drawShow({st,cur:null,up:0},{},{t:"Final board",s:"Most stars wins"});return}
  const e=H[i++];st[e.id].o=e.o;st[e.id].vis=true;
  drawShow({st,cur:e.id,up:e.o},{pops:[e.id]},{t:pn(e.o)+" takes "+ST[e.id].n,s:hhmm(e.t)});
  showTimer=setTimeout(step,900);
 };
 showTimer=setTimeout(step,1200);
}
function runExplain(){xpOpen("show")}
function classicDay(){
 const s=ST[START_ID],n=LOCK_IDS.length,w=["no","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen"][n]||String(n);
 return CITY.copy.day+" Start at "+s.n+(s.p===4?". It's a hub, so the day opens with a bid. ":"; whoever won the toss has first option on it. ")+"Whoever is Up picks the direction. You alternate being Up every hop and a card draws every hop. "+w[0].toUpperCase()+w.slice(1)+" gold stations hold sealed challenges. A layover every three hours: a stranger picks where you eat.";
}

// ================= input wiring =================
function bindInputs(m){
 m.querySelectorAll("[data-in]").forEach(el=>{
  const ev=el.tagName==="SELECT"?"change":"input";
  el.addEventListener(ev,()=>{const o=S.open[+el.dataset.p];if(!o)return;const k=el.dataset.in;
   if(k==="decl")o.declared=+el.value||null;
   if(k==="est")o.est=+el.value||null;
   if(k==="stunt")o.stunt=el.value||null;
   if(k==="tgt")o.target=el.value||null;
   if(k==="dl"){if(el.value){const [hh,mm]=el.value.split(":").map(Number);const t=new Date();t.setHours(hh,mm,59,999);o.deadline=t.getTime()}else o.deadline=null}
   if(k==="dc")o.dc=el.value===""?null:+el.value;
   if(k==="sc")o.sc=el.value===""?null:+el.value;
   if(k==="hands")o.hands=el.value===""?null:+el.value;
   persist();
   if(ev==="change"||k==="est")render();
  });
 });
}
document.addEventListener("click",e=>{
 if(MODE!=="classic")return;
 const b=e.target.closest("[data-act]");if(!b||b.disabled)return;
 const a=b.dataset.act,D=b.dataset;
 const p=D.p!=null?+D.p:null;const o=S&&p!=null?S.open[p]:null,sp=o?spec(o):null;
 switch(a){
  case"tab":tab=({log:"more",count:"more",show:"more"})[D.t]||D.t;render();$("#main").scrollTop=0;return;
  case"sel":{const id=D.id,h=S.hop;
   if(S.phase==="play"&&!locked()&&!S.sz){
    if(h&&!h.arrived&&id===h.to){act0(()=>arrive());return}
    if((!h||h.settled)&&S.cur&&ADJ[S.cur].includes(id)){if(sel===id){act0(()=>{startHop(id);sel=null});return}sel=id;render();return}
    if(!S.cur&&id===START_ID){act0(()=>startHop(id));return}
   }
   sel=sel===id?null:id;render();return}
  case"pick":sel=D.id;render();return;
  case"toastx":if(S.toast)S.toast.gone=1;$("#toast").hidden=true;return;
  case"back":routeTab();render();return;
  case"zoom":setZoom(mapZoom*(+D.z));return;
  case"recenter":{const h=S.hop;centerMap(S.cur||START_ID,h&&!h.arrived?h.to:null,true);return}
  case"key":showKey=!showKey;render();return;
  case"closereveal":reveal=null;renderOv();return;
  case"howto":xpOpen("help");return;
  case"howtoclose":howto=false;renderOv();return;
  case"start":act0(()=>startGame());xpOpen("help");return;
  case"hop":act0(()=>{startHop(D.id);sel=null});return;
  case"arrive":act0(()=>arrive());return;
  case"done":act0(()=>{S.hop.settled=true});return;
  case"buy":act0(()=>{const id=S.cur,w=p,pr=price(id)*(S.fx[w].fare?2:1);S.bank[w]-=pr;if(S.fx[w].fare){S.fx[w].fare=false;log("Double Fare.")}own(id,w);log(pn(w)+" buys "+ST[id].n+" for "+pr+".");S.hop.settled=true});return;
  case"aucopen":act0(()=>{S.auc={id:S.cur,bid:0,hi:null};log("Auction: "+ST[S.cur].n+".")});return;
  case"bid":act0(()=>{S.auc.bid+=(+D.n||1);S.auc.hi=p;log(pn(p)+" bids "+S.auc.bid+".")});return;
  case"aucskip":act0(()=>{log(ST[S.cur].n+" stays unowned.");S.hop.settled=true});return;
  case"aucwin":act0(()=>{const a2=S.auc,w=a2.hi;const cost=a2.bid*(S.fx[w].fare?2:1);if(S.fx[w].fare){S.fx[w].fare=false;log("Double Fare.")}S.bank[w]=Math.max(0,S.bank[w]-cost);own(a2.id,w);S.stats.auc[w]++;log(pn(w)+" wins "+ST[a2.id].n+" at auction for "+a2.bid+".");S.auc=null;S.hop.settled=true});return;
  case"aucnone":act0(()=>{log("No bids. "+ST[S.auc.id].n+" stays unowned.");S.auc=null;S.hop.settled=true});return;
  case"tko":act0(()=>{const id=S.cur,u=S.up,q=1-u,c=tkoPrice(id)*(S.fx[u].fare?2:1);if(S.fx[u].fare){S.fx[u].fare=false;log("Double Fare.")}S.bank[u]-=c;S.bank[q]+=c;S.credits[q]+=c;own(id,u);S.stats.tko[u]++;log(pn(u)+" buys out "+ST[id].n+" for "+c+", paid to "+pn(q)+".");S.hop.settled=true});return;
  case"lockopen":act0(()=>openLock(S.cur));return;
  case"hijack":act0(()=>{const u=S.up;S.bank[u]-=HIJACK;S.hij=u;log(pn(u)+" pays "+HIJACK+" to hijack the next hop.")});return;
  case"unhijack":act0(()=>{S.bank[S.hij]+=HIJACK;log(pn(S.hij)+" cancels the hijack.");S.hij=null});return;
  case"szstart":act0(()=>{const id=szHere();S.sz={id,start:now(),end:now()+LAY_MIN*60000};log("Layover at "+ST[id].n+".")});return;
  case"szskip":act0(()=>{S.layLast=now();log("Layover skipped.")});return;
  case"szend":act0(()=>{const el=now()-S.sz.start;for(const q of [0,1]){const oo=S.open[q];if(oo&&oo.tEnd)oo.tEnd+=el}S.layLast=now();log("Layover over ("+Math.round(el/60000)+" min).");S.sz=null});return;
  case"stake":act0(()=>{o.stakes=D.k;log(pn(p)+": "+D.k+".")});return;
  case"begin":if(!canStart(o).ok)return;act0(()=>begin(o));return;
  case"veto":act0(()=>finishFor(p,"veto"));return;
  case"redraw":act0(()=>redraw(p));return;
  case"bridgeboard":act0(()=>{o.bridgeBoarded=true;log(sp.bridge.boarded+".")});return;
  case"bridgeend":act0(()=>finishFor(p,o.tally>=3?"win":"fail",o.tally>=3?"":sp.bridge.endNote+" "+o.tally+" rulings."));return;
  case"home":goHome();return;
  case"vote":act0(()=>{o.votes=o.votes||[0,0];o.votes[+D.v]++;const v=o.votes;if(v[0]+v[1]>=sp.poll){if(v[0]&&v[1])finishFor(p,"win",v[0]+" for, "+v[1]+" against");else log("Ten votes, all one way. Keep going until someone breaks it.")}});return;
  case"curseinfo":{const c=CURSES.find(c=>c.k===D.k);if(c){reveal={fam:"Curse",n:c.n,d:c.eff+" · Lasts: "+c.dur,sub:"Active"};revealUntil=now()+1e12;renderOv()}return}
  case"secondyes":act0(()=>{o.secondDone=true;o.awaitSecond=false;finishFor(p,"win","A stranger agreed with the take.")});return;
  case"secondno":act0(()=>{o.secondNo=(o.secondNo||0)+1;if(o.secondNo>=3)finishFor(p,"fail","Second Opinion: three strangers disagreed.")});return;
  case"timefail":act0(()=>finishFor(p,"fail","Time."));return;
  case"timeplus":act0(()=>{o.expired=false;o.tEnd=now()+120000;log("Camera grants two more minutes on "+spec(o).n+".")});return;
  case"giveup":act0(()=>finishFor(p,"fail","Gave up."));return;
  case"tally":act0(()=>{
   if(sp.tally.perBoard){if(!o.canStep){flash("Same ride","The next step opens on your next hop as Up.");return}o.canStep=false}
   o.tally++;
   if(o.id==="G4"&&!o.lock)return;
   if(sp.need&&o.tally>=sp.tally.target){o.call=null;return}
   if(sp.tally.target&&o.tally>=sp.tally.target)finishFor(p,"win",o.tally+" "+sp.tally.label.toLowerCase()+"s.");
  });return;
  case"treset":act0(()=>{o.tally=0;log(sp.tally.reset+": back to zero.")});return;
  case"tfail":act0(()=>finishFor(p,"fail",sp.tally.failOn));return;
  case"strike":act0(()=>{o.strikes++;if(sp.hold)o.hStart=null;if(o.strikes>=sp.strikes.max)finishFor(p,"fail",o.strikes+" × "+sp.strikes.label.toLowerCase())});return;
  case"sreset":act0(()=>{o.resetAt=S.stops;log(sp.resetLabel+": back to zero.")});return;
  case"decl":act0(()=>{o.declared=+D.n;log(pn(p)+" declares "+o.declared+" takes.")});return;
  case"bonus":act0(()=>{o.bonus=!o.bonus});return;
  case"throwin":act0(()=>{o.strikes++;o.tally++;if(o.tally>=sp.throws.target)finishFor(p,"win",o.tally+" in "+o.strikes+" throws.");else if(o.strikes>=sp.throws.max)finishFor(p,"fail","Out of throws.")});return;
  case"throwout":act0(()=>{o.strikes++;if(sp.throws.row)o.tally=0;if(o.strikes>=sp.throws.max)finishFor(p,"fail","Out of throws.")});return;
  case"check":act0(()=>{const i=+D.i;if(o.list.includes(i))o.list=o.list.filter(x=>x!==i);else o.list.push(i);const tg=sp.listTarget||sp.list.length;const reqOk=!(sp.req||[]).some(r=>!o.list.includes(r));if(o.list.length>=tg&&reqOk)finishFor(p,"win",o.list.length+" of "+sp.list.length+".")});return;
  case"handsdone":act0(()=>{if(o.hands==null)return;finishFor(p,o.hands>=sp.hands?"win":"fail",o.hands+" hands.")});return;
  case"wstart":act0(()=>{o.wStart=now()});return;
  case"pause":act0(()=>{o.wStart=null;o.strikes++;if(o.strikes>=sp.strikes.max)finishFor(p,"fail","Paused twice.");else log("Paused. One attempt left.")});return;
  case"lapstart":act0(()=>{o.lapEnd=now()+sp.lap*1000;o.tally=0});return;
  case"holdstart":act0(()=>{o.hStart=now()});return;
  case"studystart":act0(()=>{o.sEnd=now()+60000});return;
  case"dblcheck":act0(()=>{if(o.dc==null||o.sc==null)return;finishFor(p,Math.abs(o.dc-o.sc)<=2?"win":"fail","Said "+o.dc+", counted "+o.sc+".")});return;
  case"dthrow":act0(()=>{const r=+D.r;o.dd.t[r]++;if(D.in1==="1")o.dd.h[r]++;if(o.dd.t[0]>=10&&o.dd.t[1]>=10){if(o.dd.h[0]===o.dd.h[1]){o.dd={h:[0,0],t:[0,0]};log("Duel tied. Replay.")}else o.call="p"+(o.dd.h[0]>o.dd.h[1]?0:1)}});return;
  case"dag":act0(()=>{const r=+D.r;o.dd.s[r]++;if(o.dd.s[r]>=4)o.call="p"+r});return;
  case"ddis":act0(()=>{o.dd.s[+D.r]=0});return;
  case"call":act0(()=>{o.call=D.v;o.dispute=false});return;
  case"accept":act0(()=>settle(p,o.call));return;
  case"dispute":act0(()=>{o.dispute=true;log("Disputed. Replaying the clip.")});return;
  case"agree":act0(()=>settle(p,D.v));return;
  case"coin":act0(()=>{const heads=Math.random()<.5;const v=heads?o.call:flip(o.call);log("Still split. Coin: "+(heads?"heads, the call stands.":"tails, the call flips."));flash("Coin flip",heads?"Heads. The call stands.":"Tails. The call flips.");settle(p,v)});return;
  case"cplay":{if(p===S.up)return;const i=+D.i,c=CURSES[S.hand[p][i]];let extra;if(c.k==="gilded")extra=document.getElementById("g"+p+"_"+i).value;if(c.k==="sooth")extra=document.getElementById("s"+p+"_"+i).value;undo.push(JSON.stringify(S));if(!playCurse(p,i,extra,null)){undo.pop();flash("Not yet",S.bank[p]<c.chips?"Not enough chips.":"Pick a target first.");renderOv();return}commit();return}
  case"cdisc":act0(()=>{const g=S.hand[p].splice(+D.i,1)[0];log(pn(p)+" discards "+CURSES[g].n+".")});return;
  case"jurydone":act0(()=>{S.fx[p].jury=false;log("Jury Duty done for "+pn(p)+".")});return;
  case"final":act0(()=>{S.done=true;S.open=[null,null];S.auc=null;log("Hard stop. Count locked.")});return;
  case"reopen":act0(()=>{S.done=false;log("Count reopened.")});return;
  case"extend":act0(()=>{S.stopTs=Math.max(now(),stopAt())+(+D.m)*60000;S.stop=hhmm(S.stopTs);S.done=false;log("Hard stop moved to "+S.stop+".")});return;
  case"setstop":act0(()=>{const v=document.getElementById("hs2").value;if(!v)return;const [h,mm]=v.split(":").map(Number);const d=new Date();d.setHours(h,mm,0,0);if(d.getTime()<=now())d.setDate(d.getDate()+1);S.stopTs=d.getTime();S.stop=v;S.done=false;log("Hard stop set to "+v+".")});return;
  case"undo":{if(!undo.length)return;S=JSON.parse(undo.pop());persist();render();return}
  case"copy":{try{navigator.clipboard.writeText(JSON.stringify(S)).then(()=>{flash("Copied","Game state is on the clipboard.");renderOv()},()=>{});}catch(err){}return}
  case"reset":document.getElementById("rc").hidden=false;return;
  case"reallyreset":S=fresh();undo=[];tab="map";commit();return;
  case"showopen":openShow(D.m);return;
  case"showclose":closeShow();return;
  case"showtap":$("#show").classList.toggle("rec");return;

 }
});

// ================= clock =================
setInterval(()=>{
 if(MODE!=="classic"||!S||S.phase!=="play")return;
 let changed=false;
 if(!S.sz)for(const p of [0,1]){const o=S.open[p];if(!o||!o.started||o.awaitSecond||o.expired)continue;const sp=spec(o);
  if(o.tEnd&&now()>=o.tEnd&&!o.expired&&!(o.id==="G0"&&!o.lock)){o.expired=true;log(spec(o).n+": time is up. Camera rules.");S.toast={n:"Time is up: "+spec(o).n,d:"Camera rules it a fail, or grants two more minutes.",t:now()};changed=true}
  else if(sp.lap&&o.lapEnd&&now()>=o.lapEnd){o.strikes++;o.lapEnd=null;o.tally=0;if(o.strikes>=sp.strikes.max)finishFor(p,"fail","Out of time twice.");else log("Out of time. One attempt left.");changed=true}
  else if(sp.watch&&o.wStart&&now()-o.wStart>=sp.watch*1000){finishFor(p,"win","90 seconds.");changed=true}
  else if(sp.hold&&o.hStart&&now()-o.hStart>=sp.hold*1000){finishFor(p,"win",sp.hold+" seconds.");changed=true}
  else if(!o.lock&&o.id==="G3"&&now()>o.deadline){finishFor(p,"fail","Late.");changed=true}
 }
 if(changed){commit();return}
 for(const p of [0,1]){const o=S.open[p];if(!o||!o.started)continue;
  const q=k=>document.querySelector(`[data-live="${k}"][data-p="${p}"]`);
  if(q("tleft")&&o.tEnd)q("tleft").textContent=fmt(o.tEnd-now());
  if(q("watch")&&o.wStart)q("watch").textContent=Math.floor((now()-o.wStart)/1000);
  if(q("lapleft")&&o.lapEnd)q("lapleft").textContent=fmt(o.lapEnd-now());
  if(q("hold")&&o.hStart)q("hold").textContent=Math.min(spec(o).hold,Math.floor((now()-o.hStart)/1000));
  if(q("study")&&o.sEnd)q("study").textContent=fmt(o.sEnd-now());
 }
 if(S.sz&&document.getElementById("szleft"))document.getElementById("szleft").textContent=fmt(S.sz.end-now());
 if(tab!=="cards"&&now()%30000<1000)renderTop($("#top"));
 if(showMode==="live"&&showRev!==S.rev){showRev=S.rev;drawShow({st:S.st,cur:S.cur,up:S.up},{},liveCap())}
},1000);


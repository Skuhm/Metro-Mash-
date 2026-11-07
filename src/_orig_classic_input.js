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
  case"xpclose":xpClose();return;
  case"xpnext":xpGo(xp.i+1);return;
  case"xpprev":xpGo(xp.i-1);return;
  case"xpgo":xp.auto=false;xpGo(+D.i);return;
  case"xpauto":xp.auto=!xp.auto;if(xp.auto&&xp.i===xpSteps().length-1)xp.i=0;xpDraw(false);return;
  case"xprec":xp.rec=true;xp.auto=true;xpDraw(false);{const hint=$("#show .xp-hint");if(hint){hint.hidden=false;hint.textContent="Recording view. Tap to go on, press and hold to bring the buttons back.";setTimeout(()=>{if(hint)hint.hidden=true},2600)}}return;
  case"xptap":{if(xp.swiped){xp.swiped=false;return}const r=b.getBoundingClientRect();xp.auto=xp.rec?xp.auto:false;xpGo(xp.i+((e.clientX-r.left)<r.width/3?-1:1));return}
  case"xpw":xpWidgetAct(D);return;
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
  case"throwin":act0(()=>{o.strikes++;o.tally++;if(o.tally>=sp.throws.target)finishFor(p,"win",o.tally+" in "+o.strikes+" throws.");else if(o.strikes>=sp.throws.max)finishFor(p,"fail","Out of throws.")});return;
  case"throwout":act0(()=>{o.strikes++;if(o.strikes>=sp.throws.max)finishFor(p,"fail","Out of throws.")});return;
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
 if(!S||S.phase!=="play")return;
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

boot();

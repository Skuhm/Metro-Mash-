// ================= the explainer: a step-through tour of the rules on the live map =================
let xp=null;const XP_MS=9000;
const numWord=n=>(["no","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen"][n]||String(n));
const capFirst=s=>s?s[0].toUpperCase()+s.slice(1):s;
function xst(own){const st=blankSt();STATIONS.forEach(s=>st[s.id].vis=true);if(own)for(const id in own)st[id].o=own[id];return st}
function xpSteps(){return MODE==="teams"?teamsXpSteps():classicXpSteps()}
function classicXpSteps(){
 const X=CITY.xp,P=X.path,T0=CARD.T0,MR=LOCKS[X.sealed],hub=ST[START_ID].p===4;
 return [
  {t:CITY.copy.title,b:CITY.copy.board+" Two players, one phone, one day. Most stars at the stop wins.",
   scene:()=>({st:blankSt(),sweep:1})},
  {t:"You take turns, every hop",b:"One of you is up and plays. The other films. Up picks the next stop, and the roles swap at every hop.",w:"turn",
   scene:w=>{const k=w.k||0,own={};for(let j=1;j<=k;j++)own[P[j]]=(j-1)%2;return {st:xst(own),cur:P[k],next:P[k+1],up:k%2,pops:k?[P[k]]:[],focus:[P[k],P[k+1]],z:2.6}}},
  {t:"A card every time the doors close",b:"Up draws a card: a Take or a Stunt. Train cards finish before the doors open. Platform cards happen at the next stop. Walk or bike a hop and you only draw platform cards.",
   scene:()=>({st:xst(),cur:X.card[0],next:X.card[1],up:0,focus:X.card,z:2.6}),
   over:()=>cardFace("Take",T0.n,`<p class="small">${esc(T0.d)}</p>`)},
  {t:"Win it, or pay for it",b:"Pass the card and you bank its chips. Fail it and you lose half of them, and the other player gets first option on the station.",
   scene:()=>({st:xst(),cur:X.card[0],next:X.card[1],up:0,focus:X.card,z:2.6})},
  {t:"Pass it, and you can buy the stop",b:"Pass the card and you get first option on the station for 10 monies per star: 10, 20 or 40.",
   scene:()=>({st:xst({[X.buy.id]:0}),cur:X.buy.id,up:0,pops:[X.buy.id],floats:[{id:X.buy.id,t:X.buy.float,c:"var(--p1)"}],focus:X.buy.focus,z:2.4})},
  {t:"Fail it, and it goes to bidding",b:"Fail or veto the card, or arrive at a 4-star hub, and nobody can buy it outright. Either of you can bid in steps of 1, 5 or 10, or leave it unowned."+(hub?" "+ST[START_ID].n+" is a hub, so the day opens with a bid.":"")+" Try it.",w:"bid",
   scene:w=>({st:xst(Object.assign({},X.bid.prior,w.sold!=null?{[X.bid.id]:w.sold}:{})),cur:X.bid.id,up:1,pops:w.sold!=null?[X.bid.id]:[],focus:X.bid.focus,z:2.4})},
  {t:"Take their stations",b:"Pass a card at a stop they own and it's yours, free. No pass? You can still buy it out for double its value, never more than 10.",w:"buyout",
   scene:()=>({st:xst(X.take.st),cur:X.take.cur,up:0,pops:[X.take.cur],focus:X.take.focus,z:2.4})},
  {t:capFirst(numWord(LOCK_IDS.length))+" sealed stations",b:"Gold stations hold a challenge you only see on the platform. Win it for the station and a payout. Fail it and it stays sealed, and the other player's try there pays double.",
   scene:()=>({st:xst(),hl:LOCK_IDS}),over:()=>cardFace("Locked",MR.n,`<p class="small">${esc(MR.d)} ${esc(MR.c)}</p>`)},
  {t:"Hijack a hop",b:"Before the doors close, whoever would be filming can pay 5 monies to stay up. That's how you reach a sealed station that would land on the other player's turn.",
   scene:()=>({st:xst(X.hijack.st),cur:X.hijack.cur,next:X.hijack.next,up:1,hl:[X.hijack.next],focus:[X.hijack.cur,X.hijack.next],z:2.6})},
  {t:"Curses, from behind the camera",b:"Each time the other player gains a station, you draw a curse. Play it while you're the one filming. Tap one to read it.",w:"curses",
   scene:()=>({st:xst(X.curses)})},
  {t:"A layover every three hours",b:"Wherever you are, a rider from the last train picks where you eat. 25 minutes, no monies, no cards, and card timers pause.",
   scene:()=>({st:xst(X.layover.st),cur:X.layover.cur,up:0,focus:X.layover.focus,z:2.4})},
  {t:"Most stars at the stop wins",b:"Every station scores its price. Own more of an area than the other player and you take its bonus. Monies you earned add a star per 20, and bonus stars land at the count. Tap one.",w:"lines",
   scene:w=>({st:xst(X.split),hl:MAJ[w.line??0].ids})},
 ];
}
function xpWidget(k,w){
 if(MODE==="teams"&&typeof teamsXpWidget==="function"){const t=teamsXpWidget(k,w);if(t!=null)return t}
 const N=MODE==="classic"&&typeof S!=="undefined"&&S?[esc(pn(0)),esc(pn(1))]:["Player 1","Player 2"],XPATH=CITY.xp.path;
 if(k==="turn"){const i=w.k||0,up=i%2;return `<div class="xw-turn">${[0,1].map(p=>`<div class="xw-pl p${p+1}${p===up?" on":""}">${N[p]}<small>${p===up?"up":"films"}</small></div>`).join("")}<button class="ink" data-act="xpw" data-k="turn">${i<3?"Next hop":"Start over"}</button></div><div class="xw-msg">Hop ${i+1}: ${N[up]} rides ${esc(ST[XPATH[i]].n)} to ${esc(ST[XPATH[i+1]].n)} while ${N[1-up]} films.</div>`}
 if(k==="bid"){const bk=[8,12],bid=w.bid||0,hi=w.hi??null;
  if(w.sold!=null)return `<div class="xw-msg"><b style="color:var(--p${w.sold+1})">${N[w.sold]}</b> buys ${esc(ST[CITY.xp.bid.id].n)} for ${w.paid}. Their block goes up on the map.</div><button data-act="xpw" data-k="again">Bid again</button>`;
  return `<div class="xw-hi"><b>${bid||"–"}</b><span>${hi==null?"No bids yet. Either of you opens.":N[hi]+" leads"}</span></div>${[0,1].map(p=>`<div class="bidrow"><b style="color:var(--p${p+1})">${N[p]}</b>${[1,5,10].map(n=>`<button class="p${p+1}" data-act="xpw" data-k="bid" data-p="${p}" data-n="${n}" ${hi===p||bid+n>bk[p]?"disabled":""}>${bid+n}</button>`).join("")}</div>`).join("")}${hi!=null?`<button class="ink" data-act="xpw" data-k="sold">${N[1-hi]} passes: sold</button>`:""}<div class="small muted">${N[0]} has ${bk[0]} monies, ${N[1]} has ${bk[1]}. You can't bid more than you have.</div>`}
 if(k==="buyout")return `<div class="xw-table"><span>Worth 1</span><b>buy out for 2</b><span>Worth 2</span><b>buy out for 4</b><span>Worth 4</span><b>buy out for 8</b><span>Gilded</span><b>10, and a pass can't take it</b></div>`;
 if(k==="curses"){const c=CURSES.find(x=>x.k===(w.curse||"rush"));return `<div class="xw-chips">${CURSES.map(x=>`<button data-act="xpw" data-k="curse" data-v="${x.k}" aria-pressed="${x.k===c.k}">${x.n}</button>`).join("")}</div><div class="xw-msg"><b>${c.n}.</b> ${esc(c.eff)} <span class="muted">Costs ${c.cost}.</span></div>`}
 if(k==="lines"){const g=w.line??0,m=MAJ[g],st=xst(CITY.xp.split),c=[0,1].map(p=>m.ids.filter(id=>st[id].o===p).length),win=c[0]>c[1]?0:c[1]>c[0]?1:null;
  return `<div class="xw-chips">${MAJ.map((x,i)=>`<button data-act="xpw" data-k="line" data-v="${i}" aria-pressed="${i===g}">${x.n}</button>`).join("")}</div><div class="xw-msg">${m.ids.length} stations, worth ${m.pts}. Here ${N[0]} owns ${c[0]} and ${N[1]} owns ${c[1]}, so ${win==null?"they split it":N[win]+" takes the "+m.pts}.</div>`}
 return "";
}
function xpOpen(mode){
 xp={i:0,mode,auto:false,rec:false,w:{},train:null,timer:null};showMode="explain";clearTimeout(showTimer);
 const el=$("#show");el.hidden=false;el.className="show xpmode";
 el.innerHTML=`<div class="xp"><div class="xp-head"><div class="xp-dots"></div><button class="xp-x" data-act="xpclose"></button></div><div class="xp-stage" data-act="xptap"><div class="xp-cam"></div><div class="xp-over"></div><div class="xp-hint" hidden></div></div><div class="xp-bar"><i></i></div><div class="xp-cap"></div><div class="xp-nav"></div></div>`;
 const st=el.querySelector(".xp-stage");let x0=0,y0=0,lp=null;
 st.addEventListener("touchstart",e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY},{passive:true});
 st.addEventListener("touchend",e=>{const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3){xp.swiped=true;xpGo(xp.i+(dx<0?1:-1))}},{passive:true});
 st.addEventListener("pointerdown",()=>{clearTimeout(lp);if(xp.rec)lp=setTimeout(()=>{xp.rec=false;xp.swiped=true;xpDraw(false)},600)});
 st.addEventListener("pointerup",()=>clearTimeout(lp));st.addEventListener("pointerleave",()=>clearTimeout(lp));
 xpDraw(true);
}
function xpClose(){if(!xp)return;clearTimeout(xp.timer);xp=null;showMode=null;const el=$("#show");el.hidden=true;el.innerHTML="";el.className="show"}
function xpGo(i){const n=xpSteps().length;if(i<0)return;if(i>=n){if(xp.mode==="help"||!xp.rec)xpClose();else{xp.rec=false;xp.auto=false;xpDraw(false)}return}xp.i=i;xpDraw(false)}
function xpDraw(jump){
 if(!xp)return;const steps=xpSteps(),n=steps.length,s=steps[xp.i],w=xp.w[xp.i]||(xp.w[xp.i]={}),el=$("#show");
 el.classList.toggle("rec",xp.rec);
 el.querySelector(".xp-dots").innerHTML=steps.map((x,i)=>`<button class="xp-dot${i===xp.i?" on":i<xp.i?" done":""}" data-act="xpgo" data-i="${i}" aria-label="Step ${i+1}: ${esc(x.t)}"></button>`).join("");
 el.querySelector(".xp-x").textContent=xp.mode==="help"?"Skip":"Close";
 el.querySelector(".xp-cap").innerHTML=`<div class="xp-n">${xp.i+1} of ${n}</div><h2>${esc(s.t)}</h2><p>${s.b}</p>${s.w?`<div class="xw">${xpWidget(s.w,w)}</div>`:""}`;
 el.querySelector(".xp-nav").innerHTML=`<button data-act="xpprev" ${xp.i?"":"disabled"}>Back</button><button data-act="xpauto" aria-pressed="${xp.auto}">${xp.auto?"Pause":"Play"}</button><button class="ink" data-act="xpnext">${xp.i<n-1?"Next":xp.mode==="help"?"Start playing":"Done"}</button>`;
 el.querySelector(".xp-over").innerHTML=s.over?`<div class="xp-card">${s.over()}</div>`:"";
 requestAnimationFrame(()=>xpScene(s,w,jump));
 const bar=el.querySelector(".xp-bar i");bar.style.animation="none";void bar.offsetWidth;bar.style.animation=xp.auto?`xpbar ${XP_MS}ms linear forwards`:"none";
 clearTimeout(xp.timer);if(xp.auto)xp.timer=setTimeout(()=>{if(!xp)return;if(xp.i<n-1){xp.i++;xpDraw(false)}else{xp.auto=false;xp.rec=false;xpDraw(false)}},XP_MS);
}
function xpScene(s,w,jump){
 if(!xp)return;const el=$("#show"),stage=el.querySelector(".xp-stage"),cam=el.querySelector(".xp-cam");if(!stage)return;
 const sc=s.scene(w),box={};
 cam.innerHTML=mapSVG({st:sc.st,cur:sc.cur||null,up:sc.up??0},{noLegend:true,boxOut:box,pops:sc.pops,hl:sc.hl,floats:sc.floats,next:sc.next}).replace(/ data-act="sel"/g,"");
 const sw=stage.clientWidth,sh=stage.clientHeight;cam.style.width=sw+"px";
 const b=sw/box.W;let cx,cy,z;
 let sweep=null;
 if(!sc.focus){cx=box.X0+box.W/2;cy=box.Y0+box.H/2;z=Math.min(1.05,(sh*.97)/(box.H*b));
  if(sc.sweep&&box.W/box.H>1.3*sw/sh&&!matchMedia("(prefers-reduced-motion: reduce)").matches){z=Math.min(3,(sh*.9)/(box.H*b));const half=sw/2/(z*b);sweep=[box.X0+box.W-half,box.X0+half]}
  // a tall board (LA stood upright) in the short window: fill the width and drift from top to bottom instead of shrinking it
  else if(box.H*b>sh*1.15){z=1;const half=sh/2/b;cy=box.Y0+half;
   if(!matchMedia("(prefers-reduced-motion: reduce)").matches)sweep={v:1,from:box.Y0+half,to:box.Y0+box.H-half}}}
 else{const P=sc.focus.map(id=>XY(ST[id])),xs=P.map(p=>p.x),ys=P.map(p=>p.y);
  cx=(Math.max(...xs)+Math.min(...xs))/2;cy=(Math.max(...ys)+Math.min(...ys))/2;
  const bw=Math.max(...xs)-Math.min(...xs)+190,bh=Math.max(...ys)-Math.min(...ys)+110;
  z=Math.min(sc.z||2.4,sw/(bw*b),(sh*(s.over?.5:.9))/(bh*b))}
 const fy=s.over?sh*.3:sh/2,tx=sw/2-z*(cx-box.X0)*b,ty=fy-z*(cy-box.Y0)*b;
 if(sweep&&sweep.v){const T=y=>`translate(${sw/2-z*(cx-box.X0)*b}px,${sh/2-z*(y-box.Y0)*b}px) scale(${z})`;cam.style.transition="none";cam.style.transform=T(sweep.from);void cam.offsetWidth;cam.style.transition="transform 14s cubic-bezier(.45,0,.55,1)";cam.style.transform=T(sweep.to)}
 else if(sweep){const T=x=>`translate(${sw/2-z*(x-box.X0)*b}px,${ty}px) scale(${z})`;cam.style.transition="none";cam.style.transform=T(sweep[0]);void cam.offsetWidth;cam.style.transition="transform 8s cubic-bezier(.45,0,.55,1)";cam.style.transform=T(sweep[1])}
 else{cam.style.transition=jump?"none":"";cam.style.transform=`translate(${tx}px,${ty}px) scale(${z})`;if(jump){void cam.offsetWidth;cam.style.transition=""}}
 const tr=cam.querySelector(".train");
 if(tr&&sc.cur){const p=XY(ST[sc.cur]),v=sc.st[sc.cur],owned=v.o===0||v.o===1,zz=owned?(ST[sc.cur].p===4?22:ST[sc.cur].p===2?14:9):(ST[sc.cur].lock?9:4),to={x:p.x,y:p.y-zz-16};
  if(xp.train&&(xp.train.x!==to.x||xp.train.y!==to.y)){tr.style.transition="none";tr.style.transform=`translate(${xp.train.x}px,${xp.train.y}px)`;void tr.getBoundingClientRect();tr.style.transition="";tr.style.transform=`translate(${to.x}px,${to.y}px)`}
  xp.train=to}else xp.train=null;
}
function xpWidgetAct(D){
 const w=xp.w[xp.i]||(xp.w[xp.i]={});xp.auto=false;
 if(D.k==="turn")w.k=((w.k||0)+1)%4;
 if(D.k==="stake")w.stake=D.v;
 if(D.k==="bid"){w.bid=(w.bid||0)+(+D.n);w.hi=+D.p}
 if(D.k==="sold"){w.sold=w.hi;w.paid=w.bid}
 if(D.k==="again"){w.bid=0;w.hi=null;w.sold=null}
 if(D.k==="curse")w.curse=D.v;
 if(D.k==="dpick")w.pick=+D.v;
 if(D.k==="dnext"){w.q=(w.q||0)+1;w.pick=null}
 if(D.k==="line")w.line=+D.v;
 if(D.k==="star")w.star=+D.v;
 xpDraw(false);
}
addEventListener("keydown",e=>{if(!xp)return;if(e.key==="ArrowRight")xpGo(xp.i+1);if(e.key==="ArrowLeft")xpGo(xp.i-1);if(e.key==="Escape")xpClose()});
addEventListener("resize",()=>{if(xp){const s=xpSteps()[xp.i];xpScene(s,xp.w[xp.i]||{},true)}});

// explainer controls work in every mode
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-act]");if(!b||b.disabled||!xp)return;
 const a=b.dataset.act,D=b.dataset;
 switch(a){
  case"xpclose":xpClose();return;
  case"xpnext":xpGo(xp.i+1);return;
  case"xpprev":xpGo(xp.i-1);return;
  case"xpgo":xp.auto=false;xpGo(+D.i);return;
  case"xpauto":xp.auto=!xp.auto;if(xp.auto&&xp.i===xpSteps().length-1)xp.i=0;xpDraw(false);return;
  case"xprec":xp.rec=true;xp.auto=true;xpDraw(false);{const hint=$("#show .xp-hint");if(hint){hint.hidden=false;hint.textContent="Recording view. Tap to go on, press and hold to bring the buttons back.";setTimeout(()=>{if(hint)hint.hidden=true},2600)}}return;
  case"xptap":{if(xp.swiped){xp.swiped=false;return}const r=b.getBoundingClientRect();xp.auto=xp.rec?xp.auto:false;xpGo(xp.i+((e.clientX-r.left)<r.width/3?-1:1));return}
  case"xpw":xpWidgetAct(D);return;
 }
});

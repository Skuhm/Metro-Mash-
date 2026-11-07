// ================= the map: a schematic isometric board, owned stations rise as blocks =================
// Two layers. The base (land, water, hills, landmarks, lines) never changes during a game, so it is drawn once and its
// animations keep running. The overlay (stations, owners, trains, the next hop) redraws on every move.
const U=24,SK=0.22,YC=430;const TX=(x,y)=>x-SK*(y-YC);
const G=(gx,gy)=>{const y=gy*U+30;return {x:TX(gx*U+40,y),y}};
const XY=s=>G(s.gx,s.gy);
function blk(x,y,z,w,h,t,l,r){
 const T=`${x},${y-z-h} ${x+w},${y-z} ${x},${y-z+h} ${x-w},${y-z}`;
 const Lp=`${x-w},${y-z} ${x},${y-z+h} ${x},${y+h} ${x-w},${y}`;
 const R=`${x},${y-z+h} ${x+w},${y-z} ${x+w},${y} ${x},${y+h}`;
 return `<polygon points="${Lp}" style="fill:${l}"/><polygon points="${R}" style="fill:${r}"/><polygon points="${T}" style="fill:${t}"/>`;
}
function lockGlyph(x,y){return `<g transform="translate(${x-4},${y-6})"><path d="M1.5 4.5 V3 a2.5 2.5 0 0 1 5 0 V4.5" fill="none" stroke="#1a1300" stroke-width="1.6"/><rect x="0" y="4.2" width="8" height="5.6" rx="1.3" fill="#1a1300"/></g>`}
const halo=c=>`paint-order="stroke" stroke-width="3.2" stroke-linejoin="round" style="stroke:var(--land);fill:${c}"`;
const darkOf=c=>`color-mix(in srgb, ${c} 55%, #000)`;
// owner colours: index 0..5 (classic uses 0 and 1)
const OWN=i=>({t:`var(--p${i+1})`,l:`var(--p${i+1}-l)`,r:`var(--p${i+1}-r)`});
let MAPBOX=null,mapUid=0;
function mapBox(opt){
 opt=opt||{};const P=CITY.map.pad||{t:150,b:96,l:150,r:260};
 const xs=STATIONS.map(s=>XY(s).x),ys=STATIONS.map(s=>XY(s).y);
 const X0=Math.min(...xs)-P.l,X1=Math.max(...xs)+P.r,Y0=Math.min(...ys)-P.t-(opt.box?100:0),YM=Math.max(...ys)+P.b+(opt.box?230:0),Y1=YM+(opt.noLegend?0:136);
 const b={X0,X1,Y0,YM,Y1,W:X1-X0,H:Y1-Y0};if(opt.box)MAPBOX=b;if(opt.boxOut)Object.assign(opt.boxOut,b);return b;
}
function stationZ(s,v){const owned=v.o!=null;return owned?(s.p===4?22:s.p===2?14:9):(s.lock&&v.o==null)?9:4}

// ---------- the static layer ----------
function mapBase(B,opt){
 opt=opt||{};const M=CITY.map,id=++mapUid;
 const {X0,X1,Y0,YM,Y1,W,H}=B;
 const pts=a=>a.map(([gx,gy])=>{const q=G(gx,gy);return `${q.x.toFixed(1)},${q.y.toFixed(1)}`}).join(" ");
 let g=`<defs><clipPath id="clip${id}"><rect x="${X0}" y="${Y0}" width="${W}" height="${YM-Y0}"/></clipPath><pattern id="grid${id}" width="34.6" height="20" patternUnits="userSpaceOnUse" patternTransform="skewX(-12)"><path d="M0 10 L17.3 0 L34.6 10 L17.3 20 Z" fill="none" style="stroke:var(--grid)" stroke-width=".7"/></pattern></defs>`;
 g+=`<rect x="${X0}" y="${Y0}" width="${W}" height="${H}" style="fill:var(--land)"/><rect x="${X0}" y="${Y0}" width="${W}" height="${YM-Y0}" fill="url(#grid${id})" opacity=".5"/>`;
 g+=`<g clip-path="url(#clip${id})">`;
 // landmark art: ground plates first (the beach), then models and signs once the terrain is down.
 // Gradient ids get this render's number so two maps on one page never borrow each other's shading.
 const art=layer=>{if(typeof decorSVG!=="function")return "";try{return decorSVG(CITY.id,G,layer,{anim:!opt.still}).replace(/dcg/g,"dcg"+id+"_")}catch(e){return ""}};
 g+=art("plates");
 // hills: stacked contours, each step lifted, darker flank under a lighter top
 for(const h of M.hills){const c=G(h.gx,h.gy);
  for(let i=0;i<h.lv;i++){const k=1-i*0.3,rx=h.rx*U*k,ry=h.ry*U*k*0.62,lift=i*6;
   g+=`<ellipse cx="${c.x}" cy="${c.y-lift+5}" rx="${rx}" ry="${ry}" style="fill:var(${h.green?"--park-d":"--hillside"})"/><ellipse cx="${c.x}" cy="${c.y-lift}" rx="${rx}" ry="${ry}" style="fill:var(${h.green?"--park":"--hilltop"})"/>`}}
 for(const pk of M.parks){const c=G(pk.gx,pk.gy),r=pk.r*U;
  g+=`<ellipse cx="${c.x}" cy="${c.y+3}" rx="${r}" ry="${r*0.6}" style="fill:var(--park-d)"/><ellipse cx="${c.x}" cy="${c.y}" rx="${r}" ry="${r*0.6}" style="fill:var(--park)"/>`;
  for(const [dx,dy] of [[-0.35,-0.1],[0.25,-0.2],[0,0.15]]){const tx=c.x+dx*r,ty=c.y+dy*r;g+=`<circle cx="${tx}" cy="${ty-5}" r="${Math.max(2.5,r*0.22)}" style="fill:var(--park-d)"/>`}}
 for(const l of M.lakes||[]){const c=G(l.gx,l.gy);g+=`<ellipse cx="${c.x}" cy="${c.y+2}" rx="${l.rx*U}" ry="${l.ry*U}" style="fill:var(--cliff)"/><ellipse cx="${c.x}" cy="${c.y+3.5}" rx="${l.rx*U-1.5}" ry="${l.ry*U-1.5}" style="fill:var(--water)"/>`}
 for(const r of M.rivers||[]){const p=pts(r.pts);g+=`<polyline points="${p}" fill="none" style="stroke:var(--cliff)" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${p}" transform="translate(0,1.5)" fill="none" style="stroke:var(--water)" stroke-width="4.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  const q=G(r.lab[0],r.lab[1]);g+=`<text x="${q.x}" y="${q.y}" transform="rotate(${r.r} ${q.x} ${q.y})" text-anchor="middle" style="fill:var(--shore)" font-size="9" font-weight="800" letter-spacing="2.5" font-style="italic">${r.n}</text>`}
 // water sits below the land: a dark cliff band shows along the shore
 const ws=M.waterShift||[-5,4];
 for(const w of M.water){const p=pts(w.pts);g+=`<polygon points="${p}" style="fill:var(--cliff)"/><polygon points="${p}" transform="translate(${ws[0]},${ws[1]})" style="fill:var(--water)"/>`}
 for(const w of M.waterLabels||[]){const q=G(w.gx,w.gy);g+=`<text x="${q.x}" y="${q.y}"${w.r?` transform="rotate(${w.r} ${q.x} ${q.y})"`:""} text-anchor="middle" style="fill:var(--shore)" font-size="11" font-weight="800" letter-spacing="${w.r?4:3}" font-style="italic">${w.t}</text>`}
 for(const h of M.hills){if(!h.n)continue;const c=G(h.gx,h.gy);g+=`<text x="${c.x}" y="${c.y-(h.lv-1)*6+4}" text-anchor="middle" font-size="10" font-weight="800" letter-spacing="3" ${halo(h.green?"var(--park-t)":"var(--muted)")}>${h.n}</text>`}
 for(const pk of M.parks)if(pk.n){const c=G(pk.gx,pk.gy);g+=`<text x="${c.x}" y="${c.y+pk.r*U*0.6+11}" text-anchor="middle" font-size="9" font-weight="700" ${halo("var(--park-t)")}>${pk.n}</text>`}
 g+=`</g>`;
 // landmarks and props back to front, then the neighbourhood signs; all of it stays under the lines and stations
 g+=`<g class="art">${art("models")}${art("signs")}</g>`;
 // city limits
 for(const L of M.limits||[]){const y=G(0,L.gy).y;g+=`<line x1="${X0}" y1="${y}" x2="${X1}" y2="${y}" style="stroke:var(--muted)" stroke-dasharray="3 6" stroke-width="1" opacity=".6"/>${L.t?`<text x="${X0+8}" y="${y-5}" font-size="9" font-weight="700" style="fill:var(--muted)" letter-spacing="1.5">${L.t}</text>`:""}`}
 // walks always show faintly; an always-on connector (a funicular) shows in its own colour
 const P=sid=>XY(ST[sid]);const CN=M.connectors||{};
 for(const [a,b,m] of EDGES){if(EDGE[a+">"+b].m!==m)continue;
  if(m==="bus"||m==="bike"){const A=P(a),Bp=P(b);g+=`<line x1="${A.x}" y1="${A.y}" x2="${Bp.x}" y2="${Bp.y}" style="stroke:var(--ink)" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="${m==="bus"?"6 4":"9 3 2 3"}" opacity=".28"/>`}
  if(m==="walk"){const A=P(a),Bp=P(b);g+=`<line x1="${A.x}" y1="${A.y}" x2="${Bp.x}" y2="${Bp.y}" style="stroke:var(--ink)" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="1 5" opacity=".22"/>`}
  else if(CN[m]&&CN[m].always){const A=P(a),Bp=P(b);g+=`<line x1="${A.x}" y1="${A.y}" x2="${Bp.x}" y2="${Bp.y}" style="stroke:${CN[m].col}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="${CN[m].dash}" opacity=".75"/>`}}
 // off-board continuations
 for(const s of M.stubs||[]){const f=P(s.from),q=s.path.map(([gx,gy])=>G(gx,gy)),all=[f,...q],col=LCOL[s.k]||"var(--rail)",w=(CITY.lines[s.k]&&CITY.lines[s.k].w)||6;
  const pl=all.map(p=>`${p.x},${p.y}`).join(" "),sh=all.map(p=>`${p.x},${p.y+4}`).join(" ");
  g+=`<polyline points="${sh}" fill="none" style="stroke:${darkOf(col)}" stroke-width="${Math.min(w,6.5)}" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/><polyline points="${pl}" fill="none" style="stroke:${col}" stroke-width="${Math.min(w,6.5)}" stroke-linecap="round" stroke-linejoin="round"${s.k==="rail"?` stroke-dasharray="10 4"`:""}/>`;
  if(s.t){const L=G(s.lx,s.ly);g+=`<text x="${L.x}" y="${L.y}" text-anchor="${s.a||"start"}"${s.r?` transform="rotate(${s.r} ${L.x} ${L.y})"`:""} font-size="10" font-weight="800" letter-spacing="1.4" ${halo(`color-mix(in srgb, ${col} 70%, var(--ink))`)}>${s.t}</text>`}}
 // rail: each line its own ribbon; on shared track the ribbons run side by side
 const SP=5.4,segs=[];
 for(const k of LINE_ORDER){const ids=LINE_PATHS[k],lw=CITY.lines[k].w||7.5;
  for(let i=0;i<ids.length-1;i++){const a=ids[i],b=ids[i+1],key=a<b?a+"|"+b:b+"|"+a,on=SHARED[key].slice().sort((x,y)=>LINE_ORDER.indexOf(x)-LINE_ORDER.indexOf(y)),n=on.length,j=on.indexOf(k);
   const A=P(a),Bp=P(b),dx=Bp.x-A.x,dy=Bp.y-A.y,len=Math.hypot(dx,dy)||1,nx=dy/len,ny=-dx/len,off=(j-(n-1)/2)*SP;
   segs.push({k,w:n>1?5.4:lw,x1:A.x+nx*off,y1:A.y+ny*off,x2:Bp.x+nx*off,y2:Bp.y+ny*off})}}
 for(const s of segs)g+=`<line x1="${s.x1}" y1="${s.y1+4}" x2="${s.x2}" y2="${s.y2+4}" style="stroke:${darkOf(LCOL[s.k])}" stroke-width="${s.w}" stroke-linecap="round"/>`;
 for(const s of segs)g+=`<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" style="stroke:${LCOL[s.k]}" stroke-width="${s.w}" stroke-linecap="round"/>`;
 if(!opt.noLegend)g+=mapLegend(B);
 return g;
}
function mapLegend(B){
 const {X0,YM,Y1,W}=B,lx=X0+12,ly=YM+8,cw=(W-24)/3;
 let g=`<rect x="${X0+4}" y="${YM}" width="${W-8}" height="${Y1-YM-6}" rx="10" style="fill:var(--panel);stroke:var(--line)"/>`;
 const row=(c,rr,cl,dash,t1,t2)=>{const x=lx+c*cw,y=ly+18+rr*21;g+=(dash==="block"?blk(x+11,y,6,8,4.6,"var(--gold)","var(--gold-l)","var(--gold-r)")+lockGlyph(x+11,y-6):`<line x1="${x}" y1="${y-4}" x2="${x+22}" y2="${y-4}" style="stroke:${cl}" stroke-width="${dash?3:6}" stroke-linecap="round"${dash?` stroke-dasharray="${dash}"`:""}/>`)+`<text x="${x+30}" y="${y}" font-size="12" style="fill:var(--ink)"><tspan font-weight="800">${t1}</tspan><tspan dx="6" style="fill:var(--muted)" font-weight="600">${t2}</tspan></text>`};
 const rows=[...CITY.map.legend,["var(--gold)","block","Sealed","challenge inside"]];
 rows.forEach((r,i)=>row(Math.floor(i/4),i%4,...r));
 row(2,0,"var(--ink)","1 5","Walk","");row(2,1,"var(--ink)","6 4","One bus","");row(2,2,"var(--ink)","9 3 2 3","Bike or trail","");
 g+=`<text x="${lx+2*cw}" y="${ly+18+3*21}" font-size="10.5" font-weight="600" style="fill:var(--muted)">Buses and bikes from your station are drawn darker.</text>`;
 return g;
}

// ---------- the live layer ----------
// V: {st:{id:{o,vis,gild}}, cur, up, sel, trains?:[{at,from?,k,me?}]}
function mapOver(V,B,opt){
 opt=opt||{};const P=sid=>XY(ST[sid]);let g="";
 const near=new Set([V.cur,opt.next].filter(Boolean));const CN=CITY.map.connectors||{};
 const dash={walk:"1 5",bus:"6 4",bike:"9 3 2 3",ferry:"8 4"};
 for(const [a,b,m] of EDGES){if(EDGE[a+">"+b].m!==m||RAIL_MODES.includes(m))continue;if(!(near.has(a)||near.has(b)))continue;
  const A=P(a),Bp=P(b),c=CN[m]?CN[m].col:"var(--ink)",d=CN[m]?CN[m].dash:dash[m]||"4 4";
  g+=`<line x1="${A.x}" y1="${A.y}" x2="${Bp.x}" y2="${Bp.y}" style="stroke:${c}" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="${d}" opacity=".9"/>`}
 if(opt.next&&V.cur){const f=P(V.cur),t=P(opt.next);g+=`<line class="dash" x1="${f.x}" y1="${f.y}" x2="${t.x}" y2="${t.y}" style="stroke:var(--ink)" stroke-width="3" stroke-linecap="round"/>`}
 const order=[...STATIONS].sort((a,b)=>XY(a).y-XY(b).y);
 for(const s of order){
  const {x,y}=XY(s),v=V.st[s.id],owned=v.o!=null,isSealed=s.lock&&v.o==null;
  const z=stationZ(s,v),w=owned?10:8,h=owned?6:4.8;
  const pop=opt.pops&&opt.pops.includes(s.id)?" pop":"",hl=opt.hl&&opt.hl.includes(s.id),isSel=V.sel===s.id;
  const lineCol=LCOL[s.line]||"var(--ink)";
  g+=`<g class="st" data-act="sel" data-id="${s.id}">`;
  if(V.cur===s.id&&!V.trains)g+=`<ellipse class="ring" cx="${x}" cy="${y}" rx="15" ry="9" fill="none" style="stroke:var(--ink)" stroke-width="2"/>`;
  if(isSel)g+=`<ellipse cx="${x}" cy="${y}" rx="16" ry="10" fill="none" style="stroke:var(--ink)" stroke-width="2.4" stroke-dasharray="4 3"/>`;
  let t,l,r;
  if(owned){const c=OWN(v.o);t=c.t;l=c.l;r=c.r}
  else if(isSealed){t="var(--gold)";l="var(--gold-l)";r="var(--gold-r)"}
  else{t=v.vis?"var(--tile)":"var(--tile-dim)";l="var(--tile-l)";r="var(--tile-r)"}
  g+=`<g class="blk${pop}${hl?" glow":""}"><ellipse cx="${x}" cy="${y+h-1}" rx="${w+3}" ry="${h}" style="fill:#000" opacity=".18"/>${blk(x,y,z,w,h,t,l,r)}`;
  if(!owned&&!isSealed)g+=`<polygon points="${x},${y-z-h} ${x+w},${y-z} ${x},${y-z+h} ${x-w},${y-z}" fill="none" style="stroke:${lineCol}" stroke-width="2.2"/>`;
  if(isSealed)g+=`<polygon points="${x},${y-z-h} ${x+w},${y-z} ${x},${y-z+h} ${x-w},${y-z}" fill="none" style="stroke:var(--gold-l)" stroke-width="1.6"/>`+lockGlyph(x,y-z);
  if(v.gild)g+=`<circle cx="${x}" cy="${y-z}" r="3" fill="#fff"/>`;
  g+=`<rect x="${x-13}" y="${y-z-12}" width="26" height="${z+24}" fill="transparent"/></g>`;
  const small=CITY.lines[s.line]&&CITY.lines[s.line].small,fs=small?10:11.5,LH=small?11.5:13,rows=s.ml||[s.n],n=rows.length,lab=s.lab;
  const nameCol=owned?OWN(v.o).t:"var(--ink)";
  const price=`<tspan dx="4" font-size="${fs-2}" font-weight="700" style="fill:var(--muted)">${s.p}</tspan>`;
  const lw=Math.max(...rows.map(t=>t.length))*fs*0.56+16;
  let ax,ay,anchor,rot=0;
  if(lab==="a"){ax=x;ay=y-z-10-(n-1)*LH;anchor="middle"}
  else if(lab==="b"){ax=x;ay=y+19;anchor="middle"}
  else if(lab==="B"){ax=x;ay=y+31;anchor="middle"}
  else if(lab==="r"){ax=x+15;ay=y+4-(n-1)*LH/2;anchor="start"}
  else if(lab==="l"){ax=x-15;ay=y+4-(n-1)*LH/2;anchor="end"}
  else if(lab==="d"){ax=x+7;ay=y-z-6;anchor="start";rot=-40}
  else{ax=x-6;ay=y+15;anchor="end";rot=-40}
  const tsp=rows.map((t,i)=>`<tspan x="${ax}" dy="${i?LH:0}">${esc(t)}</tspan>${i===n-1?price:""}`).join("");
  const rx=anchor==="middle"?ax-lw/2:anchor==="start"?ax-4:ax-lw,ry=ay-fs-2,rh=n*LH+8;
  const tall=lab==="b"||lab==="B"?` height="${rh+(lab==="B"?12:0)}"`:"";
  g+=`<g${rot?` transform="rotate(${rot} ${ax} ${ay})"`:""}><text x="${ax}" y="${ay}" text-anchor="${anchor}" font-size="${fs}" font-weight="${small?650:800}" ${halo(nameCol)} opacity="${v.vis||owned?1:.8}">${tsp}</text><rect x="${rx}" y="${lab==="B"?ry-12:ry}" width="${lw}" height="${rh+(lab==="B"?12:0)}" fill="transparent"/></g>`;
  g+=`</g>`;
 }
 // trains
 const train=(x,y,col,me)=>`${me?`<ellipse class="ring" cx="${x}" cy="${y+16}" rx="15" ry="9" fill="none" style="stroke:${col}" stroke-width="2.4"/>`:""}<g class="bob">${blk(0,0,7,9,5.4,col,"var(--ink)","var(--ink)")}<rect x="-4.5" y="-9.5" width="9" height="2.5" rx="1" fill="#fff" opacity=".9"/></g>`;
 if(V.trains){
  const atCount={};
  for(const tr of V.trains){
   let x,y,z=0;
   if(tr.from&&tr.from!==tr.at){const a=P(tr.from),b=P(tr.at);x=a.x+(b.x-a.x)*.55;y=a.y+(b.y-a.y)*.55}
   else{const s=ST[tr.at],p=XY(s);x=p.x;y=p.y;z=stationZ(s,V.st[tr.at])}
   const k=tr.from&&tr.from!==tr.at?"e:"+tr.from+tr.at:"s:"+tr.at;const i=atCount[k]=(atCount[k]||0)+1;const off=(i-1)*13;
   g+=`<g class="train t${tr.k}" data-team="${tr.k}" style="transform:translate(${x+off}px,${y-z-16-off*.3}px)">${train(0,0,OWN(tr.k).t,tr.me)}</g>`;
  }
 }else if(V.cur){const s=ST[V.cur],{x,y}=XY(s),z=stationZ(s,V.st[s.id]);
  g+=`<g class="train" style="transform:translate(${x}px,${y-z-16}px)">${train(0,0,OWN(V.up).t,false)}</g>`;}
 if(opt.floats)for(const f of opt.floats){const {x,y}=XY(ST[f.id]);g+=`<text class="float" x="${x}" y="${y-30}" text-anchor="middle" style="fill:${f.c}">${esc(f.t)}</text>`}
 return g;
}
// one self-contained picture (explainer, show mode, setup)
function mapSVG(V,opt){
 opt=opt||{};const B=mapBox(opt);
 return `<svg class="iso" viewBox="${B.X0} ${B.Y0} ${B.W} ${B.H}" role="img" aria-label="${esc(CITY.copy.aria)}">${mapBase(B,opt)}${mapOver(V,B,opt)}</svg>`;
}

// ---------- the live map on the Map tab ----------
let mapZoom=null,mapFocus=null,showKey=false,lastTrains={};
function zMax(){return MAPBOX?Math.max(5,2.6*MAPBOX.W/Math.max(320,innerWidth)):5}
function liveMap(m,V,opt,chrome){
 let fr=m.querySelector(".mapframe");
 if(!fr||fr.dataset.city!==CITY.id){
  const B=mapBox({box:true,noLegend:true});
  // start every city at the same scale (map units to screen pixels), so a wide board like LA's
  // isn't drawn smaller than a tall one like Seattle's; wider screens get a little more
  if(mapZoom==null)mapZoom=Math.min(zMax(),Math.max(1,mapScale()*B.W/Math.max(320,innerWidth)));
  const vb=`${B.X0} ${B.Y0} ${B.W} ${B.H}`;
  m.innerHTML=`<div class="mapframe" data-city="${CITY.id}"><div class="mapview" id="mapview"><div class="mapinner" style="width:${mapZoom*100}%"><svg class="iso base" viewBox="${vb}" role="img" aria-label="${esc(CITY.copy.aria)}">${mapBase(B,{noLegend:true})}</svg><svg class="iso over" viewBox="${vb}"></svg></div></div><div class="mapchrome"></div></div>`;
  fr=m.querySelector(".mapframe");pinch(fr.querySelector(".mapview"));mapFocus=null;
  const mv=fr.querySelector(".mapview");for(const ev of ["pointerdown","scroll","wheel"])mv.addEventListener(ev,()=>artWake(fr),{passive:true});
  artWake(fr);
 }else mapBox({box:true,noLegend:true});
 fr.querySelector("svg.over").innerHTML=mapOver(V,MAPBOX,opt);
 fr.querySelector(".mapchrome").innerHTML=chrome;
 // trains glide from where they were
 for(const tr of fr.querySelectorAll("svg.over .train")){const k=tr.dataset.team??"c",to=tr.style.transform,from=lastTrains[k];
  if(from&&from!==to){tr.style.transition="none";tr.style.transform=from;tr.getBoundingClientRect();tr.style.transition="";tr.style.transform=to}lastTrains[k]=to}
 return fr;
}
// the landmark art moves when the map opens or is touched, then settles after a few seconds,
// so a whole day of play with the map on screen doesn't run the phone's battery down
function artWake(fr){
 if(!fr||!fr.isConnected)return;const svg=fr.querySelector("svg.base");
 if(fr.classList.contains("art-still")){fr.classList.remove("art-still");try{svg&&svg.unpauseAnimations&&svg.unpauseAnimations()}catch(e){}}
 clearTimeout(artWake.t);artWake.t=setTimeout(()=>{if(!fr.isConnected)return;fr.classList.add("art-still");try{svg&&svg.pauseAnimations&&svg.pauseAnimations()}catch(e){}},12000);
}
const mapScale=()=>1.15*Math.max(1,innerWidth/700);
// show mode: a board much wider than the screen (LA on a phone held upright) fills the height instead of the width,
// then drifts slowly from one end to the other, or slides to the station being shown
function fitStage(stage,focusId){
 if(!stage)return;const svg=stage.querySelector("svg.iso");if(!svg)return;const vb=svg.viewBox.baseVal;
 const sw=stage.clientWidth,sh=stage.clientHeight;if(!sw||!sh||!vb.width)return;
 const wide=vb.width/vb.height>(sw/sh)*1.3;stage.classList.toggle("pan",wide);stage.classList.remove("drift");
 if(!wide){svg.style.transform="";return}
 const k=sh/vb.height,w=vb.width*k,maxX=Math.max(0,w-sw);
 if(focusId&&ST[focusId]){const p=XY(ST[focusId]);const x=Math.min(maxX,Math.max(0,(p.x-vb.x)*k-sw/2));svg.style.setProperty("--px",-maxX+"px");svg.style.transform=`translateX(${-x}px)`;return}
 svg.style.transform="";svg.style.setProperty("--px",-maxX+"px");const per=50;svg.style.animationDelay=`-${((Date.now()/1000)%(2*per)).toFixed(1)}s`;svg.style.setProperty("--pd",per+"s");stage.classList.add("drift");
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
function legendHTML(){
 const row=(c,dash,t1,t2)=>`<div class="krow"><svg width="26" height="10"><line x1="2" y1="5" x2="24" y2="5" stroke="${c}" stroke-width="${dash?3:6}" stroke-linecap="round"${dash?` stroke-dasharray="${dash}"`:""}/></svg><b>${t1}</b><span>${t2}</span></div>`;
 return `<div class="key">${CITY.map.legend.map(r=>row(...r)).join("")}${row("var(--ink)","1 5","Walk","")}${row("var(--ink)","6 4","One bus","")}${row("var(--ink)","9 3 2 3","Bike or trail","")}<div class="small muted">Buses and bikes from your station are drawn darker.</div></div>`;
}

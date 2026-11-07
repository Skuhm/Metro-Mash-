// ================= the map: real geography, downtown stretched, owned stations rise as blocks =================
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
const WATER=[ // schematic shoreline, grid units
 {n:"",pts:[[-16,-8],[-3.4,-8],[-3.2,0],[-2.8,6],[-2.3,11],[-1.7,15.5],[-0.9,19.0],[-0.4,21.2],[0.6,23.4],[2.2,25.8],[3.4,28.2],[3.6,40],[-16,40]]},
];
const WATER_LAB=[{t:"PACIFIC OCEAN",gx:-5.4,gy:12.5,r:-78},{t:"SANTA MONICA BAY",gx:-3.0,gy:26.0,r:-58}];
const RIVERS=[
 {n:"LA RIVER",lab:[47.1,17.6],r:-82,pts:[[47.6,-8],[46.8,0],[46.4,6],[46.2,10],[46.1,14],[46.5,19],[47.4,25],[48.4,34]]},
 {n:"BALLONA CREEK",lab:[8.8,23.0],r:-32,pts:[[15.6,19.2],[13.6,20.4],[10.6,22.2],[7.2,24.6],[4.6,26.6],[3.0,27.4]]},
];
const LAKES=[{gx:32.3,gy:11.7,rx:0.7,ry:0.42},{gx:38.3,gy:7.3,rx:0.55,ry:0.34},{gx:34.5,gy:2.3,rx:0.9,ry:0.5}];
const HILLS=[ // grid centre, radii, contour levels
 {gx:23.4,gy:-1.0,rx:8.2,ry:2.0,lv:3,n:""},
 {gx:29.6,gy:-1.6,rx:4.2,ry:2.2,lv:3,n:"GRIFFITH PARK",green:1},
 {gx:7.6,gy:-1.2,rx:7.4,ry:1.8,lv:2,n:"SANTA MONICA MOUNTAINS",green:1},
 {gx:-0.6,gy:6.8,rx:2.6,ry:2.6,lv:2,n:""},
 {gx:41.0,gy:5.2,rx:2.4,ry:1.4,lv:2,n:"",green:1},
 {gx:16.6,gy:23.2,rx:3.6,ry:2.0,lv:3,n:"BALDWIN HILLS",green:1},
];
const PARKS=[
 {gx:32.3,gy:11.7,r:1.0,n:"MacArthur Park"},{gx:33.3,gy:21.6,r:1.3,n:"Exposition Park"},{gx:19.8,gy:8.5,r:0.7,n:"Tar Pits"},
 {gx:11.2,gy:13.2,r:0.9,n:"Rancho Park"},{gx:30.9,gy:1.5,r:0.55,n:""},{gx:38.0,gy:8.2,r:0.5,n:""},{gx:-0.4,gy:17.0,r:0.5,n:""},
];
// how lines sit side by side where they share track
const LINE_ORDER=["b","d","a","e"];
const LCOL={a:"var(--la)",b:"var(--lb)",d:"var(--ld)",e:"var(--le)",k:"var(--lk)",rail:"var(--rail)",x:"var(--ink)",bd:"var(--lb)",ae:"var(--la)"};
const SHARED={};for(const [k,ids] of Object.entries(LINE_PATHS))for(let i=0;i<ids.length-1;i++){const a=ids[i],b=ids[i+1],key=a<b?a+"|"+b:b+"|"+a;(SHARED[key]=SHARED[key]||[]).push(k)}
function mapSVG(V,opt){
 opt=opt||{};
 const xs=STATIONS.map(s=>XY(s).x),ys=STATIONS.map(s=>XY(s).y);
 const X0=Math.min(...xs)-150,X1=Math.max(...xs)+260,Y0=Math.min(...ys)-(opt.box?250:150),YM=Math.max(...ys)+96+(opt.box?230:0),Y1=YM+(opt.noLegend?0:136),W=X1-X0,H=Y1-Y0;
 if(opt.box)MAPBOX={X0,Y0,W,H};
 if(opt.boxOut)Object.assign(opt.boxOut,{X0,Y0,W,H});
 const dark=c=>`color-mix(in srgb, ${c} 55%, #000)`;
 const halo=(c)=>`paint-order="stroke" stroke-width="3.2" stroke-linejoin="round" style="stroke:var(--land);fill:${c}"`;
 const pts=a=>a.map(([gx,gy])=>{const q=G(gx,gy);return `${q.x.toFixed(1)},${q.y.toFixed(1)}`}).join(" ");
 let g=`<svg class="iso" viewBox="${X0} ${Y0} ${W} ${H}" role="img" aria-label="Map of every rail station from Union Station to Santa Monica"><defs><clipPath id="clipm"><rect x="${X0}" y="${Y0}" width="${W}" height="${YM-Y0}"/></clipPath><pattern id="isog" width="34.6" height="20" patternUnits="userSpaceOnUse" patternTransform="skewX(-12)"><path d="M0 10 L17.3 0 L34.6 10 L17.3 20 Z" fill="none" style="stroke:var(--grid)" stroke-width=".7"/></pattern></defs>`;
 g+=`<rect x="${X0}" y="${Y0}" width="${W}" height="${H}" style="fill:var(--land)"/><rect x="${X0}" y="${Y0}" width="${W}" height="${YM-Y0}" fill="url(#isog)" opacity=".5"/>`;
 g+=`<g clip-path="url(#clipm)">`;
 // hills: stacked contours, each step lifted, darker flank under a lighter top
 for(const h of HILLS){const c=G(h.gx,h.gy);
  for(let i=0;i<h.lv;i++){const k=1-i*0.3,rx=h.rx*U*k,ry=h.ry*U*k*0.62,lift=i*6;
   g+=`<ellipse cx="${c.x}" cy="${c.y-lift+5}" rx="${rx}" ry="${ry}" style="fill:var(${h.green?"--park-d":"--hillside"})"/><ellipse cx="${c.x}" cy="${c.y-lift}" rx="${rx}" ry="${ry}" style="fill:var(${h.green?"--park":"--hilltop"})"/>`}
 }
 // parks
 for(const pk of PARKS){const c=G(pk.gx,pk.gy),r=pk.r*U;
  g+=`<ellipse cx="${c.x}" cy="${c.y+3}" rx="${r}" ry="${r*0.6}" style="fill:var(--park-d)"/><ellipse cx="${c.x}" cy="${c.y}" rx="${r}" ry="${r*0.6}" style="fill:var(--park)"/>`;
  for(const [dx,dy] of [[-0.35,-0.1],[0.25,-0.2],[0,0.15]]){const tx=c.x+dx*r,ty=c.y+dy*r;g+=`<circle cx="${tx}" cy="${ty-5}" r="${Math.max(2.5,r*0.22)}" style="fill:var(--park-d)"/>`}}
 // lakes sit in their parks
 for(const l of LAKES){const c=G(l.gx,l.gy);g+=`<ellipse cx="${c.x}" cy="${c.y+2}" rx="${l.rx*U}" ry="${l.ry*U}" style="fill:var(--cliff)"/><ellipse cx="${c.x}" cy="${c.y+3.5}" rx="${l.rx*U-1.5}" ry="${l.ry*U-1.5}" style="fill:var(--water)"/>`}
 // rivers: concrete channels
 for(const r of RIVERS){const p=pts(r.pts);g+=`<polyline points="${p}" fill="none" style="stroke:var(--cliff)" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${p}" transform="translate(0,1.5)" fill="none" style="stroke:var(--water)" stroke-width="4.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  const q=G(r.lab[0],r.lab[1]);g+=`<text x="${q.x}" y="${q.y}" transform="rotate(${r.r} ${q.x} ${q.y})" text-anchor="middle" style="fill:var(--shore)" font-size="9" font-weight="800" letter-spacing="2.5" font-style="italic">${r.n}</text>`}
 // the ocean sits below the land: a dark cliff band shows along the shore
 for(const w of WATER){const p=pts(w.pts);g+=`<polygon points="${p}" style="fill:var(--cliff)"/><polygon points="${p}" transform="translate(-5,4)" style="fill:var(--water)"/>`}
 for(const w of WATER_LAB){const q=G(w.gx,w.gy);g+=`<text x="${q.x}" y="${q.y}" transform="rotate(${w.r} ${q.x} ${q.y})" text-anchor="middle" style="fill:var(--shore)" font-size="11" font-weight="800" letter-spacing="4" font-style="italic">${w.t}</text>`}
 for(const h of HILLS){if(!h.n)continue;const c=G(h.gx,h.gy);g+=`<text x="${c.x}" y="${c.y-(h.lv-1)*6+4}" text-anchor="middle" font-size="10" font-weight="800" letter-spacing="3" ${halo(h.green?"var(--park-t)":"var(--muted)")}>${h.n}</text>`}
 const region=(gx,gy,t)=>{const q=G(gx,gy);g+=`<text x="${q.x}" y="${q.y}" text-anchor="middle" font-size="10" font-weight="800" letter-spacing="3" ${halo("var(--muted)")}>${t}</text>`};
 region(22.6,4.4,"HOLLYWOOD");region(26.6,7.6,"KOREATOWN");region(20.6,6.6,"MIRACLE MILE");region(11.2,8.4,"BEVERLY HILLS");region(6.8,11.0,"CENTURY CITY");region(1.8,9.4,"WESTWOOD · UCLA");
 region(12.4,19.9,"CULVER CITY");region(2.4,13.2,"SANTA MONICA");region(40.8,15.6,"DOWNTOWN");region(45.4,15.0,"ARTS DISTRICT");region(38.6,6.4,"ECHO PARK");region(34.8,1.2,"SILVER LAKE");
 region(29.0,25.6,"SOUTH LA");region(51.6,17.4,"BOYLE HEIGHTS");region(4.0,26.0,"VENICE");
 for(const pk of PARKS)if(pk.n){const c=G(pk.gx,pk.gy);g+=`<text x="${c.x}" y="${c.y+pk.r*U*0.6+11}" text-anchor="middle" font-size="9" font-weight="700" ${halo("var(--park-t)")}>${pk.n}</text>`}
 g+=`</g>`;
 // landmarks: small 3D icons, quiet labels
 const lm=(gx,gy,kind,t,anchor)=>{const q=G(gx,gy),x=q.x,y=q.y;let i="";
  if(kind==="sign")i=`<g transform="translate(${x} ${y}) skewX(-14)"><text x="0" y="0" text-anchor="middle" font-size="11" font-weight="900" letter-spacing="1.2" paint-order="stroke" stroke-width="2.6" stroke-linejoin="round" style="stroke:var(--ink);fill:#fff">HOLLYWOOD</text></g>`;
  if(kind==="dome")i=blk(x,y,6,9,4.5,"var(--panel)","var(--muted)","var(--tile-r)")+[-6,0,6].map(dx=>`<path d="M${x+dx-3.2} ${y-6} a3.2 3.2 0 0 1 6.4 0 Z" style="fill:var(--ink)"/>`).join("");
  if(kind==="bowl")i=`<ellipse cx="${x}" cy="${y}" rx="11" ry="5" style="fill:var(--hillside)"/><ellipse cx="${x}" cy="${y-4}" rx="11" ry="5" style="fill:var(--panel);stroke:var(--muted)" stroke-width="1.2"/><ellipse cx="${x}" cy="${y-4}" rx="6" ry="2.4" style="fill:var(--park)"/>`;
  if(kind==="arena")i=`<ellipse cx="${x}" cy="${y}" rx="10" ry="5" style="fill:var(--tile-l)"/><rect x="${x-10}" y="${y-7}" width="20" height="7" style="fill:var(--tile-l)"/><ellipse cx="${x}" cy="${y-7}" rx="10" ry="5" style="fill:var(--panel);stroke:var(--muted)" stroke-width="1.2"/>`;
  if(kind==="tower")i=blk(x,y,18,3.5,2.2,"var(--panel)","var(--muted)","var(--tile-r)")+`<line x1="${x}" y1="${y-20}" x2="${x}" y2="${y-27}" style="stroke:var(--muted)" stroke-width="1.2"/>`;
  if(kind==="wheel")i=`<circle cx="${x}" cy="${y-10}" r="9" fill="none" style="stroke:var(--ink)" stroke-width="1.6"/><line x1="${x}" y1="${y-10}" x2="${x-5}" y2="${y}" style="stroke:var(--ink)" stroke-width="1.4"/><line x1="${x}" y1="${y-10}" x2="${x+5}" y2="${y}" style="stroke:var(--ink)" stroke-width="1.4"/>`;
  if(kind==="lamps")i=[0,1,2].map(r=>[0,1,2,3].map(c=>{const lx=x-8+c*5.4+r*2.2,ly=y-r*2.6;return `<line x1="${lx}" y1="${ly}" x2="${lx}" y2="${ly-9}" style="stroke:var(--ink)" stroke-width="1.1"/><circle cx="${lx}" cy="${ly-9.6}" r="1.5" style="fill:var(--gold)"/>`}).join("")).join("");
  if(kind==="museum")i=blk(x,y,5,11,5,"var(--panel)","var(--muted)","var(--tile-r)")+blk(x+5,y-3,4,5,2.6,"var(--panel)","var(--muted)","var(--tile-r)");
  if(kind==="plane")i=`<path d="M${x-9} ${y} L${x+9} ${y-6} L${x+11} ${y-5} L${x-1} ${y+1} L${x+2} ${y+6} L${x} ${y+6.5} L${x-5} ${y+1.5} L${x-9} ${y+2} Z" style="fill:var(--ink)"/>`;
  g+=`<g opacity=".9">${i}${t?`<text x="${x+(anchor==="end"?-14:14)}" y="${y+3}" text-anchor="${anchor||"start"}" font-size="9" font-weight="700" ${halo("var(--muted)")}>${t}</text>`:""}</g>`};
 lm(24.6,-1.6,"sign","");lm(29.0,-1.2,"dome","Griffith Observatory");lm(41.0,4.6,"bowl","Dodger Stadium","end");lm(33.6,16.9,"arena","Crypto.com Arena","end");
 lm(33.6,21.9,"bowl","Coliseum");lm(18.0,8.2,"lamps","LACMA","end");lm(-0.6,7.2,"museum","The Getty");lm(23.2,29.0,"plane","LAX");
 // Santa Monica Pier and its wheel
 {const a=G(-0.6,20.7),b=G(-3.1,21.5);g+=`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" style="stroke:var(--tile-l)" stroke-width="6" stroke-linecap="round"/><line x1="${a.x}" y1="${a.y-2}" x2="${b.x}" y2="${b.y-2}" style="stroke:var(--panel)" stroke-width="4" stroke-linecap="round"/>`;lm(-2.3,21.2,"wheel","");const q=G(-1.8,22.7);g+=`<text x="${q.x}" y="${q.y}" text-anchor="middle" font-size="9" font-weight="700" ${halo("var(--muted)")}>Santa Monica Pier</text>`}
 // lines: raised ribbons; side by side where two lines share track; walks faint; buses and bikes only from where you stand
 const P=id=>XY(ST[id]);
 const near=new Set([V.cur,opt.next].filter(Boolean));
 const dash={walk:"1 5",bus:"6 4",bike:"9 3 2 3",funi:"3 3"};
 for(const [a,b,m] of EDGES){if(!dash[m]||EDGE[a+">"+b].m!==m)continue;
  const on=near.has(a)||near.has(b);if(!on&&m!=="walk"&&m!=="funi")continue;
  const A=P(a),B=P(b),c=m==="funi"?"#e0592a":"var(--ink)";
  g+=`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" style="stroke:${c}" stroke-width="${on?2.8:m==="funi"?2.4:1.6}" stroke-linecap="round" stroke-dasharray="${dash[m]}" opacity="${on?.9:m==="funi"?.75:.22}"/>`}
 // off-board continuations
 const stub=(from,path,k,label,lx,ly,anchor,rot)=>{const f=P(from),q=path.map(([gx,gy])=>G(gx,gy)),all=[f,...q];
  const pl=all.map(p=>`${p.x},${p.y}`).join(" "),sh=all.map(p=>`${p.x},${p.y+4}`).join(" ");
  g+=`<polyline points="${sh}" fill="none" style="stroke:${dark(LCOL[k])}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/><polyline points="${pl}" fill="none" style="stroke:${LCOL[k]}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${k==="rail"?"10 4":"none"}"/>`;
  const L=G(lx,ly);g+=`<text x="${L.x}" y="${L.y}" text-anchor="${anchor||"start"}"${rot?` transform="rotate(${rot} ${L.x} ${L.y})"`:""} font-size="10" font-weight="800" letter-spacing="1.4" ${halo(`color-mix(in srgb, ${LCOL[k]} 70%, var(--ink))`)}>${label}</text>`};
 stub("hhighland",[[20.8,0.2],[19.6,-6]],"b","B LINE TO NORTH HOLLYWOOD",19.8,-2.6,"end");
 stub("union",[[44.0,6.6],[44.4,4.6],[45.6,-6]],"a","A LINE TO PASADENA · POMONA",45.9,0.6,"middle",-82);
 stub("union",[[46.6,8.2],[54,7.4]],"rail","AMTRAK · METROLINK",47.2,7.0,"start");
 stub("ltokyo",[[45.0,12.4],[47.0,13.0],[53,13.2]],"e","E LINE TO EAST LA",47.6,12.3,"start");
 stub("pico",[[36.6,17.2],[37.6,18.8],[38.4,30]],"a","A LINE TO LONG BEACH",38.6,20.2,"start");
 stub("expocrenshaw",[[24.4,22.0],[24.2,32]],"k","K LINE TO LAX",24.9,23.8,"middle",90);
 // rail: each line its own ribbon; on shared track the ribbons run side by side
 const SP=5.4,segs=[];
 for(const k of LINE_ORDER){const ids=LINE_PATHS[k];
  for(let i=0;i<ids.length-1;i++){const a=ids[i],b=ids[i+1],key=a<b?a+"|"+b:b+"|"+a,on=SHARED[key].slice().sort((x,y)=>LINE_ORDER.indexOf(x)-LINE_ORDER.indexOf(y)),n=on.length,j=on.indexOf(k);
   const A=P(a),B=P(b),dx=B.x-A.x,dy=B.y-A.y,len=Math.hypot(dx,dy)||1,nx=dy/len,ny=-dx/len,off=(j-(n-1)/2)*SP;
   segs.push({k,w:n>1?5.4:7.5,x1:A.x+nx*off,y1:A.y+ny*off,x2:B.x+nx*off,y2:B.y+ny*off})}}
 for(const s of segs)g+=`<line x1="${s.x1}" y1="${s.y1+4}" x2="${s.x2}" y2="${s.y2+4}" style="stroke:${dark(LCOL[s.k])}" stroke-width="${s.w}" stroke-linecap="round"/>`;
 for(const s of segs)g+=`<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" style="stroke:${LCOL[s.k]}" stroke-width="${s.w}" stroke-linecap="round"/>`;
 // the hop you're about to take
 if(opt.next&&V.cur){const f=P(V.cur),t=P(opt.next);g+=`<line class="dash" x1="${f.x}" y1="${f.y}" x2="${t.x}" y2="${t.y}" style="stroke:var(--ink)" stroke-width="3" stroke-linecap="round"/>`}
 // stations: every one a block
 const order=[...STATIONS].sort((a,b)=>XY(a).y-XY(b).y);
 for(const s of order){
  const {x,y}=XY(s),v=V.st[s.id],owned=v.o===0||v.o===1,isSealed=s.lock&&v.o==null;
  const z=owned?(s.p===4?22:s.p===2?14:9):isSealed?9:4,w=owned?10:8,h=owned?6:4.8;
  const pop=opt.pops&&opt.pops.includes(s.id)?" pop":"",hl=opt.hl&&opt.hl.includes(s.id),isSel=V.sel===s.id;
  const lineCol=LCOL[s.line]||"var(--ink)";
  g+=`<g class="st" data-act="sel" data-id="${s.id}">`;
  if(V.cur===s.id)g+=`<ellipse class="ring" cx="${x}" cy="${y}" rx="15" ry="9" fill="none" style="stroke:var(--ink)" stroke-width="2"/>`;
  if(isSel)g+=`<ellipse cx="${x}" cy="${y}" rx="16" ry="10" fill="none" style="stroke:var(--ink)" stroke-width="2.4" stroke-dasharray="4 3"/>`;
  let t,l,r;
  if(owned){t=v.o===0?"var(--p1)":"var(--p2)";l=v.o===0?"var(--p1-l)":"var(--p2-l)";r=v.o===0?"var(--p1-r)":"var(--p2-r)"}
  else if(isSealed){t="var(--gold)";l="var(--gold-l)";r="var(--gold-r)"}
  else{t=v.vis?"var(--tile)":"var(--tile-dim)";l="var(--tile-l)";r="var(--tile-r)"}
  g+=`<g class="blk${pop}${hl?" glow":""}"><ellipse cx="${x}" cy="${y+h-1}" rx="${w+3}" ry="${h}" style="fill:#000" opacity=".18"/>${blk(x,y,z,w,h,t,l,r)}`;
  if(!owned&&!isSealed)g+=`<polygon points="${x},${y-z-h} ${x+w},${y-z} ${x},${y-z+h} ${x-w},${y-z}" fill="none" style="stroke:${lineCol}" stroke-width="2.2"/>`;
  if(isSealed)g+=`<polygon points="${x},${y-z-h} ${x+w},${y-z} ${x},${y-z+h} ${x-w},${y-z}" fill="none" style="stroke:var(--gold-l)" stroke-width="1.6"/>`+lockGlyph(x,y-z);
  if(v.gild)g+=`<circle cx="${x}" cy="${y-z}" r="3" fill="#fff"/>`;
  g+=`<rect x="${x-13}" y="${y-z-12}" width="26" height="${z+24}" fill="transparent"/></g>`;
  const fs=11.5,LH=13,rows=s.ml||[s.n],n=rows.length,lab=s.lab;
  const nameCol=owned?(v.o===0?"var(--p1)":"var(--p2)"):"var(--ink)";
  const price=`<tspan dx="4" font-size="${fs-2}" font-weight="700" style="fill:var(--muted)">${s.p}</tspan>`;
  const lw=Math.max(...rows.map(t=>t.length))*fs*0.56+16;
  let ax,ay,anchor,rot=0;
  if(lab==="a"){ax=x;ay=y-z-10-(n-1)*LH;anchor="middle"}
  else if(lab==="b"){ax=x;ay=y+19;anchor="middle"}
  else if(lab==="r"){ax=x+15;ay=y+4-(n-1)*LH/2;anchor="start"}
  else if(lab==="l"){ax=x-15;ay=y+4-(n-1)*LH/2;anchor="end"}
  else if(lab==="d"){ax=x+7;ay=y-z-6;anchor="start";rot=-40}
  else{ax=x-6;ay=y+15;anchor="end";rot=-40}
  const tsp=rows.map((t,i)=>`<tspan x="${ax}" dy="${i?LH:0}">${esc(t)}</tspan>${i===n-1?price:""}`).join("");
  const rx=anchor==="middle"?ax-lw/2:anchor==="start"?ax-4:ax-lw,ry=ay-fs-2,rh=n*LH+8;
  g+=`<g${rot?` transform="rotate(${rot} ${ax} ${ay})"`:""}><text x="${ax}" y="${ay}" text-anchor="${anchor}" font-size="${fs}" font-weight="800" ${halo(nameCol)} opacity="${v.vis||owned?1:.8}">${tsp}</text><rect x="${rx}" y="${ry}" width="${lw}" height="${rh}" fill="transparent"/></g>`;
  g+=`</g>`;
 }
 if(V.cur){const s=ST[V.cur],{x,y}=XY(s),v=V.st[s.id],owned=v.o===0||v.o===1,z=owned?(s.p===4?22:s.p===2?14:9):(s.lock?9:4);
  const dc=V.up===0?"var(--p1)":"var(--p2)";
  g+=`<g class="train" style="transform:translate(${x}px,${y-z-16}px)"><g class="bob">${blk(0,0,7,9,5.4,dc,"var(--ink)","var(--ink)")}<rect x="-4.5" y="-9.5" width="9" height="2.5" rx="1" fill="#fff" opacity=".9"/></g></g>`;}
 if(opt.floats)for(const f of opt.floats){const {x,y}=XY(ST[f.id]);g+=`<text class="float" x="${x}" y="${y-30}" text-anchor="middle" style="fill:${f.c}">${esc(f.t)}</text>`}
 // legend
 if(!opt.noLegend){const lx=X0+12,ly=YM+8,cw=(W-24)/3;
  g+=`<rect x="${X0+4}" y="${YM}" width="${W-8}" height="${Y1-YM-6}" rx="10" style="fill:var(--panel);stroke:var(--line)"/>`;
  const row=(c,rr,cl,dash,t1,t2)=>{const x=lx+c*cw,y=ly+18+rr*21;g+=(dash==="block"?blk(x+11,y,6,8,4.6,"var(--gold)","var(--gold-l)","var(--gold-r)")+lockGlyph(x+11,y-6):`<line x1="${x}" y1="${y-4}" x2="${x+22}" y2="${y-4}" style="stroke:${cl}" stroke-width="${dash?3:6}" stroke-linecap="round"${dash?` stroke-dasharray="${dash}"`:""}/>`)+`<text x="${x+30}" y="${y}" font-size="12" style="fill:var(--ink)"><tspan font-weight="800">${t1}</tspan><tspan dx="6" style="fill:var(--muted)" font-weight="600">${t2}</tspan></text>`};
  row(0,0,"var(--la)",0,"A Line","Pomona to Long Beach");row(0,1,"var(--lb)",0,"B Line","Union Station to North Hollywood");row(0,2,"var(--ld)",0,"D Line","Union Station to Wilshire/La Cienega");row(0,3,"var(--le)",0,"E Line","East LA to Santa Monica");
  row(1,0,"var(--lk)",0,"K Line","Expo/Crenshaw to LAX and Redondo Beach");row(1,1,"var(--rail)","10 4","Amtrak · Metrolink","Union Station");row(1,2,"#e0592a","3 3","Angels Flight","up Bunker Hill");row(1,3,"var(--gold)","block","Sealed","challenge inside");
  row(2,0,"var(--ink)","1 5","Walk","");row(2,1,"var(--ink)","6 4","One bus","");row(2,2,"var(--ink)","9 3 2 3","Bike or trail","");
  g+=`<text x="${lx+2*cw}" y="${ly+18+3*21}" font-size="10.5" font-weight="600" style="fill:var(--muted)">Buses and bikes show from the station you're at.</text>`;}
 g+=`</svg>`;return g;
}

/* Turf map art: landmark models, neighbourhood signs, small props and where they go, for LA and Seattle.
   Plain script, no modules, ES2020. Every function returns an SVG string drawn in the map's own iso convention
   (the same one blk() uses): tops lightest, the right (+X) flank lighter than the left (+Y) flank, a soft ground
   shadow. Colours are theme tokens, or color-mix() of a token with a real-world colour, so light and dark both work.
   Public names: MODELS, regionSign, DECOR, DECOR_CSS, decorMotionOK, decorSVG, decorDefs. Everything else stays inside __TURF_ART. */
"use strict";
const __TURF_ART=(()=>{
// ---------- small helpers ----------
const R=n=>Math.round(n*10)/10;
// Colour values print as one flat color-mix(in srgb, #literal w%, var(--token)). Mixing two colours that share a
// token is done here, exactly (srgb mixing is linear), so nested color-mix() never reaches the page; anything
// else falls back to a plain color-mix() string.
function Col(c,w,k,raw){this.c=c;this.w=w;this.k=k;this.raw=raw}
Col.prototype.toString=function(){if(this.raw)return this.raw;if(this.w<.0005)return `var(${this.k})`;
 const h="#"+this.c.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");
 return this.w>.9995||!this.k?h:`color-mix(in srgb, ${h} ${Math.round(this.w*1000)/10}%, var(${this.k}))`};
const V=x=>{if(x instanceof Col)return x;x=String(x);
 const m=/^var\((--[\w-]+)\)$/.exec(x);if(m)return new Col([0,0,0],0,m[1],null);
 if(/^#[0-9a-f]{6}$/i.test(x))return new Col([1,3,5].map(i=>parseInt(x.slice(i,i+2),16)),1,"",null);
 if(/^#[0-9a-f]{3}$/i.test(x))return new Col([1,2,3].map(i=>parseInt(x[i]+x[i],16)),1,"",null);
 return new Col(null,0,"",x)};
const mix=(a,b,p)=>{const A=V(a),B=V(b),q=p/100,ka=A.w<.9995?A.k:"",kb=B.w<.9995?B.k:"";
 if(A.raw||B.raw||(ka&&kb&&ka!==kb))return new Col(null,0,"",`color-mix(in srgb, ${A} ${p}%, ${B})`);
 const w=q*A.w+(1-q)*B.w;return new Col([0,1,2].map(i=>w>0?(q*A.w*A.c[i]+(1-q)*B.w*B.c[i])/w:0),w,ka||kb,null)};
const dk=(c,p)=>mix(c,"#000",100-p);                 // p% toward black
const lt=(c,p)=>mix(c,"#fff",100-p);                 // p% toward white
const th=(c,p)=>mix(c,"var(--land)",p==null?90:p);   // a real colour that dims with the dark theme
const mat=(c,p)=>mix(c,"var(--tile-r)",p);           // a material: pastel in light, muted in dark
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const iso=(x,y)=>(X,Y,Z)=>[x+X-Y,y+(X+Y)*.6-(Z||0)];  // X runs down-right, Y down-left, Z up
const P2=a=>R(a[0])+" "+R(a[1]);
const pts=a=>a.map(q=>R(q[0])+","+R(q[1])).join(" ");
const pg=(a,f,ex)=>`<polygon points="${pts(a)}" style="fill:${f}"${ex||""}/>`;
const pgs=(a,f)=>`<polygon points="${pts(a)}" style="fill:${f};stroke:${f}" stroke-width=".45" stroke-linejoin="round"/>`;
const pa=(d,f,ex)=>`<path d="${d}" style="fill:${f}"${ex||""}/>`;
const sk=(d,c,w,ex)=>`<path d="${d}" fill="none" style="stroke:${c}" stroke-width="${w}"${ex||""}/>`;
const ln=(a,b,c,w,ex)=>`<line x1="${R(a[0])}" y1="${R(a[1])}" x2="${R(b[0])}" y2="${R(b[1])}" style="stroke:${c}" stroke-width="${w}"${ex||""}/>`;
const el=(cx,cy,rx,ry,f,ex)=>`<ellipse cx="${R(cx)}" cy="${R(cy)}" rx="${R(rx)}" ry="${R(ry)}" style="fill:${f}"${ex||""}/>`;
const ci=(cx,cy,r,f,ex)=>`<circle cx="${R(cx)}" cy="${R(cy)}" r="${R(r)}" style="fill:${f}"${ex||""}/>`;
const rc=(x,y,w,h,f,ex)=>`<rect x="${R(x)}" y="${R(y)}" width="${R(w)}" height="${R(h)}" style="fill:${f}"${ex||""}/>`;
const shade=(x,y,rx,ry,op)=>el(x-2,y+1.5,rx,ry,"#000",` opacity="${op||.16}"`);
const tri=c=>({t:lt(c,20),r:c,l:dk(c,25)});
// animation: on unless o.anim===false; CSS ones are also gated by the reduced-motion media query in DECOR_CSS
const animOn=o=>!(o&&o.anim===false);
const smilOn=o=>animOn(o)&&decorMotionOK();
const lag=p=>`animation-delay:-${((Date.now()/1000)%p).toFixed(2)}s`;    // keeps the phase across re-renders
const beg=p=>`-${((Date.now()/1000)%p).toFixed(2)}s`;

// ---------- materials ----------
const WH={t:mix("var(--tile)","#fff",84),r:mix("var(--tile-r)","#fff",86),l:mix("var(--tile-l)","var(--muted)",82)}; // white stucco / concrete; the left flank gains contrast in both themes
const STONE=tri(mat("#c8a66e",42));        // warm concrete, Coliseum
const CREAM=tri(mix("#d8bf8a","var(--tile)",42));
const TRAV=tri(mix("#c9b48a","var(--tile)",45));   // Getty travertine
const TERRA=tri(mat("#c4623f",72));        // tile roofs
const BRICK=tri(mat("#b0553c",74));
const GLASS=tri(mat("#6f9fc4",62));        // blue glass
const DGLASS=tri(mat("#3d4855",64));       // dark glass
const BGLASS=tri(mix("#202833","var(--tile-l)",58)); // near-black glass (Columbia Center)
const GRAN=tri(mat("#a29c92",58));         // granite (US Bank)
const STEEL={t:mix("#f1f4f7","var(--tile)",60),r:mix("#bfcad6","var(--tile-r)",62),l:mat("#7d8a99",78)};
const COP=tri(mat("#5e8f7a",76));          // copper with patina
const TEAL=tri(mat("#3b9c8e",74));         // Wiltern terra cotta
const JADE=tri(mat("#2f7d5c",80));         // glazed green tile
const RED=tri(th("#c23b2c",90));
const WOOD=tri(mat("#9c7a55",70));
const RUST=tri(mat("#6b4b3c",74));
const ORANGE=tri(th("#e5622a",92));
const GOLD=tri(th("#d9a441",92));
const FIELD={t:"var(--park)",d:"var(--park-d)"};
const DIRT=mat("#b8875a",72);
const LEAF=mix("var(--park-t)","var(--park-d)",72);
const LEAF2=mix("var(--park-t)","var(--park-d)",42);
const SAND=mix("#dcc08a","var(--land)",52);

// ---------- solids ----------
// axis-aligned iso box; faces: +Y (left, darker), +X (right, lighter), top
function box(p,X0,X1,Y0,Y1,Z0,Z1,c){
 return pg([p(X0,Y1,Z1),p(X1,Y1,Z1),p(X1,Y1,Z0),p(X0,Y1,Z0)],c.l)
  +pg([p(X1,Y0,Z1),p(X1,Y1,Z1),p(X1,Y1,Z0),p(X1,Y0,Z0)],c.r)
  +pg([p(X0,Y0,Z1),p(X1,Y0,Z1),p(X1,Y1,Z1),p(X0,Y1,Z1)],c.t);
}
// Cylinders are one path filled with a faceted (hard-stop) gradient: dark on the left, lit on the right, like blk().
// Gradients live once per palette in the <defs> that decorSVG()/decorDefs() emit; without them the side falls back
// to a flat mid-tone.
const GRADS={};
const gkey=c=>{let h=5381;const t=c.l+"|"+c.r;for(let i=0;i<t.length;i++)h=((h*33)^t.charCodeAt(i))>>>0;const k="dcg"+h.toString(36);GRADS[k]=c;return k};
function gradDefs(){let s="";
 for(const k in GRADS){const c=GRADS[k],n=7;let st="";
  for(let i=n-1;i>=0;i--){const a=Math.PI*(i+1)/n,b=Math.PI*i/n,col=mix(c.r,c.l,Math.round(100*(1-(a+b)/2/Math.PI)));
   st+=`<stop offset="${((1+Math.cos(a))/2).toFixed(3)}" style="stop-color:${col}"/><stop offset="${((1+Math.cos(b))/2).toFixed(3)}" style="stop-color:${col}"/>`}
  s+=`<linearGradient id="${k}">${st}</linearGradient>`}
 return s}
// screen-space cylinder from z0 to z1 above a base ellipse centred (cx,cy); optional top ellipse
function drum(cx,cy,rx,ry,z0,z1,c,n,noTop){
 const d=`M${R(cx-rx)} ${R(cy-z1)}A${R(rx)} ${R(ry)} 0 0 0 ${R(cx+rx)} ${R(cy-z1)}V${R(cy-z0)}A${R(rx)} ${R(ry)} 0 0 1 ${R(cx-rx)} ${R(cy-z0)}Z`;
 return `<path d="${d}" style="fill:url(#${gkey(c)}) ${mix(c.r,c.l,50)}"/>`+(noTop?"":el(cx,cy-z1,rx,ry,c.t));
}
// fine detail lines (floors, mullions, fluting) as plain black or white at low opacity
const segs=(L,c,op,w)=>L.length?`<path d="${L.map(([a,b])=>`M${P2(a)}L${P2(b)}`).join("")}" fill="none" style="stroke:${c}" stroke-width="${w||.45}"${op==null?"":` opacity="${op}"`}/>`:"";
const dkl=(L,op)=>segs(L,"#000",op||.16);
const ltl=(L,op)=>segs(L,"#fff",op||.3);
// shift an absolute-command path (M L H V C S Q Z) by dx,dy, so many glyphs can share one <path>
const shiftPath=(d,dx,dy)=>{let cmd="",i=0;return d.replace(/([MLHVCSQZ])|(-?(?:\d+\.?\d*|\.\d+))/g,(m,c,n)=>{if(c){cmd=c;i=0;return c}const v=parseFloat(n),r=cmd==="H"?v+dx:cmd==="V"?v+dy:v+(i%2?dy:dx);i++;return " "+R(r)})};
// dome on a base ellipse centred (cx,cy): dark body, lit cap shifted right, small highlight
function dome(cx,cy,rx,h,c){
 const ry=rx*.6,hx=cx+rx*.27,hr=rx*.62,hh=h*.9;
 return pa(`M${R(cx-rx)} ${R(cy)}A${R(rx)} ${R(h)} 0 0 1 ${R(cx+rx)} ${R(cy)}A${R(rx)} ${R(ry)} 0 0 1 ${R(cx-rx)} ${R(cy)}Z`,c.l)
  +pa(`M${R(hx-hr)} ${R(cy)}A${R(hr)} ${R(hh)} 0 0 1 ${R(hx+hr)} ${R(cy)}A${R(hr)} ${R(hr*.6)} 0 0 1 ${R(hx-hr)} ${R(cy)}Z`,c.r)
  +el(cx+rx*.3,cy-h*.66,rx*.2,rx*.13,c.t);
}
// vertical prism on any convex X/Y polygon (counter-clockwise in X/Y), faces shaded by where they point
function prism(p,V,Z0,Z1,c){
 let s="";const n=V.length;
 for(let i=0;i<n;i++){const A=V[i],B=V[(i+1)%n],nx=B[1]-A[1],ny=-(B[0]-A[0]);
  if(nx+ny<=0)continue;
  const ang=Math.atan2(ny,nx)*180/Math.PI,pct=Math.max(0,Math.min(100,Math.round(100*(1-(ang+45)/180))));
  s+=pgs([p(A[0],A[1],Z1),p(B[0],B[1],Z1),p(B[0],B[1],Z0),p(A[0],A[1],Z0)],mix(c.r,c.l,pct))}
 return s+pg(V.map(v=>p(v[0],v[1],Z1)),c.t);
}
// SVG transform that maps a flat drawing onto an iso wall: u runs along the wall, v is screen-down
const wallX=(p,X,Y,Z)=>{const o=p(X,Y,Z);return `matrix(1 -.6 0 1 ${R(o[0])} ${R(o[1])})`}; // wall X=const, u toward -Y
const wallY=(p,X,Y,Z)=>{const o=p(X,Y,Z);return `matrix(1 .6 0 1 ${R(o[0])} ${R(o[1])})`};  // wall Y=const, u toward +X
const arch=(u,b,w,h)=>`M${R(u)} ${R(b)}V${R(b-h+w/2)}A${R(w/2)} ${R(w/2)} 0 0 1 ${R(u+w)} ${R(b-h+w/2)}V${R(b)}Z`; // arched opening, base b, w wide, h tall

// ---------- wrapper: scale, label, no pointer events ----------
function wrap(k,x,y,o,hw,body){
 o=o||{};const s=+o.s||1;let g=body;
 if(s!==1)g=`<g transform="translate(${R(x)} ${R(y)}) scale(${s}) translate(${R(-x)} ${R(-y)})">${g}</g>`;
 if(o.t){const a=o.a||"start",mid=a==="middle",dx=mid?0:(hw*s+4)*(a==="end"?-1:1);
  g+=`<text x="${R(x+dx)}" y="${R(y+(mid?14:3))}" text-anchor="${a}" font-size="9.5" font-weight="700" paint-order="stroke" stroke-width="3.2" stroke-linejoin="round" style="stroke:var(--land);fill:var(--muted)">${esc(o.t)}</text>`}
 return `<g class="dc dc-${k}" pointer-events="none">${g}</g>`;
}

// ---------- neighbourhood sign on a short post ----------
// LA: the city's blue neighbourhood signs. Seattle: the green street-sign look. White condensed caps, white inset border.
function sign(x,y,text,style){
 const sea=style==="sea",T=String(text).toUpperCase(),post=7.5,H=14.6,padX=4.6;
 let tw=0;for(const ch of T)tw+=ch===" "?2.8:ch==="·"?3.6:ch==="I"?3.1:(ch==="M"||ch==="W")?7.1:ch==="."?2.4:5.7;
 const W=tw+padX*2,x0=x-W/2,y0=y-post-H;
 const bg=sea?th("#0e6d47",94):th("#1d58a7",94),edge=dk(bg,52);
 let s=`<polygon points="${pts([[x-W*.4-3,y+1.9],[x+W*.4-3,y+1.9],[x+W*.4-6,y+3.9],[x-W*.4-6,y+3.9]])}" style="fill:#000" opacity=".07"/>`+el(x-1.4,y+.7,4,1.3,"#000",' opacity=".2"');
 s+=rc(x-1.05,y-post-1,2.1,post+1,"var(--muted)");
 s+=rc(x0+1.3,y0+1.3,W,H,edge,' rx="2.4"');
 s+=rc(x0,y0,W,H,bg,' rx="2.4"');
 s+=`<rect x="${R(x0+1.35)}" y="${R(y0+1.35)}" width="${R(W-2.7)}" height="${R(H-2.7)}" rx="1.5" fill="none" style="stroke:#fff" stroke-width=".9"/>`;
 s+=`<text x="${R(x)}" y="${R(y0+H/2+3.6)}" text-anchor="middle" font-size="10" font-weight="800" textLength="${R(tw)}" lengthAdjust="spacingAndGlyphs" style="fill:#fff;font-stretch:75%">${esc(T)}</text>`;
 return `<g class="dc dc-sign" pointer-events="none">${s}</g>`;
}

const M={};
// ================= Los Angeles =================
// Hollywood Sign: white extruded letters stepping up a scrub hillside on Mount Lee
const HW_GLYPHS={H:["M1 0V10M5 0V10M1 5.2H5",6],O:["M3 .95C1.45 .95 .95 2.6 .95 5S1.45 9.05 3 9.05 5.05 7.4 5.05 5 4.55 .95 3 .95Z",6],L:["M1 0V9.05H5.2",5.4],Y:["M.6 0 3.1 4.9 5.6 0M3.1 4.9V10",6.2],W:["M.55 0 2 10 3.8 3.3 5.6 10 7.05 0",7.6],D:["M1 .95V9.05H2.75C4.5 9.05 5.05 7.35 5.05 5S4.5 .95 2.75 .95Z",6]};
M.hollywoodSign=(x,y,o)=>{
 const word="HOLLYWOOD",gap=2.2,step=.9,sw=1.9;
 let tot=-gap;for(const c of word)tot+=HW_GLYPHS[c][1]+gap;
 const x0=x-tot/2,x1=x+tot/2,yR=y-step*(word.length-1);
 const scrubL=mix("#b3a173","var(--land)",46),scrubD=mix("#8a7748","var(--land)",66),bush=mix("#6b6a3a","var(--land)",72);
 let s=pa(`M${R(x0-14)} ${R(y+5)}C${R(x0-6)} ${R(y-7)} ${R(x-12)} ${R(y-23)} ${R(x+8)} ${R(y-27)}C${R(x1+1)} ${R(yR-25)} ${R(x1+10)} ${R(yR-9)} ${R(x1+16)} ${R(yR+5)}Z`,scrubL);
 s+=pg([[x0-8,y+1.2],[x1+8,yR+1.2],[x1+12,yR+6.6],[x0-4,y+7]],scrubD);
 for(const [dx,dy,r] of [[-30,4.2,1.5],[-12,3.4,1.2],[8,1.6,1.4],[24,-.6,1.3],[-22,-14,1.2],[-6,-19,1.5],[10,-21,1.3],[24,-18,1.4],[34,-12,1.1]])s+=el(x+dx,y+dy,r*1.5,r,bush);
 const ext=dk("var(--tile-l)",40),face=mix("#fff","var(--land)",93);
 let lx=x0,front="";const bk={1:"",2:"",3:""};
 [...word].forEach((c,i)=>{const d=HW_GLYPHS[c][0],by=y-i*step-10;
  for(const k of [3,2,1])bk[k]+=shiftPath(d,lx+k*.5,by-k*.6);
  front+=shiftPath(d,lx,by);
  lx+=HW_GLYPHS[c][1]+gap});
 const st=c=>` fill="none" style="stroke:${c}" stroke-width="${sw}"`;
 return wrap("hollywoodSign",x,y,o,tot/2+12,s+[3,2,1].map(k=>`<path d="${bk[k]}"${st(ext)}/>`).join("")+`<path d="${front}"${st(face)}/>`)};

// Griffith Observatory: white Art Deco hall, copper planetarium dome flanked by two smaller telescope domes
M.observatory=(x,y,o)=>{const p=iso(x,y);let s=shade(x,y+1,25,9.5);
 const tower=Y=>{const c=p(0,Y,0);return drum(c[0],c[1],3.7,2.2,0,7,WH,12)+dome(c[0],c[1]-7,3.7,4.3,COP)};
 s+=tower(-12.5)+box(p,-2.3,2.3,-12,-4.6,0,4.6,WH)+box(p,-4.6,4.6,-4.6,4.6,0,7.2,WH);
 s+=drum(x,y,6.6,3.96,7.2,9.6,WH,18)+dome(x,y-9.6,6.6,7.6,COP);
 s+=box(p,4.6,6.2,-2,2,0,5.8,WH)+box(p,-2.3,2.3,4.6,12,0,4.6,WH)+tower(12.5);
 return wrap("observatory",x,y,o,20,s)};

// Dodger Stadium: tiers in the stadium's yellow, orange, turquoise and sky blue around a diamond; hexagon scoreboards
M.dodgerStadium=(x,y,o)=>{const rx=21,ry=12.6,H=5;
 let s=el(x,y+1,rx+8,ry+5,mix("var(--tile-l)","var(--land)",40))+shade(x,y+2,rx+3,ry+2.5);
 s+=drum(x,y,rx,ry,0,H,WH,24,true)+el(x,y-H,rx,ry,WH.t);
 const F=y-H+ry-1.5;let r=rx-1.6;
 for(const c of [th("#7fbfe6",64),th("#3aa89c",72),th("#ef8c45",72),th("#f1c64a",70)]){s+=el(x,F-r*.6,r,r*.6,c);r-=2.7}
 const fy=F-r*.6;s+=el(x,fy,r,r*.6,FIELD.t);
 const ix=x,iy=fy-r*.6*.3,hw=4.3,hh=2.6;
 s+=pg([[ix,iy-hh],[ix+hw,iy],[ix,iy+hh],[ix-hw,iy]],DIRT)+pg([[ix,iy-hh*.48],[ix+hw*.52,iy],[ix,iy+hh*.52],[ix-hw*.52,iy]],FIELD.t);
 for(const [dx,dy] of [[0,-hh],[hw,0],[0,hh],[-hw,0]])s+=rc(ix+dx*.82-.6,iy+dy*.82-.5,1.2,1,"#fff");
 for(const sx of [-1,1]){const bx=x+sx*rx*.68,by=y-H+ry*.58;
  s+=ln([bx,by],[bx,by-5.6],"var(--muted)",.9)+pg([[bx-2.7,by-8],[bx-1.35,by-10.3],[bx+1.35,by-10.3],[bx+2.7,by-8],[bx+1.35,by-5.7],[bx-1.35,by-5.7]],DGLASS.l)}
 return wrap("dodgerStadium",x,y,o,rx+3,s)};

// towers
function towerBox(p,X0,X1,Y0,Y1,H,c,fl){let s=box(p,X0,X1,Y0,Y1,0,H,c);
 if(fl){const a=[],b=[];for(let z=fl;z<H-1;z+=fl){a.push([p(X1,Y0,z),p(X1,Y1,z)]);b.push([p(X0,Y1,z),p(X1,Y1,z)])}s+=dkl(a,.13)+ltl(b,.12)}
 return s}
// Wilshire Grand: glass slab whose roof sweeps up into a sail, with a spire
function wgBody(x,y,ns){const p=iso(x,y),H=58,a=3.3,b=5.6;let s=ns?"":shade(x,y+1,10,4.5);
 s+=towerBox(p,-a,a,-b,b,H,GLASS,4.5);
 const f1=p(a,b,H),f2=p(a,-b,H),t1=p(a,b,H+2.5),t2=p(a,-b,H+13),u1=p(-a,b,H+2.5),u2=p(-a,-b,H+13),g1=p(-a,b,H);
 const q=(A)=>`${R(A[0]-2.6)} ${R(A[1]+6.4)}`;
 s+=pg([g1,f1,t1,u1],GLASS.l);
 s+=pa(`M${P2(f1)}L${P2(f2)}L${P2(t2)}Q${q(t2)} ${P2(t1)}Z`,GLASS.r);
 s+=pa(`M${P2(u1)}L${P2(t1)}Q${q(t2)} ${P2(t2)}L${P2(u2)}Q${q(u2)} ${P2(u1)}Z`,lt(GLASS.r,38));
 s+=sk(`M${P2(t1)}Q${q(t2)} ${P2(t2)}`,"var(--tile)",.8);
 const sp=p(0,-b+.6,H+12.4);s+=ln(sp,[sp[0],sp[1]-13],"var(--muted)",1.1);
 return s}
// US Bank Tower: granite cylinder, two setbacks and the lit glass crown
function usbBody(x,y,ns){let s=ns?"":shade(x,y+1,9,4);
 s+=drum(x,y,7,4.2,0,46,GRAN,18,true);
 s+=dkl([.2,.35,.5,.65,.8].map(t=>{const a=Math.PI*t,X=x+7*Math.cos(a),Y=y+4.2*Math.sin(a);return [[X,Y-2],[X,Y-45]]}),.15);
 s+=el(x,y-46,7,4.2,GRAN.t)+drum(x,y,6,3.6,46,51,GRAN,18);
 s+=drum(x,y,5.1,3.06,51,56.5,{t:th("#fbf6e4",92),r:th("#e3ebef",90),l:mix(GLASS.l,"#000",90)},18);
 return s}
M.wilshireGrand=(x,y,o)=>wrap("wilshireGrand",x,y,o,9,wgBody(x,y));
M.usBank=(x,y,o)=>wrap("usBank",x,y,o,8,usbBody(x,y));
// Downtown skyline: City National twins behind, Wilshire Grand, US Bank, a white mid-rise and a low block in front
M.skylineDTLA=(x,y,o)=>{const p=iso(x,y);let s=shade(x-4,y+2,34,10,.12);
 s+=towerBox(p,-12.4,-8,-10.4,-6,40,DGLASS,4)+towerBox(p,-14,-9.6,-3.9,.5,38,DGLASS,4);
 const w=p(-16.3,9.7,0);s+=wgBody(w[0],w[1],1);
 const u=p(2.3,-5.7,0);s+=usbBody(u[0],u[1],1);
 s+=towerBox(p,12.8,17.8,-11.2,-6.2,26,WH,4)+towerBox(p,-4,3,8,14,10,GRAN,3.4);
 return wrap("skylineDTLA",x,y,o,34,s)};

// City Hall: white tower on a broad base, stepped pyramid top
M.cityHall=(x,y,o)=>{const p=iso(x,y);let s=shade(x,y+1,17,8);
 s+=box(p,-7.5,7.5,-6.5,6.5,0,6.5,WH)+box(p,-3.6,3.6,-3.6,3.6,6.5,33,WH);
 s+=dkl([-2.2,-.7,.8,2.3].map(t=>[p(3.6,t,8),p(3.6,t,32)]),.12)+dkl([-2.2,-.7,.8,2.3].map(t=>[p(t,3.6,8),p(t,3.6,32)]),.1);
 s+=box(p,-3,3,-3,3,33,35.4,WH)+box(p,-2.3,2.3,-2.3,2.3,35.4,37.6,WH)+box(p,-1.6,1.6,-1.6,1.6,37.6,39.6,WH);
 const t=p(0,0,44.6);s+=pg([p(-1.1,1.1,39.6),p(1.1,1.1,39.6),t],WH.l)+pg([p(1.1,1.1,39.6),p(1.1,-1.1,39.6),t],WH.r)+ln(t,[t[0],t[1]-3],"var(--muted)",.8);
 return wrap("cityHall",x,y,o,15,s)};

// Walt Disney Concert Hall: billowing stainless-steel sails on a low base
M.disneyHall=(x,y,o)=>{const p=iso(x,y);let s=shade(x,y+1,15,6)+box(p,-8,8,-5,5,0,3.2,STEEL);
 const S=[["M-3 -4C-4.5 -11 -1.5 -18 4.5 -20.5C3.5 -14 5.5 -9 7 -4Z",STEEL.r],["M3 -3C6 -9 10 -13.5 14.5 -13C12.5 -9 11.5 -5 10 -1Z",STEEL.t],
  ["M-11 -1C-13.5 -8 -12 -14 -6.5 -16.5C-6 -11 -4 -6 -1.5 -2Z",STEEL.l],["M-7 2C-8.5 -3.5 -6.5 -8 -2.5 -9.5C-2.5 -5.5 -1 -2 1 1.5Z",STEEL.r],
  ["M-1 3C0 -2 3 -5.5 7.5 -6C6.5 -2.5 6.5 .5 5.5 3.5Z",mix(STEEL.r,STEEL.l,45)]];
 let g="";for(const [d,c] of S)g+=`<path d="${d}" style="fill:${c};stroke:var(--muted)" stroke-width=".5" stroke-opacity=".5" stroke-linejoin="round"/>`;
 g+=sk("M-3.9 -9C-3.4 -14 -.6 -18.2 4.5 -20.5","var(--tile)",.7)+sk("M-12.6 -7.5C-12.2 -12 -10 -15 -6.5 -16.5","var(--tile)",.6)+sk("M5.4 -7.5C7.8 -10.6 10.6 -13 14.5 -13","var(--tile)",.6);
 return wrap("disneyHall",x,y,o,14,s+`<g transform="translate(${R(x)} ${R(y)})">${g}</g>`)};

// Union Station: long Mission Revival hall, red tile roof, arcade, clock tower
M.unionStation=(x,y,o)=>{const p=iso(x,y);let s=shade(x+1,y,24,9);
 s+=box(p,-4.5,4.5,-12,12,0,6.5,CREAM);
 s+=pg([p(-4.5,-12,6.5),p(0,-12,9.6),p(0,12,9.6),p(-4.5,12,6.5)],TERRA.l)+pg([p(0,-12,9.6),p(4.5,-12,6.5),p(4.5,12,6.5),p(0,12,9.6)],TERRA.r);
 s+=pg([p(-4.5,12,6.5),p(4.5,12,6.5),p(0,12,9.6)],CREAM.l);
 let a="";for(let u=1.2;u<23;u+=2.6){if(u>5.6&&u<11.6)continue;a+=arch(u,-.6,1.5,4.2)}
 s+=`<path d="${a}" transform="${wallX(p,4.5,12,0)}" style="fill:${dk(CREAM.r,40)}"/>`;
 s+=box(p,3,7.5,1,5,0,21,CREAM);
 const ap=p(5.25,3,25.6);s+=pg([p(3,5,21),p(7.5,5,21),ap],TERRA.l)+pg([p(7.5,5,21),p(7.5,1,21),ap],TERRA.r);
 s+=`<g transform="${wallX(p,7.5,3,17.2)}">${ci(0,0,1.7,"var(--tile)")+sk("M0 0V-1.2M0 0H.9","var(--ink)",.45)}</g>`;
 s+=`<path d="${arch(1.2,-.4,2,6)}" transform="${wallX(p,7.5,5,0)}" style="fill:${dk(CREAM.r,40)}"/>`;
 return wrap("unionStation",x,y,o,18,s)};

// Crypto.com Arena: a glassy drum under a pale roof
M.cryptoArena=(x,y,o)=>{let s=shade(x,y+1.5,16,9);
 s+=drum(x,y,14,8.4,0,10.5,GLASS,22,true);
 for(const z of [3.6,7.2])s+=sk(`M${x-14} ${y-z}A14 8.4 0 0 0 ${x+14} ${y-z}`,"#fff",.6,' opacity=".4"');
 s+=pa(`M${x+3} ${y+8.2-10.5}L${x+9} ${y+6.3-10.5}V${y+6.3-1}L${x+3} ${y+8.2-1}Z`,lt(GLASS.r,30));
 s+=el(x,y-10.5,14,8.4,WH.r)+el(x,y-11.2,12,7.2,WH.t)+el(x+.6,y-11.8,8,4.8,mix(WH.t,WH.r,50));
 return wrap("cryptoArena",x,y,o,15,s)};

// LA Memorial Coliseum: sunken oval bowl, the arched peristyle and the Olympic torch
M.coliseum=(x,y,o)=>{const rx=23,ry=10.5,H=4.6,k=ry/rx;let s=shade(x,y+2,rx+3,ry+2);
 s+=drum(x,y,rx,ry,0,H,STONE,26,true)+el(x,y-H,rx,ry,STONE.t);
 const F=y-H+ry-1.3;let r=rx-1.7;
 for(const c of [mix(STONE.r,"var(--tile)",55),STONE.r,mix(STONE.r,STONE.l,55)]){s+=el(x,F-r*k,r,r*k,c);r-=2.9}
 const fy=F-r*k;s+=el(x,fy,r,r*k,FIELD.t);
 s+=ltl([-2,-1,0,1,2].map(i=>[[x+i*3,fy-r*k*.6],[x+i*3,fy+r*k*.6]]),.35);
 const px=x+10.5,py=y+ry*.62,fw=22,fh=11,dx=2.6,dy=-1.9;
 s+=pg([[px-fw/2,py-fh],[px+fw/2,py-fh],[px+fw/2+dx,py-fh+dy],[px-fw/2+dx,py-fh+dy]],STONE.t);
 s+=pg([[px+fw/2,py-fh],[px+fw/2+dx,py-fh+dy],[px+fw/2+dx,py+dy],[px+fw/2,py]],STONE.r);
 s+=rc(px-fw/2,py-fh,fw,fh,mix(STONE.r,STONE.l,45))+rc(px-fw/2,py-fh,fw,1.5,STONE.t);
 let a=arch(px-2.6,py,5.2,8.2);for(const u of [-10.2,-7.5,-4.8,2.8,5.5,8.2])a+=arch(px+u,py,2,5.6);
 s+=pa(a,dk(STONE.l,45));
 const tx=px+dx/2,ty=py-fh+dy/2;
 s+=pg([[tx-1.6,ty],[tx+1.6,ty],[tx+1,ty-2.4],[tx-1,ty-2.4]],STONE.l)+pa(`M${R(tx-2.5)} ${R(ty-2.4)}H${R(tx+2.5)}L${R(tx+1.4)} ${R(ty-4)}H${R(tx-1.4)}Z`,dk(GOLD.r,30));
 const fl=`<path d="M${R(tx)} ${R(ty-12.5)}C${R(tx+1.9)} ${R(ty-9)} ${R(tx+3.1)} ${R(ty-6.6)} ${R(tx+1.7)} ${R(ty-4.2)}H${R(tx-1.7)}C${R(tx-3.1)} ${R(ty-6.6)} ${R(tx-1.3)} ${R(ty-8.4)} ${R(tx)} ${R(ty-12.5)}Z" style="fill:${th("#ff8a1f",96)}"/><path d="M${R(tx)} ${R(ty-9)}C${R(tx+1)} ${R(ty-7)} ${R(tx+1.5)} ${R(ty-5.6)} ${R(tx+.8)} ${R(ty-4.2)}H${R(tx-.8)}C${R(tx-1.5)} ${R(ty-5.6)} ${R(tx-.6)} ${R(ty-7.2)} ${R(tx)} ${R(ty-9)}Z" style="fill:${th("#ffd34d",96)}"/>`;
 s+=`<g${animOn(o)?` class="dc-flame" style="${lag(1.7)}"`:""}>${fl}</g>`;
 return wrap("coliseum",x,y,o,rx+2,s)};

// Capitol Records: a stack of white records around a dark core, spire with its blinking red light
M.capitolRecords=(x,y,o)=>{let s=shade(x,y+1,9.5,4.5);let z=0;
 for(let i=0;i<9;i++){const zd=1.6+i*3.7,rr=i>6?6.6:7.4;s+=drum(x,y,4.4,2.64,z,zd,DGLASS,12,true)+drum(x,y,rr,rr*.6,zd,zd+1.15,WH,20);z=zd+1.15}
 s+=drum(x,y,4.4,2.64,z,z+3,DGLASS,12)+el(x,y-z-3,3,1.8,WH.t);
 const top=y-z-3;s+=ln([x,top],[x,top-15],"var(--muted)",1.2);
 s+=`<g${animOn(o)?` class="dc-blink" style="${lag(3)}"`:""}>${ci(x,top-15.5,3,"#ff3b30",' opacity=".25"')+ci(x,top-15.5,1.45,"#ff453a")}</g>`;
 return wrap("capitolRecords",x,y,o,9,s)};

// TCL Chinese Theatre: red columns under the big green-bronze pagoda roof
M.chineseTheatre=(x,y,o)=>{let s=shade(x,y+1,15,4);
 let g=pg([[-12.5,0],[-7,0],[-7,-5.5],[-12.5,-5.5]],RED.l)+pg([[7,0],[12.5,0],[12.5,-5.5],[7,-5.5]],RED.r)+pg([[-12.5,-5.5],[-7,-5.5],[-5.6,-6.8],[-11.1,-6.8]],RED.t)+pg([[7,-5.5],[12.5,-5.5],[13.9,-6.8],[8.4,-6.8]],RED.t);
 g+=pg([[-8,-.8],[8,-.8],[8,-11],[-8,-11]],mix(RED.r,RED.l,50))+pg([[8,-.8],[10.4,-2.6],[10.4,-12.8],[8,-11]],RED.r);
 g+=pa("M-3.6 -.8V-6.6Q0 -9.2 3.6 -6.6V-.8Z",dk(RED.l,42))+rc(-6.4,-12,1.9,11.4,RED.r)+rc(4.5,-12,1.9,11.4,RED.r);
 g+=pa("M-15.5 -11.2Q-10.5 -12 -8 -17.5H8Q10.5 -12 15.5 -11.2L12.5 -12.6H-12.5Z",JADE.r)+pa("M-12.5 -12.6H12.5L11 -11.3H-11Z",JADE.l);
 g+=pa("M-8.5 -17.2Q-5.8 -17.8 -4.4 -21.6H4.4Q5.8 -17.8 8.5 -17.2Z",JADE.t)+sk("M-12.5 -12.6H12.5",GOLD.r,.7)+ln([0,-21.6],[0,-25],GOLD.r,1);
 return wrap("chineseTheatre",x,y,o,15,s+`<g transform="translate(${R(x)} ${R(y)})">${g}</g>`)};

// Hollywood Bowl: concentric white shell rings over a fan of seats
M.hollywoodBowl=(x,y,o)=>{let s=shade(x,y+3,17,6,.12);
 for(let i=3;i>=0;i--){const rw=10+i*2.7,rh=3.8+i*1.5;s+=pa(`M${R(x-rw)} ${R(y+.6)}A${R(rw)} ${R(rh)} 0 0 0 ${R(x+rw)} ${R(y+.6)}Z`,i%2?mix("var(--tile-r)","var(--park)",55):mix("var(--tile)","var(--park)",45))}
 s+=el(x,y+.6,10,1.8,WH.r);
 [[13,14],[11,12.1],[9,10.2],[7,8.3],[5,6.4]].forEach(([w,h],i)=>{s+=pa(`M${R(x-w)} ${R(y)}A${w} ${h} 0 0 1 ${R(x+w)} ${R(y)}Z`,i?mix(WH.r,dk(WH.l,25),100-i*22):WH.t)});
 s+=sk(`M${R(x-13)} ${R(y)}A13 14 0 0 1 ${R(x+13)} ${R(y)}`,WH.l,.8);
 return wrap("hollywoodBowl",x,y,o,14,s)};

// LACMA Urban Light: rows of old cast-iron street lamps with glowing globes
// (no model for the lamp-post sculpture at LACMA: it is an artwork, so the Academy Museum marks the spot)

// Academy Museum: the concrete sphere with its glass dome, bridged to the old May Co. building and its gold cylinder
M.academyMuseum=(x,y,o)=>{const p=iso(x,y);let s=shade(x,y+1,14,5.5);
 const sx=x-6.5,sy=y-12.5,r=7.6,leg=dk("var(--tile-l)",30);
 s+=ln([sx-3,sy+6.6],[sx-3.6,y-2.6],leg,1.4)+ln([sx+3,sy+6.6],[sx+2.6,y-1.6],leg,1.4);
 s+=ci(sx,sy,r,WH.r)+pa(`M${R(sx)} ${R(sy-r)}A${r} ${r} 0 0 0 ${R(sx)} ${R(sy+r)}A${R(r*.55)} ${r} 0 0 1 ${R(sx)} ${R(sy-r)}Z`,WH.l);
 s+=pa(`M${R(sx-r*.72)} ${R(sy-r*.69)}A${r} ${r} 0 0 1 ${R(sx+r*.72)} ${R(sy-r*.69)}Q${R(sx)} ${R(sy-r*.42)} ${R(sx-r*.72)} ${R(sy-r*.69)}Z`,lt(GLASS.r,20))+el(sx+2.6,sy-2,1.6,1.1,WH.t);
 s+=ln([sx+r*.85,sy+2.4],[x+2.4,y-7.4],GLASS.r,1.3);
 s+=box(p,-1,6,-3,4,0,7.5,CREAM);
 const gc=p(6,4,0);s+=drum(gc[0],gc[1],2.8,1.68,0,10,GOLD,12);
 return wrap("academyMuseum",x,y,o,13,s)};

// The Getty: white travertine pavilions and the round entrance hall on the hilltop
M.getty=(x,y,o)=>{const p=iso(x,y);let s=shade(x,y+1,25,9,.13);
 const B=[[-3,6,-11,-5,7.5],[-12,-4,-6,0,5.5],[1,9,-4,1,6],[-9,-2,2,8,4.5],[3,10,3,8,4],["rot",-1,-1]];
 B.sort((a,b)=>(a[0]==="rot"?a[1]+a[2]:(a[0]+a[1]+a[2]+a[3])/2)-(b[0]==="rot"?b[1]+b[2]:(b[0]+b[1]+b[2]+b[3])/2));
 for(const b of B){if(b[0]==="rot"){const c=p(b[1],b[2],0);s+=drum(c[0],c[1],4.6,2.76,0,8.6,TRAV,16);continue}
  const [X0,X1,Y0,Y1,H]=b,g=[];s+=box(p,X0,X1,Y0,Y1,0,H,TRAV);for(let z=1.8;z<H-.5;z+=1.8)g.push([p(X1,Y0,z),p(X1,Y1,z)]);s+=dkl(g,.07)}
 return wrap("getty",x,y,o,21,s)};

// Century Plaza Towers: twin triangular aluminium towers
M.centuryCity=(x,y,o)=>{const p=iso(x,y);let s=shade(x,y+1,17,6);const SILV=tri(mat("#b4bec8",62));
 const T=(cx,cy,rot)=>{const V=[0,1,2].map(i=>{const a=rot+i*2*Math.PI/3;return [cx+6*Math.cos(a),cy+6*Math.sin(a)]});
  let t=prism(p,V,0,46,SILV);
  const g=[];for(let i=0;i<3;i++){const A=V[i],B=V[(i+1)%3];if((B[1]-A[1])-(B[0]-A[0])<=0)continue;for(const f of [.25,.5,.75]){const X=A[0]+(B[0]-A[0])*f,Y=A[1]+(B[1]-A[1])*f;g.push([p(X,Y,1.5),p(X,Y,45)])}}t+=dkl(g,.1);
  return t};
 s+=T(3.4,-6,-Math.PI/2+.12)+T(-4.4,4.4,-Math.PI/2+.12);
 return wrap("centuryCity",x,y,o,15,s)};

// UCLA Royce Hall: brick hall, entrance arch between two Lombard towers with tile caps
M.royceHall=(x,y,o)=>{const p=iso(x,y);let s=shade(x,y+1,16,6.5);
 s+=box(p,-4.5,3,-8.5,8.5,0,7,BRICK);
 s+=pg([p(-4.5,-8.5,7),p(-.75,-8.5,10),p(-.75,8.5,10),p(-4.5,8.5,7)],TERRA.l)+pg([p(-.75,-8.5,10),p(3,-8.5,7),p(3,8.5,7),p(-.75,8.5,10)],TERRA.r)+pg([p(-4.5,8.5,7),p(3,8.5,7),p(-.75,8.5,10)],BRICK.l);
 s+=`<path d="${arch(6.5,-.4,4,6)}" transform="${wallX(p,3,8.5,0)}" style="fill:${dk(BRICK.r,45)}"/>`;
 const tw=Y=>{const ap=p(4.2,Y,23.6);return box(p,2,6.4,Y-2,Y+2,0,19,BRICK)+`<path d="${arch(.8,-14.4,1.1,3)+arch(2.3,-14.4,1.1,3)}" transform="${wallX(p,6.4,Y+2,0)}" style="fill:${dk(BRICK.r,48)}"/>`+pg([p(2,Y+2,19),p(6.4,Y+2,19),ap],TERRA.l)+pg([p(6.4,Y+2,19),p(6.4,Y-2,19),ap],TERRA.r)};
 s+=tw(-5.5)+tw(5.5);
 return wrap("royceHall",x,y,o,15,s)};

// Culver City soundstages: barrel-roofed hangars
function hangar(p,X0,X1,Y0,Y1,H,Rr,w,rf){
 let s=pg([p(X0,Y1,H),p(X1,Y1,H),p(X1,Y1,0),p(X0,Y1,0)],w.l);
 const n=6,arc=[];for(let i=0;i<=n;i++){const t=i/n;arc.push([Y0+(Y1-Y0)*t,H+Rr*Math.sin(Math.PI*t)])}
 s+=pg([p(X1,Y0,0),...arc.map(([Y,Z])=>p(X1,Y,Z)),p(X1,Y1,0)],w.r);
 s+=`<g transform="${wallX(p,X1,Y1,0)}">${rc((Y1-Y0)/2-1.6,-4.6,3.2,4.6,dk(w.r,32))}</g>`;
 for(let i=0;i<n;i++){const [Ya,Za]=arc[i],[Yb,Zb]=arc[i+1];s+=pgs([p(X0,Ya,Za),p(X1,Ya,Za),p(X1,Yb,Zb),p(X0,Yb,Zb)],mix(rf.t,rf.l,Math.round(100-i*100/(n-1))))}
 return s}
M.soundstages=(x,y,o)=>{const p=iso(x,y),RF=tri(mat("#9aa3ad",62));let s=shade(x,y+1,19,8);
 for(const [a,b] of [[-11,-5],[-4,2],[3,9]])s+=hangar(p,-6.5,6.5,a,b,5.6,2.8,CREAM,RF);
 return wrap("soundstages",x,y,o,17,s)};

// Santa Monica Pier: deck on pilings, the turning Pacific Wheel, the little West Coaster, the blue arch sign
M.santaMonicaPier=(x,y,o)=>{const p=iso(x,y),L=47;
 let s=pg([p(-3.6,2,-1.2),p(3.6,2,-1.2),p(3.6,L,-1.2),p(-3.6,L,-1.2)],"#000",' opacity=".1"');
 const pl=[];for(let Y=4;Y<L;Y+=4.3)for(const X of [-3.1,3.1]){const a=p(X,Y,3);pl.push([a,[a[0],a[1]+5.6]])}s+=segs(pl,dk("var(--cliff)",25),null,.9);
 s+=box(p,-3.6,3.6,0,L,3,4.3,WOOD);
 s+=sk(`M${P2(p(-3.4,1.4,4.3))}Q${P2(p(0,1.4,13.6))} ${P2(p(3.4,1.4,4.3))}`,th("#2a62b8",92),1.5);
 s+=box(p,-3.2,-.4,8,13,4.3,7.6,WH)+box(p,.6,3.2,6,10,4.3,6.8,tri(mat("#e2b04a",70)));
 const cz=[[14,6],[16.4,11.5],[18.8,8],[21.2,13],[23.6,7.4],[26,10.4],[28.4,6.4]];let d="";
 s+=segs(cz.map(([Y,Z],i)=>{const q=p(1.8,Y,4.3+Z);d+=(i?"L":"M")+P2(q);return [q,p(1.8,Y,4.3)]}),"var(--muted)",null,.5);
 s+=sk(d,th("#f0b323",92),1.4,' stroke-linejoin="round"');
 const hub=p(0,37,4.3+14.8),r=12.6,gc=[th("#e5484d",92),th("#f5c542",92),th("#3b82f6",88),"var(--tile)"];let w="";
 w+=segs([...Array(8)].map((_,i)=>{const a=i*Math.PI/8;return [[r*Math.cos(a),r*Math.sin(a)],[-r*Math.cos(a),-r*Math.sin(a)]]}),"var(--muted)",null,.45);
 w+=`<circle r="${r}" fill="none" style="stroke:var(--muted)" stroke-width="1.3"/><circle r="${R(r*.84)}" fill="none" style="stroke:var(--muted)" stroke-width=".55"/>`;
 for(let i=0;i<16;i++){const a=i*Math.PI/8+.2;w+=ci(r*Math.cos(a),r*Math.sin(a),1.15,gc[i%4])}
 s+=`<g transform="matrix(1 .6 0 1 ${R(hub[0])} ${R(hub[1])})"><path d="M-3.4 14.8L0 0L3.4 14.8" fill="none" style="stroke:var(--muted)" stroke-width="1.3"/><g${animOn(o)?` class="dc-spin" style="${lag(60)}"`:""}>${w}</g>${ci(0,0,1.5,"var(--muted)")}</g>`;
 return wrap("santaMonicaPier",x,y,o,8,s)};

// LAX: the Theme Building's crossed parabolic arches and saucer, a runway, and a plane climbing out over the ocean
const PLANE=`<path d="M-10 0C-9.6 -1.7 -8 -2 -6 -2H7L9.6 -6.3H11.3L10.5 -1.6C10.8 -.6 10.6 .7 9.6 1.2H-7.4C-9 1.2 -10.2 .9 -10 0Z" style="fill:var(--tile);stroke:var(--muted)" stroke-width=".6"/><path d="M7 -2L9.6 -6.3H11.3L10.5 -1.6Z" style="fill:${th("#d1453b",92)}"/><path d="M-2.2 .6L3.6 5.6H5.4L2.6 .6Z" style="fill:var(--tile-r);stroke:var(--muted)" stroke-width=".5"/><path d="M-6.4 -.7H5.6" fill="none" style="stroke:var(--muted)" stroke-width=".6" stroke-dasharray=".8 .7"/>`;
M.lax=(x,y,o)=>{const p=iso(x,y);
 let s=pg([[x-84,y+13],[x-16,y+13],[x-12,y+17.6],[x-80,y+17.6]],mix("var(--tile-l)","var(--ink)",80))+sk(`M${R(x-76)} ${R(y+15.3)}H${R(x-20)}`,"var(--tile)",.6,' stroke-dasharray="3 3"');
 s+=shade(x,y+1,14,6);
 const half=(A,B)=>{const C=[(A[0]+B[0])/2,(A[1]+B[1])/2-52],m=[(A[0]+2*C[0]+B[0])/4,(A[1]+2*C[1]+B[1])/4];
  return [`M${P2(A)}Q${R((A[0]+C[0])/2)} ${R((A[1]+C[1])/2)} ${P2(m)}`,`M${P2(m)}Q${R((C[0]+B[0])/2)} ${R((C[1]+B[1])/2)} ${P2(B)}`]};
 const A=half(p(-12,0,0),p(12,0,0)),B=half(p(0,-12,0),p(0,12,0));
 s+=sk(A[0],WH.l,2.4,' stroke-linecap="round"')+sk(B[0],WH.l,2.4,' stroke-linecap="round"');
 s+=drum(x,y,2.4,1.44,0,13,WH,10)+drum(x,y,9,5.4,13,14.8,DGLASS,20)+el(x,y-14.8,9,5.4,WH.t)+el(x,y-15.4,5,3,WH.r);
 for(const h of [A[1],B[1]])s+=sk(h,"var(--muted)",3,' stroke-linecap="round"')+sk(h,WH.t,1.9,' stroke-linecap="round"');
 const sx=x-30,sy=y+11.6;
 if(smilOn(o))s+=`<g opacity="0"><animateMotion dur="18s" begin="${beg(18)}" repeatCount="indefinite" rotate="auto-reverse" path="M0 0H-24C-50 0 -80 -12 -170 -62" keyPoints="0;0;1;1" keyTimes="0;.2;.8;1" calcMode="linear"/><animate attributeName="opacity" dur="18s" begin="${beg(18)}" repeatCount="indefinite" values="0;1;1;0;0" keyTimes="0;.06;.66;.8;1"/><g transform="translate(${R(sx)} ${R(sy)})">${PLANE}</g></g>`;
 else s+=`<g transform="translate(${R(sx-58)} ${R(sy-17)}) rotate(19)">${PLANE}</g>`;
 return wrap("lax",x,y,o,14,s)};

// The Wiltern: blue-green terra cotta Art Deco tower over its low wings
M.wiltern=(x,y,o)=>{const p=iso(x,y);let s=shade(x,y+1,14,6);
 s+=box(p,-7,4,-5,0,0,7.5,TEAL)+box(p,-2,4,0,6,0,7.5,TEAL)+box(p,.6,5,1.6,6,0,25,TEAL);
 s+=dkl([2.4,3.3,4.2,5.1].map(t=>[p(5,t,8.5),p(5,t,24)]),.22)+ltl([1.5,2.4,3.3,4.2].map(t=>[p(t,6,8.5),p(t,6,24)]),.22);
 s+=box(p,1.2,4.4,2.2,5.4,25,28.4,TEAL)+box(p,1.9,3.7,2.9,4.7,28.4,31.4,TEAL);
 const t=p(2.8,3.8,31.4);s+=ln(t,[t[0],t[1]-4],"var(--muted)",.8);
 return wrap("wiltern",x,y,o,12,s)};

// Angels Flight: a tiny orange funicular car with its stepped body, uphill to the left
M.angelsFlight=(x,y,o)=>{const OR=th("#e0592a",94),OD=dk(th("#e0592a",94),34),BL=mix("#1d1d1d","var(--ink)",70),WIN=mix("#fff3d6","var(--land)",85),body="M-5.6 -1.8L6 3.8V-3.6H2.6V-5.4H-1.4V-7.2H-5.6Z";
 let g=pa(body,OD,' transform="translate(1.4 -1)"')+pa(body,OR)+rc(-4.8,-6.4,2.6,1.6,WIN)+rc(-.6,-4.6,2.4,1.5,WIN)+rc(3.2,-2.8,2.2,1.5,WIN);
 g+=sk("M-5.6 -7.2H-1.4V-5.4H2.6V-3.6H6",BL,.8)+ci(-3.4,-.4,.95,BL)+ci(3.6,2.9,.95,BL);
 return wrap("angelsFlight",x,y,o,7,`<g transform="translate(${R(x)} ${R(y)})">${g}</g>`)};
// ================= Seattle =================
// Space Needle: three pairs of legs pinching in at the waist, the halo with its window band, roof cone and spire
M.spaceNeedle=(x,y,o)=>{let s=shade(x,y+1,9,3.6);const LEG=mix(WH.r,WH.l,40);
 s+=drum(x,y,6.2,3.72,0,1.6,WH,14);
 const leg=(deg,c)=>{const a=deg*Math.PI/180,b=[x+6*Math.cos(a),y+3.6*Math.sin(a)-1.6],m=[x+1.7*Math.cos(a),y+Math.sin(a)-21],t=[x+3.6*Math.cos(a),y+2.16*Math.sin(a)-43];
  return sk(`M${P2(b)}Q${R(x+(b[0]-x)*.25)} ${R((b[1]+m[1])/2)} ${P2(m)}Q${R(x+(t[0]-x)*.15)} ${R((m[1]+t[1])/2)} ${P2(t)}`,c,1.7,' stroke-linecap="round"')};
 s+=leg(-90,WH.l)+rc(x-1.2,y-43,1.2,41.5,WH.l)+rc(x,y-43,1.2,41.5,WH.r)+leg(150,LEG)+leg(30,LEG);
 s+=pa(`M${R(x-10)} ${R(y-47.2)}A10 6 0 0 0 ${R(x+10)} ${R(y-47.2)}L${R(x+3.4)} ${R(y-43)}A3.4 2 0 0 1 ${R(x-3.4)} ${R(y-43)}Z`,WH.l);
 s+=drum(x,y,10,6,47.2,49.3,DGLASS,20,true)+el(x,y-49.3,10,6,WH.t);
 s+=pa(`M${R(x-9)} ${R(y-49.7)}A9 5.4 0 0 0 ${R(x+9)} ${R(y-49.7)}L${R(x+2.6)} ${R(y-53.2)}H${R(x-2.6)}Z`,WH.r)+pa(`M${R(x-9)} ${R(y-49.7)}A9 5.4 0 0 0 ${R(x)} ${R(y-44.3)}L${R(x)} ${R(y-53.2)}H${R(x-2.6)}Z`,mix(WH.r,WH.l,55));
 s+=drum(x,y,2.6,1.56,53.2,55.4,WH,10)+ln([x,y-55.4],[x,y-68],"var(--muted)",1.1);
 return wrap("spaceNeedle",x,y,o,11,s)};

// MoPOP: Gehry's crumpled metal skins in purple, gold, red and silver
M.mopop=(x,y,o)=>{let s=shade(x,y+1,12,4.5);
 const B=[[th("#7b5ea7",86),"M-11 0C-12 -6 -9 -11 -4 -11C-1 -11 -1 -7 -2 -4C-3 -1 -5 1 -11 0Z"],[th("#d4a017",88),"M-4 1C-6 -4 -3 -9 2 -9C6 -9 7 -5 5 -2C4 0 1 2 -4 1Z"],
  [th("#c0392b",88),"M1 1C0 -4 3 -10 8 -10C12 -10 13 -5 11 -1C10 1 6 2 1 1Z"],[mix("#a9bccf","var(--tile)",62),"M-7 3C-7 -1 -4 -3 0 -3C4 -3 6 0 5 3Z"]];
 let g="";for(const [c,d] of B)g+=pa(d,c)+sk(d.replace(/Z$/,""),lt(c,45),.6,' opacity=".7"');
 return wrap("mopop",x,y,o,12,s+`<g transform="translate(${R(x)} ${R(y)})">${g}</g>`)};

// Climate Pledge Arena: glass walls under the 1962 saddle roof
M.climatePledge=(x,y,o)=>{let s=shade(x,y+1,17,7);
 s+=drum(x,y,13,7.8,0,5,GLASS,20,true)+el(x,y-5,13,7.8,GLASS.t);
 const roof=`M${R(x-18)} ${R(y-13)}Q${R(x-7)} ${R(y-12)} ${R(x+1)} ${R(y-17)}Q${R(x+8)} ${R(y-12.5)} ${R(x+18)} ${R(y-14)}Q${R(x+7)} ${R(y-9)} ${R(x-1)} ${R(y-4.6)}Q${R(x-7)} ${R(y-9)} ${R(x-18)} ${R(y-13)}Z`;
 s+=pa(`M${R(x-18)} ${R(y-13)}Q${R(x-7)} ${R(y-7.6)} ${R(x-1)} ${R(y-3)}Q${R(x+7)} ${R(y-7.6)} ${R(x+18)} ${R(y-14)}L${R(x+18)} ${R(y-12.6)}Q${R(x+7)} ${R(y-6.2)} ${R(x-1)} ${R(y-1.6)}Q${R(x-7)} ${R(y-6.2)} ${R(x-18)} ${R(y-11.6)}Z`,WH.l);
 s+=pa(roof,WH.t)+sk(`M${R(x-18)} ${R(y-13)}Q${R(x-7)} ${R(y-9)} ${R(x-1)} ${R(y-4.6)}Q${R(x+7)} ${R(y-9)} ${R(x+18)} ${R(y-14)}`,WH.r,.7);
 return wrap("climatePledge",x,y,o,18,s)};

// Pike Place Market: the red neon PUBLIC MARKET sign and its clock over the market hall
M.pikePlace=(x,y,o)=>{const p=iso(x,y),MK=tri(mat("#c79f74",58));let s=shade(x,y+1,16,5.5);
 s+=box(p,-9,9,-3,3,0,7,MK);
 s+=`<g transform="${wallY(p,-9,3,0)}">${rc(1.5,-3.6,15,2.2,dk(MK.l,30))}</g>`;
 const sx=x+3,sy=y-16.5,PK=th("#e8382c",96);
 s+=ln([sx-14,sy+2],[sx-14,y-5.5],"var(--muted)",.8)+ln([sx+16,sy+2],[sx+16,y-2.2],"var(--muted)",.8)+ln([sx-19,sy+2],[sx+21,sy+2],"var(--muted)",.7);
 s+=ci(sx-20.5,sy-1.6,4,dk("var(--tile-l)",35))+ci(sx-20.5,sy-1.6,3,th("#fbf7ea",94))+sk(`M${R(sx-20.5)} ${R(sy-1.6)}V${R(sy-3.8)}M${R(sx-20.5)} ${R(sy-1.6)}H${R(sx-19)}`,th("#1f1f1f",92),.6);
 s+=`<text x="${R(sx+2)}" y="${R(sy+.6)}" text-anchor="middle" font-size="6.4" font-weight="900" textLength="38" lengthAdjust="spacingAndGlyphs" paint-order="stroke" stroke-width="1.8" stroke-linejoin="round" style="stroke:var(--land);fill:${PK};font-stretch:78%">PUBLIC MARKET</text>`;
 return wrap("pikePlace",x,y,o,16,s)};

// Seattle Great Wheel on Pier 57: pier out over Elliott Bay, white wheel turning
M.greatWheel=(x,y,o)=>{const p=iso(x,y),L=40;
 let s=pg([p(0,-3.4,-1.2),p(-L,-3.4,-1.2),p(-L,3.4,-1.2),p(0,3.4,-1.2)],"#000",' opacity=".1"');
 const pl=[];for(let X=-4;X>-L;X-=4.4)for(const Y of [-3,3]){const a=p(X,Y,2.6);pl.push([a,[a[0],a[1]+5.4]])}s+=segs(pl,dk("var(--cliff)",25),null,.9);
 s+=box(p,-L,0,-3.4,3.4,2.6,3.8,WOOD)+box(p,-10,-1.5,-3,3,3.8,8,tri(mat("#b98c62",62)));
 const hub=p(-31,0,3.8+13.2),r=11;let w="";
 w+=segs([...Array(7)].map((_,i)=>{const a=i*Math.PI/7;return [[r*Math.cos(a),r*Math.sin(a)],[-r*Math.cos(a),-r*Math.sin(a)]]}),"var(--muted)",null,.45);
 w+=`<circle r="${r}" fill="none" style="stroke:var(--muted)" stroke-width="1.3"/><circle r="${R(r*.62)}" fill="none" style="stroke:var(--muted)" stroke-width=".5"/>`;
 for(let i=0;i<14;i++){const a=i*Math.PI/7+.22;w+=`<circle cx="${R(r*Math.cos(a))}" cy="${R(r*Math.sin(a))}" r="1.3" style="fill:var(--tile);stroke:var(--muted)" stroke-width=".45"/>`}
 s+=`<g transform="matrix(1 .6 0 1 ${R(hub[0])} ${R(hub[1])})"><path d="M-4 13.2L0 0L4 13.2" fill="none" style="stroke:var(--muted)" stroke-width="1.3"/><g${animOn(o)?` class="dc-spin" style="${lag(60)}"`:""}>${w}</g>${ci(0,0,1.6,"var(--muted)")}</g>`;
 return wrap("greatWheel",x,y,o,8,s)};

// Smith Tower: white terra cotta tower on its base, tall pyramid top
M.smithTower=(x,y,o)=>{const p=iso(x,y);let s=shade(x,y+1,11,5);
 s+=towerBox(p,-5,5,-4,4,15,WH,3)+box(p,-3,3,-3,3,15,37,WH);
 const a1=[],a2=[];for(let z=18;z<37;z+=3){a1.push([p(3,-3,z),p(3,3,z)]);a2.push([p(-3,3,z),p(3,3,z)])}s+=dkl(a1,.11)+dkl(a2,.08);
 const a=p(0,0,47.5);s+=pg([p(-3,3,37),p(3,3,37),a],WH.l)+pg([p(3,3,37),p(3,-3,37),a],WH.r)+ci(a[0],a[1]-.6,1.1,th("#a9d8ff",90));
 return wrap("smithTower",x,y,o,9,s)};

// Columbia Center: the tallest, near-black, stepping back in three stages
M.columbiaCenter=(x,y,o)=>{const p=iso(x,y);let s=shade(x,y+1,11,5);
 const st=(X0,X1,Y0,Y1,Z0,Z1)=>{const a=[],b=[];for(let z=Z0+3.5;z<Z1-1;z+=3.5){a.push([p(X1,Y0,z),p(X1,Y1,z)]);b.push([p(X0,Y1,z),p(X1,Y1,z)])}return box(p,X0,X1,Y0,Y1,Z0,Z1,BGLASS)+ltl(a,.2)+ltl(b,.13)};
 s+=st(-5,5,-5,5,0,42)+st(-4.2,4,-4,3.4,42,54)+st(-3.2,2.6,-3,1.8,54,63);
 return wrap("columbiaCenter",x,y,o,9,s)};

// Amazon Spheres: three glass spheres with their lattice
M.amazonSpheres=(x,y,o)=>{let s=shade(x,y+1,14,5);const SP=tri(mat("#9ec3d6",62));
 const sph=(cx,cy,r)=>ci(cx,cy,r,SP.r)+pa(`M${R(cx)} ${R(cy-r)}A${r} ${r} 0 0 0 ${R(cx)} ${R(cy+r)}A${R(r*.5)} ${r} 0 0 1 ${R(cx)} ${R(cy-r)}Z`,SP.l)
  +sk(`M${R(cx-r)} ${R(cy)}A${r} ${R(r*.38)} 0 0 0 ${R(cx+r)} ${R(cy)}M${R(cx-r*.86)} ${R(cy-r*.5)}A${R(r*.86)} ${R(r*.3)} 0 0 0 ${R(cx+r*.86)} ${R(cy-r*.5)}M${R(cx)} ${R(cy-r)}A${R(r*.45)} ${r} 0 0 0 ${R(cx)} ${R(cy+r)}M${R(cx)} ${R(cy-r)}A${R(r*.45)} ${r} 0 0 1 ${R(cx)} ${R(cy+r)}`,lt(SP.r,55),.5,' opacity=".9"')+el(cx+r*.35,cy-r*.45,r*.22,r*.14,SP.t);
 s+=sph(x+4,y-9.6,6.6)+sph(x-5,y-8,7.6)+sph(x+7.8,y-5.2,5.2);
 return wrap("amazonSpheres",x,y,o,13,s)};

// stadium helper: wall, rim, seating rings that only show at the back, the field
function bowl(x,y,rx,ry,H,wall,rim,tiers,field){
 let s=shade(x,y+2,rx+3,ry+2.2)+drum(x,y,rx,ry,0,H,wall,24,true)+el(x,y-H,rx,ry,rim);
 const k=ry/rx,F=y-H+ry-1.4;let r=rx-1.6;
 for(const c of tiers){s+=el(x,F-r*k,r,r*k,c);r-=2.6}
 return {s:s+el(x,F-r*k,r,r*k,field),fx:x,fy:F-r*k,fr:r,fk:k};
}
// Lumen Field: the arched roof trusses over both sidelines
M.lumenField=(x,y,o)=>{const H=5,b=bowl(x,y,17,9.4,H,GRAN,WH.t,[th("#5b6f8a",70),th("#46607f",76)],FIELD.t);let s=b.s;
 s+=ltl([-2,-1,0,1,2].map(i=>[[x+i*2.6,b.fy-b.fr*b.fk*.6],[x+i*2.6,b.fy+b.fr*b.fk*.6]]),.35);
 const arc=(y0,h,w)=>`M${R(x-w)} ${R(y0)}Q${R(x)} ${R(y0-h)} ${R(x+w)} ${R(y0)}L${R(x+w-1.6)} ${R(y0+1.6)}Q${R(x)} ${R(y0-h+3)} ${R(x-w+1.6)} ${R(y0+1.6)}Z`;
 s+=pa(arc(y-H-3.4,14,16.5),WH.t)+sk(`M${R(x-16.5)} ${R(y-H-3.4)}Q${R(x)} ${R(y-H-17.4)} ${R(x+16.5)} ${R(y-H-3.4)}`,WH.l,.6);
 s+=pa(arc(y-H+6.6,8,15),WH.t)+sk(`M${R(x-15)} ${R(y-H+6.6)}Q${R(x)} ${R(y-H-1.4)} ${R(x+15)} ${R(y-H+6.6)}`,WH.l,.6);
 return wrap("lumenField",x,y,o,18,s)};
// T-Mobile Park: ballpark with its retractable roof rolled back onto the rails
M.tmobilePark=(x,y,o)=>{const b=bowl(x,y,15,9,4.6,GRAN,WH.t,[th("#2f6f5e",72),th("#1f4f6e",76)],FIELD.t);let s=b.s;
 const ix=x,iy=b.fy-b.fr*b.fk*.25,hw=3.6,hh=2.2;
 s+=pg([[ix,iy-hh],[ix+hw,iy],[ix,iy+hh],[ix-hw,iy]],DIRT)+pg([[ix,iy-hh*.5],[ix+hw*.5,iy],[ix,iy+hh*.5],[ix-hw*.5,iy]],FIELD.t);
 const RF=tri(mat("#a7b0ba",60));
 for(const [dx,h,c] of [[25,17,RF.l],[21,15,RF.r],[17,13,RF.t]])s+=pa(`M${R(x+dx-9)} ${R(y+2)}Q${R(x+dx)} ${R(y+2-h*2)} ${R(x+dx+9)} ${R(y+2)}Z`,c)+sk(`M${R(x+dx-9)} ${R(y+2)}Q${R(x+dx)} ${R(y+2-h*2)} ${R(x+dx+9)} ${R(y+2)}`,RF.l,.5);
 return wrap("tmobilePark",x,y,o,17,s)};
// Husky Stadium: purple seats under the twin cantilevered roofs, by the water
M.huskyStadium=(x,y,o)=>{const H=5,b=bowl(x,y,16,9.6,H,WH,WH.t,[th("#6b4fa0",70),th("#4b2e83",80)],FIELD.t);let s=b.s;
 const wing=(y0,d,w)=>pa(`M${R(x-w)} ${R(y0)}C${R(x-w*.6)} ${R(y0-d)} ${R(x+w*.6)} ${R(y0-d)} ${R(x+w)} ${R(y0)}L${R(x+w-2)} ${R(y0+1.8)}C${R(x+w*.5)} ${R(y0-d*.55)} ${R(x-w*.5)} ${R(y0-d*.55)} ${R(x-w+2)} ${R(y0+1.8)}Z`,WH.t)+sk(`M${R(x-w)} ${R(y0)}C${R(x-w*.6)} ${R(y0-d)} ${R(x+w*.6)} ${R(y0-d)} ${R(x+w)} ${R(y0)}`,WH.l,.6);
 s+=wing(y-H-5,11,17)+wing(y-H+7,6,14);
 return wrap("huskyStadium",x,y,o,18,s)};

// Gas Works Park: the old rusted gasification towers and their pipes
M.gasWorks=(x,y,o)=>{let s=shade(x,y+1,12,4.5);const PIPE=dk(RUST.r,20);
 s+=drum(x+1,y-3,2.5,1.5,0,22,RUST,10)+ln([x+1,y-25],[x+1,y-28],PIPE,.8);
 s+=sk(`M${R(x-5)} ${R(y-14)}H${R(x+1)}M${R(x-5)} ${R(y-8)}L${R(x+6)} ${R(y-9)}M${R(x+1)} ${R(y-17)}L${R(x+6)} ${R(y-12)}`,PIPE,1);
 s+=drum(x-5,y-1,2.7,1.62,0,19,RUST,10)+drum(x+6,y,2.2,1.32,0,15,RUST,10);
 s+=ln([x-5,y-20],[x-5,y-23],PIPE,.8)+rc(x-7.8,y-11,5.6,1,th("#9a5a3a",80),' opacity=".8"');
 return wrap("gasWorks",x,y,o,10,s)};

// Volunteer Park water tower: brick drum, cornice, low slate roof
M.volunteerTower=(x,y,o)=>{let s=shade(x,y+1,6,2.8);
 s+=drum(x,y,4.2,2.52,0,21,BRICK,14,true);
 for(const z of [6,12,17])s+=rc(x-.5,y+2.2-z-2.4,1,2.4,dk(BRICK.r,45))+rc(x+2.2,y+1.6-z-2.2,.9,2.2,dk(BRICK.r,40));
 s+=drum(x,y,4.8,2.88,21,22.4,BRICK);
 const SL=mat("#4d5d5a",72);s+=pa(`M${R(x-4.6)} ${R(y-22.4)}A4.6 2.76 0 0 0 ${R(x+4.6)} ${R(y-22.4)}L${R(x)} ${R(y-28)}Z`,SL)+pa(`M${R(x-4.6)} ${R(y-22.4)}A4.6 2.76 0 0 0 ${R(x)} ${R(y-19.64)}L${R(x)} ${R(y-28)}Z`,dk(SL,20))+ln([x,y-28],[x,y-30],"var(--muted)",.7);
 return wrap("volunteerTower",x,y,o,6,s)};

// Historic Chinatown Gate: red columns, gold board, green tile roof with upturned eaves
M.chinatownGate=(x,y,o)=>{let s=shade(x,y+1,11,3);
 let g=rc(-7.4,-12,2,12,RED.r)+rc(-5.4,-12.6,.7,12.6,RED.l)+rc(5.4,-12,2,12,RED.r)+rc(7.4,-12.6,.7,12.6,RED.l);
 g+=rc(-8.6,-13.4,17.2,1.7,RED.l)+rc(-3.6,-12.4,7.2,3.4,GOLD.r)+rc(-2.4,-11.6,1.4,1.8,dk(GOLD.r,45))+rc(1,-11.6,1.4,1.8,dk(GOLD.r,45));
 g+=ci(-6.4,-9.2,1,th("#e23b2e",94))+ci(6.4,-9.2,1,th("#e23b2e",94));
 g+=pa("M-11.4 -13.2Q-8.4 -13.9 -6.8 -17.4H6.8Q8.4 -13.9 11.4 -13.2L9.2 -14.7H-9.2Z",JADE.r)+pa("M-9.2 -14.7H9.2L8.2 -13.5H-8.2Z",JADE.l)+rc(-7,-18.2,14,1,JADE.l)+ci(-7.2,-18.4,.8,GOLD.r)+ci(7.2,-18.4,.8,GOLD.r);
 return wrap("chinatownGate",x,y,o,11,s+`<g transform="translate(${R(x)} ${R(y)})">${g}</g>`)};

// Port of Seattle container crane, boom out over the water to the west
M.portCrane=(x,y,o)=>{let s=shade(x,y+1,9,2.5);
 let g=sk("M-2.6 -1.8V-18.8M7.4 -1.8V-18.8",ORANGE.l,1.5)+sk("M-5 0V-17M5 0V-17",ORANGE.r,1.7)+sk("M-5 -6H5M-5 -12H5M-5 -6L5 -12",ORANGE.r,.8);
 g+=sk("M-25 -18H9",ORANGE.r,1.9)+sk("M2 -27.5L9 -18M2 -27.5L-25 -18M2 -27.5L-6 -18",ORANGE.l,.7)+sk("M2 -27.5V-18",ORANGE.r,1.2);
 g+=rc(-1.5,-21.6,7,3.4,ORANGE.t)+rc(-15.6,-17.2,3,1.4,dk("var(--tile-l)",40))+ln([-14.1,-15.8],[-14.1,-9.5],"var(--muted)",.5)+rc(-17.2,-9.5,6.2,2.6,th("#2f6db5",86));
 return wrap("portCrane",x,y,o,8,s+`<g transform="translate(${R(x)} ${R(y)})">${g}</g>`)};

// Mount Rainier: a big snow-capped silhouette rising out of the haze; (x,y) is the middle of its base
M.mountRainier=(x,y,o)=>{const ROCK=mix("#71839a","var(--water)",58),ROCKD=dk(ROCK,15),SNOW=mix("#ffffff","var(--tile)",62),SNOWD=mix(SNOW,ROCK,70);
 let g=pa("M-175 0C-125 -30 -64 -86 -24 -128L-7 -141L5 -144L22 -137C60 -97 120 -36 180 0Z",ROCK)+pa("M-175 0C-125 -30 -64 -86 -24 -128L-7 -141C-14 -100 -30 -50 -42 0Z",ROCKD);
 g+=pa("M-46 -96L-24 -128L-7 -141L5 -144L22 -137L50 -101Q45 -95 42 -88Q39 -80 36 -79Q33 -88 29 -91Q24 -80 19 -69Q15 -80 11 -87Q7 -72 3 -60Q0 -74 -5 -85Q-10 -76 -15 -68Q-18 -81 -22 -89Q-27 -82 -34 -77Q-39 -87 -46 -96Z",SNOW);
 g+=pa("M-46 -96L-24 -128L-7 -141L-5 -111Q-6 -96 -5 -85Q-10 -76 -15 -68Q-18 -81 -22 -89Q-27 -82 -34 -77Q-39 -87 -46 -96Z",SNOWD)+pa("M-62 -70L-52 -84L-50 -66ZM56 -64L64 -74L67 -58ZM24 -56L30 -66L31 -50Z",SNOW,' opacity=".75"');
 g+=pa("M-190 -30C-150 -40 -120 -27 -80 -35C-40 -43 -10 -29 30 -37C70 -45 110 -31 150 -39C170 -43 185 -40 195 -38V2H-190Z",mix(ROCK,"var(--water)",42))+pa("M-190 -13C-140 -21 -100 -9 -50 -17C0 -25 40 -11 90 -19C130 -25 170 -15 195 -19V2H-190Z",mix(ROCK,"var(--water)",18));
 return wrap("mountRainier",x,y,o,40,`<g transform="translate(${R(x)} ${R(y)})">${g}</g>`)};

// Washington State Ferry: white decks, green stripe, crossing Elliott Bay from Colman Dock and back (double-ended, never turns)
const FERRY=(()=>{const W=mix("#ffffff","var(--tile)",70),GR=th("#0f7a4a",92);
 return pa("M-13.5 0H13.5L11.6 3.2H-11.6Z",th("#24312b",88))+rc(-13.5,-3.4,27,3.4,W)+rc(-13.5,-1.5,27,1.1,GR)+rc(-9.5,-7,19,3.6,W)+rc(-8.5,-6,17,1.1,dk("var(--tile-l)",38))
  +rc(-9.5,-8.6,3,1.6,W)+rc(6.5,-8.6,3,1.6,W)+rc(-1,-10.8,2.6,3.8,W)+rc(-1,-9.8,2.6,.9,GR)+sk("M-13.5 -3.4H13.5M-9.5 -7H9.5","var(--muted)",.4,' opacity=".8"')})();
M.ferry=(x,y,o)=>{let s="";const body=el(0,2.4,14,1.6,"#000",' opacity=".12"')+sk("M-14 1.6H-21M14 1.6H21","var(--tile)",.7,' opacity=".6"')+FERRY;
 if(smilOn(o))s+=`<g><animateMotion dur="80s" begin="${beg(80)}" repeatCount="indefinite" path="M0 0L-190 -12" keyPoints="0;0;1;1;0;0" keyTimes="0;.06;.44;.56;.94;1" calcMode="linear"/><g transform="translate(${R(x)} ${R(y)})">${body}</g></g>`;
 else s+=`<g transform="translate(${R(x-70)} ${R(y-4.4)})">${body}</g>`;
 return wrap("ferry",x,y,o,14,s)};

// Kenmore Air floatplane on Lake Union
M.seaplane=(x,y,o)=>{const W=mix("#ffffff","var(--tile)",72);
 let g=el(0,1.4,10,1.2,"#000",' opacity=".12"')+rc(-7,-.9,13,1.4,dk("var(--tile-l)",30),' rx=".7"')+sk("M-4 -.9L-2.5 -4.4M3 -.9L1.6 -4.4","var(--muted)",.5);
 g+=`<path d="M-7.6 -5.2C-7.6 -6.6 -6.2 -7.2 -4.6 -7.2H3.6L7 -10H8.2L7.4 -5.8 3.6 -4.2H-6.6Z" style="fill:${W};stroke:var(--muted)" stroke-width=".5"/>`+rc(-4.6,-8.4,10.4,1.1,th("#f2b134",92))+rc(-6,-6.4,3,1.1,dk("var(--tile-l)",35));
 return wrap("seaplane",x,y,o,9,`<g transform="translate(${R(x)} ${R(y)})">${g}</g>`)};

// Lake Union floating homes: a loose cluster, each on its own float
M.houseboats=(x,y,o)=>{let s="";const C=["#f0d7a8","#cfe0ea","#f2c6b8"];
 [[-5,-7],[4.5,-1],[-2.5,6.5]].forEach(([dx,dy],i)=>{const q=iso(x+dx,y+dy),W=tri(mix(C[i],"var(--tile)",62));
  s+=el(x+dx-1,y+dy+1.8,6.6,2.3,"#000",' opacity=".12"')+box(q,-3.3,3.3,-2.5,2.5,0,.9,WOOD)+box(q,-2.6,2.6,-2,2,.9,4.4,W)
   +pg([q(-3,-2.3,4.2),q(3,-2.3,4.2),q(3,0,6.5),q(-3,0,6.5)],W.t)+pg([q(-3,0,6.5),q(3,0,6.5),q(3,2.3,4.2),q(-3,2.3,4.2)],dk(W.l,10))+pg([q(2.6,-2,4.4),q(2.6,2,4.4),q(2.6,0,6.3)],W.r)});
 return wrap("houseboats",x,y,o,9,s)};
// ================= props =================
const TRUNK=mat("#8b6f4e",72);
// Washingtonia palm: tall thin trunk, a mop of drooping fronds
function palmBody(x,y,h){
 const tx=x+h*.08,ty=y-h;let s=el(x-1.6,y+1,3.4,1.3,"#000",' opacity=".15"');
 s+=pa(`M${R(x-1.05)} ${R(y)}Q${R(x-.6)} ${R(y-h*.55)} ${R(tx-.55)} ${R(ty+.6)}L${R(tx+.55)} ${R(ty+.6)}Q${R(x+.5)} ${R(y-h*.55)} ${R(x+1.05)} ${R(y)}Z`,TRUNK);
 const fd=["",""];[[-112,6.4],[-80,6],[-140,7.6],[-50,7],[-168,7.2],[-18,7.4],[14,6.6]].forEach(([deg,L],i)=>{const a=deg*Math.PI/180,ex=tx+L*Math.cos(a),ey=ty+L*Math.sin(a)*.55+3.6,cx=tx+L*.55*Math.cos(a),cy=ty+L*.55*Math.sin(a)*.55-2.4;
  fd[i%2]+=`M${R(tx)} ${R(ty)}Q${R(cx)} ${R(cy-1.2)} ${R(ex)} ${R(ey)}Q${R(cx)} ${R(cy+1.4)} ${R(tx)} ${R(ty+.9)}Z`});
 return s+pa(fd[0],LEAF)+pa(fd[1],LEAF2)+ci(tx,ty+.4,1.2,dk(LEAF,30));
}
M.palm=(x,y,o)=>wrap("palm",x,y,o,6,palmBody(x,y,22));
M.palms=(x,y,o)=>wrap("palms",x,y,o,11,palmBody(x-6,y-1,19)+palmBody(x,y,23)+palmBody(x+5.5,y+1.5,20.5));

// Baldwin Hills pumpjack: the walking beam nods on its samson post
M.pumpjack=(x,y,o)=>{const ST="var(--muted)",DP=mix("var(--ink)","var(--muted)",45);
 let g=rc(-9,-1.4,18,1.6,DP)+ci(-6.2,-4.2,2.4,GOLD.l)+`<path d="M-3 -.2L0 -9.6L3 -.2" fill="none" style="stroke:${ST}" stroke-width="1.3"/>`+rc(7.6,-2.6,2.2,2.6,DP);
 const beam=`<rect x="-10.6" y="-19.2" width="21.2" height="19.2" fill="none"/>`+rc(-8,-10.6,15.5,1.7,DP)+pa("M7.2 -12.2Q10.6 -11.6 10.6 -8.4L7.2 -8.4Z",GOLD.r)+ln([9.6,-8.4],[9.6,-2.6],ST,.6)+ln([-7,-9.6],[-6.2,-4.2],ST,.9);
 g+=`<g${animOn(o)?` class="dc-nod" style="${lag(6)}"`:""}>${beam}</g>`+ci(0,-9.6,.9,ST);
 return wrap("pumpjack",x,y,o,10,el(x-1,y+1.2,11,2.6,"#000",' opacity=".15"')+`<g transform="translate(${R(x)} ${R(y)})">${g}</g>`)};

// a low stucco house with a tile roof (pastel picked from its position)
const PASTEL=["#f3efe6","#f1d9cf","#f0e3bf","#d9e4ec","#e4ead7"];
M.house=(x,y,o)=>{const p=iso(x,y),W=tri(mix(PASTEL[Math.abs(Math.round(x*7+y*13))%PASTEL.length],"var(--tile)",62));
 let s=shade(x,y+.5,8,3.4)+box(p,-3.4,3.4,-2.6,2.6,0,4.4,W);
 s+=pg([p(-3.8,-3,4.2),p(3.8,-3,4.2),p(3.8,0,7.2),p(-3.8,0,7.2)],TERRA.t)+pg([p(-3.8,0,7.2),p(3.8,0,7.2),p(3.8,3,4.2),p(-3.8,3,4.2)],TERRA.l)+pg([p(3.4,-2.6,4.4),p(3.4,2.6,4.4),p(3.4,0,7)],W.r);
 s+=`<g transform="${wallY(p,-3.4,2.6,0)}">${rc(1,-3.4,1.5,1.6,dk(W.l,30))+rc(4.2,-3.4,1.5,1.6,dk(W.l,30))}</g>`;
 return wrap("house",x,y,o,8,s)};

// LA County lifeguard tower on stilts, ramp down to the sand
M.lifeguard=(x,y,o)=>{const p=iso(x,y),HUT=tri(mix("#7ec3e3","var(--tile)",64)),POST=dk("var(--tile-l)",30);let s=shade(x,y+1,7,2.8);
 for(const [X,Y] of [[-2.1,-1.8],[2.1,-1.8],[-2.1,1.8],[2.1,1.8]])s+=ln(p(X,Y,0),p(X,Y,5.2),POST,.8);
 s+=box(p,-2.6,2.6,-2.2,2.2,5,9.2,HUT)+`<g transform="${wallX(p,2.6,2.2,0)}">${rc(.7,-8.4,3,1.5,dk(HUT.r,45))}</g>`+box(p,-3,3,-2.6,2.6,9.2,9.9,WH);
 s+=pg([p(-1,2.2,5),p(1,2.2,5),p(1,8,0),p(-1,8,0)],WOOD.r);
 return wrap("lifeguard",x,y,o,6,s)};

// Pacific Northwest conifers
const EV=(()=>{const c=mix("#2e6a45","var(--park-d)",70);return {l:dk(c,24),r:c}})();
function fir(x,y,h){let s=el(x-1.2,y+.8,h*.26,h*.09,"#000",' opacity=".15"')+rc(x-.6,y-2.4,1.2,2.6,TRUNK);const w=h*.3;let L="",Rt="";
 for(let i=0;i<3;i++){const b=y-1.6-i*h*.24,t=b-h*.46,ww=w*(1-i*.22);L+=`M${R(x)} ${R(t)}L${R(x-ww)} ${R(b)}L${R(x)} ${R(b+1.1)}Z`;Rt+=`M${R(x)} ${R(t)}L${R(x)} ${R(b+1.1)}L${R(x+ww)} ${R(b)}Z`}
 return s+pa(L,EV.l)+pa(Rt,EV.r)}
M.evergreen=(x,y,o)=>wrap("evergreen",x,y,o,5,fir(x,y,16));
M.evergreens=(x,y,o)=>wrap("evergreens",x,y,o,10,fir(x-5,y-1.5,13)+fir(x+4.5,y-.5,15)+fir(x,y+1.5,17));
return {M,sign,defs:gradDefs};
})();
// ---------- public interface ----------
// MODELS[kind](x,y,o) -> SVG string. (x,y): screen coords of the model's ground point, i.e. G(gx,gy).
// o: {t?:label, a?:"start"|"end"|"middle", s?:scale, anim?:boolean (default on)}
const MODELS=__TURF_ART.M;
// regionSign(x,y,text,style): a neighbourhood sign on a short post standing at (x,y); style "la" (blue) or "sea" (green)
function regionSign(x,y,text,style){return __TURF_ART.sign(x,y,text,style)}
// decorDefs(): the <defs> with the cylinder shading gradients used so far; decorSVG(...,"models") already includes it.
// Call it after drawing MODELS yourself and put it anywhere in the same SVG.
function decorDefs(){return `<defs>${__TURF_ART.defs()}</defs>`}
function decorMotionOK(){return !(typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches)}

// Placement. Entries are {k,gx,gy,t?,a?,s?}; bg:1 marks a backdrop drawn before everything else (Mount Rainier).
// signs: {t,gx,gy}; plates: {pts:[[gx,gy],...],fill} sit on the ground under hills and parks.
const DECOR={
 la:{
  plates:[
   {pts:[[-2.5,9],[-2.3,11],[-1.7,15.5],[-0.9,19],[-0.4,21.2],[0.6,23.4],[2.2,25.8],[3.1,27.6],[3.65,27.5],[2.75,25.7],[1.15,23.3],[0.15,21.1],[-0.35,18.95],[-1.15,15.45],[-1.75,10.95],[-1.95,9]],fill:"color-mix(in srgb, #dcc08a 52%, var(--land))"}
  ],
  landmarks:[
   {k:"hollywoodSign",gx:24.6,gy:-1.6},
   {k:"observatory",gx:28.9,gy:-0.6,t:"Griffith Observatory"},
   {k:"hollywoodBowl",gx:18.9,gy:-0.4},
   {k:"chineseTheatre",gx:20.2,gy:1.3},
   {k:"capitolRecords",gx:22.7,gy:1.5},
   {k:"dodgerStadium",gx:41.0,gy:4.3,t:"Dodger Stadium",a:"end"},
   {k:"unionStation",gx:45.2,gy:7.67},
   {k:"getty",gx:-0.6,gy:7.2,t:"The Getty"},
   {k:"academyMuseum",gx:17.3,gy:7.6},
   {k:"wiltern",gx:27.3,gy:8.5},
   {k:"royceHall",gx:3.0,gy:9.7},
   {k:"centuryCity",gx:7.4,gy:10.6},
   {k:"disneyHall",gx:36.3,gy:7.3},
   {k:"cityHall",gx:41.3,gy:7.15},
   {k:"angelsFlight",gx:38.5,gy:12.5},
   {k:"skylineDTLA",gx:38.75,gy:15.7},
   {k:"cryptoArena",gx:32.4,gy:16.4,t:"Crypto.com Arena",a:"end"},
   {k:"soundstages",gx:13.0,gy:19.2},
   {k:"santaMonicaPier",gx:-0.4,gy:21.4},
   {k:"coliseum",gx:33.4,gy:21.6,t:"Coliseum"},
   {k:"lax",gx:23.2,gy:29.0,t:"LAX",a:"end"}
  ],
  props:[
   {k:"palm",gx:-1.1,gy:13.0},{k:"palm",gx:-0.9,gy:14.0,s:.9},{k:"palm",gx:-0.7,gy:15.0,s:1.05},
   {k:"palms",gx:3.4,gy:24.75},{k:"palms",gx:13.5,gy:7.2},{k:"palms",gx:27.7,gy:4.45},{k:"palms",gx:23.4,gy:9.0,s:.9},
   {k:"pumpjack",gx:14.2,gy:23.8},{k:"pumpjack",gx:18.8,gy:24.0},{k:"pumpjack",gx:16.0,gy:24.8,s:.9},
   {k:"house",gx:28.4,gy:24.8},{k:"house",gx:30.2,gy:24.4},{k:"house",gx:26.6,gy:25.4},{k:"house",gx:50.2,gy:15.2},
   {k:"house",gx:52.8,gy:15.0},{k:"house",gx:36.2,gy:3.6},{k:"house",gx:8.8,gy:20.6},
   {k:"lifeguard",gx:-1.2,gy:16.4},{k:"lifeguard",gx:0.9,gy:23.2},{k:"lifeguard",gx:2.45,gy:25.6}
  ],
  signs:[
   {t:"HOLLYWOOD",gx:22.6,gy:4.4},{t:"SILVER LAKE",gx:34.8,gy:1.2},{t:"ECHO PARK",gx:38.6,gy:6.4},
   {t:"MIRACLE MILE",gx:20.6,gy:6.6},{t:"KOREATOWN",gx:24.8,gy:7.6},{t:"BEVERLY HILLS",gx:11.6,gy:8.6},
   {t:"WESTWOOD · UCLA",gx:3.4,gy:11.25},{t:"CENTURY CITY",gx:7.9,gy:12.3},{t:"SANTA MONICA",gx:1.8,gy:15.4},
   {t:"DOWNTOWN",gx:41.8,gy:18.2},{t:"ARTS DISTRICT",gx:44.4,gy:16.0},{t:"BOYLE HEIGHTS",gx:51.6,gy:17.4},
   {t:"CULVER CITY",gx:11.6,gy:20.6},{t:"VENICE",gx:5.0,gy:26.4},{t:"SOUTH LA",gx:29.4,gy:26.6}
  ]
 },
 sea:{
  plates:[],
  landmarks:[
   {k:"mountRainier",gx:28.6,gy:48.3,bg:1},
   {k:"gasWorks",gx:7.8,gy:1.3},
   {k:"seaplane",gx:7.8,gy:4.0},
   {k:"houseboats",gx:9.3,gy:3.6},
   {k:"houseboats",gx:4.0,gy:4.0},
   {k:"huskyStadium",gx:16.8,gy:8.0,t:"Husky Stadium"},
   {k:"climatePledge",gx:0.4,gy:9.2},
   {k:"spaceNeedle",gx:1.4,gy:10.4},
   {k:"mopop",gx:2.4,gy:10.6},
   {k:"volunteerTower",gx:14.8,gy:10.7},
   {k:"amazonSpheres",gx:8.6,gy:12.0},
   {k:"pikePlace",gx:4.95,gy:17.2},
   {k:"columbiaCenter",gx:9.6,gy:18.2},
   {k:"greatWheel",gx:4.4,gy:19.3},
   {k:"smithTower",gx:9.2,gy:20.6},
   {k:"chinatownGate",gx:11.4,gy:26.2},
   {k:"ferry",gx:4.1,gy:23.9},
   {k:"lumenField",gx:4.2,gy:28.4},
   {k:"portCrane",gx:1.9,gy:29.2},
   {k:"portCrane",gx:0.7,gy:30.4},
   {k:"tmobilePark",gx:5.6,gy:30.0}
  ],
  props:[
   {k:"evergreens",gx:0.6,gy:7.4},{k:"evergreen",gx:1.8,gy:7.6},{k:"evergreens",gx:-1.0,gy:5.0},{k:"evergreen",gx:2.2,gy:4.6},
   {k:"evergreens",gx:15.4,gy:10.2},{k:"evergreen",gx:16.8,gy:12.4},{k:"evergreens",gx:10.8,gy:31.4},{k:"evergreens",gx:17.9,gy:34.4},
   {k:"evergreens",gx:17.4,gy:4.6},{k:"evergreen",gx:15.2,gy:1.8},{k:"evergreens",gx:9.6,gy:37.0},{k:"evergreens",gx:13.2,gy:39.6}
  ],
  signs:[
   {t:"NORTH SEATTLE",gx:3.4,gy:1.25},{t:"U DISTRICT",gx:15.8,gy:6.6},{t:"QUEEN ANNE",gx:-1.6,gy:8.0},
   {t:"SOUTH LAKE UNION",gx:10.0,gy:8.6},{t:"CAPITOL HILL",gx:10.8,gy:11.2},{t:"FIRST HILL",gx:12.55,gy:18.0},
   {t:"PIONEER SQUARE",gx:11.6,gy:20.2},{t:"CHINATOWN · ID",gx:14.6,gy:27.2},{t:"BEACON HILL",gx:13.8,gy:29.6},
   {t:"SODO",gx:8.0,gy:31.6},{t:"RAINIER VALLEY",gx:10.0,gy:35.6}
  ]
 }
};

// Animation classes. Every animation sits behind prefers-reduced-motion: no-preference; SMIL (ferry, plane) is
// skipped at render time when decorMotionOK() is false or the caller passes anim:false.
const DECOR_CSS=`@media (prefers-reduced-motion: no-preference){
.dc-spin{animation:dc-spin 60s linear infinite;transform-box:fill-box;transform-origin:50% 50%}
.dc-nod{animation:dc-nod 6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 50%}
.dc-flame{animation:dc-flame 1.7s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
.dc-blink{animation:dc-blink 3s linear infinite}
@keyframes dc-spin{to{transform:rotate(360deg)}}
@keyframes dc-nod{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
@keyframes dc-flame{0%,100%{transform:scale(1,1);opacity:1}30%{transform:scale(.92,1.1);opacity:.9}55%{transform:scale(1.05,.9);opacity:1}80%{transform:scale(.96,1.06);opacity:.88}}
@keyframes dc-blink{0%,9%{opacity:1}10%,19%{opacity:.15}20%,29%{opacity:1}30%,100%{opacity:.15}}
}`;

// Convenience: draws one layer of a city's DECOR with a G(gx,gy)->{x,y} function.
// layer "plates" (inside the terrain group, before hills), "models" (landmarks + props, back to front),
// "signs" (after models). Draw all three before the line ribbons and stations so the art stays underneath.
function decorSVG(city,G,layer,opt){
 const D=DECOR[city];if(!D)return "";opt=opt||{};
 if(layer==="plates")return D.plates.map(pl=>`<polygon points="${pl.pts.map(([gx,gy])=>{const q=G(gx,gy);return q.x.toFixed(1)+","+q.y.toFixed(1)}).join(" ")}" style="fill:${pl.fill}"/>`).join("");
 if(layer==="signs")return D.signs.map(s=>{const q=G(s.gx,s.gy);return regionSign(q.x,q.y,s.t,city==="sea"?"sea":"la")}).join("");
 const all=[...D.landmarks,...D.props].filter(e=>MODELS[e.k]);
 all.sort((a,b)=>((b.bg?1:0)-(a.bg?1:0))||(a.gy-b.gy));
 const out=all.map(e=>{const q=G(e.gx,e.gy);return MODELS[e.k](q.x,q.y,{t:e.t,a:e.a,s:e.s,anim:opt.anim})}).join("");
 return decorDefs()+out;
}

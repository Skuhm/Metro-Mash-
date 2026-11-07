// ================= Los Angeles, stood upright =================
// LA's rail runs west to east, so the true-to-life board is wide. For a phone held upright the whole board is turned
// a quarter: downtown at the top, Santa Monica at the bottom, Hollywood on the left. North points left; shapes stay true.
// Everything placed on the grid (stations, coast, rivers, hills, parks, line stubs, landmark art and signs) turns with it.
(function(){
 const C=CITIES.la,R=([gx,gy])=>[+(gy).toFixed(2),+(44-gx).toFixed(2)];
 const rp=o=>{const [x,y]=R([o.gx,o.gy]);o.gx=x;o.gy=y};
 for(const s of C.stations)rp(s);
 // station names read beside the lines once they run up and down
 const LAB={union:"l",civic:"l",ltokyo:"r",broadway:"r",bunker:"l",pershing:"r",metro:"l",pico:"b",westlake:"l",wvermont:"r",
  vbeverly:"a",vsm:"b",vsunset:"a",hwestern:"l",hvine:"l",hhighland:"l",
  wnormandie:"l",wwestern:"l",wlabrea:"l",wfairfax:"l",wlacienega:"l",
  lattc:"r",jeffusc:"r",expopark:"r",expovermont:"r",expowestern:"r",expocrenshaw:"r",farmdale:"r",expolabrea:"r",lacienega:"r",
  culver:"r",palms:"r",westwood:"r",sepulveda:"r",bundy:"r",bergamot:"r",smc:"r",dtsm:"r"};
 for(const s of C.stations)if(LAB[s.id])s.lab=LAB[s.id];
 const M=C.map;M.sweep=false;M.pad={t:70,b:70,l:150,r:190};
 for(const w of M.water)w.pts=w.pts.map(R);
 M.waterLabels=[{t:"PACIFIC OCEAN",gx:9,gy:47.5,r:-4},{t:"SANTA MONICA BAY",gx:24.5,gy:46.2,r:-14}];
 for(const r of M.rivers){r.pts=r.pts.map(R);r.lab=R(r.lab)}
 M.rivers[0].r=-6;M.rivers[0].lab=[22,-2.6];      // LA River, now across the top
 M.rivers[1].r=58;                                  // Ballona Creek
 for(const l of M.lakes){rp(l);[l.rx,l.ry]=[l.ry,l.rx]}
 for(const h of M.hills){rp(h);[h.rx,h.ry]=[h.ry,h.rx]}
 for(const p of M.parks)rp(p);
 for(const s of M.stubs){s.path=s.path.map(R);[s.lx,s.ly]=R([s.lx,s.ly])}
 const STUB={hhighland:{a:"middle",r:-82},a_pas:{a:"start",r:0},rail:{a:"middle",r:-84},e:{a:"middle",r:-84},a_lb:{a:"start",r:0},k:{a:"start",r:0}};
 for(const s of M.stubs){const k=s.from==="hhighland"?"hhighland":s.k==="rail"?"rail":s.k==="e"?"e":s.k==="k"?"k":/PASADENA/.test(s.t)?"a_pas":"a_lb";Object.assign(s,STUB[k])}
 // the downtown-to-USC run is tight once it stands up: spread it so names fit beside the line
 const POS={lattc:[17.3,10.3],jeffusc:[18.9,11.5],expopark:[19.9,12.7]};
 for(const s of C.stations)if(POS[s.id])[s.gx,s.gy]=POS[s.id];
 Object.assign(LAB,{});
 M.pad={t:150,b:110,l:160,r:190};
 M.waterLabels=[{t:"PACIFIC OCEAN",gx:6.5,gy:46.6,r:-4},{t:"SANTA MONICA BAY",gx:24.5,gy:45.4,r:-14}];
 // lakes and small parks that sat under names
 M.lakes[1].gx=4.0;M.lakes[1].gy=8.0;M.parks[5].gx=4.4;M.parks[5].gy=8.6;
 M.parks[1].gx=23.8;M.parks[1].gy=11.0;            // Exposition Park
 M.parks[2].gx=12.2;M.parks[2].gy=26.0;            // Tar Pits, beside Wilshire/Fairfax
 const mtn=M.hills.find(h=>/SANTA MONICA/.test(h.n));if(mtn){mtn.gx=3.4;mtn.gy=35.5}
 const bh=M.hills.find(h=>/BALDWIN/.test(h.n));if(bh)bh.gx=24.4;
 M.rivers[0].lab=[18.6,-3.9];
 // line stubs and their names
 for(const st of M.stubs){
  if(/PASADENA/.test(st.t))Object.assign(st,{lx:-5.2,ly:-2.4,a:"start",r:0});
  if(st.k==="rail")Object.assign(st,{lx:7.0,ly:-5.2,a:"end",r:0});
  if(st.k==="e")Object.assign(st,{lx:13.8,ly:-4.8,a:"start",r:0});
  if(/LONG BEACH/.test(st.t))Object.assign(st,{lx:25.0,ly:6.2,a:"end",r:0});
  if(st.from==="hhighland")Object.assign(st,{lx:-3.4,ly:31.2,a:"start",r:-90})}
 // the landmark art and neighbourhood signs
 if(typeof DECOR!=="undefined"&&DECOR.la){const D=DECOR.la;
  for(const k of ["landmarks","props","signs"])for(const e of D[k]||[])rp(e);
  for(const pl of D.plates||[])pl.pts=pl.pts.map(R);
  const mv=(list,key,val,xy,nth)=>{let n=0;for(const e of D[list])if(e[key]===val&&n++===(nth||0)){e.gx=xy[0];e.gy=xy[1];return}};
  mv("landmarks","k","hollywoodSign",[-2.8,19.2]);mv("landmarks","k","capitolRecords",[3.8,21.2]);mv("landmarks","k","chineseTheatre",[3.2,25.8]);
  mv("landmarks","k","hollywoodBowl",[-0.6,27.4]);mv("landmarks","k","wiltern",[11.3,18.0]);mv("landmarks","k","academyMuseum",[14.4,27.2]);
  mv("landmarks","k","unionStation",[10.3,-2.0]);mv("landmarks","k","disneyHall",[6.0,8.9]);mv("landmarks","k","skylineDTLA",[21.2,4.6]);
  mv("landmarks","k","cryptoArena",[22.0,8.8]);mv("landmarks","k","coliseum",[23.8,10.8]);mv("landmarks","k","soundstages",[15.0,30.6]);
  mv("props","k","house",[2.4,6.6],5);mv("props","k","house",[21.6,-2.4],3);mv("props","k","house",[23.0,-1.0],4);
  mv("signs","t","HOLLYWOOD",[5.4,19.2]);mv("signs","t","KOREATOWN",[13.6,16.4]);mv("signs","t","MIRACLE MILE",[13.4,24.2]);
  mv("signs","t","ECHO PARK",[3.2,6.4]);mv("signs","t","DOWNTOWN",[24.0,2.8]);mv("signs","t","ARTS DISTRICT",[20.6,-0.4]);
  mv("signs","t","BOYLE HEIGHTS",[22.4,-4.1]);mv("signs","t","CULVER CITY",[26.4,31.4]);
  for(const e of D.props)if(e.k==="pumpjack")e.gx+=1.2}
})();

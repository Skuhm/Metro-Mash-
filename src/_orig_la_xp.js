let xp=null;const XP_MS=9000,XPATH=["westlake","wvermont","vbeverly","vsm","vsunset"],XBID="metro";
const XSPLIT={lattc:0,jeffusc:0,expopark:1,expovermont:0,expowestern:0,expocrenshaw:1,farmdale:0,expolabrea:0,lacienega:1,culver:1,palms:0,westwood:0,sepulveda:1,bundy:0,bergamot:1,smc:0,dtsm:1,
 union:1,ltokyo:0,broadway:1,bunker:1,civic:0,pershing:1,metro:1,pico:0,westlake:1,wvermont:0,
 vbeverly:0,vsm:1,vsunset:0,hwestern:1,hvine:0,hhighland:1,wnormandie:1,wwestern:0,wlabrea:1,wfairfax:0,wlacienega:1};
function xst(own){const st=blankSt();STATIONS.forEach(s=>st[s.id].vis=true);if(own)for(const id in own)st[id].o=own[id];return st}
function xpSteps(){
 const A=esc(pn(0)),B=esc(pn(1)),T0=CARD.T0,MR=LOCKS.hhighland;
 return [
  {t:"Every station, downtown to the beach",b:"38 stops on the A, B, D and E Lines, from Union Station out to Hollywood, Wilshire and Santa Monica. Two players, one phone, one day. Most points at the stop wins.",
   scene:()=>({st:blankSt(),sweep:1})},
  {t:"You take turns, every hop",b:"One of you is up and plays. The other films. Up picks the next stop, and the roles swap at every hop.",w:"turn",
   scene:w=>{const k=w.k||0,own={};for(let j=1;j<=k;j++)own[XPATH[j]]=(j-1)%2;return {st:xst(own),cur:XPATH[k],next:XPATH[k+1],up:k%2,pops:k?[XPATH[k]]:[],focus:[XPATH[k],XPATH[k+1]],z:2.6}}},
  {t:"A card every time the doors close",b:"Up draws a card: a Take, a Stunt or a Gambit. Train cards finish before the doors open. Platform cards happen at the next stop. Walk or bike a hop and you only draw platform cards.",
   scene:()=>({st:xst(),cur:"vsunset",next:"hwestern",up:0,focus:["vsunset","hwestern"],z:2.6}),
   over:()=>cardFace("Take",T0.n,`<p class="small">${esc(T0.d)}</p>`)},
  {t:"Call your stakes on camera",b:"Before you start, say Safe or All-in. Tap them to see the difference.",w:"stakes",
   scene:()=>({st:xst(),cur:"vsunset",next:"hwestern",up:0,focus:["vsunset","hwestern"],z:2.6})},
  {t:"Pass it, and you can buy the stop",b:"Pass the card and you get first option on the station at its price: 1, 2 or 4 chips.",
   scene:()=>({st:xst({broadway:0}),cur:"broadway",up:0,pops:["broadway"],floats:[{id:"broadway",t:"−2",c:"var(--p1)"}],focus:["ltokyo","broadway","bunker"],z:2.4})},
  {t:"Fail it, and it goes to bidding",b:"Fail or veto the card, or arrive at a 4-point hub, and nobody can buy it outright. Either of you can bid in steps of 1, 5 or 10, or leave it unowned. Union Station is a hub, so the day opens with a bid. Try it.",w:"bid",
   scene:w=>({st:xst(w.sold!=null?{broadway:0,metro:w.sold}:{broadway:0}),cur:"metro",up:1,pops:w.sold!=null?["metro"]:[],focus:["metro","pershing","westlake"],z:2.4})},
  {t:"Take their stations",b:"Pass a card at a stop they own and it's yours, free. No pass? You can still buy it out for double its value, never more than 10.",w:"buyout",
   scene:()=>({st:xst({westlake:1,wvermont:0,wnormandie:1,broadway:0}),cur:"wvermont",up:0,pops:["wvermont"],focus:["westlake","wvermont","wnormandie"],z:2.4})},
  {t:"Thirteen sealed stations",b:"Gold stations hold a challenge you only see on the platform. Win it for the station and a payout. Fail it and it stays sealed, and the other player's try there pays double.",
   scene:()=>({st:xst(),hl:LOCK_IDS}),over:()=>cardFace("Locked",MR.n,`<p class="small">${esc(MR.d)} ${esc(MR.c)}</p>`)},
  {t:"Hijack a hop",b:"Before the doors close, whoever would be filming can pay 5 chips to stay up. That's how you reach a sealed station that would land on the other player's turn.",
   scene:()=>({st:xst({vsunset:0,hwestern:1}),cur:"hwestern",next:"hvine",up:1,hl:["hvine"],focus:["hwestern","hvine"],z:2.6})},
  {t:"Curses, from behind the camera",b:"Each time the other player gains a station, you draw a curse. Play it while you're the one filming. Tap one to read it.",w:"curses",
   scene:()=>({st:xst({broadway:0,metro:1,westlake:1,wvermont:0,vsunset:0,hwestern:1})})},
  {t:"A layover every three hours",b:"Wherever you are, a rider from the last train picks where you eat. 25 minutes, no chips, no cards, and card timers pause.",
   scene:()=>({st:xst({culver:1,palms:0,westwood:1}),cur:"palms",up:0,focus:["culver","palms","westwood"],z:2.4})},
  {t:"Most points at the stop wins",b:"Every station scores its price. Own more of an area than the other player and you take its bonus. Chips you earned add a point per 20, and bonus stars land at the count. Tap one.",w:"lines",
   scene:w=>({st:xst(XSPLIT),hl:MAJ[w.line??0].ids})},
 ];
}

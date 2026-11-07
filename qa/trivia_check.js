// every city question renders with four distinct options and the right answer among them; board questions too
const {chromium,phone}=require('./h.js');
(async()=>{const b=await chromium.launch();const P=await phone(b,{mode:"home",city:"la"},{clock:false});
 console.log(await P.pg.evaluate(()=>{const out=[];for(const c of ["la","sea"]){loadCity(c);const bank=TRIVIA[c]||[];let bad=0;
  for(let i=0;i<bank.length;i++){const Q=tQuestion("c"+i,"s"+i);if(Q.opts.length!==4||new Set(Q.opts).size!==4||Q.opts[Q.ans]!==bank[i].a)bad++}
  // board questions: generate many and check them
  let bq=0,bb=0;const R=tRng("x"+c);for(let k=0;k<300;k++){const id=tBoardQId(R);if(!id){bb++;continue}const q=tBoardQ(id),Q=tQuestion(id,"y");bq++;if(!q||Q.opts.length!==4||new Set(Q.opts).size!==4||Q.opts[Q.ans]!==q.a)bb++}
  // picking five for a duel
  const picks=[];for(let k=0;k<20;k++)picks.push(tPickQuestions("p"+k));const sizes=[...new Set(picks.map(p=>p.length))];const dup=picks.some(p=>new Set(p).size!==p.length);
  out.push(c+": city "+bank.length+" (bad "+bad+"), board "+bq+" (bad "+bb+"), duel sizes "+sizes+" dup "+dup+" sample: "+picks[0].map(id=>tQuestion(id,"z").q.slice(0,50)).join(" | "))}return out.join("\n")}));
 if(P.errs.length)console.log(P.errs);await b.close()})();

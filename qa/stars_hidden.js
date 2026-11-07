// bonus stars (Showman, Highwayman, Lockpick, Explorer) must not show or count on the live count; only at the final count
const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();let n=0,bad=0;const ok=(c,m)=>{n++;if(!c)bad++;console.log((c?"PASS ":"FAIL ")+m)};
 const H=await phone(b,{mode:"teams",city:"la",intent:"local"},{clock:false});const pg=H.pg;const ev=f=>pg.evaluate(f);
 await pg.fill('#tn0','Me');await pg.fill('#tn1','Alex');
 await act(pg,'[data-act=t-create]');await pg.waitForTimeout(400);await ev(()=>{if(typeof xp!=='undefined'&&xp)xpClose()});
 // give both teams a visit each so Explorer would be "shared" under the old code, and Me a card completed
 await ev(()=>{for(const t of teamList()){const T=TM.teams[t.id];T.vis[T.cur]=true}TM.teams[TM.my].stats.cards=1;tRender()});
 const live=await ev(()=>tScore());
 ok(Object.values(live.R).every(r=>r.stars===0&&r.names.length===0),"live count carries no bonus stars");
 ok(!(await ev(()=>tLocked())),"game is still live");
 await ev(()=>{TM.tab="more";tRender()});await pg.waitForTimeout(300);await ev(()=>{const o=document.querySelector('#ov');if(o&&!o.hidden)o.click()});await pg.waitForTimeout(300);
 const html=await pg.$eval('#main',e=>e.innerText);
 ok(/Live count/.test(html)&&/Monies \d+ · Stars \d+ · Curses \d+/.test(html)&&!/Bonus|Explorer|Showman|Highwayman|Lockpick/.test(html),"More tab shows no bonus-star line while live");
 await pg.screenshot({path:'qa/stars_live.png'});
 // hard stop: lock the game
 await ev(()=>{TM.meta.done=true;tRender()});await pg.waitForTimeout(300);
 const fin=await ev(()=>tScore());const me_=await ev(()=>TM.my);
 ok(fin.R[me_].names.some(x=>x.startsWith("Showman"))&&fin.R[me_].stars>=3,"final count awards Showman to the team with the card: "+JSON.stringify(fin.R[me_].names));
 ok(Object.values(fin.R).every(r=>r.names.some(x=>/Explorer \(shared\)/.test(x))),"final count shares Explorer");
 const html2=await pg.$eval('#main',e=>e.innerText);
 ok(/Final count/.test(html2)&&/Bonus: Showman/.test(html2),"More tab shows bonus stars at the final count");
 await pg.screenshot({path:'qa/stars_final.png'});
 console.log(n+" checks, "+bad+" failed; errors:",H.errs.slice(0,3));await b.close()})();

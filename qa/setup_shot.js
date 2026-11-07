// Team setup on a phone: pick colours, switch where you start, then start the game and check colours carry over.
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','site');
const srv=http.createServer((q,r)=>{let f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);if(!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':f.endsWith('.json')||f.endsWith('webmanifest')?'application/json':f.endsWith('.js')?'text/javascript':'image/png'});fs.createReadStream(f).pipe(r)}).listen(18891);
(async()=>{const b=await chromium.launch();const errs=[];
 for(const scheme of ['light','dark']){
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:scheme});const pg=await ctx.newPage();pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('http://127.0.0.1:18891/');await pg.evaluate(()=>localStorage.clear());await pg.reload();
 await pg.click('[data-act=h-host]');await pg.waitForSelector('[data-act=t-create]');
 await pg.click('[data-act=t-col][data-i="0"][data-k="red"]');
 await pg.click('[data-act=t-col][data-i="1"][data-k="gold"]');
 const takenDisabled=await pg.$eval('[data-act=t-col][data-i="2"][data-k="red"]',e=>e.disabled);
 await pg.click('[data-act=t-start][data-k=spread]');await pg.waitForTimeout(150);
 const st=await pg.$('.stakes');await st.scrollIntoViewIfNeeded();
 await pg.screenshot({path:`qa/setup_${scheme}.png`});
 await pg.evaluate(()=>window.scrollTo(0,0));await pg.screenshot({path:`qa/setup_${scheme}_top.png`});
 const names=await pg.$$eval('[data-tf=name]',a=>a.map(e=>e.value));
 const pressed=await pg.$eval('[data-act=t-start][data-k=spread]',e=>e.getAttribute('aria-pressed'));
 const bg=await pg.$eval('[data-act=t-start][data-k=spread]',e=>getComputedStyle(e).backgroundColor);
 console.log(scheme,'names',names.join(','),'taken disabled',takenDisabled,'spread pressed',pressed,'bg',bg);
 if(scheme==='light'){const p1=await pg.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--p1').trim());console.log('--p1 during setup',p1);}
 await ctx.close()}
 console.log('errors',errs);await b.close();srv.close()})();

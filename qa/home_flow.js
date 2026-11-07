const {chromium,act}=require('./h.js');
// served over http like the real thing, and seeded once by hand rather than by an init script that runs on every reload
const http=require('http'),fs=require('fs');
const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html'});r.end(fs.readFileSync('dist/turf.html'))}).listen(18890);
async function phone(b,app){const ctx=await b.newContext({viewport:{width:390,height:780},hasTouch:true});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('http://127.0.0.1:18890/turf.html');await pg.evaluate(a=>localStorage.setItem('turf.app',JSON.stringify(a)),app);await pg.reload({waitUntil:'load'});return {ctx,pg,errs}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(pg,fn,ms=5000){const t0=Date.now();for(;;){const v=await pg.evaluate(fn).catch(()=>null);if(v)return v;if(Date.now()-t0>ms)return null;await sleep(120)}}
const nav=async(pg,sel)=>{const [,r]=await Promise.all([pg.waitForNavigation({waitUntil:'load',timeout:8000}).catch(()=>null),act(pg,sel)]);await pg.waitForFunction(()=>typeof MODE!=='undefined'&&document.readyState==='complete');await sleep(100);return r};
(async()=>{const b=await chromium.launch();const log=[];const ok=(c,m)=>log.push((c?"PASS ":"FAIL ")+m);
 const H=await phone(b,{mode:"home",city:"la"});
 ok(await nav(H.pg,'[data-act=h-host]')==="ok","home: start a game");
 ok(await until(H.pg,()=>MODE==="teams"&&!!document.querySelector('[data-act=t-create]')),"setup screen shows");
 await H.pg.reload({waitUntil:'load'});await sleep(150);
 ok(await until(H.pg,()=>MODE==="teams"&&!!document.querySelector('[data-act=t-create]')),"reload keeps the setup screen");
 await H.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});
 await H.pg.selectOption('#trelay','custom');await sleep(80);await H.pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
 await act(H.pg,'[data-act=t-create]');await sleep(400);await act(H.pg,'[data-act=t-pickteam][data-t=t1]');
 await H.pg.evaluate(()=>{if(xp)xpClose()});
 await H.pg.reload({waitUntil:'load'});await sleep(300);
 ok(await until(H.pg,()=>MODE==="teams"&&TM.my==="t1"&&document.body.classList.contains("playing")),"reload resumes the game on this phone");
 await H.pg.evaluate(()=>{TM.tab="more";tRender()});await nav(H.pg,'[data-act=t-home]');
 ok(await until(H.pg,()=>MODE==="home"&&!!document.querySelector('[data-act=h-resume]')),"home offers to resume");
 await H.pg.screenshot({path:'qa/s_home_resume.png'});
 await nav(H.pg,'[data-act=h-resume]');
 ok(await until(H.pg,()=>MODE==="teams"&&TM.my==="t1"),"resume goes back in");
 await H.pg.evaluate(()=>{TM.tab="more";tRender()});await act(H.pg,'[data-act=t-forget]');await sleep(100);
 const really=await nav(H.pg,'[data-act=t-reallyforget]');ok(really==="ok","forget asks to confirm");
 ok(await until(H.pg,()=>MODE==="home"&&!document.querySelector('[data-act=h-resume]')),"after removing, home has no resume");
 // classic from home and back
 ok(await nav(H.pg,'[data-act=h-classic]')==="ok","home: classic");
 ok(await until(H.pg,()=>MODE==="classic"),"classic opens");
 if(H.errs.length)log.push("ERRORS "+H.errs.slice(0,3).join(" | "));
 console.log(log.join("\n"));await b.close();srv.close()})();

// shared harness: open dist/turf.html in a phone-sized page with a given app state
const {chromium}=require('playwright');
const URL='file://'+process.cwd()+'/dist/turf.html';
async function phone(b,app,opts={}){let a;
 const ctx=await b.newContext(Object.assign({viewport:{width:390,height:780},deviceScaleFactor:2,hasTouch:true,colorScheme:'light'},opts.ctx||{}));
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/ERR_TUNNEL|fonts/.test(m.text()))errs.push('console: '+m.text())});
 if(opts.clock!==false)await pg.clock.install({time:new Date(opts.time||'2026-10-31T09:00:00')});
 await pg.goto(URL);if(a=app)await pg.evaluate(a=>localStorage.setItem('turf.app',JSON.stringify(a)),a);
 await pg.goto('about:blank');await pg.goto(URL+(opts.hash||''));await pg.waitForTimeout(250);
 return {ctx,pg,errs};
}
const act=(pg,sel)=>pg.evaluate(sel=>{const e=document.querySelector(sel);if(!e)return "MISSING "+sel;if(e.disabled)return "DISABLED "+sel;e.dispatchEvent(new MouseEvent('click',{bubbles:true}));return "ok"},sel);
module.exports={chromium,phone,act,URL};

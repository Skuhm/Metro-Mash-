// whole-board render for review: city, scheme, width
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const [city,scheme,width,owned]=[process.argv[2]||"la",process.argv[3]||"light",+(process.argv[4]||1000),process.argv[5]==="owned"];
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width,height:800},colorScheme:scheme,deviceScaleFactor:1});const pg=await ctx.newPage();
 await pg.addInitScript(c=>localStorage.setItem('turf.app',JSON.stringify({mode:"home",city:c})),city);
 await pg.goto('file://'+process.cwd()+'/dist/turf.html');await pg.waitForTimeout(300);
 await pg.evaluate(o=>{const st=Object.fromEntries(STATIONS.map((s,i)=>[s.id,{o:o?i%3:null,vis:true,gild:false}]));document.body.innerHTML=`<div style="width:100%">${mapSVG({st,cur:null,up:0},{noLegend:true,still:true})}</div>`;document.body.style.margin=0},owned);
 await pg.waitForTimeout(300);const h=await pg.evaluate(()=>document.body.scrollHeight);await pg.setViewportSize({width,height:h});
 await pg.screenshot({path:`qa/full_${city}_${scheme}${owned?"_owned":""}.png`});await b.close()})();

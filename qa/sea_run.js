const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:360,height:780},deviceScaleFactor:2});const pg=await ctx.newPage();await pg.clock.install({time:new Date('2026-10-26T08:00:00')});
 const errs=[];pg.on('pageerror',e=>errs.push('pageerror: '+e.message));pg.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_|net::/.test(m.text()))errs.push('console: '+m.text())});
 await pg.addInitScript(()=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('turf.app',JSON.stringify({mode:'classic',city:'sea'}));sessionStorage.setItem('seeded','1')}});
 await pg.goto('file://'+process.cwd()+'/turf2/dist/turf.html');await pg.waitForTimeout(300);
 const click=async(sel,opt)=>{const tm=sel.match(/^\[data-act=tab\]\[data-t=(\w+)\]$/);if(tm){await pg.evaluate(t=>{tab=t;render()},tm[1]);await pg.waitForTimeout(40);return true}let el=await pg.$(sel);if(!el&&!/data-t=/.test(sel)){for(const t of ['map','cards','curses','more']){const tb=await pg.$(`[data-act=tab][data-t=${t}]`);if(tb){await tb.click();await pg.waitForTimeout(60)}el=await pg.$(sel);if(el)break}}if(!el){if(!opt)errs.push('missing '+sel);return false}if(await el.isDisabled()){if(!opt)errs.push('disabled '+sel);return false}try{await el.click({timeout:3000})}catch(e){const el2=await pg.$(sel);if(!el2){errs.push('vanished '+sel);return false}await el2.click({timeout:3000})}await pg.waitForTimeout(80);return true};
 const ov=async()=>{for(let i=0;i<3;i++){const o=await pg.$('#show:not([hidden]) [data-act=xpclose]');if(o){await o.click();await pg.waitForTimeout(60);continue}const r=await pg.$('#ov[data-act=closereveal]:not([hidden])');if(r){await r.click();await pg.waitForTimeout(60)}}};
 const ev=f=>pg.evaluate(f);
 const go=async(id)=>{await pg.evaluate(()=>{tab='map';render()});await pg.waitForTimeout(40);const pk=await pg.$(`[data-act=pick][data-id=${id}]`);if(pk){await pk.click();await pg.waitForTimeout(80)}return click(`[data-act=hop][data-id=${id}]`)};
 await pg.screenshot({path:'turf2/qa/sea_v7_0_setup.png'});
 await pg.fill('#n1','Rebecca');await pg.fill('#n2','Jonathan');await pg.fill('#hs','16:15');await pg.dispatchEvent('#hs','input');
 await click('[data-act=start]');await ov();
 await pg.screenshot({path:'turf2/qa/sea_v7_1_start.png',fullPage:true});
 // first station
 await go('pinehurst');await ov();
 let st=await ev(()=>({cur:S.cur,arrived:S.hop.arrived,first:S.hop.first,up:S.up}));
 if(st.cur!=='pinehurst'||!st.arrived||st.first!==st.up)errs.push('first station flow wrong '+JSON.stringify(st));
 await click('[data-act=buy]');
 if((await ev(()=>S.st.pinehurst.o))==null)errs.push('buy failed');
 const up0=await ev(()=>S.up);
 // hop to northgate (sealed) -> up should alternate
 await go('northgate');await ov();
 const up1=await ev(()=>S.up);if(up1===up0)errs.push('Up did not alternate');
 if(!(await ev(()=>S.hop.lock)))errs.push('northgate not a lock hop');
 await pg.screenshot({path:'turf2/qa/sea_v7_2_riding.png',fullPage:true});
 if(!(await ev(()=>!!S.open[S.up])))errs.push('no card on sealed hop');
 await click('[data-act=tab][data-t=cards]');await click('[data-act=veto]');await ov();await click('[data-act=tab][data-t=map]');
 await click('[data-act=arrive]');await ov();
 await click('[data-act=lockopen]');await ov();
 await click('[data-act=tab][data-t=cards]');await click('[data-act=begin]');
 for(let i=0;i<6;i++)await click('[data-act=vote][data-v="0"]');for(let i=0;i<4;i++)await click('[data-act=vote][data-v="1"]');await ov();
 if((await ev(()=>S.st.northgate.o))!==up1)errs.push('exit poll not won by up');
 if(!(await ev(()=>S.hop.settled)))errs.push('lock win did not settle hop');
 // camera should have drawn a curse
 if((await ev(()=>S.hand[1-S.up].length))<1)errs.push('curse not drawn');
 // hop to roosevelt: card should auto-draw for the other player
 await click('[data-act=tab][data-t=map]');await go('roosevelt');await ov();
 const h=await ev(()=>({card:S.hop.card,open:!!S.open[S.up],up:S.up}));
 if(!h.open||h.card==='none')errs.push('no card drawn on normal hop '+JSON.stringify(h));
 if(h.up!==up0)errs.push('alternation broke on hop 3');
 // veto -> other player first option
 await click('[data-act=tab][data-t=cards]');await click('[data-act=veto]');await ov();
 if((await ev(()=>S.hop.first))!==1-h.up)errs.push('veto did not flip first option');
 await click('[data-act=tab][data-t=map]');await click('[data-act=arrive]');await ov();
 await pg.screenshot({path:'turf2/qa/sea_v7_3_settle.png',fullPage:true});
 if(await pg.$('[data-act=buy]'))errs.push('buy offered after a veto');
 if(await ev(()=>!!S.auc))errs.push('auction opened without being asked');
 await click('[data-act=aucopen]');
 await click(`[data-act=bid][data-p="0"]`);await click(`[data-act=bid][data-p="1"]`);await click('[data-act=aucwin]');await ov();
 if((await ev(()=>S.st.roosevelt.o))!==1)errs.push('auction winner wrong');
 
 // hijack: current up pays 5 to stay up
 const curUp=await ev(()=>S.up);
 await click('[data-act=hijack]');
 await go('udistrict');await ov();
 if((await ev(()=>S.up))!==curUp)errs.push('hijack did not keep Up');
 // force a Take card and pass it
 await ev(()=>{const p=S.up;S.open[p]={id:"T1",p,lock:false,drawnAt:Date.now(),drawStops:S.stops,stakes:null,started:false,tally:0,strikes:0,list:[]};S.hop.card="T1";render()});
 await click('[data-act=tab][data-t=cards]');await click('[data-act=stake][data-k=allin]');await click('[data-act=begin]');
 for(let i=0;i<3;i++)await click('[data-act=tally]');await click('[data-act=call][data-v=win]');await click('[data-act=accept]');await ov();
 if((await ev(()=>S.hop.first))!==curUp)errs.push('pass did not give first option');
 const bankBefore=await ev(()=>S.bank[S.up]);
 await click('[data-act=tab][data-t=map]');await click('[data-act=arrive]');await ov();await click('[data-act=buy]');
 if((await ev(()=>S.st.udistrict.o))!==curUp)errs.push('first option buy failed');
 // ride on to uw (sealed, keep up), open and strike out
 await go('uw');await ov();if(await ev(()=>!!S.open[S.up])){await click('[data-act=tab][data-t=cards]');await click('[data-act=veto]');await ov();await click('[data-act=tab][data-t=map]')}await click('[data-act=arrive]');await ov();await click('[data-act=lockopen]');await ov();
 await click('[data-act=tab][data-t=cards]');await click('[data-act=begin]');
 await pg.clock.runFor(961000);await pg.waitForTimeout(150);await ov();if(!(await pg.$('[data-act=timefail]')))errs.push('no time-up ruling');await click('[data-act=timefail]');await ov();
 if((await ev(()=>S.st.uw.failedBy))==null)errs.push('lock fail not recorded');
 if(!(await ev(()=>S.hop.settled)))errs.push('lock fail did not settle hop');
 await click('[data-act=tab][data-t=map]');
 // the other player comes back: pays double
 await go('caphill');await ov();if(await ev(()=>!!S.open[S.up])){await click('[data-act=tab][data-t=cards]');await click('[data-act=veto]');await ov();await click('[data-act=tab][data-t=map]')}await click('[data-act=arrive]');await ov();if(await pg.$('[data-act=aucskip]'))await click('[data-act=aucskip]');if(await pg.$('[data-act=aucnone]'))await click('[data-act=aucnone]');if(await pg.$('[data-act=buy]'))await click('[data-act=buy]');
 await ev(()=>{S.bank[S.up]+=10;render()});await click('[data-act=hijack]');
 await go('uw');await ov();if(await ev(()=>!!S.open[S.up])){await click('[data-act=tab][data-t=cards]');await click('[data-act=veto]');await ov();await click('[data-act=tab][data-t=map]')}await click('[data-act=arrive]');await ov();await click('[data-act=lockopen]');await ov();
 const boost=await ev(()=>S.open[S.up]&&S.open[S.up].boost);if(boost!==2)errs.push('second attempt not doubled: '+boost);
 await click('[data-act=tab][data-t=cards]');await click('[data-act=begin]');await click('[data-act=tally]');await click('[data-act=call][data-v=win]');await click('[data-act=accept]');await ov();
 if((await ev(()=>S.st.uw.o))==null)errs.push('fountain dash not won');
 await click('[data-act=tab][data-t=map]');
 // takeover by passing a card at their station: give roosevelt... use udistrict owned by curUp (opponent of current up?)
 await ev(()=>{S.st.udistrict.o=S.up;S.hij=null;render()});
 await go('udistrict');await ov();
 await ev(()=>{const p=S.up;S.open[p]={id:"T2",p,lock:false,drawnAt:Date.now(),drawStops:S.stops,stakes:"safe",started:false,tally:0,strikes:0,list:[]};S.hop.card="T2";render()});
 await click('[data-act=arrive]');await ov();
 await click('[data-act=tab][data-t=cards]');if(!(await pg.$('[data-act=tko]')))errs.push('no buyout button at their station');
 await click('[data-act=tab][data-t=cards]');await click('[data-act=begin]');await click('[data-act=wstart]');await pg.clock.runFor(91000);await pg.waitForTimeout(100);await ov();
 if((await ev(()=>S.st.udistrict.o))!==(await ev(()=>S.up)))errs.push('pass at their station did not take it');
 await click('[data-act=tab][data-t=map]');
 // buyout price cap
 const tk=await ev(()=>tkoPrice('northgate'));if(tk!==8)errs.push('buyout price wrong '+tk);
 await pg.screenshot({path:'turf2/qa/sea_v7_4_map.png',fullPage:true});
 // layover after three hours
 await pg.clock.runFor(3*3600000+60000);await pg.waitForTimeout(100);await click('[data-act=tab][data-t=map]');if(!(await pg.$('[data-act=szstart]')))errs.push('layover not offered after 3h');else{await click('[data-act=szstart]');await click('[data-act=szend]')}
 // count + show
 await click('[data-act=tab][data-t=more]');await pg.screenshot({path:'turf2/qa/sea_v7_6_count.png'});
 await click('[data-act=tab][data-t=more]');await click('[data-act=showopen][data-m=live]');await pg.screenshot({path:'turf2/qa/sea_v7_7_show.png'});
 await click('#show [data-act=showopen][data-m=explain]');await pg.clock.runFor(3500);await pg.waitForTimeout(200);await pg.screenshot({path:'turf2/qa/sea_v7_8_explain.png'});
 if((await ev(()=>xp&&xp.i))!==0)errs.push('explainer advanced by itself');await click('#show [data-act=xpclose]');
 await pg.emulateMedia({colorScheme:'dark'});await click('[data-act=tab][data-t=map]');await pg.screenshot({path:'turf2/qa/sea_v7_9_dark.png',fullPage:true});
 for(const t of ['map','cards','curses','more']){await click(`[data-act=tab][data-t=${t}]`);const over=await ev(()=>document.documentElement.scrollWidth>window.innerWidth||document.querySelector('main').scrollWidth>window.innerWidth);if(over)errs.push('overflow on '+t)}
 await ctx.close();await b.close();console.log(errs.length?errs.join('\n'):'NO ERRORS');
})();

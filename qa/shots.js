const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();
 const Hm=await phone(b,{mode:"home",city:"la"},{clock:false});await Hm.pg.waitForTimeout(300);await Hm.pg.screenshot({path:'qa/s_home.png',fullPage:true});
 const Hd=await phone(b,{mode:"home",city:"sea"},{clock:false,ctx:{colorScheme:'dark'}});await Hd.pg.waitForTimeout(300);await Hd.pg.screenshot({path:'qa/s_home_dark.png'});
 const H=await phone(b,{mode:"teams",city:"la",intent:"host"},{clock:false,ctx:{colorScheme:'dark'}});
 for(let i=0;i<4;i++)await act(H.pg,'[data-act=t-n][data-d="1"]');
 await H.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});
 await H.pg.selectOption('#trelay','custom');await H.pg.waitForTimeout(80);await H.pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
 await act(H.pg,'[data-act=t-start][data-k=spread]');
 await H.pg.screenshot({path:'qa/s_setup6.png'});
 await act(H.pg,'[data-act=t-create]');await H.pg.waitForTimeout(400);
 await act(H.pg,'[data-act=t-pickteam][data-t=t1]');await H.pg.evaluate(()=>{if(xp)xpClose()});
 // give the other teams some stations so the map has colour
 await H.pg.evaluate(()=>{const ids=["t2","t3","t4","t5","t6"],pick=["pershing","metro","westlake","wvermont","expocrenshaw","hvine","dtsm","culver","ltokyo","civic"];pick.forEach((s,i)=>{const U=TM.teams[ids[i%5]];U.claims.push({id:U.id+".c"+i,s,how:"buy",t:now()-i*1000,n:2});U.rev++});tInvalidate();tRender()});
 await H.pg.waitForTimeout(500);await H.pg.screenshot({path:'qa/s_map_dark.png'});
 // a card on the platform
 await H.pg.evaluate(()=>{const T=me();tAct(()=>tStartHop(ADJ[T.cur][0]))});await H.pg.evaluate(()=>{TM.tab="cards";tRender()});await H.pg.waitForTimeout(200);
 await H.pg.screenshot({path:'qa/s_card_dark.png',fullPage:true});
 await H.pg.evaluate(()=>{const o=me().open;if(o){o.stakes="safe";o.started=true;tAct(()=>tFinish("win","shot"))}tAct(()=>tArrive());TM.reveal=null;tRenderOv()});
 await H.pg.waitForTimeout(200);await H.pg.screenshot({path:'qa/s_station_dark.png',fullPage:true});
 await H.pg.evaluate(()=>{const T=me();T.hand=[2,4,0];T.bank=12;TM.tab="curses";TM.cpick={i:0,target:"t3"};tRender()});await H.pg.waitForTimeout(150);
 await H.pg.screenshot({path:'qa/s_curses_dark.png',fullPage:true});
 for(const P of [Hm,Hd,H])if(P.errs.length)console.log("ERR",P.errs.slice(0,3));
 await b.close()})();

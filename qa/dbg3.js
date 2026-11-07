const {chromium,phone,act}=require('./h.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch();
 for(let run=0;run<6;run++){
 const H=await phone(b,{mode:"home",city:"la"},{clock:false});const navs=[];H.pg.on('framenavigated',f=>{if(f===H.pg.mainFrame())navs.push(Date.now()%100000+" "+f.url().split('/').pop())});
 await Promise.all([H.pg.waitForNavigation({waitUntil:'load'}).catch(()=>null),act(H.pg,'[data-act=h-host]')]);
 await sleep(300);
 await H.pg.reload({waitUntil:'load'});
 const st=[];for(let i=0;i<10;i++){st.push(await H.pg.evaluate(()=>(typeof MODE!=="undefined"?MODE:"?")+":"+!!document.querySelector('#trelay')).catch(e=>"err "+e.message.slice(0,40)));await sleep(150)}
 console.log("run",run,st.join(" "),"| navs:",navs.join(", "),H.errs.slice(0,2));
 await H.ctx.close()}
 await b.close()})();

const {chromium,phone,act}=require('./h.js');
(async()=>{const b=await chromium.launch();const out=[];
 for(const city of ["la","sea"]){
  for(const vp of [{width:390,height:844},{width:1440,height:900}]){
   const H=await phone(b,{mode:"teams",city,intent:"host"},{clock:false,ctx:{viewport:vp,deviceScaleFactor:vp.width<500?3:2}});
   await H.pg.evaluate(()=>{const d=document.querySelector('details');if(d)d.open=true});
   await H.pg.selectOption('#trelay','custom');await H.pg.waitForTimeout(80);await H.pg.fill('#tcustom','ws://127.0.0.1:18883/mqtt');
   await act(H.pg,'[data-act=t-create]');await H.pg.waitForTimeout(300);await act(H.pg,'[data-act=t-pickteam][data-t=t1]');
   await H.pg.evaluate(()=>{if(xp)xpClose()});await H.pg.waitForTimeout(400);
   const r=await H.pg.evaluate(()=>{const svg=document.querySelector('svg.base'),vb=svg.viewBox.baseVal,rc=svg.getBoundingClientRect();
    const lab=[...document.querySelectorAll('svg.over text')].find(t=>t.textContent.length>4);const lr=lab?lab.getBoundingClientRect():null;
    return {W:Math.round(vb.width),H:Math.round(vb.height),cssW:Math.round(rc.width),cssH:Math.round(rc.height),pxPerUnit:+(rc.width/vb.width).toFixed(2),zoom:+mapZoom.toFixed(2),label:lab?lab.textContent.slice(0,18):null,labelPx:lr?Math.round(lr.height):null,devicePx:Math.round(rc.width*devicePixelRatio)+"x"+Math.round(rc.height*devicePixelRatio)}});
   out.push(city+" "+vp.width+"px: "+JSON.stringify(r));
   await H.ctx.close()}
  // home thumbnail
  const P=await phone(b,{mode:"home",city},{clock:false});await P.pg.waitForTimeout(300);
  out.push(city+" home thumb: "+JSON.stringify(await P.pg.evaluate(()=>{const s=document.querySelector('.homethumb svg'),vb=s.viewBox.baseVal,rc=s.getBoundingClientRect();return {cssW:Math.round(rc.width),cssH:Math.round(rc.height),pxPerUnit:+(rc.width/vb.width).toFixed(2)}})));
  await P.ctx.close()}
 console.log(out.join("\n"));await b.close()})();

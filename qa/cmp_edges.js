const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();
 for(const [orig,city] of [['turf_app.html','sea'],['turf_la.html','la']]){
  const o=await b.newPage();await o.goto('file://'+process.cwd()+'/../'+orig);await o.waitForTimeout(300);
  const A=await o.evaluate(()=>({E:Object.fromEntries(Object.entries(EDGE).map(([k,v])=>[k,v.t+":"+v.m])),start:typeof START_ID!=="undefined"?START_ID:null,adj:Object.fromEntries(Object.entries(ADJ).map(([k,v])=>[k,v.slice().sort().join(",")]))}));
  const n=await b.newPage();await n.addInitScript(c=>localStorage.setItem('turf.app',JSON.stringify({mode:"home",city:c})),city);await n.goto('file://'+process.cwd()+'/dist/turf.html');await n.waitForTimeout(300);
  const B=await n.evaluate(()=>({E:Object.fromEntries(Object.entries(EDGE).map(([k,v])=>[k,v.t+":"+v.m])),start:START_ID,adj:Object.fromEntries(Object.entries(ADJ).map(([k,v])=>[k,v.slice().sort().join(",")]))}));
  const d=[];for(const k of new Set([...Object.keys(A.E),...Object.keys(B.E)]))if(A.E[k]!==B.E[k])d.push(k+": "+A.E[k]+" → "+B.E[k]);
  // mode names differ by design (line keys renamed), so compare times and neighbours separately
  const dt=d.filter(x=>{const m=x.match(/: (\d+):\S* → (\d+):/);return !m||m[1]!==m[2]});
  const da=Object.keys(A.adj).filter(k=>A.adj[k]!==B.adj[k]);
  console.log(city,"edges",Object.keys(A.E).length,"vs",Object.keys(B.E).length,"| time/existence diffs:",dt.length,dt.slice(0,4).join("; "),"| neighbour diffs:",da.length,"| start",A.start,"→",B.start,"| mode-name diffs:",d.length-dt.length);
  await o.close();await n.close()}
 await b.close()})();

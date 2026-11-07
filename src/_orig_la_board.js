// ================= board: every rail station from Union Station to the beach =================
// Schematic grid: gx runs east, gy runs south. Downtown is stretched so eight stations in a mile stay legible.
// lab: label side (l r a b; d and D are diagonal labels above-right and below-left). ml: the label split over two lines.
const STATIONS=[
 // downtown
 {id:"union",gx:43.6,gy:9.0,lab:"r",n:"Union Station",p:4,line:"x",lm:"Avila Adobe, Olvera Street"},
 {id:"civic",gx:39.6,gy:9.0,lab:"a",n:"Civic Center/Grand Park",p:1,line:"bd",lock:true,lm:"City Hall's Spring Street steps"},
 {id:"ltokyo",gx:43.6,gy:11.4,lab:"r",n:"Little Tokyo/Arts District",ml:["Little Tokyo/","Arts District"],p:2,line:"x",lock:true,lm:"Japanese American National Museum"},
 {id:"broadway",gx:41.2,gy:11.4,lab:"b",n:"Historic Broadway",p:2,line:"ae",lm:"Bradbury Building"},
 {id:"bunker",gx:37.4,gy:11.4,lab:"a",n:"Grand Av Arts/Bunker Hill",ml:["Grand Av Arts/","Bunker Hill"],p:2,line:"ae",lock:true,lm:"Walt Disney Concert Hall"},
 {id:"pershing",gx:39.6,gy:13.6,lab:"r",n:"Pershing Square",p:2,line:"bd",lock:true,lm:"The Last Bookstore"},
 {id:"metro",gx:35.6,gy:13.6,lab:"l",n:"7th St/Metro Center",ml:["7th St/","Metro Center"],p:4,line:"x",lm:"Wilshire Grand Center lobby"},
 {id:"pico",gx:35.0,gy:15.6,lab:"l",n:"Pico",p:2,line:"ae",lock:true,lm:"Grammy Museum entrance"},
 {id:"westlake",gx:33.0,gy:10.6,lab:"a",n:"Westlake/MacArthur Park",ml:["Westlake/","MacArthur Park"],p:2,line:"bd",lm:"Langer's Deli"},
 {id:"wvermont",gx:30.0,gy:10.0,lab:"D",n:"Wilshire/Vermont",p:4,line:"x",lm:"Lafayette Park"},
 // B Line north to Hollywood
 {id:"vbeverly",gx:30.0,gy:7.7,lab:"r",n:"Vermont/Beverly",p:1,line:"b",lm:"Los Angeles City College, Vermont gate"},
 {id:"vsm",gx:30.0,gy:5.4,lab:"r",n:"Vermont/Santa Monica",p:1,line:"b",lm:"Barnsdall Art Park"},
 {id:"vsunset",gx:30.0,gy:3.0,lab:"r",n:"Vermont/Sunset",p:2,line:"b",lm:"The Vista Theatre"},
 {id:"hwestern",gx:26.8,gy:2.0,lab:"a",n:"Hollywood/Western",p:1,line:"b",lm:"Thai Town's Apsonsi statues"},
 {id:"hvine",gx:24.0,gy:2.0,lab:"b",n:"Hollywood/Vine",p:2,line:"b",lock:true,lm:"Pantages Theatre"},
 {id:"hhighland",gx:21.6,gy:2.0,lab:"l",n:"Hollywood/Highland",p:4,line:"b",lock:true,lm:"TCL Chinese Theatre forecourt"},
 // D Line west along Wilshire
 {id:"wnormandie",gx:28.4,gy:10.0,lab:"D",n:"Wilshire/Normandie",p:1,line:"d",lm:"The old Ambassador Hotel site, now RFK Community Schools"},
 {id:"wwestern",gx:26.8,gy:10.0,lab:"D",n:"Wilshire/Western",p:2,line:"d",lock:true,lm:"The Wiltern"},
 {id:"wlabrea",gx:21.0,gy:10.0,lab:"D",n:"Wilshire/La Brea",p:2,line:"d",lm:"El Rey Theatre"},
 {id:"wfairfax",gx:18.6,gy:9.9,lab:"D",n:"Wilshire/Fairfax",p:2,line:"d",lock:true,lm:"La Brea Tar Pits, Lake Pit"},
 {id:"wlacienega",gx:16.2,gy:9.5,lab:"l",n:"Wilshire/La Cienega",p:2,line:"d",lm:"Saban Theatre"},
 // E Line west to Santa Monica
 {id:"lattc",gx:34.6,gy:17.2,lab:"r",n:"LATTC/Ortho Institute",ml:["LATTC/","Ortho Institute"],p:1,line:"e",lm:"Shrine Auditorium"},
 {id:"jeffusc",gx:33.8,gy:18.8,lab:"r",n:"Jefferson/USC",p:2,line:"e",lock:true,lm:"Tommy Trojan statue"},
 {id:"expopark",gx:32.0,gy:20.0,lab:"D",n:"Expo Park/USC",p:2,line:"e",lock:true,lm:"California Science Center"},
 {id:"expovermont",gx:30.0,gy:20.0,lab:"D",n:"Expo/Vermont",p:1,line:"e",lm:"Natural History Museum"},
 {id:"expowestern",gx:26.8,gy:20.0,lab:"d",n:"Expo/Western",p:1,line:"e",lm:"Exposition Park Rose Garden"},
 {id:"expocrenshaw",gx:24.0,gy:19.6,lab:"D",n:"Expo/Crenshaw",p:4,line:"e",lm:"Rancho Cienega Sports Complex"},
 {id:"farmdale",gx:22.5,gy:19.3,lab:"D",n:"Farmdale",p:1,line:"e",lm:"Dorsey High School"},
 {id:"expolabrea",gx:21.0,gy:19.0,lab:"D",n:"Expo/La Brea",p:1,line:"e",lm:"Jim Gilliam Recreation Center"},
 {id:"lacienega",gx:16.2,gy:18.4,lab:"D",n:"La Cienega/Jefferson",p:1,line:"e",lm:"Baldwin Hills Scenic Overlook stairs"},
 {id:"culver",gx:14.0,gy:17.9,lab:"d",n:"Culver City",p:2,line:"e",lock:true,lm:"The Culver Hotel"},
 {id:"palms",gx:12.1,gy:17.5,lab:"d",n:"Palms",p:1,line:"e",lm:"Palms Recreation Center"},
 {id:"westwood",gx:10.2,gy:17.2,lab:"d",n:"Westwood/Rancho Park",p:1,line:"e",lm:"Rancho Park Golf Course clubhouse"},
 {id:"sepulveda",gx:8.3,gy:17.6,lab:"d",n:"Expo/Sepulveda",p:1,line:"e",lm:"The old Westside Pavilion, now Google's offices"},
 {id:"bundy",gx:6.4,gy:18.1,lab:"d",n:"Expo/Bundy",p:1,line:"e",lm:"Stoner Recreation Center"},
 {id:"bergamot",gx:4.5,gy:18.6,lab:"d",n:"26th St/Bergamot",p:2,line:"e",lm:"Bergamot Station Arts Center"},
 {id:"smc",gx:2.6,gy:19.1,lab:"d",n:"17th St/SMC",p:1,line:"e",lm:"Memorial Park"},
 {id:"dtsm",gx:0.7,gy:19.6,lab:"l",n:"Downtown Santa Monica",ml:["Downtown","Santa Monica"],p:4,line:"e",lock:true,lm:"The dinosaur topiaries, Third Street Promenade"},
];
const ST=Object.fromEntries(STATIONS.map(s=>[s.id,s]));
const START_ID="union";
// line paths across the board, in running order
const L_A=["union","ltokyo","broadway","bunker","metro","pico"];
const L_B=["union","civic","pershing","metro","westlake","wvermont","vbeverly","vsm","vsunset","hwestern","hvine","hhighland"];
const L_D=["union","civic","pershing","metro","westlake","wvermont","wnormandie","wwestern","wlabrea","wfairfax","wlacienega"];
const L_E=["ltokyo","broadway","bunker","metro","pico","lattc","jeffusc","expopark","expovermont","expowestern","expocrenshaw","farmdale","expolabrea","lacienega","culver","palms","westwood","sepulveda","bundy","bergamot","smc","dtsm"];
const LINES=[L_A,L_B,L_D,L_E];
const LINE_PATHS={a:L_A,b:L_B,d:L_D,e:L_E};
const LINE_NAME={a:"A Line",b:"B Line",d:"D Line",e:"E Line",bd:"B or D Line",ae:"A or E Line",walk:"walk",bus:"one bus",bike:"bike or trail",funi:"Angels Flight and a short walk"};
const RAIL_MODES=["a","b","d","e","bd","ae"];
const DTOWN=new Set(["union","civic","ltokyo","broadway","bunker","pershing","metro","pico","westlake"]);
// edges: [a,b,mode,minutes]
const EDGES=[];
{const seg={};
 for(const [k,ids] of Object.entries(LINE_PATHS))for(let i=0;i<ids.length-1;i++){const a=ids[i],b=ids[i+1],key=a<b?a+"|"+b:b+"|"+a;(seg[key]=seg[key]||{a,b,l:[]}).l.push(k)}
 const SLOW={"wwestern|wlabrea":4,"lacienega|expolabrea":4};
 for(const [key,v] of Object.entries(seg)){const t=SLOW[key]||(DTOWN.has(v.a)&&DTOWN.has(v.b)?2:3);EDGES.push([v.a,v.b,v.l.sort().join(""),t])}}
EDGES.push(
 // short walks downtown
 ["civic","broadway","walk",4],["pershing","broadway","walk",7],
 // Angels Flight: the funicular from Hill Street up Bunker Hill
 ["pershing","bunker","funi",8],
 // one bus, no transfer: the north-south streets tie Hollywood, Wilshire and Expo together
 ["wvermont","expovermont","bus",16],["wwestern","expowestern","bus",17],["wwestern","hwestern","bus",12],
 ["wlabrea","expolabrea","bus",15],["wlabrea","hhighland","bus",14],["wfairfax","hhighland","bus",16],
 ["wlacienega","lacienega","bus",15],["expocrenshaw","hvine","bus",30],["wlacienega","dtsm","bus",35],
 // bike lanes and paths
 ["pico","expopark","bike",12],["hvine","vsunset","bike",10],["culver","westwood","bike",14],["bergamot","dtsm","bike",11]);
const ADJ={};STATIONS.forEach(s=>ADJ[s.id]=[]);
const EDGE={};
for(const [a,b,m,t] of EDGES){const k=a+">"+b;if(EDGE[k]){if(t<EDGE[k].t)EDGE[k]=EDGE[b+">"+a]={m,t};continue}ADJ[a].push(b);ADJ[b].push(a);EDGE[k]=EDGE[b+">"+a]={m,t}}
const LOCK_IDS=STATIONS.filter(s=>s.lock).map(s=>s.id);
const START=8,HIJACK=5,TKO_CAP=10;


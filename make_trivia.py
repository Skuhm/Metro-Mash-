# Builds src/trivia.js from the checked banks in ../trivia/*.json (question, answer, three wrong options, difficulty).
import json,os
here=os.path.dirname(os.path.abspath(__file__))
out={}
for city in ["la","sea"]:
    p=os.path.join(here,"..","trivia",city+".json")
    if not os.path.exists(p):out[city]=[];continue
    rows=json.load(open(p))
    clean=[]
    for x in rows:
        assert len(x["w"])==3 and len(set(x["w"]+[x["a"]]))==4,x["q"]
        clean.append({"q":x["q"],"a":x["a"],"w":x["w"],"d":int(x.get("d",2))})
    out[city]=clean
js="// City trivia for the duels. Every answer was checked against a source page; the sources live next to the build in trivia/*.json.\nconst TRIVIA="+json.dumps(out,ensure_ascii=False,separators=(",",":"))+";\n"
open(os.path.join(here,"src","trivia.js"),"w").write(js)
print({k:len(v) for k,v in out.items()},len(js),"bytes")

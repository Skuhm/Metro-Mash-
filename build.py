# Builds dist/turf.html: one standalone page (own <head>, works from any web address or file).
import os,base64,sys
D=os.path.dirname(os.path.abspath(__file__));S=os.path.join(D,'src')
rd=lambda f:open(os.path.join(S,f)).read()
css=rd('_orig_style.css')
light_extra='''  --l1:#2b9d5d; --l2:#1f7fd6; --mono:#8792a1; --slu:#c2362b; --fh:#b8771a;
  --p3:#17a05a; --p3-l:#0d6b3b; --p3-r:#138a4d; --p3-soft:#dcf5e7;
  --p4:#ee7a12; --p4-l:#a3520a; --p4-r:#cf690e; --p4-soft:#fdebd9;
  --p5:#0a9fb4; --p5-l:#066b79; --p5-r:#08899b; --p5-soft:#d8f3f7;
  --p6:#8a4fe0; --p6-l:#5a2fa1; --p6-r:#7642c7; --p6-soft:#ece2fc;
'''
dark_extra='''  --l1:#3fbf78; --l2:#4aa3ff; --mono:#6c7787; --slu:#ff6a5c; --fh:#e5a040;
  --p3:#38c97b; --p3-l:#1b7a47; --p3-r:#2aa565; --p3-soft:#123222;
  --p4:#ff9a3d; --p4-l:#a85a12; --p4-r:#d97a24; --p4-soft:#3a2310;
  --p5:#2cc7dc; --p5-l:#137a88; --p5-r:#1ea5b8; --p5-soft:#0f2f35;
  --p6:#a67cff; --p6-l:#5d3aa8; --p6-r:#8461e0; --p6-soft:#261a3f;
'''
a='  --la:#0072bc; --lb:#e3131b; --ld:#a05da5; --le:#fdb913; --lk:#e56db1; --rail:#8792a1;\n'
assert css.count(a)==1;css=css.replace(a,a+light_extra)
b='  --la:#3d9de6; --lb:#ff4d4d; --ld:#c58ad0; --le:#ffc93a; --lk:#f08cc4; --rail:#7c8796;\n'
assert css.count(b)==2;css=css.replace(b,b+dark_extra)
css+='\n'+rd('style_add.css')
icon=''
ip=os.path.join(D,'art_icon.png')
if os.path.exists(ip):icon='<link rel="apple-touch-icon" href="data:image/png;base64,'+base64.b64encode(open(ip,'rb').read()).decode()+'">\n'
head='''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<title>Metro Mash</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Metro Mash">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#171d26" media="(prefers-color-scheme: dark)">
'''+icon+'''<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap">
<style>
:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0;font:14px system-ui,-apple-system,sans-serif}
img{max-width:100%}
[hidden]{display:none!important}
'''+css+'''
</style>
</head>
<body>
'''+rd('_orig_dom.html')
parts=['core.js','city_la.js','city_sea.js','trivia.js','models.js','la_rotate.js','map.js','classic.js','xp.js','relay.js','teams.js','app.js']
js=''
for p in parts:
    f=os.path.join(S,p)
    if os.path.exists(f):js+='\n'+open(f).read()
    else:print('missing',p,file=sys.stderr)
out=head+'<script>\n'+js+'\n</script>\n</body>\n</html>\n'
open(os.path.join(D,'dist','turf.html'),'w').write(out)
print('dist/turf.html',len(out))
# the web-app copy for GitHub Pages: same page plus a manifest, icons and an offline cache
site=os.path.join(D,'site');os.makedirs(site,exist_ok=True)
pwa='<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icon-180.png">\n'
reg='<script>if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{})</script>\n'
page=out.replace('<meta name="theme-color"',pwa+'<meta name="theme-color"',1).replace('</body>',reg+'</body>',1)
if icon:page=page.replace(icon,'',1)
open(os.path.join(site,'index.html'),'w').write(page)
print('site/index.html',len(page))

const fs=require('node:fs'),path=require('node:path'),{Resvg}=require('@resvg/resvg-js');
const root=path.resolve(__dirname,'..'),source=path.join(root,'extension');
for(const target of ['firefox','chromium']){
 const out=path.join(root,'dist',target);fs.mkdirSync(out,{recursive:true});
 for(const file of fs.readdirSync(source)){if(file==='vendor')continue;const from=path.join(source,file),to=path.join(out,file);if(fs.statSync(from).isFile()&&/\.(js|css|html|md|json|svg)$/.test(file))fs.writeFileSync(to,fs.readFileSync(from,'utf8').replace(/\r\n/g,'\n'));else fs.cpSync(from,to,{recursive:true})}
 fs.copyFileSync(path.join(root,'LICENSE'),path.join(out,'LICENSE'));
 const m=JSON.parse(fs.readFileSync(path.join(out,'manifest.json')));
 if(target==='chromium'){
  const scripts=m.background.scripts;delete m.browser_specific_settings;m.minimum_chrome_version='120';m.background={service_worker:'background-worker.js'};
  m.icons=Object.fromEntries([16,32,48,128].map(s=>[s,`icons/icon-${s}.png`]));m.action.default_icon=m.icons;
  m.content_scripts[0].js.unshift('vendor/browser-polyfill.js','system-theme-content.js');
  const vendor=path.join(out,'vendor');fs.mkdirSync(vendor,{recursive:true});
  fs.copyFileSync(require.resolve('webextension-polyfill/dist/browser-polyfill.js'),path.join(vendor,'browser-polyfill.js'));
  fs.copyFileSync(path.join(root,'node_modules/webextension-polyfill/LICENSE'),path.join(vendor,'LICENSE'));
  const write=(f,s)=>fs.writeFileSync(path.join(out,f),s);
  write('popup.html',fs.readFileSync(path.join(out,'popup.html'),'utf8').replace('<script src="settings.js">','<script src="vendor/browser-polyfill.js"></script><script src="settings.js">'));
  if(fs.existsSync(path.join(out,'ranking-account.html')))write('ranking-account.html',fs.readFileSync(path.join(out,'ranking-account.html'),'utf8').replace('<script src="ranking-account.js">','<script src="vendor/browser-polyfill.js"></script><script src="ranking-account.js">'));
  write('system-theme-content.js',"browser.runtime.onMessage.addListener(m=>m?.type==='campus:system-theme'?Promise.resolve({dark:matchMedia('(prefers-color-scheme: dark)').matches}):undefined);\n");
  write('system-theme-worker.js',`globalThis.CampusSystemTheme=async()=>{const tabs=await browser.tabs.query({url:'https://campus.qairu.edu.kz/*'});tabs.sort((a,b)=>Number(b.active)-Number(a.active));for(const t of tabs){try{const r=await browser.tabs.sendMessage(t.id,{type:'campus:system-theme'},{frameId:0});if(typeof r?.dark==='boolean')return r.dark}catch{}}return false};\n`);
  const bg=fs.readFileSync(path.join(out,'background.js'),'utf8'),expression="matchMedia('(prefers-color-scheme: dark)').matches";
  if(bg.split(expression).length!==2)throw Error('Review system theme adaptation');write('background.js',bg.replace(expression,'await CampusSystemTheme()'));
  write('background-worker.js','importScripts('+['vendor/browser-polyfill.js','system-theme-worker.js',...scripts].map(JSON.stringify).join(',')+');\n');
  fs.mkdirSync(path.join(out,'icons'),{recursive:true});const svg=fs.readFileSync(path.join(out,'icon.svg'),'utf8');
  for(const size of [16,32,48,128])fs.writeFileSync(path.join(out,`icons/icon-${size}.png`),new Resvg(svg,{fitTo:{mode:'width',value:size}}).render().asPng());
 }
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(m,null,2)+'\n');console.log(`Built ${target} ${m.version}`);
}

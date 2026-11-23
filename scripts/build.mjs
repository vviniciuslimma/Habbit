import fs from 'node:fs';
const assets={};for(const [path,file,type]of [['/','index.html','text/html; charset=utf-8'],['/index.html','index.html','text/html; charset=utf-8'],['/app.js','app.js','text/javascript; charset=utf-8'],['/style.css','style.css','text/css; charset=utf-8'],['/sync.js','sync.js','text/javascript; charset=utf-8'],['/theme.js','theme.js','text/javascript; charset=utf-8']])assets[path]={body:fs.readFileSync('dist/'+file,'utf8'),type};
fs.mkdirSync('dist/server',{recursive:true});fs.writeFileSync('dist/server/index.js',fs.readFileSync('server/index.mjs','utf8')+'\nexport default makeWorker('+JSON.stringify(assets)+');\n');
console.log('Worker and embedded assets built.');

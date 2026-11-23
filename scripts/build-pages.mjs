import fs from 'node:fs';
fs.mkdirSync('docs',{recursive:true});
for(const name of ['app.js','style.css','sync.js','theme.js'])fs.copyFileSync('dist/'+name,'docs/'+name);
fs.copyFileSync('pages/auth.js','docs/auth.js');
let html=fs.readFileSync('dist/index.html','utf8').replace('<body>','<body class="auth-locked">').replace('<script src="sync.js"></script>','<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.2/dist/umd/supabase.js"></script><script src="auth.js"></script><script src="sync.js"></script>');
fs.writeFileSync('docs/index.html',html);fs.writeFileSync('docs/.nojekyll','');console.log('GitHub Pages generated in docs/.');

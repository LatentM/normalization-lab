// node build.js → dist/index.html (deployable website) and dist/artifact.html (page body for the Claude artifact)
const fs = require('fs'); const path = require('path');
const src = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const order = ['engine.js', 'files.js', 'table-engine.js', 'table-examples.js', 'pyq.js', 'app-core.js', 'app-lab.js', 'app-table.js', 'app-quiz.js', 'app-pyq.js', 'app-content.js', 'app-report.js', 'app-main.js'];
const js = order.map((f) => `/* ---- ${f} ---- */\n` + src(f)).join('\n').replace(/<\/script/gi, '<\\/script');
const body = src('template.html').replace('/*STYLES*/', () => src('styles.css')).replace('/*SCRIPTS*/', () => js);
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'artifact.html'), body);
const site = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>\n${body}\n</body></html>\n`;
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), site);
console.log('built', (site.length / 1024).toFixed(1) + ' KB');

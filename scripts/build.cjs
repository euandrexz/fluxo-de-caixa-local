const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve(__dirname, '..', 'src');
const output = path.resolve(__dirname, '..', 'dist');
const pages = path.resolve(__dirname, '..', 'docs');
const read = name => fs.readFileSync(path.join(source, name), 'utf8').replace(/\r\n/g, '\n');
const html = read('index.html')
  .replace('<link rel="stylesheet" href="style.css">', () => '<style>\n' + read('style.css') + '\n</style>')
  .replace(/  <script defer src="(?:core|app)\.js"><\/script>\n/g, '')
  .replace('</body>', () => '<script>\n' + read('core.js') + '\n' + read('app.js') + '\n</script>\n</body>');

fs.mkdirSync(output, {recursive:true});
fs.writeFileSync(path.join(output, 'Fluxo de Caixa Local.html'), html);
fs.mkdirSync(pages, {recursive:true});
fs.writeFileSync(path.join(pages, 'index.html'), html.replace('<body>', '<body data-public-demo>'));

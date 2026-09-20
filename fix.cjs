const fs = require('fs');
let c = fs.readFileSync('public/welcome-loader.js', 'utf8');
c = c.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('public/welcome-loader.js', c);
console.log("Fixed!");

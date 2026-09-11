const fs = require('fs');
const path = './client/src/assets/Lotties/Loading.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
data.layers = data.layers.filter(layer => layer.nm !== "Black Solid 1");
fs.writeFileSync(path, JSON.stringify(data));
console.log("Removed Black Solid 1");

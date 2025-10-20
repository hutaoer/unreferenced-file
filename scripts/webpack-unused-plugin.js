try {
  require('ts-node').register({ transpileOnly: true });
} catch (e) {
  // ts-node may not be installed globally; plugin will not load TS without it
}
module.exports = require('./find-unreferenced-old.ts').default || require('./find-unreferenced-old.ts');

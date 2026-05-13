console.log('1');
try {
  console.log('2: Loading server.js');
  require('./server.js');
  console.log('3: Loaded successfully');
} catch (e) {
  console.error('ERROR:', e);
}

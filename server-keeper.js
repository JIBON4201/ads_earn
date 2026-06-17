const { spawn } = require('child_process');
const path = require('path');

const dir = path.join(__dirname);
let child = null;

function start() {
  child = spawn('npx', ['next', 'dev', '-p', '3000'], {
    cwd: dir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env }
  });
  
  child.stdout.on('data', d => process.stdout.write(d));
  child.stderr.on('data', d => process.stderr.write(d));
  child.on('exit', (code) => {
    console.log(`Server exited with code ${code}, restarting...`);
    setTimeout(start, 500);
  });
}

start();

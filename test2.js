
const { execSync } = require('child_process');
try {
  execSync('curl -s -v http://127.0.0.1:3000/manage/tasks');
} catch (e) {
  console.log(e.stdout.toString());
}


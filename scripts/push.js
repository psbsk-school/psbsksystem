/**
 * Push code ทั้ง 2 ที่:
 *   node scripts/push.js ["message"]
 *   node scripts/push.js --github-only ["message"]
 *   node scripts/push.js --apps-only ["message"]
 */

const { spawnSync } = require('node:child_process');

const args = process.argv.slice(2);
const flags = args.filter(function (arg) { return arg.startsWith('--'); });
const messageArgs = args.filter(function (arg) { return !arg.startsWith('--'); });
const message = messageArgs.join(' ') || 'sync: update task manager';
const pushGithub = !flags.includes('--apps-only');
const pushApps = !flags.includes('--github-only');

function run(command, commandArgs, label) {
  console.log('\n=== ' + label + ' ===');
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    throw new Error(label + ' ล้มเหลว (exit code ' + result.status + ')');
  }
}

function npx(commandArgs, label) {
  run(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['@google/clasp'].concat(commandArgs),
    label
  );
}

try {
  if (pushGithub) {
    const status = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
    if (status.status !== 0) throw new Error('git status ล้มเหลว');

    if (status.stdout.trim()) {
      run('git', ['add', '-A'], 'git add');
      run('git', ['commit', '-m', message], 'git commit');
    } else {
      console.log('\n=== git (ไม่มีการเปลี่ยนแปลง) ===');
    }
    run('git', ['push'], 'git push');
  }

  if (pushApps) {
    npx(['push'], 'clasp push (อัปโหลดโค้ดไป Apps Script)');
    npx(['deploy', '-d', message], 'clasp deploy (สร้าง deployment ใหม่)');
  }

  console.log('\nเสร็จสิ้น: push ครบทั้ง GitHub และ Apps Script');
} catch (err) {
  console.error('\n' + err.message);
  process.exit(1);
}

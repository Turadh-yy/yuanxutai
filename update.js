/* 圆序台一键更新脚本
   用法：双击 一键更新.bat，或命令行运行 node update.js
   原理：通过 GitHub API (api.github.com) 更新仓库中的 index.html
   Token 从系统凭据管理器读取（不硬编码在本文件）
*/
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OWNER = 'Turadh-yy';
const REPO = 'yuanxutai';
const FILE = 'index.html';
// 本地源文件：优先 圆序台.html，其次 index.html，均可触发更新
const SRC_CANDIDATES = ['圆序台.html', 'index.html'].map(n => path.join(__dirname, n));
let SRC = null;

function getTokenFromCredentialManager() {
  try {
    const out = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8'
    });
    const m = out.match(/^password=(.+)$/m);
    return m ? m[1].trim() : null;
  } catch (e) {
    return null;
  }
}

function api(method, ghPath, body, token) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      host: 'api.github.com', path: ghPath, method,
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'workbuddy-updater',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: d }));
    });
    req.on('error', e => resolve({ status: 0, data: e.message }));
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  console.log('==========================================');
  console.log('  圆序台 一键更新部署');
  console.log('==========================================');
  console.log('');

  // 1. 校验源文件（圆序台.html 优先，其次 index.html）
  SRC = SRC_CANDIDATES.find(f => fs.existsSync(f));
  if (!SRC) {
    console.log('[错误] 找不到 圆序台.html 或 index.html，请确认脚本与文件在同一目录');
    process.exit(1);
  }
  const size = fs.statSync(SRC).size;
  console.log('[1/3] 读取 ' + path.basename(SRC) + ' (' + (size / 1024).toFixed(0) + ' KB)');

  // 2. 获取 Token
  const token = getTokenFromCredentialManager();
  if (!token) {
    console.log('[错误] 无法从系统凭据读取 GitHub Token');
    console.log('      请先运行：git credential approve 存入凭据');
    process.exit(1);
  }
  console.log('[2/3] 读取凭据成功');

  // 3. 更新文件
  const meta = await api('GET', '/repos/' + OWNER + '/' + REPO + '/contents/' + FILE, null, token);
  let sha = null;
  try { sha = JSON.parse(meta.data).sha; } catch (e) {}
  if (!sha) {
    console.log('[错误] 获取文件信息失败 (HTTP ' + meta.status + ')');
    console.log('      ' + (meta.data || '').slice(0, 200));
    process.exit(1);
  }
  const content = fs.readFileSync(SRC, 'utf8');
  const up = await api('PUT', '/repos/' + OWNER + '/' + REPO + '/contents/' + FILE, {
    message: '更新圆序台 ' + new Date().toLocaleDateString('zh-CN'),
    content: Buffer.from(content, 'utf8').toString('base64'),
    sha: sha
  }, token);

  console.log('[3/3] 推送到 GitHub ... HTTP ' + up.status);
  if (up.status === 200 || up.status === 201) {
    console.log('');
    console.log('==========================================');
    console.log('  部署完成！约 1 分钟后访问：');
    console.log('  https://turadh-yy.github.io/yuanxutai/');
    console.log('==========================================');
  } else {
    console.log('[错误] 更新失败: ' + (up.data || '').slice(0, 300));
    process.exit(1);
  }
})();

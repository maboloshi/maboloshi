const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');
const { DateTime } = require('luxon');

// 配置
const DATA_DIR = 'stars_data';
const TODAY = DateTime.now().toISODate();
// const RETENTION_DAYS = 7;

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// 加载仓库列表
const repos = JSON.parse(fs.readFileSync('repos.json', 'utf8'));

async function updateRepoStars(repoFullName) {
  const [owner, repo] = repoFullName.split('/');
  const fileName = `${owner}_${repo}_stars.json`;
  const filePath = path.join(DATA_DIR, fileName);

  let data = {};
  // 读取现有数据
  if (fs.existsSync(filePath)) {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  // 使用 GitHub API 获取当前 star 数
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  let stars;
  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    stars = repoData.stargazers_count;
    console.log(`[${owner}/${repo}] Current stars: ${stars}`);
  } catch (error) {
    console.error(`[${owner}/${repo}] Error fetching stars:`, error.message);
    return; // 跳过这个仓库
  }

  // 更新数据
  data[TODAY] = { stars };

  // 清理旧数据（保留最近7天）
  // const cutoffDate = DateTime.now().minus({ days: RETENTION_DAYS }).toISODate();
  // Object.keys(data).forEach(date => {
  //   if (date < cutoffDate) {
  //     delete data[date];
  //   }
  // });

  // 保存数据
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`[${owner}/${repo}] Data saved for ${TODAY}`);

  return fileName;
}

async function main() {
  const updatedFiles = [];

  for (const repo of repos) {
    const fileName = await updateRepoStars(repo);
    if (fileName) updatedFiles.push(fileName);
  }

  // 创建备份文件列表
  const backupManifest = {
    date: TODAY,
    files: updatedFiles
  };

  fs.writeFileSync(path.join(DATA_DIR, 'backup_manifest.json'), JSON.stringify(backupManifest));
  console.log(`Backup manifest created for ${updatedFiles.length} files`);
}

main().catch(console.error);
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

const DATA_DIR = 'stars_data';
const REPORTS_DIR = 'public/reports';
const INDEX_FILE = 'public/index.json';

function calculateGrowth(data) {
  const today = DateTime.now();

  // 上周范围
  const lastWeekStart = today.minus({ weeks: 1 }).startOf('week').toISODate();

  // 上月范围
  const lastMonthStart = today.minus({ months: 1 }).startOf('month').toISODate();

  // 获取关键数据点
  const dates = Object.keys(data).sort();
  if (dates.length === 0) return null;

  const currentStars = data[dates[dates.length - 1]]?.stars || 0;

  // 查找最近的有效日期数据
  const findNearestData = (targetDate) => {
    for (let i = dates.length - 1; i >= 0; i--) {
      if (dates[i] <= targetDate) {
        return data[dates[i]].stars;
      }
    }
    return 0;
  };

  const lastWeekStartStars = findNearestData(lastWeekStart);
  const lastMonthStartStars = findNearestData(lastMonthStart);

  // 计算指标
  const weeklyGrowth = currentStars - lastWeekStartStars;
  const monthlyGrowth = currentStars - lastMonthStartStars;
  const monthlyGrowthRate = lastMonthStartStars > 0 ?
    ((monthlyGrowth / lastMonthStartStars) * 100).toFixed(2) : 0;

  return {
    stars: currentStars,
    weeklyGrowth,
    monthlyGrowth,
    monthlyGrowthRate: parseFloat(monthlyGrowthRate)
  };
}

function main() {
  const repos = JSON.parse(fs.readFileSync('repos.json', 'utf8'));
  const indexData = [];

  // 确保报告目录存在
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  // 为每个仓库生成报告
  repos.forEach(repoFullName => {
    const [owner, repo] = repoFullName.split('/');
    const fileName = `${owner}_${repo}_stars.json`;
    const filePath = path.join(DATA_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      console.warn(`No data file for ${repoFullName}`);
      return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const report = calculateGrowth(data);

    if (!report) {
      console.warn(`Insufficient data for ${repoFullName}`);
      return;
    }

    // 创建仓库报告对象
    const repoReport = {
      repo: repoFullName,
      stars: report.stars,
      weeklyGrowth: report.weeklyGrowth,
      monthlyGrowth: report.monthlyGrowth,
      monthlyGrowthRate: report.monthlyGrowthRate,
      updatedAt: DateTime.now().toISO()
    };

    // 保存独立报告文件
    const reportFileName = `${owner}_${repo}.json`;
    const reportFilePath = path.join(REPORTS_DIR, reportFileName);
    fs.writeFileSync(reportFilePath, JSON.stringify(repoReport, null, 2));

    // 添加到索引
    indexData.push({
      repo: repoFullName,
      reportUrl: `reports/${reportFileName}`
    });
  });

  // 保存索引文件
  fs.writeFileSync(INDEX_FILE, JSON.stringify({
    lastUpdated: DateTime.now().toISO(),
    count: indexData.length,
    repositories: indexData
  }, null, 2));

  console.log(`Generated ${indexData.length} reports and index file`);
}

main();
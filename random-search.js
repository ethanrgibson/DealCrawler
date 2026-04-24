const path = require('path');
const { spawn } = require('child_process');
const { getWeekOfMonth } = require('./utils');
const { getValidBrands, loadWeeklyTracker, saveWeeklyTracker } = require('./fileManager');

const args = process.argv.slice(2);
const numBrands = parseInt(args[0], 10);

if (isNaN(numBrands) || numBrands <= 0) {
    console.error('Please provide a valid number of brands to search.');
    console.error('Usage: node random-search.js <number>');
    process.exit(1);
}

const masterListPath = path.join(__dirname, 'Brands', 'MasterList');
const validBrands = getValidBrands(masterListPath);

if (validBrands.length === 0) {
    console.error('No valid brands found in MasterList.');
    process.exit(1);
}

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();
const weekOfMonth = getWeekOfMonth(now);
const weekKey = `${year}-${month + 1}-W${weekOfMonth}`;

const weeklyDir = path.join(__dirname, 'Deals', `Week ${weekOfMonth}`);
const weeklyTrackingPath = path.join(weeklyDir, 'weekly_searched.json');

// Ensure directory exists for tracking file (fileManager handles it for deals, but we need it here)
const fs = require('fs');
if (!fs.existsSync(weeklyDir)) {
    fs.mkdirSync(weeklyDir, { recursive: true });
}

const alreadySearched = loadWeeklyTracker(weeklyTrackingPath, weekKey);
const remainingBrands = validBrands.filter(b => !alreadySearched.includes(b));

if (remainingBrands.length === 0) {
    console.log('All brands from the MasterList have already been searched this week!');
    console.log(`If you want to search again this week, you can delete ${weeklyTrackingPath}`);
    process.exit(0);
}

const numToSelect = Math.min(numBrands, remainingBrands.length);
if (remainingBrands.length < numBrands) {
    console.log(`Only ${remainingBrands.length} brand(s) left to search this week!`);
}

// Shuffle array
for (let i = remainingBrands.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remainingBrands[i], remainingBrands[j]] = [remainingBrands[j], remainingBrands[i]];
}

const selectedBrands = remainingBrands.slice(0, numToSelect);

// Update tracker
saveWeeklyTracker(weeklyTrackingPath, weekKey, alreadySearched.concat(selectedBrands));

console.log(`=================================`);
console.log(`Selecting ${numToSelect} random brand(s):`);
selectedBrands.forEach((b, index) => console.log(`  ${index + 1}. ${b}`));
console.log(`=================================\n`);

console.log('Starting crawler with selected brands...\n');

const limitIndex = args.indexOf('--limit');
let crawlerArgs = ['crawler.js', ...selectedBrands];
if (limitIndex !== -1 && args[limitIndex + 1]) {
    crawlerArgs.push('--limit', args[limitIndex + 1]);
}

const crawlerProcess = spawn('node', crawlerArgs, {
    stdio: 'inherit'
});

crawlerProcess.on('close', (code) => {
    console.log(`\nCrawler finished with exit code ${code}`);
});

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const numBrands = parseInt(args[0], 10);

if (isNaN(numBrands) || numBrands <= 0) {
    console.error('Please provide a valid number of brands to search.');
    console.error('Usage: node random-search.js <number>');
    process.exit(1);
}

const masterListPath = path.join(__dirname, 'Brands', 'MasterList');

if (!fs.existsSync(masterListPath)) {
    console.error(`Could not find master list at ${masterListPath}`);
    process.exit(1);
}

const content = fs.readFileSync(masterListPath, 'utf8');
const lines = content.split('\n');

// Filter valid brands
// We remove empty lines and the header line "These brands have proven successful:"
const validBrands = lines
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.toLowerCase().includes('these brands'));

if (validBrands.length === 0) {
    console.error('No valid brands found in MasterList.');
    process.exit(1);
}

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();
const day = now.getDate();
let weekOfMonth = Math.ceil(day / 7);
if (weekOfMonth > 4) weekOfMonth = 4;

const weekKey = `${year}-${month + 1}-W${weekOfMonth}`;
const weeklyDir = path.join(__dirname, 'Deals', `Week ${weekOfMonth}`);

if (!fs.existsSync(weeklyDir)) {
    fs.mkdirSync(weeklyDir, { recursive: true });
}

const weeklyTrackingPath = path.join(weeklyDir, 'weekly_searched.json');

function loadTracker() {
    if (fs.existsSync(weeklyTrackingPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(weeklyTrackingPath, 'utf8'));
            if (data.weekKey === weekKey) {
                return data.searched || [];
            }
        } catch (e) {
            console.error('Error reading tracking file, resetting.', e);
        }
    }
    return [];
}

function saveTracker(searchedBrands) {
    const data = {
        weekKey: weekKey,
        searched: searchedBrands
    };
    fs.writeFileSync(weeklyTrackingPath, JSON.stringify(data, null, 2), 'utf8');
}

const alreadySearched = loadTracker();
const remainingBrands = validBrands.filter(b => !alreadySearched.includes(b));

if (remainingBrands.length === 0) {
    console.log('All brands from the MasterList have already been searched this week!');
    console.log(`If you want to search again this week, you can delete Deals/Week ${weekOfMonth}/weekly_searched.json`);
    process.exit(0);
}

const numToSelect = Math.min(numBrands, remainingBrands.length);
if (remainingBrands.length < numBrands) {
    console.log(`Only ${remainingBrands.length} brand(s) left to search this week!`);
}

// Shuffle array using Fisher-Yates
for (let i = remainingBrands.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remainingBrands[i], remainingBrands[j]] = [remainingBrands[j], remainingBrands[i]];
}

// Pick the top 'numToSelect' brands
const selectedBrands = remainingBrands.slice(0, numToSelect);

// Update tracker
saveTracker(alreadySearched.concat(selectedBrands));

console.log(`=================================`);
console.log(`Selecting ${numToSelect} random brand(s):`);
selectedBrands.forEach((b, index) => console.log(`  ${index + 1}. ${b}`));
console.log(`=================================\n`);

console.log('Starting crawler with selected brands...\n');

// Parse --limit if provided to pass it down to crawler.js
const limitIndex = args.indexOf('--limit');
let crawlerArgs = ['crawler.js', ...selectedBrands];
if (limitIndex !== -1 && args[limitIndex + 1]) {
    crawlerArgs.push('--limit', args[limitIndex + 1]);
}

// Spawn the crawler process, passing the selected brands and potential limit as arguments
const crawlerProcess = spawn('node', crawlerArgs, {
    stdio: 'inherit' // This pipes the crawler's logs straight to the terminal
});

crawlerProcess.on('close', (code) => {
    console.log(`\nCrawler finished with exit code ${code}`);
});

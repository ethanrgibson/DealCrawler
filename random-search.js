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

const dailyTrackingPath = path.join(__dirname, 'Brands', 'daily_searched.json');

function loadTracker() {
    if (fs.existsSync(dailyTrackingPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(dailyTrackingPath, 'utf8'));
            const today = new Date().toISOString().split('T')[0];
            if (data.date === today) {
                return data.searched || [];
            }
        } catch (e) {
            console.error('Error reading tracking file, resetting.', e);
        }
    }
    return [];
}

function saveTracker(searchedBrands) {
    const today = new Date().toISOString().split('T')[0];
    const data = {
        date: today,
        searched: searchedBrands
    };
    fs.writeFileSync(dailyTrackingPath, JSON.stringify(data, null, 2), 'utf8');
}

const alreadySearched = loadTracker();
const remainingBrands = validBrands.filter(b => !alreadySearched.includes(b));

if (remainingBrands.length === 0) {
    console.log('All brands from the MasterList have already been searched today!');
    console.log('If you want to search again today, you can delete Brands/daily_searched.json');
    process.exit(0);
}

const numToSelect = Math.min(numBrands, remainingBrands.length);
if (remainingBrands.length < numBrands) {
    console.log(`Only ${remainingBrands.length} brand(s) left to search today!`);
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

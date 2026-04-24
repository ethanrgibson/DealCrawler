const fs = require('fs');
const path = require('path');

function getValidBrands(masterListPath) {
    if (!fs.existsSync(masterListPath)) {
        throw new Error(`Could not find master list at ${masterListPath}`);
    }

    const content = fs.readFileSync(masterListPath, 'utf8');
    const lines = content.split('\n');

    return lines
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.toLowerCase().includes('these brands'));
}

function loadWeeklyTracker(trackingPath, weekKey) {
    if (fs.existsSync(trackingPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(trackingPath, 'utf8'));
            if (data.weekKey === weekKey) {
                return data.searched || [];
            }
        } catch (e) {
            console.error('Error reading tracking file, resetting.', e);
        }
    }
    return [];
}

function saveWeeklyTracker(trackingPath, weekKey, searchedBrands) {
    const data = {
        weekKey: weekKey,
        searched: searchedBrands
    };
    fs.writeFileSync(trackingPath, JSON.stringify(data, null, 2), 'utf8');
}

function appendDealsToFile(deals, outputDir, dateStr) {
    if (deals.length === 0) return;

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `deals_${dateStr}.txt`;
    const filePath = path.join(outputDir, filename);

    const timestamp = new Date().toLocaleTimeString();
    const header = `\n\n=== Runs at ${timestamp} ===\n\n`;
    const fileContent = deals.map(d => `${d.title}\nPrice: $${d.currentPrice} (Was $${d.listPrice} - ${d.discount}% off)\nLink: ${d.link}\nIs Top Brand? Yes (Filtered by Amazon/User)\n------------------------`).join('\n\n');

    if (fs.existsSync(filePath)) {
        fs.appendFileSync(filePath, header + fileContent);
    } else {
        fs.writeFileSync(filePath, fileContent);
    }
    
    console.log(`Done! Found ${deals.length} total deals. Appended to ${filePath}.`);
}

module.exports = {
    getValidBrands,
    loadWeeklyTracker,
    saveWeeklyTracker,
    appendDealsToFile
};

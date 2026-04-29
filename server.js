const express = require('express');
const path = require('path');
const fs = require('fs');
const { scrapeBrands } = require('./scraper');
const { appendDealsToFile, getValidBrands, loadWeeklyTracker, saveWeeklyTracker } = require('./fileManager');
const { getWeekOfMonth } = require('./utils');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to save deals
function saveDeals(allDeals) {
    if (allDeals && allDeals.length > 0) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const weekOfMonth = getWeekOfMonth(now);
        const outputDir = path.join(__dirname, 'Deals', `Week ${weekOfMonth}`);
        appendDealsToFile(allDeals, outputDir, dateStr);
    }
}

app.post('/api/search', async (req, res) => {
    try {
        const { brands, limit = 15 } = req.body;
        
        if (!brands || !Array.isArray(brands) || brands.length === 0) {
            return res.status(400).json({ error: 'Please provide an array of brands to search.' });
        }

        const config = {
            targetDealCount: parseInt(limit, 10),
            maxPages: 5,
            minDiscount: 25
        };

        console.log(`[API] Searching for brands: ${brands.join(', ')}`);
        const allDeals = await scrapeBrands(brands, config);
        saveDeals(allDeals);

        res.json({ success: true, deals: allDeals, message: `Found ${allDeals.length} deals.` });
    } catch (error) {
        console.error('[API] Search error:', error);
        res.status(500).json({ error: 'Failed to complete search.', details: error.message });
    }
});

app.post('/api/random/select', async (req, res) => {
    try {
        const { numBrands = 3 } = req.body;
        
        const masterListPath = path.join(__dirname, 'Brands', 'MasterList');
        const validBrands = getValidBrands(masterListPath);

        if (validBrands.length === 0) {
            return res.status(400).json({ error: 'No valid brands found in MasterList.' });
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const weekOfMonth = getWeekOfMonth(now);
        const weekKey = `${year}-${month + 1}-W${weekOfMonth}`;

        const weeklyDir = path.join(__dirname, 'Deals', `Week ${weekOfMonth}`);
        const weeklyTrackingPath = path.join(weeklyDir, 'weekly_searched.json');

        if (!fs.existsSync(weeklyDir)) {
            fs.mkdirSync(weeklyDir, { recursive: true });
        }

        const alreadySearched = loadWeeklyTracker(weeklyTrackingPath, weekKey);
        const remainingBrands = validBrands.filter(b => !alreadySearched.includes(b));

        if (remainingBrands.length === 0) {
            return res.status(400).json({ 
                error: 'All brands from the MasterList have already been searched this week!',
                action: 'delete_tracker'
            });
        }

        const numToSelect = Math.min(numBrands, remainingBrands.length);
        
        // Shuffle array
        for (let i = remainingBrands.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remainingBrands[i], remainingBrands[j]] = [remainingBrands[j], remainingBrands[i]];
        }

        const selectedBrands = remainingBrands.slice(0, numToSelect);
        
        // Update tracker
        saveWeeklyTracker(weeklyTrackingPath, weekKey, alreadySearched.concat(selectedBrands));

        console.log(`[API] Selected random brands: ${selectedBrands.join(', ')}`);

        res.json({ 
            success: true, 
            brands: selectedBrands 
        });

    } catch (error) {
        console.error('[API] Random select error:', error);
        res.status(500).json({ error: 'Failed to select random brands.', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 DealCrawler UI is running at: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
});

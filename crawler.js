const { scrapeBrands } = require('./scraper');
const { appendDealsToFile } = require('./fileManager');
const { getWeekOfMonth } = require('./utils');

let TARGET_DEAL_COUNT = 15;
const MAX_PAGES = 5;
const MIN_DISCOUNT = 25;

const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
    TARGET_DEAL_COUNT = parseInt(args[limitIndex + 1], 10) || 15;
    args.splice(limitIndex, 2);
}
const brands = args;

async function run() {
    const config = {
        targetDealCount: TARGET_DEAL_COUNT,
        maxPages: MAX_PAGES,
        minDiscount: MIN_DISCOUNT
    };

    const allDeals = await scrapeBrands(brands, config);

    if (allDeals.length > 0) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const weekOfMonth = getWeekOfMonth(now);
        const outputDir = `Deals/Week ${weekOfMonth}`;

        appendDealsToFile(allDeals, outputDir, dateStr);
    } else {
        console.log("No deals found this run.");
    }
}

run();

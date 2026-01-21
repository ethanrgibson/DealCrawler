const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

const DEFAULT_TARGET_URL = 'https://www.amazon.com/s?k=Outdoor+Gear&rh=n%3A3375251%2Cp_89%3ATop+Brands&dc&_encoding=UTF8&crid=369PQ7EJT8LV1&qid=1764975122&rnid=2528832011&sprefix=outdoor%2Bgear%2Caps%2C194&ref=sr_nr_p_89_1';
const MIN_DISCOUNT = 25;
const TARGET_DEAL_COUNT = 15;
const MAX_PAGES = 5; // Safety limit

// Get brands from CLI args
const brands = process.argv.slice(2);

async function run() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Listen for console logs from the page
    page.on('console', msg => {
        const text = msg.text();
        if (!text.includes('Failed to load') && !text.includes('blocked by CORS')) {
            console.log('PAGE LOG:', text);
        }
    });

    // Set a realistic User Agent and Headers
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
    });

    await page.setViewport({ width: 1280, height: 800 });

    let allDeals = [];

    // Determine search list (either specific brands or one general search)
    const searchQueue = brands.length > 0 ? brands : ['__DEFAULT__'];

    console.log(`Starting crawler... Mode: ${brands.length > 0 ? 'Specific Brands: ' + brands.join(', ') : 'Default Top Brands'}`);

    try {
        console.log("Navigating to Amazon homepage to set cookies...");
        await page.goto('https://www.amazon.com', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 3000));

        for (const brand of searchQueue) {
            let searchUrl;
            if (brand === '__DEFAULT__') {
                searchUrl = DEFAULT_TARGET_URL;
            } else {
                // Construct brand-specific search URL
                const query = `Outdoor Gear ${brand}`;
                searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
                console.log(`Searching for brand: ${brand}`);
            }

            let deals = [];
            let currentPage = 1;

            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

            while (deals.length < TARGET_DEAL_COUNT && currentPage <= MAX_PAGES) {
                console.log(`Scanning page ${currentPage}...`);

                // Wait for results to load
                await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 10000 }).catch(() => console.log('Timeout waiting for results'));

                // Extract items from the current page
                const pageDeals = await page.evaluate((minDiscount) => {
                    const results = [];
                    const items = document.querySelectorAll('[data-component-type="s-search-result"]');

                    items.forEach((item, index) => {
                        // Title
                        const titleEl = item.querySelector('h2 span');
                        const title = titleEl ? titleEl.innerText : 'Unknown Product';

                        // Kit Filtering Logic
                        const kitRegex = /\d+\s*in\s*1|kit|bundle/i;
                        if (title.match(/\d+\s*in\s*1/i)) { // Strict "N in 1" filter
                            console.log(`Item ${index} (${title}): Skipped (Kit detected)`);
                            return;
                        }

                        // Link
                        const linkEl = item.querySelector('.a-link-normal');
                        const link = linkEl ? linkEl.href : null;

                        // Prices
                        const priceEl = item.querySelector('.a-price .a-offscreen');
                        const listPriceEl = item.querySelector('.a-text-price .a-offscreen');

                        if (priceEl && listPriceEl && link) {
                            const currentPriceStr = priceEl.innerText.replace(/[^0-9.]/g, '');
                            const listPriceStr = listPriceEl.innerText.replace(/[^0-9.]/g, '');

                            const currentPrice = parseFloat(currentPriceStr);
                            const listPrice = parseFloat(listPriceStr);

                            if (currentPrice && listPrice && listPrice > 0) {
                                const discount = ((listPrice - currentPrice) / listPrice) * 100;

                                if (discount >= minDiscount) {
                                    results.push({
                                        title,
                                        link,
                                        currentPrice,
                                        listPrice,
                                        discount: discount.toFixed(2)
                                    });
                                }
                            }
                        }
                    });
                    return results;
                }, MIN_DISCOUNT);

                console.log(`Found ${pageDeals.length} potential deals on this page.`);
                deals = deals.concat(pageDeals);

                if (deals.length >= TARGET_DEAL_COUNT) break;

                // Pagination
                const nextButton = await page.$('.s-pagination-next:not(.s-pagination-disabled)');
                if (nextButton) {
                    await Promise.all([
                        nextButton.click(),
                        page.waitForNavigation({ waitUntil: 'domcontentloaded' })
                    ]);
                    currentPage++;
                    await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
                } else {
                    console.log('No more pages.');
                    break;
                }
            }
            allDeals = allDeals.concat(deals);
        }

    } catch (error) {
        console.error('Error during scraping:', error);
    } finally {
        await browser.close();
    }

    // Write to file
    const fileContent = allDeals.map(d => `${d.title}\nPrice: $${d.currentPrice} (Was $${d.listPrice} - ${d.discount}% off)\nLink: ${d.link}\nIs Top Brand? Yes (Filtered by Amazon/User)\n------------------------`).join('\n\n');

    const outputDir = 'Deals';
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }
    fs.writeFileSync(`${outputDir}/deals.txt`, fileContent);
    console.log(`Done! Found ${allDeals.length} total deals. Saved to ${outputDir}/deals.txt.`);
}

run();

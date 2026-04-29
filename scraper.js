const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { cleanLink } = require('./utils');

const DEFAULT_TARGET_URL = 'https://www.amazon.com/s?k=Outdoor+Gear&rh=n%3A3375251%2Cp_89%3ATop+Brands&dc&_encoding=UTF8&crid=369PQ7EJT8LV1&qid=1764975122&rnid=2528832011&sprefix=outdoor%2Bgear%2Caps%2C194&ref=sr_nr_p_89_1';

async function scrapeBrands(brands, config) {
    const { targetDealCount = 15, maxPages = 5, minDiscount = 25 } = config;

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    let allDeals = [];

    try {
        const page = await browser.newPage();

        // Performance Optimization: Block images, CSS, and fonts
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Listen for console logs
        page.on('console', msg => {
            const text = msg.text();
            if (!text.includes('Failed to load') && !text.includes('blocked by CORS')) {
                console.log('PAGE LOG:', text);
            }
        });

        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        let seenLinks = new Set();
        const searchQueue = brands.length > 0 ? brands : ['__DEFAULT__'];

        console.log(`Starting crawler... Mode: ${brands.length > 0 ? 'Specific Brands: ' + brands.join(', ') : 'Default Top Brands'}`);

        console.log("Navigating to Amazon homepage to set cookies...");
        await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded' }).catch(() => {});
        await new Promise(r => setTimeout(r, 2000));

        for (const brand of searchQueue) {
            try {
                let searchUrl;
                let queryBrand = brand;
                if (brand === '__DEFAULT__') {
                    searchUrl = DEFAULT_TARGET_URL;
                } else {
                    let usePrefix = true;

                    if (brand.startsWith('^')) {
                        queryBrand = brand.substring(1);
                        usePrefix = false;
                    }

                    const query = usePrefix ? `Outdoor Gear ${queryBrand}` : queryBrand;
                    searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
                    console.log(`Searching for brand: ${queryBrand} (Query: "${query}")`);
                }

                let deals = [];
                let currentPage = 1;

                await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

                while (deals.length < targetDealCount && currentPage <= maxPages) {
                    console.log(`Scanning page ${currentPage}...`);

                    let pageLoadSuccess = true;
                    await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 10000 }).catch((e) => {
                        console.log('Timeout waiting for results or no results found on this page.');
                        pageLoadSuccess = false;
                    });

                    // Graceful failure optimization: Don't evaluate if selector wasn't found
                    if (!pageLoadSuccess) {
                        break;
                    }

                    const pageDeals = await page.evaluate((minDiscount, brandName) => {
                        const results = [];
                        const items = document.querySelectorAll('[data-component-type="s-search-result"]');

                        items.forEach((item, index) => {
                            const titleEl = item.querySelector('h2');
                            const title = titleEl ? titleEl.textContent.trim() : 'Unknown Product';

                            if (title.match(/\d+\s*in\s*1/i)) {
                                return;
                            }

                            const linkEl = item.querySelector('.a-link-normal');
                            const link = linkEl ? linkEl.href : null;

                            const priceEl = item.querySelector('.a-price .a-offscreen');
                            const listPriceEl = item.querySelector('.a-text-price .a-offscreen');

                            const imgEl = item.querySelector('img.s-image, img[class*="image_"], img');
                            const imageUrl = imgEl ? imgEl.src : '';

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
                                            brand: brandName === '__DEFAULT__' ? 'Amazon Top Brand' : brandName,
                                            imageUrl,
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
                    }, minDiscount, queryBrand);

                    console.log(`Found ${pageDeals.length} potential deals on this page.`);

                    let newUniqueDeals = [];
                    for (const d of pageDeals) {
                        const cLink = cleanLink(d.link);
                        if (!seenLinks.has(cLink)) {
                            seenLinks.add(cLink);
                            newUniqueDeals.push({ ...d, link: cLink });
                        }
                    }

                    console.log(`Kept ${newUniqueDeals.length} unique deals.`);
                    deals = deals.concat(newUniqueDeals);

                    if (deals.length >= targetDealCount) {
                        deals = deals.slice(0, targetDealCount);
                        break;
                    }

                    const nextButton = await page.$('.s-pagination-next:not(.s-pagination-disabled)');
                    if (nextButton) {
                        await Promise.all([
                            nextButton.click(),
                            page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {})
                        ]);
                        currentPage++;
                        await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
                    } else {
                        break;
                    }
                }
                allDeals = allDeals.concat(deals);

            } catch (brandError) {
                console.error(`Error processing brand ${brand}:`, brandError.message);
                // Continue to next brand instead of crashing the whole loop
            }
        }

    } catch (error) {
        console.error('Fatal error during scraping session:', error);
    } finally {
        await browser.close();
    }

    return allDeals;
}

module.exports = {
    scrapeBrands
};

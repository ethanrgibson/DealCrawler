const puppeteer = require('puppeteer-extra');
const { scrapeBrands } = require('../scraper');

jest.mock('puppeteer-extra', () => ({
    use: jest.fn(),
    launch: jest.fn()
}));

describe('scraper.js', () => {
    let mockPage;
    let mockBrowser;

    beforeEach(() => {
        mockPage = {
            on: jest.fn(),
            setUserAgent: jest.fn(),
            setExtraHTTPHeaders: jest.fn(),
            setViewport: jest.fn(),
            setRequestInterception: jest.fn(),
            goto: jest.fn().mockResolvedValue(),
            waitForSelector: jest.fn().mockResolvedValue(),
            evaluate: jest.fn(),
            $: jest.fn().mockResolvedValue(null), // No next page by default
        };

        mockBrowser = {
            newPage: jest.fn().mockResolvedValue(mockPage),
            close: jest.fn().mockResolvedValue()
        };

        puppeteer.launch.mockResolvedValue(mockBrowser);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize browser with request interception enabled', async () => {
        // Return 0 deals so it exits quickly
        mockPage.evaluate.mockResolvedValue([]);
        
        await scrapeBrands(['Patagonia'], { targetDealCount: 5, maxPages: 1, minDiscount: 25 });
        
        expect(mockPage.setRequestInterception).toHaveBeenCalledWith(true);
        // We ensure the on('request') event listener was attached
        expect(mockPage.on).toHaveBeenCalledWith('request', expect.any(Function));
    });

    it('should extract and return deals formatted properly', async () => {
        const mockDeals = [
            { title: 'Cool Tent', link: 'https://amazon.com/dp/123', currentPrice: 50, listPrice: 100, discount: "50.00" }
        ];
        
        mockPage.evaluate.mockResolvedValue(mockDeals);
        
        const deals = await scrapeBrands(['Patagonia'], { targetDealCount: 5, maxPages: 1, minDiscount: 25 });
        
        expect(deals.length).toBe(1);
        expect(deals[0].title).toBe('Cool Tent');
        expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });

    it('should handle page timeouts gracefully without crashing', async () => {
        // Simulate a timeout during wait for selector
        mockPage.waitForSelector.mockRejectedValue(new Error('Timeout'));
        mockPage.evaluate.mockResolvedValue([]); // Should still return cleanly

        const deals = await scrapeBrands(['FailingBrand'], { targetDealCount: 5, maxPages: 1, minDiscount: 25 });
        
        expect(deals).toEqual([]);
        expect(mockBrowser.close).toHaveBeenCalledTimes(1); // Browser must close even on error
    });
});

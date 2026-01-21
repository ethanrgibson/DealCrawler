# Amazon Deal Crawler

A scraper to find outdoor gear deals on Amazon.

## Prerequisites
- Node.js installed
- Dependencies installed (`npm install`)

## Running the Crawler
1. **Default Mode** (Top Brands):
   ```bash
   npm start
   ```
   *Scrapes general "Outdoor Gear" top brands.*

2. **Specific Brands** (CLI Arguments):
   ```bash
   node crawler.js "North Face" "Patagonia"
   ```
   *Scrapes specific brands provided as arguments.*

## Output
- Deals found are saved to: `Deals/deals.txt`

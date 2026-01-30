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
   Scrapes specific brands provided as arguments. By default, searches are prefixed with "Outdoor Gear".
   ```bash
   node crawler.js "North Face" "Patagonia"
   ```
   
3. **Raw Brand Search** (No "Outdoor Gear" Prefix):
   Prepend `^` to a brand name to search for *exactly* that term without the "Outdoor Gear" prefix.
   ```bash
   node crawler.js "^Stanley" "^Yeti"
   ```
   *Useful for brands where "Outdoor Gear" might skew results.*

## Output
- Deals found are saved to: `Deals/deals.txt`

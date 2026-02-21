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

4. **Random Brand Search** (from MasterList):
   Randomly select a specified number of brands from `Brands/MasterList` that haven't been searched today.
   ```bash
   npm run random -- 3
   ```
   *This command tracks daily searches in `Brands/daily_searched.json` to prevent duplicates. To reset, delete this file.*

## Options

### Limiting Results (`--limit`)
You can limit the number of deals fetched per brand by appending `--limit <number>` to any command. The default is 15.

**Examples:**
```bash
npm start -- --limit 10
node crawler.js "Cotopaxi" --limit 5
npm run random -- 2 --limit 5
```

## Output
- Deals found are saved to: `Deals/deals.txt`

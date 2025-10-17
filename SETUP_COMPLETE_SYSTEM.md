# Complete 5-Step Sourdough Discovery System - Setup Guide

## 🎯 System Overview

I've completed your 5-step sourdough pizza discovery system! Here's what it does:

1. **Create Master List**: Searches city for "sourdough pizza" and "artisan pizza"
2. **Google Business Analysis**: Uses Outscraper API to search Google Business Profiles for your 4 keywords
3. **Website Scraping**: Scrapes restaurant websites for "sourdough", "naturally leavened", "wild yeast", "naturally fermented"
4. **Social Media Discovery**: Checks Instagram, Facebook, and Yelp profiles for keywords in bios
5. **Compile Results**: Adds verified sourdough restaurants to your interactive map

## 🚀 Quick Start

### Step 1: Get Your Outscraper API Key

1. Visit https://outscraper.com/
2. Sign up for a free account (includes 100 requests)
3. Get your API key from the dashboard

### Step 2: Set Up Environment Variables

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your API key:
   ```
   OUTSCRAPER_API_KEY=your_actual_api_key_here
   ```

### Step 3: Install Dependencies (if not already done)

```bash
npm install
```

### Step 4: Run the Discovery System

**Option A: Use the CLI script (Recommended)**
```bash
npx tsx run-discovery.ts "Portland" "OR"
npx tsx run-discovery.ts "San Francisco" "CA"
npx tsx run-discovery.ts "Austin" "TX"
```

**Option B: Use the API endpoint**
```bash
# Start your server first
npm run dev

# Then in another terminal, trigger discovery:
curl -X POST http://localhost:5000/api/admin/complete-discovery \
  -H "Content-Type: application/json" \
  -d '{"city": "Portland", "state": "OR"}'
```

**Option C: Run directly**
```bash
npx tsx server/complete-discovery-system.ts "Portland" "OR"
```

## 📊 Expected Results

The system will:
- Process 20-50 restaurants per city (depending on search results)
- Verify 10-25% as authentic sourdough (based on your requirements)
- Add ALL restaurants to your database (both sourdough and non-sourdough)
- Display results on your interactive map

## 🔧 Technical Details

### Files Created/Modified:

1. **`server/complete-discovery-system.ts`** - Main 5-step discovery engine
2. **`run-discovery.ts`** - Simple CLI interface
3. **`server/routes.ts`** - Added `/api/admin/complete-discovery` endpoint
4. **`.env.example`** - Environment variable template

### The Complete 5-Step Process:

```typescript
// Step 1: Create master list
const masterList = await this.createMasterList(city, state);

// For each restaurant in master list:
for (const restaurant of masterList) {
  // Step 2: Check Google Business Profile
  const businessResult = await this.searchGoogleBusinessProfile(restaurant);
  
  // Step 3: Scrape website
  const websiteResult = await this.scrapeWebsiteForKeywords(restaurant);
  
  // Step 4: Check social media
  const socialResult = await this.scrapeSocialMediaProfiles(restaurant);
  
  // Step 5: Compile and save
  await this.compileAndSaveResults(restaurant, businessResult, websiteResult, socialResult, city, state);
}
```

## 🎛️ Configuration

### Keywords Used:
- "sourdough"
- "naturally leavened" 
- "wild yeast"
- "naturally fermented"

### Rate Limiting:
- 1-3 second delays between API calls
- Respectful website scraping
- Built-in error handling and retries

### Success Criteria:
- Restaurants must have keywords in Google Business Profile, website, OR social media
- Multiple verification sources increase confidence scores
- All sources and keywords are tracked in database

## 🗺️ Viewing Results

After running discovery:

1. Start your application: `npm run dev`
2. Visit http://localhost:5000
3. Navigate the interactive map to see discovered restaurants
4. Pizza restaurants will show as orange markers
5. Click markers to see verification details and sources

## 🐛 Troubleshooting

### "API key required" error:
- Make sure `.env` file exists with `OUTSCRAPER_API_KEY`
- Check that your API key is valid at outscraper.com

### No restaurants found:
- Try a different city (major cities work best)
- Check console logs for API errors
- Verify internet connection

### Database errors:
- Ensure your database is running
- Check `DATABASE_URL` in `.env` if using external database

## 📈 Scaling Up

To run discovery on multiple cities:

```bash
# Run in sequence
npx tsx run-discovery.ts "San Francisco" "CA"
npx tsx run-discovery.ts "Los Angeles" "CA" 
npx tsx run-discovery.ts "San Diego" "CA"
npx tsx run-discovery.ts "Sacramento" "CA"
```

Or create a batch script for your target cities.

## 💡 Tips for Best Results

1. **Start with major food cities**: Portland, San Francisco, Austin, Chicago, New York
2. **Monitor your API usage**: Free tier = 100 requests, each city uses ~20-50 requests  
3. **Run during off-peak hours**: Better API response times
4. **Let it complete fully**: The 5-step process takes 20-40 minutes per city

## 🎉 You're Ready!

Your complete 5-step sourdough discovery system is now operational. The system will systematically find restaurants, verify their sourdough credentials through multiple sources, and populate your interactive map with authentic sourdough pizza locations.

Happy hunting for sourdough pizza! 🍕
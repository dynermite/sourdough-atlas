# 🚀 Quick Setup Guide - Get Running in 5 Minutes

## Option 1: Quick Test with Just API Key (Recommended)

### Step 1: Get Outscraper API Key
1. Go to https://outscraper.com/
2. Click "Sign Up" 
3. Use Google/GitHub sign-in for fastest setup
4. Go to dashboard → API → copy your API key

### Step 2: Add API Key to .env
Edit the `.env` file I created and replace:
```
OUTSCRAPER_API_KEY=your_actual_api_key_here
```

### Step 3: Test Discovery (Without Database)
I'll create a test version that shows results without saving to database:

```bash
npx tsx test-api-only.ts "San Diego" "CA"
```

## Option 2: Full Setup with Database

### Step 1: Get Neon Database (Free)
1. Go to https://neon.tech/
2. Sign up with GitHub
3. Create new project: "sourdough-atlas" 
4. Copy connection string from dashboard

### Step 2: Update .env
```
OUTSCRAPER_API_KEY=your_api_key_here
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

### Step 3: Run Migrations
```bash
npm run db:push
```

### Step 4: Run Full Discovery
```bash
npx tsx run-discovery.ts "San Diego" "CA"
```

## 🎯 Which Option Do You Want?

**Just tell me:**
- **"API only"** = I'll create a test that shows discovery results without database
- **"Full setup"** = I'll help you set up Neon database for complete system

Either way, you'll see the 5-step discovery system in action!
# Database Setup Guide

## ✅ What's Been Done

1. **Database Connection**: App is connected to Supabase
2. **Data Loading**: App loads gemstones from `public.gemstones` table
3. **Add Stone Feature**: Add Stone modal saves to `total_gemstones` table
4. **Data Priority**: Database stones are shown first, local fallback second

## 🚀 Quick Start - Insert 2 Test Stones

### Option 1: Node.js Script (Easiest)

```bash
# 1. Make sure you have .env file with:
# EXPO_PUBLIC_SUPABASE_URL=your_url
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key

# 2. Install dependencies (if needed)
npm install @supabase/supabase-js dotenv

# 3. Run the script
node scripts/insert_2_test_stones.js
```

### Option 2: Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy SQL from `supabase/insert_test_gemstones.sql`
3. Run the SQL
4. Verify in Table Editor that 2 stones exist

## 📊 Database Tables

### `public.gemstones` (Public stones)
- Stores public gemstone data
- `is_custom = false`
- Anyone can read
- Admin can write

### `total_gemstones` (User's custom stones)
- Stores user-created stones
- `user_id` links to auth user
- Only user can read/write their own

## 🔍 Verify It's Working

1. **Check Console Logs**:
   - Look for: `🔄 Loading gemstones from database...`
   - Should see: `✅ Loaded X gemstone(s) from database`
   - Should see: `📊 Database gemstones: Ruby, Sapphire`

2. **Check App**:
   - Open Gems screen
   - Should see Ruby and Sapphire in the list
   - Cards should show all properties (RI, SG, Price, etc.)

3. **Test Add Stone**:
   - Click + button
   - Fill form and save
   - Should see success message
   - New stone should appear in list
   - Check Supabase `total_gemstones` table

## 🐛 Troubleshooting

### No stones showing?
- Check Supabase connection in console
- Verify stones exist in `public.gemstones` table
- Check `is_custom = false` filter

### Add stone not working?
- Make sure you're logged in (required for custom stones)
- Check console for error messages
- Verify Supabase credentials in `app.json`

### Database connection error?
- Check `EXPO_PUBLIC_SUPABASE_URL` in `app.json`
- Check `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `app.json`
- Verify Supabase project is active

## 📝 Code Changes Made

1. **`loadGemstones()`**: Now prioritizes database, adds logging
2. **`allGems`**: Shows database stones first, local fallback
3. **`saveCustomGemstone()`**: Already connected, saves to `total_gemstones`
4. **Data conversion**: `convertDBGemstoneToApp()` handles database → app format

## ✅ Checklist

- [ ] 2 stones inserted into `public.gemstones` table
- [ ] App shows stones from database
- [ ] Add Stone modal saves to database
- [ ] Console shows database loading logs
- [ ] Stones appear with all properties (RI, SG, Price)




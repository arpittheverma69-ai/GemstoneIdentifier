# Supabase Setup Guide

This guide will help you set up Supabase for the Gemstone Identifier app.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: GemAI Pro (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient to start

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Run the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the SQL editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Verify all tables were created by checking the **Table Editor** tab

## Step 4: Set Up Storage Bucket

1. Go to **Storage** in the Supabase dashboard
2. You should see `gemstone-images` bucket (created by the schema)
3. If not, create it manually:
   - Click "New bucket"
   - Name: `gemstone-images`
   - Make it **Public**
   - Click "Create bucket"

## Step 5: Configure Environment Variables

### Option A: Using Expo Constants (Recommended for Expo)

1. Create or update `app.json`:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "YOUR_SUPABASE_URL",
      "supabaseAnonKey": "YOUR_SUPABASE_ANON_KEY"
    }
  }
}
```

### Option B: Using .env file (For development)

1. Create a `.env` file in the root directory:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. Install `expo-constants` if not already installed:
```bash
npm install expo-constants
```

3. Add `.env` to `.gitignore` to keep your keys secure

### Option C: Using Environment Variables (Production)

Set environment variables in your deployment platform:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Step 6: Seed Initial Data (Optional)

You can populate the database with initial gemstone data:

1. Go to **Table Editor** → `gemstones`
2. Click "Insert" → "Insert row"
3. Manually add gemstones or use the SQL editor to bulk insert

Example SQL for inserting a gemstone:

```sql
INSERT INTO public.gemstones (
  variety, chemical_composition, crystal_system, colors,
  category, hardness, ri_min, ri_max, sg_min, sg_max
) VALUES (
  'Ruby',
  'Al2O3',
  'Trigonal',
  ARRAY['Red', 'Pink'],
  'Precious',
  9,
  1.76,
  1.78,
  3.97,
  4.05
);
```

## Step 7: Test the Connection

1. Start your app: `npm start`
2. The app should now connect to Supabase
3. Try adding a custom gemstone to verify the connection works

## Troubleshooting

### "Supabase client not initialized"
- Check that your environment variables are set correctly
- Verify the URL and anon key are correct
- Restart your development server after adding env vars

### "Row Level Security policy violation"
- Make sure you've run the schema SQL
- Check that RLS policies are enabled
- Verify you're authenticated if trying to insert custom data

### "Storage bucket not found"
- Create the `gemstone-images` bucket manually
- Make sure it's set to public
- Check bucket policies in Storage settings

### Images not uploading
- Verify storage bucket exists and is public
- Check that storage policies allow authenticated uploads
- Ensure image URIs are valid

## Security Notes

- The `anon` key is safe to use in client-side code (it's public)
- Row Level Security (RLS) protects your data
- Never commit your `service_role` key to version control
- Use environment variables for sensitive data

## Next Steps

- Set up authentication screens (sign up, sign in)
- Add user profile management
- Implement offline sync if needed
- Set up real-time subscriptions for collaborative features

## Support

For more help:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- Check the app logs for specific error messages


# Expo Deployment Guide - GemAI Pro

This guide will help you deploy your app to Expo.

## Prerequisites

1. **Expo Account**: Sign up at [expo.dev](https://expo.dev) if you don't have one
2. **EAS CLI**: Install the Expo Application Services CLI

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

## Step 2: Login to Expo

```bash
eas login
```

Enter your Expo account credentials (or create one if needed).

## Step 3: Verify Configuration

Your `app.json` and `eas.json` are already configured. Verify:
- ✅ Project ID: `0475a416-d77c-4053-9616-de37b557b5ab`
- ✅ Bundle ID (iOS): `com.gemaipro.app`
- ✅ Package (Android): `com.gemaipro.app`
- ✅ Owner: `arpitwillgetit`

## Step 4: Choose Deployment Method

### Option A: Development Build (For Testing)

Share with Expo Go app - instant sharing:

```bash
# Start development server
npm start
# or
npx expo start
```

Then:
- Scan QR code with Expo Go app (iOS/Android)
- Share the link with others

### Option B: Preview Build (APK/IPA - Shareable)

Build standalone apps you can share directly:

#### For Android (APK):
```bash
eas build --platform android --profile preview
```

This creates an APK file you can:
- Download from the build page
- Share via email/WhatsApp
- Install on any Android device

#### For iOS (IPA):
```bash
eas build --platform ios --profile preview
```

This creates an IPA file for:
- TestFlight distribution
- Direct install on registered devices

### Option C: Production Build (App Stores)

#### For Google Play Store:
```bash
eas build --platform android --profile production
```

After build completes:
```bash
eas submit --platform android --profile production
```

#### For Apple App Store:
```bash
eas build --platform ios --profile production
```

After build completes:
```bash
eas submit --platform ios --profile production
```

**Note**: You'll need:
- **iOS**: Apple Developer Account ($99/year)
- **Android**: Google Play Developer Account ($25 one-time)

### Option D: Over-the-Air Updates (OTA)

Deploy updates instantly without rebuilding:

```bash
# Publish an update
eas update --branch production --message "Initial release"
```

This updates the app for users who already have it installed.

## Step 5: Monitor Builds

Check build status:
```bash
eas build:list
```

View build details:
- Visit [expo.dev](https://expo.dev)
- Go to your project
- Click on "Builds" tab

## Step 6: Share Your App

### With Expo Go:
1. Run `npm start`
2. Share the QR code or link
3. Users scan with Expo Go app

### With Preview Build:
1. Build APK/IPA using preview profile
2. Download from build page
3. Share the file directly

### With Production Build:
1. Submit to app stores
2. Wait for approval
3. App goes live on stores

## Troubleshooting

### Build Fails?
- Check `eas.json` configuration
- Verify `app.json` has all required fields
- Check Expo dashboard for error logs

### Can't Login?
```bash
eas logout
eas login
```

### Need to Update Configuration?
```bash
eas build:configure
```

## Quick Commands Reference

```bash
# Login
eas login

# Start dev server
npm start

# Build Android APK
eas build --platform android --profile preview

# Build iOS IPA
eas build --platform ios --profile preview

# Build Production
eas build --platform all --profile production

# Submit to stores
eas submit --platform android --profile production
eas submit --platform ios --profile production

# Publish OTA update
eas update --branch production --message "Update description"

# Check builds
eas build:list

# View project
eas project:info
```

## Next Steps

1. **Test with Expo Go first** - Make sure everything works
2. **Build preview version** - Test on real devices
3. **Submit to stores** - Make it publicly available

For more help, visit: [docs.expo.dev](https://docs.expo.dev)



# Deployment Guide - Making GemAI Pro Public

This guide covers all the ways to make your app publicly available.

## 🚀 Quick Start Options

### Option 1: Expo Go (Easiest - For Testing)
Share your app instantly with anyone using Expo Go app.

```bash
# Start development server
npm start

# Scan QR code with Expo Go app (iOS/Android)
# Or share the link: exp://your-ip:8081
```

**Pros:** Instant sharing, no build needed  
**Cons:** Requires Expo Go app, limited to development builds

---

### Option 2: Expo Updates (Over-the-Air Updates)
Deploy updates instantly without app store approval.

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Publish update
eas update --branch production --message "Initial release"
```

**Pros:** Instant updates, no app store wait  
**Cons:** Still need initial build from app stores

---

## 📱 App Store Deployment

### iOS App Store

#### Prerequisites
- Apple Developer Account ($99/year)
- Mac computer (for building)
- Xcode installed

#### Steps

1. **Install EAS CLI**
```bash
npm install -g eas-cli
eas login
```

2. **Configure EAS Build**
```bash
eas build:configure
```

3. **Create `eas.json`** (if not exists)
```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "bundleIdentifier": "com.gemaipro.app"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-email@example.com",
        "ascAppId": "your-app-store-connect-id",
        "appleTeamId": "your-team-id"
      }
    }
  }
}
```

4. **Build for iOS**
```bash
eas build --platform ios --profile production
```

5. **Submit to App Store**
```bash
eas submit --platform ios --profile production
```

6. **Update app.json** (add required fields)
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.gemaipro.app",
      "buildNumber": "1",
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "We need access to your photos to upload gemstone images.",
        "NSCameraUsageDescription": "We need access to your camera to take photos of gemstones."
      }
    }
  }
}
```

---

### Google Play Store

#### Prerequisites
- Google Play Developer Account ($25 one-time)
- Android app signing key

#### Steps

1. **Install EAS CLI** (if not done)
```bash
npm install -g eas-cli
eas login
```

2. **Update `eas.json`** (add Android config)
```json
{
  "build": {
    "production": {
      "android": {
        "package": "com.gemaipro.app"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./path-to-service-account.json",
        "track": "internal" // or "alpha", "beta", "production"
      }
    }
  }
}
```

3. **Build for Android**
```bash
eas build --platform android --profile production
```

4. **Submit to Play Store**
```bash
eas submit --platform android --profile production
```

5. **Update app.json** (add required fields)
```json
{
  "expo": {
    "android": {
      "package": "com.gemaipro.app",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

---

## 🌐 Web Deployment

Deploy as a Progressive Web App (PWA).

### Option A: Vercel (Recommended)

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Build for web**
```bash
npx expo export:web
```

3. **Deploy**
```bash
vercel
```

4. **Or connect GitHub repo**
- Go to [vercel.com](https://vercel.com)
- Import your repository
- Build command: `npx expo export:web`
- Output directory: `web-build`

### Option B: Netlify

1. **Build for web**
```bash
npx expo export:web
```

2. **Deploy**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=web-build
```

### Option C: GitHub Pages

1. **Update `app.json`**
```json
{
  "expo": {
    "web": {
      "output": "static",
      "baseUrl": "/gemaid-pro"
    }
  }
}
```

2. **Build and deploy**
```bash
npx expo export:web
# Then push web-build folder to gh-pages branch
```

---

## 🔐 Security Checklist Before Going Public

### 1. Remove Sensitive Data from Code
- ✅ Supabase keys are in `app.json` (safe - anon key is public)
- ✅ No hardcoded secrets
- ✅ Use environment variables for sensitive data

### 2. Update App Information
```json
{
  "expo": {
    "name": "GemAI Pro",
    "description": "Professional gemstone identification and business management app",
    "version": "1.0.0",
    "privacy": "public"
  }
}
```

### 3. Add Privacy Policy & Terms
- Create privacy policy page
- Add terms of service
- Update app.json with privacy policy URL

### 4. Configure Supabase for Production
- ✅ Enable Row Level Security (already done)
- ✅ Review storage bucket policies
- ✅ Set up rate limiting if needed
- ✅ Enable email confirmations for signups

### 5. Test Production Build
```bash
# Test iOS build locally
eas build --platform ios --profile preview --local

# Test Android build locally  
eas build --platform android --profile preview --local
```

---

## 📋 Pre-Launch Checklist

- [ ] Update app version in `app.json`
- [ ] Add app description and screenshots
- [ ] Test on real devices (iOS & Android)
- [ ] Test authentication flow
- [ ] Test image uploads
- [ ] Test offline functionality
- [ ] Add app icon and splash screen
- [ ] Write app store description
- [ ] Prepare screenshots (required sizes)
- [ ] Set up analytics (optional)
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Test with multiple users
- [ ] Review Supabase usage limits
- [ ] Set up monitoring/alerts

---

## 🎨 App Store Assets Needed

### iOS App Store
- App Icon: 1024x1024px
- Screenshots: 
  - iPhone 6.7" (1290x2796)
  - iPhone 6.5" (1242x2688)
  - iPad Pro 12.9" (2048x2732)
- App Preview Video (optional)

### Google Play Store
- App Icon: 512x512px
- Feature Graphic: 1024x500px
- Screenshots:
  - Phone: 1080x1920 or higher
  - Tablet: 1200x1920 or higher
- Promo Video (optional)

---

## 🔄 Continuous Deployment

### Set up GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: eas update --branch production --message "${{ github.event.head_commit.message }}"
```

---

## 📊 Monitoring & Analytics

### Recommended Tools
- **Sentry**: Error tracking
- **Expo Analytics**: Built-in analytics
- **Firebase Analytics**: Advanced analytics
- **Supabase Dashboard**: Monitor database usage

---

## 💰 Cost Considerations

### Free Tiers Available
- **Expo**: Free for development
- **Supabase**: Free tier (500MB database, 1GB storage)
- **Vercel**: Free for personal projects
- **Netlify**: Free tier available

### Paid Services (if needed)
- **Apple Developer**: $99/year
- **Google Play**: $25 one-time
- **Supabase Pro**: $25/month (if you exceed free tier)
- **EAS Build**: Pay-as-you-go or subscription

---

## 🆘 Troubleshooting

### Build Fails
```bash
# Clear cache
expo start -c
eas build:configure --clear-cache
```

### App Crashes on Launch
- Check Supabase connection
- Verify environment variables
- Review error logs in Expo dashboard

### Images Not Loading
- Check Supabase storage bucket permissions
- Verify image URLs are public
- Check CORS settings

---

## 📞 Support Resources

- [Expo Documentation](https://docs.expo.dev)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Supabase Docs](https://supabase.com/docs)
- [React Native Docs](https://reactnative.dev)

---

## 🎯 Recommended Deployment Path

1. **Start**: Test with Expo Go
2. **Next**: Build preview builds for testers
3. **Then**: Deploy to web (Vercel/Netlify)
4. **Finally**: Submit to app stores

Good luck with your launch! 🚀



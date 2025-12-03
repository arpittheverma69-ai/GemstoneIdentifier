# GemAI Pro - Gemstone Identification & Business Management App

## Overview
GemAI Pro is a comprehensive mobile application built with Expo/React Native for professional gemologists and jewelry businesses. The app provides AI-powered gemstone identification, a detailed gem database encyclopedia, inventory/order management tools, and professional certificate generation.

## Current State
- **Status**: Complete and functional
- **Platform**: Expo (iOS, Android, Web)
- **Design**: iOS 26 Liquid Glass UI with Deep Purple (#6B46C1) primary color and Gold (#D4AF37) secondary accent

## Project Structure

### Navigation (4 Tabs)
1. **Identify** - Gemstone identification lab with photo upload and property input
2. **Database** - Comprehensive gemstone encyclopedia (20+ stones)
3. **Business** - Inventory, orders, customers, and dealer directory
4. **Certificate** - Professional certificate generator with preview and share

### Key Files
```
/app                       # Expo Router app entry
/constants
  ├── theme.ts             # Design tokens, colors, typography, spacing
  └── gemstoneData.ts      # 20+ gemstones with full gemological data
/components
  ├── Card.tsx             # Reusable card with spring animations
  ├── Input.tsx            # Styled text input with label/error
  ├── Dropdown.tsx         # Modal-based dropdown selector
  ├── ChipSelect.tsx       # Multi-select chip component
  ├── Button.tsx           # Primary/secondary/outline variants
  └── FloatingActionButton.tsx
/screens
  ├── IdentificationLabScreen.tsx  # Photo + property inputs + results
  ├── GemDatabaseScreen.tsx        # Searchable gem list + detail modal
  ├── BusinessHubScreen.tsx        # Inventory/orders/customers/tools
  └── CertificateScreen.tsx        # Certificate form + preview
/navigation
  ├── MainTabNavigator.tsx
  ├── IdentificationStackNavigator.tsx
  ├── DatabaseStackNavigator.tsx
  ├── BusinessStackNavigator.tsx
  └── CertificateStackNavigator.tsx
```

## Features

### Identification Lab
- Photo upload (camera/gallery) with expo-image-picker
- Collapsible sections for Physical, Optical, Structural, Special properties
- Numeric inputs for RI, SG, Hardness with monospace font
- Dropdowns for Color, Transparency, Luster, Crystal System
- Multi-select chips for inclusions
- Floating action button to analyze
- Results modal with confidence percentage, matching reasons, gemological data, treatments, simulants, origins, price range

### Gem Database
- 20+ gemstones including Ruby, Sapphire, Emerald, Diamond, etc.
- Search by name or Indian name
- Category filter (All, Precious, Semi-precious, Organic)
- Detail modal with 4 tabs: Properties, Formation, Market, Testing
- Full gemological data: RI, SG, hardness, crystal system, pleochroism, inclusions, UV response
- Testing guide steps for each stone
- Price ranges in INR and USD

### Business Hub
- Dashboard stats (inventory value, pending orders, estimated profit)
- Inventory management with add/delete functionality
- Order tracking with status filters (all/pending/completed/cancelled)
- Customer list with contact info
- Dealer directory by city (Mumbai, Jaipur, Bangkok, Chanthaburi)
- Quick tool cards (WhatsApp Templates, Reel Scripts)

### Certificate Generator
- Auto-generated certificate number
- Stone information (name, weight, color)
- Dimensions (L x W x D in mm)
- Gemological data (RI, SG)
- Characteristics (inclusions, treatment, origin)
- Additional comments field
- Professional preview with logo, QR placeholder, signature line
- Share functionality

## Design Tokens
- **Primary**: Deep Purple (#6B46C1)
- **Secondary**: Gold (#D4AF37)
- **Success**: Emerald (#059669)
- **Warning**: Amber (#D97706)
- **Danger**: Ruby (#DC2626)
- **Border Radius**: 4px (xs), 6px (sm), 10px (md), 14px (lg), 9999px (full)
- **Spacing**: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px

## User Preferences
- Professional gemologist aesthetic
- No authentication required (local data only)
- In-memory storage for prototype
- Indian market focus (INR prices, Indian gem names)

## Running the App
- Start: `npm run dev`
- Web: Opens automatically at localhost:8081
- Mobile: Scan QR code with Expo Go app

## Recent Changes
- Created complete 4-tab navigation structure
- Implemented all screens with full functionality
- Added 20+ gemstones to database with comprehensive data
- Created reusable UI components with spring animations
- Added photo upload capability with expo-image-picker

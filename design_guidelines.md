# GemAI Pro - Design Guidelines

## Authentication Architecture
**No authentication required** - This is a professional tool for gemologists with local data storage.

**Profile/Settings Screen:**
- User avatar (generate 2 preset gemologist-themed avatars: one with a loupe icon, one with a gemstone icon)
- Display name field for gemologist/business name
- Preferences: measurement units (metric/imperial), default currency (INR/USD), language
- Data backup/restore options

## Navigation Architecture

**Tab Navigation (4 tabs):**
1. **Identification Lab** (Tab 1) - Primary feature, home screen
2. **Gem Database** (Tab 2) - Encyclopedia of gemstones
3. **Business Hub** (Tab 3) - Inventory & orders management
4. **Certificate Generator** (Tab 4) - Professional certificate creation

**No drawer needed** - All features accessible via tabs. Settings accessible from Business Hub tab.

## Screen Specifications

### Tab 1: Identification Lab
**Purpose:** Input gemological data and receive AI-powered identification results

**Layout:**
- **Header:** Transparent, title "Identification Lab", right button for "History"
- **Main content:** ScrollView with top inset = headerHeight + Spacing.xl, bottom inset = tabBarHeight + Spacing.xl
- **Floating action button:** "Analyze" button (bottom-right, above tab bar with elevation shadow)

**Components:**
- Photo upload section (top) - Large rectangular area with camera icon, "Upload Photo" text
- Collapsible input sections with cards:
  - Physical Properties (RI min/max, SG, Hardness)
  - Optical Properties (Color picker, Transparency dropdown, Luster, Pleochroism)
  - Structural Properties (Crystal system, Cleavage, Fracture)
  - Special Characteristics (UV response, Inclusions multi-select)
- Results modal (full-screen) with sections:
  - Confidence score (large circular progress indicator)
  - Identified stone name with image
  - Probability breakdown (primary/secondary matches)
  - Full gemological properties (expandable accordions)
  - Treatments & simulants (warning-styled cards)
  - Origin predictions with map visualization
  - Price range with currency toggle
  - Quick actions: Save to inventory, Generate certificate

### Tab 2: Gem Database
**Purpose:** Browse comprehensive gemstone encyclopedia

**Layout:**
- **Header:** Default, title "Gem Database", search bar integrated
- **Main content:** FlatList with search filter, top inset = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl

**Components:**
- Search bar (sticky, filters by name/type)
- Gem category chips (filter: Precious, Semi-precious, Organic, etc.)
- List items with:
  - Gemstone thumbnail (left, 60x60)
  - Name & chemical formula
  - Indian market name (subtitle)
  - Right arrow for details

**Detail Screen (Stack navigation):**
- Hero image of gemstone (full-width)
- Tabs within screen: Properties, Formation, Market, Testing
- Each tab shows formatted data from master database
- Properties tab displays all scientific data in labeled rows
- Market tab shows price ranges with bar chart
- Testing tab provides step-by-step manual identification guide

### Tab 3: Business Hub
**Purpose:** Manage inventory, customers, and orders

**Layout:**
- **Header:** Default, title "Business Hub", right button "Settings"
- **Main content:** ScrollView with sections, top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl

**Sections (card-based dashboard):**
1. Quick Stats (3 cards in row: Total Inventory Value, Pending Orders, Monthly Profit)
2. Inventory Management:
   - "Add Gemstone" button (prominent, primary color)
   - List of inventory items with thumbnail, name, grade, cost/selling price
   - Each item swipeable for Edit/Delete
3. Customer Database:
   - Search bar
   - List with customer name, last order date
   - Tap to view order history
4. Order Management:
   - Filter chips: Pending, Completed, Cancelled
   - Order cards with customer, items, total, status
5. Tools section:
   - WhatsApp templates button
   - Instagram reel script generator
   - Dealer directory (expandable list by location)

**Inventory Detail Form:**
- Photo upload (multiple images support)
- Stone name (autocomplete from database)
- Weight, dimensions (carat, mm)
- Grade dropdown
- Cost price input
- Auto-suggested selling price (calculated field, editable)
- Notes textarea
- Submit button in header (right)

### Tab 4: Certificate Generator
**Purpose:** Create professional gemstone certificates

**Layout:**
- **Header:** Default, title "Certificate Generator", right "Preview"
- **Main content:** Scrollable form, top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl
- **Submit button:** In header as "Generate"

**Form Fields (styled as labeled inputs):**
- Stone name (autocomplete)
- Weight (number input with carat/gram toggle)
- Dimensions (3 fields: length/width/depth)
- Color (color picker + text description)
- RI range (min/max)
- SG value
- Inclusions (multi-select chips)
- Treatment (dropdown with None/Heat/Filling/etc.)
- Origin (autocomplete)
- Comments (textarea)
- Certificate number (auto-generated, editable)

**Preview Modal:**
- Professional A4 layout preview
- Header with logo placeholder
- All fields formatted in labeled sections
- QR code (bottom-right)
- Digital signature placeholder
- Share buttons: Save as PDF, Share via WhatsApp/Email

## Visual Design System

**Color Palette:**
- **Primary:** Deep Purple (#6B46C1) - represents luxury, gemstones
- **Secondary:** Gold/Amber (#F59E0B) - premium feel, complements purple
- **Success:** Emerald Green (#10B981) - positive confirmations, profits
- **Warning:** Topaz Yellow (#F59E0B) - treatments, alerts
- **Danger:** Ruby Red (#EF4444) - destructive actions
- **Background:** Light Gray (#F9FAFB) for cards, White (#FFFFFF) for main
- **Text:** Charcoal (#1F2937) for primary, Gray (#6B7280) for secondary

**Typography:**
- **Headings:** SF Pro Display (iOS) / Roboto (Android), Bold, 24-28px
- **Subheadings:** SF Pro Text / Roboto Medium, 16-18px
- **Body:** SF Pro Text / Roboto Regular, 14-16px
- **Labels:** SF Pro Text / Roboto Medium, 12-14px, uppercase for field labels
- **Data values:** SF Pro Mono / Roboto Mono, 14px for scientific data (RI, SG)

**Component Styling:**
- **Cards:** White background, border-radius 12px, subtle shadow (shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: {width: 0, height: 2})
- **Buttons:**
  - Primary: Purple background, white text, border-radius 8px, 48px height
  - Secondary: White background, purple border, purple text
  - Text-only: No background, purple text
  - ALL buttons have press feedback (opacity: 0.7 on press)
- **Input Fields:** Light gray background (#F3F4F6), border-radius 8px, 16px padding, focused state has purple border
- **Floating Action Button:** 56x56 circle, purple background, white icon, shadow: {width: 0, height: 2, opacity: 0.10, radius: 2}
- **Tab Bar:** White background, icons with purple active tint, gray inactive tint

**Icons:**
- Use Feather icons from @expo/vector-icons
- Identification Lab: search or aperture
- Gem Database: book-open or database
- Business Hub: briefcase or trending-up
- Certificate: award or file-text
- Additional icons: camera, upload-cloud, map-pin, users, package

**Critical Assets to Generate:**
1. **2 Gemologist Avatar Presets:** Circular, 120x120px, professional aesthetic (loupe icon, gemstone icon)
2. **20+ Gemstone Images:** Photorealistic, 400x400px, for database (Ruby, Sapphire, Emerald, Diamond, Topaz, Spinel, Garnet, Tourmaline, Zircon, Amethyst, Citrine, Peridot, Opal, Aquamarine, Tanzanite, Alexandrite, Moonstone, Jade, Turquoise, Lapis Lazuli)
3. **Certificate Template Background:** Subtle watermark pattern, A4 proportions
4. **Logo Placeholder:** "GemAI Pro" text-based logo with gemstone accent

**Accessibility:**
- Minimum touch target: 44x44 points
- Color contrast ratio: 4.5:1 for text, 3:1 for UI components
- VoiceOver/TalkBack support for all interactive elements
- Labeled form inputs with clear error states
- Support for Dynamic Type (iOS) / Font scaling (Android)

**Safe Area Insets:**
- Screens with tab bar: bottom = tabBarHeight + 20px
- Screens with transparent header: top = headerHeight + 20px
- Floating elements: maintain 16px from edges + safe area insets
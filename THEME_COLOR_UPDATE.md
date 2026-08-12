# Dynamic Theme Color Implementation

## Overview
Both the **login page** and **offer details page** now use the dynamic theme color from the campaign API response instead of a hardcoded value.

## API Response Structure
```json
{
  "data": {
    "campaignDetails": {
      "metadata": {
        "theme": {
          "backgroundColor": {
            "dark": "#207cdf",
            "light": "#b21515"
          }
        }
      }
    }
  }
}
```

## Implementation

### Files Updated:
1. `src/app/login/page.tsx`
2. `src/app/offer/[id]/OfferDetailsClient.tsx`

**Before:**
```tsx
style={{
  background: "linear-gradient(180deg, #310A6C 0%, rgba(49, 10, 108, 0) 100%), #0c0b0a",
  minHeight: "100vh",
}}
```

**After:**
```tsx
// Extract theme color from API
const themeColor = metadata?.theme?.backgroundColor?.dark || "#310A6C";

// Use in style
style={{
  background: `linear-gradient(180deg, ${themeColor} 0%, rgba(49, 10, 108, 0) 100%), #0c0b0a`,
  minHeight: "100vh",
}}
```

## Features
- ✅ Uses `metadata.theme.backgroundColor.dark` from API response
- ✅ Falls back to `#310A6C` (default purple) if theme is not provided
- ✅ Updates dynamically based on campaign
- ✅ Works with all existing campaigns
- ✅ Consistent branding across login and offer pages

## Example Campaigns

### Campaign 1: Monsoon 20% Off (Pauket P1)
- Theme Color: `#207cdf` (Blue)
- Campaign ID: `p1-monsoon-20per-off`
- Background: Blue gradient on both login and offer pages

### Default/Fallback
- Theme Color: `#310A6C` (Purple)
- Used when campaign has no theme or API fails
- Background: Purple gradient (original)

## User Flow with Dynamic Theme

### Journey:
1. User lands on `/offer/p1-monsoon-20per-off`
   - Sees **blue gradient** background (from theme color `#207cdf`)
   
2. User clicks "LOGIN TO REDEEM OFFER"
   - Redirects to `/login?pending_campaign_id=p1-monsoon-20per-off`
   - Sees **same blue gradient** background (consistent branding)
   
3. User completes OTP and proceeds to payment
   - Campaign pricing and theme are maintained throughout

## Testing
1. Visit offer page with campaign ID that has theme color → sees campaign's color
2. Click login from offer page → sees same campaign color on login page
3. Visit pages with campaign ID without theme → sees default purple
4. Visit pages without campaign ID → sees default purple
5. API fails to load → sees default purple (graceful fallback)

## Benefits
- ✅ Campaign-specific branding throughout the flow
- ✅ No code changes needed for new campaigns
- ✅ Consistent with API-driven design
- ✅ Backward compatible with existing flows
- ✅ Improved user experience with consistent theming

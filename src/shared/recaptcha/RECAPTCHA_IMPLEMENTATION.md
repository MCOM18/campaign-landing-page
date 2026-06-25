# Google reCAPTCHA v3 Implementation

## Overview
This document describes the Google reCAPTCHA v3 (silent/invisible) integration following the existing layered architecture pattern.

## Architecture

```
UI → Hook → Service → API → Backend
```

### Key Principles
- ✅ **NO package wrappers** - Uses Google reCAPTCHA v3 script directly
- ✅ **Backend owns all decisions** - Frontend only generates and sends tokens
- ✅ **NO graceful degradation** - Registration blocked if captcha fails
- ✅ **Follows existing patterns** - Matches social login script loading approach
- ✅ **SSR safe** - Handles server-side rendering correctly

## File Structure

```
shared/
  recaptcha/
    recaptcha.types.ts       # TypeScript types and enums
    recaptcha.client.ts      # Script loading and token generation
    RECAPTCHA_IMPLEMENTATION.md

features/
  auth/
    api/
      verifyCaptcha.ts       # API call to backend
    services/
      captcha.service.ts     # Orchestration layer
    hooks/
      useCaptcha.ts          # React Query hook

app/
  register/
    useRegisterSubmit.ts     # Integration point

enums/
  api.enum.ts                # Added VERIFY_CAPTCHA endpoint

lib/
  config/
    env.ts                   # Added NEXT_PUBLIC_RECAPTCHA_SITE_KEY
```

## Environment Configuration

### Required Environment Variables

```bash
# .env.development
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_development_site_key

# .env.production
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_production_site_key
```

### Configuration File
Location: `lib/config/env.ts`

```typescript
export const env = {
  // ... other env vars
  recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "",
};
```

## Implementation Details

### 1. Types (`shared/recaptcha/recaptcha.types.ts`)

Defines:
- Window grecaptcha typing
- `RecaptchaAction` enum (REGISTER, LOGIN, OTP_SUBMIT, CREATE_PROFILE)
- Request/Response interfaces

### 2. Client (`shared/recaptcha/recaptcha.client.ts`)

**Responsibilities:**
- Load Google reCAPTCHA script (singleton)
- Execute reCAPTCHA to get token
- Prevent duplicate script injection
- SSR safe

**Key Functions:**
- `loadRecaptchaScript()` - Loads script once
- `executeRecaptcha(action)` - Gets token from Google
- `isRecaptchaLoaded()` - Check if loaded

**Features:**
- Promise-based loading
- Script ID tracking
- Logger integration
- Reuses existing logger

### 3. API Layer (`features/auth/api/verifyCaptcha.ts`)

**Responsibilities:**
- Call backend endpoint: `POST /jojo/verify-captcha`
- Send token and action
- Return raw API response

**Pattern:**
```typescript
await verifyCaptcha({ token, action }, sessionId)
```

### 4. Service Layer (`features/auth/services/captcha.service.ts`)

**Responsibilities:**
- Orchestrate: executeRecaptcha → verifyCaptcha API
- Handle errors
- Return backend decision

**Flow:**
1. Execute reCAPTCHA to get token from Google
2. Send token to backend for verification
3. Return backend result (backend owns all validation)

**Pattern:**
```typescript
await verifyCaptchaFlow(action, sessionId)
```

### 5. Hook Layer (`features/auth/hooks/useCaptcha.ts`)

**Responsibilities:**
- React Query wrapper
- Loading state management
- Call service layer
- NO UI logic (no toast)

**Pattern:**
```typescript
const verifyCaptcha = useCaptcha();
await verifyCaptcha.mutateAsync({ action: RecaptchaAction.REGISTER });
```

### 6. Registration Integration (`app/register/useRegisterSubmit.ts`)

**Flow:**
1. Load reCAPTCHA script on mount
2. On form submit:
   - **Step 1:** Verify captcha FIRST
   - **Step 2:** Check if user exists
   - **Step 3:** Send OTP if new user

**Critical Rules:**
- Captcha verification happens BEFORE any other action
- If captcha fails, flow stops (NO graceful degradation)
- Loading state includes captcha verification

## Backend Contract

### Endpoint
```
POST /jojo/verify-captcha
```

### Request
```typescript
{
  token: string;    // Token from Google reCAPTCHA
  action: string;   // Action being performed (e.g., "REGISTER")
}
```

### Response
```typescript
{
  metaData: {
    status: number;
    message: string;
  };
  data: {
    success: boolean;
    message?: string;
  };
}
```

### Backend Responsibilities
- ✅ Verify token with Google
- ✅ Validate score (threshold logic)
- ✅ Allow/block decision
- ✅ Return success/failure

### Frontend Responsibilities
- ✅ Load reCAPTCHA script
- ✅ Generate token
- ✅ Send token to backend
- ❌ NO score validation
- ❌ NO threshold logic
- ❌ NO allow/block decision

## Actions

Currently implemented:
- ✅ **REGISTER** - Registration flow

Prepared for future:
- ⏳ **LOGIN** - Login flow
- ⏳ **OTP_SUBMIT** - OTP submission
- ⏳ **CREATE_PROFILE** - Profile creation

## Error Handling

### Client Errors
- Script loading failure
- Token generation failure
- Network errors

### Backend Errors
- Verification failure (low score)
- Invalid token
- Server errors

### User Experience
- Errors mapped to `ErrorKey` enum
- Displayed via existing error system
- NO silent failures
- NO graceful degradation

## Logging

All logs use existing logger:
```
[reCAPTCHA] Script loading...
[reCAPTCHA] Script loaded successfully
[reCAPTCHA] Executing reCAPTCHA for action: REGISTER
[reCAPTCHA] Token received
[Captcha Service] Starting verification flow
[Captcha Service] Verification successful
```

## SSR Safety

- ✅ Checks `typeof window === 'undefined'`
- ✅ No document access during SSR
- ✅ Script loads client-side only
- ✅ No hydration issues

## Testing Checklist

### Development Testing
- [ ] Script loads correctly
- [ ] Token generation works
- [ ] Backend verification succeeds
- [ ] Registration flow completes
- [ ] Error handling works
- [ ] Loading states display correctly

### Production Testing
- [ ] Production site key configured
- [ ] Script loads from Google CDN
- [ ] Backend verification works
- [ ] Performance acceptable
- [ ] No console errors

### Edge Cases
- [ ] Network failure during token generation
- [ ] Backend verification failure
- [ ] Script loading timeout
- [ ] Multiple rapid submissions
- [ ] SSR/hydration scenarios

## Security Considerations

1. **Site Key Exposure**: Public site key is safe to expose (it's public by design)
2. **Token Validation**: Backend MUST validate every token with Google
3. **Score Thresholds**: Backend MUST enforce score thresholds
4. **No Client-Side Bypass**: Frontend MUST NOT allow bypass if captcha fails

## Future Enhancements

### Phase 2: Login Flow
Add captcha to login page:
```typescript
await verifyCaptcha.mutateAsync({ action: RecaptchaAction.LOGIN });
```

### Phase 3: OTP Submit
Add captcha to OTP verification:
```typescript
await verifyCaptcha.mutateAsync({ action: RecaptchaAction.OTP_SUBMIT });
```

### Phase 4: Profile Creation
Add captcha to profile creation:
```typescript
await verifyCaptcha.mutateAsync({ action: RecaptchaAction.CREATE_PROFILE });
```

## Troubleshooting

### Script Not Loading
- Check `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is set
- Check network tab for script request
- Check console for errors

### Token Generation Fails
- Verify site key is correct
- Check Google reCAPTCHA admin console
- Verify domain is whitelisted

### Backend Verification Fails
- Check backend logs
- Verify backend has secret key
- Check token is sent correctly

### SSR Errors
- Verify `typeof window` checks
- Check script loads client-side only
- Verify no document access during SSR

## References

- [Google reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- Existing social login implementation: `features/auth/providers/`
- Existing script loading: `features/auth/providers/loadScript.ts`

## Maintenance

### Adding New Actions
1. Add action to `RecaptchaAction` enum
2. Integrate in target flow (same pattern as REGISTER)
3. Update backend to handle new action
4. Test thoroughly

### Updating Site Keys
1. Update `.env.development` and `.env.production`
2. Restart development server
3. Redeploy production

### Monitoring
- Monitor backend logs for verification failures
- Track captcha failure rates
- Monitor user complaints about blocking
- Adjust backend thresholds if needed (backend-only change)

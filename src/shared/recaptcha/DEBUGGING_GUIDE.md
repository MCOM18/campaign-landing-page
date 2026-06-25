# reCAPTCHA Debugging Guide

## Issue: reCAPTCHA not working / API not being called

### Step 1: Restart Development Server ⚠️ CRITICAL

**Environment variables in Next.js are loaded at build/start time, NOT runtime!**

After adding `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` to `.env.local`, you MUST:

```bash
# Stop the dev server (Ctrl+C)
# Then restart it
npm run dev
```

**Why?** Next.js bundles environment variables during the build process. Changes to `.env` files require a restart.

### Step 2: Verify Environment Variable is Loaded

Open browser console and check:

```javascript
// You should see logs like:
[Register] 🔄 Loading reCAPTCHA script...
[reCAPTCHA] Site key found: 6LfLw_EsAA...
[reCAPTCHA] Starting script injection...
[reCAPTCHA] Script URL: https://www.google.com/recaptcha/api.js?render=6LfLw_EsAAAAAOTT_zUS4cmoTjZroswl_Jxm6Hhz
[reCAPTCHA] ✅ Script loaded successfully
```

If you see:
```
[reCAPTCHA] CRITICAL: Site key is missing!
```

Then the environment variable is NOT loaded. **Restart the dev server!**

### Step 3: Check Network Tab

1. Open browser DevTools → Network tab
2. Filter by "recaptcha"
3. You should see:
   - Request to `https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY`
   - Status: 200 OK

If you don't see this request, the script is not loading.

### Step 4: Check Console for Errors

Look for these logs when you submit the registration form:

```
[Register] 🔄 Step 1: Verifying captcha...
[reCAPTCHA] 🔄 Executing for action: REGISTER
[reCAPTCHA] ✅ grecaptcha ready
[reCAPTCHA] 🔄 Calling grecaptcha.execute...
[reCAPTCHA] ✅ Token generated successfully
[Captcha Service] Starting verification flow
[Captcha Service] Verification successful
[Register] ✅ Captcha verified successfully
[Register] 🔄 Step 2: Checking if user exists...
```

### Step 5: Check API Call

In Network tab, look for:
- Request to `/jojo/verify-captcha`
- Method: POST
- Payload should contain: `{ token: "...", action: "REGISTER" }`

If you don't see this API call, check the console for errors in Step 4.

### Step 6: Verify Site Key is Valid

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Find your site key: `6LfLw_EsAAAAAOTT_zUS4cmoTjZroswl_Jxm6Hhz`
3. Verify:
   - ✅ reCAPTCHA type is **v3**
   - ✅ Domain is whitelisted (or use `localhost` for testing)
   - ✅ Site key matches `.env.local`

### Common Issues

#### Issue 1: "Site key is missing"
**Solution:** Restart dev server after adding environment variable

#### Issue 2: Script loads but no token generated
**Solution:** Check browser console for errors. Verify site key is valid.

#### Issue 3: Token generated but API not called
**Solution:** Check if backend endpoint `/jojo/verify-captcha` exists and is accessible

#### Issue 4: API called but verification fails
**Solution:** Check backend logs. Verify backend has the correct **secret key** (not site key)

#### Issue 5: reCAPTCHA badge not visible
**This is NORMAL for v3!** reCAPTCHA v3 is invisible/silent. You'll only see a small badge in bottom-right corner.

### Testing Checklist

- [ ] Restarted dev server after adding env variable
- [ ] Console shows "Site key found: 6LfLw_EsAA..."
- [ ] Network tab shows recaptcha script loaded (200 OK)
- [ ] Console shows "Script loaded successfully"
- [ ] On form submit, console shows "Verifying captcha..."
- [ ] Console shows "Token generated successfully"
- [ ] Network tab shows POST to `/jojo/verify-captcha`
- [ ] Console shows "Captcha verified successfully"
- [ ] Registration flow continues to OTP screen

### Quick Test

1. **Restart dev server** (most important!)
2. Open registration page
3. Open browser console
4. Look for: `[Register] ✅ reCAPTCHA script loaded successfully`
5. Fill form and submit
6. Look for: `[Register] ✅ Captcha verified successfully`

If you see both ✅ messages, reCAPTCHA is working!

### Still Not Working?

Check these files:
1. `.env.local` - Has `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...`
2. `lib/config/env.ts` - Exports `recaptchaSiteKey`
3. `shared/recaptcha/recaptcha.client.ts` - Uses `env.recaptchaSiteKey`

If all files are correct and you restarted the server, check:
- Browser console for JavaScript errors
- Network tab for failed requests
- Backend logs for verification errors

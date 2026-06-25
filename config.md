# ⚙️ Configuration & 🔐 Authentication Flow — JOJO 2.0

> **Version:** 2.0 &nbsp;|&nbsp; **Framework:** Next.js (App Router) &nbsp;|&nbsp; **State:** Zustand &nbsp;|&nbsp; **Last Updated:** June 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Configuration System](#2-configuration-system)
   - 2.1 [Environment Files](#21-environment-files)
   - 2.2 [Environment Variables Reference](#22-environment-variables-reference)
   - 2.3 [Environment Entry Point (`env.ts`)](#23-environment-entry-point-envts)
   - 2.4 [Runtime Config Fetch & Decryption](#24-runtime-config-fetch--decryption)
   - 2.5 [Static App Config](#25-static-app-config)
3. [Bootstrap Sequence](#3-bootstrap-sequence)
   - 3.1 [BootstrapProvider](#31-bootstrapprovider)
   - 3.2 [BootstrapContext](#32-bootstrapcontext)
4. [API Client](#4-api-client)
   - 4.1 [Request Pipeline](#41-request-pipeline)
   - 4.2 [Custom Headers](#42-custom-headers)
   - 4.3 [Encryption / Decryption Layer](#43-encryption--decryption-layer)
   - 4.4 [Retry & Error Handling](#44-retry--error-handling)
5. [Authentication Flow](#5-authentication-flow)
   - 5.1 [Auth Folder Structure](#51-auth-folder-structure)
   - 5.2 [OTP Login Flow](#52-otp-login-flow)
   - 5.3 [Social Login Flow (Google / Facebook / Apple)](#53-social-login-flow-google--facebook--apple)
   - 5.4 [Guest Login Flow](#54-guest-login-flow)
   - 5.5 [reCAPTCHA Verification](#55-recaptcha-verification)
6. [Auth State Management (Zustand)](#6-auth-state-management-zustand)
   - 6.1 [Auth Store](#61-auth-store)
   - 6.2 [Token Storage Keys](#62-token-storage-keys)
7. [API Endpoints Reference](#7-api-endpoints-reference)
8. [Data Types & Interfaces](#8-data-types--interfaces)
9. [Response Mapping Layer](#9-response-mapping-layer)
10. [Social Provider SDK Architecture](#10-social-provider-sdk-architecture)
11. [Sequence Diagrams](#11-sequence-diagrams)
12. [Quick Reference — File Index](#12-quick-reference--file-index)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                         BROWSER                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌─────────────┐    ┌────────────────┐  │
│  │  .env files   │───▶│   env.ts    │───▶│  app.config.ts │  │
│  │  (build-time) │    │  (gateway)  │    │  (runtime)     │  │
│  └──────────────┘    └─────────────┘    └───────┬────────┘  │
│                                                  │           │
│                                          ┌───────▼────────┐  │
│                                          │  Bootstrap     │  │
│                                          │  Provider      │  │
│                                          └───────┬────────┘  │
│                                                  │           │
│                      ┌───────────────────────────▼────────┐  │
│                      │         API Client                 │  │
│                      │  ┌──────────┐  ┌───────────────┐   │  │
│                      │  │ encrypt  │  │   decrypt     │   │  │
│                      │  └──────────┘  └───────────────┘   │  │
│                      │  ┌──────────┐  ┌───────────────┐   │  │
│                      │  │ headers  │  │ retry logic   │   │  │
│                      │  └──────────┘  └───────────────┘   │  │
│                      └───────────────────────────┬────────┘  │
│                                                  │           │
│  ┌───────────────────────────────────────────────▼────────┐  │
│  │                  Auth Feature                          │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐  │  │
│  │  │   API   │ │ Services │ │ Providers │ │   Hooks  │  │  │
│  │  │  Layer  │ │  (Orch.) │ │  (SDKs)   │ │  (React  │  │  │
│  │  │         │ │          │ │           │ │   Query) │  │  │
│  │  └─────────┘ └──────────┘ └───────────┘ └──────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                               │
│                      ┌───────▼────────┐                      │
│                      │  Auth Store    │                      │
│                      │   (Zustand)    │                      │
│                      └───────┬────────┘                      │
│                              │                               │
│                      ┌───────▼────────┐                      │
│                      │  localStorage  │                      │
│                      │  (Tokens)      │                      │
│                      └────────────────┘                      │
└──────────────────────────────────────────────────────────────┘
```

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Single gateway for `process.env`** | Only `lib/config/env.ts` touches `process.env` |
| **Encrypted transport** | All API payloads are AES-encrypted; config response is also encrypted |
| **Fail-fast validation** | Missing env vars throw on server startup |
| **In-memory runtime config** | Fetched once, cached in a module-level variable |
| **Feature-sliced architecture** | Auth is a self-contained feature under `features/auth/` |
| **Layer separation** | API → Service → Hook → UI (no layer skipping) |

---

## 2. Configuration System

### 2.1 Environment Files

| File | Usage | Trigger |
|------|-------|---------|
| `.env.development` | Local dev with tunnels | `npm run dev` |
| `.env.stage` | Staging builds | `npm run build` (staging) |
| `.env.production` | Production builds | `npm run build` (production) |

> **Rule:** Never commit secrets. `.env.*` files are in `.gitignore` except for `.env.development` used as a template.

---

### 2.2 Environment Variables Reference

#### Core Config

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_CONFIG_URL` | Runtime config endpoint | `https://api.thesupercms.com/app-config` |
| `NEXT_PUBLIC_SECRET_KEY` | AES decryption key (Base64) | `sBYDzGabIR2a...` |
| `NEXT_PUBLIC_SECRET_IV` | AES IV (Hex) | `2d8f2f3bfb6a...` |
| `NEXT_PUBLIC_SKIP_CONFIG` | Skip config fetch in dev | `true` / `false` |

#### Fallback Config (used when `SKIP_CONFIG=true` or fetch fails)

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Fallback API base URL | `https://zwd5dbn0-4000.inc1.devtunnels.ms` |
| `NEXT_PUBLIC_SOCKET_URL` | Fallback WebSocket URL | `wss://socket.superott.in` |
| `NEXT_PUBLIC_ENV_TYPE` | Environment type | `stage` / `prod` |

#### Social Login

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | Facebook App ID |
| `NEXT_PUBLIC_APPLE_CLIENT_ID` | Apple Services ID |
| `NEXT_PUBLIC_APPLE_REDIRECT_URI` | Apple OAuth redirect callback |

#### Analytics

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CLEVERTAP_ACCOUNT_ID` | CleverTap account |
| `NEXT_PUBLIC_CLEVERTAP_REGION` | CleverTap region (`in1`) |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase / GA4 configuration |

#### Security

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Google reCAPTCHA v3 site key |

---

### 2.3 Environment Entry Point (`env.ts`)

**File:** `lib/config/env.ts`

This is the **single source of truth** for all `process.env` access. No other file in the project should directly reference `process.env`.

```typescript
export const env = {
  configUrl:          process.env.NEXT_PUBLIC_CONFIG_URL!,
  secretKey:          process.env.NEXT_PUBLIC_SECRET_KEY!,
  ivKey:              process.env.NEXT_PUBLIC_SECRET_IV!,
  skipConfig:         process.env.NEXT_PUBLIC_SKIP_CONFIG === "true",
  fallbackApiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "",
  fallbackSocketUrl:  process.env.NEXT_PUBLIC_SOCKET_URL || "",
  fallbackEnvType:    (process.env.NEXT_PUBLIC_ENV_TYPE || "stage") as "stage" | "prod",
  recaptchaSiteKey:   process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "",
} as const;
```

#### Server-Side Validation (fail-fast):

```typescript
if (typeof window === "undefined") {
  if (!env.skipConfig && !env.configUrl)  throw new Error("NEXT_PUBLIC_CONFIG_URL is required");
  if (!env.skipConfig && !env.secretKey)  throw new Error("NEXT_PUBLIC_SECRET_KEY is required");
  if (!env.skipConfig && !env.ivKey)      throw new Error("NEXT_PUBLIC_SECRET_IV is required");
}
```

---

### 2.4 Runtime Config Fetch & Decryption

**File:** `lib/config/app.config.ts`

The runtime configuration is fetched from the backend at app startup. The response is **AES-encrypted** and must be decrypted client-side.

#### RuntimeConfig Interface

```typescript
interface RuntimeConfig {
  apiBaseUrl:  string;            // Resolved API base (stage or prod)
  socketUrl:   string;            // WebSocket URL
  envType:     "stage" | "prod";  // Current environment
  publicIp?:   string;            // User's public IP (for geo)
  apiUpdates?: ApiUpdate[];       // Cache timestamps for resources
}
```

#### Fetch Flow

```
                   ┌──────────────────┐
                   │  fetchConfig()   │
                   └────────┬─────────┘
                            │
              ┌─────────────▼──────────────┐
              │  Already cached in memory? │
              │      (runtimeConfig)       │
              └─────────┬──────────┬───────┘
                   YES  │          │  NO
                   ▼    │          ▼
              Return    │    ┌─────────────────┐
              cached    │    │ Fetch in progress│
                        │    │  (dedup guard)?  │
                        │    └──┬──────────┬───┘
                        │  YES  │          │ NO
                        │  ▼    │          ▼
                        │ Wait  │   ┌──────────────────┐
                        │       │   │  performFetch()  │
                        │       │   └────────┬─────────┘
                        │       │            │
                        │       │   ┌────────▼─────────┐
                        │       │   │  skipConfig=true? │
                        │       │   └──┬──────────┬────┘
                        │       │ YES  │          │ NO
                        │       │ ▼    │          ▼
                        │       │ Use  │   POST /app-config
                        │       │ fallback│  (with custom headers)
                        │       │      │          │
                        │       │      │   ┌──────▼──────────┐
                        │       │      │   │ Decrypt response │
                        │       │      │   │ (AES-CBC-PKCS7) │
                        │       │      │   └──────┬──────────┘
                        │       │      │          │
                        │       │      │   ┌──────▼──────────┐
                        │       │      │   │ Map to          │
                        │       │      │   │ RuntimeConfig   │
                        │       │      │   └──────┬──────────┘
                        │       │      │          │
                        │       │      └──────────▼
                        └───────┴──────▶  Return config
```

#### Decryption Details

**File:** `lib/crypto/decrypt.ts`

| Step | Operation | Detail |
|------|-----------|--------|
| 1 | Parse secret key | Base64 → CryptoJS WordArray |
| 2 | Parse IV | Hex → CryptoJS WordArray |
| 3 | Parse ciphertext | Hex → CryptoJS WordArray |
| 4 | Decrypt | AES-CBC mode, PKCS7 padding |
| 5 | Convert | WordArray → UTF-8 string |
| 6 | Parse JSON | String → RuntimeConfig object |

```typescript
// Pseudocode
const keyWordArray  = CryptoJS.enc.Base64.parse(env.secretKey);
const ivWordArray   = CryptoJS.enc.Hex.parse(env.ivKey);
const ciphertext    = CryptoJS.enc.Hex.parse(encryptedString);

const decrypted = CryptoJS.AES.decrypt(
  { ciphertext },
  keyWordArray,
  { iv: ivWordArray, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
);

return decrypted.toString(CryptoJS.enc.Utf8); // JSON string
```

#### Config Response Structure (after decryption)

```json
{
  "data": {
    "api": {
      "stageBaseUrl": "https://stage-api.example.com",
      "prodBaseUrl": "https://api.example.com",
      "socketBaseUrl": "wss://stage-socket.example.com",
      "socketProdUrl": "wss://socket.example.com"
    },
    "publicIp": "203.0.113.42",
    "apiUpdate": [
      { "name": "country-list", "timestamp": "2026-06-01T00:00:00Z" },
      { "name": "navigation",   "timestamp": "2026-06-15T00:00:00Z" }
    ]
  }
}
```

#### Config API Functions

| Function | Purpose |
|----------|---------|
| `fetchConfig()` | Fetch, decrypt, and return `RuntimeConfig` (with dedup + caching) |
| `setAppConfig(config)` | Store config in module-level memory |
| `getAppConfig()` | Read cached config (throws if not loaded) |
| `isConfigLoaded()` | Boolean check if config exists |
| `getApiUpdateTimestamp(name)` | Get cache timestamp for a named resource |

---

### 2.5 Static App Config

**File:** `lib/config/app.config.ts` → `appConfig` export

These values are **compile-time constants** that don't change between environments.

```typescript
export const appConfig = {
  flags: {
    enableEncryption: true,     // AES for API responses
    enableLogger: true,
    enableMocks: false,
    enableAnalytics: false,
    enableCaptcha: false,       // reCAPTCHA toggle
    showNavbar: true,
    showFooter: true,
    showDarkLightToggle: false,
    showLanguageDropdown: true,
    MOBILE_RESPONSIVE_WITH_AUTH: false,
    MOBILE_RESPONSIVE_WITHOUT_AUTH: true,
  },
  TIMEOUT_MS: 10000,           // Request timeout
  MAX_RETRIES: 2,              // Max retry attempts
  RETRY_DELAYS: [300, 600],    // Delays between retries (ms)
  LIMITS: {
    PAGE_SIZE: 20,
    REQUEST_TIMEOUT_MS: 10_000,
    TOKEN_EXPIRY_BUFFER_S: 60,
    TOAST_DURATION_MS: 4_000,
    DEBOUNCE_SEARCH_MS: 300,
  },
  OTP_LENGTH: 4,
  RESEND_SECONDS: 15,
  DEFAULT_COUNTRY_NAME: "IN",
  // ... more constants
};
```

---

## 3. Bootstrap Sequence

### 3.1 BootstrapProvider

**File:** `lib/bootstrap/BootstrapProvider.tsx`

The `BootstrapProvider` wraps the entire application and orchestrates startup in 3 sequential steps:

```
App Mount
    │
    ▼
┌──────────────────────────────────────────┐
│         BootstrapProvider                │
│                                          │
│  STEP 1: Fetch & store runtime config    │
│           fetchConfig() → setAppConfig() │
│                                          │
│  STEP 2: Geo-location with cache check   │
│           getCachedGeo() || fetchGeo()   │
│           (failure does NOT block app)   │
│                                          │
│  STEP 3: Set isAppReady = true           │
│           setState("ready")             │
└──────────────────────────────────────────┘
    │
    ▼
  Children rendered
```

#### State Machine

| State | Behavior |
|-------|----------|
| `loading` | Bootstrap in progress (spinner hidden to avoid hydration mismatch) |
| `ready` | Children rendered inside `BootstrapContext.Provider` |
| `error` | Full-screen error with retry button |

#### Hydration Safety

The provider renders children immediately during SSR (`!isMounted`) with `isAppReady: false` to prevent hydration mismatches. The bootstrap runs only after mount via `useEffect`.

---

### 3.2 BootstrapContext

**File:** `lib/bootstrap/BootstrapContext.tsx`

```typescript
interface BootstrapContextValue {
  isAppReady: boolean;
}

// Usage in any child component:
const { isAppReady } = useBootstrap();
```

Any component can check `isAppReady` to guard against premature API calls.

---

## 4. API Client

### 4.1 Request Pipeline

**File:** `lib/api/client.ts`

```
apiClient.post(endpoint, body, options)
         │
         ▼
┌─────────────────────────────┐
│  SSR Guard                  │  ← Throws if typeof window === "undefined"
├─────────────────────────────┤
│  Online Check               │  ← navigator.onLine
├─────────────────────────────┤
│  Config Guard               │  ← isConfigLoaded() for relative URLs
├─────────────────────────────┤
│  URL Construction           │  ← base + endpoint + query params
├─────────────────────────────┤
│  Header Assembly            │  ← Standard + custom + options.headers
├─────────────────────────────┤
│  Request Encryption         │  ← if options.encrypt: body → { data: encrypted }
├─────────────────────────────┤
│  fetch()                    │  ← with AbortController timeout
├─────────────────────────────┤
│  Response Parsing           │  ← JSON parse with fallback
├─────────────────────────────┤
│  Rate Limit Handling (429)  │  ← Retry-After header or delay
├─────────────────────────────┤
│  meta-data Normalization    │  ← "meta-data" → "metaData"
├─────────────────────────────┤
│  Response Decryption        │  ← if data is encrypted string
├─────────────────────────────┤
│  Return typed response      │
└─────────────────────────────┘
```

#### Client Interface

```typescript
export const apiClient = {
  get:    <T>(endpoint, options?)        => Promise<T>,
  post:   <T>(endpoint, body, options?)  => Promise<T>,
  put:    <T>(endpoint, body, options?)  => Promise<T>,
  patch:  <T>(endpoint, body, options?)  => Promise<T>,
  delete: <T>(endpoint, options?)        => Promise<T>,
};

interface RequestOptions {
  headers?: Record<string, string>;  // e.g. { sessionid: "..." }
  encrypt?: boolean;                 // Encrypt request body
  params?:  Record<string, any>;     // URL query params
  signal?:  AbortSignal;             // External abort controller
}
```

---

### 4.2 Custom Headers

**File:** `lib/constants/headers.ts`

Every internal API request includes these headers:

| Header Key | Value | Description |
|------------|-------|-------------|
| `Content-Type` | `application/json` | JSON payload |
| `Accept` | `application/json` | Expected response format |
| `deviceTypeCode` | `"3"` | Device type (3 = Web) |
| `deviceID` | `<browser_uid>` | Unique browser fingerprint from localStorage |
| `language` | `"1"` | Language code (1 = English) |
| `appversion` | `"2.0.0"` | App version |
| `project` | `"JOJO"` | Project identifier |
| `platform` | `<detected>` | OS platform (auto-detected) |
| `sessionid` | `<if provided>` | Auth session (passed via options.headers) |

---

### 4.3 Encryption / Decryption Layer

**Files:** `lib/crypto/encrypt.ts`, `lib/crypto/decrypt.ts`

| Direction | Algorithm | Key Format | IV Format | Data Format |
|-----------|-----------|------------|-----------|-------------|
| **Request** (encrypt) | AES-CBC, PKCS7 | Base64 → WordArray | Hex → WordArray | JSON → encrypted hex string |
| **Response** (decrypt) | AES-CBC, PKCS7 | Base64 → WordArray | Hex → WordArray | Hex string → JSON |

- Encryption is controlled by `appConfig.flags.enableEncryption`
- Per-request encryption is opt-in via `options.encrypt: true`
- Response decryption is automatic when `data` field is a string

---

### 4.4 Retry & Error Handling

| Condition | Behavior |
|-----------|----------|
| 5xx errors | Retry up to `MAX_RETRIES` (2) with delays `[300, 600]` ms |
| 4xx errors | **No retry** — throw `AppError` immediately |
| 429 (Rate limit) | Respect `Retry-After` header or use delay schedule |
| Timeout | Retry up to `MAX_RETRIES`, then throw |
| Network error | Retry up to `MAX_RETRIES`, then throw |
| Abort signal | Throw `AppError("Request cancelled")` immediately |

```typescript
class AppError extends Error {
  constructor(message: string, public status: HttpStatus) { ... }
}
```

---

## 5. Authentication Flow

### 5.1 Auth Folder Structure

```
features/auth/
├── api/                            # Raw API calls (thin wrappers over apiClient)
│   ├── checkUser.ts               # POST /v3/auth/check-user
│   ├── sendOtp.ts                 # POST /v3/auth/send-otp
│   ├── verifyOtp.ts               # POST /v3/auth/verify-otp
│   ├── socialLogin.ts             # POST /v3/auth/social
│   ├── guestLogin.ts              # POST /v3/auth/guest
│   ├── verifyCaptcha.ts           # POST /v3/jojo/verify-captcha
│   └── verifySpecialUser.ts       # POST /v3/auth/verify-special-user
│
├── services/                       # Business logic orchestration
│   ├── auth.service.ts            # Multi-step OTP & social login orchestration
│   └── captcha.service.ts         # reCAPTCHA execute → verify orchestration
│
├── providers/                      # Third-party SDK integrations
│   ├── baseSocialProvider.ts      # Shared utilities (SSR guard, timeout, SDK loader)
│   ├── google.provider.ts         # Google Sign-In SDK wrapper
│   ├── facebook.provider.ts       # Facebook Login SDK wrapper
│   ├── apple.provider.ts          # Apple Sign-In JS wrapper
│   ├── tokenDecoder.ts            # JWT token decoder
│   ├── loadScript.ts              # Dynamic <script> loader
│   └── sdkRegistry.ts             # Prevents duplicate SDK initializations
│
├── hooks/                          # React Query hooks
│   ├── useOtpLogin.ts             # OTP login mutation hook
│   ├── useSocialLogin.ts          # Social login mutation hook
│   └── useGuestLogin.ts           # Guest login mutation hook
│
├── model/                          # TypeScript types & API mappers
│   ├── types.ts                   # All auth interfaces
│   └── mapper.ts                  # API response → domain model mappers
│
└── ui/                             # Reusable UI components
    ├── GoogleLoginButton.tsx
    ├── FacebookLoginButton.tsx
    ├── AppleLoginButton.tsx
    ├── GuestLoginButton.tsx
    └── OtpLoginForm.tsx
```

---

### 5.2 OTP Login Flow

The OTP flow is a **multi-step orchestration** managed by `auth.service.ts`.

#### Flow Diagram

```
User enters Phone/Email
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              initiateOtpFlow()                          │
│                                                         │
│  ┌─────────────────────────────────────────┐            │
│  │  Step 1: checkUser()                    │            │
│  │  POST /v3/auth/check-user               │            │
│  │  Body: { phone, phone_code, source }    │            │
│  │  (encrypted: true)                      │            │
│  │                                         │            │
│  │  Response → mapCheckUserResponse()      │            │
│  │  ├── is_exists: boolean                 │            │
│  │  ├── is_special_user: boolean           │            │
│  │  └── operator_name: string | null       │            │
│  │                                         │            │
│  │  404 → Treated as new registration      │            │
│  └─────────────┬───────────────────────────┘            │
│                │                                        │
│                ▼                                        │
│  ┌─────────────────────────────────────────┐            │
│  │  Step 2: sendOtp()                      │            │
│  │  POST /v3/auth/send-otp                 │            │
│  │  Body: { phone, phone_code,             │            │
│  │          is_register, source }           │            │
│  │  (encrypted: true)                      │            │
│  │                                         │            │
│  │  is_register = !is_exists               │            │
│  │  (true for new users)                   │            │
│  │                                         │            │
│  │  Response → mapSendOtpResponse()        │            │
│  │  └── otp_sent: boolean                  │            │
│  └─────────────┬───────────────────────────┘            │
│                │                                        │
│  Returns: { isSpecialUser, isExists }                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
         User enters OTP
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│             completeOtpVerification()                   │
│                                                         │
│  ┌─────────────────────────────────────────┐            │
│  │  Step 1: verifyOtp()                    │            │
│  │  POST /v3/auth/verify-otp               │            │
│  │  Body: { phone, phone_code, otp,        │            │
│  │          is_register, source }           │            │
│  │  (encrypted: true)                      │            │
│  │                                         │            │
│  │  Response → mapVerifyOtpResponse()      │            │
│  │  ├── session_id: string                 │            │
│  │  ├── user_id: string                    │            │
│  │  ├── email?: string                     │            │
│  │  ├── phone: string                      │            │
│  │  └── phone_code: string                 │            │
│  │                                         │            │
│  │  200 = Existing user login              │            │
│  │  201 = New user registration            │            │
│  └─────────────────────────────────────────┘            │
│                                                         │
│  Analytics tracked:                                     │
│  • trackOtpVerified() on success                        │
│  • trackLoginSuccess() on success                       │
│  • trackOtpFailed() on failure                          │
└─────────────────────────────────────────────────────────┘
                 │
                 ▼
     ┌───────────┴──────────┐
     │                      │
  Existing User         New User
  (status 200)          (status 201)
     │                      │
     ▼                      ▼
  Navigate to           Navigate to
  /home                 /register/create-account
```

#### Source Detection Logic

The `source` field is auto-detected from the user's input:

```typescript
const isEmail = phone.includes('@');
const source = isEmail ? LoginIdentifierType.EMAIL : LoginIdentifierType.PHONE;
```

When `source === "email"`:
- Request body uses `email` field instead of `phone`
- `phone_code` is omitted

---

### 5.3 Social Login Flow (Google / Facebook / Apple)

#### Common Architecture

All social providers share a base layer:

**File:** `features/auth/providers/baseSocialProvider.ts`

| Utility | Purpose |
|---------|---------|
| `ensureBrowser()` | SSR safety — throws if `window` is undefined |
| `withTimeout(promise, ms, msg)` | Race a promise against a timeout |
| `loadSocialSDK(url, name)` | Dynamically load a `<script>` tag |
| `ensureSDKAvailable(check, name)` | Verify SDK is on `window` |

**File:** `features/auth/providers/sdkRegistry.ts`

Prevents duplicate initialization using an in-memory `Set<SDKName>`:

```typescript
type SDKName = 'google' | 'facebook' | 'apple';

isInitialized(sdk)    // Check
markInitialized(sdk)  // Mark
resetInitialization() // Reset (for tests)
```

#### Social Login API Call

**File:** `features/auth/api/socialLogin.ts`

```typescript
POST /v3/auth/social
Body: {
  source: "google" | "facebook" | "apple",
  token: "<id_token_from_provider>",
  email?: "<extracted_email>"        // Optional, from JWT decode
}
Options: { encrypt: true }
```

#### Service Layer

**File:** `features/auth/services/auth.service.ts` → `socialLoginService()`

```
SDK triggers sign-in
        │
        ▼
  Provider returns token
  (e.g. Google ID token)
        │
        ▼
┌───────────────────────────────────┐
│  socialLoginService()             │
│                                   │
│  1. POST /v3/auth/social          │
│     { source, token, email? }     │
│                                   │
│  2. Validate metaData.status      │
│     200 = existing user           │
│     201 = new registration        │
│                                   │
│  3. mapSocialLoginResponse()      │
│     → { session_id, user_id,      │
│        email?, phone? }           │
│                                   │
│  4. Set isNewUser flag            │
│                                   │
│  5. Track analytics               │
│     • trackLoginSuccess()         │
│     or trackLoginFailed()         │
│                                   │
│  Return: SocialLoginResponse      │
│          + isNewUser flag          │
└───────────────────────────────────┘
```

#### Provider-Specific Details

| Provider | Client ID Env Var | SDK URL | Auth Method |
|----------|-------------------|---------|-------------|
| **Google** | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | GSI library | Popup / One-Tap |
| **Facebook** | `NEXT_PUBLIC_FACEBOOK_APP_ID` | `connect.facebook.net/en_US/sdk.js` | FB.login() popup |
| **Apple** | `NEXT_PUBLIC_APPLE_CLIENT_ID` | Apple JS SDK | Popup → redirect callback |

Apple has a dedicated callback route: `app/auth/apple/callback/page.tsx`

---

### 5.4 Guest Login Flow

**File:** `features/auth/api/guestLogin.ts`

The simplest auth flow — single API call:

```typescript
POST /v3/auth/guest
Body: { data: "<encrypted_payload>" }
Response: { session_id: string }
```

Guest auth in the store:

```typescript
setGuestAuth(token, guestId) → {
  isAuthenticated: true,
  user: { id: guestId, phone: "", isGuest: true },
  token: token,
  refreshToken: null,
}
```

---

### 5.5 reCAPTCHA Verification

**File:** `features/auth/services/captcha.service.ts`

Controlled by `appConfig.flags.enableCaptcha` (currently `false`).

```
┌─────────────────────────────────────────┐
│  verifyCaptchaFlow(action, sessionId?)  │
│                                         │
│  Step 1: executeRecaptcha(action)       │
│          → Get token from Google        │
│                                         │
│  Step 2: POST /v3/jojo/verify-captcha   │
│          { token, action }              │
│          → Backend validates score      │
│                                         │
│  Step 3: Return { success, message }    │
└─────────────────────────────────────────┘
```

---

## 6. Auth State Management (Zustand)

### 6.1 Auth Store

**File:** `store/useAuthStore.ts`

```typescript
interface AuthStore {
  // State
  isAuthenticated: boolean;
  user:            User | null;
  token:           string | null;
  refreshToken:    string | null;

  // Actions
  setAuth(user, token, refreshToken): void;  // Login success
  setGuestAuth(token, guestId): void;        // Guest login
  clearAuth(): void;                         // Logout
  updateUser(userData): void;                // Partial user update
}
```

#### setAuth (Login Success)

```
setAuth(user, token, refreshToken)
    │
    ├── localStorage.set(AUTH_TOKEN, token)
    ├── localStorage.set(REFRESH_TOKEN, refreshToken)
    └── set({ isAuthenticated: true, user, token, refreshToken })
```

#### clearAuth (Logout)

```
clearAuth()
    │
    ├── analyticsService.trackLogout({ reason: 'user_initiated' })
    ├── analyticsService.resetUser()
    ├── localStorage.remove(AUTH_TOKEN)
    ├── localStorage.remove(REFRESH_TOKEN)
    └── set({ isAuthenticated: false, user: null, token: null, refreshToken: null })
```

#### initAuth (App Startup)

```typescript
// Called on app startup to restore session from localStorage
export function initAuth(): void {
  const token        = localStorageManager.get(StorageKey.AUTH_TOKEN);
  const refreshToken = localStorageManager.get(StorageKey.REFRESH_TOKEN);

  if (token) {
    useAuthStore.setState({ isAuthenticated: true, token, refreshToken });
  }
}
```

---

### 6.2 Token Storage Keys

**File:** `enums/storage.enum.ts`

| Key Constant | localStorage Key | Purpose |
|--------------|-----------------|---------|
| `AUTH_TOKEN` | `ott_auth_token` | Primary auth token (session) |
| `REFRESH_TOKEN` | `ott_refresh_token` | Token refresh credential |
| `SESSION_ID` | `ott_session_id` | Backend session ID |
| `DEVICE_ID` | `ott_device_id` | Device identifier |
| `BROWSER_UID` | `browser_uid` | Unique browser fingerprint |
| `APPLE_AUTH_STATE` | `apple_auth_state` | CSRF state for Apple OAuth |
| `IS_REGISTER` | `isRegister` | Registration flow flag |
| `ID_TOKEN` | `id_token` | Social login ID token |
| `SELECTED_PROFILE` | `ott_selected_profile` | Active user profile |

---

## 7. API Endpoints Reference

**File:** `enums/api.enum.ts`

### Config & Geo

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/app-config` | POST | Fetch encrypted runtime config |
| `/v3/auth/check-availability` | POST | Check service availability |
| `/v3/auth/geo-location` | POST | Get geo-location data |
| `/v3/auth/country-list` | GET | Get supported countries |

### Auth — OTP Flow

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v3/auth/check-user` | POST | Check if user exists (phone/email) |
| `/v3/auth/send-otp` | POST | Send OTP to user |
| `/v3/auth/verify-otp` | POST | Verify OTP code |
| `/v3/auth/verify-special-user` | POST | Special user verification |

### Auth — Social & Guest

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v3/auth/social` | POST | Unified social login (Google/FB/Apple) |
| `/v3/auth/guest` | POST | Guest login |

### Auth — Security

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v3/jojo/verify-captcha` | POST | reCAPTCHA backend verification |

---

## 8. Data Types & Interfaces

**File:** `features/auth/model/types.ts`

### Request Types

```typescript
interface CheckUserRequest {
  phone_code: string;       // "+91"
  phone:      string;       // "9876543210" or "user@email.com"
  source:     "phone" | "email";
}

interface SendOtpRequest {
  phone_code:  string;
  phone:       string;
  is_register: boolean;     // true for new users
  source:      "phone" | "email";
}

interface VerifyOtpRequest {
  phone_code:  string;
  phone:       string;
  otp:         string;      // 4-digit code
  is_register: boolean;
  source:      "phone" | "email";
}

interface SocialLoginRequest {
  source: SocialProvider;   // "google" | "facebook" | "apple"
  token:  string;           // ID token from provider
  email?: string;           // Extracted from JWT
}

interface GuestLoginRequest {
  data: string;             // Encrypted payload
}
```

### Response Types

```typescript
interface CheckUserResponse {
  is_exists:      boolean;
  is_special_user: boolean;
  operator_name:  string | null;
}

interface SendOtpResponse {
  otp_sent: boolean;
}

interface VerifyOtpResponse {
  session_id: string;
  user_id:    string;
  email?:     string;
  phone:      string;
  phone_code: string;
}

interface SocialLoginResponse {
  session_id: string;
  user_id:    string;
  email?:     string;
  phone?:     string;
  isNewUser?: boolean;      // true when backend returns 201
}

interface GuestLoginResponse {
  session_id: string;
}
```

### Domain Models

```typescript
interface User {
  id:        string;
  phone:     string;
  name?:     string;
  email?:    string;
  avatar?:   string;
  isGuest:   boolean;
  createdAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user:            User | null;
  token:           string | null;
  refreshToken:    string | null;
}

interface OtpFlowState {
  step:          "check-user" | "send-otp" | "verify-otp" | "complete";
  phone:         string;
  phoneCode:     string;
  isSpecialUser: boolean;
  error:         string | null;
}
```

---

## 9. Response Mapping Layer

**File:** `features/auth/model/mapper.ts`

All API responses pass through mapper functions to normalize and extract data safely:

| Mapper Function | Input | Output |
|----------------|-------|--------|
| `mapUser(apiUser)` | Raw API user object | `User` domain model |
| `mapCheckUserResponse(res)` | `ApiResponse<any>` | `CheckUserResponse` |
| `mapSendOtpResponse(res)` | `ApiResponse<any>` | `SendOtpResponse` |
| `mapVerifyOtpResponse(res)` | `ApiResponse<any>` | `VerifyOtpResponse` |
| `mapVerifySpecialUserResponse(res)` | `ApiResponse<any>` | `VerifySpecialUserResponse` |
| `mapGuestLoginResponse(res)` | `ApiResponse<any>` | `GuestLoginResponse` |
| `mapSocialLoginResponse(res)` | `ApiResponse<any>` | `SocialLoginResponse` |

All mappers use safe fallbacks (`|| ''`, `|| false`, `|| null`) to prevent undefined crashes.

---

## 10. Social Provider SDK Architecture

```
┌──────────────────────────────────────────────────────┐
│                  baseSocialProvider.ts                │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ ensureBrowser() │  │ withTimeout() │  │ loadSDK()│ │
│  └────────────────┘  └──────────────┘  └──────────┘ │
└────────────────────────┬─────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
   ┌───────────┐   ┌───────────┐   ┌───────────┐
   │  Google   │   │ Facebook  │   │   Apple   │
   │ Provider  │   │ Provider  │   │ Provider  │
   │           │   │           │   │           │
   │ GSI lib   │   │ FB SDK    │   │ Apple JS  │
   │ Popup     │   │ FB.login  │   │ Popup +   │
   │ One-Tap   │   │ Popup     │   │ Redirect  │
   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ sdkRegistry.ts   │
                │ (dedup guard)    │
                │                  │
                │ Set<SDKName>     │
                │ • google ✓      │
                │ • facebook ✓    │
                │ • apple ✓       │
                └──────────────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ tokenDecoder.ts  │
                │ JWT → payload    │
                │ (extract email)  │
                └──────────────────┘
```

---

## 11. Sequence Diagrams

### Complete App Startup → Login → Home

```
Browser              BootstrapProvider        Config API         Auth Service        Backend
  │                       │                      │                    │                  │
  │──── Mount ──────────▶│                      │                    │                  │
  │                       │                      │                    │                  │
  │                       │── POST /app-config ─▶│                    │                  │
  │                       │                      │── fetch config ──▶│                  │
  │                       │                      │◀── encrypted ─────│                  │
  │                       │◀── RuntimeConfig ────│                    │                  │
  │                       │                      │                    │                  │
  │                       │── setAppConfig() ───▶│ (in-memory)        │                  │
  │                       │── fetchGeoData() ──────────────────────────────────────────▶│
  │                       │◀── geo response ──────────────────────────────────────────◀│
  │                       │                      │                    │                  │
  │                       │── isAppReady=true     │                    │                  │
  │◀── Render children ──│                      │                    │                  │
  │                       │                      │                    │                  │
  │── User enters phone ──────────────────────────────────────────▶│                  │
  │                       │                      │                    │                  │
  │                       │                      │                    │── checkUser() ──▶│
  │                       │                      │                    │◀── is_exists ───│
  │                       │                      │                    │                  │
  │                       │                      │                    │── sendOtp() ────▶│
  │                       │                      │                    │◀── otp_sent ───│
  │                       │                      │                    │                  │
  │◀── Show OTP screen ──────────────────────────────────────────◀│                  │
  │                       │                      │                    │                  │
  │── User enters OTP ───────────────────────────────────────────▶│                  │
  │                       │                      │                    │── verifyOtp() ──▶│
  │                       │                      │                    │◀── session_id ──│
  │                       │                      │                    │                  │
  │── setAuth(user, token)│                      │                    │                  │
  │── Navigate to /home ──│                      │                    │                  │
```

---

## 12. Quick Reference — File Index

### Configuration Files

| File | Purpose |
|------|---------|
| `.env.development` | Development environment variables |
| `.env.stage` | Staging environment variables |
| `.env.production` | Production environment variables |
| `lib/config/env.ts` | Single `process.env` gateway |
| `lib/config/app.config.ts` | Runtime config fetch + static app config |
| `lib/crypto/decrypt.ts` | AES decryption (responses + config) |
| `lib/crypto/encrypt.ts` | AES encryption (requests) |

### Bootstrap Files

| File | Purpose |
|------|---------|
| `lib/bootstrap/BootstrapProvider.tsx` | App startup orchestrator |
| `lib/bootstrap/BootstrapContext.tsx` | React context for `isAppReady` |

### API Client Files

| File | Purpose |
|------|---------|
| `lib/api/client.ts` | HTTP client with retry/encrypt/decrypt |
| `lib/constants/headers.ts` | Header keys and default values |
| `lib/error/types.ts` | `AppError` class definition |

### Auth Feature Files

| File | Purpose |
|------|---------|
| `features/auth/api/checkUser.ts` | Check user existence API |
| `features/auth/api/sendOtp.ts` | Send OTP API |
| `features/auth/api/verifyOtp.ts` | Verify OTP API |
| `features/auth/api/socialLogin.ts` | Social login API |
| `features/auth/api/guestLogin.ts` | Guest login API |
| `features/auth/api/verifyCaptcha.ts` | reCAPTCHA verification API |
| `features/auth/api/verifySpecialUser.ts` | Special user verification API |
| `features/auth/services/auth.service.ts` | Multi-step auth orchestration |
| `features/auth/services/captcha.service.ts` | reCAPTCHA flow orchestration |
| `features/auth/providers/google.provider.ts` | Google Sign-In SDK |
| `features/auth/providers/facebook.provider.ts` | Facebook Login SDK |
| `features/auth/providers/apple.provider.ts` | Apple Sign-In SDK |
| `features/auth/providers/baseSocialProvider.ts` | Shared provider utilities |
| `features/auth/providers/sdkRegistry.ts` | SDK initialization tracker |
| `features/auth/providers/tokenDecoder.ts` | JWT token decoder |
| `features/auth/providers/loadScript.ts` | Dynamic script loader |
| `features/auth/model/types.ts` | TypeScript interfaces |
| `features/auth/model/mapper.ts` | API response mappers |

### State Management

| File | Purpose |
|------|---------|
| `store/useAuthStore.ts` | Global auth state (Zustand) |
| `enums/storage.enum.ts` | localStorage key constants |
| `enums/api.enum.ts` | API endpoint constants |

### Auth Pages

| File | Purpose |
|------|---------|
| `app/login/page.tsx` | Login page (phone/email input) |
| `app/login/otp/page.tsx` | OTP verification page |
| `app/register/page.tsx` | Registration entry page |
| `app/register/create-account/page.tsx` | Profile creation page |
| `app/auth/apple/callback/page.tsx` | Apple OAuth callback handler |

---

> **Note:** This document reflects the current state of the JOJO 2.0 codebase. For UI component details (AuthForm, OtpScreen), see `features/auth/AUTH_FLOW_DOCUMENTATION.md`.

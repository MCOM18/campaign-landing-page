import { create } from "zustand";
import { StorageKey } from "@enums/storage.enum";
import { localStorageManager } from "@lib/localStorage/localStorage.manager";
import type { User, AuthState } from "@features/auth/model/types";
import { analyticsService } from "@/shared/analytics";
import { trackEvent } from "@/services/analytics/events";

interface AuthStore extends AuthState {
  setAuth: (user: User, token: string, refreshToken: string) => void;
  setGuestAuth: (token: string, guestId: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

/**
 * Auth Store (Zustand)
 * 
 * Manages authentication state globally
 * Persists tokens to localStorage
 */
export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,

  /**
   * Set authenticated user
   */
  setAuth: (user, token, refreshToken) => {
    // Persist tokens
    localStorageManager.set(StorageKey.AUTH_TOKEN, token);
    localStorageManager.set(StorageKey.REFRESH_TOKEN, refreshToken);

    // Update state
    set({
      isAuthenticated: true,
      user,
      token,
      refreshToken,
    });
  },

  /**
   * Set guest user
   */
  setGuestAuth: (token, guestId) => {
    // Persist token
    localStorageManager.set(StorageKey.AUTH_TOKEN, token);

    // Update state with guest user
    set({
      isAuthenticated: true,
      user: {
        id: guestId,
        phone: "",
        isGuest: true,
        createdAt: new Date().toISOString(),
      },
      token,
      refreshToken: null,
    });

    // Track backend login event (guest)
    trackEvent("login", {
      method: "guest",
      source: "phone",
      user_id: guestId,
    });
  },

  /**
   * Clear authentication
   */
  clearAuth: () => {
    const currentUser = get().user;

    // Track logout
    analyticsService.trackLogout({
      reason: 'user_initiated',
    });
    
    // Track backend logout event
    if (currentUser) {
      trackEvent("logout", {
        reason: "user_initiated",
        user_id: currentUser.id,
      });
    }

    // Reset analytics user
    analyticsService.resetUser();
    
    // Remove tokens from storage
    localStorageManager.remove(StorageKey.AUTH_TOKEN);
    localStorageManager.remove(StorageKey.REFRESH_TOKEN);

    // Reset state
    set({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
    });
  },

  /**
   * Update user data
   */
  updateUser: (userData) => {
    const currentUser = get().user;
    if (!currentUser) return;

    set({
      user: {
        ...currentUser,
        ...userData,
      },
    });
  },
}));

/**
 * Initialize auth from localStorage on app start
 */
export function initAuth(): void {
  const token = localStorageManager.get<string>(StorageKey.AUTH_TOKEN);
  const refreshToken = localStorageManager.get<string>(StorageKey.REFRESH_TOKEN);

  if (token) {
    // TODO: Validate token and fetch user data
    // For now, just set authenticated state
    useAuthStore.setState({
      isAuthenticated: true,
      token,
      refreshToken,
    });
  }
}

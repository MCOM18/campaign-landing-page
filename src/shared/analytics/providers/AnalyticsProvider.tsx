'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { analyticsService } from '../services/analytics.service';
import { useAuthStore } from '@/store/useAuthStore'; // Match your store path
import { useBootstrap } from '@/lib/bootstrap/BootstrapContext';

import { getSourceLink, parseSourceLinkParams } from '../utils/getSourceLink';
import { EVENT_NAMES } from '../constants/analytics.constants';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);
  const lastPathname = useRef<string | null>(null);
  const { user, isAuthenticated } = useAuthStore();
  const { isAppReady } = useBootstrap();

  // Initialize Service
  useEffect(() => {
    if (!isAppReady || isInitialized) return;

    analyticsService.initialize({
      clevertap: process.env.NEXT_PUBLIC_CLEVERTAP_ACCOUNT_ID
        ? {
          accountId: process.env.NEXT_PUBLIC_CLEVERTAP_ACCOUNT_ID,
          region: process.env.NEXT_PUBLIC_CLEVERTAP_REGION || 'in1',
        }
        : undefined,
      firebase: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
      }
    }).then(() => setIsInitialized(true));
  }, [isAppReady, isInitialized]);

  // Sync User Identity
  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !user) return;

    analyticsService.identifyUser(user.id, {
      phone: user.phone,
      email: user.email,
      is_guest: user.isGuest,
      created_at: user.createdAt,
    });
  }, [isInitialized, isAuthenticated, user]);

  // Track Pathnames
  useEffect(() => {
    if (!isInitialized) return;
    if (pathname === lastPathname.current) return;

    const previous = lastPathname.current;
    lastPathname.current = pathname;

    const sourceLink = getSourceLink();
    const sourceLinkParams = parseSourceLinkParams(sourceLink);

    analyticsService.track({
      name: EVENT_NAMES.SCREEN_VIEWED,
      properties: {
        screen_name: pathname === '/' ? 'Home' : pathname.slice(1).replace(/\//g, ' '),
        screen_path: pathname,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
        previous_screen: previous || undefined,
        ...(sourceLink ? { source_link: sourceLink } : {}),
        ...sourceLinkParams,
      }
    });
  }, [isInitialized, pathname]);

  return <>{children}</>;
}

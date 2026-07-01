'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { analyticsService } from '../services/analytics.service';
import { useAuthStore } from '@/store/useAuthStore'; // Match your store path

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);
  const lastPathname = useRef<string | null>(null);
  const { user, isAuthenticated } = useAuthStore();

  // Initialize Service
  useEffect(() => {
    if (isInitialized) return;
    
    analyticsService.initialize({
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
  }, [isInitialized]);

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

    analyticsService.track({
      name: 'screen_viewed',
      properties: {
        screen_name: pathname === '/' ? 'Home' : pathname.slice(1).replace(/\//g, ' '),
        screen_path: pathname,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
        previous_screen: previous || undefined,
      }
    });
  }, [isInitialized, pathname]);

  return <>{children}</>;
}

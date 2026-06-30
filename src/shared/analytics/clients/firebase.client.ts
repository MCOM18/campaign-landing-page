import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, logEvent, setUserId, setUserProperties, type Analytics } from 'firebase/analytics';
import { QUEUE_LIMITS, ANALYTICS_STORAGE_KEYS } from '../constants/analytics.constants';
import { analyticsLogger } from '../utils/logger';
import { normalizeEventName, normalizeEventParams } from '../utils/normalizeForGA4';
import type { ProviderState, QueuedEvent, OfflineQueueItem } from '../model/provider.types';
import type { AnalyticsEvent } from '../model/common.types';
import { v4 as uuidv4 } from 'uuid';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

class FirebaseClient {
  private app: FirebaseApp | null = null;
  private analytics: Analytics | null = null;
  private state: ProviderState = { isInitialized: false, isInitializing: false };
  private queue: QueuedEvent[] = [];
  private offlineQueue: OfflineQueueItem[] = [];
  private isOnline: boolean = true;
  private isEnabled: boolean = true;

  async initialize(config: FirebaseConfig): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.state.isInitialized || this.state.isInitializing) return;

    this.state.isInitializing = true;
    try {
      this.app = initializeApp(config);
      this.analytics = getAnalytics(this.app);
      this.state.isInitialized = true;
      this.state.isInitializing = false;
      
      this.loadOfflineQueue();
      this.flushQueue();
      this.setupNetworkListeners();
      analyticsLogger.info('Firebase Client initialized successfully');
    } catch (error) {
      this.state.isInitializing = false;
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      analyticsLogger.error('Firebase init failed', error);
    }
  }

  trackEvent(event: AnalyticsEvent): void {
    if (typeof window === 'undefined' || !this.isEnabled) return;

    if (!this.state.isInitialized) {
      this.queueEvent(event);
      return;
    }

    if (!this.isOnline) {
      this.queueOfflineEvent(event);
      return;
    }

    this.sendEvent(event);
  }

  identifyUser(userId: string, properties?: Record<string, any>): void {
    if (typeof window === 'undefined' || !this.isEnabled || !this.analytics) return;
    try {
      setUserId(this.analytics, userId);
      if (properties) {
        setUserProperties(this.analytics, normalizeEventParams(properties));
      }
    } catch (error) {
      analyticsLogger.error('Firebase identify user failed', error);
    }
  }

  resetUser(): void {
    if (typeof window === 'undefined' || !this.analytics) return;
    try {
      setUserId(this.analytics, null);
      this.clearQueues();
    } catch (error) {
      analyticsLogger.error('Firebase reset user failed', error);
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  private sendEvent(event: AnalyticsEvent): void {
    if (!this.analytics) return;
    try {
      const eventName = normalizeEventName(event.name);
      const payload = { ...event.properties, ...event.context };
      const normalizedParams = normalizeEventParams(payload);

      logEvent(this.analytics, eventName, normalizedParams);
      analyticsLogger.debug(`Firebase tracked: ${eventName}`, normalizedParams);
    } catch (error) {
      analyticsLogger.error('Firebase tracking failed', error);
    }
  }

  private queueEvent(event: AnalyticsEvent): void {
    const item: QueuedEvent = {
      ...event,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      retryCount: 0
    };
    if (this.queue.length >= QUEUE_LIMITS.MAX_QUEUE_SIZE) this.queue.shift();
    this.queue.push(item);
  }

  private queueOfflineEvent(event: AnalyticsEvent): void {
    const queuedEvent: QueuedEvent = {
      ...event,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      retryCount: 0
    };
    const item: OfflineQueueItem = {
      event: queuedEvent,
      timestamp: new Date().toISOString(),
      size_bytes: JSON.stringify(queuedEvent).length
    };

    if (item.size_bytes > QUEUE_LIMITS.MAX_EVENT_SIZE_BYTES) return;
    if (this.offlineQueue.length >= QUEUE_LIMITS.MAX_OFFLINE_QUEUE_SIZE) this.offlineQueue.shift();
    
    this.offlineQueue.push(item);
    this.saveOfflineQueue();
  }

  private flushQueue(): void {
    if (this.queue.length === 0) return;
    this.queue.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const events = [...this.queue];
    this.queue = [];
    events.forEach(e => this.sendEvent(e));
  }

  private flushOfflineQueue(): void {
    if (this.offlineQueue.length === 0) return;
    this.offlineQueue.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const items = [...this.offlineQueue];
    this.offlineQueue = [];
    this.saveOfflineQueue();
    items.forEach(item => this.sendEvent(item.event));
  }

  private clearQueues(): void {
    this.queue = [];
    this.offlineQueue = [];
    this.saveOfflineQueue();
  }

  private saveOfflineQueue(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(ANALYTICS_STORAGE_KEYS.OFFLINE_QUEUE + '_firebase', JSON.stringify(this.offlineQueue));
    } catch (e) {
      analyticsLogger.error('Failed to save offline queue', e);
    }
  }

  private loadOfflineQueue(): void {
    if (typeof window === 'undefined') return;
    try {
      const json = localStorage.getItem(ANALYTICS_STORAGE_KEYS.OFFLINE_QUEUE + '_firebase');
      if (json) {
        this.offlineQueue = JSON.parse(json);
        this.flushOfflineQueue();
      }
    } catch (e) {
      analyticsLogger.error('Failed to load offline queue', e);
    }
  }

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushOfflineQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
    this.isOnline = navigator.onLine;
  }
}

export const firebaseClient = new FirebaseClient();

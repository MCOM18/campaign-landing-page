export enum AnalyticsProvider {
  CLEVERTAP = 'clevertap',
  FIREBASE = 'firebase',
  BACKEND = 'backend',
}

export enum EventCriticality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ProviderState {
  isInitialized: boolean;
  isInitializing: boolean;
  error?: string;
}

export interface QueuedEvent {
  id: string;
  name: string;
  properties?: Record<string, any>;
  criticality?: EventCriticality;
  providers?: AnalyticsProvider[];
  context?: any;
  timestamp: string;
  retryCount: number;
}

export interface OfflineQueueItem {
  event: QueuedEvent;
  timestamp: string;
  size_bytes: number;
}

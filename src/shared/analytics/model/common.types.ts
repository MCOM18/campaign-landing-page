import type { AnalyticsProvider, EventCriticality } from './provider.types';
import type { EventContext } from './context.types';

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  criticality?: EventCriticality;
  providers?: AnalyticsProvider[];
  context?: Partial<EventContext>;
}

export interface ScreenViewedEvent {
  screen_name: string;
  screen_path: string;
  referrer?: string;
  previous_screen?: string;
}

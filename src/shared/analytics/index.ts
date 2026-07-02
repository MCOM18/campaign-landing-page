/**
 * Analytics Module
 * 
 * Production-ready Firebase Analytics (GA4) integration.
 */

export { analyticsService } from './services/analytics.service';
export { AnalyticsProvider } from './providers/AnalyticsProvider';
export type { AnalyticsEvent } from './model/common.types';
export type { EventContext } from './model/context.types';
export { AnalyticsProvider as AnalyticsProviderEnum } from './model/provider.types';
export { EventCriticality } from './model/provider.types';
export { getSourceLink } from './utils/getSourceLink';

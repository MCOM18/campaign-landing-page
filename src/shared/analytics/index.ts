/**
 * Analytics Module
 * 
 * Mock implementation for 7day-Trial-web
 */

export { analyticsService } from './services/analytics.service';
export type AnalyticsEvent = any;
export type EventContext = any;
export enum AnalyticsProvider {
  CLEVERTAP = 'clevertap',
  FIREBASE = 'firebase'
}

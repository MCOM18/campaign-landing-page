import { AnalyticsEvent } from '../model/common.types';
import { analyticsLogger } from '../utils/logger';

class FacebookPixelClient {
  trackEvent(event: AnalyticsEvent): void {
    if (typeof window === 'undefined' || !(window as any).fbq) {
      return;
    }

    try {
      const fbq = (window as any).fbq;
      
      // Map internal events to standard FB events
      switch (event.name) {
        case 'campaign_landing_impression':
          fbq('track', 'ViewContent', {
            content_name: event.properties?.campaign_name || 'Campaign Landing Page',
            content_ids: [event.properties?.campaign_id || ''],
            content_type: 'product'
          });
          break;
          
        case 'login_started':
          fbq('track', 'Contact', event.properties);
          break;
          
        case 'login_completed':
          fbq('track', 'CompleteRegistration', {
            content_name: 'User Login/Signup',
            status: 'completed'
          });
          break;
          
        case 'initiate_checkout':
          fbq('track', 'InitiateCheckout', {
            value: event.properties?.amount || 0,
            currency: event.properties?.currency || 'INR',
            content_name: event.properties?.plan_name || 'Subscription Plan'
          });
          break;
          
        case 'payment_success':
          fbq('track', 'Purchase', {
            value: event.properties?.amount || 0,
            currency: event.properties?.currency || 'INR',
            content_name: event.properties?.plan_name || 'Subscription Plan',
            order_id: event.properties?.order_id
          });
          break;
          
        default:
          // For any other event (like payment_failure, otp_sent, otp_verified), send as a custom event
          fbq('trackCustom', event.name, event.properties);
      }
    } catch (error) {
      analyticsLogger.error('FacebookPixel: Failed to track event', error);
    }
  }
}

export const facebookPixelClient = new FacebookPixelClient();

import { GA4_LIMITS } from '../constants/analytics.constants';

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

function truncate(str: string, maxLength: number): string {
  return str.length <= maxLength ? str : str.substring(0, maxLength);
}

export function normalizeEventName(name: string): string {
  return truncate(toSnakeCase(name), GA4_LIMITS.MAX_EVENT_NAME_LENGTH);
}

export function normalizeEventParams(params: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  let count = 0;
  
  for (const [key, value] of Object.entries(params)) {
    if (count >= GA4_LIMITS.MAX_PARAMS_PER_EVENT) break;
    
    const normKey = truncate(toSnakeCase(key), GA4_LIMITS.MAX_PARAM_NAME_LENGTH);
    let normValue = value;
    
    if (typeof value === 'string') {
      normValue = truncate(value, GA4_LIMITS.MAX_PARAM_VALUE_LENGTH);
    } else if (typeof value === 'object' && value !== null) {
      normValue = truncate(JSON.stringify(value), GA4_LIMITS.MAX_PARAM_VALUE_LENGTH);
    } else if (typeof value === 'boolean') {
      normValue = value ? 'true' : 'false';
    }
    
    normalized[normKey] = normValue;
    count++;
  }
  
  return normalized;
}

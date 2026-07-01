import { isDevelopment } from '../constants/analytics.constants';

const PREFIX = '[Analytics]';

export const analyticsLogger = {
  info: (...args: any[]) => isDevelopment() && console.log(PREFIX, ...args),
  warn: (...args: any[]) => isDevelopment() && console.warn(PREFIX, ...args),
  error: (...args: any[]) => isDevelopment() && console.error(PREFIX, ...args),
  debug: (...args: any[]) => isDevelopment() && console.debug(PREFIX, ...args),
};

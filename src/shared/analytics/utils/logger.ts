import { isDevelopment } from '../constants/analytics.constants';

const PREFIX = '[Analytics]';

const shouldLog = () => {
  return isDevelopment() && process.env.NEXT_PUBLIC_CONSOLE_LOGGER_OFF !== "false";
};

export const analyticsLogger = {
  info: (...args: any[]) => shouldLog() && console.log(PREFIX, ...args),
  warn: (...args: any[]) => shouldLog() && console.warn(PREFIX, ...args),
  error: (...args: any[]) => shouldLog() && console.error(PREFIX, ...args),
  debug: (...args: any[]) => shouldLog() && console.debug(PREFIX, ...args),
};

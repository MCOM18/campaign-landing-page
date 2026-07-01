export interface SessionContext {
  session_id: string;
  session_start_time: string;
  session_duration_seconds?: number;
}

export interface DeviceContext {
  device_id: string;
  device_type: string;
  browser: string;
  browser_version: string;
  os: string;
  os_version: string;
  screen_width: number;
  screen_height: number;
  viewport_width: number;
  viewport_height: number;
  timezone: string;
  language: string;
}

export interface UserContext {
  user_id: string;
  phone?: string;
  email?: string;
  is_guest: boolean;
  created_at: string;
}

export interface EventContext {
  session?: SessionContext;
  device: DeviceContext;
  user?: UserContext;
  timestamp: string;
  environment: 'development' | 'production';
  self_link?: string;
  suffix?: string;
  campaign?: Record<string, any>;
}

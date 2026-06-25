/**
 * App Initialization
 * Called once on app start to initialize stores from localStorage
 */

import { initAuth } from "@store/useAuthStore";
import { logger } from "@lib/logger/logger";

export function initApp(): void {
  logger.info('[Init] Initializing app...');
  
  // Initialize auth from localStorage
  initAuth();
  
  logger.info('[Init] App initialized');
}

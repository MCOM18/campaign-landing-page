import { useAuthStore } from '@/store/useAuthStore'; // Match your store path
import type { UserContext } from '../model/context.types';

export function buildUserPayload(): UserContext | undefined {
  const { user, isAuthenticated } = useAuthStore.getState();
  
  if (!isAuthenticated || !user) {
    return undefined;
  }
  
  return {
    user_id: user.id,
    phone: user.phone || undefined,
    email: user.email || undefined,
    is_guest: user.isGuest || false,
    created_at: user.createdAt,
  };
}

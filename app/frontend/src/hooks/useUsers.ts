/**
 * useUsers Hook
 * Fetches and manages user list for admin portal
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '@/services/adminApi';
import type { AdminUser } from '@/types/admin';

interface UseUsersOptions {
  limit?: number;
  autoFetch?: boolean;
}

interface UseUsersReturn {
  users: AdminUser[];
  loading: boolean;
  error: string | null;
  source: 'supabase' | 'mock' | null;
  total: number;
  refetch: () => Promise<void>;
  updateUserStatus: (userId: string, status: 'active' | 'suspended') => Promise<boolean>;
  // Filter helpers
  filterUsers: (options: {
    search?: string;
    plan?: string;
    status?: string;
  }) => AdminUser[];
}

export function useUsers(options: UseUsersOptions = {}): UseUsersReturn {
  const { limit = 100, autoFetch = true } = options;
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'mock' | null>(null);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminApi.getUsers(limit);

      if (response.success && response.data) {
        setUsers(response.data);
        setSource(response.source || null);
        setTotal(response.total || response.data.length);
      } else {
        setError(response.error || 'Failed to load users');
      }
    } catch (err) {
      setError('Network error loading users');
      console.error('useUsers error:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (autoFetch) {
      fetchUsers();
    }
  }, [autoFetch, fetchUsers]);

  const updateUserStatus = useCallback(
    async (userId: string, status: 'active' | 'suspended'): Promise<boolean> => {
      try {
        const response = status === 'suspended'
          ? await adminApi.suspendUser(userId)
          : await adminApi.activateUser(userId);
        
        if (response.success) {
          setUsers(prev =>
            prev.map(u => (u.id === userId ? { ...u, status } : u))
          );
          return true;
        }
        return false;
      } catch (err) {
        console.error('updateUserStatus error:', err);
        return false;
      }
    },
    []
  );

  const filterUsers = useCallback(
    (filterOptions: { search?: string; plan?: string; status?: string }) => {
      const { search = '', plan = 'All Plans', status = 'All Status' } = filterOptions;
      
      return users.filter(user => {
        const matchSearch =
          !search ||
          user.name.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase());
        
        const matchPlan =
          plan === 'All Plans' ||
          user.plan.toLowerCase() === plan.toLowerCase();
        
        const matchStatus =
          status === 'All Status' ||
          user.status.toLowerCase() === status.toLowerCase();
        
        return matchSearch && matchPlan && matchStatus;
      });
    },
    [users]
  );

  return {
    users,
    loading,
    error,
    source,
    total,
    refetch: fetchUsers,
    updateUserStatus,
    filterUsers,
  };
}

export default useUsers;

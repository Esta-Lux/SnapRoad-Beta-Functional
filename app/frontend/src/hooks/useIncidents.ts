/**
 * useIncidents Hook
 * Manages incidents/road reports for admin moderation
 */

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/adminApi';
import type { AdminIncident, IncidentTab } from '@/types/admin';

interface UseIncidentsOptions {
  autoFetch?: boolean;
}

interface UseIncidentsReturn {
  incidents: AdminIncident[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addIncident: (incident: AdminIncident) => void;
  updateIncidentStatus: (id: string, status: AdminIncident['status']) => void;
  moderateIncident: (id: string, outcome: 'approved' | 'rejected') => Promise<boolean>;
  simulateIncident: () => Promise<AdminIncident | null>;
  filterByTab: (tab: IncidentTab, confidenceThreshold?: number) => AdminIncident[];
  getTabCounts: () => Record<IncidentTab, number>;
}

export function useIncidents(options: UseIncidentsOptions = {}): UseIncidentsReturn {
  const { autoFetch = true } = options;
  
  const [incidents, setIncidents] = useState<AdminIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminApi.getIncidents();

      if (response.success && response.data) {
        setIncidents(response.data);
      }
    } catch (err) {
      console.error('useIncidents fetch error:', err);
      setError('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchIncidents();
    }
  }, [autoFetch, fetchIncidents]);

  const addIncident = useCallback((incident: AdminIncident) => {
    setIncidents(prev => {
      // Check if incident already exists
      if (prev.some(i => i.id === incident.id)) {
        return prev;
      }
      return [incident, ...prev];
    });
  }, []);

  const updateIncidentStatus = useCallback(
    (id: string, status: AdminIncident['status']) => {
      setIncidents(prev =>
        prev.map(i => (i.id === id ? { ...i, status } : i))
      );
    },
    []
  );

  const moderateIncident = useCallback(
    async (id: string, outcome: 'approved' | 'rejected'): Promise<boolean> => {
      updateIncidentStatus(id, outcome);

      try {
        const response = await adminApi.moderateIncident(id, outcome);
        return response.success;
      } catch (err) {
        console.error('moderateIncident error:', err);
        updateIncidentStatus(id, 'pending');
        return false;
      }
    },
    [updateIncidentStatus]
  );

  const simulateIncident = useCallback(async (): Promise<AdminIncident | null> => {
    try {
      const API_BASE = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || '';
      const res = await fetch(`${API_BASE}/api/admin/moderation/simulate`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data) {
        const newIncident: AdminIncident = {
          ...data.data,
          reportedAt: 'just now',
        };
        addIncident(newIncident);
        return newIncident;
      }
    } catch (err) {
      console.error('simulateIncident error:', err);
    }
    return null;
  }, [addIncident]);

  const filterByTab = useCallback(
    (tab: IncidentTab, confidenceThreshold = 0): AdminIncident[] => {
      return incidents.filter(i => {
        if (tab === 'blurred') {
          return i.is_blurred && (i.confidence || 0) >= confidenceThreshold;
        }
        const mappedStatus = i.status === 'pending' ? 'new' : i.status;
        return mappedStatus === tab && (i.confidence || 0) >= confidenceThreshold;
      });
    },
    [incidents]
  );

  const getTabCounts = useCallback((): Record<IncidentTab, number> => {
    return {
      new: incidents.filter(i => i.status === 'pending').length,
      blurred: incidents.filter(i => i.is_blurred).length,
      review: incidents.filter(i => i.status === 'pending').length,
      approved: incidents.filter(i => i.status === 'approved').length,
      rejected: incidents.filter(i => i.status === 'rejected').length,
    };
  }, [incidents]);

  return {
    incidents,
    loading,
    error,
    refetch: fetchIncidents,
    addIncident,
    updateIncidentStatus,
    moderateIncident,
    simulateIncident,
    filterByTab,
    getTabCounts,
  };
}

export default useIncidents;

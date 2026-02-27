/**
 * useIncidents Hook
 * Manages incidents/road reports for admin moderation
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '@/services/adminApi';
import type { AdminIncident, RoadReport, IncidentTab } from '@/types/admin';

interface UseIncidentsOptions {
  autoFetch?: boolean;
}

interface UseIncidentsReturn {
  incidents: AdminIncident[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addIncident: (incident: AdminIncident) => void;
  updateIncidentStatus: (id: number, status: AdminIncident['status']) => void;
  moderateIncident: (id: number, outcome: 'approved' | 'rejected') => Promise<boolean>;
  simulateIncident: () => Promise<AdminIncident | null>;
  filterByTab: (tab: IncidentTab, confidenceThreshold?: number) => AdminIncident[];
  getTabCounts: () => Record<IncidentTab, number>;
}

// Default mock incidents for initial state
const INITIAL_INCIDENTS: AdminIncident[] = [
  { id: 1, type: 'Speeding (85mph in 65)', confidence: 94, status: 'new', blurred: false, location: 'I-70 E, Columbus OH', reportedAt: '2 min ago' },
  { id: 2, type: 'Hard Braking Event', confidence: 88, status: 'new', blurred: true, location: 'High St & Broad, Columbus', reportedAt: '8 min ago' },
  { id: 3, type: 'Reckless Lane Change', confidence: 96, status: 'review', blurred: true, location: 'I-270 S, Exit 17', reportedAt: '15 min ago' },
  { id: 4, type: 'Phone Usage Detected', confidence: 91, status: 'new', blurred: false, location: '5th Ave, Columbus OH', reportedAt: '22 min ago' },
  { id: 5, type: 'Red Light Violation', confidence: 83, status: 'review', blurred: false, location: 'Broad & 4th, Columbus', reportedAt: '31 min ago' },
  { id: 6, type: 'Road Obstruction', confidence: 79, status: 'approved', blurred: false, location: 'Morse Rd, Columbus', reportedAt: '1 hr ago' },
  { id: 7, type: 'Aggressive Tailgating', confidence: 90, status: 'new', blurred: true, location: 'I-71 N, near Dublin', reportedAt: '45 min ago' },
  { id: 8, type: 'Wrong Way Driver', confidence: 99, status: 'review', blurred: false, location: 'SR-315 N, Columbus', reportedAt: '2 hrs ago' },
  { id: 9, type: 'Sharp Cornering', confidence: 76, status: 'rejected', blurred: false, location: 'Riverside Dr, Columbus', reportedAt: '3 hrs ago' },
];

export function useIncidents(options: UseIncidentsOptions = {}): UseIncidentsReturn {
  const { autoFetch = true } = options;
  
  const [incidents, setIncidents] = useState<AdminIncident[]>(INITIAL_INCIDENTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert RoadReport to AdminIncident format
  const convertToIncident = useCallback((report: RoadReport): AdminIncident => {
    const severityConfidence: Record<string, number> = { low: 70, medium: 85, high: 95 };
    return {
      id: report.id,
      type: report.type,
      confidence: severityConfidence[report.severity] || 80,
      status: report.status === 'active' ? 'new' : report.status === 'resolved' ? 'approved' : 'rejected',
      blurred: false,
      location: report.address || `${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}`,
      reportedAt: formatTimeAgo(report.created_at),
      lat: report.lat,
      lng: report.lng,
    };
  }, []);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminApi.getIncidents();

      if (response.success && response.data && response.data.length > 0) {
        const apiIncidents = response.data.map(convertToIncident);
        // Merge API incidents with existing ones, avoiding duplicates
        setIncidents(prev => {
          const existingIds = new Set(apiIncidents.map(i => i.id));
          const uniquePrev = prev.filter(i => !existingIds.has(i.id));
          return [...apiIncidents, ...uniquePrev];
        });
      }
    } catch (err) {
      console.error('useIncidents fetch error:', err);
      // Keep initial incidents on error
    } finally {
      setLoading(false);
    }
  }, [convertToIncident]);

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
    (id: number, status: AdminIncident['status']) => {
      setIncidents(prev =>
        prev.map(i => (i.id === id ? { ...i, status } : i))
      );
    },
    []
  );

  const moderateIncident = useCallback(
    async (id: number, outcome: 'approved' | 'rejected'): Promise<boolean> => {
      // Optimistic update
      updateIncidentStatus(id, outcome);

      try {
        const response = await adminApi.moderateIncident(id, outcome);
        return response.success;
      } catch (err) {
        console.error('moderateIncident error:', err);
        // Revert on error - reset to 'review' status
        updateIncidentStatus(id, 'review');
        return false;
      }
    },
    [updateIncidentStatus]
  );

  const simulateIncident = useCallback(async (): Promise<AdminIncident | null> => {
    try {
      const response = await adminApi.simulateIncident();
      if (response.success && response.data) {
        const newIncident: AdminIncident = {
          ...response.data,
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
          return i.blurred && i.confidence >= confidenceThreshold;
        }
        return i.status === tab && i.confidence >= confidenceThreshold;
      });
    },
    [incidents]
  );

  const getTabCounts = useCallback((): Record<IncidentTab, number> => {
    return {
      new: incidents.filter(i => i.status === 'new').length,
      blurred: incidents.filter(i => i.blurred).length,
      review: incidents.filter(i => i.status === 'review').length,
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

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export default useIncidents;

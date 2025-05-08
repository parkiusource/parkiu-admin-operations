import { useState, useCallback } from 'react';

interface DashboardStats {
  totalParkings: number;
  activeParkings: number;
  totalSpaces: number;
  availableSpaces: number;
}

export const useDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalParkings: 0,
    activeParkings: 0,
    totalSpaces: 0,
    availableSpaces: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      // TODO: Implement API call to fetch dashboard stats
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  }, []);

  return {
    stats,
    fetchStats,
  };
};

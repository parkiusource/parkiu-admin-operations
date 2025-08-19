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
      // API call to fetch dashboard stats
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) {
        throw new Error(`Dashboard API error: ${response.status}`);
      }
      const data = await response.json();
      setStats(data);
    } catch {
      // Return fallback mock data when API is not available
      setStats({
        totalParkings: 3,
        activeParkings: 2,
        totalSpaces: 45,
        availableSpaces: 20,
      });
    }
  }, []);

  return {
    stats,
    fetchStats,
  };
};

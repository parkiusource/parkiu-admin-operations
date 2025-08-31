// ===================================
// TIPOS PARA LAS APIs DEL DASHBOARD
// ===================================

export interface SystemStatsResponse {
  totalParkings: number;
  activeParkings: number;
  totalSpaces: number;
  occupiedSpaces: number;
  todayRevenue: number;
  todayTransactions: number;
  activeUsers: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  lastUpdated: string; // ISO date string
}

export interface ParkingOverviewItem {
  id: string;
  name: string;
  location: string;
  address?: string;
  totalSpaces: number;
  occupiedSpaces: number;
  availableSpaces: number;
  todayRevenue: number;
  todayTransactions: number;
  status: 'active' | 'maintenance' | 'inactive';
  occupancyRate: number; // Percentage
  lastActivity: string; // ISO date string
}

export interface ParkingOverviewResponse {
  parkings: ParkingOverviewItem[];
  totalCount: number;
  page: number;
  limit: number;
}

export interface ActivityItem {
  id: string;
  type: 'parking_created' | 'user_registered' | 'transaction_peak' | 'system_alert' | 'maintenance' | 'sensor_offline';
  title: string;
  description: string;
  timestamp: string; // ISO date string
  status: 'success' | 'warning' | 'error' | 'info';
  metadata?: {
    parkingId?: string;
    parkingName?: string;
    userId?: string;
    sensorId?: string;
    amount?: number;
    [key: string]: any;
  };
}

export interface RecentActivityResponse {
  activities: ActivityItem[];
  totalCount: number;
  hasMore: boolean;
}

export interface RevenueStats {
  today: number;
  yesterday: number;
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  lastMonth: number;
  growth: {
    daily: number; // Percentage change vs yesterday
    weekly: number; // Percentage change vs last week
    monthly: number; // Percentage change vs last month
  };
}

export interface OccupancyStats {
  current: {
    occupied: number;
    available: number;
    total: number;
    rate: number; // Percentage
  };
  hourly: Array<{
    hour: number; // 0-23
    occupancyRate: number;
    transactions: number;
  }>;
  daily: Array<{
    date: string; // YYYY-MM-DD
    averageOccupancy: number;
    peakOccupancy: number;
    transactions: number;
  }>;
}

export interface SystemHealthResponse {
  overall: 'excellent' | 'good' | 'warning' | 'critical';
  components: {
    database: 'healthy' | 'degraded' | 'down';
    sensors: {
      total: number;
      online: number;
      offline: number;
      status: 'healthy' | 'degraded' | 'critical';
    };
    payments: 'healthy' | 'degraded' | 'down';
    notifications: 'healthy' | 'degraded' | 'down';
  };
  alerts: Array<{
    id: string;
    type: 'sensor_offline' | 'payment_failed' | 'database_slow' | 'high_occupancy';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
    resolved: boolean;
  }>;
}

export interface UserStats {
  total: number;
  active: number; // Active in last 30 days
  new: number; // Registered today
  growth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

// ===================================
// PARÁMETROS PARA LAS CONSULTAS
// ===================================

export interface DashboardStatsParams {
  timeRange?: 'today' | 'week' | 'month' | 'year';
  timezone?: string;
}

export interface ParkingOverviewParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'maintenance' | 'inactive' | 'all';
  sortBy?: 'name' | 'occupancy' | 'revenue' | 'lastActivity';
  sortOrder?: 'asc' | 'desc';
}

export interface RecentActivityParams {
  limit?: number;
  types?: ActivityItem['type'][];
  since?: string; // ISO date string
}

export interface OccupancyStatsParams {
  parkingId?: string; // If not provided, returns system-wide stats
  timeRange: 'today' | 'week' | 'month';
  timezone?: string;
}

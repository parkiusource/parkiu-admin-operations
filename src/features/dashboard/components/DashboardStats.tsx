import { Card, CardContent, CardHeader } from '../../../components/common/Card';
import { useDashboard } from '../hooks/useDashboard';

export const DashboardStats = () => {
  const { stats } = useDashboard();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium">Total Parqueaderos</h3>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalParkings}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium">Parqueaderos Activos</h3>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeParkings}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium">Total Espacios</h3>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalSpaces}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium">Espacios Disponibles</h3>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.availableSpaces}</div>
        </CardContent>
      </Card>
    </div>
  );
};

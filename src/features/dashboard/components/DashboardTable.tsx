import { Card, CardContent, CardHeader, CardTitle } from '../../../components/common/Card';

export const DashboardTable = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimas Actividades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          Tabla de actividades (pendiente de implementar)
        </div>
      </CardContent>
    </Card>
  );
};

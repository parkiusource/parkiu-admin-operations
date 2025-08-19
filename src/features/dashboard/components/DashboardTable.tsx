import { Card, CardContent, CardHeader } from '../../../components/common/Card';

export const DashboardTable = () => {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Últimas Actividades</h3>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          Tabla de actividades (pendiente de implementar)
        </div>
      </CardContent>
    </Card>
  );
};

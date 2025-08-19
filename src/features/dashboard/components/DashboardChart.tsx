import { Card, CardContent, CardHeader } from '../../../components/common/Card';

export const DashboardChart = () => {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Estadísticas de Uso</h3>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          Gráfico de estadísticas (pendiente de implementar)
        </div>
      </CardContent>
    </Card>
  );
};

import { Card, CardContent, CardHeader, CardTitle } from '../../../components/common/Card';

export const DashboardChart = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estadísticas de Uso</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          Gráfico de estadísticas (pendiente de implementar)
        </div>
      </CardContent>
    </Card>
  );
};

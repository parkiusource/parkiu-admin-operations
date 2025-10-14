import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuBuilding, LuMapPin, LuCar, LuSettings, LuArrowRight } from 'react-icons/lu';
import { ParkingLot } from '@/services/parking/types';

// Función para formatear títulos a Title Case
const toTitleCase = (str: string) => {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

interface ParkingLotCardProps {
  parking: ParkingLot;
}

export function ParkingLotCard({ parking }: ParkingLotCardProps) {
  const navigate = useNavigate();

  // ✅ Calcular estadísticas usando SOLO los datos que ya tenemos del endpoint /parking-lots/
  const stats = useMemo(() => {
    const total = parking.total_spots || 0;
    const available = parking.available_spaces || 0;
    const occupied = Math.max(0, total - available); // Asegurar que no sea negativo
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    // Determinar si tenemos datos reales de ocupación
    const hasRealData = typeof parking.available_spaces === 'number';

    return {
      totalSpots: total,
      availableSpots: available,
      occupiedSpots: occupied,
      occupancyRate,
      hasRealData
    };
  }, [parking.total_spots, parking.available_spaces]);

  // ✅ Validar que el parqueadero tenga ID
  if (!parking.id) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-red-600 text-center">Error: Parqueadero sin ID válido</p>
      </div>
    );
  }

  return (
    <div
      className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-parkiu-200 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full"
      onClick={() => navigate(`/parking/${parking.id}`)}
    >
      {/* Header con gradiente sutil */}
      <div className="relative p-6 bg-gradient-to-br from-parkiu-50 to-white border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-parkiu-100 rounded-lg">
                <LuBuilding className="w-5 h-5 text-parkiu-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 line-clamp-1">
                {toTitleCase(parking.name)}
              </h3>
            </div>
            <p className="text-slate-600 text-sm flex items-center">
              <LuMapPin className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="line-clamp-1">{parking.address}</span>
            </p>
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            parking.status === 'active'
              ? 'bg-emerald-100 text-emerald-700'
              : parking.status === 'maintenance'
              ? 'bg-orange-100 text-orange-700'
              : parking.status === 'inactive'
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              parking.status === 'active' ? 'bg-emerald-500' :
              parking.status === 'maintenance' ? 'bg-orange-500' :
              parking.status === 'inactive' ? 'bg-red-500' :
              'bg-amber-500'
            }`}></div>
            {parking.status === 'active' ? 'Activo' :
             parking.status === 'maintenance' ? 'Mantenimiento' :
             parking.status === 'inactive' ? 'Inactivo' :
             'Pendiente'}
          </div>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="p-6 flex-1 flex flex-col">
        {/* Barra de ocupación visual */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Ocupación
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{stats.occupancyRate}%</span>
              {stats.hasRealData ? (
                <div className="w-2 h-2 bg-emerald-500 rounded-full" title="Datos del servidor"></div>
              ) : (
                <div className="w-2 h-2 bg-slate-400 rounded-full" title="Sin datos de ocupación"></div>
              )}
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                !stats.hasRealData ? 'bg-slate-400' :
                stats.occupancyRate > 80 ? 'bg-red-500' :
                stats.occupancyRate > 60 ? 'bg-amber-500' :
                'bg-emerald-500'
              }`}
              style={{ width: `${stats.hasRealData ? stats.occupancyRate : 0}%` }}
            ></div>
          </div>
          {/* Mensaje sutil solo cuando no hay datos */}
          {!stats.hasRealData && stats.totalSpots > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              Ocupación no disponible
            </p>
          )}
        </div>

        {/* Métricas en grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="p-3 bg-emerald-50 rounded-lg mb-2">
              <LuCar className="w-5 h-5 text-emerald-600 mx-auto" />
            </div>
            <p className="text-xs text-slate-500 font-medium">DISPONIBLES</p>
            <p className="text-lg font-bold text-emerald-600">{stats.availableSpots}</p>
          </div>

          <div className="text-center">
            <div className="p-3 bg-red-50 rounded-lg mb-2">
              <LuCar className="w-5 h-5 text-red-600 mx-auto" />
            </div>
            <p className="text-xs text-slate-500 font-medium">OCUPADOS</p>
            <p className="text-lg font-bold text-red-600">{stats.occupiedSpots}</p>
          </div>

          <div className="text-center">
            <div className="p-3 bg-slate-100 rounded-lg mb-2">
              <LuMapPin className="w-5 h-5 text-slate-600 mx-auto" />
            </div>
            <p className="text-xs text-slate-500 font-medium">TOTAL</p>
            <p className="text-lg font-bold text-slate-900">{stats.totalSpots}</p>
          </div>
        </div>

        {/* Información adicional */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Tarifa por hora</span>
            <span className="font-semibold text-slate-900">${parking.price_per_hour || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Horario</span>
            <span className="font-semibold text-slate-900 text-xs">
              {parking.opening_time || '06:00'} - {parking.closing_time || '22:00'}
            </span>
          </div>
        </div>

        {/* Botón de acción mejorado - siempre al final */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/parking/${parking.id}`);
          }}
          className="w-full bg-parkiu-600 hover:bg-parkiu-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all duration-200 group-hover:scale-[1.02] mt-auto"
        >
          <LuSettings className="w-4 h-4" />
          Administrar
          <LuArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

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
      className="group bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-parkiu-200 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full"
      onClick={() => navigate(`/parking/${parking.id}`)}
    >
      {/* Header compacto en móvil */}
      <div className="relative p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-parkiu-50 to-white border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <div className="p-1.5 sm:p-2 bg-parkiu-100 rounded-lg flex-shrink-0">
                <LuBuilding className="w-4 h-4 sm:w-5 sm:h-5 text-parkiu-600" />
              </div>
              <h3 className="text-sm sm:text-lg lg:text-xl font-bold text-slate-900 truncate">
                {toTitleCase(parking.name)}
              </h3>
            </div>
            <p className="text-slate-600 text-xs sm:text-sm flex items-center">
              <LuMapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">{parking.address}</span>
            </p>
          </div>
          <div className={`flex-shrink-0 inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
            parking.status === 'active'
              ? 'bg-emerald-100 text-emerald-700'
              : parking.status === 'maintenance'
              ? 'bg-orange-100 text-orange-700'
              : parking.status === 'inactive'
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 sm:mr-2 ${
              parking.status === 'active' ? 'bg-emerald-500' :
              parking.status === 'maintenance' ? 'bg-orange-500' :
              parking.status === 'inactive' ? 'bg-red-500' :
              'bg-amber-500'
            }`}></div>
            <span className="hidden xs:inline">
              {parking.status === 'active' ? 'Activo' :
               parking.status === 'maintenance' ? 'Mant.' :
               parking.status === 'inactive' ? 'Inactivo' :
               'Pend.'}
            </span>
          </div>
        </div>
      </div>

      {/* Estadísticas - Más compactas en móvil */}
      <div className="p-3 sm:p-4 lg:p-6 flex-1 flex flex-col">
        {/* Barra de ocupación */}
        <div className="mb-3 sm:mb-4 lg:mb-6">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-xs sm:text-sm font-medium text-slate-700">Ocupación</span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900">{stats.occupancyRate}%</span>
              {stats.hasRealData ? (
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full"></div>
              ) : (
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-slate-400 rounded-full"></div>
              )}
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 sm:h-2">
            <div
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 ${
                !stats.hasRealData ? 'bg-slate-400' :
                stats.occupancyRate > 80 ? 'bg-red-500' :
                stats.occupancyRate > 60 ? 'bg-amber-500' :
                'bg-emerald-500'
              }`}
              style={{ width: `${stats.hasRealData ? stats.occupancyRate : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Métricas en grid 3 columnas */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4 lg:mb-6">
          <div className="text-center">
            <div className="p-2 sm:p-2.5 lg:p-3 bg-emerald-50 rounded-lg mb-1 sm:mb-2">
              <LuCar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 mx-auto" />
            </div>
            <p className="text-[9px] sm:text-[10px] lg:text-xs text-slate-500 font-medium">DISP.</p>
            <p className="text-sm sm:text-base lg:text-lg font-bold text-emerald-600">{stats.availableSpots}</p>
          </div>

          <div className="text-center">
            <div className="p-2 sm:p-2.5 lg:p-3 bg-red-50 rounded-lg mb-1 sm:mb-2">
              <LuCar className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mx-auto" />
            </div>
            <p className="text-[9px] sm:text-[10px] lg:text-xs text-slate-500 font-medium">OCUP.</p>
            <p className="text-sm sm:text-base lg:text-lg font-bold text-red-600">{stats.occupiedSpots}</p>
          </div>

          <div className="text-center">
            <div className="p-2 sm:p-2.5 lg:p-3 bg-slate-100 rounded-lg mb-1 sm:mb-2">
              <LuMapPin className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 mx-auto" />
            </div>
            <p className="text-[9px] sm:text-[10px] lg:text-xs text-slate-500 font-medium">TOTAL</p>
            <p className="text-sm sm:text-base lg:text-lg font-bold text-slate-900">{stats.totalSpots}</p>
          </div>
        </div>

        {/* Info adicional compacta */}
        <div className="space-y-1.5 sm:space-y-2 lg:space-y-3 mb-3 sm:mb-4 lg:mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-slate-600">$/hora</span>
            <span className="font-semibold text-slate-900 text-xs sm:text-sm">${parking.price_per_hour || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-slate-600">Horario</span>
            <span className="font-semibold text-slate-900 text-[10px] sm:text-xs">
              {parking.opening_time || '06:00'} - {parking.closing_time || '22:00'}
            </span>
          </div>
        </div>

        {/* Botón de acción */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/parking/${parking.id}`);
          }}
          className="w-full bg-parkiu-600 hover:bg-parkiu-700 text-white py-2 sm:py-2.5 lg:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium transition-all duration-200 group-hover:scale-[1.02] mt-auto"
        >
          <LuSettings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Administrar
          <LuArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-auto group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

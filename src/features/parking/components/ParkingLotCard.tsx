import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuBuilding, LuMapPin, LuCar, LuSettings, LuArrowRight } from 'react-icons/lu';
import { useRealParkingSpaces } from '@/hooks/parking';

// Función para formatear títulos a Title Case
const toTitleCase = (str: string) => {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

interface ParkingLot {
  id?: string;
  name: string;
  address: string;
  status?: 'maintenance' | 'active' | 'inactive' | 'pending';
  total_spots?: number;
  price_per_hour?: number;
  opening_time?: string;
  closing_time?: string;
}

interface ParkingLotCardProps {
  parking: ParkingLot;
}

export function ParkingLotCard({ parking }: ParkingLotCardProps) {
  const navigate = useNavigate();

  // ✅ Validar que el parqueadero tenga ID
  if (!parking.id) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-red-600 text-center">Error: Parqueadero sin ID válido</p>
      </div>
    );
  }

  // ✅ Obtener datos reales de espacios para este parqueadero
  const {
    data: parkingSpots = [],
    isLoading: isLoadingSpaces,
    error: spacesError
  } = useRealParkingSpaces(parking.id, {
    enabled: !!parking.id,
    refetchInterval: 1000 * 60 // Refrescar cada minuto
  });

  // ✅ Calcular estadísticas reales basadas en los datos del backend
  const stats = useMemo(() => {
    if (!parkingSpots.length) {
      return {
        totalSpots: parking.total_spots || 0,
        availableSpots: 0,
        occupiedSpots: 0,
        occupancyRate: 0,
        hasRealData: false
      };
    }

    const available = parkingSpots.filter(spot => spot.status === 'available').length;
    const occupied = parkingSpots.filter(spot => spot.status === 'occupied').length;
    const maintenance = parkingSpots.filter(spot => spot.status === 'maintenance').length;
    const total = parkingSpots.length;

    return {
      totalSpots: total,
      availableSpots: available,
      occupiedSpots: occupied,
      maintenanceSpots: maintenance,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
      hasRealData: true
    };
  }, [parkingSpots, parking.total_spots]);

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
        {/* Loading state para espacios */}
        {isLoadingSpaces ? (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-slate-200 rounded w-20 animate-pulse"></div>
              <div className="h-4 bg-slate-200 rounded w-12 animate-pulse"></div>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 animate-pulse"></div>
          </div>
        ) : (
          /* Barra de ocupación visual */
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">
                Ocupación
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{stats.occupancyRate}%</span>
                {stats.hasRealData ? (
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" title="Datos en tiempo real"></div>
                ) : (
                  <div className="w-2 h-2 bg-slate-400 rounded-full" title="Sin espacios registrados"></div>
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
            {/* Mensaje sutil solo cuando hay error */}
            {spacesError && (
              <p className="text-xs text-red-600 mt-1">
                Error al cargar datos
              </p>
            )}
          </div>
        )}

        {/* Métricas en grid */}
        {isLoadingSpaces ? (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="p-3 bg-slate-100 rounded-lg mb-2 animate-pulse">
                  <div className="w-5 h-5 bg-slate-300 rounded mx-auto"></div>
                </div>
                <div className="h-3 bg-slate-200 rounded w-16 mx-auto mb-1 animate-pulse"></div>
                <div className="h-5 bg-slate-200 rounded w-8 mx-auto animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : (
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
        )}

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

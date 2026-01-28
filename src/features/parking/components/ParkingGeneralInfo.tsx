import React from 'react';
import { MapPin as LuMapPin, Clock as LuClock, Phone as LuPhone, User as LuUser, Building as LuBuilding, Calendar as LuCalendar, Shield as LuShield } from 'lucide-react';
import { ParkingLot } from '@/types/parking';

interface ParkingGeneralInfoProps {
  parkingLot: ParkingLot;
}

export const ParkingGeneralInfo: React.FC<ParkingGeneralInfoProps> = ({ parkingLot }) => {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Header compacto en móvil */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl">
            <LuBuilding className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Información</h3>
            <p className="text-[10px] sm:text-xs text-slate-300 hidden xs:block">Detalles del parqueadero</p>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-5">
        <div className="space-y-2 sm:space-y-4">
          {/* Name */}
          <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="p-1.5 sm:p-2 bg-indigo-50 rounded-lg flex-shrink-0">
              <LuBuilding className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-0.5 sm:mb-1">Nombre</p>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 break-words">{parkingLot.name}</p>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="p-1.5 sm:p-2 bg-green-50 rounded-lg flex-shrink-0">
              <LuMapPin className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-0.5 sm:mb-1">Dirección</p>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 break-words">{parkingLot.address}</p>
              {parkingLot.location && (
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 hidden sm:block">
                  {parkingLot.location.latitude.toFixed(4)}, {parkingLot.location.longitude.toFixed(4)}
                </p>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg flex-shrink-0">
              <LuClock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-0.5 sm:mb-1">Horario</p>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {parkingLot.opening_time || '08:00'}
                </span>
                <span className="text-slate-400 text-xs">→</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {parkingLot.closing_time || '20:00'}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                {(() => {
                  const opening = parkingLot.opening_time || '08:00';
                  const closing = parkingLot.closing_time || '20:00';
                  const openingHour = parseInt(opening.split(':')[0]);
                  const closingHour = parseInt(closing.split(':')[0]);
                  const hours = closingHour - openingHour;
                  return `${hours}h de servicio`;
                })()}
              </p>
            </div>
          </div>

          {/* Contact - Solo en desktop o si hay datos */}
          {(parkingLot.contact_name || parkingLot.contact_phone) && (
            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="p-1.5 sm:p-2 bg-purple-50 rounded-lg flex-shrink-0">
                <LuUser className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-0.5 sm:mb-1">Contacto</p>
                {parkingLot.contact_name && (
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 mb-0.5">
                    {parkingLot.contact_name}
                  </p>
                )}
                {parkingLot.contact_phone && (
                  <a
                    href={`tel:${parkingLot.contact_phone}`}
                    className="text-xs sm:text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <LuPhone className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {parkingLot.contact_phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Tax ID - Oculto en móvil muy pequeño */}
          {parkingLot.tax_id && (
            <div className="hidden xs:flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="p-1.5 sm:p-2 bg-amber-50 rounded-lg flex-shrink-0">
                <LuShield className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-0.5 sm:mb-1">NIT</p>
                <p className="text-xs sm:text-sm font-mono font-semibold text-slate-900">{parkingLot.tax_id}</p>
              </div>
            </div>
          )}

          {/* Created Date */}
          {parkingLot.created_at && (
            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="p-1.5 sm:p-2 bg-indigo-50 rounded-lg flex-shrink-0">
                <LuCalendar className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-0.5 sm:mb-1">Registrado</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-900">
                  {new Date(parkingLot.created_at).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParkingGeneralInfo;

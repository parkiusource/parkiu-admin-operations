import React from 'react';
import { MapPin as LuMapPin, Clock as LuClock, Phone as LuPhone, User as LuUser, Building as LuBuilding, Calendar as LuCalendar, Shield as LuShield, Mail as LuMail } from 'lucide-react';
import { ParkingLot } from '@/types/parking';

interface ParkingGeneralInfoProps {
  parkingLot: ParkingLot;
}

export const ParkingGeneralInfo: React.FC<ParkingGeneralInfoProps> = ({ parkingLot }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl">
            <LuBuilding className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Información General</h3>
            <p className="text-xs text-slate-300">Detalles del parqueadero</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="space-y-4">
          {/* Name */}
          <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0">
              <LuBuilding className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500 mb-1">Nombre del Parqueadero</p>
              <p className="text-sm font-semibold text-slate-900 break-words">{parkingLot.name}</p>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
              <LuMapPin className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500 mb-1">Dirección</p>
              <p className="text-sm font-semibold text-slate-900 break-words">{parkingLot.address}</p>
              {parkingLot.location && (
                <p className="text-xs text-slate-500 mt-1">
                  📍 {parkingLot.location.latitude.toFixed(6)}, {parkingLot.location.longitude.toFixed(6)}
                </p>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
              <LuClock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500 mb-1">Horario de Operación</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {parkingLot.opening_time || '08:00'}
                </span>
                <span className="text-slate-400">→</span>
                <span className="text-sm font-bold text-slate-900">
                  {parkingLot.closing_time || '20:00'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {(() => {
                  const opening = parkingLot.opening_time || '08:00';
                  const closing = parkingLot.closing_time || '20:00';
                  const openingHour = parseInt(opening.split(':')[0]);
                  const closingHour = parseInt(closing.split(':')[0]);
                  const hours = closingHour - openingHour;
                  return `${hours} horas de servicio`;
                })()}
              </p>
            </div>
          </div>

          {/* Contact */}
          {(parkingLot.contact_name || parkingLot.contact_phone) && (
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
                <LuUser className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 mb-1">Contacto</p>
                {parkingLot.contact_name && (
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    {parkingLot.contact_name}
                  </p>
                )}
                {parkingLot.contact_phone && (
                  <a
                    href={`tel:${parkingLot.contact_phone}`}
                    className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <LuPhone className="w-3 h-3" />
                    {parkingLot.contact_phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Tax ID */}
          {parkingLot.tax_id && (
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
                <LuShield className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 mb-1">NIT / ID Tributario</p>
                <p className="text-sm font-mono font-semibold text-slate-900">{parkingLot.tax_id}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {parkingLot.description && (
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                <LuMail className="w-4 h-4 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 mb-1">Descripción</p>
                <p className="text-sm text-slate-700 leading-relaxed">{parkingLot.description}</p>
              </div>
            </div>
          )}

          {/* Created Date */}
          {parkingLot.created_at && (
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0">
                <LuCalendar className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 mb-1">Registrado desde</p>
                <p className="text-sm font-semibold text-slate-900">
                  {new Date(parkingLot.created_at).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
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

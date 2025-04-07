import { useStore } from '../../store/useStore';
import { ParkiuDB } from '../../db/schema';
import { useEffect, useState } from 'react';
import { Vehicle, ParkingSpot, Transaction } from '../../db/schema';

interface DashboardStats {
  totalVehicles: number;
  availableSpots: number;
  occupiedSpots: number;
  todayTransactions: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    availableSpots: 0,
    occupiedSpots: 0,
    todayTransactions: 0,
  });

  useEffect(() => {
    const db = new ParkiuDB();

    async function loadStats() {
      const [
        vehicles,
        spots,
        transactions
      ] = await Promise.all([
        db.vehicles.where('status').equals('parked').count(),
        db.parkingSpots.toArray(),
        db.transactions
          .where('entryTime')
          .between(
            new Date(new Date().setHours(0, 0, 0, 0)),
            new Date(new Date().setHours(23, 59, 59, 999))
          )
          .count()
      ]);

      const availableSpots = spots.filter(spot => spot.status === 'available').length;
      const occupiedSpots = spots.filter(spot => spot.status === 'occupied').length;

      setStats({
        totalVehicles: vehicles,
        availableSpots,
        occupiedSpots,
        todayTransactions: transactions,
      });
    }

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Vehículos */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Vehículos en Parqueadero
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalVehicles}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Espacios Disponibles */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Espacios Disponibles
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.availableSpots}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Espacios Ocupados */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Espacios Ocupados
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.occupiedSpots}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Transacciones Hoy */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Transacciones Hoy
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.todayTransactions}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Acciones Rápidas
          </h3>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              className="btn"
              onClick={() => {/* TODO: Implementar registro de entrada */}}
            >
              Registrar Entrada
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {/* TODO: Implementar registro de salida */}}
            >
              Registrar Salida
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {/* TODO: Implementar búsqueda */}}
            >
              Buscar Vehículo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

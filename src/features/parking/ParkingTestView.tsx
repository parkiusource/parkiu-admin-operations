import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { LuWifi, LuWifiOff, LuLoader, LuCheck, LuX, LuRefreshCw, LuServer, LuDatabase } from 'react-icons/lu';

// ✅ IMPORTAR HOOKS PARA BACKEND REAL
import {
  useParkingLots,
  useParkingLot,
  useCreateParkingLot
} from '@/hooks/parking';

// ✅ IMPORTAR TIPOS REALES
import { ParkingLot } from '@/services/parking/types';
import { API_CONFIG } from '@/config/backend';

export default function ParkingTestView() {
  const { getAccessTokenSilently, isAuthenticated, user } = useAuth0();
  const [testResults, setTestResults] = useState<Record<string, {
    status?: string;
    success?: boolean;
    data?: unknown;
    error?: string;
    timestamp?: string;
  }>>({});
  const [isRunningTests, setIsRunningTests] = useState(false);

  // ✅ HOOKS PARA BACKEND REAL
  const {
    parkingLots,
    isLoading: isLoadingLots,
    error: lotsError,
    refetch: refetchLots
  } = useParkingLots();

  const {
    mutateAsync: createParkingLot,
    isPending: isCreating,
    error: createError
  } = useCreateParkingLot({
    onSuccess: (data) => {
      console.log('✅ Parking lot created:', data);
      setTestResults(prev => ({
        ...prev,
        createTest: { success: true, data, timestamp: new Date().toISOString() }
      }));
    },
    onError: (error) => {
      console.error('❌ Create failed:', error);
      setTestResults(prev => ({
        ...prev,
        createTest: { success: false, error: error.message, timestamp: new Date().toISOString() }
      }));
    }
  });

  // Test específico por ID (usando el primer parking lot si existe)
  const firstParkingId = parkingLots?.[0]?.id;
  const {
    parkingLot: testParkingLot,
    isLoading: isLoadingById,
    error: byIdError
  } = useParkingLot(firstParkingId || '1');

  // ✅ FUNCIÓN PARA EJECUTAR TESTS COMPLETOS
  const runBackendTests = async () => {
    setIsRunningTests(true);
    setTestResults({});

    try {
      // Obtener token para futuras funcionalidades
      await getAccessTokenSilently();

      // Test 1: Verificar conectividad
      setTestResults(prev => ({ ...prev, connectivity: { status: 'testing' } }));

      // Test 2: Obtener lista de parking lots
      setTestResults(prev => ({ ...prev, listTest: { status: 'testing' } }));
      await refetchLots();

      // Test 3: Si hay parking lots, probar GET por ID
      if (firstParkingId) {
        setTestResults(prev => ({ ...prev, getByIdTest: { status: 'testing' } }));
      }

      // Test 4: Crear un parking lot de prueba
      setTestResults(prev => ({ ...prev, createTestStatus: { status: 'testing' } }));

      const testParkingData: Omit<ParkingLot, 'id' | 'created_at' | 'updated_at'> = {
        name: `Test Parking ${Date.now()}`,
        address: 'Calle de Prueba 123',
        location: { latitude: 4.6097, longitude: -74.0817 },
        total_spots: 10,
        price_per_hour: 3000,
        description: 'Parking de prueba creado automáticamente',
        opening_time: '06:00',
        closing_time: '22:00',
        contact_name: 'Admin Test',
        contact_phone: '+57 300 123 4567'
      };

      await createParkingLot(testParkingData);

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      setTestResults(prev => ({
        ...prev,
        testSuiteError: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <LuServer className="w-8 h-8 text-blue-600" />
                Test de Conexión Backend
              </h1>
              <p className="text-gray-600 mt-2">
                Pruebas en tiempo real de la conexión con tu backend de parking
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Usuario autenticado:</p>
                <p className="font-medium">{user?.email || 'No autenticado'}</p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                isAuthenticated ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {isAuthenticated ? <LuWifi className="w-4 h-4" /> : <LuWifiOff className="w-4 h-4" />}
                {isAuthenticated ? 'Autenticado' : 'No autenticado'}
              </div>
            </div>
          </div>
        </div>

        {/* Configuración actual */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <LuDatabase className="w-5 h-5" />
            Configuración Backend
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900">URL Base</h3>
              <p className="text-blue-700 font-mono text-sm mt-1">{API_CONFIG.BASE_URL}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900">Timeout</h3>
              <p className="text-green-700 text-sm mt-1">{API_CONFIG.TIMEOUT}ms</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-900">Entorno</h3>
              <p className="text-purple-700 text-sm mt-1">
                {import.meta.env.DEV ? 'Desarrollo' : 'Producción'}
              </p>
            </div>
          </div>
        </div>

        {/* Controles de prueba */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Ejecutar Pruebas</h2>
            <button
              onClick={runBackendTests}
              disabled={isRunningTests || !isAuthenticated}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isRunningTests ? (
                <LuLoader className="w-4 h-4 animate-spin" />
              ) : (
                <LuRefreshCw className="w-4 h-4" />
              )}
              {isRunningTests ? 'Ejecutando...' : 'Ejecutar Tests'}
            </button>
          </div>
        </div>

        {/* Estados actuales de los hooks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Hook: useParkingLots */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🎣 useParkingLots()
              {isLoadingLots && <LuLoader className="w-4 h-4 animate-spin text-blue-500" />}
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className={`font-medium ${
                  isLoadingLots ? 'text-blue-600' :
                  lotsError ? 'text-red-600' : 'text-green-600'
                }`}>
                  {isLoadingLots ? 'Cargando...' :
                   lotsError ? 'Error' : 'Éxito'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Parking Lots:</span>
                <span className="font-medium">{parkingLots?.length || 0}</span>
              </div>

              {lotsError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  <strong>Error:</strong> {(lotsError as Error).message}
                </div>
              )}

              {parkingLots && parkingLots.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Últimos parking lots:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {parkingLots.slice(0, 3).map((lot) => (
                      <div key={lot.id} className="p-2 bg-gray-50 rounded text-xs">
                        <div className="font-medium">{lot.name}</div>
                        <div className="text-gray-500">{lot.address}</div>
                        <div className="text-gray-500">ID: {lot.id}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => refetchLots()}
                disabled={isLoadingLots}
                className="w-full mt-4 bg-blue-50 text-blue-700 px-3 py-2 rounded hover:bg-blue-100 disabled:opacity-50"
              >
                🔄 Refetch
              </button>
            </div>
          </div>

          {/* Hook: useParkingLot (por ID) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🎣 useParkingLot(id)
              {isLoadingById && <LuLoader className="w-4 h-4 animate-spin text-blue-500" />}
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">ID en prueba:</span>
                <span className="font-mono text-sm">{firstParkingId || 'Sin ID'}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className={`font-medium ${
                  isLoadingById ? 'text-blue-600' :
                  byIdError ? 'text-red-600' : 'text-green-600'
                }`}>
                  {isLoadingById ? 'Cargando...' :
                   byIdError ? 'Error' : testParkingLot ? 'Éxito' : 'Sin datos'}
                </span>
              </div>

              {byIdError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  <strong>Error:</strong> {(byIdError as Error).message}
                </div>
              )}

              {testParkingLot && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Datos cargados:</h4>
                  <div className="p-2 bg-gray-50 rounded text-xs">
                    <div className="font-medium">{testParkingLot.name}</div>
                    <div className="text-gray-500">{testParkingLot.address}</div>
                    <div className="text-gray-500">Espacios: {testParkingLot.total_spots}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resultados de tests */}
        {Object.keys(testResults).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resultados de Tests</h2>

            <div className="space-y-4">
              {Object.entries(testResults).map(([testName, result]) => (
                <div key={testName} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {result.status === 'testing' ? (
                      <LuLoader className="w-4 h-4 animate-spin text-blue-500" />
                    ) : result.success === true ? (
                      <LuCheck className="w-4 h-4 text-green-500" />
                    ) : result.success === false ? (
                      <LuX className="w-4 h-4 text-red-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-gray-300" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{testName}</h3>

                    {result.status === 'testing' && (
                      <p className="text-blue-600 text-sm">Ejecutando...</p>
                    )}

                    {result.success === true && (
                      <div>
                        <p className="text-green-600 text-sm">✅ Exitoso</p>
                        {result.data !== undefined && (
                          <pre className="mt-2 text-xs bg-green-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}

                    {result.success === false && (
                      <div>
                        <p className="text-red-600 text-sm">❌ Falló</p>
                        {result.error && (
                          <p className="mt-1 text-red-700 text-xs bg-red-50 p-2 rounded">
                            {result.error}
                          </p>
                        )}
                      </div>
                    )}

                    {result.timestamp && (
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Debug panel */}
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span>Console de Debug</span>
          </div>

          <div className="space-y-1 text-xs">
            <div>🔧 Backend URL: {API_CONFIG.BASE_URL}</div>
            <div>👤 Usuario: {user?.email || 'No autenticado'}</div>
            <div>📊 Parking Lots: {parkingLots?.length || 0}</div>
            <div>⏱️ Último update: {new Date().toLocaleTimeString()}</div>
            {isCreating && <div className="text-yellow-400">🔄 Creando parking lot...</div>}
            {createError && <div className="text-red-400">❌ Error creación: {(createError as Error).message}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

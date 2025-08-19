import { ParkiuDB } from '../db/schema';

/**
 * Función para inicializar datos mock en IndexedDB
 * Para testing y desarrollo del sistema de parking
 */
export async function setupMockParkingData() {
  const db = new ParkiuDB();

  try {
    // Verificar si ya hay datos
    const existingSpots = await db.parkingSpots.count();

    if (existingSpots > 0) {
      console.log(`✅ Ya existen ${existingSpots} espacios en IndexedDB`);
      return;
    }

    console.log('🔧 Inicializando datos mock de parking...');

    // Datos mock de espacios de parqueo
    const mockParkingSpots = [
      { number: "A1", type: "car" as const, status: "available" as const, floor: 1, syncStatus: "synced" as const },
      { number: "A2", type: "car" as const, status: "occupied" as const, floor: 1, syncStatus: "synced" as const },
      { number: "A3", type: "car" as const, status: "available" as const, floor: 1, syncStatus: "synced" as const },
      { number: "A4", type: "car" as const, status: "maintenance" as const, floor: 1, syncStatus: "synced" as const },
      { number: "B1", type: "car" as const, status: "available" as const, floor: 1, syncStatus: "synced" as const },
      { number: "B2", type: "car" as const, status: "occupied" as const, floor: 1, syncStatus: "synced" as const },
      { number: "M1", type: "motorcycle" as const, status: "available" as const, floor: 1, syncStatus: "synced" as const },
      { number: "M2", type: "motorcycle" as const, status: "available" as const, floor: 1, syncStatus: "synced" as const },
      { number: "M3", type: "motorcycle" as const, status: "occupied" as const, floor: 1, syncStatus: "synced" as const },
      { number: "T1", type: "truck" as const, status: "available" as const, floor: 1, syncStatus: "synced" as const },
    ];

    // Insertar espacios de parqueo
    const spotIds = await db.parkingSpots.bulkAdd(mockParkingSpots, { allKeys: true });
    console.log(`✅ Insertados ${spotIds.length} espacios de parqueo`);

    // Datos mock de vehículos (solo para espacios ocupados)
    const mockVehicles = [
      {
        plate: "ABC123",
        type: "car" as const,
        status: "parked" as const,
        entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
        parkingSpotId: spotIds[1], // A2
        syncStatus: "synced" as const
      },
      {
        plate: "XYZ789",
        type: "car" as const,
        status: "parked" as const,
        entryTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hora atrás
        parkingSpotId: spotIds[5], // B2
        syncStatus: "synced" as const
      },
      {
        plate: "MOT456",
        type: "motorcycle" as const,
        status: "parked" as const,
        entryTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
        parkingSpotId: spotIds[8], // M3
        syncStatus: "synced" as const
      }
    ];

    // Insertar vehículos
    const vehicleIds = await db.vehicles.bulkAdd(mockVehicles, { allKeys: true });
    console.log(`✅ Insertados ${vehicleIds.length} vehículos`);

    // Datos mock de transacciones
    const mockTransactions = [
      {
        vehicleId: vehicleIds[0],
        entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: "active" as const,
        syncStatus: "synced" as const
      },
      {
        vehicleId: vehicleIds[1],
        entryTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: "active" as const,
        syncStatus: "synced" as const
      },
      {
        vehicleId: vehicleIds[2],
        entryTime: new Date(Date.now() - 30 * 60 * 1000),
        status: "active" as const,
        syncStatus: "synced" as const
      }
    ];

    // Insertar transacciones
    const transactionIds = await db.transactions.bulkAdd(mockTransactions, { allKeys: true });
    console.log(`✅ Insertadas ${transactionIds.length} transacciones`);

    console.log('🎉 Datos mock inicializados exitosamente:');
    console.log(`   - ${spotIds.length} espacios de parqueo`);
    console.log(`   - ${vehicleIds.length} vehículos`);
    console.log(`   - ${transactionIds.length} transacciones`);

  } catch (error) {
    console.error('❌ Error inicializando datos mock:', error);
    throw error;
  }
}

/**
 * Función para limpiar todos los datos mock
 */
export async function clearMockParkingData() {
  const db = new ParkiuDB();

  try {
    await db.parkingSpots.clear();
    await db.vehicles.clear();
    await db.transactions.clear();
    console.log('🗑️ Datos mock eliminados exitosamente');
  } catch (error) {
    console.error('❌ Error eliminando datos mock:', error);
    throw error;
  }
}

/**
 * Función para obtener estadísticas de datos mock
 */
export async function getMockDataStats() {
  const db = new ParkiuDB();

  try {
    const spotCount = await db.parkingSpots.count();
    const vehicleCount = await db.vehicles.count();
    const transactionCount = await db.transactions.count();

    const stats = {
      spots: spotCount,
      vehicles: vehicleCount,
      transactions: transactionCount,
      hasData: spotCount > 0 || vehicleCount > 0 || transactionCount > 0
    };

    console.log('📊 Estadísticas de datos mock:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return { spots: 0, vehicles: 0, transactions: 0, hasData: false };
  }
}

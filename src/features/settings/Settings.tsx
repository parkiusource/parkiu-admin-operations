import { useState, useEffect } from 'react';
import { LuUser, LuBuilding, LuPrinter, LuDollarSign, LuClock, LuSave, LuLoader, LuPencil, LuX } from 'react-icons/lu';
import { PrinterSelector } from '@/components/common/PrinterSelector';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useToast } from '@/hooks/useToast';
import { useAdminProfileStatus } from '@/hooks/useAdminProfileCentralized';
import {
  useAdminProfileSettings,
  useUpdateAdminProfile,
  useAdminParkingLotsSettings,
  useUpdateParkingLot,
  useParkingLotPricing,
  useUpdateParkingLotPricing,
  useParkingLotSchedule,
  useUpdateParkingLotSchedule
} from '@/api/hooks/useSettingsData';

type TabType = 'profile' | 'parking' | 'pricing' | 'schedule' | 'printing';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [selectedParkingLot, setSelectedParkingLot] = useState<string | null>(null);
  const { addToast } = useToast();
  const { profile: currentProfile } = useAdminProfileStatus();

  // Queries
  const { data: profileData, isLoading: profileLoading } = useAdminProfileSettings();
  const { data: parkingLots, isLoading: parkingLotsLoading } = useAdminParkingLotsSettings();
  const { data: pricingData, isLoading: pricingLoading } = useParkingLotPricing(selectedParkingLot);
  const { data: scheduleData, isLoading: scheduleLoading } = useParkingLotSchedule(selectedParkingLot);

  // Mutations
  const updateProfileMutation = useUpdateAdminProfile();
  const updateParkingLotMutation = useUpdateParkingLot();
  const updatePricingMutation = useUpdateParkingLotPricing();
  const updateScheduleMutation = useUpdateParkingLotSchedule();

  // Auto-select first parking lot
  useEffect(() => {
    if (parkingLots && parkingLots.length > 0 && !selectedParkingLot) {
      setSelectedParkingLot(parkingLots[0].id);
    }
  }, [parkingLots, selectedParkingLot]);

  // Check if user is temp_admin
  const isTempAdmin = currentProfile?.role === 'temp_admin';

  // Profile Form Component
  const ProfileForm = () => {
    const [formData, setFormData] = useState({
      name: '',
      contact_phone: '',
      nit: '',
      avatar_url: ''
    });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
      if (profileData) {
        setFormData({
          name: profileData.name || '',
          contact_phone: profileData.contact_phone || '',
          nit: profileData.nit || '',
          avatar_url: profileData.avatar_url || ''
        });
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileData]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      // Only send changed fields
      const updates: Record<string, string> = {};
      if (formData.name !== (profileData?.name || '')) updates.name = formData.name;
      if (formData.contact_phone !== (profileData?.contact_phone || '')) updates.contact_phone = formData.contact_phone;
      if (formData.nit !== (profileData?.nit || '')) updates.nit = formData.nit;
      if (formData.avatar_url !== (profileData?.avatar_url || '')) updates.avatar_url = formData.avatar_url;

      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        return;
      }

      try {
        await updateProfileMutation.mutateAsync(updates);
        addToast('✅ Perfil actualizado correctamente', 'success');
        setIsEditing(false);
      } catch {
        addToast('❌ Error actualizando perfil', 'error');
      }
    };

    if (profileLoading) {
      return <div className="flex items-center gap-2"><LuLoader className="w-4 h-4 animate-spin" /> Cargando perfil...</div>;
    }

    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-parkiu-100 text-parkiu-700 flex items-center justify-center font-semibold text-xl overflow-hidden">
              {profileData?.avatar_url ? (
                <img
                  src={profileData.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Si la imagen falla, mostrar inicial
                    const target = e.currentTarget as HTMLImageElement;
                    const sibling = target.nextElementSibling as HTMLElement;
                    target.style.display = 'none';
                    if (sibling) sibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <span
                className={`w-full h-full flex items-center justify-center ${profileData?.avatar_url ? 'hidden' : ''}`}
              >
                {(profileData?.name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{profileData?.name || 'Sin nombre'}</h2>
              <p className="text-gray-600">{profileData?.email}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
            disabled={updateProfileMutation.isPending}
          >
            {isEditing ? <LuX className="w-4 h-4" /> : <LuPencil className="w-4 h-4" />}
            {isEditing ? 'Cancelar' : 'Editar'}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Tu nombre completo"
                disabled={!isEditing || updateProfileMutation.isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="3001234567"
                disabled={!isEditing || updateProfileMutation.isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
              <Input
                value={formData.nit}
                onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                placeholder="12345678-9"
                disabled={!isEditing || updateProfileMutation.isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL del Avatar</label>
              <Input
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                placeholder="https://ejemplo.com/avatar.jpg"
                disabled={!isEditing || updateProfileMutation.isPending}
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={updateProfileMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <><LuLoader className="w-4 h-4 animate-spin" /> Guardando...</>
                ) : (
                  <><LuSave className="w-4 h-4" /> Guardar Cambios</>
                )}
              </Button>
            </div>
          )}
        </form>
      </div>
    );
  };

  // Parking Lot Form Component
  const ParkingLotForm = () => {
    const selectedLot = parkingLots?.find((lot: { id: string; name: string; address: string; contact_phone: string; tax_id: string }) => lot.id === selectedParkingLot);
    const [formData, setFormData] = useState({
      name: '',
      address: '',
      contact_phone: '',
      tax_id: ''
    });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
      if (selectedLot) {
        setFormData({
          name: selectedLot.name || '',
          address: selectedLot.address || '',
          contact_phone: selectedLot.contact_phone || '',
          tax_id: selectedLot.tax_id || ''
        });
      }
    }, [selectedLot]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedParkingLot) return;

      // Only send changed fields
      const updates: Record<string, string> = {};
      if (formData.name !== (selectedLot?.name || '')) updates.name = formData.name;
      if (formData.address !== (selectedLot?.address || '')) updates.address = formData.address;
      if (formData.contact_phone !== (selectedLot?.contact_phone || '')) updates.contact_phone = formData.contact_phone;
      if (formData.tax_id !== (selectedLot?.tax_id || '')) updates.tax_id = formData.tax_id;

      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        return;
      }

      try {
        await updateParkingLotMutation.mutateAsync({ parkingLotId: selectedParkingLot, updates });
        addToast('✅ Parqueadero actualizado correctamente', 'success');
        setIsEditing(false);
      } catch {
        addToast('❌ Error actualizando parqueadero', 'error');
      }
    };

    if (parkingLotsLoading) {
      return <div className="flex items-center gap-2"><LuLoader className="w-4 h-4 animate-spin" /> Cargando parqueaderos...</div>;
    }

    if (!parkingLots || parkingLots.length === 0) {
      return (
        <div className="bg-white rounded-xl border p-6 text-center">
          <p className="text-gray-500">No tienes parqueaderos configurados aún.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Selector de parqueadero */}
        <div className="bg-white rounded-xl border p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Parqueadero</label>
          <select
            value={selectedParkingLot || ''}
            onChange={(e) => setSelectedParkingLot(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-parkiu-500 focus:ring-parkiu-500"
          >
            {parkingLots.map((lot: { id: string; name: string }) => (
              <option key={lot.id} value={lot.id}>{lot.name}</option>
            ))}
          </select>
        </div>

        {/* Formulario del parqueadero */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Información del Parqueadero</h3>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              disabled={updateParkingLotMutation.isPending}
            >
              {isEditing ? <LuX className="w-4 h-4" /> : <LuPencil className="w-4 h-4" />}
              {isEditing ? 'Cancelar' : 'Editar'}
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing || updateParkingLotMutation.isPending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  disabled={!isEditing || updateParkingLotMutation.isPending}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={!isEditing || updateParkingLotMutation.isPending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                <Input
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  disabled={!isEditing || updateParkingLotMutation.isPending}
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={updateParkingLotMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateParkingLotMutation.isPending}
                >
                  {updateParkingLotMutation.isPending ? (
                    <><LuLoader className="w-4 h-4 animate-spin" /> Guardando...</>
                  ) : (
                    <><LuSave className="w-4 h-4" /> Guardar Cambios</>
                  )}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  };

  // Defaults y normalización para tarifas (API puede devolver strings o omitir campos)
  const defaultPricingForm = {
    car_rate_per_minute: 0,
    motorcycle_rate_per_minute: 0,
    bicycle_rate_per_minute: 0,
    truck_rate_per_minute: 0,
    fixed_rate_car: 0,
    fixed_rate_motorcycle: 0,
    fixed_rate_bicycle: 0,
    fixed_rate_truck: 0,
    fixed_rate_threshold_minutes: 720,
  };

  const toNumber = (v: unknown): number => {
    if (v == null) return 0;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const normalizePricing = (data: Record<string, unknown> | null) => {
    if (!data || typeof data !== 'object') return defaultPricingForm;
    // No usar || 720: cuando el backend devuelve 0 (tarifa plena deshabilitada), 0 || 720 sería 720
    const rawThreshold = toNumber(data.fixed_rate_threshold_minutes);
    const fixed_rate_threshold_minutes =
      data.fixed_rate_threshold_minutes != null && data.fixed_rate_threshold_minutes !== ''
        ? Math.max(0, rawThreshold)
        : 720;
    return {
      car_rate_per_minute: toNumber(data.car_rate_per_minute),
      motorcycle_rate_per_minute: toNumber(data.motorcycle_rate_per_minute),
      bicycle_rate_per_minute: toNumber(data.bicycle_rate_per_minute),
      truck_rate_per_minute: toNumber(data.truck_rate_per_minute),
      fixed_rate_car: toNumber(data.fixed_rate_car),
      fixed_rate_motorcycle: toNumber(data.fixed_rate_motorcycle),
      fixed_rate_bicycle: toNumber(data.fixed_rate_bicycle),
      fixed_rate_truck: toNumber(data.fixed_rate_truck),
      fixed_rate_threshold_minutes,
    };
  };

  // Pricing Form Component
  const PricingForm = () => {
    const [formData, setFormData] = useState(defaultPricingForm);
    const [fixedRateEnabled, setFixedRateEnabled] = useState(true);

    useEffect(() => {
      if (pricingData) {
        const normalized = normalizePricing(pricingData as Record<string, unknown>);
        setFormData(normalized);
        setFixedRateEnabled((normalized.fixed_rate_threshold_minutes ?? 0) > 0);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- sync form when API pricing loads
    }, [pricingData]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedParkingLot) {
        addToast('Selecciona un parqueadero', 'error');
        return;
      }

      const updates = { ...formData };
      if (!fixedRateEnabled) {
        updates.fixed_rate_threshold_minutes = 0;
      }

      try {
        await updatePricingMutation.mutateAsync({ parkingLotId: selectedParkingLot, updates });
        // Actualizar estado local con lo que enviamos para que el checkbox y el form no se “reviertan”
        setFormData((prev) => ({ ...prev, ...updates }));
        setFixedRateEnabled((updates.fixed_rate_threshold_minutes ?? 0) > 0);
        addToast('✅ Tarifas actualizadas correctamente', 'success');
      } catch (error) {
        console.error('Error actualizando tarifas:', error);
        addToast('❌ Error actualizando tarifas', 'error');
      }
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    };

    if (!selectedParkingLot) {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Parqueadero</label>
            <select
              value=""
              onChange={(e) => setSelectedParkingLot(e.target.value || null)}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-parkiu-500 focus:ring-parkiu-500"
              aria-label="Seleccionar parqueadero"
            >
              <option value="">— Selecciona un parqueadero —</option>
              {parkingLots?.map((lot: { id: string; name: string }) => (
                <option key={lot.id} value={lot.id}>{lot.name}</option>
              ))}
            </select>
          </div>
          <p className="text-sm text-gray-500">Selecciona un parqueadero para ver y editar las tarifas.</p>
        </div>
      );
    }

    if (pricingLoading) {
      return <div className="flex items-center gap-2"><LuLoader className="w-4 h-4 animate-spin" /> Cargando tarifas...</div>;
    }

    return (
      <div className="space-y-4">
        {/* Selector de parqueadero */}
        <div className="bg-white rounded-xl border p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Parqueadero</label>
          <select
            value={selectedParkingLot ?? ''}
            onChange={(e) => setSelectedParkingLot(e.target.value || null)}
            className="w-full rounded-md border border-gray-300 shadow-sm focus:border-parkiu-500 focus:ring-parkiu-500"
            aria-label="Seleccionar parqueadero para configurar tarifas"
          >
            <option value="">— Selecciona un parqueadero —</option>
            {parkingLots?.map((lot: { id: string; name: string }) => (
              <option key={lot.id} value={lot.id}>{lot.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-6">💰 Configuración de Tarifas</h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tarifas por minuto */}
          <div>
            <h4 className="text-md font-medium mb-4">Tarifas por Minuto</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'car_rate_per_minute', label: '🚗 Carro', icon: '🚗' },
                { key: 'motorcycle_rate_per_minute', label: '🏍️ Moto', icon: '🏍️' },
                { key: 'bicycle_rate_per_minute', label: '🚲 Bicicleta', icon: '🚲' },
                { key: 'truck_rate_per_minute', label: '🚛 Camión', icon: '🚛' }
              ].map(({ key, label }) => (
                <div key={key} className="bg-gray-50 p-4 rounded">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label} ($/minuto)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData[key as keyof typeof formData]}
                    onChange={(e) => setFormData({
                      ...formData,
                      [key]: parseFloat(e.target.value) || 0
                    })}
                    disabled={updatePricingMutation.isPending}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ≈ {formatCurrency((formData[key as keyof typeof formData] as number) * 60)}/hora
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Habilitar / deshabilitar tarifa plena */}
          <div className="bg-gray-50 rounded-xl border p-4 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-md font-medium text-gray-900">Tarifa plena (tarifa fija por tiempo prolongado)</h4>
              <p id="tarifa-plena-desc" className="text-sm text-gray-600 mt-0.5">
                Cuando está habilitada, después de cierto número de horas se cobra una tarifa fija en lugar del cobro por minuto.
              </p>
            </div>
            <label className="flex items-center gap-2 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={fixedRateEnabled}
                onChange={(e) => setFixedRateEnabled(e.target.checked)}
                disabled={updatePricingMutation.isPending}
                className="rounded border-gray-300 text-parkiu-600 focus:ring-parkiu-500"
                aria-describedby="tarifa-plena-desc"
              />
              <span className="text-sm font-medium text-gray-700">Habilitar tarifa plena</span>
            </label>
          </div>

          {/* Tarifas fijas (solo visibles/editables si tarifa plena habilitada) */}
          <div className={fixedRateEnabled ? '' : 'opacity-60 pointer-events-none'}>
            <h4 className="text-md font-medium mb-4">Tarifas Fijas (Tiempo Prolongado)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'fixed_rate_car', label: '🚗 Carro' },
                { key: 'fixed_rate_motorcycle', label: '🏍️ Moto' },
                { key: 'fixed_rate_bicycle', label: '🚲 Bicicleta' },
                { key: 'fixed_rate_truck', label: '🚛 Camión' }
              ].map(({ key, label }) => (
                <div key={key} className="bg-blue-50 p-4 rounded">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <Input
                    type="number"
                    step="1000"
                    min="0"
                    value={formData[key as keyof typeof formData]}
                    onChange={(e) => setFormData({
                      ...formData,
                      [key]: parseFloat(e.target.value) || 0
                    })}
                    disabled={updatePricingMutation.isPending}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Umbral de tarifa fija (solo si tarifa plena habilitada) */}
          <div className={`rounded-xl border p-4 ${fixedRateEnabled ? 'bg-yellow-50' : 'bg-gray-100'}`}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ⏰ Aplicar tarifa fija después de (horas)
            </label>
            <Input
              type="number"
              step="1"
              min={fixedRateEnabled ? 1 : 0}
              max="168"
              value={formData.fixed_rate_threshold_minutes <= 0 ? 0 : Math.floor(formData.fixed_rate_threshold_minutes / 60)}
              onChange={(e) => {
                const hours = parseInt(e.target.value, 10);
                const mins = Number.isFinite(hours) && hours > 0 ? hours * 60 : 0;
                setFormData({ ...formData, fixed_rate_threshold_minutes: mins });
              }}
              disabled={updatePricingMutation.isPending || !fixedRateEnabled}
            />
            <p className="text-xs text-gray-500 mt-1">Máximo 168 horas (1 semana). Si la tarifa plena está deshabilitada, no se aplicará.</p>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updatePricingMutation.isPending}
            >
              {updatePricingMutation.isPending ? (
                <><LuLoader className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : (
                <><LuSave className="w-4 h-4" /> Guardar Tarifas</>
              )}
            </Button>
          </div>
        </form>
        </div>
      </div>
    );
  };

  // Schedule Form Component
  const ScheduleForm = () => {
    const daysOfWeek = [
      { key: 'monday', label: 'Lunes', emoji: '📅' },
      { key: 'tuesday', label: 'Martes', emoji: '📅' },
      { key: 'wednesday', label: 'Miércoles', emoji: '📅' },
      { key: 'thursday', label: 'Jueves', emoji: '📅' },
      { key: 'friday', label: 'Viernes', emoji: '📅' },
      { key: 'saturday', label: 'Sábado', emoji: '🎯' },
      { key: 'sunday', label: 'Domingo', emoji: '🎯' }
    ];

    const [scheduleMode, setScheduleMode] = useState<'same' | 'different'>('same');
    const [globalSchedule, setGlobalSchedule] = useState({
      is_24h: false,
      is_closed: false,
      opening_time: '08:00',
      closing_time: '20:00'
    });

    const [weeklySchedule, setWeeklySchedule] = useState<Record<string, {
      is_24h: boolean;
      is_closed: boolean;
      opening_time: string;
      closing_time: string;
    }>>({
      monday: { is_24h: false, is_closed: false, opening_time: '08:00', closing_time: '20:00' },
      tuesday: { is_24h: false, is_closed: false, opening_time: '08:00', closing_time: '20:00' },
      wednesday: { is_24h: false, is_closed: false, opening_time: '08:00', closing_time: '20:00' },
      thursday: { is_24h: false, is_closed: false, opening_time: '08:00', closing_time: '20:00' },
      friday: { is_24h: false, is_closed: false, opening_time: '08:00', closing_time: '20:00' },
      saturday: { is_24h: false, is_closed: false, opening_time: '08:00', closing_time: '20:00' },
      sunday: { is_24h: false, is_closed: true, opening_time: '08:00', closing_time: '20:00' }
    });

    useEffect(() => {
      if (scheduleData) {
        // Por ahora solo soportamos modo "same" hasta que el backend implemente weekly_schedule
        setScheduleMode('same');
        setGlobalSchedule({
          is_24h: scheduleData.is_24h || false,
          is_closed: false, // Simulamos este campo localmente
          opening_time: scheduleData.opening_time || '08:00',
          closing_time: scheduleData.closing_time || '20:00'
        });
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scheduleData]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedParkingLot) return;

      try {
        // Solo enviamos los campos que el backend actual soporta
        const updates = {
          opening_time: globalSchedule.opening_time,
          closing_time: globalSchedule.closing_time,
          is_24h: globalSchedule.is_24h
          // Nota: is_closed y weekly_schedule se implementarán cuando el backend los soporte
        };

        await updateScheduleMutation.mutateAsync({ parkingLotId: selectedParkingLot, updates });
        addToast('✅ Horarios actualizados correctamente', 'success');
      } catch {
        addToast('❌ Error actualizando horarios', 'error');
      }
    };

    const updateDaySchedule = (day: string, field: string, value: string | boolean) => {
      setWeeklySchedule(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          [field]: value
        }
      }));
    };

    const toggleDay24Hours = (day: string, is24H: boolean) => {
      updateDaySchedule(day, 'is_24h', is24H);
      if (is24H) {
        updateDaySchedule(day, 'is_closed', false);
        updateDaySchedule(day, 'opening_time', '00:00');
        updateDaySchedule(day, 'closing_time', '23:59');
      }
    };

    const toggleDayClosed = (day: string, isClosed: boolean) => {
      updateDaySchedule(day, 'is_closed', isClosed);
      if (isClosed) {
        updateDaySchedule(day, 'is_24h', false);
      }
    };

    const applyToAllDays = () => {
      const newSchedule: typeof weeklySchedule = {};
      daysOfWeek.forEach(day => {
        newSchedule[day.key] = { ...globalSchedule };
      });
      setWeeklySchedule(newSchedule);
    };

    if (scheduleLoading) {
      return <div className="flex items-center gap-2"><LuLoader className="w-4 h-4 animate-spin" /> Cargando horarios...</div>;
    }

    return (
      <div className="space-y-4">
        {/* Selector de parqueadero */}
        <div className="bg-white rounded-xl border p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Parqueadero</label>
          <select
            value={selectedParkingLot || ''}
            onChange={(e) => setSelectedParkingLot(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-parkiu-500 focus:ring-parkiu-500"
          >
            {parkingLots?.map((lot: { id: string; name: string }) => (
              <option key={lot.id} value={lot.id}>{lot.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">⏰ Horarios de Operación</h3>
            <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Configuración:</span>
            <select
              value={scheduleMode}
              onChange={(e) => setScheduleMode(e.target.value as 'same' | 'different')}
              className="rounded-md border-gray-300 text-sm focus:border-parkiu-500 focus:ring-parkiu-500"
              disabled={true} // Temporalmente deshabilitado hasta que el backend soporte weekly_schedule
            >
              <option value="same">Mismos horarios todos los días</option>
              <option value="different" disabled>Horarios diferentes por día (Próximamente)</option>
            </select>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nota informativa sobre funcionalidades futuras */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 text-lg">ℹ️</div>
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Funcionalidades Avanzadas</h4>
                <p className="text-sm text-blue-700">
                  Próximamente podrás configurar horarios diferentes para cada día de la semana,
                  marcar días como cerrados y crear horarios más flexibles.
                  Por ahora, configura horarios uniformes para todos los días.
                </p>
              </div>
            </div>
          </div>

          {scheduleMode === 'same' ? (
            // Configuración global
            <div className="space-y-4">
              <div className="bg-parkiu-50 border border-parkiu-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-parkiu-800">Configuración General</h4>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={globalSchedule.is_24h}
                        onChange={(e) => setGlobalSchedule(prev => ({
                          ...prev,
                          is_24h: e.target.checked,
                          is_closed: false,
                          opening_time: e.target.checked ? '00:00' : '08:00',
                          closing_time: e.target.checked ? '23:59' : '20:00'
                        }))}
                        className="rounded border-gray-300 text-parkiu-600"
                        disabled={updateScheduleMutation.isPending}
                      />
                      <span className="text-parkiu-700">🌙 Abierto 24h</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={globalSchedule.is_closed}
                        onChange={(e) => setGlobalSchedule(prev => ({
                          ...prev,
                          is_closed: e.target.checked,
                          is_24h: false
                        }))}
                        className="rounded border-gray-300 text-red-600"
                        disabled={updateScheduleMutation.isPending}
                      />
                      <span className="text-red-700">🚫 Cerrado</span>
                    </label>
                  </div>
                </div>

                {!globalSchedule.is_24h && !globalSchedule.is_closed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">🌅 Apertura</label>
                      <Input
                        type="time"
                        value={globalSchedule.opening_time}
                        onChange={(e) => setGlobalSchedule(prev => ({ ...prev, opening_time: e.target.value }))}
                        disabled={updateScheduleMutation.isPending}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">🌆 Cierre</label>
                      <Input
                        type="time"
                        value={globalSchedule.closing_time}
                        onChange={(e) => setGlobalSchedule(prev => ({ ...prev, closing_time: e.target.value }))}
                        disabled={updateScheduleMutation.isPending}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Configuración por día
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-blue-800">Configuración Rápida</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyToAllDays}
                    disabled={updateScheduleMutation.isPending}
                  >
                    Aplicar a todos los días
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">🌅 Apertura</label>
                    <Input
                      type="time"
                      value={globalSchedule.opening_time}
                      onChange={(e) => setGlobalSchedule(prev => ({ ...prev, opening_time: e.target.value }))}
                      disabled={updateScheduleMutation.isPending}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">🌆 Cierre</label>
                    <Input
                      type="time"
                      value={globalSchedule.closing_time}
                      onChange={(e) => setGlobalSchedule(prev => ({ ...prev, closing_time: e.target.value }))}
                      disabled={updateScheduleMutation.isPending}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={globalSchedule.is_24h}
                        onChange={(e) => setGlobalSchedule(prev => ({
                          ...prev,
                          is_24h: e.target.checked,
                          opening_time: e.target.checked ? '00:00' : '08:00',
                          closing_time: e.target.checked ? '23:59' : '20:00'
                        }))}
                        className="rounded border-gray-300 text-parkiu-600"
                        disabled={updateScheduleMutation.isPending}
                      />
                      <span>24h</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-800">Horarios por Día</h4>
                {daysOfWeek.map((day) => {
                  const daySchedule = weeklySchedule[day.key];
                  return (
                    <div key={day.key} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{day.emoji}</span>
                          <span className="font-medium text-gray-800">{day.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={daySchedule.is_24h}
                              onChange={(e) => toggleDay24Hours(day.key, e.target.checked)}
                              className="rounded border-gray-300 text-parkiu-600"
                              disabled={updateScheduleMutation.isPending || daySchedule.is_closed}
                            />
                            <span className="text-parkiu-700">24h</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={daySchedule.is_closed}
                              onChange={(e) => toggleDayClosed(day.key, e.target.checked)}
                              className="rounded border-gray-300 text-red-600"
                              disabled={updateScheduleMutation.isPending}
                            />
                            <span className="text-red-700">Cerrado</span>
                          </label>
                        </div>
                      </div>

                      {!daySchedule.is_24h && !daySchedule.is_closed && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Apertura</label>
                            <Input
                              type="time"
                              value={daySchedule.opening_time}
                              onChange={(e) => updateDaySchedule(day.key, 'opening_time', e.target.value)}
                              disabled={updateScheduleMutation.isPending}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cierre</label>
                            <Input
                              type="time"
                              value={daySchedule.closing_time}
                              onChange={(e) => updateDaySchedule(day.key, 'closing_time', e.target.value)}
                              disabled={updateScheduleMutation.isPending}
                            />
                          </div>
                        </div>
                      )}

                      {daySchedule.is_closed && (
                        <div className="text-center py-2 text-red-600 font-medium">
                          🚫 Parqueadero cerrado este día
                        </div>
                      )}

                      {daySchedule.is_24h && (
                        <div className="text-center py-2 text-parkiu-600 font-medium">
                          🌙 Abierto 24 horas
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button
              type="submit"
              disabled={updateScheduleMutation.isPending}
            >
              {updateScheduleMutation.isPending ? (
                <><LuLoader className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : (
                <><LuSave className="w-4 h-4" /> Guardar Horarios</>
              )}
            </Button>
          </div>
        </form>
        </div>
      </div>
    );
  };

  // Render tabs based on user role
  const availableTabs = isTempAdmin
    ? [{ id: 'printing' as TabType, label: 'Impresión', icon: LuPrinter }]
    : [
        { id: 'profile' as TabType, label: 'Perfil', icon: LuUser },
        { id: 'parking' as TabType, label: 'Parqueadero', icon: LuBuilding },
        { id: 'pricing' as TabType, label: 'Tarifas', icon: LuDollarSign },
        { id: 'schedule' as TabType, label: 'Horarios', icon: LuClock },
        { id: 'printing' as TabType, label: 'Impresión', icon: LuPrinter }
      ];

  // Auto-select first available tab for temp_admin
  useEffect(() => {
    if (isTempAdmin && activeTab !== 'printing') {
      setActiveTab('printing');
    }
  }, [isTempAdmin, activeTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600">
          {isTempAdmin
            ? 'Configura tu impresora mientras completas la verificación.'
            : 'Ajusta tu perfil, datos del parqueadero y configuraciones.'
          }
        </p>
      </div>

      {isTempAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ <strong>Cuenta temporal:</strong> Solo tienes acceso a la configuración de impresión.
            Completa la verificación para acceder a todas las configuraciones.
          </p>
        </div>
      )}

      <div className="flex gap-2 border-b overflow-x-auto">
        {availableTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap ${
              activeTab === id
                ? 'border-b-2 border-parkiu-600 text-parkiu-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfileForm />}
      {activeTab === 'parking' && <ParkingLotForm />}
      {activeTab === 'pricing' && selectedParkingLot && <PricingForm />}
      {activeTab === 'schedule' && selectedParkingLot && <ScheduleForm />}
      {activeTab === 'printing' && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="text-lg font-semibold">🖨️ Configuración de Impresión</h3>
          <p className="text-sm text-gray-600">Selecciona tu impresora térmica preferida para recibos.</p>
          <PrinterSelector />
        </div>
      )}
    </div>
  );
}

import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { Camera, User, CreditCard, Phone } from 'lucide-react';

import { itemVariants } from './utils';
import { Label } from '@/components/common/Label';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common';
import { useCompleteProfile } from '@/api/hooks/useAdminOnboarding';

interface FirstStepProps {
  profile?: {
    email: string;
    name: string;
    nit: string;
    contact_phone: string;
    photo_url?: string | null;
  };
  status?: string;
  setLoading: (loading: boolean) => void;
}

interface FormData {
  email: string;
  name: string;
  nit: string;
  contact_phone: string;
  photo_url: File | null;
  role: string;
}

// Separate interface for storage to handle File type
interface StoredFormData {
  email: string;
  name: string;
  nit: string;
  contact_phone: string;
  photo_url: string | null;
  role: string;
}

const formStorage = {
  save: (data: Partial<FormData>) => {
    const storageData: Partial<StoredFormData> = {
      ...data,
      photo_url: data.photo_url instanceof File ? data.photo_url.name : data.photo_url
    };
    localStorage.setItem('onboarding_step1', JSON.stringify(storageData));
  },
  load: () => {
    const saved = localStorage.getItem('onboarding_step1');
    return saved ? JSON.parse(saved) as Partial<StoredFormData> : null;
  },
  clear: () => {
    localStorage.removeItem('onboarding_step1');
  }
};

const FirstStep = forwardRef<{ submitForm: () => Promise<void> }, FirstStepProps>(({ profile, status, setLoading }, ref) => {
  const { mutateAsync: completeProfile } = useCompleteProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const hasSubmittedRef = useRef(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormData>({
    defaultValues: {
      email: profile?.email || '',
      name: profile?.name || '',
      nit: profile?.nit || '',
      contact_phone: profile?.contact_phone || '',
      photo_url: null,
      role: 'temp_admin',
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  // Load saved form data on mount
  useEffect(() => {
    const savedData = formStorage.load();
    if (savedData) {
      Object.entries(savedData).forEach(([key, value]) => {
        if (key === 'photo_url') {
          // Skip photo_url as it's a File object
          return;
        }
        setValue(key as keyof Omit<FormData, 'photo_url'>, value as string);
      });
    }
  }, [setValue]);

  const onSubmit = async (data: FormData) => {
    // Guard against duplicate submissions (e.g., double clicks or StrictMode re-invocation)
    if (hasSubmittedRef.current || isSubmitting) {
      return data;
    }
    setIsSubmitting(true);
    setLoading(true);
    try {
      // Si el perfil ya está completo (no está en pending_profile), no hacer la llamada al API
      if (status && status !== 'pending_profile' && status !== 'initial') {
        console.log('Profile already completed, skipping API call. Status:', status);
        formStorage.clear();
        hasSubmittedRef.current = true;
        return data;
      }

      const payload = {
        email: data.email,
        name: data.name,
        nit: data.nit,
        contact_phone: data.contact_phone,
        role: data.role,
        photo_url: '', // No se usa por ahora
      };

      await completeProfile(payload);
      hasSubmittedRef.current = true;
      formStorage.clear(); // Clear storage after successful submission
      return data;
    } catch (error) {
      console.error('Error completing profile:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    submitForm: async () => {
      if (isValid) {
        const result = await handleSubmit(onSubmit)();
        return result;
      }

      await trigger();
      return Promise.reject();
    },
  }));

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setImageError('La imagen no debe superar los 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setImageError('El archivo debe ser una imagen');
        return;
      }

      setImageError(null);
      setValue('photo_url', file);
      // Save form data with the file
      formStorage.save({ photo_url: file });
    }
  };

  const watchProfileImage = watch('photo_url');

  // Save form data on change
  useEffect(() => {
    const subscription = watch((value) => {
      formStorage.save(value);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  return (
    <div className="relative p-8">
      {/* Loading overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-blue-600 font-medium">Guardando información...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Información básica</h2>
        <p className="text-gray-600">Completa tu perfil para personalizar tu experiencia</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <motion.div variants={itemVariants} className="space-y-3">
          <Label htmlFor="email" className="text-gray-800 font-semibold text-sm flex items-center gap-2">
            <div className="w-5 h-5 bg-parkiu-100 rounded-lg flex items-center justify-center">
              <span className="text-parkiu-600 text-xs">@</span>
            </div>
            Correo Electrónico
          </Label>
          <div className="relative group">
            <Input
              id="email"
              {...register('email', {
                required: 'Email es requerido',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Email inválido'
                }
              })}
              placeholder="tu@email.com"
              disabled={!!profile?.email}
              className={`w-full px-4 py-4 border-2 rounded-2xl transition-all duration-300 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md focus:shadow-lg ${
                errors.email
                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border-gray-200 hover:border-parkiu-300 focus:border-parkiu-500 focus:ring-4 focus:ring-parkiu-500/10'
              } ${
                profile?.email
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'group-hover:border-parkiu-400'
              }`}
              aria-invalid={errors.email ? "true" : "false"}
            />
            {!errors.email && !profile?.email && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-parkiu-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-sm">✓</span>
              </div>
            )}
          </div>
          {errors.email && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200"
              role="alert"
            >
              <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </span>
              {errors.email.message}
            </motion.p>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-3">
          <Label htmlFor="name" className="text-gray-800 font-semibold text-sm flex items-center gap-2">
            <div className="w-5 h-5 bg-parkiu-100 rounded-lg flex items-center justify-center">
              <User className="w-3 h-3 text-parkiu-600" />
            </div>
            Nombre Completo
          </Label>
          <div className="relative group">
            <Input
              id="name"
              {...register('name', {
                required: 'Necesitamos tu nombre para continuar',
                validate: (value) => {
                  if ((value ?? '').trim().split(' ').length <= 1) {
                    return 'Por favor ingresa tu nombre completo';
                  }
                  return true;
                },
                pattern: {
                  value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
                  message: 'El nombre solo debe contener letras y espacios'
                }
              })}
              placeholder="Ingresa tu nombre completo"
              className={`w-full px-4 py-4 border-2 rounded-2xl transition-all duration-300 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md focus:shadow-lg ${
                errors.name
                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border-gray-200 hover:border-parkiu-300 focus:border-parkiu-500 focus:ring-4 focus:ring-parkiu-500/10 group-hover:border-parkiu-400'
              }`}
              aria-invalid={errors.name ? "true" : "false"}
            />
            {!errors.name && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-parkiu-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-sm">✓</span>
              </div>
            )}
          </div>
          {errors.name && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200"
              role="alert"
            >
              <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </span>
              {errors.name.message}
            </motion.p>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-3">
          <Label htmlFor="nit" className="text-gray-800 font-semibold text-sm flex items-center gap-2">
            <div className="w-5 h-5 bg-parkiu-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-3 h-3 text-parkiu-600" />
            </div>
            NIT o Documento de Identidad
          </Label>
          <div className="relative group">
            <Input
              id="nit"
              {...register('nit', {
                required: 'El NIT o documento es requerido',
                pattern: {
                  value: /^[0-9]{8,12}$/,
                  message: 'Ingresa un NIT o documento válido (8-12 dígitos)',
                },
              })}
              placeholder="Ingresa tu NIT o documento"
              className={`w-full px-4 py-4 border-2 rounded-2xl transition-all duration-300 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md focus:shadow-lg ${
                errors.nit
                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border-gray-200 hover:border-parkiu-300 focus:border-parkiu-500 focus:ring-4 focus:ring-parkiu-500/10 group-hover:border-parkiu-400'
              }`}
              aria-invalid={errors.nit ? "true" : "false"}
            />
            {!errors.nit && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-parkiu-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-sm">✓</span>
              </div>
            )}
          </div>
          {errors.nit && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200"
              role="alert"
            >
              <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </span>
              {errors.nit.message}
            </motion.p>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-3">
          <Label htmlFor="contact_phone" className="text-gray-800 font-semibold text-sm flex items-center gap-2">
            <div className="w-5 h-5 bg-parkiu-100 rounded-lg flex items-center justify-center">
              <Phone className="w-3 h-3 text-parkiu-600" />
            </div>
            Teléfono de Contacto
          </Label>
          <div className="relative group">
            <Input
              id="contact_phone"
              type="tel"
              {...register('contact_phone', {
                required: 'El teléfono es requerido',
                pattern: {
                  value: /^[0-9]{10}$/,
                  message: 'Ingresa un número de teléfono válido (10 dígitos)',
                },
              })}
              placeholder="Ingresa tu número de teléfono"
              className={`w-full px-4 py-4 border-2 rounded-2xl transition-all duration-300 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md focus:shadow-lg ${
                errors.contact_phone
                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border-gray-200 hover:border-parkiu-300 focus:border-parkiu-500 focus:ring-4 focus:ring-parkiu-500/10 group-hover:border-parkiu-400'
              }`}
              aria-invalid={errors.contact_phone ? "true" : "false"}
            />
            {!errors.contact_phone && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-parkiu-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-sm">✓</span>
              </div>
            )}
          </div>
          {errors.contact_phone && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200"
              role="alert"
            >
              <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </span>
              {errors.contact_phone.message}
            </motion.p>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-3">
          <Label htmlFor="photo_url" className="text-gray-800 font-semibold text-sm flex items-center gap-2">
            <div className="w-5 h-5 bg-parkiu-100 rounded-lg flex items-center justify-center">
              <Camera className="w-3 h-3 text-parkiu-600" />
            </div>
            Foto de Perfil (Opcional)
          </Label>
          <div className="flex items-center gap-6 p-4 bg-gradient-to-r from-gray-50 to-white rounded-2xl border-2 border-gray-200 hover:border-parkiu-300 transition-all duration-300">
            {watchProfileImage && watchProfileImage instanceof File ? (
              <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg border-2 border-parkiu-200">
                <img
                  src={URL.createObjectURL(watchProfileImage)}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-parkiu-100 to-parkiu-200 flex items-center justify-center shadow-inner">
                <User className="w-8 h-8 text-parkiu-500" />
              </div>
            )}
            <div className="flex-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('photo_url')?.click()}
                className="flex items-center gap-3 px-6 py-3 bg-white hover:bg-parkiu-50 border-2 border-parkiu-200 hover:border-parkiu-400 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                aria-label={watchProfileImage ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
              >
                <Camera className="w-5 h-5 text-parkiu-600" />
                <span className="font-medium text-parkiu-700">
                  {watchProfileImage ? 'Cambiar foto' : 'Subir foto'}
                </span>
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Formatos: JPG, PNG. Máximo 5MB
              </p>
            </div>
            <input
              id="photo_url"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
              aria-label="Seleccionar foto de perfil"
            />
          </div>
          {imageError && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200"
              role="alert"
            >
              <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </span>
              {imageError}
            </motion.p>
          )}
        </motion.div>
      </form>
    </div>
  );
});

FirstStep.displayName = 'FirstStep';

export { FirstStep };

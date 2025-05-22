import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Camera } from 'lucide-react';

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

const FirstStep = forwardRef<{ submitForm: () => Promise<void> }, FirstStepProps>(({ profile, setLoading }, ref) => {
  const { mutateAsync: completeProfile } = useCompleteProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

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
    setIsSubmitting(true);
    setLoading(true);
    try {
      const payload = {
        email: data.email,
        name: data.name,
        nit: data.nit,
        contact_phone: data.contact_phone,
        role: data.role,
        photo_url: '', // No se usa por ahora
      };

      await completeProfile(payload);
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
    <div className="px-2 py-4 relative">
      {isSubmitting && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-blue-100">
            Correo Electrónico
          </Label>
          <Input
            id="email"
            {...register('email', {
              required: 'Email es requerido',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Email inválido'
              }
            })}
            placeholder="Ingresa tu correo electrónico"
            disabled={!!profile?.email}
            aria-invalid={errors.email ? "true" : "false"}
          />
          {errors.email && (
            <p className="text-red-400 text-sm mt-1" role="alert">{errors.email.message}</p>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <Label htmlFor="name" className="text-blue-100">
            Nombre Completo
          </Label>
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
            aria-invalid={errors.name ? "true" : "false"}
          />
          {errors.name && (
            <p className="text-red-400 text-xs pl-4" role="alert">
              {errors.name.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <Label htmlFor="nit" className="text-blue-100">
            NIT o Documento de Identidad
          </Label>
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
            aria-invalid={errors.nit ? "true" : "false"}
          />
          {errors.nit && (
            <p className="text-red-400 text-xs pl-4" role="alert">{errors.nit.message}</p>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <Label htmlFor="contact_phone" className="text-blue-100">
            Teléfono de Contacto
          </Label>
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
            aria-invalid={errors.contact_phone ? "true" : "false"}
          />
          {errors.contact_phone && (
            <p className="text-red-400 text-xs pl-4" role="alert">{errors.contact_phone.message}</p>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <Label htmlFor="photo_url" className="text-blue-100">
            Foto de Perfil
          </Label>
          <div className="flex items-center gap-4">
            {watchProfileImage && watchProfileImage instanceof File && (
              <div className="w-16 h-16 rounded-full overflow-hidden">
                <img
                  src={URL.createObjectURL(watchProfileImage)}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('photo_url')?.click()}
              className="flex items-center gap-2"
              aria-label={watchProfileImage ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
            >
              <Camera className="w-4 h-4" />
              {watchProfileImage ? 'Cambiar foto' : 'Subir foto'}
            </Button>
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
            <p className="text-red-400 text-xs mt-1" role="alert">{imageError}</p>
          )}
        </motion.div>
      </form>
    </div>
  );
});

FirstStep.displayName = 'FirstStep';

export { FirstStep };

import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { forwardRef, useImperativeHandle } from 'react';
import { Camera } from 'lucide-react';

import { itemVariants } from './utils';
import { Label } from '@/components/common/Label';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common';
import { useCompleteProfile, useAdminProfile } from '@/api/hooks/useAdminOnboarding';

interface FirstStepProps {
  user?: {
    email: string;
  };
  setLoading: (loading: boolean) => void;
}

interface FormData {
  email: string;
  name: string;
  nit: string;
  contact_phone: string;
  photo_url: File | null;
}

interface AdminProfile {
  email: string;
  name: string;
  nit: string;
  contact_phone: string;
  photo_url: string | null;
}

const FirstStep = forwardRef<{ submitForm: () => Promise<void> }, FirstStepProps>(({ user = { email: '' }, setLoading }, ref) => {
  const { mutateAsync: completeProfile } = useCompleteProfile();
  const { data: profile } = useAdminProfile();

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormData>({
    defaultValues: {
      email: user.email,
      name: (profile as AdminProfile)?.name || '',
      nit: (profile as AdminProfile)?.nit || '',
      contact_phone: (profile as AdminProfile)?.contact_phone || '',
      photo_url: null,
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('name', data.name);
      formData.append('nit', data.nit);
      formData.append('contact_phone', data.contact_phone);
      if (data.photo_url instanceof File) {
        formData.append('photo_url', data.photo_url);
      }

      await completeProfile(formData);
      return data;
    } catch (error) {
      console.error('Error completing profile:', error);
      throw error;
    } finally {
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
      setValue('photo_url', file);
    }
  };

  const watchProfileImage = watch('photo_url');

  return (
    <div className="px-2 py-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-blue-100">
            Correo Electrónico
          </Label>
          <Input
            id="email"
            {...register('email', { required: 'Email es requerido' })}
            placeholder="Ingresa tu correo electrónico"
            disabled={!!user.email}
          />
          {errors.email && (
            <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
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
            })}
            placeholder="Ingresa tu nombre completo"
          />
          {errors.name && (
            <p className="text-red-400 text-xs pl-4">
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
          />
          {errors.nit && (
            <p className="text-red-400 text-xs pl-4">{errors.nit.message}</p>
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
          />
          {errors.contact_phone && (
            <p className="text-red-400 text-xs pl-4">{errors.contact_phone.message}</p>
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
            />
          </div>
        </motion.div>
      </form>
    </div>
  );
});

FirstStep.displayName = 'FirstStep';

export { FirstStep };

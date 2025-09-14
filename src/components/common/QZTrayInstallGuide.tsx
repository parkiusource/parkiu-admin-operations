import React, { useState } from 'react';
import { Button } from './Button';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface QZTrayInstallGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QZTrayInstallGuide: React.FC<QZTrayInstallGuideProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    {
      title: "1. Descargar QZ Tray",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            QZ Tray es necesario para imprimir recibos directamente en impresoras térmicas.
          </p>
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-sm font-medium text-blue-800 mb-2">📥 Descargar desde el sitio oficial:</p>
            <a
              href="https://qz.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm"
            >
              🌐 Ir a qz.io/download
            </a>
          </div>
          <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
            <p className="text-xs text-yellow-700">
              ⚠️ <strong>Importante:</strong> Descarga siempre desde el sitio oficial para evitar malware.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "2. Instalar QZ Tray",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 mb-3">
            Ejecuta el instalador descargado y sigue estos pasos:
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-2 bg-gray-50 rounded">
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-mono">1</span>
              <span className="text-sm">Ejecutar como administrador (clic derecho → "Ejecutar como administrador")</span>
            </div>
            <div className="flex items-start gap-3 p-2 bg-gray-50 rounded">
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-mono">2</span>
              <span className="text-sm">Seguir el asistente de instalación (Next → Next → Install)</span>
            </div>
            <div className="flex items-start gap-3 p-2 bg-gray-50 rounded">
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-mono">3</span>
              <span className="text-sm">Permitir que se inicie automáticamente con Windows</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "3. Configurar QZ Tray",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 mb-3">
            Después de la instalación, configura QZ Tray:
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-2 bg-gray-50 rounded">
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-mono">1</span>
              <span className="text-sm">Buscar el ícono de QZ Tray en la bandeja del sistema (🖨️)</span>
            </div>
            <div className="flex items-start gap-3 p-2 bg-gray-50 rounded">
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-mono">2</span>
              <span className="text-sm">Clic derecho → "Advanced" → "Allow unsigned requests" ✅</span>
            </div>
            <div className="flex items-start gap-3 p-2 bg-gray-50 rounded">
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-mono">3</span>
              <span className="text-sm">Verificar que aparezca "QZ Tray is running" en verde</span>
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <p className="text-xs text-green-700">
              ✅ <strong>Listo:</strong> QZ Tray está configurado y listo para imprimir.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "4. Conectar Impresora",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 mb-3">
            Conecta tu impresora térmica:
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-2 bg-gray-50 rounded">
              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-mono">1</span>
              <span className="text-sm">Conectar impresora térmica por USB o red</span>
            </div>
            <div className="flex items-start gap-3 p-2 bg-gray-50 rounded">
              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-mono">2</span>
              <span className="text-sm">Instalar drivers si es necesario (Windows Update suele hacerlo automáticamente)</span>
            </div>
            <div className="flex items-start gap-3 p-2 bg-gray-50 rounded">
              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-mono">3</span>
              <span className="text-sm">Verificar que aparezca en "Impresoras y escáneres" de Windows</span>
            </div>
            <div className="flex items-start gap-3 p-2 bg-gray-50 rounded">
              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-mono">4</span>
              <span className="text-sm">Refrescar la lista de impresoras en ParkiU</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/25" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl bg-white rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ExclamationTriangleIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  Guía de Instalación QZ Tray
                </Dialog.Title>
                <p className="text-sm text-gray-600">
                  Configuración para impresión térmica directa
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Progress */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Paso {currentStep} de {steps.length}
              </span>
              <span className="text-xs text-gray-500">
                {Math.round((currentStep / steps.length) * 100)}% completado
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {steps[currentStep - 1].title}
            </h3>
            {steps[currentStep - 1].content}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <Button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
            >
              ← Anterior
            </Button>

            <div className="flex gap-2">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index + 1)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index + 1 === currentStep
                      ? 'bg-blue-600'
                      : index + 1 < currentStep
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {currentStep < steps.length ? (
              <Button
                onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Siguiente →
              </Button>
            ) : (
              <Button
                onClick={onClose}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                ✅ Finalizar
              </Button>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

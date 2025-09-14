import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // No activar atajos si estamos en un input, textarea o elemento editable
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.closest('[contenteditable="true"]')
    ) {
      return;
    }

    // Buscar el atajo que coincida
    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
      const altMatches = !!shortcut.altKey === event.altKey;
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey;

      return keyMatches && ctrlMatches && altMatches && shiftMatches;
    });

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.action();
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  // Función para mostrar ayuda de atajos
  const getShortcutsHelp = useCallback(() => {
    const categories = shortcuts.reduce((acc, shortcut) => {
      const category = shortcut.category || 'General';
      if (!acc[category]) acc[category] = [];
      acc[category].push(shortcut);
      return acc;
    }, {} as Record<string, KeyboardShortcut[]>);

    return categories;
  }, [shortcuts]);

  // Función para formatear la combinación de teclas
  const formatShortcut = useCallback((shortcut: KeyboardShortcut) => {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  }, []);

  return {
    getShortcutsHelp,
    formatShortcut,
  };
};

// Hook específico para operaciones de parqueadero
export const useParkingOperationShortcuts = (callbacks: {
  onOpenVehicleEntry: () => void;
  onOpenVehicleExit: () => void;
  onOpenSearch: () => void;
  onRefresh: () => void;
  onToggleHelp: () => void;
  onFocusPlateInput?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'F1',
      action: callbacks.onOpenVehicleEntry,
      description: 'Registrar entrada de vehículo',
      category: 'Operaciones'
    },
    {
      key: 'F2',
      action: callbacks.onOpenVehicleExit,
      description: 'Registrar salida de vehículo',
      category: 'Operaciones'
    },
    {
      key: 'F3',
      action: callbacks.onOpenSearch,
      description: 'Buscar vehículo',
      category: 'Navegación'
    },
    {
      key: 'F5',
      action: callbacks.onRefresh,
      description: 'Actualizar datos',
      category: 'Navegación'
    },
    {
      key: '?',
      shiftKey: true,
      action: callbacks.onToggleHelp,
      description: 'Mostrar/ocultar ayuda',
      category: 'Ayuda'
    },
    {
      key: 'e',
      ctrlKey: true,
      action: callbacks.onOpenVehicleEntry,
      description: 'Entrada rápida',
      category: 'Operaciones'
    },
    {
      key: 's',
      ctrlKey: true,
      action: callbacks.onOpenVehicleExit,
      description: 'Salida rápida',
      category: 'Operaciones'
    },
    {
      key: 'f',
      ctrlKey: true,
      action: callbacks.onOpenSearch,
      description: 'Buscar rápido',
      category: 'Navegación'
    },
    {
      key: 'Escape',
      action: () => {
        // Cerrar cualquier modal abierto
        const modals = document.querySelectorAll('[data-modal="true"]');
        modals.forEach(modal => {
          const closeButton = modal.querySelector('[data-close-modal="true"]');
          if (closeButton) {
            (closeButton as HTMLElement).click();
          }
        });
      },
      description: 'Cerrar modal/cancelar',
      category: 'Navegación'
    }
  ];

  // Agregar atajo para enfocar input de placa si está disponible
  if (callbacks.onFocusPlateInput) {
    shortcuts.push({
      key: 'p',
      ctrlKey: true,
      action: callbacks.onFocusPlateInput,
      description: 'Enfocar campo de placa',
      category: 'Navegación'
    });
  }

  return useKeyboardShortcuts({ shortcuts });
};

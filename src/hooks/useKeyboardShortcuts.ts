import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean; // Para Cmd en macOS
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
      const metaMatches = !!shortcut.metaKey === event.metaKey;
      const altMatches = !!shortcut.altKey === event.altKey;
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey;

      // En macOS, permitir que Ctrl y Cmd sean intercambiables para algunos atajos
      const modifierMatches = shortcut.ctrlKey ?
        (event.ctrlKey || event.metaKey) : // Si requiere Ctrl, aceptar Ctrl o Cmd
        (ctrlMatches && metaMatches); // Si no requiere Ctrl, debe coincidir exactamente

      return keyMatches && modifierMatches && altMatches && shiftMatches;
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
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    if (shortcut.ctrlKey) {
      parts.push(isMac ? 'Cmd' : 'Ctrl'); // Mostrar Cmd en Mac, Ctrl en otros
    }
    if (shortcut.metaKey) parts.push('Cmd');
    if (shortcut.altKey) parts.push(isMac ? 'Option' : 'Alt');
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
      key: 'd', // 'D' para Departure (salida) - sin conflictos conocidos
      ctrlKey: true,
      action: callbacks.onOpenVehicleExit,
      description: 'Salida rápida (Ctrl+D)',
      category: 'Operaciones'
    },
    {
      key: 'b', // Cambiar de 'f' a 'b' para evitar conflicto con Ctrl+F (Buscar del navegador)
      ctrlKey: true,
      action: callbacks.onOpenSearch,
      description: 'Buscar rápido (Ctrl+B)',
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

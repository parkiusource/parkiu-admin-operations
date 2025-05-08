import { useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Bars3Icon } from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Parqueadero', path: '/parking' },
  { name: 'Entrada', path: '/vehicles/entry' },
  { name: 'Salida', path: '/vehicles/exit' },
  { name: 'Estadísticas', path: '/dashboard' },
];

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { isOffline } = useStore();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow">
      <button
        type="button"
        className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden"
        onClick={onMenuClick}
      >
        <Bars3Icon className="h-6 w-6" />
      </button>
      <div className="flex flex-1 justify-between px-4">
        <div className="flex flex-1">
          <h1 className="text-2xl font-semibold text-gray-900 my-auto">
            {navigation.find(item => item.path === location.pathname)?.name}
          </h1>
        </div>
        <div className="ml-4 flex items-center md:ml-6">
          {isOffline && (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
              Offline
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', icon: HomeIcon, path: '/dashboard' },
  { name: 'Parqueadero', icon: TruckIcon, path: '/parking' },
  { name: 'Entrada', icon: TruckIcon, path: '/vehicles/entry' },
  { name: 'Salida', icon: CurrencyDollarIcon, path: '/vehicles/exit' },
  { name: 'Estadísticas', icon: ChartBarIcon, path: '/dashboard' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center px-4">
          <span className="text-xl font-bold">ParkiU Admin</span>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                location.pathname === item.path
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="mr-3 h-6 w-6" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

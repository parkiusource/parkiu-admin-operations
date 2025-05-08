import { Link, useLocation } from 'react-router-dom';
import { LuLayoutDashboard, LuMapPin, LuLogIn, LuLogOut, LuSettings } from 'react-icons/lu';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: <LuLayoutDashboard className="w-5 h-5" /> },
  { to: '/parking', label: 'Parqueaderos', icon: <LuMapPin className="w-5 h-5" /> },
  { to: '/vehicles/entry', label: 'Entradas', icon: <LuLogIn className="w-5 h-5" /> },
  { to: '/vehicles/exit', label: 'Salidas', icon: <LuLogOut className="w-5 h-5" /> },
  { to: '/settings', label: 'Configuración', icon: <LuSettings className="w-5 h-5" /> },
];

export function Sidebar() {
  const location = useLocation();
  return (
    <aside className="hidden md:flex flex-col w-56 h-screen bg-white border-r shadow-sm fixed left-0 top-0 z-20">
      <div className="h-16 flex items-center justify-center border-b">
        <span className="font-bold text-primary text-xl">Parkiu Admin</span>
      </div>
      <nav className="flex-1 py-4">
        <ul className="space-y-1">
          {links.map(link => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`flex items-center gap-3 px-6 py-2 rounded-lg transition-colors font-medium
                  ${location.pathname.startsWith(link.to)
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-100'}
                `}
              >
                {link.icon}
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t">
        <button className="w-full text-left text-sm text-gray-600 hover:text-primary">Cerrar sesión</button>
      </div>
    </aside>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { LuLayoutDashboard, LuMapPin, LuLogIn, LuLogOut, LuSettings, LuUser, LuPower } from 'react-icons/lu';
import { useAuth } from '../../features/auth/hooks/useAuth';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: <LuLayoutDashboard className="w-5 h-5" /> },
  { to: '/parking', label: 'Parqueaderos', icon: <LuMapPin className="w-5 h-5" /> },
  { to: '/vehicles/entry', label: 'Entradas', icon: <LuLogIn className="w-5 h-5" /> },
  { to: '/vehicles/exit', label: 'Salidas', icon: <LuLogOut className="w-5 h-5" /> },
  { to: '/settings', label: 'Configuración', icon: <LuSettings className="w-5 h-5" /> },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      logout();
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-56 h-screen bg-white border-r shadow-sm fixed left-0 top-0 z-20">
      {/* Header con logo */}
      <div className="h-16 flex items-center justify-center border-b bg-gradient-to-r from-parkiu-600 to-parkiu-700">
        <div className="flex items-center justify-center w-full px-4">
          <img
            src="/logo/primary.svg"
            alt="ParkiU"
            className="h-8 w-auto object-contain"
          />
        </div>
      </div>

      {/* Información del usuario */}
      <div className="p-4 border-b bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-parkiu-100 rounded-full flex items-center justify-center">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name || 'Usuario'}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <LuUser className="w-5 h-5 text-parkiu-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || 'Usuario'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email || 'admin@parkiu.com'}
            </p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {links.map(link => {
            const isActive = location.pathname === link.to ||
              (link.to !== '/dashboard' && location.pathname.startsWith(link.to));

            return (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium group
                    ${isActive
                      ? 'bg-parkiu-50 text-parkiu-700 border-r-2 border-parkiu-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <span className={`transition-colors ${isActive ? 'text-parkiu-700' : 'text-gray-500 group-hover:text-gray-700'}`}>
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer con botón de logout */}
      <div className="p-4 border-t bg-slate-50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-all duration-200 group"
        >
          <LuPower className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { LuLayoutDashboard, LuMapPin, LuLogIn, LuLogOut, LuSettings, LuPower, LuActivity } from 'react-icons/lu';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useAdminProfileStatus } from '@/hooks/useAdminProfileCentralized';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: <LuLayoutDashboard className="w-5 h-5" /> },
  { to: '/vehicles/entry', label: 'Entradas', icon: <LuLogIn className="w-5 h-5" /> },
  { to: '/vehicles/exit', label: 'Salidas', icon: <LuLogOut className="w-5 h-5" /> },
  { to: '/parking', label: 'Parqueaderos', icon: <LuMapPin className="w-5 h-5" /> },
  { to: '/reports', label: 'Reportes', icon: <LuActivity className="w-5 h-5" />, disabled: true },
  { to: '/settings', label: 'Configuración', icon: <LuSettings className="w-5 h-5" /> },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { profile } = useAdminProfileStatus();

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      logout();
    }
  };

  type MaybeUserWithRole = typeof user & { role?: string };
  const userWithRole = (user || {}) as MaybeUserWithRole;
  const isTempAdmin = (profile?.role || userWithRole.role) === 'temp_admin';

  const toRoleLabel = (role?: string): string => {
    switch (role) {
      case 'temp_admin': return 'Admin temporal';
      case 'local_admin': return 'Admin local';
      case 'global_admin': return 'Admin global';
      case 'operator': return 'Operador';
      default:
        if (!role) return 'Usuario';
        return role
          .split('_')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
    }
  };

  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 w-64 border-r bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 z-30"
      aria-label="Sidebar de navegación"
    >
      {/* Header */}
      <div className="h-16 px-4 flex items-center border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-parkiu-600 text-white flex items-center justify-center font-bold">P</div>
          <div>
            <div className="text-sm text-gray-500">ParkiU</div>
            <div className="text-base font-semibold text-gray-900">Administración</div>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {links.map(link => {
            const isActive = location.pathname === link.to ||
              (link.to !== '/dashboard' && location.pathname.startsWith(link.to));

            const content = (
              <span className={`transition-colors ${isActive ? 'text-parkiu-700' : 'text-gray-500 group-hover:text-gray-700'}`}>
                {link.icon}
              </span>
            );

            return (
              <li key={link.to} title={link.disabled ? 'Próximamente' : undefined}>
                <Link
                  to={link.disabled ? location.pathname : link.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium group
                    ${isActive
                      ? 'bg-parkiu-50 text-parkiu-700 border-r-2 border-parkiu-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}
                    ${link.disabled ? 'opacity-60 cursor-not-allowed' : ''}
                  `}
                  aria-disabled={link.disabled}
                >
                  {content}
                  {link.label}
                  {link.to === '/settings' && isTempAdmin && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">Verificación</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer con operador y logout */}
      <div className="p-4 border-t bg-slate-50 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-parkiu-100 text-parkiu-700 flex items-center justify-center font-semibold">
            {(profile?.name || user?.name || user?.email || 'OP').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {profile?.name || user?.name || user?.email || 'Operador'}
            </div>
            <div className="text-xs text-gray-500 truncate">{toRoleLabel(profile?.role || userWithRole.role)}</div>
          </div>
        </div>
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

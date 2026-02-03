import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Link, useLocation } from 'react-router-dom';
import { LuLayoutDashboard, LuMapPin, LuLogIn, LuLogOut, LuSettings, LuUser, LuPower, LuX, LuActivity } from 'react-icons/lu';
import { useAuth } from '../../features/auth/hooks/useAuth';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: <LuLayoutDashboard className="w-5 h-5" /> },
  { to: '/vehicles/entry', label: 'Entradas', icon: <LuLogIn className="w-5 h-5" /> },
  { to: '/vehicles/exit', label: 'Salidas', icon: <LuLogOut className="w-5 h-5" /> },
  { to: '/parking', label: 'Parqueaderos', icon: <LuMapPin className="w-5 h-5" /> },
  { to: '/reports', label: 'Reportes', icon: <LuActivity className="w-5 h-5" /> },
  { to: '/settings', label: 'Configuración', icon: <LuSettings className="w-5 h-5" /> },
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      logout();
      onClose();
    }
  };

  const handleLinkClick = () => {
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 md:hidden" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/80" />
        </Transition.Child>

        <div className="fixed inset-0 flex">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                {/* Header */}
                <div className="flex h-16 shrink-0 items-center justify-between">
                  <div className="flex items-center">
                    <img
                      src="/logo/secondary.svg"
                      alt="ParkiU"
                      className="h-8 w-auto object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                    onClick={onClose}
                  >
                    <LuX className="h-6 w-6" />
                  </button>
                </div>

                {/* User info */}
                <div className="p-4 border border-gray-200 rounded-lg bg-slate-50">
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

                {/* Navigation */}
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {links.map((link) => {
                          const isActive = location.pathname === link.to ||
                            (link.to !== '/dashboard' && location.pathname.startsWith(link.to));

                          return (
                            <li key={link.to}>
                              <Link
                                to={link.to}
                                onClick={handleLinkClick}
                                className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200
                                  ${isActive
                                    ? 'bg-parkiu-50 text-parkiu-700'
                                    : 'text-gray-700 hover:text-parkiu-700 hover:bg-gray-50'}
                                `}
                              >
                                <span className={`transition-colors ${isActive ? 'text-parkiu-700' : 'text-gray-400 group-hover:text-parkiu-700'}`}>
                                  {link.icon}
                                </span>
                                {link.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>

                    {/* Logout button */}
                    <li className="mt-auto">
                      <button
                        onClick={handleLogout}
                        className="group -mx-2 flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                      >
                        <LuPower className="h-5 w-5 shrink-0 group-hover:rotate-12 transition-transform" />
                        Cerrar sesión
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

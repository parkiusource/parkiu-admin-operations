import { useState } from 'react';
import { Sidebar, MobileSidebar } from '../components/common';
import { Outlet } from 'react-router-dom';
import { LuMenu } from 'react-icons/lu';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // Use min-h-dvh for proper mobile viewport handling (dvh = dynamic viewport height)
    <div className="flex min-h-screen min-h-[100dvh] bg-slate-50">
      {/* Sidebar para desktop */}
      <Sidebar />

      {/* Mobile sidebar */}
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area - fills entire viewport */}
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0 h-[100dvh] overflow-hidden">
        {/* Mobile header - fixed height to avoid jumps */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/logo/secondary.svg"
              alt="ParkiU"
              className="h-8 w-auto object-contain"
            />
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 -mr-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Abrir menú"
          >
            <LuMenu className="w-6 h-6" />
          </button>
        </header>

        {/* Page content
            - min-h-0: required so overflow works inside flex
            - overflow-y-auto: keep scrolling inside main to avoid mobile viewport jumps
        */}
        <main className="flex-1 min-h-0 flex flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-slate-50 pt-14 lg:pt-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

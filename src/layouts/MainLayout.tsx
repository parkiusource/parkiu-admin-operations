import { useState } from 'react';
import { Sidebar, MobileSidebar } from '../components/common';
import { Outlet } from 'react-router-dom';
import { LuMenu } from 'react-icons/lu';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar para desktop */}
      <Sidebar />

      {/* Mobile sidebar */}
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Mobile header */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/logo/secondary.svg"
              alt="ParkiU"
              className="h-8 w-auto object-contain"
            />
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <LuMenu className="w-6 h-6" />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

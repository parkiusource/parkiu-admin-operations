import { Sidebar } from '../components/common/Sidebar';
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 md:pl-56 p-4">
        <Outlet />
      </main>
    </div>
  );
}

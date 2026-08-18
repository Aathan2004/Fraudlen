import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const PAGE_TITLES = {
  '/': 'Upload Dataset',
  '/overview': 'Fraud Overview',
  '/providers': 'Provider Explorer',
};

export default function Layout() {
  const location = useLocation();
  const isUploadPage = location.pathname === '/upload';

  if (isUploadPage) {
    return (
      <div className="min-h-screen bg-bg-base">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

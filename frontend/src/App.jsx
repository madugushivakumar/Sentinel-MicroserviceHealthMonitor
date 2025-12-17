import React, { useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { ProjectProvider } from './context/ProjectContext';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Services } from './pages/Services';
import { Incidents } from './pages/Incidents';
import { ServiceDetails } from './pages/ServiceDetails';
import { Alerts } from './pages/Alerts';
import { SLOReport } from './pages/SLOReport';
import { AlertRules } from './pages/AlertRules';
import { RateLimitWait } from './components/RateLimitWait';
import { setRateLimitHandler } from './services/api';

const RateLimitContext = createContext();

export const useRateLimit = () => {
  const context = useContext(RateLimitContext);
  if (!context) {
    throw new Error('useRateLimit must be used within RateLimitProvider');
  }
  return context;
};

const Icons = {
  Dashboard: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  Services: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 01-2 2v4a2 2 0 012 2h14a2 2 0 012-2v-4a2 2 0 01-2-2m-2-4h.01M17 16h.01" /></svg>,
  Bell: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  X: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Menu: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
};

const Layout = ({ children }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Don't show sidebar on landing page
  if (location.pathname === '/' || location.pathname === '/landing') {
    return <>{children}</>;
  }

  const navItems = [
    { icon: Icons.Dashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Icons.Services, label: 'Projects', path: '/projects' },
    { icon: Icons.Services, label: 'Services', path: '/services' },
    { icon: Icons.Bell, label: 'Incidents', path: '/incidents' },
    { icon: Icons.Bell, label: 'Alerts', path: '/alerts' },
  ];

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen fixed inset-0 overflow-hidden bg-black selection:bg-white selection:text-black font-sans">
      {/* Technical Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 z-0" 
        style={{ 
          backgroundImage: 'linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #27272a 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-zinc-900/90 z-40 md:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-zinc-800 flex flex-col transition-transform duration-100 ease-linear md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-black relative z-10">
          <Link to="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
             <div className="w-8 h-8 bg-white flex items-center justify-center text-black rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
             </div>
             <h1 className="font-bold text-white text-lg tracking-tight">Sentinel</h1>
          </Link>
          <button onClick={closeSidebar} className="md:hidden text-zinc-500 hover:text-white">
            <Icons.X />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto relative z-10">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-white text-black'
                    : 'text-white hover:bg-zinc-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-white'}`} />
                  <span className="font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-black relative z-10">
          <div className="flex items-center gap-3 text-sm">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-white font-medium">
              AS
            </div>
            <div>
              <p className="text-white font-bold">Admin User</p>
              <p className="text-xs text-white">DevOps Team</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative flex flex-col min-w-0 bg-transparent z-10">
         {/* Mobile Header */}
         <div className="md:hidden flex items-center justify-between p-4 bg-black border-b border-zinc-800 sticky top-0 z-30">
           <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="text-white border border-zinc-800 p-1 bg-zinc-900">
              <Icons.Menu />
            </button>
            <span className="font-bold text-white font-mono">SENTINEL_MOB</span>
           </div>
        </div>
        
        <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

const RateLimitProvider = ({ children }) => {
  const [showRateLimit, setShowRateLimit] = useState(false);

  // Set the handler in API service
  React.useEffect(() => {
    setRateLimitHandler(() => setShowRateLimit(true));
  }, []);

  return (
    <RateLimitContext.Provider value={{ setShowRateLimit }}>
      {children}
      {showRateLimit && <RateLimitWait onClose={() => setShowRateLimit(false)} />}
    </RateLimitContext.Provider>
  );
};

export default function App() {
  return (
    <ProjectProvider>
      <RateLimitProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/services" element={<Services />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/alert-rules" element={<AlertRules />} />
              <Route path="/service/:id" element={<ServiceDetails />} />
              <Route path="/service/:id/slo" element={<SLOReport />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </RateLimitProvider>
    </ProjectProvider>
  );
}

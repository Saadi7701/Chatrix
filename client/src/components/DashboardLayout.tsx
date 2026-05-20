import React, { useState } from 'react';
import { 
  MessageSquare, Users, Phone, Settings, 
  LogOut, Zap, Info, Menu, X
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { emitLogout } from '../services/socket';

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { icon: <MessageSquare size={24} />, label: 'Chats', path: '/chat' },
    { icon: <Users size={24} />, label: 'Stories', path: '/stories' },
    { icon: <Phone size={24} />, label: 'Calls', path: '/calls' },
    { icon: <Settings size={24} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-[#050505] text-white overflow-hidden font-sans">
      {/* Slim Sidebar (Desktop) */}
      <div className="hidden md:flex relative w-[80px] lg:w-[100px] flex-col items-center border-r border-white/5 bg-transparent z-40">
        {/* Logo Section */}
        <div className="py-8 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-violet-500 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:rotate-12 transition-all cursor-pointer">
            <Zap className="text-white w-7 h-7" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 w-full px-2 py-8 flex flex-col items-center gap-4 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item.path} className="relative group flex items-center justify-center w-full">
              <button
                onClick={() => navigate(item.path)}
                className={`
                  p-4 rounded-2xl transition-all relative
                  ${location.pathname === item.path 
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.1)]' 
                    : 'text-gray-500 hover:bg-white/5 hover:text-white'}
                `}
              >
                {item.icon}
                {location.pathname === item.path && (
                  <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-violet-400 rounded-full shadow-[0_0_10px_#8b5cf6]" />
                )}
              </button>
              
              {/* Tooltip / Popup Name */}
              <div className="absolute left-full ml-4 px-3 py-2 bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 pointer-events-none transition-all z-50 whitespace-nowrap hidden md:block">
                {item.label}
                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 border-y-[6px] border-y-transparent border-r-[6px] border-r-violet-500" />
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="py-8 flex flex-col items-center gap-8 w-full px-2">
          <button 
            onClick={() => {
              if (user?.id) emitLogout(user.id);
              logout();
            }}
            className="p-4 text-gray-600 hover:text-red-500 transition-all group relative"
          >
            <LogOut size={24} />
            <div className="absolute left-full ml-4 px-3 py-2 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 pointer-events-none transition-all z-50 whitespace-nowrap hidden md:block">
              Sign Out
            </div>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-[#050505] overflow-y-auto custom-scrollbar mb-20 md:mb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#0a0a14]/90 backdrop-blur-xl border-t border-white/5 z-50 flex items-center justify-around px-2 pb-safe">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${isActive ? 'text-violet-400 scale-110' : 'text-gray-500 hover:text-white'}`}
            >
              <div className="relative">
                {item.icon}
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-400 rounded-full shadow-[0_0_10px_#8b5cf6]" />
                )}
              </div>
              <span className={`text-[10px] font-bold tracking-widest uppercase ${isActive ? 'text-violet-400' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardLayout;

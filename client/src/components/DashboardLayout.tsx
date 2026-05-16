import React, { useState } from 'react';
import { 
  MessageSquare, Users, Phone, Settings, 
  LogOut, Zap, Info, Menu, X
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore(state => state.logout);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { icon: <MessageSquare size={24} />, label: 'Chats', path: '/chat' },
    { icon: <Users size={24} />, label: 'Stories', path: '/stories' },
    { icon: <Phone size={24} />, label: 'Calls', path: '/calls' },
    { icon: <Settings size={24} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#050505] text-white overflow-hidden font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0f0f1d] border-b border-white/5 z-50">
        <div className="flex items-center gap-3">
          <Zap className="text-violet-400 w-6 h-6" />
          <span className="font-black tracking-tighter text-lg">CHATRIX</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-400">
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Slim Sidebar (Desktop) */}
      <div className={`
        fixed inset-0 z-40 bg-black/95 md:relative md:translate-x-0 md:bg-transparent
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        w-full md:w-[80px] lg:w-[100px] flex flex-col items-center border-r border-white/5 transition-transform duration-300
      `}>
        {/* Logo Section */}
        <div className="py-8 hidden md:flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-violet-500 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:rotate-12 transition-all cursor-pointer">
            <Zap className="text-white w-7 h-7" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 w-full px-2 pt-24 md:pt-0 py-8 flex flex-col items-center gap-4 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item.path} className="relative group flex items-center justify-center w-full">
              <button
                onClick={() => {
                  navigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
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

              {/* Mobile Label */}
              <span className="md:hidden ml-4 text-sm font-bold text-gray-400">{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="py-8 flex flex-col items-center gap-8 w-full px-2">
          <div className="relative group w-full flex justify-center">
            <button className="p-4 text-gray-600 hover:text-violet-400 transition-all">
              <Info size={24} />
            </button>
            <div className="absolute left-full ml-4 px-3 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 pointer-events-none transition-all z-50 whitespace-nowrap hidden md:block">
              Support
            </div>
          </div>

          <div className="relative group w-full flex justify-center">
            <button 
              onClick={() => logout()}
              className="p-4 text-gray-600 hover:text-red-500 transition-all"
            >
              <LogOut size={24} />
            </button>
            <div className="absolute left-full ml-4 px-3 py-2 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 pointer-events-none transition-all z-50 whitespace-nowrap hidden md:block">
              Sign Out
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-[#050505] overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;

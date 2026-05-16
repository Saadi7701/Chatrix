import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { PhoneIncoming, PhoneOutgoing, Video, Phone, Search, Zap, Clock } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { useAuthStore } from '../store/useAuthStore';

const CallLogsPage = () => {
  const { user, token } = useAuthStore();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!token) return;
    const fetchCalls = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/auth/calls`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCalls(res.data);
      } catch (err) {
        console.error('Error fetching calls:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCalls();
  }, [token]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const filteredCalls = calls.filter(call => {
    const otherUser = call.callerId === user?.id ? call.receiver : call.caller;
    return otherUser.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col p-6 md:p-12 bg-[#050505]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-2">My Calls</h1>
            <p className="text-[10px] font-black tracking-[0.4em] text-violet-400 uppercase">Your call history</p>
          </div>

          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-violet-400 transition-colors" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..." 
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs text-white outline-none focus:border-violet-500 transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredCalls.map((call, i) => {
            const isOutgoing = call.callerId === user?.id;
            const otherUser = isOutgoing ? call.receiver : call.caller;
            
            return (
              <div 
                key={call.id || i} 
                className="group bg-white/[0.02] border border-white/5 rounded-3xl p-4 md:p-6 flex items-center justify-between hover:bg-white/[0.04] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4 md:gap-6 min-w-0">
                  <div className={`
                    w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center border transition-all
                    ${call.status === 'MISSED' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-violet-500/10 border-violet-500/20 text-violet-400'}
                  `}>
                    {call.type === 'VIDEO' ? <Video className="w-5 h-5 md:w-7 md:h-7" /> : <Phone className="w-5 h-5 md:w-7 md:h-7" />}
                  </div>
                  
                  <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-black text-white tracking-tight truncate">{otherUser.username}</h3>
                    <div className="flex items-center gap-3 md:gap-4 text-gray-500 text-[9px] font-black uppercase tracking-widest mt-1 md:mt-2">
                      <div className="flex items-center gap-1">
                        {isOutgoing ? <PhoneOutgoing size={10} /> : <PhoneIncoming size={10} />}
                        {isOutgoing ? 'Outgoing' : 'Incoming'}
                      </div>
                      <div className="flex items-center gap-1">
                         <Clock size={10} />
                         {new Date(call.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-8 flex-shrink-0">
                  <div className="hidden sm:block text-right">
                     <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Duration</p>
                     <p className="text-sm font-black text-white tracking-tighter">{formatDuration(call.duration)}</p>
                  </div>
                  <button 
                    onClick={() => (window as any).startNeuralCall?.(otherUser, call.type)}
                    className="p-3 md:p-4 rounded-2xl bg-white/5 hover:bg-violet-400 hover:text-black transition-all border border-white/5 shadow-lg group"
                  >
                     <Zap className="w-4 h-4 md:w-5 md:h-5 group-hover:fill-current" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {!loading && filteredCalls.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-20">
             <Phone className="w-16 h-16 text-gray-700 mb-6" />
             <p className="text-xs font-black tracking-[0.4em] uppercase text-gray-500">No Transmission Logs Found</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CallLogsPage;

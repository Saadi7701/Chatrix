
import DashboardLayout from '../components/DashboardLayout';
import { PhoneIncoming, PhoneOutgoing, Video, Phone, Search, Zap, Clock } from 'lucide-react';

const CallLogsPage = () => {
  const calls = [
    { name: 'X-7 Neural Node', time: '14:20', type: 'incoming', duration: '12:45', video: true },
    { name: 'Gamma Protocol', time: 'Yesterday', type: 'outgoing', duration: '05:20', video: false },
    { name: 'Vector Alpha', time: '2 days ago', type: 'missed', duration: '00:00', video: true },
  ];

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col p-6 md:p-12 bg-[#050505]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-2">Quantum Calls</h1>
            <p className="text-[10px] font-black tracking-[0.4em] text-cyan-400 uppercase">Neural Frequency Logs</p>
          </div>

          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search Transmissions..." 
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="space-y-4">
          {calls.map((call, i) => (
            <div 
              key={i} 
              className="group bg-white/[0.02] border border-white/5 rounded-3xl p-4 md:p-6 flex items-center justify-between hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4 md:gap-6 min-w-0">
                <div className={`
                  w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center border transition-all
                  ${call.type === 'missed' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'}
                `}>
                  {call.video ? <Video className="w-5 h-5 md:w-7 md:h-7" /> : <Phone className="w-5 h-5 md:w-7 md:h-7" />}
                </div>
                
                <div className="min-w-0">
                  <h3 className="text-lg md:text-xl font-black text-white tracking-tight truncate">{call.name}</h3>
                  <div className="flex items-center gap-3 md:gap-4 text-gray-500 text-[9px] font-black uppercase tracking-widest mt-1 md:mt-2">
                    <div className="flex items-center gap-1">
                      {call.type === 'incoming' ? <PhoneIncoming size={10} /> : <PhoneOutgoing size={10} />}
                      {call.type}
                    </div>
                    <div className="flex items-center gap-1">
                       <Clock size={10} />
                       {call.time}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 md:gap-8 flex-shrink-0">
                <div className="hidden sm:block text-right">
                   <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Duration</p>
                   <p className="text-sm font-black text-white tracking-tighter">{call.duration}</p>
                </div>
                <button className="p-3 md:p-4 rounded-2xl bg-white/5 hover:bg-cyan-400 hover:text-black transition-all border border-white/5 shadow-lg group">
                   <Zap className="w-4 h-4 md:w-5 md:h-5 group-hover:fill-current" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {calls.length === 0 && (
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

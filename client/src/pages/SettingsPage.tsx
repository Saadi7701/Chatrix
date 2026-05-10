import { useState, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { User, Bell, Shield, Cpu, Camera, Loader2, Check } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import axios from 'axios';
import { API_URL } from '../config/api';

const SettingsPage = () => {
  const { user, token, setAuth } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_URL}/api/upload/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAuth(res.data, token);
      alert('Neural Core Updated');
    } catch (err) {
      console.error('Update failed', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col p-6 md:p-12 bg-[#050505]">
        <div className="mb-10 md:mb-16">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-2">AI Settings</h1>
          <p className="text-[10px] font-black tracking-[0.4em] text-cyan-400 uppercase">Neural Protocol V.9</p>
        </div>

        <div className="max-w-4xl space-y-12 md:space-y-20">
          {/* Profile Section */}
          <section className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
            <div className="w-full md:w-64">
               <h2 className="text-xl font-black text-white mb-2">Neural Identity</h2>
               <p className="text-xs text-gray-500 leading-relaxed uppercase tracking-widest font-black opacity-50">Manage your core profile and bio-metrics.</p>
            </div>
            
            <div className="flex-1 w-full bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
               <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-cyan-400/10 border-2 border-dashed border-cyan-400/30 flex items-center justify-center overflow-hidden group-hover:border-cyan-400 transition-all">
                     {isUploading ? (
                       <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                     ) : user?.profilePic ? (
                       <img src={user.profilePic} className="w-full h-full object-cover" alt="profile" />
                     ) : (
                       <User className="w-12 h-12 text-gray-600" />
                     )}
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-3xl">
                     <Camera className="w-6 h-6 text-white" />
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleProfileUpdate} accept="image/*" />
               </div>

               <div className="flex-1 text-center md:text-left space-y-4">
                  <div className="space-y-4">
                     <div className="relative group">
                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Username</label>
                        <input 
                           type="text" 
                           defaultValue={user?.username}
                           id="profile-username"
                           className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-400 outline-none transition-all"
                        />
                     </div>
                     <div className="relative group">
                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Full Name</label>
                        <input 
                           type="text" 
                           defaultValue={user?.fullName || ''}
                           id="profile-fullname"
                           className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-400 outline-none transition-all"
                        />
                     </div>
                     <button 
                        onClick={async () => {
                           const username = (document.getElementById('profile-username') as HTMLInputElement).value;
                           const fullName = (document.getElementById('profile-fullname') as HTMLInputElement).value;
                           try {
                              const res = await axios.put(`${API_URL}/api/auth/profile`, { username, fullName }, {
                                 headers: { Authorization: `Bearer ${token}` }
                              });
                              if (token) setAuth(res.data, token);
                              alert('Neural Profile Synced');
                           } catch (err) { alert('Update Failed: Identity Conflict?'); }
                        }}
                        className="bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(0,242,255,0.4)] hover:scale-105 transition-all"
                     >
                        Sync Identity
                     </button>
                  </div>
                  <p className="text-[10px] font-black text-cyan-400/50 tracking-[0.2em] uppercase pt-4">Node ID: {user?.userCode}</p>
               </div>
            </div>
          </section>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <Section title="Privacy & Stealth" icon={<Shield className="text-green-400" />}>
                 <div className="p-6 space-y-6 rounded-[2rem] bg-white/[0.03] border border-white/5">
                    <Toggle label="Ghost Protocol Mode" active />
                    <Toggle label="Quantum Encryption" active />
                    
                    <div className="pt-4 border-t border-white/5">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">Stealth Access Key</label>
                       <div className="flex gap-2">
                          <input 
                            type="text" 
                            defaultValue={user?.stealthCode || 'AURA_99'}
                            id="stealth-input"
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-400 outline-none transition-all"
                          />
                          <button 
                            onClick={async () => {
                               const code = (document.getElementById('stealth-input') as HTMLInputElement).value;
                               try {
                                  const res = await axios.put(`${API_URL}/api/auth/stealth-code`, { code }, {
                                     headers: { Authorization: `Bearer ${token}` }
                                  });
                                  if (token) setAuth(res.data, token);
                                  alert('Neural Privacy Updated');
                               } catch (err) { alert('Sync Failed'); }
                            }}
                            className="bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 transition-all"
                          >
                             <Check className="w-4 h-4 text-cyan-400" />
                          </button>
                       </div>
                    </div>
                 </div>
              </Section>

              <Section title="Notifications" icon={<Bell className="text-orange-400" />}>
                 <div className="p-6 space-y-4 rounded-[2rem] bg-white/[0.03] border border-white/5">
                    <Toggle label="Neural Pulse Pings" active />
                    <Toggle label="Call Transmissions" active />
                    <Toggle label="Story Injections" />
                 </div>
              </Section>

              <Section title="System" icon={<Cpu className="text-purple-400" />}>
                 <div className="p-6 space-y-4 rounded-[2rem] bg-white/[0.03] border border-white/5">
                    <Toggle label="Dark Matter Theme" active />
                    <Toggle label="Neural Network Cache" />
                    <Toggle label="Bio-Metric Lock" active />
                 </div>
              </Section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const Section = ({ title, icon, children }: any) => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
       <div className="p-2 rounded-lg bg-white/5 border border-white/10">{icon}</div>
       <h3 className="text-sm font-black text-white uppercase tracking-widest">{title}</h3>
    </div>
    {children}
  </div>
);

const Toggle = ({ label, active = false }: any) => (
  <div className="flex items-center justify-between group cursor-pointer">
    <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors uppercase tracking-widest">{label}</span>
    <div className={`w-10 h-5 rounded-full p-1 transition-all ${active ? 'bg-cyan-500 shadow-[0_0_10px_#00f2ff]' : 'bg-white/10'}`}>
       <div className={`w-3 h-3 rounded-full bg-black transition-all ${active ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </div>
);

export default SettingsPage;

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, Shield, Cpu, ArrowRight, 
  Globe, Lock, Network, Database, ChevronRight
} from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#050505]">
      {/* Cinematic Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/10 rounded-full blur-[120px] animate-pulse" />

      {/* Main Content Dashboard Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 w-full max-w-7xl px-6 py-12 flex flex-col items-center"
      >
        {/* Top Header Label */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-12"
        >
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
          <span className="text-[10px] font-black tracking-[0.3em] uppercase text-violet-400">Join the Vibe • v4.0.2</span>
        </motion.div>

        {/* Centerpiece: Floating Button & Title */}
        <div className="relative flex flex-col items-center mb-24">
          {/* Decorative Floating Icons */}
          <FloatingIcon icon={<Lock />} className="top-[-100px] left-[-150px] text-purple-400" delay={0} />
          <FloatingIcon icon={<Globe />} className="top-[-80px] right-[-140px] text-cyan-400" delay={0.5} />
          <FloatingIcon icon={<Network />} className="bottom-[-80px] left-[-120px] text-blue-400" delay={1} />
          <FloatingIcon icon={<Database />} className="bottom-[-100px] right-[-160px] text-indigo-400" delay={1.5} />

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-9xl font-black text-white tracking-tighter text-center mb-12 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            CHA<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-white to-fuchsia-500">TRIX</span>
          </motion.h1>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative group"
          >
            {/* Pulsing Outer Rings */}
            <div className="absolute inset-0 bg-violet-500/20 rounded-3xl blur-2xl group-hover:bg-violet-500/40 transition-all animate-pulse" />
            <Link 
              to="/auth"
              className="relative flex items-center gap-4 px-12 py-6 bg-white text-black font-black text-xl rounded-3xl shadow-[0_20px_50px_rgba(139,92,246,0.3)] hover:shadow-[0_20px_80px_rgba(139,92,246,0.5)] transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              START CHATTING
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* 3D Feature Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-12">
          <DashboardCard 
            icon={<MessageSquare />}
            title="Super Secure"
            value="Encrypted"
            desc="Every word you say is protected by high-level encryption."
            color="violet"
          />
          <DashboardCard 
            icon={<Cpu />}
            title="Smart Vibes"
            value="Active"
            desc="A smooth experience designed for the best conversations."
            color="fuchsia"
          />
          <DashboardCard 
            icon={<Shield />}
            title="Private Mode"
            value="Enabled"
            desc="Your chats are private and only for you and your friends."
            color="indigo"
          />
        </div>
      </motion.div>

      {/* Footer System Stats */}
      <div className="absolute bottom-10 w-full px-12 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold text-gray-600 tracking-widest uppercase">
        <div className="flex gap-8">
          <span>Uptime: 99.99%</span>
          <span>Latency: 2ms</span>
          <span>Users: 1.2M</span>
        </div>
        <div>Aura Protocol © 2026 • Secure Neural Network</div>
      </div>
    </div>
  );
};

const DashboardCard = ({ icon, title, value, desc, color }: any) => {
  const colorMap: any = {
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  };

  const glowMap: any = {
    violet: 'bg-violet-500/10 group-hover:bg-violet-500/20',
    fuchsia: 'bg-fuchsia-500/10 group-hover:bg-fuchsia-500/20',
    indigo: 'bg-indigo-500/10 group-hover:bg-indigo-500/20',
  };

  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl hover:bg-white/[0.05] hover:border-white/20 transition-all relative overflow-hidden group"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] -translate-y-1/2 translate-x-1/2 transition-all ${glowMap[color]}`} />
      
      <div className="flex justify-between items-start mb-8">
        <div className={`p-4 rounded-2xl bg-white/5 shadow-inner ${colorMap[color].split(' ')[1]}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${colorMap[color]}`}>
          {value}
        </span>
      </div>
      
      <h3 className="text-2xl font-black text-white mb-4">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      
      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between group-hover:text-white transition-colors">
        <span className="text-[10px] font-bold uppercase tracking-widest">Protocol Stats</span>
        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </div>
    </motion.div>
  );
};

const FloatingIcon = ({ icon, className, delay }: any) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ 
      opacity: [0.2, 0.5, 0.2],
      y: [0, -20, 0],
    }}
    transition={{ 
      duration: 4, 
      repeat: Infinity, 
      delay,
      ease: "easeInOut"
    }}
    className={`absolute hidden lg:block p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md ${className}`}
  >
    {icon}
  </motion.div>
);

export default LandingPage;

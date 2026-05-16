import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap, Globe, ArrowRight, User, Mail, Shield } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { API_URL } from '../config/api';

const AuthPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']); // 6-digit code for registration
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value.toUpperCase();
    setCode(newCode);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const finalCode = code.join('');
        if (finalCode.length < 6) {
          setError('Incomplete Neural Code (6 digits required)');
          setLoading(false);
          return;
        }

        const res = await axios.post(`${API_URL}/api/auth/register`, {
          username,
          fullName,
          password,
          userCode: finalCode
        });
        setAuth(res.data.user, res.data.token);
        navigate('/chat');
      } else {
        const res = await axios.post(`${API_URL}/api/auth/login`, {
          username,
          password
        });
        setAuth(res.data.user, res.data.token);
        navigate('/chat');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Neural Link Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 overflow-hidden relative font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500/20 rounded-full blur-[120px] animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/20 rounded-full blur-[120px] animate-pulse" />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-[#0b141a]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-br from-violet-400 to-fuchsia-600 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(139,92,246,0.3)] border-4 border-[#0a0a14]">
             <Zap className="w-12 h-12 text-white" />
          </div>

          <div className="text-center mt-12 mb-10">
            <h1 className="text-4xl font-black tracking-tighter mb-2">CHATRIX</h1>
            <p className="text-gray-500 text-[10px] font-black tracking-[0.3em] uppercase">
              {isRegister ? 'Join the Chatrix Club' : 'Welcome Back, Friend'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {isRegister ? (
                <motion.div 
                  key="register"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="space-y-4">
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-violet-400 transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Your Name" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-violet-400 outline-none transition-all"
                        required 
                      />
                    </div>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Unique Username" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-violet-400 outline-none transition-all"
                        required 
                      />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                      <input 
                        type="password" 
                        placeholder="Security Key (Password)" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-violet-400 outline-none transition-all"
                        required 
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">6-Digit Neural Access Code</p>
                    <div className="flex gap-2 justify-between">
                      {code.map((digit, i) => (
                        <input
                          key={i}
                          id={`code-${i}`}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodeChange(i, e.target.value)}
                          className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl text-center text-xl font-bold focus:border-cyan-400 outline-none transition-all"
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Username" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-cyan-400 outline-none transition-all font-mono"
                      required 
                    />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input 
                      type="password" 
                      placeholder="Password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-cyan-400 outline-none transition-all"
                      required 
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{error}</span>
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-400 to-violet-600 text-white font-black py-4 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="tracking-[0.2em]">{isRegister ? 'START CHATTING' : 'GO TO HUB'}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-[10px] font-black text-gray-500 hover:text-cyan-400 transition-colors tracking-widest uppercase"
            >
              {isRegister ? 'Already have an identity? Establish Link' : 'Need a new identity? Initialize Core'}
            </button>
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-8 text-gray-600">
           <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="text-[8px] font-black tracking-widest uppercase">E2E Encrypted</span>
           </div>
           <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span className="text-[8px] font-black tracking-widest uppercase">Global Node</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;

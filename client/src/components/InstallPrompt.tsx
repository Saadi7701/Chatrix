import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const InstallPrompt = () => {
   const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
   const [showPrompt, setShowPrompt] = useState(false);

   useEffect(() => {
      // Force the prompt to show for EVERY user after a 2-second delay, UNLESS they are already in the installed App
      const timer = setTimeout(() => {
         // Check if the app is running in standalone mode (already installed PWA)
         const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
         if (!isStandalone) {
            setShowPrompt(true);
         }
      }, 2000);

      const handler = (e: any) => {
         // Prevent the mini-infobar from appearing on mobile
         e.preventDefault();
         // Stash the event so it can be triggered later.
         setDeferredPrompt(e);
         setShowPrompt(true);
      };

      window.addEventListener('beforeinstallprompt', handler);

      return () => {
         clearTimeout(timer);
         window.removeEventListener('beforeinstallprompt', handler);
      };
   }, []);

   const handleInstall = async () => {
      if (deferredPrompt) {
         // Show the native install prompt
         deferredPrompt.prompt();
         const { outcome } = await deferredPrompt.userChoice;
         console.log(`User response to the install prompt: ${outcome}`);
         setDeferredPrompt(null);
      } else {
         // Fallback if browser blocking native prompt or on iOS
         alert("To install Chatrix:\n\n1. Tap the Share icon (iOS) or Menu icon (Android/Chrome)\n2. Select 'Add to Home Screen'");
      }
      setShowPrompt(false);
   };

   return (
      <AnimatePresence>
         {showPrompt && (
            <motion.div 
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 50 }}
               className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md"
            >
               <div className="glass-card bg-black/80 border border-violet-500/30 p-5 flex items-center justify-between gap-4 shadow-[0_0_40px_rgba(139,92,246,0.3)]">
                  <div className="flex flex-col">
                     <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                        <Download className="w-4 h-4 text-violet-400" />
                        Install Chatrix
                     </h3>
                     <p className="text-gray-400 text-xs mt-1">Install the Neural Link app for a faster, native experience.</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     <button 
                        onClick={() => setShowPrompt(false)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                     >
                        <X className="w-4 h-4" />
                     </button>
                     <button 
                        onClick={handleInstall}
                        className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(139,92,246,0.5)] transition-all"
                     >
                        Install
                     </button>
                  </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>
   );
};

export default InstallPrompt;

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Send, Heart, RefreshCcw, Share2, 
  ChevronLeft, ChevronRight, Zap, Plus, Image as ImageIcon,
  Loader2, Trash2
} from 'lucide-react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config/api';

const StoriesPage = () => {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [stories, setStories] = useState<any[]>([]);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Stories
  const fetchStories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/stories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStories(res.data);
    } catch (err) {
      console.error('Error fetching stories', err);
    }
  };

  useEffect(() => {
    if (token) fetchStories();
  }, [token]);

  // Like Story
  const handleLike = async (storyId: string) => {
    try {
      await axios.post(`${API_URL}/api/stories/like/${storyId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStories();
      if (selectedStory?.id === storyId) {
        // Optimistically update selected story likes if needed, but fetchStories is safer
        const res = await axios.get('http://localhost:5000/api/stories', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const updated = res.data.find((s: any) => s.id === storyId);
        if (updated) setSelectedStory(updated);
      }
    } catch (err) {
      console.error('Error liking story', err);
    }
  };

  // Upload Story from Device
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Upload to storage
      const uploadRes = await axios.post(`${API_URL}/api/upload/chat`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 2. Create story record
      await axios.post(`${API_URL}/api/stories`, {
        mediaUrl: uploadRes.data.url,
        mediaType: uploadRes.data.type.toLowerCase() === 'video' ? 'video' : 'image',
        caption: 'Neural Pulse established'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchStories();
    } catch (err) {
      console.error('Error uploading story', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Reply to Story
  const handleReply = async () => {
    if (!replyText || !selectedStory || !token) return;

    try {
      // Sending story reply as a special message in chat
      await axios.post(`${API_URL}/api/chat/send`, {
        receiverId: selectedStory.userId,
        content: `Reply to story: "${replyText}"`,
        type: 'TEXT'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setReplyText('');
      alert('Response Transmitted');
      setSelectedStory(null);
      navigate('/chat');
    } catch (err) {
      console.error('Reply failed', err);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col p-6 md:p-12 bg-[#050505] relative">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-6xl font-black text-white tracking-tighter">Neural Stories</h1>
          
          <div className="flex items-center gap-4">
             <input 
               type="file" 
               ref={fileInputRef}
               onChange={handleFileUpload}
               className="hidden"
               accept="image/*,video/*"
             />
             <button 
               onClick={() => fileInputRef.current?.click()}
               disabled={isUploading}
               className="btn-primary !py-4 !px-8 !text-xs flex items-center gap-3 shadow-[0_0_30px_rgba(0,242,255,0.3)] hover:scale-105 transition-all"
             >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                INITIATE PULSE
             </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8">
           {stories.length === 0 && (
             <div className="aspect-[9/16] rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-gray-700 p-8 text-center">
                <ImageIcon className="w-8 h-8 mb-4 opacity-20" />
                <p className="text-[10px] font-black tracking-widest uppercase leading-relaxed">No Active Neural Pulses in your Sector</p>
             </div>
           )}

           {stories.map((story) => (
             <div 
               key={story.id}
               onClick={() => setSelectedStory(story)}
               className="group cursor-pointer"
             >
                <div className="aspect-[9/16] rounded-[2.5rem] overflow-hidden border-2 border-white/5 group-hover:border-cyan-400 p-1.5 transition-all duration-500">
                   <div className="w-full h-full rounded-[2rem] overflow-hidden relative shadow-2xl">
                      {story.mediaType === 'video' ? (
                        <video src={story.mediaUrl} className="w-full h-full object-cover" />
                      ) : (
                        <img src={story.mediaUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000" alt="story" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60" />
                      <div className="absolute bottom-6 left-6 right-6">
                         <div className="w-10 h-10 rounded-full border-2 border-cyan-400 p-0.5 mb-3 shadow-[0_0_15px_rgba(0,242,255,0.4)]">
                            <img src={story.user.profilePic || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${story.user.username}`} className="w-full h-full rounded-full" alt="avatar" />
                         </div>
                         <p className="text-xs font-black text-white tracking-widest uppercase truncate">{story.user.username}</p>
                         <p className="text-[8px] font-bold text-cyan-400/50 tracking-widest uppercase">NODE ACTIVE</p>
                      </div>
                   </div>
                </div>
             </div>
           ))}
        </div>

        {/* Cinematic Viewer */}
        <AnimatePresence>
          {selectedStory && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-3xl"
            >
               <button 
                 onClick={() => setSelectedStory(null)}
                 className="absolute top-10 right-10 p-4 text-white hover:bg-white/10 rounded-full transition-all"
               >
                 <X className="w-8 h-8" />
               </button>

               <div className="relative w-full max-w-lg aspect-[9/16] rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_150px_rgba(0,0,0,0.8)] flex flex-col bg-[#0b141a]">
                  {/* Progress Bars */}
                  <div className="absolute top-8 left-10 right-10 flex gap-2 z-20">
                     <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden relative">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: '100%' }} 
                          transition={{ duration: 5 }} 
                          onAnimationComplete={() => setSelectedStory(null)}
                          className="absolute inset-0 bg-cyan-400 shadow-[0_0_10px_#00f2ff]" 
                        />
                     </div>
                  </div>

                  {/* Header */}
                  <div className="absolute top-14 left-10 right-10 flex items-center justify-between z-20">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full border-2 border-cyan-400 p-0.5 shadow-lg">
                           <img src={selectedStory.user.profilePic || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${selectedStory.user.username}`} className="w-full h-full rounded-full" alt="avatar" />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-white tracking-tight">{selectedStory.user.username}</h3>
                           <p className="text-[9px] font-black tracking-[0.3em] text-cyan-400/60 uppercase">NEURAL FREQUENCY • {new Date(selectedStory.createdAt).toLocaleTimeString()}</p>
                        </div>
                     </div>
                     <Zap className="w-6 h-6 text-cyan-400 animate-pulse" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 relative bg-black flex items-center justify-center">
                     {selectedStory.mediaType === 'video' ? (
                       <video src={selectedStory.mediaUrl} autoPlay className="w-full h-full object-contain" />
                     ) : (
                       <img src={selectedStory.mediaUrl} className="w-full h-full object-contain" alt="content" />
                     )}
                     <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.9)] pointer-events-none" />
                  </div>

                  {/* Footer Logic */}
                  <div className="p-10 pt-0 z-20 bg-gradient-to-t from-[#0b141a] via-[#0b141a]/90 to-transparent">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="flex-1 relative">
                           <input 
                             type="text" 
                             value={replyText}
                             onChange={(e) => setReplyText(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                             placeholder="Transmit response..."
                             className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-sm text-white placeholder:text-gray-600 outline-none focus:border-cyan-500/50 transition-all shadow-inner"
                           />
                           <button 
                             onClick={handleReply}
                             className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-cyan-400 hover:text-white transition-all"
                           >
                              <Send className="w-6 h-6" />
                           </button>
                        </div>
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleLike(selectedStory.id); }}
                             className={`flex items-center gap-3 transition-all ${selectedStory.likes?.find((l: any) => l.userId === user?.id) ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                           >
                              <Heart className={`w-6 h-6 ${selectedStory.likes?.find((l: any) => l.userId === user?.id) ? 'fill-current' : ''}`} />
                              <span className="text-xs font-black tracking-widest">{selectedStory.likes?.length || 0}</span>
                           </button>
                           <button className="flex items-center gap-3 text-gray-500 hover:text-cyan-400 transition-all">
                              <RefreshCcw className="w-6 h-6" />
                              <span className="text-xs font-black tracking-widest uppercase">Re-Sync</span>
                           </button>
                        </div>
                        <button className="text-gray-500 hover:text-white transition-all">
                           <Share2 className="w-6 h-6" />
                        </button>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default StoriesPage;

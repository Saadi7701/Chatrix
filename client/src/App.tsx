import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage.tsx';
import AuthPage from './pages/AuthPage.tsx';
import ChatPage from './pages/ChatPage.tsx';
import StoriesPage from './pages/StoriesPage.tsx';
import CallLogsPage from './pages/CallLogsPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import { useAuthStore } from './store/useAuthStore';
import NotificationManager from './components/NotificationManager';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  if (!token) return <Navigate to="/auth" />;
  return <>{children}</>;
};

function App() {
  const { token, user } = useAuthStore();

  return (
    <Router>
      <NotificationManager />
      {/* High-End CSS Background System */}
      <div className="cyber-bg fixed inset-0 z-0">
        <div className="ambient-glow-1" />
        <div className="ambient-glow-2" />
      </div>

      <div className={`relative z-10 min-h-screen ${user?.darkTheme === false ? 'light-mode' : ''}`}>
        <Routes>
          <Route path="/" element={token ? <Navigate to="/chat" /> : <LandingPage />} />
          <Route path="/auth" element={token ? <Navigate to="/chat" /> : <AuthPage />} />
          
          <Route 
            path="/chat" 
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/stories" 
            element={
              <ProtectedRoute>
                <StoriesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/calls" 
            element={
              <ProtectedRoute>
                <CallLogsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Landing from "./pages/Landing";
import JoinRoom from "./pages/JoinRoom";
import Particles from "./components/Particles";
import NotFound from "./pages/NotFound";
import Results from "./pages/Results";
import Game from "./pages/Game";
import Lobby from "./pages/Lobby";
import { SmoothCursor } from "./components/ui/smooth-cursor";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import { AdminDashboard } from "./pages/AdminDashboard";
import { apiClient } from "./lib/api-client";
import { GET_USER_INFO } from "./utils/constants";
import { useAppStore } from "./store";
import { useEffect, useState } from "react";
import RoomAccessLayout from "./components/RoomAccessLayout";
import { ReckonLoader } from "./components/ui/ReckonLoader";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import { CookieBanner } from "./components/ui/CookieBanner";

const PrivateRoute = ({ children, loading }) => {
  const { userInfo } = useAppStore();
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><ReckonLoader text="Loading..." /></div>; // Show a loading state while fetching user info
  }
  const isAuthenticated = !!userInfo;
  return isAuthenticated ? children : <Navigate to="/auth" />;
};

const AuthRoute = ({ children }) => {
  const { userInfo } = useAppStore();
  const isAuthenticated = !!userInfo;
  return isAuthenticated ? <Navigate to="/" /> : children;
};

function App() {
  const { userInfo, setUserInfo } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If userInfo is already fetched (object or null), stop loading
    if (userInfo !== undefined) {
      setLoading(false);
      return;
    }

    let retries = 2; // Allow up to 2 retries (e.g. for simulator extensions)

    const getUserData = async () => {
      try {
        const response = await apiClient.get(GET_USER_INFO, {
          withCredentials: true,
        });
        if (response.status === 200 && response.data.id) {
          setUserInfo(response.data);
        } else {
          setUserInfo(null);
        }
        setLoading(false);
      } catch (error) {
        if (retries > 0) {
          retries -= 1;
          setTimeout(getUserData, 500); // Wait 500ms and retry
        } else {
          setUserInfo(null);
          setLoading(false);
        }
      }
    };

    getUserData();
  }, [userInfo, setUserInfo]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A]">
        <ReckonLoader text="Loading..." />
      </div>
    );
  }
  return (
    <BrowserRouter>
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-[#0A0A0A] overflow-hidden">
        <Particles
          particleColors={["#ffffff", "#ffffff"]}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={false}
          alphaParticles={false}
          disableRotation={false}
          className="absolute inset-0 -z-10" // sits behind everything
        />
      </div>

      {/* Foreground Content with Animation */}
      <AnimatedRoutes />
      <SmoothCursor />
      <CookieBanner />
    </BrowserRouter>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  // For nested room routes, keep the key stable to prevent layout unmounting.
  const match = location.pathname.match(/^\/(lobby|game|results)\/([^/]+)/);
  const routeKey = match ? `room-${match[2]}` : location.pathname;

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={routeKey}>
        <Route
          path="/"
          element={
            <PageWrapper>
              <Landing />
            </PageWrapper>
          }
        />
        <Route
          path="/auth"
          element={
            <AuthRoute>
              <PageWrapper>
                <Auth />
              </PageWrapper>
            </AuthRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <PageWrapper>
                <Profile />
              </PageWrapper>
            </PrivateRoute>
          }
        />
        <Route
          path="/join/:code?"
          element={
            <PageWrapper>
              <JoinRoom />
            </PageWrapper>
          }
        />
        <Route
          path="/admin/reckon-control"
          element={
            <PageWrapper>
              <AdminDashboard />
            </PageWrapper>
          }
        />
        <Route
          path="/privacy"
          element={
            <PageWrapper>
              <PrivacyPolicy />
            </PageWrapper>
          }
        />
        <Route
          path="/terms"
          element={
            <PageWrapper>
              <Terms />
            </PageWrapper>
          }
        />
        
        {/* Nested Room Routes - Prevent Layout Unmounts */}
        <Route element={<RoomAccessLayout />}>
          <Route
            path="/lobby/:code"
            element={
              <PageWrapper key="lobby">
                <Lobby />
              </PageWrapper>
            }
          />
          <Route
            path="/game/:code"
            element={
              <PageWrapper key="game">
                <Game />
              </PageWrapper>
            }
          />
          <Route
            path="/results/:code"
            element={
              <PageWrapper key="results">
                <Results />
              </PageWrapper>
            }
          />
        </Route>

        <Route
          path="*"
          element={
            <PageWrapper>
              <NotFound />
            </PageWrapper>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

// Page transition wrapper
const PageWrapper = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

export default App;

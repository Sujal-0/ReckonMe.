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
import { apiClient } from "./lib/api-client";
import { GET_USER_INFO } from "./utils/constants";
import { useAppStore } from "./store";
import { useEffect, useState } from "react";
import RoomAccessHandler from "./components/RoomAccessHandler";

const PrivateRoute = ({ children, loading }) => {
  const { userInfo } = useAppStore();
  if (loading) {
    return <div>Loading...</div>; // Show a loading state while fetching user info
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
    const getUserData = async () => {
      try {
        const response = await apiClient.get(GET_USER_INFO, {
          withCredentials: true,
        });
        if (response.status === 200 && response.data.id) {
          setUserInfo(response.data);
        } else {
          setUserInfo(undefined);
        }
        console.log({ response });
      } catch (error) {
        setUserInfo(undefined);
      } finally {
        setLoading(false);
      }
    };
    if (!userInfo) {
      getUserData();
    } else {
      setLoading(false);
    }
  }, [userInfo, setUserInfo]);

  if (loading) {
    return (
      <div className="text-2xl font-bold animate-pulse font-['IndieSellout']">
        Loading...
      </div>
    );
  }
  return (
    <BrowserRouter>
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-[#0A0A0A] overflow-hidden cursor-none">
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
    </BrowserRouter>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
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
          path="/lobby/:code"
          element={
            <RoomAccessHandler>
              <PageWrapper>
                <Lobby />
              </PageWrapper>
            </RoomAccessHandler>
          }
        />
        <Route
          path="/game/:code"
          element={
            <PageWrapper>
              <Game />
            </PageWrapper>
          }
        />
        <Route
          path="/results/:code"
          element={
            <PageWrapper>
              <Results />
            </PageWrapper>
          }
        />
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

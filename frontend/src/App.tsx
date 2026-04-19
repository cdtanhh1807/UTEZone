import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

// ----- AUTH -----
import SignUp from "./components/content/auth/signup/SignUp";
import Login from "./components/content/auth/login/Login";
import VerifyOtp from "./components/content/auth/verifyotp/VerifyOtp";
import ForgotPassword from "./components/content/auth/forgotpassword/ForgotPassword";
import OtpForgotPassword from "./components/content/auth/forgotpassword/OtpForgotPassword";

// ----- USER / MOD -----
import Home from "./components/content/user/home/home"
// import Home from "./components/content/user/home/Home";
import Profile from "./components/content/user/profile/profile";
import CompleteProfile from "./components/content/user/profile/completeProfile";
import UserLayout from "./UserLayout";
import WelcomePage from "./welcomePage";
import ToastProvider from "./components/content/user/common/toastProvider";

// ----- ADMIN -----
import AdminDashboard from "./components/content/admin/AdminDashboard";
import type { JSX } from "react";

const GOOGLE_CLIENT_ID =
  "11513787683-k2jko2vekvh90c37sgbnftbqc07eq245.apps.googleusercontent.com";

/* ================== AUTH UTILS ================== */
type Role = "Administrator" | "User" | "Moderator";

const getAuthInfo = (): { role: Role } | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded: any = jwtDecode(token);

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      return null;
    }

    return decoded;
  } catch {
    localStorage.removeItem("token");
    return null;
  }
};

/* ================== ROOT REDIRECT ================== */
const RootRedirect = () => {
  const auth = getAuthInfo();

  if (!auth) return <Navigate to="/welcome" replace />;

  if (auth.role === "Administrator") {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/home" replace />;
};

/* ================== GUARDS ================== */

// CHỈ CHƯA LOGIN
const GuestGuard = ({ children }: { children: JSX.Element }) => {
  const auth = getAuthInfo();

  if (!auth) return children;

  // If redirect param exists, send token back to the calling app
  const params = new URLSearchParams(window.location.search);
  const redirectUrl = params.get("redirect");
  if (redirectUrl) {
    const token = localStorage.getItem("token");
    if (token) {
      const separator = redirectUrl.includes("?") ? "&" : "?";
      window.location.href = `${redirectUrl}${separator}token=${token}`;
      return <></>;
    }
  }

  if (auth.role === "Administrator") {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/home" replace />;
};

// CHỈ USER + MODERATOR
const UserOnlyGuard = ({ children }: { children: JSX.Element }) => {
  const auth = getAuthInfo();

  if (!auth) return <Navigate to="/welcome" replace />;

  if (auth.role === "Administrator") {
    return <Navigate to="/admin" replace />;
  }

  // User & Moderator OK
  return children;
};

// CHỈ ADMIN
const AdminOnlyGuard = ({ children }: { children: JSX.Element }) => {
  const auth = getAuthInfo();

  if (!auth) return <Navigate to="/welcome" replace />;

  if (auth.role !== "Administrator") {
    return <Navigate to="/home" replace />;
  }

  return children;
};

/* ================== APP ================== */
function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ToastProvider />

      <Router>
        <Routes>
          {/* ROOT */}
          <Route path="/" element={<RootRedirect />} />

          {/* ===== ADMIN ONLY ===== */}
          <Route
            path="/admin/*"
            element={
              <AdminOnlyGuard>
                <AdminDashboard />
              </AdminOnlyGuard>
            }
          />

          {/* ===== GUEST ONLY ===== */}
          <Route
            path="/welcome"
            element={
              <GuestGuard>
                <WelcomePage />
              </GuestGuard>
            }
          />
          <Route
            path="/login"
            element={
              <GuestGuard>
                <Login />
              </GuestGuard>
            }
          />
          <Route
            path="/signup"
            element={
              <GuestGuard>
                <SignUp />
              </GuestGuard>
            }
          />
          <Route
            path="/verify-otp"
            element={
              <GuestGuard>
                <VerifyOtp />
              </GuestGuard>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestGuard>
                <ForgotPassword />
              </GuestGuard>
            }
          />
          <Route
            path="/verify-forgot-password"
            element={
              <GuestGuard>
                <OtpForgotPassword />
              </GuestGuard>
            }
          />

          {/* ===== USER + MODERATOR ONLY ===== */}
          <Route
            element={
              <UserOnlyGuard>
                <UserLayout />
              </UserOnlyGuard>
            }
          >
            <Route path="/home" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:email" element={<Profile />} />
            <Route path="/search" element={<Home />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
          </Route>

          {/* ===== FALLBACK ===== */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;

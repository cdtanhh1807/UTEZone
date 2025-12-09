import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from "@react-oauth/google";

// ----- AUTH -----
import SignUp from './components/content/auth/signup/SignUp';
import Login from './components/content/auth/login/Login';
import VerifyOtp from './components/content/auth/verifyotp/VerifyOtp';
import ForgotPassword from './components/content/auth/forgotpassword/ForgotPassword';
import OtpForgotPassword from './components/content/auth/forgotpassword/OtpForgotPassword';

// ----- USER -----
import Home from './components/content/user/home/home';
import Profile from './components/content/user/profile/profile';
import CompleteProfile from './components/content/user/profile/completeProfile';
import UserLayout from './UserLayout';
import WelcomePage from './welcomePage';

// ----- THÊM TỪ BẢN CỦA BẠN BẠN -----
import AdminDashboard from './components/content/admin/AdminDashboard';

const GOOGLE_CLIENT_ID =
  "11513787683-k2jko2vekvh90c37sgbnftbqc07eq245.apps.googleusercontent.com";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <Routes>

          {/* ------------------ WELCOME PAGE ------------------ */}
          <Route path="/" element={<WelcomePage />} />

          {/* ------------------ ADMIN KHÔNG DÙNG HEADER/FOOTER ------------------ */}
          <Route path="/admin/*" element={<AdminDashboard />} />

          {/* ------------------ AUTH (không header/footer) ------------------ */}
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-forgot-password" element={<OtpForgotPassword />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />

          {/* ------------------ USER ROUTES DÙNG UserLayout ------------------ */}
          <Route element={<UserLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:email" element={<Profile />} />
            <Route path="/search" element={<Home />} />
          </Route>
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;

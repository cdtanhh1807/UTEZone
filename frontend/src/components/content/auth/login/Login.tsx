import { useState, type ChangeEvent, type FormEvent } from "react";
import axiosInstance from "../../../../utils/AxiosInstance";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { isTokenExpired } from "../../../../utils/Auth";
import { GoogleLoginBtn } from "../google/GoogleLoginBtn";
import logo_truong from "../../../../assets/logo_login.png";
import logo from "../../../../assets/logo.png";
import { jwtDecode } from "jwt-decode";
import { ToastService } from "../../../../services/ToastService";
import "./Login.css";

type LoginForm = {
  username: string;
  password: string;
};

type LoginResponse = {
  access_token: string;
  token_type: string;
};

function Login() {
  const [formData, setFormData] = useState<LoginForm>({
    username: "",
    password: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload = new URLSearchParams();
    payload.append("username", formData.username);
    payload.append("password", formData.password);

    try {
      const response = await axiosInstance.post<LoginResponse>(
        "/account/login",
        payload,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const token = response.data.access_token;

      // 🟦 Decode token
      interface JwtPayload {
        sub: string;
        role: string;
        per: string; // 👈 permission
        exp: number;
      }

      const decoded = jwtDecode<JwtPayload>(token);
      console.log("decoded login toan test:", decoded);

      // 🚫 BLOCK LOGIN
      if (decoded.per === "000") {
        ToastService.error("Tài khoản của bạn đã bị khóa");
        return;
      }

      // ✅ OK → lưu token
      localStorage.setItem("token", token);

      // 🟥 Admin
      if (decoded.role === "Administrator") {
        navigate("/admin");
        return;
      }

      // 🟩 User
      navigate("/home");
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Sai tên đăng nhập hoặc mật khẩu");
      } else {
        setError("Không thể kết nối đến server");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <img
          src={logo_truong} // đổi theo đường dẫn hình của bạn
          alt="Login Illustration"
          className="login-image"
        />
      </div>
      <div className="login-right">
        <img
          src={logo} // đổi theo đường dẫn hình của bạn
          alt="Login Illustration"
          className="login-utezone-image"
        />
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Tên đăng nhập"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Mật khẩu"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit" disabled={isLoading} className="login-btn">
            {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
          {error && <div className="error-message">{error}</div>}
          <a></a>
          <div className="social-login">
            <GoogleLoginBtn />
          </div>
          <div className="login-links">
            <div className="forgot_password">
              <p className="qmk">
                <Link to="/forgot-password">Quên mật khẩu?</Link>
              </p>
            </div>
            <div className="btn_signup">
              <p>
                Chưa có tài khoản? <Link to="/signup">Đăng ký</Link>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;

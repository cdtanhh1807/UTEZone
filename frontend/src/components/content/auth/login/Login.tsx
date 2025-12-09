import { useState, type ChangeEvent, type FormEvent } from 'react'
import axiosInstance from '../../../../utils/AxiosInstance'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { isTokenExpired } from '../../../../utils/Auth'
import './Login.css';
import { GoogleLoginBtn } from '../google/GoogleLoginBtn';

type LoginForm = {
    username: string;
    password: string;
}

type LoginResponse = {
    access_token: string;
    token_type: string;
}

function Login() {
    const token = localStorage.getItem('token');
    if (token && !isTokenExpired(token)) {
        return <Navigate to="/" replace />;
    }

    const [formData, setFormData] = useState<LoginForm>({
        username: '',
        password: ''
    });

    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const navigate = useNavigate();

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const payload = new URLSearchParams();
        payload.append('username', formData.username);
        payload.append('password', formData.password);

        try {
            const response = await axiosInstance.post<LoginResponse>(
                '/account/login',
                payload,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const token = response.data.access_token;

            localStorage.setItem('token', token);

            navigate('/home');
        } catch (err: any) {
            if (err.response && err.response.status === 401) {
                setError('Sai tên đăng nhập hoặc mật khẩu');
            } else if (err.response) {
                setError(`Lỗi ${err.response.status}: ${err.response.data?.detail || 'Không rõ lỗi'}`);
            } else {
                setError('Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối hoặc backend.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-form">
            <h2>Đăng nhập</h2>
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
                    {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
                {error && <div className="error-message">{error}</div>}
                {/* <p>Chưa có tài khoản? <Link to="/signup">Đăng ký</Link></p> */}
                <div className="social-login">
                    <GoogleLoginBtn />
                </div>
                <div className="login-links">
                    <p><Link to="/forgot-password">Quên mật khẩu?</Link></p>
                    <p>Chưa có tài khoản? <Link to="/signup">Đăng ký</Link></p>
                </div>
            </form>
        </div>
    );
}

export default Login;

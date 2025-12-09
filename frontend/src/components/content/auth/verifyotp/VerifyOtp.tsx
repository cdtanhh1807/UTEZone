import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import axiosInstance from "../../../../utils/AxiosInstance";
import { isTokenExpired } from '../../../../utils/Auth'
import './VerifyOtp.css'

function VerifyOtp() {
    const token = localStorage.getItem('token');
    if (token && !isTokenExpired(token)) {
        return <Navigate to="/" replace />;
    }

    const location = useLocation();
    const navigate = useNavigate();

    const email = (location.state as { email: string })?.email; 
    const [otp, setOtp] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await axiosInstance.post<{ message: string }>(
                "/account/verify-otp/",
                { email, otp }
            );

            console.log(response.data.message);
            navigate("/login"); 

        } catch (err: any) {
            const msg = err.response?.data?.message || "OTP không đúng hoặc đã hết hạn.";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="verify-otp-form">
            <h2>Xác minh OTP</h2>
            <p>Chúng tôi đã gửi mã OTP tới email: <b>{email}</b></p>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Nhập OTP"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    required
                />
                <button type="submit" disabled={isLoading} className="verify-otp-btn">
                    {isLoading ? "Đang xác minh..." : "Xác minh"}
                </button>
                {error && <div className="error-message">{error}</div>}
            </form>
        </div>
    );
}

export default VerifyOtp;

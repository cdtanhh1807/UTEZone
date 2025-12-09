import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode"; 
import axiosInstance from "../../../../utils/AxiosInstance";
import AccountService from "../../../../services/AccountService";
import { useNavigate } from "react-router-dom";
import "./GoogleLoginBtn.css";

interface GoogleJwtPayload {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

export const GoogleLoginBtn = () => {
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse: any) => {
    try {
      console.log("Google credential response:", credentialResponse);

      const loginRes = await axiosInstance.post("/account/google-login", {
        token: credentialResponse.credential,
      });

      const token = loginRes.data.access_token;
      localStorage.setItem("token", token);

      const decoded: GoogleJwtPayload = jwtDecode(credentialResponse.credential);
      const email = decoded.email || decoded.sub;
      console.log("Using email for backend:", email);

      let accountData;
      try {
        accountData = await AccountService.get_account_info(email);
        console.log("Account data from backend:", accountData);
      } catch (err: any) {
        console.warn("Account not found, redirecting to complete-profile");
        navigate("/complete-profile");
        return;
      }

      if (accountData.fullName && accountData.fullName.trim() !== "") {
        navigate("/home");
      } else {
        localStorage.setItem("account", JSON.stringify(accountData));
        navigate("/complete-profile");
      }

    } catch (err) {
      console.error("Google login failed:", err);
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => console.log("Login Failed")}
    />
  );
};

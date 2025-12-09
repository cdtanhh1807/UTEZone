import React from "react";
import { useNavigate } from "react-router-dom";
import "./welcomePage.css";

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="welcome-container">
      {/* Header với nút Login / Sign Up */}
      <header className="welcome-header">
        <div className="logo">UTEzone</div>
        <div className="header-buttons">
          <button className="btn-login" onClick={() => navigate("/login")}>
            Login
          </button>
          <button className="btn-signup" onClick={() => navigate("/signup")}>
            Sign Up
          </button>
        </div>
      </header>

      {/* Phần nội dung chính */}
      <main className="welcome-main">
        <h1 className="welcome-title">Welcome to UTEzone</h1>
        <p className="welcome-subtitle">
          Connect with your peers, share knowledge, and explore the campus community.
        </p>
        <div className="welcome-actions">
          <button className="btn-primary" onClick={() => navigate("/signup")}>
            Get Started
          </button>
          <button className="btn-secondary" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>
      </main>
    </div>
  );
};

export default WelcomePage;

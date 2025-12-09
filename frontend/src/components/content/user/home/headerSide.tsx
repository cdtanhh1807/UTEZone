import './headerSide.css';
import logo from '../../../../assets/logo.png';
import { useState, useEffect } from "react";
import CachedIcon from '@mui/icons-material/Cached';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import { jwtDecode } from 'jwt-decode';
import AccountService from '../../../../services/AccountService';
import default_avatar from '../../../../assets/default_avatar.png';
import PermIdentityIcon from '@mui/icons-material/PermIdentity';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import NotificationModal from '../notification/notificationModal';


const HeaderSide = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [openNotification, setOpenNotification] = useState(false);

    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const token = localStorage.getItem("token");
    
    interface JwtPayload {
        sub: string;
        exp: number;
        role?: string;
    }
    useEffect(() => {
        if (token) {
            try {
                const decoded: JwtPayload = jwtDecode<JwtPayload>(token);
                setCurrentUserEmail(decoded.sub);

                AccountService.get_account_info(decoded.sub)
                    .then(data => setCurrentUser(data))
                    .catch(err => console.error(err));
            } catch (err) {
                console.error("Token không hợp lệ:", err);
            }
        }
    }, [token]);


    const navigate = useNavigate();

    const toggleMenu = () => setMenuOpen(!menuOpen);

    const handleLogout = () => {
        setIsLoggedIn(false);
        localStorage.removeItem("token");
        navigate("/login");
    };


    const goToProfile = (email: string) => {
        console.log("hhhh", email);
        navigate(`/profile/${email}`);
    };

    const handleSearch = () => {
        if (searchText.trim() !== "") {
            navigate(`/search?keyword=${encodeURIComponent(searchText)}`);
            setSearchText("");
        }
    };

    const onKeyEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    return (
        <div className="headerSide">
            <div className="header-left">
                <div className="logoPart">
                    <img className='logoImage' src={logo} alt="logo" />
                </div>
            </div>

            <div className="header-center">
                <div className="search-bar">
                    <SearchIcon className="search-icon" onClick={handleSearch} style={{cursor:"pointer"}} />
                    <input 
                        type="text" 
                        placeholder="Search"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={onKeyEnter}
                    />
                </div>
            </div>

            <div className="header-right">
                <div className="rightSide">
                    <div className="rightSide-postInfo" onClick={() => goToProfile(currentUserEmail || "")} style={{cursor: "pointer"}}>
                        <img
                            className="rightSide-postInfoImg"
                            src={currentUser?.avatar || {default_avatar}}
                            alt="avatar"
                        />
                        <div className="rightSide-postInfoName">{currentUser?.fullName}</div>
                    </div>
                    <div className="notification"  onClick={() => setOpenNotification(true)}>
                        <NotificationsNoneIcon/>
                    </div>
                    <div className="user-container">
                        <div className="user-icon" onClick={toggleMenu}>
                            <PermIdentityIcon/>
                        </div>

                        <div className={`user-menu ${menuOpen ? "show" : ""}`}>
                        {!isLoggedIn ? (
                            <>
                                <a href="/login">Đăng Nhập</a>
                                <a href="/signup">Đăng ký</a>
                            </>
                        ) : (
                            <>
                                <a href="/profile">Trang cá nhân</a>
                                <a href="#" className="logout" onClick={handleLogout}>Đăng xuất</a>
                            </>
                        )}
                        </div>
                    </div>
                </div>
            </div>
            <NotificationModal
                isOpen={openNotification}
                onClose={() => setOpenNotification(false)}
            />
        </div>
    );
};

export default HeaderSide;

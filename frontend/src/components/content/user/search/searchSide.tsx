import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { searchAPI } from "../../../../services/SearchService";

import "./searchSide.css";
import SearchPost from "./searchPost";
import SearchUser from "./searchUser";

const SearchSide = () => {
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const keyword = query.get("keyword") || "";

    const [tab, setTab] = useState<"posts" | "users">("posts");
    const [userResults, setUserResults] = useState<any[]>([]);
    const [postResults, setPostResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterDate, setFilterDate] = useState<"all" | "today" | "custom">("all");
    const [customDate, setCustomDate] = useState<string>(""); // YYYY-MM-DD


    useEffect(() => {
        if (!keyword) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                if (tab === "users") {
                    const res = await searchAPI.searchAccount(keyword);
                    setUserResults(res.account_list || []);
                } else if (tab === "posts") {
                    const res = await searchAPI.searchPost(keyword);
                    setPostResults(res.post_list || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [keyword, tab]);

    return (
        <div className="searchSide">
            <h2 className="search-title">
                Kết quả tìm kiếm cho: <span>"{keyword}"</span>
            </h2>

            {/* Tabs */}
            <div className="search-tabs">
                <button
                    className={tab === "posts" ? "active" : ""}
                    onClick={() => setTab("posts")}
                >
                    Bài đăng
                </button>
                <button
                    className={tab === "users" ? "active" : ""}
                    onClick={() => setTab("users")}
                >
                    Mọi người
                </button>
            </div>

            <div className="search-date-filter">
                <label>
                    <input
                    type="radio"
                    name="dateFilter"
                    value="all"
                    checked={filterDate === "all"}
                    onChange={() => setFilterDate("all")}
                    />
                    <span>Tất cả</span>
                </label>
                <label>
                    <input
                    type="radio"
                    name="dateFilter"
                    value="today"
                    checked={filterDate === "today"}
                    onChange={() => setFilterDate("today")}
                    />
                    <span>Hôm nay</span>
                </label>

                {/* Ô chọn ngày luôn hiển thị */}
                <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                    setCustomDate(e.target.value);
                    setFilterDate("custom");
                    }}
                    className={filterDate === "custom" ? "active" : ""}
                />
                </div>



            {/* Render nội dung */}
            <div className="search-content">
                {loading ? (
                    <p>Đang tải...</p>
                ) : tab === "posts" ? (
                    <SearchPost posts={postResults} />
                ) : (
                    <SearchUser users={userResults} />
                )}
            </div>
        </div>
    );
};

export default SearchSide;

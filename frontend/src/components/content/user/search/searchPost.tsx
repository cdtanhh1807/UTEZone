import React from "react";
import ListPost from "../profile/profilePost";

interface Props {
    posts: any[];
}

const SearchPost = ({ posts }: Props) => {
    if (!posts || posts.length === 0) {
        return <p>Không tìm thấy bài đăng</p>;
    }

    return (
        <div className="tab-content">
            {posts.map((post) => (
                <ListPost key={post._id} listPostSearch={[post]} />
            ))}
        </div>
    );
};

export default SearchPost;

import "./editPost.css";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef} from "react";
import { postAPI } from "../../../../services/PostService";
import FileService, { type UploadResponse } from "../../../../services/FileService";
import type { Post } from "../../../../types/Post";
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import PublicIcon from '@mui/icons-material/Public';
import SecurityIcon from '@mui/icons-material/Security';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import DepartmentMultiSelect from "./departmentSelect";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

interface EditPostProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  onPostUpdated?: () => void;
}

interface OldPreview {
  id: string;
  url: string;
}

const backdrop = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modal = { hidden: { opacity: 0, scale: 0.8, y: 50 }, visible: { opacity: 1, scale: 1, y: 0 } };

const EditPost = ({ isOpen, onClose, post, onPostUpdated }: EditPostProps) => {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [oldPreviews, setOldPreviews] = useState<OldPreview[]>([]); // ảnh cũ
  const [newFiles, setNewFiles] = useState<File[]>([]); // file mới
  const [newPreviews, setNewPreviews] = useState<string[]>([]); // preview file mới
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "follow" | "private">("public");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const visibilityText = {
    public: "Công khai",
    follow: "Người theo dõi",
    private: "Chỉ mình tôi"
  };
  const visibilityIcon = {
    public: <PublicIcon/>,
    follow: <BookmarkIcon/>,
    private: <SecurityIcon/>
  };

  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setContent(post.content || "");
      setOldPreviews((post.thumbnails_url || []).map((url, idx) => ({
        id: post.thumbnails?.[idx] || "",
        url
      })));
      setNewFiles([]);
      setNewPreviews([]);
      setCurrentIndex(0);
    } else {
      setTitle("");
      setContent("");
      setOldPreviews([]);
      setNewFiles([]);
      setNewPreviews([]);
      setCurrentIndex(0);
    }
  }, [post]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesSelected = Array.from(e.target.files || []);
    if (!filesSelected.length) return;

    const previewsSelected = filesSelected.map(f => URL.createObjectURL(f));
    setNewFiles(prev => [...prev, ...filesSelected]);
    setNewPreviews(prev => [...prev, ...previewsSelected]);
    setCurrentIndex(oldPreviews.length + newPreviews.length); // chọn ảnh đầu tiên mới thêm
  };

  const handleDelete = (idx: number) => {
    if (idx < oldPreviews.length) {
      setOldPreviews(prev => {
        const updated = prev.filter((_, i) => i !== idx);
        setCurrentIndex(prevIdx => Math.min(prevIdx, updated.length + newPreviews.length - 1));
        return updated;
      });
    } else {
      const newIdx = idx - oldPreviews.length;
      setNewFiles(prev => prev.filter((_, i) => i !== newIdx));
      setNewPreviews(prev => {
        const updated = prev.filter((_, i) => i !== newIdx);
        setCurrentIndex(prevIdx => Math.min(prevIdx, oldPreviews.length + updated.length - 1));
        return updated;
      });
    }
  };

  const handleUpdatePost = async () => {
    if (!post) return;
    if (!content.trim()) {
      alert("Nội dung không được để trống");
      return;
    }

    setLoading(true);
    try {
      const remainingOldIds = oldPreviews.map(p => p.id);

      let newFileIds: string[] = [];
      if (newFiles.length > 0) {
        const uploadResults: UploadResponse[] = await Promise.all(
          newFiles.map(f => FileService.uploadPicture(f))
        );
        newFileIds = uploadResults.map(r => r.file_id);
      }

      const allFileIds = [...remainingOldIds, ...newFileIds];

      await postAPI.updatePost(post._id, {
        title,
        content,
        thumbnails: allFileIds,
        visibility: visibility,
        category: selectedDepartments,
      });

      alert("Cập nhật bài viết thành công!");
      onClose();
      onPostUpdated?.();
    } catch (error) {
      console.error("❌ Lỗi:", error);
      alert("Đã xảy ra lỗi!");
    }
    setLoading(false);
  };

  const allPreviews = [...oldPreviews.map(p => p.url), ...newPreviews];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-backdrop"
          variants={backdrop}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            className="ep-modal-container"
            variants={modal}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* LEFT 70% */}
            <div className="edit-left">
              <div className="ed-carousel-container">
                {allPreviews[currentIndex]?.endsWith(".mp4") ? (
                  <video controls className="preview-video">
                    <source src={allPreviews[currentIndex]} type="video/mp4" />
                  </video>
                ) : (
                  <img src={allPreviews[currentIndex]} className="preview-image" />
                )}
                <div className="nav-left" onClick={() => setCurrentIndex((currentIndex - 1 + allPreviews.length) % allPreviews.length)}>‹</div>
                <div className="nav-right" onClick={() => setCurrentIndex((currentIndex + 1) % allPreviews.length)}>›</div>
              </div>

              <div className="thumbnail-bar">
                {allPreviews.map((url, idx) => (
                  <div key={idx} style={{ position: "relative" }}>
                    <img
                      src={url}
                      className={`thumbnail ${idx === currentIndex ? "active-thumb" : ""}`}
                      onClick={() => setCurrentIndex(idx)}
                    />
                    <span className="delete-thumb" onClick={() => handleDelete(idx)}>✕</span>
                  </div>
                ))}
                <label className="thumbnail add-thumb">
                  +
                  <input type="file" multiple onChange={handleUpload} />
                </label>
              </div>
            </div>

            {/* RIGHT 30% */}
            <div className="edit-right">
              <textarea
                className="ep-modal-textarea-title"
                placeholder="Tiêu đề"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <textarea
                className="ep-modal-textarea-content"
                placeholder="Nội dung"
                value={content}
                onChange={e => setContent(e.target.value)}
              />
              <div className="visibilitySelector" ref={menuRef}>
                    <span className="dots" onClick={() => setMenuOpen(prev => !prev)}>
                      {visibilityIcon[visibility]}{visibilityText[visibility]} <KeyboardArrowDownIcon/>
                    </span>
                    {menuOpen && (
                    <div className="visibilityMenu">
                      <div className={`visibilityItem ${visibility === "public" ? "active" : ""}`} onClick={() => setVisibility("public")}><PublicIcon/>Công khai</div>
                      <div className={`visibilityItem ${visibility === "follow" ? "active" : ""}`} onClick={() => setVisibility("follow")}><BookmarkIcon/>Người theo dõi</div>
                      <div className={`visibilityItem ${visibility === "private" ? "active" : ""}`} onClick={() => setVisibility("private")}><SecurityIcon/>Chỉ mình tôi</div>
                      </div>
                    )}
                  </div>
                  <div className="selectDepartment">
                    <DepartmentMultiSelect
                      selectedDepartments={selectedDepartments}
                      setSelectedDepartments={setSelectedDepartments}
                    />
                    {/* <p>Đã chọn: {selectedDepartments.join(", ") || "Chưa chọn"}</p> */}
              </div>
              <button className="edit-btn" onClick={handleUpdatePost} disabled={loading}>
                {loading ? "Đang cập nhật..." : "Cập nhật"}
              </button>
            </div>
          </motion.div>

        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditPost;

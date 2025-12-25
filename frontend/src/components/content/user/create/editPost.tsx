import "./editPost.css";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { postAPI } from "../../../../services/PostService";
import FileService, {
  type UploadResponse,
} from "../../../../services/FileService";
import type { Post } from "../../../../types/Post";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import PublicIcon from "@mui/icons-material/Public";
import SecurityIcon from "@mui/icons-material/Security";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import DepartmentMultiSelect from "./departmentSelect";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { ToastService } from "../../../../services/ToastService";

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
const modal = {
  hidden: { opacity: 0, scale: 0.8, y: 50 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

/* ================== FIX CỐT LÕI ================== */
/* Chuẩn hóa visibility từ DB -> FE */
const normalizeVisibility = (
  value?: string
): "public" | "follow" | "private" => {
  if (!value) return "public";

  const v = value.toLowerCase();

  if (v === "public") return "public";
  if (v === "follow" || v === "followers") return "follow";
  if (v === "private" || v === "only_me") return "private";

  return "public";
};
/* ================================================= */

const EditPost = ({ isOpen, onClose, post, onPostUpdated }: EditPostProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [oldPreviews, setOldPreviews] = useState<OldPreview[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState<
    "public" | "follow" | "private"
  >("public");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const visibilityText = {
    public: "Công khai",
    follow: "Người theo dõi",
    private: "Chỉ mình tôi",
  };

  const visibilityIcon = {
    public: <PublicIcon />,
    follow: <BookmarkIcon />,
    private: <SecurityIcon />,
  };

  /* ================== FIX QUAN TRỌNG ================== */
  useEffect(() => {
    if (!post) return;

    setTitle(post.title || "");
    setContent(post.content || "");

    setOldPreviews(
      (post.thumbnails_url || []).map((url, idx) => ({
        id: post.thumbnails?.[idx] || "",
        url,
      }))
    );

    setNewFiles([]);
    setNewPreviews([]);
    setCurrentIndex(0);

    // ✅ SYNC ĐÚNG VISIBILITY TỪ DB
    setVisibility(normalizeVisibility(post.visibility));

    setSelectedDepartments(post.category || []);
  }, [post]);
  /* =================================================== */

  const allPreviews = useMemo(
    () => [...oldPreviews.map((p) => p.url), ...newPreviews],
    [oldPreviews, newPreviews]
  );

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesSelected = Array.from(e.target.files || []);
    if (!filesSelected.length) return;

    const previewsSelected = filesSelected.map((f) =>
      URL.createObjectURL(f)
    );

    setNewFiles((prev) => [...prev, ...filesSelected]);
    setNewPreviews((prev) => {
      const updated = [...prev, ...previewsSelected];
      setCurrentIndex(oldPreviews.length + updated.length - 1);
      return updated;
    });
  };

  const handleDelete = (idx: number) => {
    if (idx < oldPreviews.length) {
      setOldPreviews((prev) => {
        const updated = prev.filter((_, i) => i !== idx);
        setCurrentIndex((i) => Math.max(0, i - 1));
        return updated;
      });
    } else {
      const newIdx = idx - oldPreviews.length;
      setNewFiles((prev) => prev.filter((_, i) => i !== newIdx));
      setNewPreviews((prev) => prev.filter((_, i) => i !== newIdx));
      setCurrentIndex((i) => Math.max(0, i - 1));
    }
  };

  const handleUpdatePost = async () => {
    if (!post) return;

    if (!content.trim()) {
      ToastService.warning("Nội dung không được để trống");
      return;
    }

    setLoading(true);
    try {
      const remainingOldIds = oldPreviews
        .map((p) => p.id)
        .filter(Boolean);

      let newFileIds: string[] = [];
      if (newFiles.length) {
        const uploadResults: UploadResponse[] = await Promise.all(
          newFiles.map((f) => FileService.uploadPicture(f))
        );
        newFileIds = uploadResults.map((r) => r.file_id);
      }

      await postAPI.updatePost(post._id, {
        title,
        content,
        thumbnails: [...remainingOldIds, ...newFileIds],
        visibility, // ✅ ĐÃ ĐÚNG
        category: selectedDepartments,
      });

      ToastService.success("Cập nhật bài viết thành công!");
      onClose();
      onPostUpdated?.();
    } catch (err) {
      console.error(err);
      ToastService.error("Đã xảy ra lỗi khi cập nhật bài viết.");
    }
    setLoading(false);
  };

  if (!isOpen || !post) return null;

  return createPortal(
    <AnimatePresence>
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
          onClick={(e) => e.stopPropagation()}
        >
          {/* LEFT */}
          <div className="edit-left">
            <div className="ed-carousel-container">
              {allPreviews[currentIndex]?.endsWith(".mp4") ? (
                <video controls className="preview-video">
                  <source src={allPreviews[currentIndex]} />
                </video>
              ) : (
                <img
                  src={allPreviews[currentIndex]}
                  className="preview-image"
                />
              )}
              {currentIndex > 0 && (
                <ChevronLeftOutlinedIcon
                  className="nav-left"
                  onClick={() => setCurrentIndex((i) => i - 1)}
                />
              )}
              {currentIndex < allPreviews.length - 1 && (
                <ChevronRightOutlinedIcon
                  className="nav-right"
                  onClick={() => setCurrentIndex((i) => i + 1)}
                />
              )}
            </div>

            <div className="thumbnail-bar">
              {allPreviews.map((url, idx) => (
                <div key={idx} style={{ position: "relative" }}>
                  <img
                    src={url}
                    className={`thumbnail ${
                      idx === currentIndex ? "active-thumb" : ""
                    }`}
                    onClick={() => setCurrentIndex(idx)}
                  />
                  <span
                    className="delete-thumb"
                    onClick={() => handleDelete(idx)}
                  >
                    ✕
                  </span>
                </div>
              ))}
              <label className="thumbnail add-thumb">
                +
                <input type="file" multiple onChange={handleUpload} />
              </label>
            </div>
          </div>

          {/* RIGHT */}
          <div className="edit-right">
            <textarea
              className="ep-modal-textarea-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề"
            />
            <textarea
              className="ep-modal-textarea-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nội dung"
            />

            <div className="visibilitySelector">
              <span
                className="dots"
                onClick={() => setMenuOpen((p) => !p)}
              >
                {visibilityIcon[visibility]} {visibilityText[visibility]}
                <KeyboardArrowDownIcon />
              </span>

              {menuOpen && (
                <div className="visibilityMenu">
                  {(["public", "follow", "private"] as const).map(
                    (v) => (
                      <div
                        key={v}
                        className={`visibilityItem ${
                          visibility === v ? "active" : ""
                        }`}
                        onClick={() => {
                          setVisibility(v);
                          setMenuOpen(false);
                        }}
                      >
                        {visibilityIcon[v]} {visibilityText[v]}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <DepartmentMultiSelect
              selectedDepartments={selectedDepartments}
              setSelectedDepartments={setSelectedDepartments}
            />

            <button
              className="edit-btn"
              onClick={handleUpdatePost}
              disabled={loading}
            >
              {loading ? "Đang cập nhật..." : "Cập nhật"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default EditPost;

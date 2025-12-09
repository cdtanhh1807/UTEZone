import "./createPost.css";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { postAPI } from "../../../../services/PostService";
import FileService, { type UploadResponse } from "../../../../services/FileService";
import type { Post } from "../../../../types/Post";
import FilterOutlinedIcon from '@mui/icons-material/FilterOutlined';
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import { jwtDecode } from 'jwt-decode';
import AccountService from "../../../../services/AccountService";
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PublicIcon from '@mui/icons-material/Public';
import SecurityIcon from '@mui/icons-material/Security';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import DepartmentMultiSelect from "./departmentSelect";

interface CreatePostProps {
  isOpen: boolean;
  onClose: () => void;
  editingPost?: Post | null;
  onPostSaved?: () => void;
}

const backdrop = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modal = { hidden: { opacity: 0, scale: 0.8, y: 50 }, visible: { opacity: 1, scale: 1, y: 0 } };

const CreatePost = ({ isOpen, onClose, editingPost, onPostSaved }: CreatePostProps) => {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0); // 0: icon step, 1: upload, 2: layout, 3: content
  const [content, setContent] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [layout, setLayout] = useState<"overlay" | "grid">("overlay");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "follow" | "private">("public");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);


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
    const token = localStorage.getItem("token");
    let currentUserEmail: string | null = null;

    if (token) {
      try {
        interface JwtPayload { 
          sub: string; 
          exp: number; 
        }

        const decoded: JwtPayload = jwtDecode<JwtPayload>(token);
        console.log("decoded token:", decoded);
        currentUserEmail = decoded.sub;

        AccountService.get_account_info(currentUserEmail)
          .then((data) => {
            setCurrentUser(data);
          })
          .catch((err) => {
            console.error("❌ Lỗi khi lấy user info:", err);
          });

      } catch (err) {
        console.error("❌ Token không hợp lệ:", err);
      }
    }
  }, []);
  
   useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  useEffect(() => {
    if (editingPost) {
      setContent(editingPost.content || "");
      setPreviews(editingPost.thumbnails_url || []);
      setFiles([]);
      setCurrentIndex(0);
    } else {
      setContent("");
      setPreviews([]);
      setFiles([]);
      setCurrentIndex(0);
    }
    setStep(0);
  }, [editingPost]);


  const isVideo = (url: string) => {
    return url.startsWith("blob:") 
      ? false 
      : /\.(mp4|mov|mkv|avi|webm)$/i.test(url);
  };


  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;
    setFiles(prev => [...prev, ...selectedFiles]);
    const newPreviews = selectedFiles.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
    setCurrentIndex(previews.length);
    if(step === 0) setStep(1);
  };

  const handlePost = async () => {
    setLoading(true);
    try {
      let fileIds: string[] = editingPost?.thumbnails || [];
      if (files.length > 0) {
        const uploadResults: UploadResponse[] = await Promise.all(files.map(f => FileService.uploadPicture(f)));
        fileIds = uploadResults.map(res => res.file_id);
      }
      if (!title.trim() && !content.trim() && fileIds.length === 0) {
        alert("Vui lòng điền tiêu đề, nội dung hoặc chọn ít nhất 1 file");
        setLoading(false);
        return;
      }
      if (editingPost) {
        await postAPI.updatePost(editingPost._id, { content, thumbnails: fileIds, layout, category: selectedDepartments });
        alert("Cập nhật bài viết thành công!");
      } else {
        await postAPI.addPost({
          title,
          content,
          postType: "short",
          visibility,
          status: "active",
          pollData: null,
          thumbnails: fileIds,
          layout,
          category: selectedDepartments,
        });
        alert("Đăng bài thành công!");
      }
      setContent("");
      setFiles([]);
      setPreviews([]);
      setCurrentIndex(0);
      setStep(0);
      setLayout("overlay");
      onClose();
      onPostSaved?.();
    } catch (error) {
      console.error("❌ Lỗi:", error);
      alert("Đã xảy ra lỗi!");
    }
    setLoading(false);
  };


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
            className="cp-modal-container"
            variants={modal}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={e => e.stopPropagation()}
            style={{
              width: step >= 2 ? 1100 : 850,
              transition: "width 0.35s ease",
            }}
          >

            {step >= 0 && (
              <div className="step-nav">
                {step >= 0 && (
                  <button
                    className="next-step"
                    onClick={() =>
                      setStep(prev => Math.max(0, prev - 1) as 0 | 1 | 2 | 3)
                    }
                  >
                    <span>
                      {step === 0 ? "" : <ArrowBackIosIcon />} 
                    </span>
                  </button>
                )}

                <h4>Tạo bài viết</h4>

                {step < 2 ? (
                  <button className="next-step"
                    onClick={() => setStep(prev => Math.min(3, prev + 1) as 0 | 1 | 2 | 3)}
                    disabled={previews.length === 0}
                  >
                    <span><ArrowForwardIosIcon/></span>
                  </button>
                ) : (
                  <button className="cp-post-btn" onClick={handlePost} disabled={loading}>
                    <span>{loading ? "Đang đăng..." : "Đăng"}</span>
                  </button>
                )}
              </div>
            )}



            {/* Step 0: icon */}
            {step === 0 && (
              <div className="step-icon">
                <FilterOutlinedIcon style={{ fontSize: 100 }} />
                <label className="upload-center">
                  Chọn ảnh hoặc video
                  <input type="file" accept="image/*,video/*,audio/mpeg" multiple onChange={handleUpload} />
                </label>
              </div>
            )}

            {/* Step 1: upload */}
            {step === 1 && (
              <div className="cp-preview-wrapper">
                <div className="cp-carousel-container">
                  {files[currentIndex] ? (
                    files[currentIndex].type.startsWith("video/") ? (
                      <video controls className="preview-video">
                        <source src={URL.createObjectURL(files[currentIndex])} />
                      </video>
                    ) : (
                      <img src={URL.createObjectURL(files[currentIndex])} className="preview-image" />
                    )
                  ) : (
                    isVideo(previews[currentIndex]) ? (
                      <video controls className="preview-video">
                        <source src={previews[currentIndex]} />
                      </video>
                    ) : (
                      <img src={previews[currentIndex]} className="preview-image" />
                    )
                  )}

                  <ChevronLeftOutlinedIcon className="nav-left" onClick={() => setCurrentIndex((currentIndex - 1 + previews.length) % previews.length)}/>
                  <ChevronRightOutlinedIcon className="nav-right" onClick={() => setCurrentIndex((currentIndex + 1) % previews.length)}/>


                </div>
                
                <div className="cp-thumbnail-bar">
                  {previews.map((url, idx) => (
                    <div key={idx} className="thumb-wrapper">

                      <img
                        src={files[idx] ? URL.createObjectURL(files[idx]) : url}
                        alt="thumb"
                        className={`thumbnail ${idx === currentIndex ? "active-thumb" : ""}`}
                        onClick={() => setCurrentIndex(idx)}
                      />

                      {/* Nút xoá */}
                      <span
                        className="delete-thumb"
                        onClick={(e) => {
                          e.stopPropagation();

                          setFiles(prev => prev.filter((_, i) => i !== idx));
                          setPreviews(prev => prev.filter((_, i) => i !== idx));

                          setCurrentIndex(prev =>
                            prev > idx ? prev - 1 : Math.min(prev, previews.length - 2)
                          );
                        }}
                      >
                        ✕
                      </span>

                    </div>
                  ))}

                  {/* Thumbnail + để upload thêm */}
                  <label className="thumbnail add-thumb">
                    +
                    <input type="file" accept="image/*,video/*" multiple onChange={handleUpload} />
                  </label>
                </div>

              </div>
            )}

            {step === 2 && (
              <div className="compose-layout">

                {/* LEFT: IMAGE SLIDER */}
                <div className="compose-left">

                  <div className="compose-slider">
                    {isVideo(previews[currentIndex]) ? (
                      <video controls className="compose-media">
                        <source src={previews[currentIndex]} />
                      </video>
                    ) : (
                      <img src={previews[currentIndex]} className="compose-media" />
                    )}

                    {/* NEXT / PREV */}
                    {currentIndex > 0 && (
                      <ChevronLeftOutlinedIcon
                        className="compose-nav-left"
                        onClick={() => setCurrentIndex(prev => prev - 1)}
                      />
                    )}

                    {currentIndex < previews.length - 1 && (
                      <ChevronRightOutlinedIcon
                        className="compose-nav-right"
                        onClick={() => setCurrentIndex(prev => prev + 1)}
                      />
                    )}
                  </div>
                </div>

                {/* RIGHT: INFO + CONTENT */}
                <div className="compose-right">

                  <div className="compose-postInfo">
                    <img
                      className="compose-avatar"
                      src={currentUser?.avatar}
                    />
                    <div className="compose-user">
                      <div className="compose-name">{currentUser?.fullName}</div>
                    </div>
                  </div>

                  <textarea
                    className="compose-title"
                    placeholder="Tiêu đề"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />

                  <textarea
                    className="compose-content"
                    placeholder="Bạn đang nghĩ gì?"
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

                </div>
              </div>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreatePost;

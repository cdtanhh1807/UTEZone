import React, { useState, useRef, useEffect } from "react";
import "./createStory.css";
import { motion, AnimatePresence } from "framer-motion";
import { StoryService } from "../../../../services/StoryService";
import FileService from "../../../../services/FileService";
import MusicTrimBar from "./MusicTrimBar";

interface CreateStoryProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
}

interface TextLayer {
  id: string;
  text: string;
  x: number; // % theo khung video
  y: number; // % theo khung video
  color: string;
  fontSize: number;
}

export default function CreateStory({ isOpen, onClose, currentUser }: CreateStoryProps) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [fileId, setFileId] = useState<string>("");

  /** VIDEO TRIM DATA */
  const [videoStartAt, setVideoStartAt] = useState(0);
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoTotal, setVideoTotal] = useState(0);

  /** ÂM THANH GỐC VIDEO */
  const [useOriginalSound, setUseOriginalSound] = useState(true);

  /** MUSIC DATA */
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicName, setMusicName] = useState("");
  const [musicStartAt, setMusicStartAt] = useState(0);
  const [musicDuration, setMusicDuration] = useState(15);
  const [musicTotal, setMusicTotal] = useState(0);
  const [musicFileId, setMusicFileId] = useState("");

  /** TEXT LAYERS */
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);

  /** UI overlay */
  const [showMusicTrim, setShowMusicTrim] = useState(false);

  const videoRefStep1 = useRef<HTMLVideoElement | null>(null);
  const videoRefStep2 = useRef<HTMLVideoElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  // STEP 0 — chọn media
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);

    if (f.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.src = url;
      v.onloadedmetadata = () => {
        setVideoTotal(v.duration);
        setVideoDuration(Math.min(5, v.duration));
      };
    }

    const res = await FileService.uploadPicture(f);
    setFileId(res.file_id);

    if (f.type.startsWith("video/")) setStep(1);
    else setStep(2);
  };

  /** STEP 1: video trim change */
  const handleVideoTrimChange = (start: number, len: number) => {
    setVideoStartAt(start);
    setVideoDuration(len);
  };

  /** STEP 1 → NEXT STEP 2 */
  const handleVideoTrimNext = () => setStep(2);

  /** Music upload */
  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setMusicFile(f);
    setMusicName(f.name.replace(/\.[^/.]+$/, ""));

    const audioURL = URL.createObjectURL(f);
    const audio = new Audio(audioURL);
    musicRef.current = audio;

    audio.onloadedmetadata = () => {
      setMusicTotal(audio.duration);
      setMusicDuration(Math.min(15, audio.duration));
      audio.currentTime = musicStartAt;
      audio.play();
    };

    const res = await FileService.uploadPicture(f);
    setMusicFileId(res.file_id);

    setShowMusicTrim(true);
  };

  /** STEP 1 video loop */
  useEffect(() => {
    if (!videoRefStep1.current || step !== 1) return;
    const vid = videoRefStep1.current;
    vid.currentTime = videoStartAt;

    const checkLoop = () => {
      if (vid.currentTime >= videoStartAt + videoDuration) {
        vid.currentTime = videoStartAt;
        vid.play();
      }
    };

    vid.addEventListener("timeupdate", checkLoop);
    return () => vid.removeEventListener("timeupdate", checkLoop);
  }, [videoStartAt, videoDuration, step]);

  /** STEP 2 video loop */
  useEffect(() => {
    if (!videoRefStep2.current || step !== 2) return;
    const vid = videoRefStep2.current;
    vid.currentTime = videoStartAt;

    const checkLoop = () => {
      if (vid.currentTime >= videoStartAt + videoDuration) {
        vid.currentTime = videoStartAt;
        vid.play();
      }
    };

    vid.addEventListener("timeupdate", checkLoop);
    vid.play();

    return () => vid.removeEventListener("timeupdate", checkLoop);
  }, [videoStartAt, videoDuration, step]);

  /** STEP 2 music loop */
  useEffect(() => {
    if (!musicRef.current || step !== 2) return;
    const audio = musicRef.current;
    audio.currentTime = musicStartAt;

    const checkLoop = () => {
      if (audio.currentTime >= musicStartAt + musicDuration) {
        audio.currentTime = musicStartAt;
        audio.play();
      }
    };

    audio.addEventListener("timeupdate", checkLoop);
    audio.play();

    return () => audio.removeEventListener("timeupdate", checkLoop);
  }, [step, musicStartAt, musicDuration]);

  /** Bật/tắt âm thanh gốc video */
  useEffect(() => {
    const vid1 = videoRefStep1.current;
    const vid2 = videoRefStep2.current;
    if (vid1) {
      vid1.muted = !useOriginalSound;
      vid1.volume = useOriginalSound ? 1 : 0;
    }
    if (vid2) {
      vid2.muted = !useOriginalSound;
      vid2.volume = useOriginalSound ? 1 : 0;
    }
  }, [useOriginalSound]);

  /** TEXT LAYER DRAG */
  const startDrag = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    setActiveTextId(id);
    const rect = e.currentTarget.parentElement!.getBoundingClientRect();

    const onMouseMove = (ev: MouseEvent) => {
      const x = ((ev.clientX - rect.left) / rect.width) * 100;
      const y = ((ev.clientY - rect.top) / rect.height) * 100;

      setTextLayers((prev) =>
        prev.map((layer) =>
          layer.id === id
            ? { ...layer, x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) }
            : layer
        )
      );
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  /** Thêm text mới */
  const addNewTextLayer = () => {
    const id = Date.now().toString();
    setTextLayers([
      ...textLayers,
      { id, text: "Nhập ", x: 50, y: 50, color: "#ffffff", fontSize: 24 },
    ]);
    setActiveTextId(id);
  };

  /** Đăng story */
  const handlePost = async () => {
    if (!currentUser) return;

    const payload = {
      createdBy: currentUser,
      createdAt: new Date().toISOString(),
      mediaType: file?.type.startsWith("image/") ? "image" : "video",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      mediaUrls: [fileId],
      thumbnails: [fileId],
      textLayers: textLayers.map(t => ({
        text: t.text,
        x: t.x,
        y: t.y,
        color: t.color,
        fontSize: t.fontSize
      })),
      videoTrim: file?.type.startsWith("video/")
        ? {
            startAt: videoStartAt,
            duration: videoDuration,
            hasOriginalSound: useOriginalSound,
          }
        : undefined,
      music: musicFileId
        ? {
            name: musicName,
            fileid: musicFileId,
            startAt: musicStartAt,
            duration: musicDuration,
          }
        : undefined,
      status: "active",
      viewedBy: [],
    };

    await StoryService.addStory(payload);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="story-backdrop" onClick={onClose}>
          <motion.div className="story-modal" onClick={(e) => e.stopPropagation()}>
            {/* STEP 0 */}
            {step === 0 && (
              <div className="story-upload-step">
                <h2>Chọn ảnh hoặc video</h2>
                <label className="story-upload-box">
                  Chọn file
                  <input type="file" accept="image/*,video/*" onChange={handleMediaUpload} />
                </label>
              </div>
            )}

            {/* STEP 1 */}
            {step === 1 && file?.type.startsWith("video/") && (
              <div className="story-upload-step">
                <h2>Chọn đoạn video</h2>
                <div className="editor-preview">
                  <video
                    ref={videoRefStep1}
                    src={preview}
                    autoPlay
                    loop
                    className="video-preview"
                  />
                </div>
                <MusicTrimBar
                  duration={videoTotal}
                  startAt={videoStartAt}
                  length={videoDuration}
                  onChange={handleVideoTrimChange}
                />
                <button className="next-step-btn" onClick={handleVideoTrimNext}>
                  Tiếp tục
                </button>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="story-editor-full">
                <div className="editor-preview" style={{ position: "relative" }}>
                  {file?.type.startsWith("image/") && <img src={preview} />}
                  {file?.type.startsWith("video/") && (
                    <video
                      ref={videoRefStep2}
                      src={preview}
                      autoPlay
                      loop
                      className="video-preview"
                    />
                  )}

                  {/* TEXT LAYERS */}
                  {textLayers.map((layer) => (
                    <div
                      key={layer.id}
                      className="text-layer"
                      style={{
                        position: "absolute",
                        top: `${layer.y}%`,
                        left: `${layer.x}%`,
                        color: layer.color,
                        fontSize: layer.fontSize,
                        cursor: "move",
                        userSelect: "none",
                      }}
                      onMouseDown={(e) => startDrag(e, layer.id)}
                      onClick={() => setActiveTextId(layer.id)}
                    >
                      {layer.text}
                    </div>
                  ))}
                </div>

                {/* EDIT TOOLS */}
                <div className="editor-tools">
                  <button onClick={() => setShowMusicTrim(true)} className="tool-btn">🎵</button>
                  {file?.type.startsWith("video/") && (
                    <button
                      onClick={() => setUseOriginalSound((p) => !p)}
                      className="tool-btn"
                    >
                      {useOriginalSound ? "🔊" : "🔇"}
                    </button>
                  )}
                  <button onClick={addNewTextLayer} className="tool-btn">🅰️</button>
                </div>

                {/* TEXT EDIT PANEL */}
                {/* TEXT EDIT PANEL */}
                {activeTextId && (
                  <div className="text-edit-panel">
                    {/* Input chữ */}
                    <input
                      type="text"
                      value={textLayers.find(t => t.id === activeTextId)?.text || ""}
                      onChange={(e) =>
                        setTextLayers(prev =>
                          prev.map(t =>
                            t.id === activeTextId ? { ...t, text: e.target.value } : t
                          )
                        )
                      }
                      placeholder="Nhập chữ..."
                    />

                    {/* Vòng tròn chọn màu */}
                    <input
                      type="color"
                      id="hidden-color-input"
                      className="hidden-color-input"
                      value={textLayers.find(t => t.id === activeTextId)?.color || "#ffffff"}
                      onChange={(e) =>
                        setTextLayers(prev =>
                          prev.map(t =>
                            t.id === activeTextId ? { ...t, color: e.target.value } : t
                          )
                        )
                      }
                    />
                    <div
                      className="color-circle"
                      onClick={() =>
                        document.getElementById("hidden-color-input")?.click()
                      }
                    >
                      <div
                        className="color-circle-inner"
                        style={{
                          backgroundColor:
                            textLayers.find(t => t.id === activeTextId)?.color || "#ffffff",
                        }}
                      />
                    </div>

                    {/* Font size slider */}
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={textLayers.find(t => t.id === activeTextId)?.fontSize || 24}
                      onChange={(e) =>
                        setTextLayers(prev =>
                          prev.map(t =>
                            t.id === activeTextId
                              ? { ...t, fontSize: parseInt(e.target.value) }
                              : t
                          )
                        )
                      }
                    />
                  </div>
                )}



                <button className="post-btn-fixed" onClick={handlePost}>
                  Đăng tin
                </button>
              </div>
            )}

            {/* Overlay Trim Nhạc */}
            {showMusicTrim && (
              <div className="overlay-trim">
                {!musicFile && (
                  <label className="music-upload-box">
                    Chọn nhạc từ máy
                    <input type="file" accept="audio/*" onChange={handleMusicUpload} />
                  </label>
                )}
                {musicFile && (
                  <div className="trim-panel">
                    <h3>Chọn đoạn nhạc</h3>
                    <MusicTrimBar
                      duration={musicTotal}
                      startAt={musicStartAt}
                      length={musicDuration}
                      onChange={(s, l) => {
                        setMusicStartAt(s);
                        setMusicDuration(l);
                        if (musicRef.current) {
                          musicRef.current.currentTime = s;
                          musicRef.current.play();
                        }
                      }}
                    />
                    <button className="close-trim" onClick={() => setShowMusicTrim(false)}>
                      Xong
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

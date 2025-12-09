import React, { useState, useEffect, useRef } from "react";
import type { Story } from "../../../../types/Story";
import type { UserInfo } from "../../../../types/Account";
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import "./storyModal.css";
import { jwtDecode } from 'jwt-decode';

interface UserStory {
  userId: string;
  stories: Story[];
}

interface StoryModalProps {
  storys: UserStory[];
  userInfoMap: Record<string, UserInfo>;
  isOpen: boolean;
  onClose: () => void;
  startUserId: string;
}

const StoryModal: React.FC<StoryModalProps> = ({
  storys,
  userInfoMap,
  isOpen,
  onClose,
  startUserId,
}) => {

  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(1);

  const token = localStorage.getItem("token");
  let currentUserEmail: string | null = null;

  if (token) {
    try {
      interface JwtPayload {
        sub: string;
        exp: number;
      }
      const decoded: JwtPayload = jwtDecode<JwtPayload>(token);
      currentUserEmail = decoded.sub;
    } catch (err) {
      console.error("❌ Token không hợp lệ:", err);
    }
  }
  



  useEffect(() => {
    if (!storys || storys.length === 0) return;
    const startIndex = storys.findIndex((u) => u.userId === startUserId);
    setCurrentUserIndex(startIndex >= 0 ? startIndex : 0);
    setCurrentStoryIndex(0);
  }, [storys, startUserId]);

  if (!isOpen || storys.length === 0) return null;

  const currentUserStory = storys[currentUserIndex];
  const currentStory = currentUserStory.stories[currentStoryIndex];
  const userInfo = userInfoMap[currentUserStory.userId];

  const mediaSrc =
    currentStory.mediaUrls?.[0] ||
    currentStory.thumbnails?.[0] ||
    "";

  // ================================================================
  //  1) LOAD VIDEO (LOOP TRONG TRIM, KHÔNG QUA STORY KHÁC)
  // ================================================================
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    vid.pause();

    if (currentStory.mediaType === "video") {
      vid.src = mediaSrc;
      vid.muted = currentStory.videoTrim?.hasOriginalSound === false;

      const trim = currentStory.videoTrim;

      vid.onloadedmetadata = () => {
        const start = trim?.startAt ?? 0;
        vid.currentTime = start;

        vid.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));

        if (trim?.duration) {
          const end = start + trim.duration;

          const check = () => {
            if (vid.currentTime >= end) {
              vid.currentTime = start;   // LOOP
              vid.play();
            }
          };
          vid.addEventListener("timeupdate", check);
          return () => vid.removeEventListener("timeupdate", check);
        }
      };
    }

    return () => vid.pause();
  }, [
    currentUserIndex,
    currentStoryIndex,
    currentStory.mediaUrls,
  ]);

  // ================================================================
  //  2) LOAD MUSIC (LOOP THEO TRIM, KHÔNG AUTO STOP)
  // ================================================================
  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;

    audio.pause();
    const music = currentStory.music;
    if (!music || !music.fileid) return;

    audio.src = music.url || music.fileid;

    audio.onloadedmetadata = () => {
      const start = music.startAt ?? 0;
      audio.currentTime = start;
      audio.play().catch(() => { });

      if (music.duration) {
        const end = start + music.duration;

        const check = () => {
          if (audio.currentTime >= end) {
            audio.currentTime = start;  // LOOP MUSIC
            audio.play();
          }
        };
        audio.addEventListener("timeupdate", check);
        return () => audio.removeEventListener("timeupdate", check);
      }
    };

    return () => audio.pause();
  }, [
    currentUserIndex,
    currentStoryIndex,
    currentStory.music?.fileid,
  ]);

  // ================================================================
  //  3) VOLUME EFFECT (KHÔNG RESET VIDEO)
  // ================================================================
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
    if (musicRef.current) musicRef.current.volume = volume;
  }, [volume]);

  // ================================================================
  //  4) CONTROLS GỘP
  // ================================================================
  const togglePlay = () => {
    const vid = videoRef.current;
    const audio = musicRef.current;

    if (isPlaying) {
      vid?.pause();
      audio?.pause();
      setIsPlaying(false);
    } else {
      vid?.play();
      audio?.play();
      setIsPlaying(true);
    }
  };

  const toggleVolume = () => {
    const newVol = volume === 0 ? 1 : 0;
    setVolume(newVol);
  };
  const handleNext = () => {
    if (currentStoryIndex < currentUserStory.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      const nextUser = (currentUserIndex + 1) % storys.length;
      setCurrentUserIndex(nextUser);
      setCurrentStoryIndex(0);
    }
  };

  const handlePrev = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else {
      const prevUser = (currentUserIndex - 1 + storys.length) % storys.length;
      setCurrentUserIndex(prevUser);
      setCurrentStoryIndex(storys[prevUser].stories.length - 1);
    }
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleDeleteStory = () => {
    // TODO: gọi API xóa story
    alert("Xóa story!");
    setIsMenuOpen(false);
  };

  const handleReportStory = () => {
    // TODO: gọi API báo cáo story
    alert("Báo cáo story!");
    setIsMenuOpen(false);
  };


  return (
    <div className="storyModalOverlay">
      <button className="closeBtn" onClick={onClose}>✖</button>
      <div className="storyModalContent">

        <div className="storyHeader">
          <img className="avatar" src={userInfo?.avatar || ""} />
          <span className="username">{userInfo?.fullName}</span>

          <div className="musicControls">
            <button className="str-pause-btn" onClick={togglePlay}>
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </button>

            <button onClick={toggleVolume}>
              {volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
            </button>
            <div className="storyMenuWrapper" style={{ position: "relative", display: "inline-block" }}>
              <button className="storyMenuBtn" onClick={() => setIsMenuOpen(prev => !prev)}>⋮</button>
              {isMenuOpen && (
                <div className="storyMenuDropdown">
                  {currentUserEmail === currentUserStory.userId ? (
                    <button onClick={handleDeleteStory}>Xóa</button>
                  ) : (
                    <button onClick={handleReportStory}>Báo cáo</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="storyMedia">
          {currentStory.mediaType === "image" ? (
            <img src={mediaSrc} alt="" />
          ) : (
            <video ref={videoRef} />
          )}

          {currentStory.textLayers?.map((layer, idx) => (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                transform: `translate(-50%, -50%) scale(${layer.scale ?? 1}) rotate(${layer.rotate ?? 0}deg)`,
                color: layer.color,
                fontFamily: layer.font || "Arial",
                fontSize: layer.fontSize,
                backgroundColor: layer.background || "transparent",
                whiteSpace: "pre-wrap",
              }}
            >
              {layer.text}
            </div>
          ))}
        </div>

        <div className="storyControls">
          <button onClick={handlePrev}>◀</button>
          <button onClick={handleNext}>▶</button>
        </div>

        <audio ref={musicRef} hidden />
      </div>
    </div>
  );
};

export default StoryModal;

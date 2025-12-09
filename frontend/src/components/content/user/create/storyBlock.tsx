import React, { useEffect, useState, useRef } from "react";
import "../home/middleSide.css";
import type { Story } from "../../../../types/Story";
import AccountService from "../../../../services/AccountService";
import type { UserInfo } from "../../../../types/Account";
import { StoryService } from "../../../../services/StoryService";
import StoryModal from "../home/storyModal";

const StoryBlock: React.FC = () => {
    const [userInfoMap, setUserInfoMap] = useState<Record<string, UserInfo>>({});
    const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
    const [storyStartUserId, setStoryStartUserId] = useState<string | null>(null);
    interface UserStory {
        userId: string;
        stories: Story[];
    }
  const [storys, setStorys] = useState<UserStory[]>([]);

  const fetchStorys = async () => {
    try {
      const res = await StoryService.getTodayStories();
      console.log(res);
      setStorys(res.data);
    } catch (err) {
      console.error("❌ Lỗi fetch stories:", err);
    }
  };

  useEffect(() => {
    fetchStorys();
  }, []);


  useEffect(() => {
    if (!storys.length) return;

    const fetchAllUserInfoFromStories = async () => {
      const emailsSet = new Set<string>();
      storys.forEach((userStory) => {
        emailsSet.add(userStory.userId);

        userStory.stories.forEach((story) => {
          emailsSet.add(story.createdBy);
          story.viewedBy.forEach((email) => emailsSet.add(email));
        });
      });

      const emails = Array.from(emailsSet);

      const results = await Promise.all(
        emails.map(async (email) => {
          try {
            const res = await AccountService.get_account_info(email);
            return [email, res] as [string, UserInfo];
          } catch (err) {
            console.error("❌ Lỗi lấy user info:", email, err);
            return [email, null] as [string, UserInfo | null];
          }
        })
      );

      const userMap: Record<string, UserInfo> = {};
      results.forEach(([email, info]) => {
        if (info) userMap[email] = info;
      });

      setUserInfoMap(userMap);
    };

    fetchAllUserInfoFromStories();
  }, [storys]);




  return (
    <div className="storyBlock">
        {!storys || storys.length === 0 ? (
          <p></p>
        ) : (
          storys.map((u) => (
            <div className="storyPaticular" key={u.userId}>
              <div
                className="imageDIv"
                onClick={() => {
                  setStoryStartUserId(u.userId);
                  setIsStoryModalOpen(true);
                }}
              >
                <img
                  className="statusImg"
                  src={userInfoMap[u.userId]?.avatar || ""}
                  alt={u.userId}
                />
              </div>
              <div className="profileName">
                @{userInfoMap[u.userId]?.fullName || u.userId}
              </div>
            </div>
          ))
        )}



        {isStoryModalOpen && storyStartUserId && (
            <StoryModal
            storys={storys}
            userInfoMap={userInfoMap}
            isOpen={isStoryModalOpen}
            onClose={() => setIsStoryModalOpen(false)}
            startUserId={storyStartUserId}
            />
        )}
    </div>
      
  );
};

export default StoryBlock;

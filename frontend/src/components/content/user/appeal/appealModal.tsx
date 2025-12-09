import React, { useState } from "react";
import "./appealModal.css";
import { complaintAPI } from "../../../../services/ComplaintService";

interface AppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: {
    content?: string | null;
    policyName?: string | null;
    contentAnnounce?: string | null;
    contentId?: string | null;
    contentParentId?: string | null;
    policyId?: string | null;
    typeContent?: string | null;
  } | null;
  onSubmit?: (appealText: string) => void; // optional
}

const AppealModal: React.FC<AppealModalProps> = ({
  isOpen,
  onClose,
  reportData,
  onSubmit,
}) => {
  const [appealText, setAppealText] = useState("");

  if (!isOpen || !reportData) return null;

  const handleSend = async () => {
    if (!appealText.trim()) {
      alert("Vui lòng nhập nội dung khiếu nại!");
      return;
    }

    const payload = {
  policyId: reportData.policyId || "",
  typeContent: reportData.typeContent || "",
  contentId: reportData.contentId || "",
  contentParentId: reportData.contentParentId || "",
  content: reportData.content || "",
  description: appealText.trim(),
};


    try {
      await complaintAPI.addComplaint(payload);
      alert("Gửi khiếu nại thành công!");

      onSubmit && onSubmit(appealText); // nếu bạn còn muốn callback cũ

      setAppealText("");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Gửi khiếu nại thất bại!");
    }
  };

  return (
    <div className="appealContainer" onClick={onClose}>
      <div className="appealModal" onClick={(e) => e.stopPropagation()}>
        <h3>Khiếu nại quyết định</h3>

        <div className="appealInfo">
          <p><strong>Nội dung bị gỡ:</strong> {reportData.content}</p>
          <p><strong>Chính sách vi phạm:</strong> {reportData.policyName}</p>
        </div>

        <textarea
          placeholder="Nhập lý do bạn muốn khiếu nại..."
          value={appealText}
          onChange={(e) => setAppealText(e.target.value)}
        />

        <div className="appealActions">
          <button className="btn-cancel" onClick={onClose}>Hủy</button>
          <button className="btn-submit" onClick={handleSend}>Gửi khiếu nại</button>
        </div>
      </div>
    </div>
  );
};

export default AppealModal;

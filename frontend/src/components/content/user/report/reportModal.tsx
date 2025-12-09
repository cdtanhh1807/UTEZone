// ReportModal.tsx
import React, { useState, useEffect } from "react";
import "./reportModal.css";
import { motion, AnimatePresence } from "framer-motion";
import { reportAPI } from "../../../../services/ReportService";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: any | null;
  type: "post" | "account" | "comment";
  violatorEmail?: string;
  content: string;
  contentId?: string;
  contentParentId?: string;
}

interface Policy {
  _id: string;
  name: string;
  description: string;
}

const policyViolations: Record<string, string[]> = {
  "Bảo mật tài khoản": [
    "Sử dụng mật khẩu yếu hoặc chia sẻ mật khẩu",
    "Truy cập trái phép vào tài khoản người khác",
    "Cố gắng vượt qua xác thực hai yếu tố",
    "Hành vi đăng nhập bất thường",
    "Tấn công kỹ thuật (phishing, brute-force...)",
  ],
  "Nội dung bài đăng": [
    "Đăng nội dung bạo lực hoặc ghê rợn",
    "Nội dung thù hận, phân biệt đối xử",
    "Đăng thông tin sai lệch hoặc tin giả",
    "Vi phạm pháp luật (ma túy, vũ khí...)",
    "Quấy rối hoặc spam",
  ],
  "Nội dung bình luận": [
    "Bình luận xúc phạm hoặc công kích cá nhân",
    "Bình luận kích động hoặc phân biệt đối xử",
    "Spam bình luận hoặc lặp lại nội dung",
  ],
  "Nội dung tin nhắn": [
    "Gửi tin nhắn quấy rối hoặc lăng mạ",
    "Tin nhắn lừa đảo hoặc chiếm đoạt thông tin",
    "Tin nhắn đe dọa, khuyến khích bạo lực",
    "Spam hoặc quảng cáo không được phép",
  ],
  "Điều khoản sử dụng": [
    "Vi phạm luật pháp hoặc điều khoản nền tảng",
    "Xâm phạm quyền sở hữu trí tuệ",
    "Sử dụng dịch vụ trái mục đích",
    "Gian lận hoặc lừa đảo",
  ],
};

const backdrop = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modal = {
  hidden: { opacity: 0, y: -50, scale: 0.9 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

const ReportModal = ({
  isOpen,
  onClose,
  type,
  violatorEmail,
  content,
  contentId,
  contentParentId,
}: ReportModalProps) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      reportAPI.getAllAnnounce().then((data) => {
        setPolicies(
          data.policy_list.map((p: any) => ({
            _id: p._id,
            name: p.name,
            description: p.description,
          }))
        );
      });
    }
  }, [isOpen]);

  const handleNext = () => {
    if (selectedPolicy) setStep(2);
  };

  const handleSubmit = () => {
    const description = selectedAction || customReason;

    const payload = {
      violatorEmail: violatorEmail,
      annunciatorEmail: "currentUser@example.com",
      typeContent: type,
      contentId,
      contentParentId,
      content,
      description,
      reportedAt: new Date(),
      check: false,
    };

    reportAPI.sendReport(payload).then(() => {
      alert("Báo cáo đã được gửi thành công!");
      setStep(1);
      setSelectedPolicy(null);
      setSelectedAction("");
      setCustomReason("");
      onClose();
    });
  };

  const violations = selectedPolicy
    ? policyViolations[selectedPolicy] || []
    : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="rp-modal-backdrop"
          variants={backdrop}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            className="report-modal-container"
            variants={modal}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Gửi báo cáo</h2>
            <p>
              Bạn đang báo cáo {type}: <b>{content}</b>
            </p>

            {step === 1 && (
              <>
                <p>Tố cáo hành vi vi phạm về:</p>
                <div className="report-policies">
                  {policies.map((policy) => (
                    <div key={policy._id} className="policy-item">
                      <label className="policy-header">
                        <input
                          type="radio"
                          name="policy"
                          value={policy.name}
                          checked={selectedPolicy === policy.name}
                          onChange={() => setSelectedPolicy(policy.name)}
                        />
                        <b>{policy.name}</b>
                      </label>

                      <div className="policy-description">
                        {policy.description}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="modal-footer">
                  <button className="cancel-btn" onClick={onClose}>
                    Hủy
                  </button>
                  <button
                    className="submit-btn"
                    disabled={!selectedPolicy}
                    onClick={handleNext}
                  >
                    Tiếp
                  </button>
                </div>
              </>
            )}

            {step === 2 && selectedPolicy && (
              <>
                <p>Chọn hành vi vi phạm hoặc nhập mô tả khác:</p>
                <div className="report-actions">
                  {violations.map((v) => (
                    <label key={v}>
                      <input
                        type="radio"
                        name="action"
                        value={v}
                        checked={selectedAction === v}
                        onChange={() => setSelectedAction(v)}
                      />
                      {v}
                    </label>
                  ))}
                  <div className="custom-reason">
                    <input
                      type="text"
                      placeholder="Mô tả khác..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="cancel-btn" onClick={onClose}>
                    Hủy
                  </button>
                  <button
                    className="submit-btn"
                    disabled={!selectedAction && !customReason}
                    onClick={handleSubmit}
                  >
                    Gửi báo cáo
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReportModal;

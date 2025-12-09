import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AccountService from "../../../../services/AccountService";
import type { UserInfo, Account } from "../../../../types/Account";
import "./completeProfile.css";

interface CompleteProfileProps {
  onDone?: () => void;
}

const CompleteProfile = ({ onDone }: CompleteProfileProps) => {
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    const accData = localStorage.getItem("account");
    if (accData) {
      setAccount(JSON.parse(accData));
    }
  }, []);

  const initialInfo: Partial<UserInfo> = account?.userInfo || {};

  const [formData, setFormData] = useState<Partial<UserInfo>>({
    fullName: initialInfo.fullName || "",
    phone: initialInfo.phone || "",
    address: initialInfo.address || "",
    day_of_birth: initialInfo.day_of_birth || "",
    description: initialInfo.description || "",
    department: initialInfo.department || "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const handleSubmit = async () => {
    const requiredFields: (keyof UserInfo)[] = [
      "fullName",
      "phone",
      "address",
      "day_of_birth",
      "department",
      "description",
    ];

    for (let field of requiredFields) {
      if (!formData[field] || formData[field]?.toString().trim() === "") {
        setMsg(`Vui lòng nhập ${field.replace("_", " ")}!`);
        return;
      }
    }

    setLoading(true);
    setMsg(null);

    try {
      await AccountService.updateProfile(formData);
      setMsg("Cập nhật hồ sơ thành công!");
      if (onDone) onDone();
      setTimeout(() => {
        navigate("/home");
      }, 1200);
    } catch (err) {
      console.error(err);
      setMsg("Có lỗi xảy ra. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-container">
      <h2 className="cp-title">Hoàn thiện thông tin cá nhân</h2>

      <div className="cp-form">
        <label>Họ và tên *</label>
        <input
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Nhập họ và tên"
        />

        <label>Số điện thoại *</label>
        <input
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="0987654321"
        />

        <label>Địa chỉ *</label>
        <input
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Nhập địa chỉ"
        />

        <label>Ngày sinh *</label>
        <input
          type="date"
          name="day_of_birth"
          value={formData.day_of_birth || ""}
          onChange={handleChange}
        />

        <label>Phòng ban *</label>
        <select
          name="department"
          value={formData.department}
          onChange={handleChange}
        >
          <option value="">-- Chọn phòng ban --</option>
          <option value="CHÍNH TRỊ LUẬT">CHÍNH TRỊ LUẬT</option>
          <option value="CƠ KHÍ CHẾ TẠO MÁY">CƠ KHÍ CHẾ TẠO MÁY</option>
          <option value="CƠ KHÍ ĐỘNG LỰC">CƠ KHÍ ĐỘNG LỰC</option>
          <option value="CÔNG NGHỆ HÓA HỌC VÀ THỰC PHẨM">CÔNG NGHỆ HÓA HỌC VÀ THỰC PHẨM</option>
          <option value="CÔNG NGHỆ THÔNG TIN">CÔNG NGHỆ THÔNG TIN</option>
          <option value="ĐIỆN - ĐIỆN TỬ">ĐIỆN - ĐIỆN TỬ</option>
          <option value="IN VÀ TRUYỀN THÔNG">IN VÀ TRUYỀN THÔNG</option>
          <option value="KHOA HỌC ỨNG DỤNG">KHOA HỌC ỨNG DỤNG</option>
          <option value="KINH TẾ">KINH TẾ</option>
          <option value="NGOẠI NGỮ">NGOẠI NGỮ</option>
          <option value="THỜI TRANG VÀ DU LỊCH">THỜI TRANG VÀ DU LỊCH</option>
          <option value="XÂY DỰNG">XÂY DỰNG</option>
          <option value="VIỆN SƯ PHẠM KỸ THUẬT">VIỆN SƯ PHẠM KỸ THUẬT</option>
        </select>


        <label>Giới thiệu bản thân *</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Mô tả ngắn gọn..."
        />
      </div>

      {msg && <p className="cp-message">{msg}</p>}

      <button className="cp-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? "Đang lưu..." : "Lưu thông tin"}
      </button>
    </div>
  );
};

export default CompleteProfile;

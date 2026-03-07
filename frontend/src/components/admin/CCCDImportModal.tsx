import { useState, useRef } from 'react';
import { X, Upload, Camera, Info } from 'lucide-react';
import './CCCDImportModal.css';

export default function CCCDImportModal({ isOpen, onClose, onSubmit, studentData = null }) {
    const [formData, setFormData] = useState({
        ho_ten: studentData?.ho_ten_full || '',
        ngay_sinh: studentData?.ngay_sinh || '',
        cccd: studentData?.cccd || '',
        dan_toc: studentData?.dan_toc || 'Kinh',
        noi_sinh_type: 'trong_nuoc',
        noi_sinh: studentData?.noi_sinh || '',
        gioi_tinh: studentData?.gioi_tinh || 'Nữ',
        sdt: studentData?.sdt || '',
        email: studentData?.email || '',
        workplace: studentData?.workplace || '',
        commit_accuracy: false,
        commit_usage: false,
    });

    const [previews, setPreviews] = useState({
        cccd_front: null,
        cccd_back: null,
        photo_3x4: null,
    });

    const [modalType, setModalType] = useState(null);

    const fileInputs = {
        cccd_front: useRef(null),
        cccd_back: useRef(null),
        photo_3x4: useRef(null),
    };

    const handleFileChange = (type, e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('File quá lớn. Vui lòng chọn file dưới 5MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviews(prev => ({ ...prev, [type]: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.commit_accuracy || !formData.commit_usage) {
            alert('Vui lòng xác nhận các cam kết');
            return;
        }
        if (!previews.cccd_front) {
            alert('Vui lòng tải lên ảnh CCCD mặt trước');
            return;
        }
        onSubmit?.({ ...formData, ...previews });
    };

    const getCurrentDate = () => {
        const now = new Date();
        const day = now.getDate();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        return `Hà Nội, ngày ${day < 10 ? '0' + day : day} tháng ${month < 10 ? '0' + month : month} năm ${year}`;
    };

    const InstructionModal = ({ type }) => {
        if (!type) return null;

        const content = {
            cccd_front: {
                title: "QUY ĐỊNH VỀ ẢNH mặt trước CMND/CCCD/Hộ chiếu",
                rules: [
                    "1. Ảnh mặt trước của CMND/CCCD",
                    "2. Upload Ảnh mặt trước của CMND/CCCD hoặc ảnh Hộ chiếu theo đúng số đã nhập tại mục số 3 trong Phiếu đăng ký;",
                    "3. Đảm bảo giấy tờ chụp đủ thông tin;",
                    "4. Ảnh chụp rõ nét, không bị mờ lóa;",
                    "5. Ảnh chụp không bị xoay, không bị mất góc.",
                ],
                img: "https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/cccd_front.jpg"
            },
            cccd_back: {
                title: "QUY ĐỊNH VỀ ẢNH mặt sau CMND/CCCD",
                rules: [
                    "1. Ảnh mặt sau của CMND/CCCD",
                    "2. Nếu sử dụng Hộ chiếu trong mục số 3 không cần tải ảnh mục này;",
                    "3. Đảm bảo giấy tờ chụp đủ thông tin;",
                    "4. Ảnh chụp rõ nét, không bị mờ lóa;",
                    "5. Ảnh chụp không bị xoay, không bị mất góc.",
                ],
                img: "https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/cccd_back.jpg"
            },
            photo_3x4: {
                title: "QUY ĐỊNH VỀ ẢNH THẺ 3X4",
                rules: [
                    "1. Kích thước ảnh: 3x4 cm (chuẩn Việt Nam)",
                    "2. Phông nền màu TRẮNG, chụp trong 6 tháng gần nhất",
                    "3. Trang phục: Áo có cổ (sơ mi, vest) lịch sự",
                    "4. Không đeo kính màu, tai và trán phải lộ rõ.",
                ],
                img: "https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/photo_3x4.jpg"
            }
        };

        const active = content[type];

        return (
            <div className="instruction-modal-overlay" onClick={() => setModalType(null)}>
                <div className="instruction-modal-content" onClick={e => e.stopPropagation()}>
                    <div className="instruction-modal-header">
                        <Info size={20} color="#f97316" />
                        <h3>{active.title}</h3>
                    </div>
                    <div className="instruction-modal-body">
                        <div className="instruction-image">
                            <img
                                src={active.img}
                                alt="Hướng dẫn"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "https://via.placeholder.com/400x250?text=Huong+Dan";
                                }}
                            />
                        </div>
                        <div className="instruction-rules">
                            {active.rules.map((rule, i) => (
                                <p key={i}>{rule}</p>
                            ))}
                        </div>
                    </div>
                    <button className="instruction-close-btn" onClick={() => setModalType(null)}>
                        ✓ Tôi đã hiểu
                    </button>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="cccd-modal-overlay" onClick={onClose}>
            <div className="cccd-modal-container" onClick={e => e.stopPropagation()}>
                {/* Close button */}
                <button className="cccd-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                {/* A4 Form Container */}
                <div className="a4-form-container">
                    {/* Header */}
                    <div className="a4-header">
                        <div className="header-left">
                            <p className="org-name">CÔNG TY TNHH TƯ VẤN GIÁO DỤC</p>
                            <p className="org-name-bold">VÂN TRANG EDUCATION</p>
                            <div className="header-line"></div>
                        </div>
                        <div className="header-right">
                            <p className="nation-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                            <p className="nation-subtitle">Độc lập – Tự do – Hạnh phúc</p>
                            <div className="header-line-center"></div>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="a4-title">
                        <h1>PHIẾU ĐĂNG KÝ THÔNG TIN HỌC VIÊN</h1>
                        <p className="a4-subtitle">HỆ THỐNG THU THẬP HỒ SƠ TRỰC TUYẾN</p>
                    </div>

                    {/* Photo 3x4 box */}
                    <div className="photo-3x4-box">
                        <div
                            className={`photo-upload-area ${previews.photo_3x4 ? 'has-image' : ''}`}
                            onClick={() => fileInputs.photo_3x4.current.click()}
                        >
                            {previews.photo_3x4 ? (
                                <img src={previews.photo_3x4} alt="Ảnh thẻ" />
                            ) : (
                                <>
                                    <Camera size={24} color="#d4a574" />
                                    <span>+</span>
                                </>
                            )}
                            <input
                                type="file"
                                hidden
                                ref={fileInputs.photo_3x4}
                                onChange={(e) => handleFileChange('photo_3x4', e)}
                                accept="image/*"
                            />
                        </div>
                        <p className="photo-hint">
                            Ảnh chụp chân dung thí sinh dự thi (kích thước 3*4cm, chụp trong vòng 6 tháng)
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Section I: Personal Info */}
                        <div className="a4-section">
                            <h2 className="section-title">I. Thông tin thí sinh</h2>

                            <div className="form-row">
                                <label>1. Họ và tên:</label>
                                <input
                                    type="text"
                                    className="dotted-input full"
                                    value={formData.ho_ten}
                                    onChange={e => setFormData({ ...formData, ho_ten: e.target.value })}
                                    placeholder="............................."
                                />
                            </div>
                            <p className="form-hint">Ghi chú: Vui lòng nhập đầy đủ Họ và tên có dấu.</p>

                            <div className="form-row">
                                <label>2. Ngày sinh:</label>
                                <input
                                    type="text"
                                    className="dotted-input"
                                    value={formData.ngay_sinh}
                                    onChange={e => setFormData({ ...formData, ngay_sinh: e.target.value })}
                                    placeholder="DD/MM/YYYY"
                                    style={{ color: '#dc2626' }}
                                />
                            </div>

                            <div className="form-row">
                                <label>3. CMND/CCCD/Hộ chiếu hoặc Mã sinh viên (với SV Trường ĐH Hà Nội):</label>
                            </div>
                            <div className="form-row">
                                <input
                                    type="text"
                                    className="bordered-input full"
                                    value={formData.cccd}
                                    onChange={e => setFormData({ ...formData, cccd: e.target.value })}
                                    placeholder="Vui lòng chọn"
                                />
                            </div>

                            <div className="form-row">
                                <label>4. Dân tộc:</label>
                                <select
                                    className="bordered-input"
                                    value={formData.dan_toc}
                                    onChange={e => setFormData({ ...formData, dan_toc: e.target.value })}
                                >
                                    <option value="Kinh">Kinh</option>
                                    <option value="Tày">Tày</option>
                                    <option value="Thái">Thái</option>
                                    <option value="Mường">Mường</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>
                            <p className="form-hint">Ghi chú: Chọn Không (for-Non Vietnamese) nếu là người nước ngoài</p>

                            <div className="form-row">
                                <label>5. Nơi sinh:</label>
                                <div className="radio-group">
                                    <label className="radio-label">
                                        <input
                                            type="radio"
                                            name="noi_sinh_type"
                                            value="trong_nuoc"
                                            checked={formData.noi_sinh_type === 'trong_nuoc'}
                                            onChange={e => setFormData({ ...formData, noi_sinh_type: e.target.value })}
                                        />
                                        <span className="radio-text">Trong nước</span>
                                    </label>
                                    <label className="radio-label">
                                        <input
                                            type="radio"
                                            name="noi_sinh_type"
                                            value="nuoc_ngoai"
                                            checked={formData.noi_sinh_type === 'nuoc_ngoai'}
                                            onChange={e => setFormData({ ...formData, noi_sinh_type: e.target.value })}
                                        />
                                        <span className="radio-text">Nước ngoài</span>
                                    </label>
                                </div>
                            </div>
                            <div className="form-row">
                                <select
                                    className="bordered-input full"
                                    value={formData.noi_sinh}
                                    onChange={e => setFormData({ ...formData, noi_sinh: e.target.value })}
                                >
                                    <option value="">Vui lòng chọn</option>
                                    <option value="Hà Nội">Hà Nội</option>
                                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                                    <option value="Đà Nẵng">Đà Nẵng</option>
                                    <option value="Hải Phòng">Hải Phòng</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>
                            <p className="form-hint">Ghi chú: Ghi theo VNeID cấp độ 2</p>

                            <div className="form-row">
                                <label>6. Giới tính:</label>
                                <select
                                    className="bordered-input small"
                                    value={formData.gioi_tinh}
                                    onChange={e => setFormData({ ...formData, gioi_tinh: e.target.value })}
                                >
                                    <option value="Nam">Nam</option>
                                    <option value="Nữ">Nữ</option>
                                </select>
                            </div>

                            <div className="form-row">
                                <label>7. Số điện thoại:</label>
                                <input
                                    type="text"
                                    className="dotted-input"
                                    value={formData.sdt}
                                    onChange={e => setFormData({ ...formData, sdt: e.target.value })}
                                    placeholder="............................."
                                />
                            </div>

                            <div className="form-row">
                                <label>8. Email:</label>
                                <input
                                    type="email"
                                    className="dotted-input"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="............................."
                                />
                            </div>

                            <div className="form-row">
                                <label>9. Đơn vị công tác:</label>
                                <input
                                    type="text"
                                    className="dotted-input full"
                                    value={formData.workplace}
                                    onChange={e => setFormData({ ...formData, workplace: e.target.value })}
                                    placeholder="............................."
                                />
                            </div>
                        </div>

                        {/* Upload CCCD Section */}
                        <div className="a4-section upload-section">
                            <div className="upload-grid">
                                {/* CCCD Front */}
                                <div className="upload-card">
                                    <p className="upload-label">Ảnh mặt TRƯỚC thẻ CCCD - Ảnh Hộ chiếu</p>
                                    <div
                                        className={`upload-area ${previews.cccd_front ? 'has-image' : ''}`}
                                        onClick={() => fileInputs.cccd_front.current.click()}
                                    >
                                        {previews.cccd_front ? (
                                            <img src={previews.cccd_front} alt="CCCD Front" />
                                        ) : (
                                            <div className="upload-placeholder">
                                                <Upload size={32} color="#d4a574" />
                                                <span>+</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            hidden
                                            ref={fileInputs.cccd_front}
                                            onChange={(e) => handleFileChange('cccd_front', e)}
                                            accept="image/*"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="view-rules-btn"
                                        onClick={() => setModalType('cccd_front')}
                                    >
                                        Xem quy định
                                    </button>
                                </div>

                                {/* CCCD Back */}
                                <div className="upload-card">
                                    <p className="upload-label">Ảnh mặt SAU thẻ CCCD</p>
                                    <div
                                        className={`upload-area ${previews.cccd_back ? 'has-image' : ''}`}
                                        onClick={() => fileInputs.cccd_back.current.click()}
                                    >
                                        {previews.cccd_back ? (
                                            <img src={previews.cccd_back} alt="CCCD Back" />
                                        ) : (
                                            <div className="upload-placeholder">
                                                <Upload size={32} color="#d4a574" />
                                                <span>+</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            hidden
                                            ref={fileInputs.cccd_back}
                                            onChange={(e) => handleFileChange('cccd_back', e)}
                                            accept="image/*"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="view-rules-btn"
                                        onClick={() => setModalType('cccd_back')}
                                    >
                                        Xem quy định
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Commitments */}
                        <div className="a4-section commitments-section">
                            <label className="checkbox-row">
                                <input
                                    type="checkbox"
                                    checked={formData.commit_accuracy}
                                    onChange={e => setFormData({ ...formData, commit_accuracy: e.target.checked })}
                                />
                                <span>Tôi cam đoan và hoàn toàn chịu trách nhiệm về sự chính xác của ảnh và thông tin đã cung cấp trong Phiếu đăng ký thi năng lực ngoại ngữ.</span>
                            </label>
                            <label className="checkbox-row">
                                <input
                                    type="checkbox"
                                    checked={formData.commit_usage}
                                    onChange={e => setFormData({ ...formData, commit_usage: e.target.checked })}
                                />
                                <span>Tôi đồng ý việc Trường Đại học Hà Nội sử dụng các thông tin cá nhân này vào mục đích phục vụ các công tác liên quan đến kỳ thi.</span>
                            </label>
                        </div>

                        {/* Signature */}
                        <div className="a4-section signature-section">
                            <p className="signature-date">{getCurrentDate()}</p>
                            <p className="signature-title">Người đăng ký</p>
                            <p className="signature-hint">(Ký và ghi rõ họ tên)</p>
                        </div>

                        {/* Notes */}
                        <div className="a4-section notes-section">
                            <p className="notes-title">Ghi chú:</p>
                            <p className="note-item">1. Thí sinh chỉ đủ điều kiện dự thi khi đã điền đầy đủ thông tin trên Phiếu đăng ký và chuyển khoản Phí dịch vụ khảo thi thành công.</p>
                            <p className="note-item">2. Thí sinh phải ký xác nhận thông tin vào <strong>"Phiếu đăng ký"</strong> (được phát tại phòng thi) khi đến dự thi.</p>
                            <p className="note-item">3. Thời gian, địa điểm và danh sách thí sinh đủ điều kiện dự thi sẽ được công bố vào lúc 17 giờ 00 ngày 28/01/2026, tại mục Thông báo trên trang web https://tec.hanu.vn.</p>
                        </div>

                        {/* Contact & Submit */}
                        <div className="a4-footer">
                            <div className="contact-info">
                                <p><strong>Liên hệ:</strong></p>
                                <p>Hotline: 094.123.3003</p>
                                <p>Email: contact@vantrangedu.edu.vn</p>
                                <p>Website: https://vantrangedu.edu.vn</p>
                            </div>
                            <div className="footer-right">
                                <p>Hà Nội, ngày..........tháng..........năm 2026</p>
                                <p className="center-name">Trung tâm Khảo thi</p>
                            </div>
                        </div>

                        <div className="submit-container">
                            <button type="submit" className="submit-btn">
                                ← Gửi đăng ký
                            </button>
                        </div>
                    </form>
                </div>

                <InstructionModal type={modalType} />
            </div>
        </div>
    );
}

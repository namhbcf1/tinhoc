import React, { useState } from 'react';
import { parseVStepExcel, generateVStepTemplate } from '../../../utils/excelParser';
import api from '../../../services/api';
import { Upload, FileSpreadsheet, Check, AlertCircle, Music, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ExcelImportStats = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Excel, 2: Media, 3: Review
    const [parsedData, setParsedData] = useState(null);
    const [mediaNeeded, setMediaNeeded] = useState([]); // List of filenames from Excel that need upload
    const [mediaMap, setMediaMap] = useState({}); // filename -> R2 URL
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Step 1: Handle Excel Upload
    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const data = await parseVStepExcel(file);
            console.log("Parsed Data:", data);

            // Analyze for Media Requirements
            const needed = new Set();
            data.sections.forEach(sec => {
                if (sec.groups) {
                    sec.groups.forEach(g => {
                        if (g.temp_media_filename) needed.add(g.temp_media_filename);
                    });
                }
                // Also check questions if they eventually support media
            });

            setParsedData(data);
            setMediaNeeded(Array.from(needed));

            if (needed.size > 0) {
                setStep(2);
            } else {
                setStep(3);
            }
        } catch (error) {
            alert("Lỗi đọc file Excel: " + error.message);
        }
    };

    // Step 2: Handle Media Upload
    const handleMediaUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        const newMap = { ...mediaMap };

        for (const file of files) {
            if (mediaNeeded.includes(file.name)) {
                try {
                    // Upload to R2 via API
                    // Note: We reuse api.uploadDocument or similar
                    // Assuming api.uploadDocument returns { url: ... } or we use a specific endpoint
                    const res = await api.uploadDocument('SYSTEM', 'Media Import', file.name, file);
                    if (res && (res.url || res.data?.url || res.r2_key)) {
                        newMap[file.name] = res.url || res.data?.url || res.r2_key; // Adjust based on API response
                    }
                } catch (err) {
                    console.error(`Failed to upload ${file.name}`, err);
                }
            }
        }

        setMediaMap(newMap);
        setUploading(false);
    };

    // Step 3: Final Submit
    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // Inject R2 URLs back into JSON
            const finalData = JSON.parse(JSON.stringify(parsedData)); // Deep clone

            finalData.sections.forEach(sec => {
                if (sec.groups) {
                    sec.groups.forEach(g => {
                        if (g.temp_media_filename) {
                            g.audio_url = mediaMap[g.temp_media_filename] || null;
                            // Clean up temp field if backend doesn't want it (schema doesn't have it, verify vstep-queries)
                            // vstep-queries uses `audio_url`
                        }
                    });
                }
            });

            // Send to Backend
            const res = await api.request('/vstep/import', {
                method: 'POST',
                body: JSON.stringify(finalData),
                tokenType: 'admin'
            });

            if (res.success) {
                alert("Import thành công!");
                navigate('/admin/vstep');
            } else {
                throw new Error(res.error || "Unknown Error");
            }
        } catch (error) {
            alert("Lỗi Import: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">Import Đề Thi VSTEP</h1>
                <div className="flex items-center gap-2 mt-4 text-sm font-medium text-slate-500">
                    <div className={`px-3 py-1 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>1. Upload Excel</div>
                    <div className="w-8 h-0.5 bg-slate-200"></div>
                    <div className={`px-3 py-1 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>2. Upload Media</div>
                    <div className="w-8 h-0.5 bg-slate-200"></div>
                    <div className={`px-3 py-1 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>3. Review</div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                {step === 1 && (
                    <div className="text-center">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileSpreadsheet size={40} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Tải file Excel mẫu</h2>
                        <p className="text-slate-500 mb-6 max-w-md mx-auto">
                            Sử dụng file template chuẩn để đảm bảo dữ liệu được import chính xác.
                        </p>

                        <div className="flex justify-center gap-4 mb-8">
                            <button
                                onClick={generateVStepTemplate}
                                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                            >
                                Tải Template Mẫu
                            </button>
                            <label className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm">
                                Chọn File Excel
                                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload} />
                            </label>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Music size={24} className="text-blue-600" />
                            Mapping File Âm thanh/Hình ảnh
                        </h2>
                        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-6 text-sm">
                            <p className="font-bold mb-1">Hệ thống phát hiện {mediaNeeded.length} file cần upload:</p>
                            <p>Vui lòng chọn tất cả các file tương ứng từ máy tính của bạn. Hệ thống sẽ tự động khớp tên file.</p>
                        </div>

                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center mb-6 hover:bg-slate-50 transition-colors">
                            <input
                                type="file"
                                multiple
                                accept="audio/*,image/*"
                                onChange={handleMediaUpload}
                                className="hidden"
                                id="media-upload"
                            />
                            <label htmlFor="media-upload" className="cursor-pointer flex flex-col items-center">
                                <Upload size={40} className="text-slate-400 mb-2" />
                                <span className="font-medium text-slate-600">Click để chọn hoặc kéo thả files vào đây</span>
                                <span className="text-sm text-slate-400 mt-1">Hỗ trợ MP3, JPG, PNG...</span>
                            </label>
                        </div>

                        <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                            {mediaNeeded.map(filename => (
                                <div key={filename} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        {mediaMap[filename] ? (
                                            <Check size={18} className="text-green-500" />
                                        ) : (
                                            <AlertCircle size={18} className="text-orange-500" />
                                        )}
                                        <span className="font-mono text-sm text-slate-700">{filename}</span>
                                    </div>
                                    <div className="text-xs">
                                        {mediaMap[filename] ? (
                                            <span className="text-green-600 font-medium">Đã khớp</span>
                                        ) : (
                                            <span className="text-orange-600">Chưa có file</span>
                                        )}
                                        {uploading && !mediaMap[filename] && <Loader2 size={12} className="animate-spin inline ml-2" />}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setStep(3)}
                            disabled={uploading}
                            className={`w-full py-3 rounded-xl font-bold text-white transition-colors ${Object.keys(mediaMap).length === mediaNeeded.length
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-slate-400 hover:bg-slate-500'
                                }`}
                        >
                            {Object.keys(mediaMap).length === mediaNeeded.length ? 'Tiếp tục' : 'Bỏ qua các file thiếu và Tiếp tục'}
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="text-center">
                        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={40} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Sẵn sàng Import</h2>
                        <div className="bg-slate-50 p-4 rounded-xl text-left max-w-md mx-auto mb-8 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Tiêu đề:</span>
                                <span className="font-medium">{parsedData?.exam?.title}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Tổng Sections:</span>
                                <span className="font-medium">{parsedData?.sections?.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">File Media đã khớp:</span>
                                <span className="font-medium text-green-600">{Object.keys(mediaMap).length}/{mediaNeeded.length}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50"
                        >
                            {submitting ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="animate-spin" />
                                    Đang xử lý...
                                </span>
                            ) : (
                                'Xác nhận Import'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExcelImportStats;

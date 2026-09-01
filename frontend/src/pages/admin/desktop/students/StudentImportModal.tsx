// @ts-nocheck
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import { useOverlayLayer, useOverlayLock } from '../../../../components/ui/overlay-lock';
import api from '../../../../services/api';

const SAMPLE_HEADERS = ['CCCD', 'Họ', 'Tên đệm', 'Tên', 'Ngày sinh', 'Giới tính', 'Nơi sinh', 'Dân tộc', 'SĐT', 'Email', 'Địa chỉ', 'Đơn vị công tác'];

function downloadSampleExcel() {
  const rows = [
    SAMPLE_HEADERS,
    ['001234567890', 'NGUYỄN', 'VĂN', 'A', '15/03/2000', 'Nam', 'HÀ NỘI', 'KINH', '0912345678', 'nguyenvana@gmail.com', '123 Đường ABC, Hà Nội', ''],
    ['001234567891', 'TRẦN', 'THỊ', 'B', '22/08/1999', 'Nữ', 'HỒ CHÍ MINH', 'KINH', '0987654321', 'tranthib@gmail.com', '456 Đường XYZ, TP.HCM', 'Công ty ABC'],
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mau_import_hoc_vien.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function StudentImportModal({ onClose, onImported }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useOverlayLock(true);
  const layer = useOverlayLayer();

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Chỉ hỗ trợ file .xlsx, .xls hoặc .csv');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File quá lớn. Tối đa 5MB');
      return;
    }
    setFile(f);
    setError('');
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.request('/students/import-excel', {
        method: 'POST',
        body: formData,
      });
      setResult(res.data);
      if (res.data?.created > 0) {
        onImported?.();
      }
    } catch (err) {
      setError(err.message || 'Import thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" style={{ zIndex: layer }}>
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[28px] bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 rounded-t-[28px]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FileSpreadsheet size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Import học viên từ Excel</h2>
              <p className="text-xs text-slate-500">Tải lên file .xlsx để tạo nhiều học viên cùng lúc</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Download sample */}
          <button
            onClick={downloadSampleExcel}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
          >
            <Download size={15} />
            Tải file mẫu (.csv)
          </button>

          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition
              ${dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/50'}
              ${file ? 'border-emerald-300 bg-emerald-50/30' : ''}`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {file ? (
              <>
                <FileSpreadsheet size={32} className="text-emerald-500" />
                <p className="text-sm font-semibold text-slate-700">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <Upload size={32} className="text-slate-400" />
                <p className="text-sm font-medium text-slate-600">Kéo thả file Excel vào đây hoặc click để chọn</p>
                <p className="text-xs text-slate-400">Hỗ trợ .xlsx, .xls — Tối đa 5MB</p>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3">
              <AlertCircle size={16} className="mt-0.5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{result.created}</p>
                  <p className="text-xs font-medium text-emerald-600">Tạo thành công</p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
                  <p className="text-xs font-medium text-amber-600">Bỏ qua (trùng)</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-700">{result.total_rows}</p>
                  <p className="text-xs font-medium text-slate-600">Tổng dòng</p>
                </div>
              </div>

              {result.errors?.length > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-bold text-amber-700 mb-2">Chi tiết lỗi / bỏ qua:</p>
                  <ul className="space-y-1">
                    {result.errors.slice(0, 20).map((err, i) => (
                      <li key={i} className="text-xs text-amber-800">
                        {err.row > 0 ? `Dòng ${err.row}: ` : ''}{err.message}
                      </li>
                    ))}
                    {result.errors.length > 20 && (
                      <li className="text-xs text-amber-600 italic">...và {result.errors.length - 20} lỗi khác</li>
                    )}
                  </ul>
                </div>
              )}

              {result.created > 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  <p className="text-sm text-emerald-700 font-medium">
                    Đã tạo {result.created} học viên thành công! Danh sách đã được làm mới.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              {result ? 'Đóng' : 'Hủy'}
            </button>
            {!result && (
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Đang import...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Import
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

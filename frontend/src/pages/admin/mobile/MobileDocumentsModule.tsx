// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    FileText, Search, Upload, Download, Trash2, X, FolderOpen, Folder,
    FolderPlus, Globe, Users, User, Shield, Calendar, Share2, Filter,
    ChevronRight, RefreshCw, Plus, ChevronDown, BookOpen, Monitor, GraduationCap
} from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import { useToast } from '../../../components/ui/ToastContainer';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import {
    useDocumentsManagement,
    getFileExt,
    getFileColor,
    formatFileSize
} from '../shared/hooks/useDocumentsManagement';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import OverlayPortal from '../../../components/ui/OverlayPortal';

// ============= BOTTOM SHEET =============
const BottomSheet = ({ isOpen, onClose, title, children, height = 'auto' }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <OverlayPortal>
            <div className="fixed inset-0 z-[100000]">
                <div
                    className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={onClose}
                />
                <div
                    className={`absolute inset-0 bg-white shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
                    style={{ height: height === 'auto' ? '100dvh' : height, maxHeight: '100dvh' }}
                >
                    <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 73px)' }}>
                        {children}
                    </div>
                </div>
            </div>
        </OverlayPortal>
    );
};

// ============= DOCUMENT CARD =============
const DocumentCard = ({ doc, onShare, onDownload, onDelete }) => {
    const ext = getFileExt(doc.file_name);
    const color = getFileColor(doc.file_name);

    const getAccessBadge = (type) => {
        const map = {
            public: { color: 'bg-green-100 text-green-700', label: 'Công khai', icon: Globe },
            class: { color: 'bg-blue-100 text-blue-700', label: 'Theo lớp', icon: Users },
            student: { color: 'bg-orange-100 text-orange-700', label: 'Cá nhân', icon: User },
            admin: { color: 'bg-red-100 text-red-700', label: 'Admin', icon: Shield },
        };
        const config = map[type] || { color: 'bg-slate-100 text-slate-700', label: type, icon: FileText };
        const Icon = config.icon;
        return (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${config.color}`}>
                <Icon size={10} /> {config.label}
            </span>
        );
    };

    return (
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-start gap-2">
                {/* File Icon */}
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: color }}
                >
                    {ext.toUpperCase().slice(0, 3)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 truncate">{doc.title}</h4>
                    <p className="text-xs text-slate-500 truncate">{doc.file_name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        {getAccessBadge(doc.access_type)}
                        <span className="text-xs text-slate-400">{formatFileSize(doc.file_size)}</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={12} /> {formatDateVN(doc.created_at, true)}
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => onShare(doc)}
                        className="p-2 text-blue-600 bg-blue-50 rounded-lg active:bg-blue-100"
                    >
                        <Share2 size={16} />
                    </button>
                    <button
                        onClick={() => onDownload(doc)}
                        className="p-2 text-green-600 bg-green-50 rounded-lg active:bg-green-100"
                    >
                        <Download size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(doc)}
                        className="p-2 text-red-600 bg-red-50 rounded-lg active:bg-red-100"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============= UPLOAD SHEET =============
const UploadSheet = ({ isOpen, onClose, onSuccess }) => {
    const { success, error } = useToast();
    const { uploadDocument, offlineClasses, onlineClasses, examSchedules, folders, loadAllClasses, loadFolders } = useDocumentsManagement();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        access_type: 'public',
        class_ids: [],
        online_class_ids: [],
        exam_ids: [],
        cccd: '',
        file: null,
        folder_id: null,
    });

    useEffect(() => {
        if (isOpen) {
            loadAllClasses();
            loadFolders();
        }
    }, [isOpen, loadAllClasses, loadFolders]);

    const toggleClassSelection = (type, id) => {
        const key = type === 'offline' ? 'class_ids' : type === 'online' ? 'online_class_ids' : 'exam_ids';
        setFormData(prev => ({
            ...prev,
            [key]: prev[key].includes(id) ? prev[key].filter(x => x !== id) : [...prev[key], id]
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await uploadDocument(formData);
            success('Upload tài liệu thành công!');
            onSuccess?.();
            onClose();
            setFormData({
                title: '', description: '', access_type: 'public',
                class_ids: [], online_class_ids: [], exam_ids: [],
                cccd: '', file: null, folder_id: null,
            });
        } catch (err) {
            error(err.message || 'Lỗi upload');
        } finally {
            setLoading(false);
        }
    };

    const accessOptions = [
        { id: 'public', label: 'Công khai', icon: Globe },
        { id: 'class', label: 'Theo lớp', icon: Users },
        { id: 'student', label: 'Cá nhân', icon: User },
        { id: 'admin', label: 'Admin', icon: Shield },
    ];

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Upload tài liệu" height="95vh">
            <div className="p-3 space-y-5 pb-8">
                {/* File Picker */}
                <div>
                    <label className="text-sm font-medium text-slate-600 mb-2 block">Chọn file *</label>
                    <div
                        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${formData.file ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}
                        onClick={() => document.getElementById('mobile-file-input').click()}
                    >
                        <input
                            id="mobile-file-input"
                            type="file"
                            className="hidden"
                            onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                        />
                        {formData.file ? (
                            <div className="flex items-center justify-center gap-2">
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                                    style={{ backgroundColor: getFileColor(formData.file.name) }}
                                >
                                    {getFileExt(formData.file.name).toUpperCase().slice(0, 3)}
                                </div>
                                <div className="text-left">
                                    <p className="font-medium text-slate-800 truncate max-w-[200px]">{formData.file.name}</p>
                                    <p className="text-xs text-slate-500">{formatFileSize(formData.file.size)}</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, file: null }); }}
                                    className="p-1 text-slate-400"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                                <p className="text-slate-500">Nhấn để chọn file</p>
                                <p className="text-xs text-slate-400 mt-1">Tối đa 1GB</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Title */}
                <div>
                    <label className="text-sm font-medium text-slate-600 mb-1.5 block">Tên tài liệu *</label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nhập tên tài liệu"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="text-sm font-medium text-slate-600 mb-1.5 block">Mô tả</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                        placeholder="Mô tả ngắn (tùy chọn)"
                    />
                </div>

                {/* Folder */}
                {folders.length > 0 && (
                    <div>
                        <label className="text-sm font-medium text-slate-600 mb-1.5 block">Folder</label>
                        <select
                            value={formData.folder_id || ''}
                            onChange={(e) => setFormData({ ...formData, folder_id: e.target.value ? parseInt(e.target.value) : null })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- Không chọn --</option>
                            {folders.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Access Type */}
                <div>
                    <label className="text-sm font-medium text-slate-600 mb-2 block">Phân quyền truy cập</label>
                    <div className="grid grid-cols-2 gap-2">
                        {accessOptions.map(opt => {
                            const Icon = opt.icon;
                            const selected = formData.access_type === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, access_type: opt.id, class_ids: [], online_class_ids: [], exam_ids: [], cccd: '' })}
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${selected
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 text-slate-600'
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span className="font-medium text-sm">{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Class Selection */}
                {formData.access_type === 'class' && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600 block">Chọn lớp/lịch thi</label>

                        {/* Offline Classes */}
                        {offlineClasses.length > 0 && (
                            <div className="bg-slate-50 p-2.5 rounded-xl">
                                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                                    <BookOpen size={12} /> Lớp học offline ({offlineClasses.length})
                                </p>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {offlineClasses.map(cls => (
                                        <label key={cls.id} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.class_ids.includes(cls.id)}
                                                onChange={() => toggleClassSelection('offline', cls.id)}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600"
                                            />
                                            <span className="text-sm text-slate-700 truncate">{cls.ten_lop}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Online Classes */}
                        {onlineClasses.length > 0 && (
                            <div className="bg-slate-50 p-2.5 rounded-xl">
                                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                                    <Monitor size={12} /> Lớp học online ({onlineClasses.length})
                                </p>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {onlineClasses.map(cls => (
                                        <label key={cls.id} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.online_class_ids.includes(cls.id)}
                                                onChange={() => toggleClassSelection('online', cls.id)}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600"
                                            />
                                            <span className="text-sm text-slate-700 truncate">{cls.name || cls.ten_lop}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Exam Schedules */}
                        {examSchedules.length > 0 && (
                            <div className="bg-slate-50 p-2.5 rounded-xl">
                                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                                    <GraduationCap size={12} /> Lịch thi ({examSchedules.length})
                                </p>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {examSchedules.map(exam => (
                                        <label key={exam.id} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.exam_ids.includes(exam.id)}
                                                onChange={() => toggleClassSelection('exam', exam.id)}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600"
                                            />
                                            <span className="text-sm text-slate-700 truncate">{exam.name || exam.title || `Thi ${formatDateVN(exam.exam_date)}`}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* CCCD for student access */}
                {formData.access_type === 'student' && (
                    <div>
                        <label className="text-sm font-medium text-slate-600 mb-1.5 block">CCCD học viên</label>
                        <input
                            type="text"
                            value={formData.cccd}
                            onChange={(e) => setFormData({ ...formData, cccd: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nhập số CCCD"
                        />
                    </div>
                )}

                {/* Submit */}
                <div className="pt-4 sticky bottom-0 bg-white">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? 'Đang upload...' : 'Upload tài liệu'}
                    </button>
                </div>
            </div>
        </BottomSheet>
    );
};

// ============= SHARE SHEET =============
const ShareSheet = ({ isOpen, onClose, doc, onSuccess }) => {
    const { success, error } = useToast();
    const { shareDocument, offlineClasses, onlineClasses, loadAllClasses } = useDocumentsManagement();
    const [loading, setLoading] = useState(false);
    const [shareTargets, setShareTargets] = useState([]);

    useEffect(() => {
        if (isOpen) {
            loadAllClasses();
        }
    }, [isOpen, loadAllClasses]);

    const handleShare = async () => {
        setLoading(true);
        try {
            await shareDocument(doc.id, shareTargets);
            success('Đã chia sẻ tài liệu');
            onSuccess?.();
            onClose();
        } catch (err) {
            error(err.message || 'Lỗi chia sẻ');
        } finally {
            setLoading(false);
        }
    };

    const toggleTarget = (type, id) => {
        const target = { type, id };
        const exists = shareTargets.some(t => t.type === type && t.id === id);
        if (exists) {
            setShareTargets(shareTargets.filter(t => !(t.type === type && t.id === id)));
        } else {
            setShareTargets([...shareTargets, target]);
        }
    };

    if (!doc) return null;

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Chia sẻ tài liệu" height="auto">
            <div className="p-3 pb-8">
                {/* Doc Info */}
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl mb-2.5">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: getFileColor(doc.file_name) }}
                    >
                        {getFileExt(doc.file_name).toUpperCase().slice(0, 3)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800 truncate">{doc.title}</p>
                        <p className="text-xs text-slate-500 truncate">{doc.file_name}</p>
                    </div>
                </div>

                {/* Class Selection */}
                <div className="space-y-2 max-h-60 overflow-y-auto mb-2.5">
                    {offlineClasses.map(cls => {
                        const checked = shareTargets.some(t => t.type === 'offline_class' && t.id === cls.id);
                        return (
                            <label
                                key={cls.id}
                                className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${checked ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleTarget('offline_class', cls.id)}
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600"
                                />
                                <span className="font-medium text-slate-700">{cls.ten_lop}</span>
                            </label>
                        );
                    })}
                    {onlineClasses.map(cls => {
                        const checked = shareTargets.some(t => t.type === 'online_class' && t.id === cls.id);
                        return (
                            <label
                                key={`online-${cls.id}`}
                                className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${checked ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleTarget('online_class', cls.id)}
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600"
                                />
                                <span className="font-medium text-slate-700">{cls.ten_lop || cls.class_name}</span>
                            </label>
                        );
                    })}
                </div>

                {/* Submit */}
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={loading || shareTargets.length === 0}
                        className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-50"
                    >
                        {loading ? 'Đang chia sẻ...' : `Chia sẻ (${shareTargets.length})`}
                    </button>
                </div>
            </div>
        </BottomSheet>
    );
};

// ============= CONFIRM DELETE =============
const ConfirmDeleteSheet = ({ isOpen, onClose, doc, onConfirm }) => {
    const { success, error } = useToast();
    const { deleteDocument } = useDocumentsManagement();
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await deleteDocument(doc.id);
            success('Xóa thành công!');
            onConfirm?.();
            onClose();
        } catch (err) {
            error('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!doc) return null;

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Xác nhận xóa" height="auto">
            <div className="p-3 pb-8">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2.5">
                        <Trash2 size={32} className="text-red-600" />
                    </div>
                    <p className="text-slate-700">Bạn có chắc chắn muốn xóa</p>
                    <p className="font-bold text-slate-900 text-sm">"{doc.title}"?</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 py-2 bg-red-600 text-white font-semibold rounded-xl disabled:opacity-50"
                    >
                        {loading ? 'Đang xóa...' : 'Xóa'}
                    </button>
                </div>
            </div>
        </BottomSheet>
    );
};

// ============= CREATE FOLDER SHEET =============
const CreateFolderSheet = ({ isOpen, onClose, onSuccess }) => {
    const { success, error } = useToast();
    const { createFolder } = useDocumentsManagement();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        setLoading(true);
        try {
            await createFolder(name);
            success('Tạo folder thành công!');
            onSuccess?.();
            onClose();
            setName('');
        } catch (err) {
            error('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Tạo Folder mới" height="auto">
            <div className="p-3 pb-8">
                <div className="mb-2.5">
                    <label className="text-sm font-medium text-slate-600 mb-1.5 block">Tên folder</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nhập tên folder"
                        autoFocus
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={loading || !name.trim()}
                        className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-50"
                    >
                        {loading ? 'Đang tạo...' : 'Tạo folder'}
                    </button>
                </div>
            </div>
        </BottomSheet>
    );
};

// ============= MAIN COMPONENT =============
export default function MobileDocumentsModule() {
    const { documents, loading, filterDocuments, getStats, loadDocuments } = useDocumentsManagement();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    const [showUpload, setShowUpload] = useState(false);
    const [showFolder, setShowFolder] = useState(false);
    const [shareDoc, setShareDoc] = useState(null);
    const [deleteDoc, setDeleteDoc] = useState(null);

    const filteredDocuments = useMemo(() => {
        return filterDocuments(searchTerm, filterType).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [documents, filterType, searchTerm, filterDocuments]);

    const stats = getStats();

    const handleDownload = async (doc) => {
        try {
            await api.downloadDocument(doc.id, doc.file_name);
        } catch (err) {
            console.error('Download document error:', err);
        }
    };

    // Pull-to-refresh callback
    const handleRefresh = async () => {
        await loadDocuments({ force: true });
    };

    return (
        <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-3 pt-3.5 pb-3 safe-area-inset-top">
                <div className="mb-2.5 flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">Quản lý Tài liệu</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFolder(true)}
                            className="rounded-xl bg-white/20 p-2 text-white active:bg-white/30"
                        >
                            <FolderPlus size={18} />
                        </button>
                        <button
                            onClick={() => setShowUpload(true)}
                            className="rounded-xl bg-white/20 p-2 text-white active:bg-white/30"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                    <input
                        type="text"
                        placeholder="Tìm tài liệu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl border border-white/30 bg-white/20 py-2 pl-10 pr-12 text-[13px] text-white placeholder-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/60"
                    />
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg ${showFilters ? 'bg-white/30' : ''}`}
                    >
                        <Filter size={18} className="text-white/80" />
                    </button>
                </div>

                {/* Filter Pills */}
                {showFilters && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
                        {[
                            { value: 'all', label: 'Tất cả', icon: FolderOpen },
                            { value: 'public', label: 'Công khai', icon: Globe },
                            { value: 'class', label: 'Theo lớp', icon: Users },
                            { value: 'student', label: 'Cá nhân', icon: User },
                            { value: 'admin', label: 'Admin', icon: Shield },
                        ].map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFilterType(f.value)}
                                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${filterType === f.value
                                    ? 'bg-white text-emerald-600'
                                    : 'bg-white/20 text-white'
                                    }`}
                            >
                                <f.icon size={12} /> {f.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="px-3 -mt-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm">
                    <div className="grid grid-cols-5 gap-1 text-center">
                        <div>
                            <p className="text-base font-bold text-slate-900">{stats.all}</p>
                            <p className="text-[10px] text-slate-500">Tổng</p>
                        </div>
                        <div>
                            <p className="text-base font-bold text-green-600">{stats.public}</p>
                            <p className="text-[10px] text-slate-500">Công khai</p>
                        </div>
                        <div>
                            <p className="text-base font-bold text-blue-600">{stats.class}</p>
                            <p className="text-[10px] text-slate-500">Lớp</p>
                        </div>
                        <div>
                            <p className="text-base font-bold text-orange-600">{stats.student}</p>
                            <p className="text-[10px] text-slate-500">Cá nhân</p>
                        </div>
                        <div>
                            <p className="text-base font-bold text-red-600">{stats.admin}</p>
                            <p className="text-[10px] text-slate-500">Admin</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="p-3 pb-24">
                {loading ? (
                    <AdminLoadingState
                        title="Đang tải kho tài liệu"
                        hint="Tài liệu chia sẻ và bộ lọc quyền truy cập được lấy lại từ cache để tránh load lại nhiều lần."
                        variant="mobile-list"
                        accent="emerald"
                    />
                ) : filteredDocuments.length > 0 ? (
                    <div className="space-y-2">
                        {filteredDocuments.map((doc) => (
                            <DocumentCard
                                key={doc.id}
                                doc={doc}
                                onShare={setShareDoc}
                                onDownload={handleDownload}
                                onDelete={setDeleteDoc}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-60">
                        <FolderOpen size={64} className="text-slate-300 mb-2.5" />
                        <p className="text-slate-500 font-medium">Không có tài liệu</p>
                        <button
                            onClick={() => setShowUpload(true)}
                            className="mt-2.5 px-3 py-2 bg-emerald-600 text-white rounded-xl"
                        >
                            Upload tài liệu đầu tiên
                        </button>
                    </div>
                )}
            </div>

            {/* FAB */}
            <button
                onClick={() => setShowUpload(true)}
                className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full shadow-lg shadow-emerald-300 flex items-center justify-center active:scale-95 transition-transform z-40"
            >
                <Upload size={24} />
            </button>

            {/* Sheets */}
            <UploadSheet
                isOpen={showUpload}
                onClose={() => setShowUpload(false)}
                onSuccess={async () => {
                    await loadDocuments({ force: true });
                }}
            />

            <CreateFolderSheet
                isOpen={showFolder}
                onClose={() => setShowFolder(false)}
                onSuccess={async () => {
                    await loadDocuments({ force: true });
                }}
            />

            <ShareSheet
                isOpen={!!shareDoc}
                onClose={() => setShareDoc(null)}
                doc={shareDoc}
                onSuccess={async () => {
                    await loadDocuments({ force: true });
                }}
            />

            <ConfirmDeleteSheet
                isOpen={!!deleteDoc}
                onClose={() => setDeleteDoc(null)}
                doc={deleteDoc}
                onConfirm={async () => {
                    await loadDocuments({ force: true });
                }}
            />
        </div>
    </PullToRefreshWrapper>
    );
}

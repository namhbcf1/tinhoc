import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
    FileText, Search, Download, Upload, Clock, Folder, FolderOpen,
    File, Image, Video, X, Send, Plus, RefreshCw, Users, MoreVertical, Trash2, Eye, Share2, ChevronRight, Filter
} from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';

const FILE_COLORS = {
    pdf: '#DC2626',
    doc: '#2563EB', docx: '#2563EB',
    xls: '#059669', xlsx: '#059669',
    ppt: '#D97706', pptx: '#D97706',
    jpg: '#DB2777', jpeg: '#DB2777', png: '#DB2777', gif: '#DB2777',
    mp4: '#7C3AED', mov: '#7C3AED', webm: '#7C3AED',
};

export default function TeacherDocuments({ teacher }) {
    const [documents, setDocuments] = useState([]);
    const [myClasses, setMyClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('my-classes'); // 'my-classes' | 'public'
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);

    // Upload modal
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadData, setUploadData] = useState({
        title: '',
        description: '',
        class_id: null,
        file: null,
    });

    useGSAP(() => {
        gsap.fromTo(
            '.anim-fade-up',
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
        );
    }, [documents, activeTab, selectedClassId, showUploadModal]);

    useEffect(() => {
        loadMyClasses();
        loadDocuments();
    }, []);

    const loadMyClasses = async () => {
        try {
            const response = await api.getTeacherClasses();
            if (response.success) {
                setMyClasses(response.data || []);
            }
        } catch (e) {
            console.error('Load classes error:', e);
        }
    };

    const loadDocuments = async () => {
        setLoading(true);
        try {
            // Load all documents accessible to this teacher
            const response = await api.getTeacherDocuments?.() || await api.getAllDocuments();
            const docs = response.success && response.data ? response.data : (response.data || []);
            setDocuments(Array.isArray(docs) ? docs : []);
        } catch (e) {
            console.error('Load documents error:', e);
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    };

    // Filter documents
    const filteredDocuments = documents.filter(doc => {
        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            if (!doc.title?.toLowerCase().includes(term) && !doc.file_name?.toLowerCase().includes(term)) {
                return false;
            }
        }

        // Tab filter
        if (activeTab === 'public') {
            return doc.access_type === 'public';
        } else if (activeTab === 'my-classes') {
            // Show docs that are shared with classes this teacher teaches
            if (doc.access_type === 'class') {
                // Check if doc's class matches any of teacher's classes
                const teacherClassIds = myClasses.map(c => c.id);
                return doc.class_ids?.some(cid => teacherClassIds.includes(cid)) ||
                    teacherClassIds.includes(doc.class_id);
            }
            // Also show teacher's own uploads
            return doc.uploaded_by_teacher === teacher?.id;
        }
        return true;
    }).filter(doc => {
        // Class filter
        if (selectedClassId) {
            return doc.class_id === selectedClassId || doc.class_ids?.includes(selectedClassId);
        }
        return true;
    });

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadData.title || !uploadData.file || !uploadData.class_id) {
            alert('Vui lòng điền đầy đủ thông tin');
            return;
        }

        setUploading(true);
        try {
            await api.uploadDocumentWithPermission({
                title: uploadData.title,
                description: uploadData.description,
                access_type: 'class',
                class_ids: [uploadData.class_id],
                file: uploadData.file,
                doc_type: 'class',
                visibility: 'internal',
            });
            alert('Upload thành công!');
            setShowUploadModal(false);
            setUploadData({ title: '', description: '', class_id: null, file: null });
            loadDocuments();
        } catch (error) {
            alert('Lỗi: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = (doc) => {
        window.open(api.getDocumentDownloadUrl(doc.id), '_blank');
    };

    const getFileExt = (fileName) => fileName?.split('.').pop()?.toLowerCase() || '';
    const getFileColor = (fileName) => FILE_COLORS[getFileExt(fileName)] || '#64748B';

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 KB';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const getFileIcon = (fileName) => {
        const ext = getFileExt(fileName);
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image size={24} />;
        if (['mp4', 'webm', 'mov'].includes(ext)) return <Video size={24} />;
        return <File size={24} />;
    };

    return (
        <div className="space-y-8" ref={containerRef}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 anim-fade-up">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Tài liệu</h1>
                    <p className="text-slate-500 mt-1">Quản lý và chia sẻ học liệu cho các lớp học</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full md:w-64">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm tài liệu..."
                            className="pl-10 h-11 bg-white border-slate-200 rounded-xl"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={loadDocuments} className="h-11 w-11 rounded-xl bg-white border-slate-200 text-slate-500 hover:text-teal-600">
                        <RefreshCw size={18} />
                    </Button>
                    <Button onClick={() => setShowUploadModal(true)} className="h-11 rounded-xl bg-teal-600 hover:bg-teal-700 shadow-teal-100 shadow-lg px-6 font-bold">
                        <Plus size={18} className="mr-2" /> Upload tài liệu
                    </Button>
                </div>
            </div>

            {/* Tabs & Class Filter */}
            <div className="space-y-6 anim-fade-up">
                <div className="flex p-1 bg-slate-100/50 rounded-2xl w-fit">
                    <button
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'my-classes'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        onClick={() => { setActiveTab('my-classes'); setSelectedClassId(null); }}
                    >
                        <Folder size={18} className={activeTab === 'my-classes' ? 'text-teal-600' : ''} /> Tài liệu lớp tôi
                    </button>
                    <button
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'public'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        onClick={() => { setActiveTab('public'); setSelectedClassId(null); }}
                    >
                        <FolderOpen size={18} className={activeTab === 'public' ? 'text-teal-600' : ''} /> Tài liệu công khai
                    </button>
                </div>

                {activeTab === 'my-classes' && myClasses.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="p-2 bg-slate-100 rounded-xl flex items-center gap-2 mr-2">
                            <Filter size={14} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lọc lớp</span>
                        </div>
                        <Button
                            variant={!selectedClassId ? "secondary" : "ghost"}
                            className={`rounded-xl text-xs font-bold ${!selectedClassId ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
                            onClick={() => setSelectedClassId(null)}
                        >
                            Tất cả
                        </Button>
                        {myClasses.map(cls => (
                            <Button
                                key={cls.id}
                                variant={selectedClassId === cls.id ? "secondary" : "outline"}
                                className={`rounded-xl text-xs font-bold ${selectedClassId === cls.id ? 'bg-teal-600 text-white border-0 shadow-md' : 'text-slate-600'}`}
                                onClick={() => setSelectedClassId(cls.id)}
                            >
                                {cls.ten_lop}
                            </Button>
                        ))}
                    </div>
                )}
            </div>

            {/* Documents List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 anim-fade-up">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
                    <span className="mt-4 text-slate-500 font-medium tracking-tight">Đang tải tài liệu...</span>
                </div>
            ) : filteredDocuments.length === 0 ? (
                <Card className="glass-panel py-24 flex flex-col items-center justify-center text-center anim-fade-up">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                        <FolderOpen size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Chưa có tài liệu</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mb-8 font-medium leading-relaxed">
                        {activeTab === 'my-classes'
                            ? 'Bắt đầu chia sẻ tài liệu đầu tiên cho lớp học của bạn ngay bây giờ'
                            : 'Hệ thống hiện chưa có tài liệu công khai nào được chia sẻ'}
                    </p>
                    {activeTab === 'my-classes' && (
                        <Button onClick={() => setShowUploadModal(true)} className="h-11 rounded-xl bg-teal-600 hover:bg-teal-700 px-8 font-bold">
                            <Upload size={18} className="mr-2" /> Upload ngay
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredDocuments.map(doc => (
                        <Card
                            key={doc.id}
                            className="glass-card flex flex-col h-full border-0 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group anim-fade-up cursor-pointer"
                            onClick={() => handleDownload(doc)}
                        >
                            <CardContent className="p-6 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-5">
                                    <div className="p-3 rounded-2xl shadow-sm" style={{ background: `${getFileColor(doc.file_name)}15`, color: getFileColor(doc.file_name) }}>
                                        {getFileIcon(doc.file_name)}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge className={`border-0 uppercase text-xs font-semibold px-2 py-0.5
                                          ${doc.access_type === 'public' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {doc.access_type === 'public' ? 'Public' : 'Class'}
                                        </Badge>
                                        <span className="text-xs text-slate-400 font-medium">{formatFileSize(doc.file_size)}</span>
                                    </div>
                                </div>

                                <h4 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2 leading-tight group-hover:text-teal-700 transition-colors">
                                    {doc.title}
                                </h4>

                                <p className="text-[11px] text-slate-400 font-medium mb-4 truncate italic">
                                    {doc.file_name}
                                </p>

                                {doc.description && (
                                    <p className="text-xs text-slate-500 line-clamp-2 mb-6 font-medium leading-relaxed">
                                        {doc.description}
                                    </p>
                                )}

                                <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Clock size={12} />
                                        <span className="text-xs font-medium">{formatDateVN(doc.created_at)}</span>
                                    </div>
                                    <div className="p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                                        <Download size={16} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowUploadModal(false)}></div>
                    <Card className="glass-panel w-full max-w-lg relative shadow-2xl overflow-hidden anim-fade-up border-0 ring-1 ring-white/50">
                        <CardHeader className="bg-white/50 border-b border-slate-100/50 p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                                        <Upload size={20} />
                                    </div>
                                    <CardTitle className="text-xl font-bold tracking-tight">Upload tài liệu</CardTitle>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setShowUploadModal(false)} className="rounded-xl hover:bg-rose-50 hover:text-rose-600">
                                    <X size={20} />
                                </Button>
                            </div>
                        </CardHeader>

                        <form onSubmit={handleUpload}>
                            <CardContent className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 pl-1">Tên tài liệu *</label>
                                    <Input
                                        className="h-12 bg-slate-50/50 border-slate-100 rounded-xl font-medium focus:bg-white"
                                        value={uploadData.title}
                                        onChange={e => setUploadData({ ...uploadData, title: e.target.value })}
                                        placeholder="Ví dụ: Tài liệu ôn thi cuối kỳ"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 pl-1">Mô tả (tùy chọn)</label>
                                    <textarea
                                        className="w-full p-4 bg-slate-50/50 border-slate-100 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 min-h-[80px]"
                                        value={uploadData.description}
                                        onChange={e => setUploadData({ ...uploadData, description: e.target.value })}
                                        placeholder="Mô tả nội dung tài liệu..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 pl-1">Chia sẻ với lớp *</label>
                                    <div className="relative">
                                        <select
                                            className="w-full h-12 pl-4 pr-10 bg-slate-50/50 border border-slate-100 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500/10 font-medium text-slate-700 cursor-pointer"
                                            value={uploadData.class_id || ''}
                                            onChange={e => setUploadData({ ...uploadData, class_id: parseInt(e.target.value) })}
                                            required
                                        >
                                            <option value="">-- Chọn lớp học --</option>
                                            {myClasses.map(cls => (
                                                <option key={cls.id} value={cls.id}>{cls.ten_lop}</option>
                                            ))}
                                        </select>
                                        <ChevronRight size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 pl-1">Chọn file *</label>
                                    <div
                                        className={`mt-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all cursor-pointer group
                                          ${uploadData.file
                                                ? 'border-teal-400 bg-teal-50/30'
                                                : 'border-slate-200 bg-slate-50/30 hover:border-teal-400 hover:bg-teal-50/30'}`}
                                        onClick={() => document.getElementById('teacher-file-input').click()}
                                    >
                                        <input
                                            id="teacher-file-input"
                                            type="file"
                                            onChange={e => setUploadData({ ...uploadData, file: e.target.files[0] })}
                                            className="hidden"
                                        />

                                        {uploadData.file ? (
                                            <div className="flex items-center gap-4 w-full text-left bg-white p-4 rounded-xl shadow-sm border border-teal-100">
                                                <div className="p-3 rounded-xl bg-teal-600 text-white shadow-md">
                                                    {getFileIcon(uploadData.file.name)}
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{uploadData.file.name}</p>
                                                    <p className="text-xs font-medium text-slate-400">{formatFileSize(uploadData.file.size)}</p>
                                                </div>
                                                <X size={18} className="text-slate-300 hover:text-rose-500 cursor-pointer" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUploadData({ ...uploadData, file: null });
                                                }} />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                                    <Upload size={30} className="text-teal-600" />
                                                </div>
                                                <p className="text-sm font-bold text-slate-700">Click hoặc kéo thả file</p>
                                                <span className="text-xs text-slate-400 font-medium mt-1">PDF, DOC, XLS, PPT, JPG...</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardContent>

                            <div className="p-6 bg-slate-50/50 border-t border-slate-100/50 flex gap-3">
                                <Button type="button" variant="ghost" onClick={() => setShowUploadModal(false)} className="flex-1 h-11 rounded-xl font-bold">
                                    Hủy
                                </Button>
                                <Button type="submit" className="flex-1 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 shadow-teal-100 shadow-lg font-bold" disabled={uploading}>
                                    {uploading ? (
                                        <>
                                            <RefreshCw size={16} className="mr-2 animate-spin" /> Uploading...
                                        </>
                                    ) : 'Xác nhận Upload'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}

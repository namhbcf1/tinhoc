import React, { useState, useEffect } from 'react';
import { FileText, Image, Video, Download, Search, X, ExternalLink } from 'lucide-react';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';

const getFileIcon = (fileType) => {
    if (!fileType) return FileText;
    const t = fileType.toLowerCase();
    if (t.includes('pdf') || t.includes('doc')) return FileText;
    if (t.includes('image') || t.includes('png') || t.includes('jpg')) return Image;
    if (t.includes('video') || t.includes('mp4')) return Video;
    return FileText;
};

const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileColor = (fileType) => {
    if (!fileType) return { bg: 'bg-slate-500', light: 'bg-slate-50 border-slate-100', text: 'text-slate-600' };
    const t = fileType.toLowerCase();
    if (t.includes('pdf')) return { bg: 'bg-red-500', light: 'bg-red-50 border-red-100', text: 'text-red-600' };
    if (t.includes('doc')) return { bg: 'bg-blue-500', light: 'bg-blue-50 border-blue-100', text: 'text-blue-600' };
    if (t.includes('image') || t.includes('png') || t.includes('jpg')) return { bg: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-600' };
    if (t.includes('video') || t.includes('mp4')) return { bg: 'bg-violet-500', light: 'bg-violet-50 border-violet-100', text: 'text-violet-600' };
    return { bg: 'bg-slate-500', light: 'bg-slate-50 border-slate-100', text: 'text-slate-600' };
};

const DocumentCard = ({ document }) => {
    const fileName = document.file_name || document.title || document.ten_tai_lieu || 'Tài liệu';
    const fileType = document.file_type || document.loai_file || 'pdf';
    const fileSize = document.file_size || document.kich_thuoc || 0;
    const className = document.class_name || document.ten_lop || '';
    const Icon = getFileIcon(fileType);
    const { bg, light, text } = getFileColor(fileType);

    const handleDownload = (e) => {
        e.stopPropagation();
        if (document.file_url) window.open(document.file_url, '_blank');
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 active:scale-[0.98] transition-all duration-200">
            <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0 shadow-md`}>
                <Icon size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{fileName}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {className && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${light} border ${text}`}>{className}</span>
                    )}
                    {fileSize > 0 && (
                        <span className="text-[10px] text-slate-400 font-semibold">{formatFileSize(fileSize)}</span>
                    )}
                </div>
            </div>
            <button
                onClick={handleDownload}
                className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl ${light} border ${text} flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform`}
            >
                <Download size={16} />
            </button>
        </div>
    );
};

export default function MobileDocumentsModule({ studentData }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { fetchDocuments(); }, []);

    // Pull-to-refresh callback
    const handleRefresh = async () => {
        await fetchDocuments();
    };

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await api.getAllDocuments();
            const docList = Array.isArray(res) ? res : (res?.data || res?.documents || []);
            setDocuments(docList);
        } catch (error) {
            console.error("Failed to fetch documents", error);
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredDocuments = documents.filter(d => {
        const fileName = (d.file_name || d.title || d.ten_tai_lieu || '').toLowerCase();
        const cn = (d.class_name || d.ten_lop || '').toLowerCase();
        return fileName.includes(searchTerm.toLowerCase()) || cn.includes(searchTerm.toLowerCase());
    });

    const totalDocs = documents.length;
    const pdfDocs = documents.filter(d => (d.file_type || '').toLowerCase().includes('pdf')).length;
    const videoDocs = documents.filter(d => (d.file_type || '').toLowerCase().includes('video')).length;

    return (
        <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="min-h-screen bg-slate-50 pb-28">
            {/* Hero Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 px-5 pt-6 pb-8">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-10 left-5 w-32 h-32 rounded-full bg-white/10 blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
                            <FileText size={24} className="text-white" strokeWidth={1.5} />
                        </div>
                        <div>
                            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Thư viện tài liệu</p>
                            <h1 className="text-white font-black text-xl tracking-tight">Văn bản & Biểu mẫu</h1>
                        </div>
                    </div>

                    {/* Stat pills */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                            { label: 'Tổng tài liệu', value: loading ? '...' : totalDocs },
                            { label: 'PDF / DOC', value: loading ? '...' : pdfDocs },
                            { label: 'Video', value: loading ? '...' : videoDocs },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2.5 border border-white/20 text-center">
                                <p className="text-white/70 text-[9px] font-black uppercase tracking-widest mb-1">{label}</p>
                                <p className="text-white font-black text-xl leading-none">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tài liệu..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 font-medium"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/70">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-5">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 animate-pulse">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-slate-100 rounded-full w-3/4" />
                                    <div className="h-3 bg-slate-100 rounded-full w-1/3" />
                                </div>
                                <div className="w-9 h-9 bg-slate-100 rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : filteredDocuments.length > 0 ? (
                    <div className="space-y-2.5">
                        {filteredDocuments.map((doc) => (
                            <DocumentCard key={doc.id} document={doc} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-5">
                            <FileText size={40} className="text-blue-300" />
                        </div>
                        <h3 className="font-black text-slate-800 text-lg mb-2">
                            {searchTerm ? 'Không tìm thấy tài liệu' : 'Chưa có tài liệu nào'}
                        </h3>
                        <p className="text-slate-500 text-sm">
                            {searchTerm ? 'Thử từ khóa khác' : 'Các tài liệu học tập sẽ được cập nhật sớm'}
                        </p>
                    </div>
                )}
            </div>
        </div>
        </PullToRefreshWrapper>
    );
}

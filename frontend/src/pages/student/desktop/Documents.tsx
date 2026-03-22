import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { FileText, Image, Video, Download, Search, X, FileSearch, File } from 'lucide-react';
import api from '../../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { getStorageValue } from '../../../utils/browser-storage.js';

// Helper to get file icon component
const getFileIcon = (fileType) => {
    if (!fileType) return FileText;
    const type = fileType.toLowerCase();
    if (type.includes('pdf') || type.includes('doc')) return FileText;
    if (type.includes('image') || type.includes('png') || type.includes('jpg')) return Image;
    if (type.includes('video') || type.includes('mp4')) return Video;
    return FileText;
};

// Helper to format file size
const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// File type color coding
const getFileTypeStyle = (fileType) => {
    if (!fileType) return { bg: 'from-slate-400 to-slate-500', badge: 'bg-slate-100 text-slate-600', label: 'Khác' };
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return { bg: 'from-red-500 to-rose-600', badge: 'bg-red-50 text-red-600 border border-red-200', label: 'PDF' };
    if (type.includes('doc')) return { bg: 'from-blue-500 to-blue-700', badge: 'bg-blue-50 text-blue-600 border border-blue-200', label: 'DOC' };
    if (type.includes('video') || type.includes('mp4')) return { bg: 'from-purple-500 to-violet-600', badge: 'bg-purple-50 text-purple-600 border border-purple-200', label: 'Video' };
    if (type.includes('image') || type.includes('png') || type.includes('jpg')) return { bg: 'from-sky-400 to-blue-500', badge: 'bg-sky-50 text-sky-600 border border-sky-200', label: 'Ảnh' };
    return { bg: 'from-slate-400 to-slate-500', badge: 'bg-slate-100 text-slate-600', label: 'Khác' };
};

// Skeleton loader for document cards
const DocumentSkeleton = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 animate-pulse hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
        <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-200 flex-shrink-0" />
            <div className="flex-1">
                <div className="h-5 bg-slate-200 rounded-lg w-3/4 mb-2" />
                <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
            </div>
        </div>
        <div className="h-9 bg-slate-200 rounded-xl w-full mt-4" />
    </div>
);

const DocumentCard = ({ document, onDownload }) => {
    const fileName = document.file_name || document.title || document.ten_tai_lieu || 'Tài liệu';
    const fileType = document.file_type || document.loai_file || 'pdf';
    const fileSize = document.file_size || document.kich_thuoc || 0;
    const className = document.class_name || document.ten_lop || '';
    const Icon = getFileIcon(fileType);
    const typeStyle = getFileTypeStyle(fileType);

    return (
        <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 anim-fade-up border border-slate-100 flex flex-col h-full overflow-hidden">
            <div className="p-5 flex-1 flex flex-col">
                {/* File icon + name */}
                <div className="flex items-start gap-4 mb-4">
                    <div className={`bg-gradient-to-br ${typeStyle.bg} text-white w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                        <Icon size={26} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 text-base leading-snug line-clamp-2 mb-2">{fileName}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* File type badge */}
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeStyle.badge}`}>
                                {typeStyle.label}
                            </span>
                            {/* Class badge */}
                            {className && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 truncate max-w-[120px]">
                                    {className}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* File size row */}
                {fileSize > 0 && (
                    <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                        <File size={11} />
                        {formatFileSize(fileSize)}
                    </p>
                )}

                {/* Download button */}
                <div className="mt-auto pt-4 border-t border-slate-100">
                    <Button
                        onClick={() => onDownload(document)}
                        className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:shadow-md hover:shadow-blue-200 transition-all"
                    >
                        <Download size={15} className="mr-2" />
                        Tải xuống
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default function Documents({ studentData }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);

    useGSAP(() => {
        gsap.fromTo(
            '.anim-fade-up',
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
        );
    }, [documents, searchTerm]);

    useEffect(() => {
        fetchDocuments();
    }, [studentData?.cccd]);

    // SAME LOGIC AS MOBILE
    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const cccd = studentData?.cccd || getStorageValue('student_cccd');
            if (!cccd) {
                setDocuments([]);
                return;
            }

            const res = await api.getDocumentsByCCCD(cccd);
            const docList = Array.isArray(res) ? res : (res?.data || res?.documents || []);
            setDocuments(docList);
        } catch (error) {
            console.error("Failed to fetch documents", error);
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadDocument = (document) => {
        if (!document?.id) return;
        window.open(api.getDocumentDownloadUrl(document.id), '_blank', 'noopener,noreferrer');
    };

    // Filter documents
    const filteredDocuments = documents.filter(d => {
        const fileName = (d.file_name || d.title || d.ten_tai_lieu || '').toLowerCase();
        const className = (d.class_name || d.ten_lop || '').toLowerCase();
        return fileName.includes(searchTerm.toLowerCase()) || className.includes(searchTerm.toLowerCase());
    });

    // Stats
    const totalDocs = documents.length;
    const pdfDocs = documents.filter(d => (d.file_type || '').toLowerCase().includes('pdf')).length;
    const videoDocs = documents.filter(d => (d.file_type || '').toLowerCase().includes('video')).length;

    return (
        <div className="space-y-6" ref={containerRef}>
            {/* Hero Banner with integrated search */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-3xl p-7 text-white shadow-xl anim-fade-up relative overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/10 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default" />
                <div className="absolute -bottom-8 left-10 w-28 h-28 rounded-full bg-white/10 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <FileText size={18} className="text-white/80" />
                        <p className="text-white/80 text-sm font-semibold uppercase tracking-widest">Thư viện học liệu</p>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight">Tài liệu của bạn</h1>
                    <p className="text-white/70 text-sm mb-5">Tài nguyên học tập từ tất cả các khóa học</p>

                    {/* 3 stat pills */}
                    <div className="flex gap-3 mb-6 flex-wrap">
                        {[
                            { label: 'Tổng tài liệu', value: totalDocs, color: 'bg-white/20 border-white/30' },
                            { label: 'PDF', value: pdfDocs, color: 'bg-red-400/30 border-red-300/40' },
                            { label: 'Video', value: videoDocs, color: 'bg-purple-400/30 border-purple-300/40' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className={`backdrop-blur-sm ${color} border rounded-2xl px-5 py-2.5 flex items-center gap-3`}>
                                <span className="text-2xl font-extrabold text-white leading-none tracking-tight">{value}</span>
                                <span className="text-white/80 text-sm font-medium">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Search bar integrated in hero */}
                    <div className="relative">
                        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
                        <input
                            type="text"
                            placeholder="Tìm tên tài liệu hoặc tên lớp..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-11 py-3 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/60 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/25 transition-all hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default"
                            >
                                <X size={14} className="text-white" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Search result label */}
            {searchTerm && !loading && (
                <div className="flex items-center gap-2 px-1 anim-fade-up">
                    <Search size={14} className="text-slate-400" />
                    <p className="text-sm text-slate-500">
                        Tìm thấy <span className="font-bold text-slate-700">{filteredDocuments.length}</span> tài liệu cho
                        <span className="font-bold text-indigo-600"> "{searchTerm}"</span>
                    </p>
                </div>
            )}

            {/* Document Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => <DocumentSkeleton key={i} />)}
                </div>
            ) : filteredDocuments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDocuments.map((doc) => (
                        <DocumentCard key={doc.id} document={doc} onDownload={handleDownloadDocument} />
                    ))}
                </div>
            ) : (
                /* Empty state */
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 py-20 text-center hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
                    <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-5">
                        <FileSearch size={40} className="text-indigo-300" />
                    </div>
                    <p className="text-slate-700 font-bold text-xl mb-1 tracking-tight">
                        {searchTerm ? 'Không tìm thấy tài liệu' : 'Chưa có tài liệu nào'}
                    </p>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto">
                        {searchTerm
                            ? `Không có tài liệu nào khớp với "${searchTerm}". Hãy thử từ khóa khác.`
                            : 'Tài liệu từ các khóa học của bạn sẽ xuất hiện ở đây.'}
                    </p>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                        >
                            Xóa tìm kiếm
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

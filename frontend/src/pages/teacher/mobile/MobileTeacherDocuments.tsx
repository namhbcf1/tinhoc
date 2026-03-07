import { useState, useEffect } from 'react';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import { FileText, Download, Search, File } from 'lucide-react';

export default function MobileTeacherDocuments({ teacher }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const response = await api.getTeacherDocuments();
            if (response?.success && Array.isArray(response.data)) {
                setDocuments(response.data);
            }
        } catch {
            // fail silently
        } finally {
            setLoading(false);
        }
    };

    const filteredDocs = documents.filter((doc) =>
        (doc.name || doc.ten_tai_lieu || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <PullToRefreshWrapper onRefresh={loadDocuments}>
            <div style={{ paddingBottom: 'calc(var(--mb-bottom-nav-height, 70px) + 16px)' }}>
                {/* Header */}
                <div
                    className="mx-4 mt-3 mb-4 rounded-2xl p-4"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-bold text-base">Thư viện tài liệu</h3>
                            <p className="text-orange-200 text-xs font-medium mt-0.5">
                                {loading ? '...' : `${documents.length} tập tin có sẵn`}
                            </p>
                        </div>
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.2)' }}
                        >
                            <FileText size={20} className="text-white" />
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="px-4 mb-4 relative">
                    <Search
                        size={16}
                        className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        placeholder="Tìm tài liệu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 placeholder-slate-400 outline-none focus:border-orange-400"
                    />
                </div>

                <div className="px-4 space-y-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                            <p className="text-xs text-slate-500 font-medium">Đang tải tài liệu...</p>
                        </div>
                    ) : filteredDocs.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                <FileText size={26} className="text-slate-300" />
                            </div>
                            <p className="text-sm font-semibold text-slate-500">Không tìm thấy tài liệu</p>
                        </div>
                    ) : (
                        filteredDocs.map((doc) => (
                            <div
                                key={doc.id}
                                className="bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 p-3.5 active:scale-[0.98] transition-all"
                            >
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: '#fff7ed' }}
                                >
                                    <File size={18} style={{ color: '#f97316' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                        {doc.name || doc.ten_tai_lieu || 'Tài liệu'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs font-semibold" style={{ color: '#f97316' }}>
                                            {doc.extension || 'PDF'}
                                        </span>
                                        {doc.size && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                <span className="text-xs text-slate-400">{doc.size}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button
                                    className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-all"
                                    style={{ background: '#fff7ed' }}
                                    onClick={() => doc.url && window.open(doc.url, '_blank')}
                                >
                                    <Download size={16} style={{ color: '#f97316' }} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </PullToRefreshWrapper>
    );
}

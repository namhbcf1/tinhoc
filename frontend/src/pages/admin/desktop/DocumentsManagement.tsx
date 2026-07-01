// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import {
  FileText, Plus, RefreshCw, Download, Trash2, X, Upload,
  Search, Users, User, Shield, Calendar, File, ChevronDown,
  Share2, Grid, List, FolderOpen, Globe, Folder, FolderPlus,
  BookOpen, GraduationCap, Monitor
} from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import {
  ADMIN_CACHE_KEYS,
  ADMIN_CACHE_TTL,
  clearAdminCache,
  getAdminCache,
  setAdminCache,
} from '../shared/admin-cache';
import './DocumentsManagement.css';

const ACCESS_TABS = [
  { id: 'all', label: 'Tất cả', icon: FolderOpen },
  { id: 'public', label: 'Công khai', icon: Globe },
  { id: 'class', label: 'Theo lớp', icon: Users },
  { id: 'student', label: 'Cá nhân', icon: User },
  { id: 'admin', label: 'Admin Only', icon: Shield },
];

const FILE_COLORS = {
  pdf: '#DC2626',
  doc: '#2563EB', docx: '#2563EB',
  xls: '#059669', xlsx: '#059669',
  ppt: '#D97706', pptx: '#D97706',
  jpg: '#DB2777', jpeg: '#DB2777', png: '#DB2777', gif: '#DB2777',
  mp4: '#7C3AED', mov: '#7C3AED', webm: '#7C3AED',
  zip: '#64748B', rar: '#64748B',
};

export default function DocumentsManagement({ toast }) {
  const cachedDocuments = getAdminCache(ADMIN_CACHE_KEYS.documents, ADMIN_CACHE_TTL.documents) || [];
  const cachedTargets = getAdminCache(ADMIN_CACHE_KEYS.documentTargets, ADMIN_CACHE_TTL.documentMeta) || {
    offlineClasses: [],
    onlineClasses: [],
    examSchedules: [],
  };
  const cachedFolders = getAdminCache(ADMIN_CACHE_KEYS.documentFolders, ADMIN_CACHE_TTL.documentMeta) || [];

  const [documents, setDocuments] = useState(cachedDocuments);
  const [offlineClasses, setOfflineClasses] = useState(cachedTargets.offlineClasses || []);
  const [onlineClasses, setOnlineClasses] = useState(cachedTargets.onlineClasses || []);
  const [examSchedules, setExamSchedules] = useState(cachedTargets.examSchedules || []);
  const [folders, setFolders] = useState(cachedFolders);
  const [loading, setLoading] = useState(cachedDocuments.length === 0);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareTargets, setShareTargets] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');

  // Upload form data
  const [uploadData, setUploadData] = useState({
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

  const normalizeClassRows = (payload) => {
    const rows = Array.isArray(payload?.data?.classes)
      ? payload.data.classes
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

    return rows.map((item) => ({
      ...item,
      ten_lop: item.ten_lop || item.class_name || '',
      ma_lop: item.ma_lop || item.class_code || '',
    }));
  };

  const normalizeExamSchedules = (payload) => {
    if (Array.isArray(payload?.data)) {
      return payload.data;
    }
    if (Array.isArray(payload?.data?.items)) {
      return payload.data.items;
    }
    if (Array.isArray(payload)) {
      return payload;
    }
    return [];
  };

  useEffect(() => {
    loadDocuments();
    loadAllClasses();
    loadFolders();
  }, []);

  const loadDocuments = async ({ force = false } = {}) => {
    if (!force) {
      const cached = getAdminCache(ADMIN_CACHE_KEYS.documents, ADMIN_CACHE_TTL.documents);
      if (cached) {
        setDocuments(cached);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const response = await api.getAllDocuments();
      const docs = response.success && response.data ? response.data : (response.data || []);
      const nextDocuments = Array.isArray(docs) ? docs : [];
      setDocuments(nextDocuments);
      setAdminCache(ADMIN_CACHE_KEYS.documents, nextDocuments);
    } catch (e) {
      console.error('Load documents error:', e);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllClasses = async ({ force = false } = {}) => {
    if (!force) {
      const cached = getAdminCache(ADMIN_CACHE_KEYS.documentTargets, ADMIN_CACHE_TTL.documentMeta);
      if (cached) {
        setOfflineClasses(cached.offlineClasses || []);
        setOnlineClasses(cached.onlineClasses || []);
        setExamSchedules(cached.examSchedules || []);
        return;
      }
    }

    try {
      const offlineRes = await api.getClasses();
      const nextOfflineClasses = normalizeClassRows(offlineRes);
      setOfflineClasses(nextOfflineClasses);

      let nextOnlineClasses = [];
      try {
        const onlineRes = await api.getOnlineClasses(1000, 0);
        nextOnlineClasses = normalizeClassRows(onlineRes);
        setOnlineClasses(nextOnlineClasses);
      } catch { setOnlineClasses([]); }

      let nextExamSchedules = [];
      try {
        const examRes = await api.request('/exam-schedules');
        nextExamSchedules = normalizeExamSchedules(examRes);
        setExamSchedules(nextExamSchedules);
      } catch { setExamSchedules([]); }

      setAdminCache(ADMIN_CACHE_KEYS.documentTargets, {
        offlineClasses: nextOfflineClasses,
        onlineClasses: nextOnlineClasses,
        examSchedules: nextExamSchedules,
      });
    } catch (e) {
      console.error('Load classes error:', e);
    }
  };

  const loadFolders = async ({ force = false } = {}) => {
    if (!force) {
      const cached = getAdminCache(ADMIN_CACHE_KEYS.documentFolders, ADMIN_CACHE_TTL.documentMeta);
      if (cached) {
        setFolders(cached);
        return;
      }
    }

    try {
      const res = await api.getDocumentFolders('shared');
      const nextFolders = res.data || res.results || res || [];
      setFolders(nextFolders);
      setAdminCache(ADMIN_CACHE_KEYS.documentFolders, nextFolders);
    } catch { setFolders([]); }
  };

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    if (activeTab !== 'all') {
      result = result.filter(d => d.access_type === activeTab);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(d =>
        d.title?.toLowerCase().includes(term) ||
        d.file_name?.toLowerCase().includes(term) ||
        d.description?.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'created_at') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else if (sortConfig.key === 'file_size') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [documents, activeTab, searchTerm, sortConfig]);

  const tabStats = useMemo(() => ({
    all: documents.length,
    public: documents.filter(d => d.access_type === 'public').length,
    class: documents.filter(d => d.access_type === 'class').length,
    student: documents.filter(d => d.access_type === 'student').length,
    admin: documents.filter(d => d.access_type === 'admin').length,
  }), [documents]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await api.createDocumentFolder({ name: newFolderName, scope: 'shared' });
      toast?.success('Tạo folder thành công!');
      setShowFolderModal(false);
      setNewFolderName('');
      clearAdminCache(ADMIN_CACHE_KEYS.documentFolders);
      loadFolders({ force: true });
    } catch (e) {
      toast?.error('Lỗi tạo folder: ' + e.message);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.title || !uploadData.file) {
      toast?.error('Vui lòng nhập tên và chọn file');
      return;
    }

    // Validate class selection for "class" access type
    if (uploadData.access_type === 'class') {
      const totalSelected = uploadData.class_ids.length + uploadData.online_class_ids.length + uploadData.exam_ids.length;
      if (totalSelected === 0) {
        toast?.error('Vui lòng chọn ít nhất 1 lớp/lịch thi');
        return;
      }
      if (uploadData.exam_ids.length > 0) {
        toast?.error('Phân quyền tài liệu theo lịch thi chưa được hỗ trợ');
        return;
      }
    }

    setUploading(true);
    try {
      await api.uploadDocumentWithPermission({
        ...uploadData,
        doc_type: 'general',
        visibility: 'internal',
      });
      toast?.success('Upload tài liệu thành công!');
      setShowUploadModal(false);
      resetUploadForm();
      clearAdminCache(ADMIN_CACHE_KEYS.documents);
      loadDocuments({ force: true });
    } catch (error) {
      toast?.error(error.message || 'Lỗi upload');
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadData({
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
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Xóa tài liệu "${doc.title}"?`)) return;
    try {
      await api.deleteDocument(doc.id);
      toast?.success('Xóa thành công!');
      clearAdminCache(ADMIN_CACHE_KEYS.documents);
      loadDocuments({ force: true });
    } catch (error) {
      toast?.error('Lỗi: ' + error.message);
    }
  };

  const handleDownload = async (doc) => {
    try {
      await api.downloadDocument(doc.id, doc.file_name);
    } catch (error) {
      toast?.error('Lỗi tải tài liệu: ' + error.message);
    }
  };

  const openShareModal = (doc) => {
    setSelectedDoc(doc);
    setShareTargets([]);
    setShowShareModal(true);
  };

  const handleShare = async () => {
    if (!selectedDoc || shareTargets.length === 0) {
      toast?.error('Chọn ít nhất 1 lớp');
      return;
    }
    setSharing(true);
    try {
      await api.shareDocument(selectedDoc.id, shareTargets);
      toast?.success('Đã chia sẻ tài liệu');
      setShowShareModal(false);
      clearAdminCache(ADMIN_CACHE_KEYS.documents);
      loadDocuments({ force: true });
    } catch (e) {
      toast?.error(e.message || 'Lỗi chia sẻ');
    } finally {
      setSharing(false);
    }
  };

  const toggleShareTarget = (targetType, targetId) => {
    const checked = shareTargets.some((target) => target.type === targetType && target.id === targetId);
    if (checked) {
      setShareTargets(shareTargets.filter((target) => !(target.type === targetType && target.id === targetId)));
      return;
    }
    setShareTargets([...shareTargets, { type: targetType, id: targetId }]);
  };

  const toggleClassSelection = (type, id) => {
    const key = type === 'offline' ? 'class_ids' : type === 'online' ? 'online_class_ids' : 'exam_ids';
    setUploadData(prev => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter(x => x !== id) : [...prev[key], id]
    }));
  };

  const getFileExt = (fileName) => fileName?.split('.').pop()?.toLowerCase() || '';
  const getFileColor = (fileName) => FILE_COLORS[getFileExt(fileName)] || '#64748B';
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getAccessBadge = (type) => {
    const map = {
      public: { color: '#059669', bg: '#D1FAE5', label: 'Công khai', icon: Globe },
      class: { color: '#2563EB', bg: '#DBEAFE', label: 'Theo lớp', icon: Users },
      student: { color: '#D97706', bg: '#FEF3C7', label: 'Cá nhân', icon: User },
      admin: { color: '#DC2626', bg: '#FEE2E2', label: 'Admin', icon: Shield },
    };
    const config = map[type] || { color: '#64748B', bg: '#F1F5F9', label: type, icon: File };
    const Icon = config.icon;
    return (
      <span className="doc-access-badge" style={{ background: config.bg, color: config.color }}>
        <Icon size={12} /> {config.label}
      </span>
    );
  };

  return (
    <div className="docs-management">
      {/* Header */}
      <div className="docs-header">
        <div className="docs-header-left">
          <h1><FileText size={28} /> Quản lý Tài liệu</h1>
          <p className="docs-subtitle">{documents.length} tài liệu</p>
        </div>
        <div className="docs-header-right">
          <div className="docs-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              clearAdminCache(ADMIN_CACHE_KEYS.documents);
              clearAdminCache(ADMIN_CACHE_KEYS.documentTargets);
              clearAdminCache(ADMIN_CACHE_KEYS.documentFolders);
              loadDocuments({ force: true });
              loadAllClasses({ force: true });
              loadFolders({ force: true });
            }}
            className="docs-btn docs-btn-ghost"
            title="Làm mới"
          >
            <RefreshCw size={18} />
          </button>
          <button onClick={() => setShowFolderModal(true)} className="docs-btn docs-btn-ghost" title="Tạo Folder">
            <FolderPlus size={18} />
          </button>
          <button onClick={() => setShowUploadModal(true)} className="docs-btn docs-btn-primary">
            <Plus size={18} /> Upload tài liệu
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="docs-tabs">
        {ACCESS_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`docs-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              <span className="docs-tab-count">{tabStats[tab.id]}</span>
            </button>
          );
        })}
        <div className="docs-tabs-right">
          <button
            className={`docs-view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Dạng bảng"
          >
            <List size={18} />
          </button>
          <button
            className={`docs-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Dạng lưới"
          >
            <Grid size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <AdminLoadingState
          title="Đang tải kho tài liệu"
          hint="Danh sách tài liệu, lớp và folder ít đổi được giữ lại để mở lại nhanh hơn."
          variant="desktop-list"
          accent="violet"
        />
      ) : filteredDocuments.length === 0 ? (
        <div className="docs-empty">
          <FolderOpen size={64} />
          <h3>Không có tài liệu</h3>
          <p>{searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có tài liệu nào trong danh mục này'}</p>
          <button onClick={() => setShowUploadModal(true)} className="docs-btn docs-btn-primary">
            <Upload size={18} /> Upload tài liệu đầu tiên
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="docs-table-wrapper">
          <table className="docs-table">
            <thead>
              <tr>
                <th className="th-index">#</th>
                <th className="th-sortable" onClick={() => handleSort('title')}>
                  Tên tài liệu
                  {sortConfig.key === 'title' && (
                    <ChevronDown size={14} className={sortConfig.direction === 'asc' ? 'rotated' : ''} />
                  )}
                </th>
                <th>Loại</th>
                <th>Phân quyền</th>
                <th className="th-sortable" onClick={() => handleSort('file_size')}>
                  Dung lượng
                  {sortConfig.key === 'file_size' && (
                    <ChevronDown size={14} className={sortConfig.direction === 'asc' ? 'rotated' : ''} />
                  )}
                </th>
                <th className="th-sortable" onClick={() => handleSort('created_at')}>
                  Ngày tạo
                  {sortConfig.key === 'created_at' && (
                    <ChevronDown size={14} className={sortConfig.direction === 'asc' ? 'rotated' : ''} />
                  )}
                </th>
                <th className="th-actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc, idx) => (
                <tr key={doc.id}>
                  <td className="td-index">{idx + 1}</td>
                  <td className="td-title">
                    <div className="doc-title-cell">
                      <div className="doc-icon" style={{ background: getFileColor(doc.file_name) }}>
                        {getFileExt(doc.file_name).toUpperCase().slice(0, 3)}
                      </div>
                      <div className="doc-info">
                        <span className="doc-name">{doc.title}</span>
                        <span className="doc-filename">{doc.file_name}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="doc-ext-badge" style={{ background: getFileColor(doc.file_name) + '20', color: getFileColor(doc.file_name) }}>
                      {getFileExt(doc.file_name).toUpperCase()}
                    </span>
                  </td>
                  <td>{getAccessBadge(doc.access_type)}</td>
                  <td className="td-size">{formatFileSize(doc.file_size)}</td>
                  <td className="td-date">
                    <Calendar size={12} /> {formatDateVN(doc.created_at)}
                  </td>
                  <td className="td-actions">
                    <button onClick={() => openShareModal(doc)} className="docs-action-btn" title="Chia sẻ">
                      <Share2 size={16} />
                    </button>
                    <button onClick={() => handleDownload(doc)} className="docs-action-btn" title="Tải xuống">
                      <Download size={16} />
                    </button>
                    <button onClick={() => handleDelete(doc)} className="docs-action-btn danger" title="Xóa">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="docs-grid">
          {filteredDocuments.map(doc => (
            <div key={doc.id} className="docs-card">
              <div className="docs-card-icon" style={{ background: getFileColor(doc.file_name) }}>
                {getFileExt(doc.file_name).toUpperCase().slice(0, 3)}
              </div>
              <div className="docs-card-content">
                <h4 className="docs-card-title">{doc.title}</h4>
                <p className="docs-card-meta">{doc.file_name}</p>
                <div className="docs-card-badges">{getAccessBadge(doc.access_type)}</div>
              </div>
              <div className="docs-card-footer">
                <span className="docs-card-date"><Calendar size={12} /> {formatDateVN(doc.created_at)}</span>
                <span className="docs-card-size">{formatFileSize(doc.file_size)}</span>
              </div>
              <div className="docs-card-actions">
                <button onClick={() => openShareModal(doc)} title="Chia sẻ"><Share2 size={16} /></button>
                <button onClick={() => handleDownload(doc)} title="Tải xuống"><Download size={16} /></button>
                <button onClick={() => handleDelete(doc)} className="danger" title="Xóa"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal - HORIZONTAL LAYOUT */}
      {showUploadModal && (
        <div className="docs-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="docs-modal docs-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="docs-modal-header">
              <h2><Upload size={22} /> Upload tài liệu mới</h2>
              <button className="docs-modal-close" onClick={() => setShowUploadModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="docs-modal-body">
              {/* 2-Column Layout */}
              <div className="upload-layout">
                {/* Left Column - File & Basic Info */}
                <div className="upload-col">
                  <div className="docs-form-group">
                    <label>Chọn file <span className="required">*</span></label>
                    <div
                      className={`docs-file-drop ${uploadData.file ? 'has-file' : ''}`}
                      onClick={() => document.getElementById('file-upload').click()}
                    >
                      <input
                        id="file-upload"
                        type="file"
                        onChange={e => setUploadData({ ...uploadData, file: e.target.files[0] })}
                        style={{ display: 'none' }}
                      />
                      {uploadData.file ? (
                        <div className="docs-file-preview">
                          <div className="file-icon" style={{ background: getFileColor(uploadData.file.name) }}>
                            {getFileExt(uploadData.file.name).toUpperCase().slice(0, 3)}
                          </div>
                          <div className="file-info">
                            <span className="file-name">{uploadData.file.name}</span>
                            <span className="file-size">{formatFileSize(uploadData.file.size)}</span>
                          </div>
                          <button type="button" onClick={e => { e.stopPropagation(); setUploadData({ ...uploadData, file: null }); }}>
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload size={32} />
                          <p>Kéo thả hoặc click</p>
                          <span>Tối đa 1GB</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="docs-form-group">
                    <label>Tên tài liệu <span className="required">*</span></label>
                    <input
                      type="text"
                      value={uploadData.title}
                      onChange={e => setUploadData({ ...uploadData, title: e.target.value })}
                      placeholder="Nhập tên tài liệu"
                      required
                    />
                  </div>

                  <div className="docs-form-group">
                    <label>Mô tả</label>
                    <textarea
                      value={uploadData.description}
                      onChange={e => setUploadData({ ...uploadData, description: e.target.value })}
                      placeholder="Mô tả ngắn (tùy chọn)"
                      rows={2}
                    />
                  </div>

                  <div className="docs-form-group">
                    <label>Folder (tùy chọn)</label>
                    <select
                      value={uploadData.folder_id || ''}
                      onChange={e => setUploadData({ ...uploadData, folder_id: e.target.value ? parseInt(e.target.value) : null })}
                    >
                      <option value="">-- Không chọn --</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Right Column - Access & Classes */}
                <div className="upload-col">
                  <div className="docs-form-group">
                    <label>Phân quyền truy cập</label>
                    <div className="docs-access-options-horizontal">
                      {[
                        { id: 'public', label: 'Công khai', icon: Globe },
                        { id: 'class', label: 'Theo lớp', icon: Users },
                        { id: 'student', label: 'Cá nhân', icon: User },
                        { id: 'admin', label: 'Admin Only', icon: Shield },
                      ].map(opt => {
                        const Icon = opt.icon;
                        return (
                          <label
                            key={opt.id}
                            className={`docs-access-chip ${uploadData.access_type === opt.id ? 'selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name="access_type"
                              value={opt.id}
                              checked={uploadData.access_type === opt.id}
                              onChange={e => setUploadData({ ...uploadData, access_type: e.target.value, class_ids: [], online_class_ids: [], exam_ids: [], cccd: '' })}
                            />
                            <Icon size={16} />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {uploadData.access_type === 'class' && (
                    <div className="docs-form-group">
                      <label>Chọn lớp / lịch thi để chia sẻ</label>
                      <div className="class-selection-tabs">
                        {/* Offline Classes */}
                        {offlineClasses.length > 0 && (
                          <div className="class-group">
                            <div className="class-group-header">
                              <BookOpen size={14} /> Lớp học offline ({offlineClasses.length})
                            </div>
                            <div className="class-list-scroll">
                              {offlineClasses.map(cls => (
                                <label key={`off-${cls.id}`} className="class-checkbox">
                                  <input
                                    type="checkbox"
                                    checked={uploadData.class_ids.includes(cls.id)}
                                    onChange={() => toggleClassSelection('offline', cls.id)}
                                  />
                                  <span>{cls.ten_lop}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Online Classes */}
                        {onlineClasses.length > 0 && (
                          <div className="class-group">
                            <div className="class-group-header">
                              <Monitor size={14} /> Lớp học online ({onlineClasses.length})
                            </div>
                            <div className="class-list-scroll">
                              {onlineClasses.map(cls => (
                                <label key={`on-${cls.id}`} className="class-checkbox">
                                  <input
                                    type="checkbox"
                                    checked={uploadData.online_class_ids.includes(cls.id)}
                                    onChange={() => toggleClassSelection('online', cls.id)}
                                  />
                                  <span>{cls.name || cls.ten_lop}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Exam Schedules */}
                        {examSchedules.length > 0 && (
                          <div className="class-group">
                            <div className="class-group-header">
                              <GraduationCap size={14} /> Lịch thi ({examSchedules.length})
                            </div>
                            <div className="class-list-scroll">
                              {examSchedules.map(exam => (
                                <label key={`exam-${exam.id}`} className="class-checkbox">
                                  <input
                                    type="checkbox"
                                    checked={uploadData.exam_ids.includes(exam.id)}
                                    onChange={() => toggleClassSelection('exam', exam.id)}
                                  />
                                  <span>{exam.name || exam.title || `Thi ${formatDateVN(exam.exam_date)}`}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {offlineClasses.length === 0 && onlineClasses.length === 0 && examSchedules.length === 0 && (
                          <div className="no-classes">Chưa có lớp nào. Vui lòng tạo lớp trước.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {uploadData.access_type === 'student' && (
                    <div className="docs-form-group">
                      <label>CCCD học viên</label>
                      <input
                        type="text"
                        value={uploadData.cccd}
                        onChange={e => setUploadData({ ...uploadData, cccd: e.target.value })}
                        placeholder="Nhập số CCCD"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="docs-modal-footer">
                <button type="button" onClick={() => setShowUploadModal(false)} className="docs-btn docs-btn-ghost">
                  Hủy
                </button>
                <button type="submit" className="docs-btn docs-btn-primary" disabled={uploading}>
                  {uploading ? 'Đang upload...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="docs-modal-overlay" onClick={() => setShowFolderModal(false)}>
          <div className="docs-modal docs-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="docs-modal-header">
              <h2><FolderPlus size={22} /> Tạo Folder mới</h2>
              <button className="docs-modal-close" onClick={() => setShowFolderModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="docs-modal-body">
              <div className="docs-form-group">
                <label>Tên folder</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="Nhập tên folder"
                  autoFocus
                />
              </div>
            </div>
            <div className="docs-modal-footer">
              <button onClick={() => setShowFolderModal(false)} className="docs-btn docs-btn-ghost">Hủy</button>
              <button onClick={handleCreateFolder} className="docs-btn docs-btn-primary">Tạo</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && selectedDoc && (
        <div className="docs-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="docs-modal docs-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="docs-modal-header share">
              <h2><Share2 size={22} /> Chia sẻ tài liệu</h2>
              <button className="docs-modal-close" onClick={() => setShowShareModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="docs-modal-body">
              <div className="share-doc-info">
                <div className="doc-icon" style={{ background: getFileColor(selectedDoc.file_name) }}>
                  {getFileExt(selectedDoc.file_name).toUpperCase().slice(0, 3)}
                </div>
                <div>
                  <h4>{selectedDoc.title}</h4>
                  <span>{selectedDoc.file_name}</span>
                </div>
              </div>

              <div className="docs-form-group">
                <label>Chia sẻ với lớp</label>
                <div className="docs-class-list">
                  {offlineClasses.map((cls) => {
                    const checked = shareTargets.some((target) => target.type === 'offline_class' && target.id === cls.id);
                    return (
                      <label key={`offline-${cls.id}`} className="docs-checkbox">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleShareTarget('offline_class', cls.id)}
                        />
                        <span>{cls.ten_lop}</span>
                      </label>
                    );
                  })}
                  {onlineClasses.map((cls) => {
                    const checked = shareTargets.some((target) => target.type === 'online_class' && target.id === cls.id);
                    return (
                      <label key={`online-${cls.id}`} className="docs-checkbox">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleShareTarget('online_class', cls.id)}
                        />
                        <span>{cls.ten_lop || cls.class_name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="docs-modal-footer">
              <button type="button" onClick={() => setShowShareModal(false)} className="docs-btn docs-btn-ghost">Đóng</button>
              <button onClick={handleShare} className="docs-btn docs-btn-primary" disabled={sharing || shareTargets.length === 0}>
                {sharing ? 'Đang chia sẻ...' : `Chia sẻ (${shareTargets.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Calendar,
  Check,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  Edit2,
  Eye,
  FileSpreadsheet,
  FileText,
  Globe,
  History,
  Home,
  ImagePlus,
  LayoutGrid,
  Loader2,
  Newspaper,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Shield,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import { useToast } from '../../../components/ui/ToastContainer';
import OverlayPortal from '../../../components/ui/OverlayPortal';
import { formatDateVN, getCurrentDateVN } from '../../../utils/dateUtils';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';
const POST_CATEGORIES = [
  { value: 'general', label: 'Chung' },
  { value: 'tuyensinh', label: 'Tuyển sinh' },
  { value: 'thongbao', label: 'Thông báo' },
  { value: 'tintuc', label: 'Tin tức' },
  { value: 'sukien', label: 'Sự kiện' },
];
const POST_STATUSES = [
  { value: 'draft', label: 'Nháp' },
  { value: 'published', label: 'Đã đăng' },
  { value: 'archived', label: 'Lưu trữ' },
];
const ADMIN_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'moderator', label: 'Moderator' },
];
const ADMIN_STATUSES = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'inactive', label: 'Khóa' },
];
const BACKUP_TABLES = ['students', 'classes', 'registrations', 'payments', 'certificates', 'admins'];

function BottomSheet({ isOpen, onClose, title, children, height = '100dvh' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }

    document.body.style.overflow = '';
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[100000]">
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
          onClick={onClose}
          aria-label="Đóng"
        />
        <div
          className="absolute inset-0 bg-white shadow-2xl"
          style={{ height, maxHeight: '100dvh' }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-base font-black tracking-tight text-slate-900">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500"
            >
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: 'calc(100dvh - 73px)' }}>
            {children}
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}

function ModuleHero({ icon: Icon, title, description, iconTone = 'bg-blue-600', actions }) {
  return (
    <div className="mx-4 mb-3 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Admin mobile</p>
          <h2 className="text-[15px] font-black tracking-tight text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-[12px] text-slate-500">{description}</p> : null}
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconTone} text-white shadow-sm`}>
          <Icon size={16} />
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function StatCard({ label, value, tone = 'slate' }) {
  const toneClass = {
    slate: 'bg-slate-50 text-slate-900 border-slate-200',
    blue: 'bg-blue-50 text-blue-900 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
    violet: 'bg-violet-50 text-violet-900 border-violet-200',
    rose: 'bg-rose-50 text-rose-900 border-rose-200',
  }[tone];

  return (
    <div className={`rounded-xl border p-2 shadow-sm ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">{label}</p>
      <p className="mt-0.5 text-[13px] font-black tracking-tight">{value}</p>
    </div>
  );
}

function SectionCard({ title, description, actions, children }) {
  return (
    <div className="mx-4 mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-black tracking-tight text-slate-900">{title}</h3>
          {description ? <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

function SearchField({ value, onChange, placeholder = 'Tìm kiếm...' }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-300 focus:bg-white"
      />
    </div>
  );
}

function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function StatusBadge({ children, tone = 'slate' }) {
  const toneClass = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    violet: 'bg-violet-100 text-violet-700',
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass}`}>
      {children}
    </span>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <LayoutGrid size={22} />
      </div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}
    </div>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function downloadJsonOrCsv(url, filename, token) {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error('Không thể tải file');
    }

    const blob = await response.blob();
    downloadBlob(blob, filename);
  });
}

export function MobilePostsModule() {
  const { success, error } = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'general',
    tags: '',
    featured_image: '',
    status: 'draft',
  });

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await api.getPosts();
      setPosts(Array.isArray(response?.data) ? response.data : []);
    } catch (loadError) {
      error(`Không thể tải bài viết: ${loadError.message}`);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);
  useAdminAutoRefresh(() => loadPosts(), { minIntervalMs: 15000 });

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchSearch = !searchTerm
        || [post.title, post.excerpt, post.content, post.tags].filter(Boolean).join(' ').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = !statusFilter || post.status === statusFilter;
      const matchCategory = !categoryFilter || post.category === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [posts, searchTerm, statusFilter, categoryFilter]);

  const openCreate = () => {
    setEditingPost(null);
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      category: 'general',
      tags: '',
      featured_image: '',
      status: 'draft',
    });
    setEditorOpen(true);
  };

  const openEdit = (post) => {
    setEditingPost(post);
    setFormData({
      title: post.title || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      category: post.category || 'general',
      tags: post.tags || '',
      featured_image: post.featured_image || '',
      status: post.status || 'draft',
    });
    setEditorOpen(true);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(`${api.baseURL}/students/upload-image`, {
        method: 'POST',
        body,
      });
      const result = await response.json();
      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload ảnh thất bại');
      }
      setFormData((current) => ({ ...current, featured_image: result.url }));
      success('Đã tải ảnh đại diện');
    } catch (uploadError) {
      error(`Upload ảnh lỗi: ${uploadError.message}`);
    } finally {
      setUploadingImage(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      error('Tiêu đề và nội dung là bắt buộc');
      return;
    }

    setSubmitting(true);
    try {
      if (editingPost) {
        await api.updatePost(editingPost.id, formData);
        success('Đã cập nhật bài viết');
      } else {
        await api.createPost(formData);
        success('Đã tạo bài viết');
      }
      setEditorOpen(false);
      await loadPosts();
    } catch (submitError) {
      error(`Không thể lưu bài viết: ${submitError.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (post) => {
    if (!window.confirm(`Xóa bài viết "${post.title}"?`)) return;

    try {
      await api.deletePost(post.id);
      success('Đã xóa bài viết');
      await loadPosts();
    } catch (deleteError) {
      error(`Không thể xóa bài viết: ${deleteError.message}`);
    }
  };

  const handleTogglePublish = async (post) => {
    try {
      if (post.status === 'published') {
        await api.unpublishPost(post.id);
        success('Đã chuyển về nháp');
      } else {
        await api.publishPost(post.id);
        success('Đã đăng bài');
      }
      await loadPosts();
    } catch (toggleError) {
      error(`Không thể đổi trạng thái: ${toggleError.message}`);
    }
  };

  return (
    <PullToRefreshWrapper onRefresh={loadPosts}>
      <div className="pb-[calc(var(--mb-bottom-nav-height,70px)+20px)]">
        <ModuleHero
          icon={Newspaper}
          title="Quản lý bài viết"
          description=""
          actions={(
            <>
              <SecondaryButton onClick={loadPosts} className="border-white/20 bg-white/10 text-white">
                <RefreshCw size={16} />
                Làm mới
              </SecondaryButton>
              <PrimaryButton onClick={openCreate} className="bg-white text-slate-900 shadow-none">
                <Plus size={16} />
                Tạo bài
              </PrimaryButton>
            </>
          )}
        />

        <SectionCard
          title="Tổng quan nội dung"
          description=""
        >
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Tổng bài viết" value={posts.length} tone="blue" />
            <StatCard label="Đã đăng" value={posts.filter((post) => post.status === 'published').length} tone="emerald" />
            <StatCard label="Nháp" value={posts.filter((post) => post.status === 'draft').length} tone="amber" />
            <StatCard label="Thông báo" value={posts.filter((post) => post.category === 'thongbao').length} tone="violet" />
          </div>
        </SectionCard>

        <SectionCard title="Tìm và lọc">
          <div className="space-y-3">
            <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Tìm theo tiêu đề, tóm tắt, tags..." />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[16px] text-slate-900"
              >
                <option value="">Tất cả trạng thái</option>
                {POST_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[16px] text-slate-900"
              >
                <option value="">Tất cả danh mục</option>
                {POST_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Danh sách bài viết" description={`${filteredPosts.length} bài`}>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : filteredPosts.length ? (
            <div className="space-y-3">
              {filteredPosts.map((post) => (
                <div key={post.id} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                  {post.featured_image ? (
                    <div
                      className="h-36 w-full bg-slate-200 bg-cover bg-center"
                      style={{ backgroundImage: `url(${post.featured_image})` }}
                    />
                  ) : null}
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={post.status === 'published' ? 'emerald' : post.status === 'draft' ? 'amber' : 'slate'}>
                        {post.status === 'published' ? <CheckCircle2 size={12} /> : post.status === 'draft' ? <Clock3 size={12} /> : <Archive size={12} />}
                        {post.status === 'published' ? 'Đã đăng' : post.status === 'draft' ? 'Nháp' : 'Lưu trữ'}
                      </StatusBadge>
                      <StatusBadge tone="blue">{POST_CATEGORIES.find((item) => item.value === post.category)?.label || 'Chung'}</StatusBadge>
                    </div>
                    <div>
                      <h4 className="text-base font-black tracking-tight text-slate-900">{post.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{post.excerpt || 'Chưa có tóm tắt'}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                      <span>{formatDateVN(post.created_at, true)}</span>
                      <span>{post.tags || 'Không có tags'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <SecondaryButton onClick={() => openEdit(post)}>
                        <Edit2 size={15} />
                        Sửa
                      </SecondaryButton>
                      <SecondaryButton onClick={() => handleTogglePublish(post)}>
                        {post.status === 'published' ? <Archive size={15} /> : <Send size={15} />}
                        {post.status === 'published' ? 'Gỡ bài' : 'Đăng bài'}
                      </SecondaryButton>
                    </div>
                    <SecondaryButton onClick={() => handleDelete(post)} className="w-full border-rose-200 bg-rose-50 text-rose-700">
                      <Trash2 size={15} />
                      Xóa bài viết
                    </SecondaryButton>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Không có bài viết" />
          )}
        </SectionCard>
      </div>

      <BottomSheet isOpen={editorOpen} onClose={() => setEditorOpen(false)} title={editingPost ? 'Cập nhật bài viết' : 'Tạo bài viết'}>
        <div className="space-y-4 pb-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Tiêu đề</label>
            <input
              type="text"
              value={formData.title}
              onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Tóm tắt</label>
            <textarea
              value={formData.excerpt}
              onChange={(event) => setFormData((current) => ({ ...current, excerpt: event.target.value }))}
              className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[16px] text-slate-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Danh mục</label>
              <select
                value={formData.category}
                onChange={(event) => setFormData((current) => ({ ...current, category: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
              >
                {POST_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Trạng thái</label>
              <select
                value={formData.status}
                onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
              >
                {POST_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Tags</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(event) => setFormData((current) => ({ ...current, tags: event.target.value }))}
              placeholder="IELTS, vstep, khai giảng..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Ảnh đại diện</label>
            <div className="space-y-2">
              <input
                type="url"
                value={formData.featured_image}
                onChange={(event) => setFormData((current) => ({ ...current, featured_image: event.target.value }))}
                placeholder="https://..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
              />
              <div className="flex gap-2">
                <SecondaryButton onClick={() => fileInputRef.current?.click()} className="flex-1">
                  {uploadingImage ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                  Tải ảnh lên
                </SecondaryButton>
                {formData.featured_image ? (
                  <SecondaryButton onClick={() => window.open(formData.featured_image, '_blank')} className="flex-1">
                    <Eye size={15} />
                    Xem ảnh
                  </SecondaryButton>
                ) : null}
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Nội dung</label>
            <textarea
              value={formData.content}
              onChange={(event) => setFormData((current) => ({ ...current, content: event.target.value }))}
              className="min-h-48 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[16px] text-slate-900"
            />
          </div>
          <PrimaryButton onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {editingPost ? 'Lưu cập nhật' : 'Tạo bài viết'}
          </PrimaryButton>
        </div>
      </BottomSheet>
    </PullToRefreshWrapper>
  );
}

export function MobileHomepageModule() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    bannerEnabled: true,
    statsEnabled: true,
    servicesEnabled: true,
    whyChooseEnabled: true,
    ctaEnabled: true,
    bannerTitle: '',
    bannerDescription: '',
    bannerImage: '',
    yearsExperience: 0,
    totalStudents: 0,
    totalPrograms: 0,
    contactPhone: '',
    contactEmail: '',
    contactAddress: '',
    facebookUrl: '',
    zaloUrl: '',
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await api.getHomepageSettings();
      if (response?.success && response.data) {
        setSettings((current) => ({ ...current, ...response.data }));
      }
    } catch (loadError) {
      error(`Không thể tải cài đặt: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);
  useAdminAutoRefresh(() => loadSettings(), { minIntervalMs: 15000 });

  const handleChange = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateHomepageSettings(settings);
      success('Đã lưu cài đặt trang chủ');
    } catch (saveError) {
      error(`Không thể lưu: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const enabledSections = ['bannerEnabled', 'statsEnabled', 'servicesEnabled', 'whyChooseEnabled', 'ctaEnabled']
    .filter((key) => settings[key]).length;

  return (
    <PullToRefreshWrapper onRefresh={loadSettings}>
      <div className="pb-[calc(var(--mb-bottom-nav-height,70px)+20px)]">
        <ModuleHero
          icon={Home}
          title="Quản lý trang chủ"
          description=""
          iconTone="bg-emerald-600"
          actions={(
            <>
              <SecondaryButton onClick={loadSettings} className="border-white/20 bg-white/10 text-white">
                <RefreshCw size={16} />
                Đồng bộ
              </SecondaryButton>
              <PrimaryButton onClick={handleSave} disabled={saving} className="bg-white text-slate-900 shadow-none">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Lưu
              </PrimaryButton>
            </>
          )}
        />

        <SectionCard title="Snapshot" description="">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Section đang bật" value={enabledSections} tone="emerald" />
            <StatCard label="Số học viên" value={settings.totalStudents || 0} tone="blue" />
            <StatCard label="Chương trình" value={settings.totalPrograms || 0} tone="violet" />
          </div>
        </SectionCard>

        <SectionCard title="Hiển thị section" description="">
          <div className="space-y-3">
            {[
              ['bannerEnabled', 'Banner hero'],
              ['statsEnabled', 'Khối thống kê'],
              ['servicesEnabled', 'Khối dịch vụ'],
              ['whyChooseEnabled', 'Khối lý do chọn'],
              ['ctaEnabled', 'Khối CTA'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings[key])}
                  onChange={() => handleChange(key, !settings[key])}
                  className="h-5 w-5 rounded"
                />
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Nội dung hero">
          <div className="space-y-3">
            <input
              type="text"
              value={settings.bannerTitle || ''}
              onChange={(event) => handleChange('bannerTitle', event.target.value)}
              placeholder="Tiêu đề banner"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
            />
            <textarea
              value={settings.bannerDescription || ''}
              onChange={(event) => handleChange('bannerDescription', event.target.value)}
              placeholder="Mô tả banner"
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[16px] text-slate-900"
            />
            <input
              type="url"
              value={settings.bannerImage || ''}
              onChange={(event) => handleChange('bannerImage', event.target.value)}
              placeholder="URL ảnh banner"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
            />
          </div>
        </SectionCard>

        <SectionCard title="Số liệu nổi bật">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['yearsExperience', 'Năm kinh nghiệm'],
              ['totalStudents', 'Học viên'],
              ['totalPrograms', 'Chương trình'],
            ].map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</label>
                <input
                  type="number"
                  value={settings[key] || 0}
                  onChange={(event) => handleChange(key, Number(event.target.value || 0))}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
                />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Thông tin liên hệ">
          <div className="space-y-3">
            <input
              type="tel"
              value={settings.contactPhone || ''}
              onChange={(event) => handleChange('contactPhone', event.target.value)}
              placeholder="Số điện thoại"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
            />
            <input
              type="email"
              value={settings.contactEmail || ''}
              onChange={(event) => handleChange('contactEmail', event.target.value)}
              placeholder="Email"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
            />
            <textarea
              value={settings.contactAddress || ''}
              onChange={(event) => handleChange('contactAddress', event.target.value)}
              placeholder="Địa chỉ"
              className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[16px] text-slate-900"
            />
            <input
              type="url"
              value={settings.facebookUrl || ''}
              onChange={(event) => handleChange('facebookUrl', event.target.value)}
              placeholder="Facebook URL"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
            />
            <input
              type="url"
              value={settings.zaloUrl || ''}
              onChange={(event) => handleChange('zaloUrl', event.target.value)}
              placeholder="Zalo URL"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
            />
          </div>
        </SectionCard>

        {loading ? <div className="mx-4 rounded-2xl bg-slate-100 p-8 text-center text-sm text-slate-500">Đang tải cài đặt...</div> : null}
      </div>
    </PullToRefreshWrapper>
  );
}

export function MobileLogsModule() {
  const { error } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await api.getActivityLogs(null, 200, 0);
      setLogs(Array.isArray(response?.data) ? response.data : []);
    } catch (loadError) {
      error(`Không thể tải nhật ký: ${loadError.message}`);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);
  useAdminAutoRefresh(() => loadLogs(), { minIntervalMs: 15000 });

  const uniqueActions = [...new Set(logs.map((log) => log.action).filter(Boolean))];

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchable = [log.admin_username, log.admin_name, log.description, log.entity_type, log.action].filter(Boolean).join(' ').toLowerCase();
      const matchSearch = !searchTerm || searchable.includes(searchTerm.toLowerCase());
      const matchAction = !actionFilter || log.action === actionFilter;
      return matchSearch && matchAction;
    });
  }, [logs, searchTerm, actionFilter]);

  return (
    <PullToRefreshWrapper onRefresh={loadLogs}>
      <div className="pb-[calc(var(--mb-bottom-nav-height,70px)+20px)]">
        <ModuleHero
          icon={History}
          title="Nhật ký hoạt động"
          description=""
          iconTone="bg-slate-700"
          actions={(
            <SecondaryButton onClick={loadLogs} className="border-white/20 bg-white/10 text-white">
              <RefreshCw size={16} />
              Làm mới
            </SecondaryButton>
          )}
        />

        <SectionCard title="Lọc nhật ký">
          <div className="space-y-3">
            <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Tìm kiếm..." />
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
            >
              <option value="">Tất cả hành động</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>
        </SectionCard>

        <SectionCard title="Timeline" description="">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : filteredLogs.length ? (
            <div className="space-y-3">
              {filteredLogs.map((log, index) => (
                <button
                  type="button"
                  key={log.id || index}
                  onClick={() => setSelectedLog(log)}
                  className="w-full rounded-[22px] border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">{log.admin_username || log.admin_name || 'Hệ thống'}</p>
                      <p className="mt-1 text-xs text-slate-500">{log.entity_type || 'system'}</p>
                    </div>
                    <StatusBadge tone="blue">{log.action || 'action'}</StatusBadge>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{log.description || `Thực hiện thao tác ${log.action}`}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-400">{formatDateVN(log.created_at, true)}</p>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="Không có bản ghi phù hợp" />
          )}
        </SectionCard>
      </div>

      <BottomSheet isOpen={Boolean(selectedLog)} onClose={() => setSelectedLog(null)} title="Chi tiết nhật ký">
        {selectedLog ? (
          <div className="space-y-3 pb-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Admin</p>
              <p className="mt-1 text-base font-black text-slate-900">{selectedLog.admin_username || selectedLog.admin_name || 'Hệ thống'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Hành động</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{selectedLog.action}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Thời gian</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{formatDateVN(selectedLog.created_at, true)}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Mô tả</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">{selectedLog.description || 'Không có mô tả chi tiết'}</p>
            </div>
            {selectedLog.details ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-sm text-slate-100">
                <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5">
                  {typeof selectedLog.details === 'object'
                    ? JSON.stringify(selectedLog.details, null, 2)
                    : selectedLog.details}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>
    </PullToRefreshWrapper>
  );
}

export function MobileBackupModule() {
  const { success, error } = useToast();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const response = await api.listBackups();
      if (response?.success) {
        setBackups(response.data || []);
      } else {
        setBackups(Array.isArray(response?.data) ? response.data : []);
      }
    } catch (loadError) {
      error(`Không thể tải backup: ${loadError.message}`);
      setBackups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await api.createBackup();
      success('Đã tạo backup');
      await loadBackups();
    } catch (createError) {
      error(`Tạo backup lỗi: ${createError.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (backupKey) => {
    if (!window.confirm(`Restore backup ${backupKey}? Dữ liệu hiện tại sẽ bị ghi đè.`)) return;

    try {
      await api.restoreBackup(backupKey);
      success('Đã restore backup');
      await loadBackups();
    } catch (restoreError) {
      error(`Restore lỗi: ${restoreError.message}`);
    }
  };

  const handleExportJson = async () => {
    try {
      await downloadJsonOrCsv(
        `${api.baseURL}/backup/export/json`,
        `backup-${getCurrentDateVN(true)}.json`,
        api.getToken(),
      );
      success('Đã tải JSON');
    } catch (exportError) {
      error(`Xuất JSON lỗi: ${exportError.message}`);
    }
  };

  const handleExportCsv = async (tableName) => {
    try {
      await downloadJsonOrCsv(
        `${api.baseURL}/backup/export/csv/${tableName}`,
        `${tableName}-${getCurrentDateVN(true)}.csv`,
        api.getToken(),
      );
      success(`Đã tải CSV ${tableName}`);
    } catch (exportError) {
      error(`Xuất CSV lỗi: ${exportError.message}`);
    }
  };

  return (
    <PullToRefreshWrapper onRefresh={loadBackups}>
      <div className="pb-[calc(var(--mb-bottom-nav-height,70px)+20px)]">
        <ModuleHero
          icon={Database}
          title="Sao lưu dữ liệu"
          description=""
          iconTone="bg-slate-700"
          actions={(
            <>
              <SecondaryButton onClick={loadBackups} className="border-white/20 bg-white/10 text-white">
                <RefreshCw size={16} />
                Làm mới
              </SecondaryButton>
              <PrimaryButton onClick={handleCreateBackup} disabled={creating} className="bg-white text-slate-900 shadow-none">
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Tạo backup
              </PrimaryButton>
            </>
          )}
        />

        <SectionCard title="Xuất dữ liệu" description="">
          <div className="space-y-3">
            <PrimaryButton onClick={handleExportJson} className="w-full bg-slate-900 text-white shadow-none">
              <Download size={16} />
              Xuất JSON toàn bộ
            </PrimaryButton>
            <div className="grid grid-cols-2 gap-2">
              {BACKUP_TABLES.map((tableName) => (
                <SecondaryButton key={tableName} onClick={() => handleExportCsv(tableName)} className="justify-start">
                  <FileSpreadsheet size={15} />
                  {tableName}
                </SecondaryButton>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Danh sách backup" description="">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : backups.length ? (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div key={backup.key} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">{backup.key?.split('/').pop() || backup.key}</p>
                      <p className="mt-1 text-xs text-slate-500">Ngày tạo: {formatDateVN(backup.uploaded, true)}</p>
                      <p className="mt-1 text-xs text-slate-500">Dung lượng: {backup.size ? `${(backup.size / 1024).toFixed(2)} KB` : 'Không rõ'}</p>
                    </div>
                    <StatusBadge tone="blue">Ready</StatusBadge>
                  </div>
                  <div className="mt-3">
                    <SecondaryButton onClick={() => handleRestore(backup.key)} className="w-full border-amber-200 bg-amber-50 text-amber-700">
                      <RefreshCw size={15} />
                      Restore backup này
                    </SecondaryButton>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có backup nào" />
          )}
        </SectionCard>
      </div>
    </PullToRefreshWrapper>
  );
}

export function MobileAdminsModule() {
  const { success, error } = useToast();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    phone: '',
    role: 'admin',
    status: 'active',
  });

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const response = await api.getAdmins();
      setAdmins(Array.isArray(response?.data) ? response.data : []);
    } catch (loadError) {
      error(`Không thể tải admin: ${loadError.message}`);
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);
  useAdminAutoRefresh(() => loadAdmins(), { minIntervalMs: 15000 });

  const filteredAdmins = useMemo(() => {
    return admins.filter((admin) => {
      const searchable = [admin.username, admin.full_name, admin.email, admin.phone].filter(Boolean).join(' ').toLowerCase();
      return !searchTerm || searchable.includes(searchTerm.toLowerCase());
    });
  }, [admins, searchTerm]);

  const openCreate = () => {
    setEditingAdmin(null);
    setFormData({
      username: '',
      password: '',
      email: '',
      phone: '',
      role: 'admin',
      status: 'active',
    });
    setSheetOpen(true);
  };

  const openEdit = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      username: admin.username || '',
      password: '',
      email: admin.email || '',
      phone: admin.phone || '',
      role: admin.role || 'admin',
      status: admin.status || 'active',
    });
    setSheetOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.username.trim()) {
      error('Username là bắt buộc');
      return;
    }
    if (!editingAdmin && !formData.password.trim()) {
      error('Mật khẩu là bắt buộc khi tạo mới');
      return;
    }

    setSubmitting(true);
    try {
      if (editingAdmin) {
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        await api.updateAdmin(editingAdmin.id, payload);
        success('Đã cập nhật admin');
      } else {
        await api.createAdmin(formData);
        success('Đã tạo admin');
      }
      setSheetOpen(false);
      await loadAdmins();
    } catch (submitError) {
      error(`Không thể lưu admin: ${submitError.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin) => {
    try {
      await api.updateAdmin(admin.id, { status: admin.status === 'active' ? 'inactive' : 'active' });
      success('Đã cập nhật trạng thái');
      await loadAdmins();
    } catch (toggleError) {
      error(`Không thể đổi trạng thái: ${toggleError.message}`);
    }
  };

  const handleDelete = async (admin) => {
    if (!window.confirm(`Xóa admin ${admin.username}?`)) return;

    try {
      await api.deleteAdmin(admin.id);
      success('Đã xóa admin');
      await loadAdmins();
    } catch (deleteError) {
      error(`Không thể xóa admin: ${deleteError.message}`);
    }
  };

  return (
    <PullToRefreshWrapper onRefresh={loadAdmins}>
      <div className="pb-[calc(var(--mb-bottom-nav-height,70px)+20px)]">
        <ModuleHero
          icon={Shield}
          title="Quản lý admin"
          description=""
          iconTone="bg-rose-600"
          actions={(
            <>
              <SecondaryButton onClick={loadAdmins} className="border-white/20 bg-white/10 text-white">
                <RefreshCw size={16} />
                Tải lại
              </SecondaryButton>
              <PrimaryButton onClick={openCreate} className="bg-white text-slate-900 shadow-none">
                <Plus size={16} />
                Thêm admin
              </PrimaryButton>
            </>
          )}
        />

        <SectionCard title="Tổng quan quyền quản trị">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Tổng admin" value={admins.length} tone="blue" />
            <StatCard label="Super admin" value={admins.filter((admin) => admin.role === 'super_admin').length} tone="rose" />
            <StatCard label="Đang hoạt động" value={admins.filter((admin) => admin.status === 'active').length} tone="emerald" />
            <StatCard label="Đã khóa" value={admins.filter((admin) => admin.status !== 'active').length} tone="amber" />
          </div>
        </SectionCard>

        <SectionCard title="Tìm tài khoản">
          <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Tìm kiếm..." />
        </SectionCard>

        <SectionCard title="Danh sách admin" description="">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : filteredAdmins.length ? (
            <div className="space-y-3">
              {filteredAdmins.map((admin) => (
                <div key={admin.id} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white ${admin.role === 'super_admin' ? 'bg-rose-600' : 'bg-blue-600'}`}>
                      <User size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-slate-900">{admin.username}</p>
                        <StatusBadge tone={admin.role === 'super_admin' ? 'rose' : 'blue'}>{admin.role}</StatusBadge>
                        <StatusBadge tone={admin.status === 'active' ? 'emerald' : 'amber'}>
                          {admin.status === 'active' ? 'Hoạt động' : 'Khóa'}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{admin.email || 'Chưa có email'}</p>
                      <p className="mt-1 text-xs text-slate-500">{admin.phone || 'Chưa có số điện thoại'}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <SecondaryButton onClick={() => openEdit(admin)}>
                      <Edit2 size={14} />
                      Sửa
                    </SecondaryButton>
                    <SecondaryButton onClick={() => handleToggleStatus(admin)}>
                      {admin.status === 'active' ? <Clock3 size={14} /> : <Check size={14} />}
                      {admin.status === 'active' ? 'Khóa' : 'Mở'}
                    </SecondaryButton>
                    <SecondaryButton onClick={() => handleDelete(admin)} className="border-rose-200 bg-rose-50 text-rose-700">
                      <Trash2 size={14} />
                      Xóa
                    </SecondaryButton>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Không có admin phù hợp" />
          )}
        </SectionCard>
      </div>

      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title={editingAdmin ? 'Cập nhật admin' : 'Tạo admin'}>
        <div className="space-y-4 pb-4">
          <input
            type="text"
            value={formData.username}
            onChange={(event) => setFormData((current) => ({ ...current, username: event.target.value }))}
            placeholder="Username"
            disabled={Boolean(editingAdmin)}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900 disabled:opacity-70"
          />
          <input
            type="password"
            value={formData.password}
            onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
            placeholder={editingAdmin ? 'Để trống nếu không đổi mật khẩu' : 'Mật khẩu'}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
          />
          <input
            type="email"
            value={formData.email}
            onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
            placeholder="Email"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
          />
          <input
            type="tel"
            value={formData.phone}
            onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
            placeholder="Số điện thoại"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={formData.role}
              onChange={(event) => setFormData((current) => ({ ...current, role: event.target.value }))}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
            >
              {ADMIN_ROLES.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            <select
              value={formData.status}
              onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900"
            >
              {ADMIN_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
          <PrimaryButton onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {editingAdmin ? 'Lưu cập nhật' : 'Tạo tài khoản'}
          </PrimaryButton>
        </div>
      </BottomSheet>
    </PullToRefreshWrapper>
  );
}

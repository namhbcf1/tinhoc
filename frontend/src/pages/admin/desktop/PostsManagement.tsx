import { useState, useEffect, useRef } from 'react';
import {
  Newspaper, Plus, RefreshCw, Edit2, Trash2, Check, Eye, Archive,
  Filter, Tag, Calendar, X, FileText, Send, Clock, Sparkles, Image, Upload, Loader2
} from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import '../../../styles/admin/AdminModern.css';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';

export default function PostsManagement({ toast }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [uploadingImage, setUploadingImage] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'general',
    tags: '',
    featured_image: '',
    video_url: '',
    images: ['', '', '', '', ''], // 5 slots for images
    status: 'draft'
  });
  const fileInputRefs = [useRef(), useRef(), useRef(), useRef(), useRef()];

  useEffect(() => { loadPosts(); }, []);
  useAdminAutoRefresh(() => loadPosts(), { minIntervalMs: 15000 });

  const loadPosts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (filterStatus) params.status = filterStatus;
      const response = await api.getPosts(params);
      setPosts(Array.isArray(response.data) ? response.data : []);
    } catch { setPosts([]); } finally { setLoading(false); }
  };

  useEffect(() => { loadPosts(); }, [filterCategory, filterStatus]);

  const handleCreate = () => {
    setEditingPost(null);
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      category: 'general',
      tags: '',
      featured_image: '',
      images: ['', '', '', '', ''],
      status: 'draft'
    });
    setShowModal(true);
  };

  const handleEdit = (post) => {
    // Parse images from content or separate field
    let images = ['', '', '', '', ''];
    try {
      if (post.images) images = JSON.parse(post.images);
    } catch { }
    setEditingPost(post);
    setFormData({
      title: post.title || '',
      content: post.content || '',
      excerpt: post.excerpt || '',
      category: post.category || 'general',
      tags: post.tags || '',
      featured_image: post.featured_image || '',
      video_url: post.video_url || '',
      images: images,
      status: post.status || 'draft'
    });
    setShowModal(true);
  };

  const handleImageUpload = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(index);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch(`${api.baseURL}/students/upload-image`, {
        method: 'POST',
        body: formDataUpload
      });

      const result = await response.json();
      if (result.success && result.url) {
        const newImages = [...formData.images];
        newImages[index] = result.url;
        setFormData({ ...formData, images: newImages });
        toast?.success(`Ảnh ${index + 1} đã upload thành công!`);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      toast?.error('Lỗi upload ảnh: ' + error.message);
    } finally {
      setUploadingImage(null);
    }
  };

  const removeImage = (index) => {
    const newImages = [...formData.images];
    newImages[index] = '';
    setFormData({ ...formData, images: newImages });
  };

  const insertImageToContent = (index) => {
    const imgUrl = formData.images[index];
    if (!imgUrl) return;

    const imgTag = `\n\n<img src="${imgUrl}" alt="Ảnh ${index + 1}" style="max-width:100%;border-radius:12px;margin:16px 0;" />\n\n`;
    setFormData({
      ...formData,
      content: formData.content + imgTag
    });
    toast?.success(`Đã chèn ảnh ${index + 1} vào nội dung!`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt,
        category: formData.category,
        tags: formData.tags,
        status: formData.status,
        video_url: formData.video_url || null,
        // Use first uploaded image as featured if not set
        featured_image: formData.featured_image || formData.images.find(img => img) || ''
      };

      if (editingPost) {
        await api.updatePost(editingPost.id, submitData);
        toast?.success('Cập nhật thành công!');
      } else {
        await api.createPost(submitData);
        toast?.success('Tạo bài viết thành công!');
      }
      setShowModal(false);
      loadPosts();
    } catch (error) {
      toast?.error('Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId, title) => {
    if (!confirm(`Xóa bài viết "${title}"?`)) return;
    try { await api.deletePost(postId); toast?.success('Xóa thành công!'); loadPosts(); } catch (error) { toast?.error('Lỗi: ' + error.message); }
  };

  const handlePublish = async (postId) => { try { await api.publishPost(postId); toast?.success('Đăng bài thành công!'); loadPosts(); } catch (error) { toast?.error('Lỗi: ' + error.message); } };

  const handleUnpublish = async (postId) => { try { await api.unpublishPost(postId); toast?.success('Gỡ bài thành công!'); loadPosts(); } catch (error) { toast?.error('Lỗi: ' + error.message); } };

  const getCategoryBadge = (category) => {
    const map = { general: { class: 'default', text: 'Chung', icon: '📰' }, tuyensinh: { class: 'purple', text: 'Tuyển sinh', icon: '🎓' }, thongbao: { class: 'info', text: 'Thông báo', icon: '📢' }, tintuc: { class: 'success', text: 'Tin tức', icon: '📰' }, sukien: { class: 'warning', text: 'Sự kiện', icon: '🎉' }, huongdan: { class: 'primary', text: 'Hướng dẫn', icon: '🎬' } };
    const s = map[category] || { class: 'default', text: category, icon: '📄' };
    return <span className={`admin-badge ${s.class}`}>{s.icon} {s.text}</span>;
  };

  const getStatusBadge = (status) => {
    const map = { draft: { class: 'warning', icon: <Clock size={14} />, text: 'Nháp' }, published: { class: 'success', icon: <Check size={14} />, text: 'Đã đăng' }, archived: { class: 'default', icon: <Archive size={14} />, text: 'Lưu trữ' } };
    const s = map[status] || { class: 'default', text: status };
    return <span className={`admin-badge ${s.class}`}>{s.icon} {s.text}</span>;
  };

  return (
    <div className="admin-page">
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
        <div><h1><Newspaper size={32} /> Quản lý Bài viết</h1><p>Tạo và quản lý các bài viết, tin tức trên website</p></div>
        <div style={{ display: 'flex', gap: 12 }}><button onClick={loadPosts} className="admin-btn admin-btn-outline" style={{ padding: '10px 16px' }}><RefreshCw size={18} /></button><button onClick={handleCreate} className="admin-btn admin-btn-primary"><Plus size={18} /> Tạo bài viết</button></div>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="admin-stat-card primary" onClick={() => { setFilterCategory(''); setFilterStatus(''); }}><div className="admin-stat-header"><div className="admin-stat-icon"><Newspaper size={22} /></div></div><div className="admin-stat-value">{posts.length}</div><div className="admin-stat-label">Tổng bài viết</div></div>
        <div className="admin-stat-card success" onClick={() => setFilterStatus('published')}><div className="admin-stat-header"><div className="admin-stat-icon"><Send size={22} /></div></div><div className="admin-stat-value">{posts.filter(p => p.status === 'published').length}</div><div className="admin-stat-label">Đã đăng</div></div>
        <div className="admin-stat-card warning" onClick={() => setFilterStatus('draft')}><div className="admin-stat-header"><div className="admin-stat-icon"><Clock size={22} /></div></div><div className="admin-stat-value">{posts.filter(p => p.status === 'draft').length}</div><div className="admin-stat-label">Nháp</div></div>
        <div className="admin-stat-card info" onClick={() => setFilterCategory('thongbao')}><div className="admin-stat-header"><div className="admin-stat-icon"><Sparkles size={22} /></div></div><div className="admin-stat-value">{posts.filter(p => p.category === 'thongbao').length}</div><div className="admin-stat-label">Thông báo</div></div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center', background: 'white', padding: 20, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
        <Filter size={20} color="#64748b" />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }}><option value="">Tất cả danh mục</option><option value="general">Chung</option><option value="tuyensinh">Tuyển sinh</option><option value="thongbao">Thông báo</option><option value="tintuc">Tin tức</option><option value="sukien">Sự kiện</option><option value="huongdan">🎬 Hướng dẫn</option></select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }}><option value="">Tất cả trạng thái</option><option value="draft">Nháp</option><option value="published">Đã đăng</option><option value="archived">Lưu trữ</option></select>
        {(filterCategory || filterStatus) && <button onClick={() => { setFilterCategory(''); setFilterStatus(''); }} className="admin-btn admin-btn-ghost" style={{ marginLeft: 'auto', padding: '8px 16px' }}><X size={16} /> Xóa lọc</button>}
      </div>

      {/* Posts Grid */}
      {loading ? (
        <div className="admin-loading"><div className="admin-loading-spinner"></div><span>Đang tải...</span></div>
      ) : posts.length === 0 ? (
        <div className="admin-empty-state" style={{ background: 'white', borderRadius: 24, padding: 60 }}><Newspaper size={64} /><p>Chưa có bài viết nào</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
          {posts.map(post => (
            <div key={post.id} style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(226,232,240,0.8)', transition: 'all 0.3s' }}>
              {post.featured_image && <div style={{ height: 160, background: `url(${post.featured_image}) center/cover`, borderBottom: '1px solid #f1f5f9' }}></div>}
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>{getCategoryBadge(post.category)}{getStatusBadge(post.status)}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.title}</h3>
                {post.excerpt && <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.excerpt}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}><Calendar size={12} style={{ verticalAlign: 'middle' }} /> {formatDateVN(post.created_at)}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleEdit(post)} className="admin-btn admin-btn-ghost" style={{ padding: '8px' }}><Edit2 size={16} /></button>
                    {post.status === 'draft' && <button onClick={() => handlePublish(post.id)} className="admin-btn admin-btn-ghost" style={{ padding: '8px', color: '#10b981' }}><Send size={16} /></button>}
                    {post.status === 'published' && <button onClick={() => handleUnpublish(post.id)} className="admin-btn admin-btn-ghost" style={{ padding: '8px', color: '#f59e0b' }}><Archive size={16} /></button>}
                    <button onClick={() => handleDelete(post.id, post.title)} className="admin-btn admin-btn-ghost" style={{ padding: '8px', color: '#ef4444' }}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: 24, width: '95%', maxWidth: 900, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', padding: 32, borderRadius: '24px 24px 0 0', color: 'white' }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                {editingPost ? <Edit2 size={24} /> : <Plus size={24} />} {editingPost ? 'Sửa bài viết' : 'Tạo bài viết mới'}
              </h2>
            </div>
            <div style={{ padding: 32 }}>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Tiêu đề *</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required style={inputStyle} placeholder="Nhập tiêu đề bài viết" />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Tóm tắt</label>
                  <textarea value={formData.excerpt} onChange={e => setFormData({ ...formData, excerpt: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Mô tả ngắn gọn về bài viết" />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Ảnh đại diện (Thumbnail URL)</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={formData.featured_image}
                      onChange={e => setFormData({ ...formData, featured_image: e.target.value })}
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder="Dán link ảnh vào đây hoặc để trống (sẽ lấy ảnh số 1 bên dưới)"
                    />
                    {formData.featured_image && (
                      <div style={{ width: 80, height: 45, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', flexShrink: 0, background: '#f8fafc' }}>
                        <img
                          src={formData.featured_image}
                          alt="Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Image Upload Section */}
                <div style={{ marginBottom: 24, padding: 20, background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, fontSize: 14, color: '#16a34a' }}>
                    <Image size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                    Ảnh bài viết (Tối đa 5 ảnh)
                  </label>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                    Upload ảnh minh họa cho bài viết. Nhấn "Chèn" để các ảnh hiển thị trong phần nội dung.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                    {[0, 1, 2, 3, 4].map(index => (
                      <div key={index} style={{
                        position: 'relative',
                        aspectRatio: '1',
                        background: formData.images[index] ? 'transparent' : '#e2e8f0',
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: formData.images[index] ? '2px solid #16a34a' : '2px dashed #cbd5e1',
                        cursor: 'pointer'
                      }}>
                        {formData.images[index] ? (
                          <>
                            <img
                              src={formData.images[index]}
                              alt={`Ảnh ${index + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{
                              position: 'absolute', bottom: 0, left: 0, right: 0,
                              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                              padding: '20px 8px 8px', display: 'flex', gap: 4, justifyContent: 'center'
                            }}>
                              <button type="button" onClick={() => insertImageToContent(index)}
                                style={{ padding: '4px 8px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                                Chèn
                              </button>
                              <button type="button" onClick={() => removeImage(index)}
                                style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                                Xóa
                              </button>
                            </div>
                            <div style={{ position: 'absolute', top: 4, left: 4, background: '#16a34a', color: 'white', borderRadius: 6, padding: '2px 6px', fontSize: 10, fontWeight: 600 }}>
                              {index === 0 ? '★ Đại diện' : `#${index + 1}`}
                            </div>
                          </>
                        ) : (
                          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}
                            onClick={() => fileInputRefs[index].current?.click()}>
                            {uploadingImage === index ? (
                              <Loader2 size={24} className="animate-spin" />
                            ) : (
                              <>
                                <Upload size={20} />
                                <span style={{ fontSize: 10, marginTop: 4 }}>Ảnh {index + 1}</span>
                              </>
                            )}
                          </div>
                        )}
                        <input
                          ref={fileInputRefs[index]}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleImageUpload(e, index)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Nội dung * <span style={{ fontWeight: 400, color: '#64748b' }}>(Hỗ trợ HTML)</span></label>
                  <textarea
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    rows={16}
                    required
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'system-ui', fontSize: 14, lineHeight: 1.7 }}
                    placeholder={`Viết nội dung bài viết tại đây...

📝 Mẹo: Nhấn "Chèn" ở các ảnh phía trên để thêm ảnh vào đúng vị trí bạn muốn.

Bạn có thể dùng HTML để định dạng:
<h2>Tiêu đề phụ</h2>
<p>Đoạn văn bản</p>
<strong>In đậm</strong>
<em>In nghiêng</em>
<ul><li>Danh sách</li></ul>`}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Danh mục</label>
                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={inputStyle}>
                      <option value="general">Chung</option>
                      <option value="tuyensinh">Tuyển sinh</option>
                      <option value="thongbao">Thông báo</option>
                      <option value="tintuc">Tin tức</option>
                      <option value="sukien">Sự kiện</option>
                      <option value="huongdan">🎬 Hướng dẫn</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Trạng thái</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
                      <option value="draft">Nháp</option>
                      <option value="published">Đăng ngay</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Tags (phân cách bằng dấu phẩy)</label>
                  <input type="text" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} style={inputStyle} placeholder="VD: tin-hoc, thi-cong-chuc, VSTEP" />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>🎬 URL Video (YouTube / clip)</label>
                  <input
                    type="url"
                    value={formData.video_url}
                    onChange={e => setFormData({ ...formData, video_url: e.target.value })}
                    style={inputStyle}
                    placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                  />
                  <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Dán link YouTube để hiển thị video trong trang Hướng dẫn</p>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="admin-btn admin-btn-ghost">Hủy</button>
                  <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
                    {loading ? 'Đang xử lý...' : (editingPost ? 'Cập nhật' : 'Tạo')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' };

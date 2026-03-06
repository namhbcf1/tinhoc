import { useState, useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import {
  MessageSquare, Send, Search, Plus,
  Bell, CheckCheck, Clock, User, Inbox, Bot, Zap, Loader2
} from 'lucide-react';
import api from '../../../services/api';
import { formatTime } from '../../../utils/dateUtils';

// ─── Conversation Item ────────────────────────────────────────────────────────
const ConversationItem = ({ conv, selected, onClick }) => {
  const isAI = conv.isAI;
  const title = conv.subject || 'Hỗ trợ học viên';
  const preview = conv.last_message || '...';
  const isUnread = conv.unread_count > 0;
  const time = formatTime(conv.updated_at || conv.created_at || new Date().toISOString());
  const initials = title.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();

  return (
    <button
      onClick={() => onClick(conv)}
      className={`w-full text-left flex items-start gap-3 px-4 py-4 border-b border-slate-50 transition-all duration-200
        ${selected ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
    >
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-bold
        ${isAI ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : selected ? 'bg-emerald-500 text-white' : 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600'}`}>
        {isAI ? <Bot size={20} /> : (initials || <User size={16} />)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className={`text-sm truncate ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
            {title}
          </p>
          <span className="text-xs text-slate-400 flex-shrink-0 ml-2 font-bold">{time}</span>
        </div>
        <p className={`text-xs truncate ${isUnread ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
          {preview}
        </p>
      </div>
      {isUnread && (
        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
      )}
    </button>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center h-full py-16 px-8 text-center">
    <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-4">
      <Icon size={36} className="text-slate-300" />
    </div>
    <p className="font-bold text-slate-600 mb-2">{title}</p>
    {subtitle && <p className="text-sm text-slate-400 leading-relaxed">{subtitle}</p>}
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StudentMessaging({ studentData }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [convMessages, setConvMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [creating, setCreating] = useState(false);

  // AI State
  const [aiMessages, setAiMessages] = useState([
    { id: 'ai-1', content: `Xin chào ${studentData?.full_name || studentData?.name || 'bạn'}! Tôi là Trợ lý AI của VanTrangEdu. Tôi có thể giúp gì cho quá trình học tập của bạn hôm nay?`, sender_type: 'admin', created_at: new Date().toISOString() }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Virtual AI Conversation
  const aiConversation = {
    id: 'ai-assistant',
    subject: 'Smart Assistant',
    last_message: aiMessages[aiMessages.length - 1]?.content || 'Sẵn sàng hỗ trợ bạn...',
    unread_count: 0,
    updated_at: aiMessages[aiMessages.length - 1]?.created_at || new Date().toISOString(),
    isAI: true
  };

  useGSAP(() => {
    gsap.fromTo('.msg-anim',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' }
    );
  }, { scope: containerRef, dependencies: [loading] });

  useEffect(() => {
    fetchConversations();
  }, [studentData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await api.request('/messaging/conversations');
      const list = Array.isArray(res?.data) ? res.data : [];
      setConversations(list);
    } catch (e) {
      console.warn('Could not load conversations:', e);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv) => {
    setSelectedConv(conv);

    // Check if it's the AI conversation
    if (conv.id === 'ai-assistant') {
      setConvMessages(aiMessages);
      return;
    }

    setConvMessages([]);
    try {
      const res = await api.request(`/messaging/conversations/${conv.id}/messages`);
      setConvMessages(Array.isArray(res?.data) ? res.data : []);
      // mark as read - backend handles this automatically in GET /messages
      // update local unread count
      setConversations(prev =>
        prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
      );
    } catch (e) {
      console.warn('Could not load messages:', e);
      setConvMessages([]);
    }
  };

  const handleCreateConversation = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await api.request('/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({ subject: 'Hỗ trợ học viên' }),
      });
      await fetchConversations();
      // auto-select the new conversation
      if (res?.data?.id) {
        await selectConversation(res.data);
      }
    } catch (e) {
      console.warn('Could not create conversation:', e);
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedConv) return;
    const trimmed = reply.trim();
    setReply('');
    // optimistic update
    const optimistic = {
      id: `tmp-${Date.now()}`,
      content: trimmed,
      sender_type: 'student',
      created_at: new Date().toISOString(),
    };

    if (selectedConv.id === 'ai-assistant') {
      const newAiMessages = [...aiMessages, optimistic];
      setAiMessages(newAiMessages);
      setConvMessages(newAiMessages);
      setIsTyping(true);

      try {
        const result = await api.queryAI(trimmed);
        if (result.success && result.response) {
          const aiResp = {
            id: `ai-${Date.now()}`,
            content: result.response,
            sender_type: 'admin',
            created_at: new Date().toISOString(),
          };
          setAiMessages(prev => {
            const updated = [...prev, aiResp];
            if (selectedConv.id === 'ai-assistant') setConvMessages(updated);
            return updated;
          });
        } else {
          throw new Error('Empty response from AI or success=false');
        }
      } catch (err) {
        console.error('AI Error:', err);
        const aiResp = {
          id: `ai-${Date.now()}`,
          content: 'Để tôi kiểm tra lại thông tin này nhé. (Lưu ý: Đang chạy ở chế độ offline do lỗi kết nối AI)',
          sender_type: 'admin',
          created_at: new Date().toISOString(),
        };
        setAiMessages(prev => {
          const updated = [...prev, aiResp];
          if (selectedConv.id === 'ai-assistant') setConvMessages(updated);
          return updated;
        });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    setConvMessages(prev => [...prev, optimistic]);
    try {
      await api.sendMessage(selectedConv.id, trimmed);
      // refresh messages to get server-confirmed data
      const res = await api.request(`/messaging/conversations/${selectedConv.id}/messages`);
      setConvMessages(Array.isArray(res?.data) ? res.data : []);
      // refresh conversation list for updated last_message
      fetchConversations();
    } catch (e) {
      console.warn('Send failed:', e);
      setConvMessages(prev => prev.filter(m => m.id !== optimistic.id));
    }
  };

  const allConversations = [aiConversation, ...conversations];
  const filtered = allConversations.filter(c => {
    const title = (c.subject || '').toLowerCase();
    const preview = (c.last_message || '').toLowerCase();
    return title.includes(searchTerm.toLowerCase()) || preview.includes(searchTerm.toLowerCase());
  });

  const unreadCount = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <div className="space-y-5" ref={containerRef}>
      {/* ── Hero Banner ── */}
      <div className="msg-anim bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-3xl px-6 py-5 flex items-center justify-between shadow-lg shadow-purple-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <MessageSquare size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Tin nhắn</h2>
            <p className="text-white/70 text-sm">Liên lạc với giáo viên &amp; nhà trường</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/30">
            <Bell size={16} className="text-white" />
            <span className="text-white font-bold text-sm">{unreadCount} chưa đọc</span>
          </div>
        )}
      </div>

      {/* ── Main Panel ── */}
      <div className="msg-anim bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden" style={{ minHeight: '520px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Đang tải tin nhắn...</p>
            </div>
          </div>
        ) : (
          <div className="flex h-full" style={{ minHeight: '520px' }}>
            {/* Left: conversation list */}
            <div className="w-80 flex-shrink-0 border-r border-slate-100 flex flex-col">
              {/* Search + New button */}
              <div className="p-4 border-b border-slate-50 space-y-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm cuộc hội thoại..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm text-slate-700 placeholder-slate-400 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-300 transition"
                  />
                </div>
                <button
                  onClick={handleCreateConversation}
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  {creating ? 'Đang tạo...' : 'Tạo cuộc hội thoại mới'}
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="Không có cuộc hội thoại"
                    subtitle={searchTerm ? `Không tìm thấy kết quả cho "${searchTerm}"` : 'Nhấn "Tạo cuộc hội thoại mới" để bắt đầu liên hệ.'}
                  />
                ) : (
                  filtered.map(conv => (
                    <ConversationItem
                      key={conv.id}
                      conv={conv}
                      selected={selectedConv?.id === conv.id}
                      onClick={selectConversation}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right: message detail */}
            <div className="flex-1 flex flex-col">
              {!selectedConv ? (
                <EmptyState
                  icon={MessageSquare}
                  title="Chọn một cuộc hội thoại"
                  subtitle="Nhấn vào một cuộc trò chuyện bên trái để xem nội dung."
                />
              ) : (
                <>
                  {/* Header */}
                  {selectedConv.isAI ? (
                    <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <Zap size={20} className="text-white" fill="currentColor" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2 text-slate-800">
                          Smart Assistant
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">AI Active</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                        {(selectedConv.subject || 'HT').split(' ').map(w => w[0]).slice(-2).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{selectedConv.subject || 'Hỗ trợ học viên'}</p>
                        <p className="text-xs text-slate-400 font-bold">{formatTime(selectedConv.updated_at || selectedConv.created_at)}</p>
                      </div>
                    </div>
                  )}

                  {/* Messages body */}
                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                    {convMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-slate-400">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
                      </div>
                    ) : (
                      convMessages.map((msg) => {
                        const isStudent = msg.sender_type === 'student';
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                                ${isStudent
                                  ? 'bg-emerald-100 text-emerald-900 rounded-br-md'
                                  : 'bg-slate-100 text-slate-700 rounded-bl-md'
                                }`}
                            >
                              <p>{msg.content}</p>
                              <p className={`text-xs mt-1 ${isStudent ? 'text-emerald-600 text-right' : 'text-slate-400'}`}>
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {isTyping && selectedConv.isAI && (
                      <div className="flex items-start gap-2">
                        <div className="bg-slate-100 text-slate-700 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm h-10 flex items-center">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply box */}
                  <div className="px-6 py-4 border-t border-slate-100">
                    <div className="flex items-end gap-3">
                      <textarea
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        placeholder="Nhập phản hồi..."
                        rows={2}
                        className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300 transition"
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                      />
                      <button
                        onClick={handleSendReply}
                        disabled={!reply.trim()}
                        className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 font-bold">Nhấn Enter để gửi, Shift+Enter để xuống dòng</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

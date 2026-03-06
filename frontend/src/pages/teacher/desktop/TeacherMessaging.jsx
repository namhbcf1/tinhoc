import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import api from '../../../services/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import EmptyState from '../../../components/ui/EmptyState';
import { formatDateVN } from '../../../utils/dateUtils';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import {
  Send, Search, User, MessageCircle, Clock,
  MoreVertical, Check, CheckCheck, Hash, Phone
} from 'lucide-react';

export default function TeacherMessaging({ teacher }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.fromTo(
      '.anim-fade-up',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' }
    );
  }, [loading, selectedConversation]);

  useGSAP(() => {
    if (messages.length > 0) {
      gsap.fromTo(
        '.message-anim:last-child',
        { opacity: 0, scale: 0.9, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.7)' }
      );
    }
  }, [messages.length]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    scrollToBottom();
  }, [messages.length]);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    if (!selectedConversation) return;

    const intervalId = setInterval(() => {
      loadMessages(selectedConversation.id, true); // Silent refresh
      loadConversations(); // Also refresh conversations to update last message
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(intervalId);
  }, [selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      const response = await api.getConversations();
      if (response.success && response.data) {
        const conversationsData = Array.isArray(response.data) ? response.data : [];
        setConversations(conversationsData);
        // Auto-select first conversation if available
        if (conversationsData.length > 0 && !selectedConversation) {
          setSelectedConversation(conversationsData[0]);
        }
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId, silent = false) => {
    if (!silent) {
      setLoadingMessages(true);
    }
    try {
      const response = await api.getMessages(conversationId);
      if (response.success && response.data) {
        setMessages(Array.isArray(response.data) ? response.data : []);
      } else {
        if (!silent) {
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      if (!silent) {
        setMessages([]);
      }
    } finally {
      if (!silent) {
        setLoadingMessages(false);
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation || sending) return;

    const text = messageText.trim();
    const tempId = Date.now();

    // Optimistic update - add message immediately to UI
    const optimisticMessage = {
      id: tempId,
      message: text,
      sender_type: 'teacher',
      created_at: new Date().toISOString(),
      isOptimistic: true,
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setMessageText('');
    setSending(true);

    try {
      await api.sendMessage(selectedConversation.id, text);
      // Reload messages to get the real one from server
      await loadMessages(selectedConversation.id, true); // Silent refresh
      // Reload conversations to update last message, preserve selected conversation
      const currentConvId = selectedConversation.id;
      const response = await api.getConversations();
      if (response.success && response.data) {
        const conversationsData = Array.isArray(response.data) ? response.data : [];
        setConversations(conversationsData);
        // Restore selected conversation
        const updatedConv = conversationsData.find(c => c.id === currentConvId);
        if (updatedConv) {
          setSelectedConversation(updatedConv);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setMessageText(text); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const formatTime = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return formatDateVN(date);
  }, []);

  const formatMessageTime = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    return formatDateVN(date, true);
  }, []);

  const getLastMessage = useCallback((conversation) => {
    if (conversation.last_message) {
      // Truncate long messages
      return conversation.last_message.length > 50
        ? conversation.last_message.substring(0, 50) + '...'
        : conversation.last_message;
    }
    return conversation.last_message_at ? 'Có tin nhắn mới' : 'Chưa có tin nhắn';
  }, []);

  if (loading) {
    return (
      <div className="teacher-messaging-page">
        <LoadingSpinner text="Đang tải cuộc trò chuyện..." />
      </div>
    );
  }

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    return conversations.filter(c =>
      c.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  if (loading) {
    return <LoadingSpinner text="Đang tải tin nhắn..." />;
  }

  return (
    <div className="h-[calc(100vh-180px)] min-h-[500px] flex flex-col md:flex-row gap-6" ref={containerRef}>
      {/* Sidebar */}
      <Card className="w-full md:w-80 lg:w-96 glass-card border-0 shadow-sm flex flex-col overflow-hidden anim-fade-up">
        <div className="p-6 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MessageCircle size={22} className="text-teal-600" />
            Tin nhắn
          </h2>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Tìm học viên..."
              className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {filteredConversations.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8 opacity-50">
              <EmptyState icon="💬" title="" message="Không tìm thấy cuộc trò chuyện" />
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${selectedConversation?.id === conv.id
                    ? 'bg-teal-50 shadow-sm'
                    : 'hover:bg-slate-50'
                    }`}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm ${selectedConversation?.id === conv.id ? 'bg-teal-500' : 'bg-slate-300'
                      }`}>
                      {conv.student_name?.charAt(0).toUpperCase() || 'H'}
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-teal-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold border-2 border-white">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-slate-800 truncate">{conv.student_name || 'Học viên'}</span>
                      <span className="text-xs text-slate-400 font-medium whitespace-nowrap ml-2">
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                      {getLastMessage(conv)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 glass-card border-0 shadow-sm flex flex-col overflow-hidden anim-fade-up">
        {!selectedConversation ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center">
            <div className="max-w-xs space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-teal-100 flex items-center justify-center text-teal-600 mx-auto mb-6">
                <MessageCircle size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Chọn cuộc trò chuyện</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Chọn một học viên từ danh sách bên trái để xem tin nhắn và phản hồi.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 px-6 border-b border-slate-100 bg-white/50 backdrop-blur-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white font-bold text-sm">
                  {selectedConversation.student_name?.charAt(0).toUpperCase() || 'H'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 leading-none mb-1">
                    {selectedConversation.student_name || 'Học viên'}
                  </h3>
                  {selectedConversation.subject && (
                    <p className="text-xs font-semibold text-teal-600">
                      {selectedConversation.subject}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100 text-slate-400 h-10 w-10">
                  <Phone size={18} />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100 text-slate-400 h-10 w-10">
                  <MoreVertical size={18} />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30" ref={messagesContainerRef}>
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <LoadingSpinner text="" />
                </div>
              ) : messages.length === 0 ? (
                <EmptyState icon="💬" title="Chưa có tin nhắn" message="Hãy gửi lời chào đầu tiên!" />
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((msg, idx) => {
                    const isSent = msg.sender_type === 'teacher' || msg.sender_type === 'admin';
                    const showTime = idx === 0 ||
                      new Date(msg.created_at) - new Date(messages[idx - 1].created_at) > 300000;

                    return (
                      <div key={msg.id} className="flex flex-col">
                        {showTime && (
                          <div className="text-xs font-semibold text-slate-400 text-center my-4">
                            {formatMessageTime(msg.created_at)}
                          </div>
                        )}
                        <div className={`flex w-full ${isSent ? 'justify-end' : 'justify-start'} message-anim`}>
                          <div className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-sm relative group ${isSent
                            ? 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white rounded-tr-none'
                            : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                            }`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isSent ? 'text-teal-100 justify-end' : 'text-slate-400'
                              }`}>
                              {formatMessageTime(msg.created_at).split(' ')[0]}
                              {isSent && (msg.isOptimistic ? <Clock size={8} /> : <CheckCheck size={10} />)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-6 bg-white/50 backdrop-blur-sm border-t border-slate-100">
              <form className="flex items-center gap-3" onSubmit={handleSendMessage}>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Nhập tin nhắn..."
                    className="h-12 pr-12 rounded-2xl border-slate-200 bg-white/70 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-medium"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    disabled={sending}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!messageText.trim() || sending}
                  className="h-12 w-12 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-500/20 active:scale-95 transition-all p-0 flex items-center justify-center"
                >
                  <Send size={20} className={sending ? 'animate-pulse' : ''} />
                </Button>
              </form>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

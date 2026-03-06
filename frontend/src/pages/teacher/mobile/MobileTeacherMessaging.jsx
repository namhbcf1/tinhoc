import { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import { MessageCircle, Send, Search, User, Check, CheckCheck, MoreVertical, Plus } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function MobileTeacherMessaging({ teacher }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo(
        '.msg-anim',
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.7)' }
      );
    }
  }, [loading]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const response = await api.getTeacherMessages();
      if (response?.success && Array.isArray(response.data)) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    (conv.from_name || conv.sender_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );


  // Pull-to-refresh callback
  const handleRefresh = async () => {
    await loadConversations();
  };

  return (
    <PullToRefreshWrapper onRefresh={handleRefresh}>
    <div className="space-y-6 pb-20" ref={containerRef}>
      {/* Search & Actions */}
      <div className="flex items-center gap-3 msg-anim">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Tìm hội thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-14 pl-12 rounded-2xl bg-white border-white shadow-sm font-bold text-sm"
          />
        </div>
        <Button className="w-14 h-14 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-500/20">
          <Plus size={24} />
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
            <p className="text-sm text-slate-400">Đang tải tin nhắn...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="msg-anim text-center py-12">
            <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-4">
              <MessageCircle size={32} />
            </div>
            <p className="text-slate-500 font-bold">Chưa có tin nhắn nào</p>
          </div>
        ) : (
          filteredConversations.map((msg) => (
            <Card
              key={msg.id}
              className={`msg-anim glass-card border-0 p-4 active:scale-[0.98] transition-all relative overflow-hidden ${msg.unread ? 'bg-gradient-to-br from-white to-teal-50/30 border-l-4 border-l-teal-500' : ''
                }`}
            >
              <div className="flex items-start gap-4 pr-6">
                <div className="relative">
                  <div className="h-14 w-14 rounded-3xl bg-teal-50 flex items-center justify-center flex-shrink-0 text-teal-600 font-black text-xl">
                    {msg.from_name?.charAt(0) || 'G'}
                  </div>
                  {msg.online && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-black text-slate-800 text-sm truncate">
                      {msg.from_name || msg.sender_name || 'Người gửi'}
                    </h3>
                    <span className="text-xs text-slate-400 shrink-0">
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <p className={`text-xs pr-4 truncate ${msg.unread ? 'font-black text-slate-900' : 'text-slate-500 font-bold'}`}>
                    {msg.content || msg.message || 'Nội dung tin nhắn...'}
                  </p>
                </div>
              </div>

              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                {msg.unread && (
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                )}
                {!msg.unread && <CheckCheck size={14} className="text-teal-400" />}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
    </PullToRefreshWrapper>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Users, BookOpen, Newspaper,
  CreditCard, Calendar, Home, History, Shield, UserCircle,
  LayoutDashboard, Database, FileText, ClipboardList, FileBox,
  X, ArrowUp, ArrowDown, CornerDownLeft,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '../../services/api';
import { getAdminTabsForTarget, type AdminTabId } from '../../pages/admin/adminTabs';
import { getStoredAdmin } from '../../utils/adminSession';
import OverlayPortal from '../ui/OverlayPortal';

// ─── Category icon + label map ──────────────────────────────────────────────────
interface CategoryMeta {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

const CATEGORIES: Record<string, CategoryMeta> = {
  students:  { label: 'Học viên',   icon: Users,           color: 'text-emerald-600', bg: 'bg-emerald-50' },
  classes:   { label: 'Lớp học',    icon: BookOpen,        color: 'text-blue-600',    bg: 'bg-blue-50'    },
  posts:     { label: 'Bài viết',   icon: Newspaper,       color: 'text-sky-600',     bg: 'bg-sky-50'     },
  navigate:  { label: 'Chuyển đến', icon: LayoutDashboard, color: 'text-purple-600',  bg: 'bg-purple-50'  },
};

// ─── Tab navigation items for quick nav ──────────────────────────────────────────
const TAB_ICON_MAP: Record<string, LucideIcon> = {
  'dashboard':      LayoutDashboard,
  'classes':        BookOpen,
  'students':       Users,
  'payments':       CreditCard,
  'exam-schedules': Calendar,
  'posts':          Newspaper,
  'homepage':       Home,
  'admins':         Shield,
  'backup':         Database,
  'logs':           History,
  'profile':        UserCircle,
  'documents':      FileBox,
  'assignments':    ClipboardList,
};

// ─── Result item interface ──────────────────────────────────────────────────────
interface SearchResultItem {
  id: string;
  category: string;
  title: string;
  subtitle?: string;
  displayIcon?: LucideIcon;
  action: () => void;
}

// ─── Highlight matched text ─────────────────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>;
  const idx = String(text).toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {String(text).slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5 not-italic font-semibold">
        {String(text).slice(idx, idx + query.length)}
      </mark>
      {String(text).slice(idx + query.length)}
    </>
  );
}

// ─── Result row ─────────────────────────────────────────────────────────────────
function ResultRow({ item, query, isActive, onSelect, onMouseEnter }: {
  item: SearchResultItem;
  query: string;
  isActive: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
}) {
  const cat   = CATEGORIES[item.category] || CATEGORIES.navigate;
  const Icon  = item.displayIcon || cat.icon;
  return (
    <button
      onMouseDown={onSelect}
      onMouseEnter={onMouseEnter}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
        ${isActive ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
    >
      <div className={`w-8 h-8 rounded-lg ${cat.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={15} className={cat.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-900 truncate">
          <Highlight text={item.title} query={query} />
        </div>
        {item.subtitle && (
          <div className="text-xs text-slate-400 truncate mt-0.5">
            <Highlight text={item.subtitle} query={query} />
          </div>
        )}
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.bg} ${cat.color} flex-shrink-0`}>
        {cat.label}
      </span>
    </button>
  );
}

// ─── Main GlobalSearch component ────────────────────────────────────────────────
export default function GlobalSearch({ onNavigate }: { onNavigate?: (tabId: string) => void }) {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor,  setCursor]  = useState(0);

  const inputRef    = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Open / close ──────────────────────────────────────────────────────────
  const openSearch  = useCallback(() => { setOpen(true);  setQuery(''); setResults([]); setCursor(0); }, []);
  const closeSearch = useCallback(() => { setOpen(false); setQuery(''); setResults([]); }, []);

  // ── Global Ctrl+K shortcut ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        open ? closeSearch() : openSearch();
      }
      if (e.key === 'Escape' && open) closeSearch();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, openSearch, closeSearch]);

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // ── Debounced search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) { setResults([]); setLoading(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(() => runSearch(query.trim()), 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search across students + classes + tabs in parallel ───────────────────
  const runSearch = async (q: string) => {
    try {
      const [studentsRes, classesRes] = await Promise.allSettled([
        (api as any).searchStudents(q),
        (api as any).getClasses(),
      ]);

      const items: SearchResultItem[] = [];
      const ql = q.toLowerCase();

      // Tab navigation results (instant, no API needed)
      const adminData = getStoredAdmin();
      getAdminTabsForTarget(adminData?.role, 'desktop', adminData).forEach((tab) => {
        const matches = tab.label.toLowerCase().includes(ql) || tab.title.toLowerCase().includes(ql) || tab.id.toLowerCase().includes(ql);
        if (matches) {
          items.push({
            id:          `nav-${tab.id}`,
            category:    'navigate',
            title:       tab.label,
            subtitle:    tab.title,
            displayIcon: TAB_ICON_MAP[tab.id] || LayoutDashboard,
            action:      () => onNavigate?.(tab.id),
          });
        }
      });

      // Students
      if (studentsRes.status === 'fulfilled') {
        const data = Array.isArray((studentsRes.value as any)?.data) ? (studentsRes.value as any).data : [];
        data.slice(0, 6).forEach((s: any) => {
          items.push({
            id:       `student-${s.id}`,
            category: 'students',
            title:    s.ho_ten_full || `${s.ho || ''} ${s.ten_dem || ''} ${s.ten || ''}`.trim(),
            subtitle: s.cccd || s.sdt || '',
            action:   () => onNavigate?.('students'),
          });
        });
      }

      // Classes — filter locally
      if (classesRes.status === 'fulfilled') {
        const raw = classesRes.value as any;
        const data = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        data
          .filter((c: any) => c.ten_lop?.toLowerCase().includes(ql) || c.ma_lop?.toLowerCase().includes(ql))
          .slice(0, 5)
          .forEach((c: any) => {
            items.push({
              id:       `class-${c.id}`,
              category: 'classes',
              title:    c.ten_lop,
              subtitle: c.ma_lop || c.status || '',
              action:   () => onNavigate?.('classes'),
            });
          });
      }

      setResults(items);
      setCursor(0);
    } catch (err) {
      console.error('GlobalSearch error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Keyboard navigation (↑↓ Enter) ───────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectResult(results[cursor]);
    }
  };

  const selectResult = (item?: SearchResultItem) => {
    item?.action?.();
    closeSearch();
  };

  if (!open) {
    return (
      <button
        onClick={openSearch}
        title="Tìm kiếm toàn cục (Ctrl+K)"
        className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-sm transition-colors"
      >
        <Search size={16} />
        <span className="hidden md:inline text-slate-400">Tìm kiếm...</span>
      </button>
    );
  }

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[100000] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm"
        onMouseDown={closeSearch}
      >
        <div
          className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_0.15s_ease-out]"
          onMouseDown={(e) => e.stopPropagation()}
        >
        {/* Input row */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          {loading
            ? <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            : <Search size={20} className="text-slate-400 flex-shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm..."
            className="flex-1 bg-transparent border-none outline-none text-slate-900 text-base placeholder:text-slate-400"
          />
          <button onClick={closeSearch} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {results.map((item, idx) => (
              <ResultRow
                key={item.id}
                item={item}
                query={query}
                isActive={idx === cursor}
                onSelect={() => selectResult(item)}
                onMouseEnter={() => setCursor(idx)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {query.trim() && !loading && results.length === 0 && (
          <div className="px-5 py-10 text-center text-slate-400">
            <Search size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Không tìm thấy &quot;{query}&quot;</p>
          </div>
        )}

        {/* Hint bar */}
        <div className="flex items-center gap-4 px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
          <span className="flex items-center gap-1"><ArrowUp size={12} /><ArrowDown size={12} /> điều hướng</span>
          <span className="flex items-center gap-1"><CornerDownLeft size={12} /> chọn</span>
          <span className="flex items-center gap-1"><kbd className="font-mono bg-white border border-slate-200 px-1 rounded text-slate-500">Esc</kbd> đóng</span>
        </div>
        </div>
      </div>
    </OverlayPortal>
  );
}

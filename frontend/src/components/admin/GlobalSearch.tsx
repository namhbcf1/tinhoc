// @ts-nocheck
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
  students:  { label: 'Học viên',   icon: Users,           color: 'text-[var(--admin-primary)]', bg: 'bg-[rgba(29,111,95,0.10)]' },
  classes:   { label: 'Lớp học',    icon: BookOpen,        color: 'text-[#315b80]',              bg: 'bg-[rgba(49,91,128,0.12)]' },
  posts:     { label: 'Bài viết',   icon: Newspaper,       color: 'text-[#2c7f86]',              bg: 'bg-[rgba(44,127,134,0.10)]' },
  navigate:  { label: 'Chuyển đến', icon: LayoutDashboard, color: 'text-[var(--admin-champagne)]', bg: 'bg-[rgba(200,169,106,0.14)]' },
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
      <mark className="rounded bg-[rgba(200,169,106,0.24)] px-0.5 font-black not-italic text-[var(--admin-ink)]">
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
        ${isActive ? 'bg-[rgba(200,169,106,0.14)]' : 'hover:bg-[rgba(255,250,241,0.78)]'}`}
    >
      <div className={`w-9 h-9 rounded-[14px] ${cat.bg} flex items-center justify-center flex-shrink-0 ring-1 ring-[rgba(19,34,56,0.08)]`}>
        <Icon size={16} className={cat.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black text-[var(--admin-ink)] truncate">
          <Highlight text={item.title} query={query} />
        </div>
        {item.subtitle && (
          <div className="text-xs font-semibold text-[var(--admin-text-muted)] truncate mt-0.5">
            <Highlight text={item.subtitle} query={query} />
          </div>
        )}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-[0.08em] px-2 py-1 rounded-full ${cat.bg} ${cat.color} flex-shrink-0`}>
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
        className="flex items-center gap-2 rounded-[16px] border border-[rgba(19,34,56,0.10)] bg-[rgba(255,250,241,0.86)] px-3 py-2 text-sm font-bold text-[var(--admin-text-muted)] shadow-[0_12px_24px_-22px_rgba(19,34,56,0.30)] transition hover:border-[rgba(200,169,106,0.30)] hover:bg-white hover:text-[var(--admin-ink)]"
      >
        <Search size={16} className="text-[var(--admin-champagne)]" />
        <span className="hidden md:inline">Tìm kiếm...</span>
      </button>
    );
  }

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[100000] flex items-start justify-center bg-[rgba(11,23,40,0.62)] pt-[12vh] backdrop-blur-sm"
        onMouseDown={closeSearch}
      >
        <div
          className="relative mx-4 w-full max-w-2xl overflow-hidden rounded-[28px] border border-[rgba(200,169,106,0.20)] bg-[linear-gradient(180deg,rgba(255,250,241,0.98),rgba(247,241,231,0.94))] shadow-[0_34px_90px_-44px_rgba(11,23,40,0.72)] animate-[fadeIn_0.15s_ease-out]"
          onMouseDown={(e) => e.stopPropagation()}
        >
        <div className="flex items-center gap-3 border-b border-[rgba(19,34,56,0.10)] bg-[radial-gradient(circle_at_top_right,rgba(200,169,106,0.18),transparent_30%),rgba(255,250,241,0.86)] px-5 py-4">
          {loading
            ? <div className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-[var(--admin-champagne)] border-t-transparent" />
            : <Search size={20} className="flex-shrink-0 text-[var(--admin-champagne)]" />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm học viên, lớp, khu vực quản trị..."
            className="flex-1 border-none bg-transparent text-base font-bold text-[var(--admin-ink)] outline-none placeholder:text-[var(--admin-text-light)]"
          />
          <button onClick={closeSearch} className="rounded-full bg-[rgba(19,34,56,0.08)] p-2 text-[var(--admin-text-muted)] transition hover:bg-[rgba(19,34,56,0.12)] hover:text-[var(--admin-ink)]">
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-96 overflow-y-auto divide-y divide-[rgba(19,34,56,0.07)]">
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
          <div className="px-5 py-10 text-center text-[var(--admin-text-muted)]">
            <Search size={32} className="mx-auto mb-2 text-[var(--admin-champagne)] opacity-60" />
            <p className="text-sm font-bold">Không tìm thấy &quot;{query}&quot;</p>
          </div>
        )}

        {/* Hint bar */}
        <div className="flex items-center gap-4 border-t border-[rgba(19,34,56,0.10)] bg-[rgba(239,227,209,0.56)] px-5 py-3 text-xs font-bold text-[var(--admin-text-muted)]">
          <span className="flex items-center gap-1"><ArrowUp size={12} /><ArrowDown size={12} /> điều hướng</span>
          <span className="flex items-center gap-1"><CornerDownLeft size={12} /> chọn</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-[rgba(19,34,56,0.12)] bg-[rgba(255,250,241,0.88)] px-1 font-mono text-[var(--admin-ink)]">Esc</kbd> đóng</span>
        </div>
        </div>
      </div>
    </OverlayPortal>
  );
}

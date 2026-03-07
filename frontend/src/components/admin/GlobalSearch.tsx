import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Users, BookOpen, X, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import api from '../../services/api';

// ─── Category icon + label map ──────────────────────────────────────────────────
const CATEGORIES = {
  students: { label: 'Học viên',  icon: Users,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  classes:  { label: 'Lớp học',   icon: BookOpen, color: 'text-blue-600',    bg: 'bg-blue-50'    },
};

// ─── Highlight matched text ─────────────────────────────────────────────────────
function Highlight({ text, query }) {
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
function ResultRow({ item, query, isActive, onSelect, onMouseEnter }) {
  const cat   = CATEGORIES[item.category];
  const Icon  = cat.icon;
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
export default function GlobalSearch({ onNavigate }) {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cursor,  setCursor]  = useState(0);       // keyboard cursor index

  const inputRef    = useRef(null);
  const debounceRef = useRef(null);

  // ── Open / close ──────────────────────────────────────────────────────────
  const openSearch  = useCallback(() => { setOpen(true);  setQuery(''); setResults([]); setCursor(0); }, []);
  const closeSearch = useCallback(() => { setOpen(false); setQuery(''); setResults([]); }, []);

  // ── Global Ctrl+K shortcut ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
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
    clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(() => runSearch(query.trim()), 280);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // ── Search across students + classes in parallel ──────────────────────────
  const runSearch = async (q) => {
    try {
      const [studentsRes, classesRes] = await Promise.allSettled([
        api.searchStudents(q),
        api.getClasses(),
      ]);

      const items = [];

      // Students
      if (studentsRes.status === 'fulfilled') {
        const data = Array.isArray(studentsRes.value?.data) ? studentsRes.value.data : [];
        data.slice(0, 8).forEach(s => {
          items.push({
            id:       `student-${s.id}`,
            category: 'students',
            title:    s.ho_ten_full || `${s.ho} ${s.ten_dem} ${s.ten}`.trim(),
            subtitle: `CCCD: ${s.cccd}${s.sdt ? ' · ' + s.sdt : ''}`,
            action:   () => onNavigate?.('students'),
          });
        });
      }

      // Classes — filter locally
      if (classesRes.status === 'fulfilled') {
        const data = Array.isArray(classesRes.value?.data) ? classesRes.value.data : [];
        const ql = q.toLowerCase();
        data
          .filter(c => c.ten_lop?.toLowerCase().includes(ql))
          .slice(0, 5)
          .forEach(c => {
            items.push({
              id:       `class-${c.id}`,
              category: 'classes',
              title:    c.ten_lop,
              subtitle: `Ngày thi: ${c.ngay_thi || 'N/A'} · ${c.status || ''}`,
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
  const handleKeyDown = (e) => {
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

  const selectResult = (item) => {
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
        <kbd className="hidden md:inline text-xs bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded font-mono">Ctrl K</kbd>
      </button>
    );
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm"
      onMouseDown={closeSearch}
    >
      {/* Palette panel */}
      <div
        className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_0.15s_ease-out]"
        onMouseDown={e => e.stopPropagation()}
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
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm học viên (tên, CCCD), lớp học..."
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
            <p className="text-sm font-medium">Không tìm thấy kết quả cho "<span className="text-slate-600">{query}</span>"</p>
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
  );
}

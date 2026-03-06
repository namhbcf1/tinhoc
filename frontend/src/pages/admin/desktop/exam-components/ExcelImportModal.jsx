import React, { useState, useEffect } from 'react';
import { X, Upload, AlertCircle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../../../../services/api';

// ExcelImportModal: import exam questions from Excel file
// Supports creating new exam or appending to existing one
export default function ExcelImportModal({ isOpen, onClose, onSuccess, examId: preselectedExamId }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [questionRows, setQuestionRows] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [importMode, setImportMode] = useState(preselectedExamId ? 'existing' : 'new');
  const [selectedExamId, setSelectedExamId] = useState(preselectedExamId || '');
  const [availableExams, setAvailableExams] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [examMetadata, setExamMetadata] = useState(null);

  useEffect(() => {
    if (isOpen && importMode === 'existing') loadExams();
  }, [isOpen, importMode]);

  const loadExams = async () => {
    try {
      const response = await api.getExams({ page: 1, pageSize: 100 });
      const exams = response.exams || response.data || [];
      setAvailableExams(exams.map(e => ({ id: String(e.id), title: e.title })));
    } catch (err) {
      console.error('Failed to load exams:', err);
    }
  };

  const findCol = (headerRow, name) => {
    for (let i = 0; i < headerRow.length; i++) {
      if (String(headerRow[i] || '').trim() === name) return i;
    }
    return -1;
  };

  const parseExcelFile = async (workbook) => {
    // Dynamically import xlsx to keep bundle manageable
    const XLSX = await import('xlsx');
    let metadata = null;

    const infoSheet = workbook.SheetNames.find(n => n.includes('Thông tin'));
    if (infoSheet) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[infoSheet], { header: 1 });
      const map = new Map();
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row && row.length >= 2 && row[0] && row[1]) map.set(String(row[0]).trim(), String(row[1]).trim());
      }
      metadata = {
        title: map.get('Tiêu đề') || '',
        code: map.get('Mã đề') || '',
        description: map.get('Mô tả') || '',
        level: map.get('Cấp độ') || 'B1',
        duration: Number(map.get('Thời gian (phút)') || 180),
        layoutMode: map.get('Kiểu đề') || 'LANGUAGE',
        status: map.get('Trạng thái') || 'draft',
      };
    }

    const qSheet = workbook.SheetNames.find(n => n.includes('Câu hỏi') || n.includes('Cau hoi'));
    if (!qSheet) throw new Error('Không tìm thấy sheet "Câu hỏi" trong file Excel');

    const allData = XLSX.utils.sheet_to_json(workbook.Sheets[qSheet], { header: 1, defval: '' });
    if (allData.length < 2) throw new Error('Sheet "Câu hỏi" không có dữ liệu');

    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(5, allData.length); i++) {
      const text = allData[i].map(c => String(c || '').trim()).join('|');
      if (text.includes('STT') && text.includes('Câu hỏi')) { headerRowIndex = i; break; }
    }
    if (headerRowIndex === -1) throw new Error('Không tìm thấy header row trong sheet "Câu hỏi"');

    const hr = allData[headerRowIndex];
    const cols = {
      stt: findCol(hr, 'STT'), phanThi: findCol(hr, 'Phần thi'), loaiPhan: findCol(hr, 'Loại phần'),
      nhomCauHoi: findCol(hr, 'Nhóm câu hỏi'), noiDung: findCol(hr, 'Nội dung đoạn văn/audio'),
      cauHoi: findCol(hr, 'Câu hỏi'), loai: findCol(hr, 'Loại'),
      optionA: findCol(hr, 'A'), optionB: findCol(hr, 'B'), optionC: findCol(hr, 'C'), optionD: findCol(hr, 'D'),
      dapAn: findCol(hr, 'Đáp án'), diem: findCol(hr, 'Điểm'), giaiThich: findCol(hr, 'Giải thích'),
    };
    if (cols.cauHoi === -1) throw new Error('Không tìm thấy cột "Câu hỏi"');

    const rows = [];
    const errors = [];
    for (let i = headerRowIndex + 1; i < allData.length; i++) {
      const row = allData[i];
      const cauHoi = cols.cauHoi >= 0 ? String(row[cols.cauHoi] || '').trim() : '';
      if (!cauHoi) continue;
      const qRow = {
        stt: cols.stt >= 0 ? Number(row[cols.stt]) || i - headerRowIndex : i - headerRowIndex,
        phanThi: cols.phanThi >= 0 ? String(row[cols.phanThi] || '').trim() : '',
        loaiPhan: (cols.loaiPhan >= 0 ? String(row[cols.loaiPhan] || '').trim().toUpperCase() : 'GENERAL') || 'GENERAL',
        nhomCauHoi: cols.nhomCauHoi >= 0 ? String(row[cols.nhomCauHoi] || '').trim() : '',
        noiDung: cols.noiDung >= 0 ? String(row[cols.noiDung] || '').trim() : '',
        cauHoi,
        loai: (cols.loai >= 0 ? String(row[cols.loai] || '').trim().toUpperCase() : 'MCQ') || 'MCQ',
        optionA: cols.optionA >= 0 ? String(row[cols.optionA] || '').trim() : '',
        optionB: cols.optionB >= 0 ? String(row[cols.optionB] || '').trim() : '',
        optionC: cols.optionC >= 0 ? String(row[cols.optionC] || '').trim() : '',
        optionD: cols.optionD >= 0 ? String(row[cols.optionD] || '').trim() : '',
        dapAn: cols.dapAn >= 0 ? String(row[cols.dapAn] || '').trim() : '',
        diem: cols.diem >= 0 ? Number(row[cols.diem]) || 1 : 1,
        giaiThich: cols.giaiThich >= 0 ? String(row[cols.giaiThich] || '').trim() : '',
      };
      const validTypes = ['READING', 'LISTENING', 'WRITING', 'SPEAKING', 'GENERAL'];
      if (!validTypes.includes(qRow.loaiPhan)) qRow.loaiPhan = 'GENERAL';
      rows.push(qRow);
    }

    // Build preview
    const sMap = new Map();
    rows.forEach(row => {
      const key = `${row.phanThi}_${row.loaiPhan}`;
      if (!sMap.has(key)) sMap.set(key, { title: row.phanThi || 'Chưa đặt tên', type: row.loaiPhan, groups: new Map(), questions: 0 });
      const s = sMap.get(key);
      s.questions++;
      if (row.nhomCauHoi) {
        s.groups.set(row.nhomCauHoi, (s.groups.get(row.nhomCauHoi) || 0) + 1);
      }
    });

    const preview = {
      sections: Array.from(sMap.values()).map(s => ({
        title: s.title, type: s.type,
        groups: Array.from(s.groups.entries()).map(([t, c]) => ({ title: t, questions: c })),
        questions: s.questions,
      })),
      totalQuestions: rows.length,
      errors,
    };

    return { metadata, rows, preview };
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) { setError('Vui lòng chọn file Excel (.xlsx hoặc .xls)'); return; }
    setFile(selectedFile);
    setError(''); setSuccess(''); setExamMetadata(null); setQuestionRows([]); setPreviewData(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const { metadata, rows, preview } = await parseExcelFile(workbook);
        setExamMetadata(metadata);
        setQuestionRows(rows);
        setPreviewData(preview);
        if (rows.length === 0) setError('Không tìm thấy câu hỏi nào trong file Excel');
      } catch (err) {
        setError(`Lỗi đọc file: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    if (!file || questionRows.length === 0) { setError('Vui lòng chọn file và kiểm tra dữ liệu trước khi import'); return; }
    if (importMode === 'existing' && !selectedExamId) { setError('Vui lòng chọn đề thi để thêm vào'); return; }

    setIsProcessing(true); setError(''); setSuccess('');
    setProgress({ current: 0, total: questionRows.length });

    try {
      let examId;
      if (importMode === 'new') {
        if (!examMetadata?.title) throw new Error('Không tìm thấy thông tin đề thi. Kiểm tra sheet "Thông tin đề thi"');
        const newExam = await api.createExam({
          title: examMetadata.title, code: examMetadata.code || undefined,
          description: examMetadata.description || undefined, level: examMetadata.level || 'B1',
          duration: examMetadata.duration || 180, status: examMetadata.status || 'draft',
          layoutMode: examMetadata.layoutMode || 'LANGUAGE',
        });
        examId = String(newExam.id);
      } else {
        examId = selectedExamId;
      }

      const sectionsMap = new Map();
      const groupsMap = new Map();
      let currentGroupKey = '';

      for (const row of questionRows) {
        const sKey = `${row.phanThi}_${row.loaiPhan}`;
        if (!sectionsMap.has(sKey)) {
          const section = await api.createExamSection(examId, { type: row.loaiPhan, title: row.phanThi || 'Section', duration: 0, instructions: '', orderIndex: sectionsMap.size + 1 });
          sectionsMap.set(sKey, { id: section.id, title: row.phanThi, type: row.loaiPhan });
        }
        const section = sectionsMap.get(sKey);
        if (row.nhomCauHoi) {
          const gKey = `${section.id}_${row.nhomCauHoi}`;
          if (gKey !== currentGroupKey) {
            currentGroupKey = gKey;
            if (!groupsMap.has(gKey)) {
              const isUrl = row.noiDung.startsWith('http://') || row.noiDung.startsWith('https://');
              const group = await api.createExamGroup(examId, { sectionId: section.id, title: row.nhomCauHoi, textContent: isUrl ? null : row.noiDung, audioUrl: isUrl ? row.noiDung : null, orderIndex: groupsMap.size + 1 });
              groupsMap.set(gKey, { id: group.id, sectionId: section.id });
            }
          }
        } else { currentGroupKey = ''; }
      }

      let successCount = 0; let errorCount = 0;
      currentGroupKey = '';
      for (let i = 0; i < questionRows.length; i++) {
        const row = questionRows[i];
        setProgress({ current: i + 1, total: questionRows.length });
        try {
          const sKey = `${row.phanThi}_${row.loaiPhan}`;
          const section = sectionsMap.get(sKey);
          let groupId = null;
          if (row.nhomCauHoi) {
            const gKey = `${section.id}_${row.nhomCauHoi}`;
            if (gKey !== currentGroupKey) currentGroupKey = gKey;
            const group = groupsMap.get(gKey);
            if (group) groupId = group.id;
          } else { currentGroupKey = ''; }

          let options;
          const loai = row.loai === 'MCQ' ? 'MULTIPLE_CHOICE' : row.loai === 'ESSAY' ? 'ESSAY' : row.loai === 'RECORDING' ? 'RECORDING' : row.loai === 'FILL_IN_BLANK' ? 'FILL_IN_BLANK' : 'MULTIPLE_CHOICE';
          if (row.loai === 'MCQ') {
            options = [];
            if (row.optionA) options.push({ id: '1', content: row.optionA, isCorrect: row.dapAn === 'A' });
            if (row.optionB) options.push({ id: '2', content: row.optionB, isCorrect: row.dapAn === 'B' });
            if (row.optionC) options.push({ id: '3', content: row.optionC, isCorrect: row.dapAn === 'C' });
            if (row.optionD) options.push({ id: '4', content: row.optionD, isCorrect: row.dapAn === 'D' });
            if (options.length < 2 || !['A', 'B', 'C', 'D'].includes(row.dapAn)) { errorCount++; continue; }
          }

          await api.createExamQuestion(examId, { sectionId: section.id, groupId, content: row.cauHoi, type: loai, options, correctAnswer: row.dapAn, points: row.diem, explanation: row.giaiThich, orderIndex: row.stt });
          successCount++;
        } catch (err) { console.error(`Row ${i + 1} error:`, err); errorCount++; }
      }

      if (successCount > 0) {
        setSuccess(`Đã import thành công ${successCount} câu hỏi${errorCount > 0 ? `, ${errorCount} câu hỏi lỗi` : ''}`);
        setTimeout(() => { onSuccess(); onClose(); }, 2000);
      } else {
        setError('Không thể import câu hỏi nào. Vui lòng kiểm tra lại dữ liệu.');
      }
    } catch (err) {
      setError(`Lỗi import: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const toggleSection = (key) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="inline-block bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full relative z-10">
          <div className="bg-white px-6 pt-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Import đề thi từ Excel</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500" disabled={isProcessing}><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2"><AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span></div>}
              {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2"><CheckCircle className="w-5 h-5 shrink-0" /><span>{success}</span></div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chọn file Excel</label>
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">{file ? file.name : 'Click để chọn file Excel'}</p>
                    <p className="text-xs text-gray-500 mt-1">.xlsx hoặc .xls</p>
                  </div>
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" disabled={isProcessing} />
                </label>
              </div>

              {questionRows.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chế độ import</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="importMode" value="new" checked={importMode === 'new'} onChange={() => setImportMode('new')} disabled={isProcessing} className="text-blue-600" />
                      <span className="text-sm">Tạo đề mới</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="importMode" value="existing" checked={importMode === 'existing'} onChange={() => { setImportMode('existing'); loadExams(); }} disabled={isProcessing} className="text-blue-600" />
                      <span className="text-sm">Thêm vào đề có sẵn</span>
                    </label>
                  </div>
                </div>
              )}

              {importMode === 'existing' && questionRows.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chọn đề thi</label>
                  <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} disabled={isProcessing} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Chọn đề thi --</option>
                    {availableExams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                </div>
              )}

              {previewData && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Xem trước ({previewData.totalQuestions} câu hỏi, {previewData.sections.length} phần)</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <div className="p-3 space-y-2">
                      {previewData.sections.map((section, idx) => {
                        const key = `${section.title}_${idx}`;
                        const expanded = expandedSections.has(key);
                        return (
                          <div key={key} className="border border-gray-200 rounded">
                            <button onClick={() => toggleSection(key)} className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-sm">
                              {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                              <span className="font-medium">{section.title} ({section.type})</span>
                              <span className="text-gray-500 text-xs ml-1">{section.questions} câu</span>
                            </button>
                            {expanded && (
                              <div className="px-3 pb-2 space-y-1">
                                {section.groups.length > 0 ? section.groups.map((g, gi) => (
                                  <div key={gi} className="pl-6 text-sm text-gray-600">• {g.title}: {g.questions} câu</div>
                                )) : <div className="pl-6 text-sm text-gray-500 italic">(Câu hỏi độc lập)</div>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {previewData.errors.length > 0 && <p className="mt-2 text-xs text-orange-600"><strong>Cảnh báo:</strong> {previewData.errors.length} dòng có lỗi sẽ bị bỏ qua</p>}
                </div>
              )}

              {isProcessing && progress.total > 0 && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Đang import...</span><span>{progress.current} / {progress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={isProcessing}>Hủy</button>
                <button type="button" onClick={handleImport} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isProcessing || questionRows.length === 0 || (importMode === 'existing' && !selectedExamId)}>
                  {isProcessing ? 'Đang import...' : 'Import đề thi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

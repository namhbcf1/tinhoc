// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ChevronRight,
  Database,
  Layers,
  ListChecks,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Tag,
  Trash2,
} from 'lucide-react';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import { useToast } from '../../../components/ui/ToastContainer';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';
import {
  MobileAdminBottomSheet,
  MobileAdminHeroCard,
  MobileAdminPrimaryButton,
  MobileAdminSearchField,
  MobileAdminSecondaryButton,
  MobileAdminSectionCard,
  MobileAdminStatCard,
  mobileAdminContentPadding,
} from '../shared/mobileAdminUi';

const CATEGORIES = [
  { id: 'organizer', label: 'Đơn vị', icon: Building2 },
  { id: 'program', label: 'Chương trình', icon: Layers },
  { id: 'level', label: 'Trình độ', icon: ListChecks },
  { id: 'field', label: 'Field mở rộng', icon: Tag },
];

const DELIVERY_MODE_OPTIONS = [
  { value: 'internal_training', label: 'Đào tạo nội bộ' },
  { value: 'external_redirect', label: 'Đi link ngoài' },
];

const ASSESSMENT_MODE_OPTIONS = [
  { value: 'none', label: 'Không có bài test chuẩn' },
  { value: 'official_exam', label: 'Thi / test chính thức' },
  { value: 'practice_test', label: 'Thi thử / luyện tập' },
  { value: 'manual_assessment', label: 'Đánh giá thủ công' },
  { value: 'mixed', label: 'Kết hợp nhiều hình thức' },
];

const SCHEDULE_MODEL_OPTIONS = [
  { value: 'session_based', label: 'Theo từng buổi học' },
  { value: 'weekly_template', label: 'Lịch tuần cũ / legacy' },
];

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Văn bản ngắn' },
  { value: 'number', label: 'Số' },
  { value: 'date', label: 'Ngày' },
  { value: 'select', label: 'Chọn 1' },
  { value: 'multi_select', label: 'Chọn nhiều' },
  { value: 'toggle', label: 'Bật / tắt' },
  { value: 'link', label: 'Đường dẫn' },
  { value: 'file', label: 'Tệp đính kèm' },
  { value: 'rich_text', label: 'Nội dung dài (rich text)' },
  { value: 'object', label: 'Đối tượng (object)' },
  { value: 'repeatable_group', label: 'Nhóm lặp' },
  { value: 'computed', label: 'Giá trị tính toán' },
];

const TARGET_ENTITY_OPTIONS = [
  { value: 'exam_schedule', label: 'Lịch thi (exam_schedule)' },
  { value: 'online_class', label: 'Lớp online (online_class)' },
  { value: 'class_session', label: 'Buổi học (class_session)' },
  { value: 'document', label: 'Tài liệu (document)' },
  { value: 'assignment', label: 'Bài tập (assignment)' },
  { value: 'practice_exam', label: 'Đề luyện tập (practice_exam)' },
  { value: 'program', label: 'Chương trình (program)' },
  { value: 'program_level', label: 'Trình độ (program_level)' },
];

const OWNER_ENTITY_TYPE_OPTIONS = [
  { value: 'organizer', label: 'Đơn vị' },
  { value: 'program', label: 'Chương trình' },
  { value: 'program_level', label: 'Trình độ' },
];

const FIELD_TYPE_LABELS = {
  text: 'Văn bản ngắn',
  number: 'Số',
  date: 'Ngày',
  select: 'Chọn 1',
  multi_select: 'Chọn nhiều',
  toggle: 'Bật / tắt',
  link: 'Đường dẫn',
  file: 'Tệp đính kèm',
  rich_text: 'Nội dung dài',
  object: 'Đối tượng',
  repeatable_group: 'Nhóm lặp',
  computed: 'Giá trị tính toán',
};

function isActiveItem(item) {
  return Boolean(item?.isActive ?? item?.is_active);
}

function ToneBadge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    violet: 'bg-violet-100 text-violet-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

const emptyOrganizer = { name: '', code: '', description: '', is_active: true };
const emptyProgram = {
  organizer_uuid: '', name: '', code: '', description: '',
  delivery_mode: 'internal_training', assessment_mode: 'none',
  certificate_enabled: false, schedule_model: 'session_based',
  redirect_url: '', training_enabled: true, linked_class_enabled: true,
  visible_on_edu_public: true, visible_on_edu_admin: true,
  visible_on_exam_teacher: true, visible_on_exam_student: true,
  is_active: true,
};
const emptyLevel = { program_uuid: '', name: '', code: '', description: '', sort_order: 0, is_active: true };
const emptyFieldDefinition = {
  uuid: '',
  field_key: '',
  label: '',
  description: '',
  field_type: 'text',
  target_entity_type: 'exam_schedule',
  owner_entity_type: 'organizer',
  owner_entity_uuid: '',
  placeholder: '',
  sort_order: 0,
  help_text: '',
  searchable: false,
  filterable: false,
  exportable: false,
  reportable: false,
  visible_on_edu_public: false,
  visible_on_edu_admin: true,
  visible_on_exam_teacher: true,
  visible_on_exam_student: false,
  config_json: '',
  is_active: true,
};
const emptyFieldOption = {
  uuid: '',
  field_definition_uuid: '',
  label: '',
  value: '',
  color: '',
  sort_order: 0,
  is_active: true,
};

function ProgramHierarchyLabel(program) {
  return [program?.organizerName, program?.name].filter(Boolean).join(' / ') || program?.name || '';
}

function LevelHierarchyLabel(level, programByUuid) {
  const program = programByUuid.get(level?.programUuid);
  return [program?.organizerName, level?.programName, level?.name].filter(Boolean).join(' / ') || level?.name || '';
}

export default function MobileProgramPlatformModule() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('organizer');

  const [organizers, setOrganizers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [levels, setLevels] = useState([]);
  const [fieldDefinitions, setFieldDefinitions] = useState([]);
  const [fieldOptions, setFieldOptions] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyOrganizer);
  const [submitting, setSubmitting] = useState(false);

  const [optionSheetOpen, setOptionSheetOpen] = useState(false);
  const [optionEditing, setOptionEditing] = useState(null);
  const [optionFormData, setOptionFormData] = useState(emptyFieldOption);
  const [optionSubmitting, setOptionSubmitting] = useState(false);

  const programByUuid = useMemo(() => new Map(programs.map((item) => [item.uuid, item])), [programs]);

  const ownerOptions = useMemo(() => [
    ...organizers.map((organizer) => ({ value: organizer.uuid, label: `Đơn vị · ${organizer.name}`, scopeType: 'organizer' })),
    ...programs.map((program) => ({ value: program.uuid, label: `Chương trình · ${ProgramHierarchyLabel(program)}`, scopeType: 'program' })),
    ...levels.map((level) => ({ value: level.uuid, label: `Trình độ · ${LevelHierarchyLabel(level, programByUuid)}`, scopeType: 'program_level' })),
  ], [organizers, programs, levels, programByUuid]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [organizersRes, programsRes, levelsRes, defsRes, optionsRes] = await Promise.all([
        api.getProgramOrganizers({ includeInactive: 1 }),
        api.getPrograms({ includeInactive: 1 }),
        api.getProgramLevels({ includeInactive: 1 }),
        api.getFieldDefinitions({ includeInactive: 1 }),
        api.getFieldOptions({ includeInactive: 1 }),
      ]);
      setOrganizers(Array.isArray(organizersRes?.data) ? organizersRes.data : []);
      setPrograms(Array.isArray(programsRes?.data) ? programsRes.data : []);
      setLevels(Array.isArray(levelsRes?.data) ? levelsRes.data : []);
      setFieldDefinitions(Array.isArray(defsRes?.data) ? defsRes.data : []);
      setFieldOptions(Array.isArray(optionsRes?.data) ? optionsRes.data : []);
    } catch (loadError) {
      error(`Không thể tải nền tảng chương trình: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);
  useAdminAutoRefresh(() => loadAll(), { minIntervalMs: 15000 });

  useEffect(() => {
    setSearchTerm('');
  }, [category]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const matches = (values) => !q || values.some((v) => String(v ?? '').toLowerCase().includes(q));

    if (category === 'organizer') {
      return organizers.filter((item) => matches([item.name, item.code, item.description]));
    }
    if (category === 'program') {
      return programs.filter((item) => matches([item.name, item.code, item.description, item.organizerName]));
    }
    if (category === 'level') {
      return levels.filter((item) => matches([item.name, item.code, item.description, item.programName]));
    }
    return fieldDefinitions.filter((item) => matches([item.label, item.fieldKey, item.description, item.fieldType]));
  }, [category, searchTerm, organizers, programs, levels, fieldDefinitions]);

  const openCreate = () => {
    setEditing(null);
    if (category === 'organizer') setFormData({ ...emptyOrganizer });
    if (category === 'program') setFormData({ ...emptyProgram });
    if (category === 'level') setFormData({ ...emptyLevel });
    if (category === 'field') setFormData({ ...emptyFieldDefinition });
    setSheetOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    if (category === 'organizer') {
      setFormData({
        name: item.name || '',
        code: item.code || '',
        description: item.description || '',
        is_active: isActiveItem(item),
      });
    }
    if (category === 'program') {
      setFormData({
        organizer_uuid: item.organizerUuid || '',
        name: item.name || '',
        code: item.code || '',
        description: item.description || '',
        delivery_mode: item.deliveryMode || 'internal_training',
        assessment_mode: item.assessmentMode || 'none',
        certificate_enabled: Boolean(item.certificateEnabled),
        schedule_model: item.scheduleModel || 'session_based',
        redirect_url: item.redirectUrl || '',
        training_enabled: Boolean(item.trainingEnabled),
        linked_class_enabled: Boolean(item.linkedClassEnabled),
        visible_on_edu_public: Boolean(item.visibleOnEduPublic),
        visible_on_edu_admin: Boolean(item.visibleOnEduAdmin),
        visible_on_exam_teacher: Boolean(item.visibleOnExamTeacher),
        visible_on_exam_student: Boolean(item.visibleOnExamStudent),
        is_active: isActiveItem(item),
      });
    }
    if (category === 'level') {
      setFormData({
        program_uuid: item.programUuid || '',
        name: item.name || '',
        code: item.code || '',
        description: item.description || '',
        sort_order: Number(item.sortOrder || 0),
        is_active: isActiveItem(item),
      });
    }
    if (category === 'field') {
      setFormData({
        uuid: item.uuid || '',
        field_key: item.fieldKey || '',
        label: item.label || '',
        description: item.description || '',
        field_type: item.fieldType || 'text',
        target_entity_type: item.targetEntityType || 'exam_schedule',
        owner_entity_type: item.ownerEntityType || 'organizer',
        owner_entity_uuid: item.ownerEntityUuid || '',
        placeholder: item.placeholder || '',
        sort_order: Number(item.sortOrder || 0),
        help_text: item.helpText || '',
        searchable: Boolean(item.searchable),
        filterable: Boolean(item.filterable),
        exportable: Boolean(item.exportable),
        reportable: Boolean(item.reportable),
        visible_on_edu_public: Boolean(item.visibleOnEduPublic),
        visible_on_edu_admin: Boolean(item.visibleOnEduAdmin),
        visible_on_exam_teacher: Boolean(item.visibleOnExamTeacher),
        visible_on_exam_student: Boolean(item.visibleOnExamStudent),
        config_json: typeof item.config === 'string' ? item.config : item.config ? JSON.stringify(item.config, null, 2) : '',
        is_active: isActiveItem(item),
      });
    }
    setSheetOpen(true);
  };

  const handleSubmit = async () => {
    if (category === 'organizer' && (!formData.name.trim() || !formData.code.trim())) {
      error('Tên và mã đơn vị là bắt buộc');
      return;
    }
    if (category === 'program' && (!formData.organizer_uuid || !formData.name.trim() || !formData.code.trim())) {
      error('Đơn vị, tên và mã chương trình là bắt buộc');
      return;
    }
    if (category === 'level' && (!formData.program_uuid || !formData.name.trim())) {
      error('Chương trình và tên trình độ là bắt buộc');
      return;
    }
    if (category === 'field' && (!formData.owner_entity_uuid || !formData.label.trim() || !formData.field_key.trim() || !formData.target_entity_type.trim())) {
      error('Phạm vi, tên hiển thị, mã kỹ thuật và loại dữ liệu áp dụng là bắt buộc');
      return;
    }

    setSubmitting(true);
    try {
      if (category === 'organizer') {
        if (editing) {
          await api.updateProgramOrganizer(editing.uuid, formData);
          success('Đã cập nhật đơn vị');
        } else {
          await api.createProgramOrganizer(formData);
          success('Đã tạo đơn vị');
        }
      }
      if (category === 'program') {
        if (editing) {
          await api.updateProgram(editing.uuid, formData);
          success('Đã cập nhật chương trình');
        } else {
          await api.createProgram(formData);
          success('Đã tạo chương trình');
        }
      }
      if (category === 'level') {
        if (editing) {
          await api.updateProgramLevel(editing.uuid, formData);
          success('Đã cập nhật trình độ');
        } else {
          await api.createProgramLevel(formData);
          success('Đã tạo trình độ');
        }
      }
      if (category === 'field') {
        if (formData.config_json.trim()) {
          JSON.parse(formData.config_json);
        }
        const payload = { ...formData, sort_order: Number(formData.sort_order || 0) };
        if (editing) {
          await api.updateFieldDefinition(editing.uuid, payload);
          success('Đã cập nhật field mở rộng');
        } else {
          await api.createFieldDefinition(payload);
          success('Đã tạo field mở rộng');
        }
      }
      setSheetOpen(false);
      await loadAll();
    } catch (submitError) {
      error(`Không thể lưu: ${submitError.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const openOptionCreate = () => {
    if (!editing?.uuid) return;
    setOptionEditing(null);
    setOptionFormData({ ...emptyFieldOption, field_definition_uuid: editing.uuid });
    setOptionSheetOpen(true);
  };

  const openOptionEdit = (option) => {
    setOptionEditing(option);
    setOptionFormData({
      uuid: option.uuid || '',
      field_definition_uuid: option.fieldDefinitionUuid || editing?.uuid || '',
      label: option.label || '',
      value: option.value || '',
      color: option.color || '',
      sort_order: Number(option.sortOrder || 0),
      is_active: isActiveItem(option),
    });
    setOptionSheetOpen(true);
  };

  const handleOptionSubmit = async () => {
    if (!optionFormData.field_definition_uuid || !optionFormData.label.trim() || !optionFormData.value.trim()) {
      error('Nhãn hiển thị và giá trị lưu là bắt buộc');
      return;
    }
    setOptionSubmitting(true);
    try {
      const payload = {
        ...optionFormData,
        field_definition_uuid: optionFormData.field_definition_uuid || editing?.uuid || '',
        sort_order: Number(optionFormData.sort_order || 0),
      };
      if (optionEditing) {
        await api.updateFieldOption(optionEditing.uuid, payload);
        success('Đã cập nhật lựa chọn');
      } else {
        await api.createFieldOption(payload);
        success('Đã tạo lựa chọn');
      }
      setOptionSheetOpen(false);
      await loadAll();
    } catch (submitError) {
      error(`Không thể lưu lựa chọn: ${submitError.message}`);
    } finally {
      setOptionSubmitting(false);
    }
  };

  const handleHideOption = async (option) => {
    if (!window.confirm(`Ẩn lựa chọn "${option.label}"? Lựa chọn sẽ không còn hiển thị nhưng dữ liệu cũ vẫn giữ nguyên.`)) return;
    setOptionSubmitting(true);
    try {
      await api.updateFieldOption(option.uuid, {
        uuid: option.uuid,
        field_definition_uuid: option.fieldDefinitionUuid || editing?.uuid || '',
        label: option.label || '',
        value: option.value || '',
        color: option.color || '',
        sort_order: Number(option.sortOrder || 0),
        is_active: false,
      });
      success('Đã ẩn lựa chọn');
      await loadAll();
    } catch (submitError) {
      error(`Không thể ẩn lựa chọn: ${submitError.message}`);
    } finally {
      setOptionSubmitting(false);
    }
  };

  const setField = (key, value) => setFormData((c) => ({ ...c, [key]: value }));

  return (
    <PullToRefreshWrapper onRefresh={loadAll}>
      <div className="min-h-screen bg-slate-50">
        <MobileAdminHeroCard
          eyebrow="Nền tảng chương trình"
          icon={Database}
          tone="blue"
          title="Chương trình tổng dùng chung"
          description="Duyệt đơn vị, chương trình, trình độ và field mở rộng dùng chung toàn hệ thống."
          actions={(
            <>
              <MobileAdminSecondaryButton onClick={loadAll}>
                <RefreshCw size={16} />
                Đồng bộ
              </MobileAdminSecondaryButton>
              {category !== 'field' ? (
                <MobileAdminPrimaryButton onClick={openCreate}>
                  <Plus size={16} />
                  Tạo mới
                </MobileAdminPrimaryButton>
              ) : (
                <MobileAdminPrimaryButton onClick={openCreate}>
                  <Plus size={16} />
                  Tạo field
                </MobileAdminPrimaryButton>
              )}
            </>
          )}
          stats={(
            <div className="grid grid-cols-2 gap-2">
              <MobileAdminStatCard label="Đơn vị" value={organizers.length} tone="blue" />
              <MobileAdminStatCard label="Chương trình" value={programs.length} tone="emerald" />
              <MobileAdminStatCard label="Trình độ" value={levels.length} tone="violet" />
              <MobileAdminStatCard label="Field" value={fieldDefinitions.length} tone="amber" />
            </div>
          )}
        />

        <div className="p-3 pt-3" style={{ paddingBottom: mobileAdminContentPadding(20) }}>
          <div className="mb-3 grid grid-cols-4 gap-1.5 rounded-[18px] border border-slate-200 bg-white p-1.5 shadow-sm">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center gap-1 rounded-[13px] px-1 py-2 text-[10px] font-black transition ${category === cat.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <cat.icon size={15} />
                {cat.label}
              </button>
            ))}
          </div>

          <MobileAdminSearchField
            value={searchTerm}
            onChange={setSearchTerm}
            onClear={() => setSearchTerm('')}
            placeholder={`Tìm ${CATEGORIES.find((c) => c.id === category)?.label.toLowerCase()}...`}
          />

          <div className="mt-3">
            {loading ? (
              <AdminLoadingState
                title="Đang tải nền tảng chương trình"
                hint="Đơn vị, chương trình, trình độ và field đang được đồng bộ."
                variant="mobile-list"
                accent="blue"
              />
            ) : filteredItems.length ? (
              <div className="space-y-2.5">
                {filteredItems.map((item) => {
                  if (category === 'organizer') {
                    return (
                      <ItemRow key={item.uuid} onClick={() => openEdit(item)}>
                        <div className="flex items-start gap-2">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-blue-100 text-blue-700">
                            <Building2 size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-black text-slate-900">{item.name}</p>
                              <ToneBadge tone="slate">{item.code}</ToneBadge>
                              <ToneBadge tone={isActiveItem(item) ? 'emerald' : 'rose'}>{isActiveItem(item) ? 'Hoạt động' : 'Đã ẩn'}</ToneBadge>
                            </div>
                            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{item.description || 'Chưa có mô tả'}</p>
                          </div>
                        </div>
                      </ItemRow>
                    );
                  }
                  if (category === 'program') {
                    return (
                      <ItemRow key={item.uuid} onClick={() => openEdit(item)}>
                        <div className="flex items-start gap-2">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-violet-100 text-violet-700">
                            <Layers size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-black text-slate-900">{item.name}</p>
                              <ToneBadge tone="slate">{item.code}</ToneBadge>
                              <ToneBadge tone={item.deliveryMode === 'external_redirect' ? 'amber' : 'emerald'}>
                                {item.deliveryMode === 'external_redirect' ? 'Link ngoài' : 'Nội bộ'}
                              </ToneBadge>
                            </div>
                            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                              {ProgramHierarchyLabel(item)} • {item.description || 'Chưa có mô tả'}
                            </p>
                          </div>
                        </div>
                      </ItemRow>
                    );
                  }
                  if (category === 'level') {
                    return (
                      <ItemRow key={item.uuid} onClick={() => openEdit(item)}>
                        <div className="flex items-start gap-2">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-emerald-100 text-emerald-700">
                            <ListChecks size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-black text-slate-900">{item.name}</p>
                              <ToneBadge tone="slate">{item.code}</ToneBadge>
                              <ToneBadge tone="blue">Thứ tự {item.sortOrder ?? 0}</ToneBadge>
                            </div>
                            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                              {LevelHierarchyLabel(item, programByUuid)} • {item.description || 'Chưa có mô tả'}
                            </p>
                          </div>
                        </div>
                      </ItemRow>
                    );
                  }
                  return (
                    <ItemRow key={item.uuid} onClick={() => openEdit(item)}>
                      <div className="flex items-start gap-2">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-amber-100 text-amber-700">
                          <Tag size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-black text-slate-900">{item.label}</p>
                            <ToneBadge tone="slate">{item.fieldKey}</ToneBadge>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <ToneBadge tone="blue">{FIELD_TYPE_LABELS[item.fieldType] || item.fieldType}</ToneBadge>
                            <ToneBadge tone="slate">Nhắm: {item.targetEntityType}</ToneBadge>
                            <ToneBadge tone="violet">
                              {fieldOptions.filter((opt) => opt.fieldDefinitionUuid === item.uuid).length} lựa chọn
                            </ToneBadge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{item.description || 'Chưa có mô tả'}</p>
                        </div>
                        <ChevronRight size={16} className="mt-1 shrink-0 text-slate-300" />
                      </div>
                    </ItemRow>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 opacity-60">
                <Search size={56} className="mb-2.5 text-slate-300" />
                <p className="font-medium text-slate-500">Không tìm thấy dữ liệu phù hợp</p>
              </div>
            )}
          </div>
        </div>

        <MobileAdminBottomSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={editing
            ? `Cập nhật ${CATEGORIES.find((c) => c.id === category)?.label.toLowerCase()}`
            : `Tạo ${CATEGORIES.find((c) => c.id === category)?.label.toLowerCase()} mới`}
          height="92dvh"
        >
          <div className="space-y-2 pb-4">
            {category === 'organizer' ? (
              <>
                <Field label="Tên đơn vị *">
                  <input type="text" value={formData.name} onChange={(e) => setField('name', e.target.value)} placeholder="VD: EDUGLOBAL" className={inputClass} />
                </Field>
                <Field label="Mã ngắn *">
                  <input type="text" value={formData.code} onChange={(e) => setField('code', e.target.value)} placeholder="EDUGLOBAL" className={inputClass} />
                </Field>
                <Field label="Mô tả">
                  <textarea value={formData.description} onChange={(e) => setField('description', e.target.value)} className={`${inputClass} min-h-20`} />
                </Field>
                <ToggleRow label="Đơn vị này đang hoạt động" checked={Boolean(formData.is_active)} onChange={(v) => setField('is_active', v)} />
              </>
            ) : null}

            {category === 'program' ? (
              <>
                <Field label="Đơn vị *">
                  <select value={formData.organizer_uuid} onChange={(e) => setField('organizer_uuid', e.target.value)} className={inputClass}>
                    <option value="">Chọn đơn vị</option>
                    {organizers.map((item) => <option key={item.uuid} value={item.uuid}>{item.name}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Tên chương trình *">
                    <input type="text" value={formData.name} onChange={(e) => setField('name', e.target.value)} placeholder="VD: Tiếng Anh" className={inputClass} />
                  </Field>
                  <Field label="Mã chương trình *">
                    <input type="text" value={formData.code} onChange={(e) => setField('code', e.target.value)} placeholder="TA" className={inputClass} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Kiểu đánh giá">
                    <select value={formData.assessment_mode} onChange={(e) => setField('assessment_mode', e.target.value)} className={inputClass}>
                      {ASSESSMENT_MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Hình thức học">
                    <select value={formData.delivery_mode} onChange={(e) => setField('delivery_mode', e.target.value)} className={inputClass}>
                      {DELIVERY_MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                </div>
                {formData.delivery_mode === 'external_redirect' ? (
                  <Field label="Link chuyển hướng">
                    <input type="text" value={formData.redirect_url} onChange={(e) => setField('redirect_url', e.target.value)} placeholder="/vept hoặc https://..." className={inputClass} />
                  </Field>
                ) : null}
                <Field label="Mô tả ngắn">
                  <textarea value={formData.description} onChange={(e) => setField('description', e.target.value)} className={`${inputClass} min-h-20`} />
                </Field>
                <Field label="Mô hình lịch">
                  <select value={formData.schedule_model} onChange={(e) => setField('schedule_model', e.target.value)} className={inputClass}>
                    {SCHEDULE_MODEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <div className="space-y-2">
                  <ToggleRow label="Có chứng chỉ đầu ra" checked={Boolean(formData.certificate_enabled)} onChange={(v) => setField('certificate_enabled', v)} />
                  <ToggleRow label="Cho phép đào tạo" checked={Boolean(formData.training_enabled)} onChange={(v) => setField('training_enabled', v)} />
                  <ToggleRow label="Cho phép tạo lớp liên kết" checked={Boolean(formData.linked_class_enabled)} onChange={(v) => setField('linked_class_enabled', v)} />
                  <ToggleRow label="Hiện ở trang công khai Edu" checked={Boolean(formData.visible_on_edu_public)} onChange={(v) => setField('visible_on_edu_public', v)} />
                  <ToggleRow label="Hiện trong quản trị Edu" checked={Boolean(formData.visible_on_edu_admin)} onChange={(v) => setField('visible_on_edu_admin', v)} />
                  <ToggleRow label="Hiện cho giáo viên bên Exam" checked={Boolean(formData.visible_on_exam_teacher)} onChange={(v) => setField('visible_on_exam_teacher', v)} />
                  <ToggleRow label="Hiện cho học viên bên Exam" checked={Boolean(formData.visible_on_exam_student)} onChange={(v) => setField('visible_on_exam_student', v)} />
                  <ToggleRow label="Chương trình đang hoạt động" checked={Boolean(formData.is_active)} onChange={(v) => setField('is_active', v)} />
                </div>
              </>
            ) : null}

            {category === 'level' ? (
              <>
                <Field label="Chương trình *">
                  <select value={formData.program_uuid} onChange={(e) => setField('program_uuid', e.target.value)} className={inputClass}>
                    <option value="">Chọn chương trình</option>
                    {programs.map((item) => <option key={item.uuid} value={item.uuid}>{ProgramHierarchyLabel(item)}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Tên trình độ *">
                    <input type="text" value={formData.name} onChange={(e) => setField('name', e.target.value)} placeholder="VD: B1" className={inputClass} />
                  </Field>
                  <Field label="Mã trình độ">
                    <input type="text" value={formData.code} onChange={(e) => setField('code', e.target.value)} placeholder="B1" className={inputClass} />
                  </Field>
                </div>
                <Field label="Thứ tự sắp xếp">
                  <input type="number" value={formData.sort_order} onChange={(e) => setField('sort_order', Number(e.target.value) || 0)} className={inputClass} />
                </Field>
                <Field label="Mô tả">
                  <textarea value={formData.description} onChange={(e) => setField('description', e.target.value)} className={`${inputClass} min-h-20`} />
                </Field>
                <ToggleRow label="Trình độ đang hoạt động" checked={Boolean(formData.is_active)} onChange={(v) => setField('is_active', v)} />
              </>
            ) : null}

            {category === 'field' ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Loại phạm vi *">
                    <select
                      value={formData.owner_entity_type}
                      onChange={(e) => {
                        setField('owner_entity_type', e.target.value);
                        setField('owner_entity_uuid', '');
                      }}
                      className={inputClass}
                    >
                      {OWNER_ENTITY_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Phạm vi cụ thể *">
                    <select value={formData.owner_entity_uuid} onChange={(e) => setField('owner_entity_uuid', e.target.value)} className={inputClass}>
                      <option value="">Chọn phạm vi</option>
                      {ownerOptions.filter((o) => o.scopeType === formData.owner_entity_type).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Tên hiển thị *">
                    <input type="text" value={formData.label} onChange={(e) => setField('label', e.target.value)} placeholder="VD: Thời lượng thi" className={inputClass} />
                  </Field>
                  <Field label="Mã kỹ thuật *">
                    <input type="text" value={formData.field_key} onChange={(e) => setField('field_key', e.target.value)} placeholder="vd: thoi_luong_thi_phut" className={inputClass} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Loại field">
                    <select value={formData.field_type} onChange={(e) => setField('field_type', e.target.value)} className={inputClass}>
                      {FIELD_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Dữ liệu áp dụng cho *">
                    <select value={formData.target_entity_type} onChange={(e) => setField('target_entity_type', e.target.value)} className={inputClass}>
                      {TARGET_ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Thứ tự">
                    <input type="number" value={formData.sort_order} onChange={(e) => setField('sort_order', Number(e.target.value) || 0)} className={inputClass} />
                  </Field>
                  <Field label="Placeholder">
                    <input type="text" value={formData.placeholder} onChange={(e) => setField('placeholder', e.target.value)} placeholder="VD: Nhập số phút..." className={inputClass} />
                  </Field>
                </div>
                <Field label="Mô tả">
                  <textarea value={formData.description} onChange={(e) => setField('description', e.target.value)} className={`${inputClass} min-h-20`} />
                </Field>
                <Field label="Gợi ý nhập liệu">
                  <textarea value={formData.help_text} onChange={(e) => setField('help_text', e.target.value)} className={`${inputClass} min-h-20`} />
                </Field>
                <Field label="Cấu hình JSON">
                  <textarea value={formData.config_json} onChange={(e) => setField('config_json', e.target.value)} placeholder='{"optionsSource":"manual"}' className={`${inputClass} min-h-20 font-mono text-xs`} />
                </Field>
                <ToggleRow label="Field đang hoạt động" checked={Boolean(formData.is_active)} onChange={(v) => setField('is_active', v)} />

                {editing ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-slate-900">Lựa chọn của field</p>
                        <p className="text-[11px] text-slate-500">
                          {fieldOptions.filter((opt) => opt.fieldDefinitionUuid === editing.uuid).length} lựa chọn
                        </p>
                      </div>
                      <MobileAdminPrimaryButton onClick={openOptionCreate} disabled={optionSubmitting}>
                        <Plus size={14} />
                        Thêm
                      </MobileAdminPrimaryButton>
                    </div>
                    <div className="mt-2.5 space-y-2">
                      {fieldOptions.filter((opt) => opt.fieldDefinitionUuid === editing.uuid).length ? (
                        fieldOptions
                          .filter((opt) => opt.fieldDefinitionUuid === editing.uuid)
                          .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
                          .map((opt) => (
                            <div key={opt.uuid} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-slate-800">{opt.label}</p>
                                <p className="truncate text-[10px] text-slate-500">
                                  {opt.value} • Thứ tự {opt.sortOrder ?? 0}
                                  {!isActiveItem(opt) ? ' • Đã ẩn' : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => openOptionEdit(opt)}
                                className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-700"
                              >
                                Sửa
                              </button>
                              {isActiveItem(opt) ? (
                                <button
                                  type="button"
                                  onClick={() => handleHideOption(opt)}
                                  className="flex shrink-0 items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-700"
                                >
                                  <Trash2 size={11} />
                                  Ẩn
                                </button>
                              ) : null}
                            </div>
                          ))
                      ) : (
                        <p className="py-2 text-center text-[11px] font-bold text-slate-400">Field này chưa có lựa chọn</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            <MobileAdminPrimaryButton onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editing ? 'Lưu cập nhật' : 'Tạo mới'}
            </MobileAdminPrimaryButton>
          </div>
        </MobileAdminBottomSheet>

        <MobileAdminBottomSheet
          isOpen={optionSheetOpen}
          onClose={() => setOptionSheetOpen(false)}
          title={optionEditing ? 'Sửa lựa chọn' : 'Thêm lựa chọn mới'}
          height="72dvh"
        >
          <div className="space-y-2 pb-4">
            <Field label="Nhãn hiển thị *">
              <input type="text" value={optionFormData.label} onChange={(e) => setOptionFormData((c) => ({ ...c, label: e.target.value }))} placeholder="VD: Có" className={inputClass} />
            </Field>
            <Field label="Giá trị lưu *">
              <input type="text" value={optionFormData.value} onChange={(e) => setOptionFormData((c) => ({ ...c, value: e.target.value }))} placeholder="VD: yes" className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Màu (tùy chọn)">
                <input type="text" value={optionFormData.color} onChange={(e) => setOptionFormData((c) => ({ ...c, color: e.target.value }))} placeholder="#2563eb" className={inputClass} />
              </Field>
              <Field label="Thứ tự">
                <input type="number" value={optionFormData.sort_order} onChange={(e) => setOptionFormData((c) => ({ ...c, sort_order: Number(e.target.value) || 0 }))} className={inputClass} />
              </Field>
            </div>
            <ToggleRow label="Option đang hoạt động" checked={Boolean(optionFormData.is_active)} onChange={(v) => setOptionFormData((c) => ({ ...c, is_active: v }))} />
            <MobileAdminPrimaryButton onClick={handleOptionSubmit} disabled={optionSubmitting} className="w-full">
              {optionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {optionEditing ? 'Lưu lựa chọn' : 'Tạo lựa chọn'}
            </MobileAdminPrimaryButton>
          </div>
        </MobileAdminBottomSheet>
      </div>
    </PullToRefreshWrapper>
  );
}

const inputClass = 'h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[16px] text-slate-900';

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 rounded"
      />
    </label>
  );
}

function ItemRow({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[20px] border border-slate-200 bg-white p-3 text-left shadow-sm transition active:scale-[0.99]"
    >
      {children}
    </button>
  );
}
// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { Database } from 'lucide-react';
import api from '../../../services/api';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Badge } from '../../../components/ui/Badge';
import { Textarea } from '../../../components/ui/Textarea';
import { showError } from '../../../utils/errorHandler';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';
import { LearningInfoPill, LearningWorkspaceHeader } from '../shared/LearningWorkspaceHeader';

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

const STEP_ITEMS = [
  {
    id: 'organizer',
    number: '01',
    title: 'Đơn vị tổ chức',
    description: 'Tạo hoặc sửa đơn vị gốc trước khi tạo chương trình con.',
  },
  {
    id: 'program',
    number: '02',
    title: 'Chương trình đào tạo',
    description: 'Khai báo tên chương trình thực tế, kiểu đánh giá và cách chương trình vận hành.'
  },
  {
    id: 'level',
    number: '03',
    title: 'Trình độ',
    description: 'Trình độ là tùy chọn theo từng chương trình. Không bắt buộc chương trình nào cũng phải có.',
  },
  {
    id: 'field',
    number: '04',
    title: 'Field mở rộng',
    description: 'Field giúp thêm dữ liệu linh hoạt cho biểu mẫu, báo cáo, lọc và xuất file.',
  },
] as const;

const emptyOrganizerForm = {
  uuid: '',
  name: '',
  code: '',
  description: '',
  is_active: true,
};

const emptyProgramForm = {
  uuid: '',
  organizer_uuid: '',
  name: '',
  code: '',
  description: '',
  delivery_mode: 'internal_training',
  assessment_mode: 'none',
  certificate_enabled: false,
  schedule_model: 'session_based',
  redirect_url: '',
  training_enabled: true,
  linked_class_enabled: true,
  visible_on_edu_public: true,
  visible_on_edu_admin: true,
  visible_on_exam_teacher: true,
  visible_on_exam_student: true,
  is_active: true,
};

const emptyLevelForm = {
  uuid: '',
  program_uuid: '',
  name: '',
  code: '',
  description: '',
  sort_order: 0,
  is_active: true,
};

const emptyFieldDefinitionForm = {
  uuid: '',
  field_key: '',
  label: '',
  description: '',
  field_type: 'text',
  target_entity_type: 'exam_schedule',
  owner_entity_type: 'program',
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

const emptyFieldOptionForm = {
  uuid: '',
  field_definition_uuid: '',
  label: '',
  value: '',
  color: '',
  sort_order: 0,
  is_active: true,
};

type StepId = (typeof STEP_ITEMS)[number]['id'];
type OwnerEntityType = 'organizer' | 'program' | 'program_level';

function isActiveItem(item: any) {
  return Boolean(item?.isActive ?? item?.is_active);
}

function normalizedValue(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function matchesQuery(values: unknown[], query: string) {
  const normalizedQuery = normalizedValue(query);
  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) => normalizedValue(value).includes(normalizedQuery));
}

function formatCountLabel(count: number, singular: string, plural = singular) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getModeLabel(isEditing: boolean, noun: string) {
  return isEditing ? `Đang chỉnh sửa ${noun}` : `Tạo ${noun} mới`;
}

function getFieldTypeLabel(fieldType: string) {
  return FIELD_TYPE_OPTIONS.find((item) => item.value === fieldType)?.label || fieldType;
}

function getTargetEntityLabel(targetEntityType: string) {
  return TARGET_ENTITY_OPTIONS.find((item) => item.value === targetEntityType)?.label || targetEntityType;
}

function getProgramHierarchyLabel(program: any) {
  return [program?.organizerName, program?.name].filter(Boolean).join(' / ') || program?.name || '';
}

function getLevelHierarchyLabel(level: any, programByUuid: Map<string, any>) {
  const program = programByUuid.get(level?.programUuid);
  return [program?.organizerName, level?.programName, level?.name].filter(Boolean).join(' / ') || level?.name || '';
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function Panel({ title, hint, actions, children }: { title: string; hint?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {hint ? <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p> : null}
        </div>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: 'blue' | 'emerald' | 'amber' | 'fuchsia';
}) {
  const toneClasses = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    fuchsia: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  }[tone];

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StepCard({ number, title, description, active, completed, onClick }: {
  number: string; title: string; description: string; active: boolean; completed: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full rounded-[12px] border px-3 py-2.5 text-left transition ${active ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/60'}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className={`text-[10px] font-semibold ${active ? 'text-blue-600' : 'text-slate-400'}`}>Bước {number}</div>
          <div className="text-[13px] font-semibold leading-tight mt-0.5">{title}</div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {completed ? 'Có' : 'Trống'}
        </span>
      </div>
    </button>
  );
}

function ContextCard({ label, value, hint, active, onFocus, onClear }: {
  label: string; value: string; hint: string; active: boolean; onFocus: () => void; onClear: () => void;
}) {
  return (
    <div className={`rounded-[12px] border px-3 py-2.5 ${active ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
          <div className="text-[13px] font-semibold text-slate-900 truncate">{value || 'Chưa chọn'}</div>
        </div>
        {value ? (
          <button type="button" onClick={onClear} className="shrink-0 text-[11px] font-semibold text-slate-400 hover:text-slate-700">X</button>
        ) : null}
      </div>
      <button type="button" onClick={onFocus}
        className="mt-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800">Đi tới bước →</button>
    </div>
  );
}

function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-8 text-center">
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      <div className="mt-2 text-sm text-slate-500">{hint}</div>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

function RowButton({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
        active ? 'border-blue-300 bg-blue-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
      }`}
    >
      {children}
    </button>
  );
}

function buildProgramInternalPreset(current: typeof emptyProgramForm) {
  return {
    ...current,
    delivery_mode: 'internal_training',
    schedule_model: 'session_based',
    redirect_url: '',
    training_enabled: true,
    linked_class_enabled: true,
    visible_on_exam_teacher: true,
    visible_on_exam_student: true,
  };
}

function buildProgramExternalPreset(current: typeof emptyProgramForm) {
  return {
    ...current,
    delivery_mode: 'external_redirect',
    schedule_model: 'session_based',
    training_enabled: false,
    linked_class_enabled: false,
    visible_on_exam_teacher: false,
    visible_on_exam_student: false,
  };
}

export default function ProgramPlatformPage() {
  const { toasts, removeToast, success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [activeStep, setActiveStep] = useState<StepId>('organizer');

  const [organizers, setOrganizers] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [fieldDefinitions, setFieldDefinitions] = useState<any[]>([]);
  const [fieldOptions, setFieldOptions] = useState<any[]>([]);

  const [organizerForm, setOrganizerForm] = useState(emptyOrganizerForm);
  const [programForm, setProgramForm] = useState(emptyProgramForm);
  const [levelForm, setLevelForm] = useState(emptyLevelForm);
  const [fieldDefinitionForm, setFieldDefinitionForm] = useState(emptyFieldDefinitionForm);
  const [fieldOptionForm, setFieldOptionForm] = useState(emptyFieldOptionForm);

  const [selectedOrganizerUuid, setSelectedOrganizerUuid] = useState('');
  const [selectedProgramUuid, setSelectedProgramUuid] = useState('');
  const [selectedLevelUuid, setSelectedLevelUuid] = useState('');
  const [selectedFieldDefinitionUuid, setSelectedFieldDefinitionUuid] = useState('');

  const [organizerSearch, setOrganizerSearch] = useState('');
  const [programSearch, setProgramSearch] = useState('');
  const [levelSearch, setLevelSearch] = useState('');
  const [fieldSearch, setFieldSearch] = useState('');

  const [fieldOwnerType, setFieldOwnerType] = useState<OwnerEntityType>('program');
  const [fieldOwnerUuid, setFieldOwnerUuid] = useState('');

  const organizerByUuid = useMemo(
    () => new Map(organizers.map((item) => [item.uuid, item])),
    [organizers]
  );

  const programByUuid = useMemo(
    () => new Map(programs.map((item) => [item.uuid, item])),
    [programs]
  );

  const ownerOptions = useMemo(() => {
    return [
      ...organizers.map((organizer) => ({
        value: organizer.uuid,
        label: `Đơn vị · ${organizer.name}`,
        scopeType: 'organizer',
      })),
      ...programs.map((program) => ({
        value: program.uuid,
        label: `Chương trình · ${getProgramHierarchyLabel(program)}`,
        scopeType: 'program',
      })),
      ...levels.map((level) => ({
        value: level.uuid,
        label: `Trình độ · ${getLevelHierarchyLabel(level, programByUuid)}`,
        scopeType: 'program_level',
      })),
    ];
  }, [levels, organizers, programByUuid, programs]);

  const selectedOrganizer = useMemo(
    () => organizers.find((item) => item.uuid === selectedOrganizerUuid) || null,
    [organizers, selectedOrganizerUuid]
  );

  const selectedProgram = useMemo(
    () => programs.find((item) => item.uuid === selectedProgramUuid) || null,
    [programs, selectedProgramUuid]
  );

  const selectedLevel = useMemo(
    () => levels.find((item) => item.uuid === selectedLevelUuid) || null,
    [levels, selectedLevelUuid]
  );

  const selectedFieldDefinition = useMemo(
    () => fieldDefinitions.find((item) => item.uuid === selectedFieldDefinitionUuid) || null,
    [fieldDefinitions, selectedFieldDefinitionUuid]
  );

  const suggestedFieldContext = useMemo(() => {
    if (selectedLevelUuid) {
      return { type: 'program_level' as OwnerEntityType, uuid: selectedLevelUuid };
    }
    if (selectedProgramUuid) {
      return { type: 'program' as OwnerEntityType, uuid: selectedProgramUuid };
    }
    if (selectedOrganizerUuid) {
      return { type: 'organizer' as OwnerEntityType, uuid: selectedOrganizerUuid };
    }
    return { type: 'program' as OwnerEntityType, uuid: '' };
  }, [selectedLevelUuid, selectedProgramUuid, selectedOrganizerUuid]);

  const visibleOwnerOptions = useMemo(
    () => ownerOptions.filter((item) => item.scopeType === fieldOwnerType),
    [fieldOwnerType, ownerOptions]
  );

  const visibleOrganizers = useMemo(
    () => organizers.filter((item) => matchesQuery([item.name, item.code, item.description], organizerSearch)),
    [organizerSearch, organizers]
  );

  const visiblePrograms = useMemo(() => {
    const scoped = selectedOrganizerUuid
      ? programs.filter((item) => item.organizerUuid === selectedOrganizerUuid)
      : programs;

    return scoped.filter((item) =>
      matchesQuery([item.name, item.code, item.description, item.organizerName], programSearch)
    );
  }, [programSearch, programs, selectedOrganizerUuid]);

  const visibleLevels = useMemo(() => {
    let scoped = levels;

    if (selectedProgramUuid) {
      scoped = scoped.filter((item) => item.programUuid === selectedProgramUuid);
    } else if (selectedOrganizerUuid) {
      scoped = scoped.filter((item) => {
        const program = programByUuid.get(item.programUuid);
        return program?.organizerUuid === selectedOrganizerUuid;
      });
    }

    return scoped.filter((item) =>
      matchesQuery([item.name, item.code, item.description, item.programName], levelSearch)
    );
  }, [levelSearch, levels, programByUuid, selectedOrganizerUuid, selectedProgramUuid]);

  const visibleFieldDefinitions = useMemo(() => {
    let scoped = fieldDefinitions;

    if (fieldOwnerUuid) {
      scoped = scoped.filter(
        (item) => item.ownerEntityType === fieldOwnerType && item.ownerEntityUuid === fieldOwnerUuid
      );
    }

    return scoped.filter((item) =>
      matchesQuery(
        [
          item.label,
          item.fieldKey,
          item.description,
          item.fieldType,
          item.targetEntityType,
          ownerOptions.find(
            (owner) =>
              owner.scopeType === item.ownerEntityType && owner.value === item.ownerEntityUuid
          )?.label,
        ],
        fieldSearch
      )
    );
  }, [fieldDefinitions, fieldOwnerType, fieldOwnerUuid, fieldSearch, ownerOptions]);

  const visibleFieldOptions = useMemo(() => {
    if (!selectedFieldDefinitionUuid) {
      return [];
    }

    return fieldOptions
      .filter((item) => item.fieldDefinitionUuid === selectedFieldDefinitionUuid)
      .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
  }, [fieldOptions, selectedFieldDefinitionUuid]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [organizersRes, programsRes, levelsRes, definitionsRes, optionsRes] = await Promise.all([
        api.getProgramOrganizers({ includeInactive: 1 }),
        api.getPrograms({ includeInactive: 1 }),
        api.getProgramLevels({ includeInactive: 1 }),
        api.getFieldDefinitions({ includeInactive: 1 }),
        api.getFieldOptions({ includeInactive: 1 }),
      ]);

      setOrganizers(organizersRes?.data || []);
      setPrograms(programsRes?.data || []);
      setLevels(levelsRes?.data || []);
      setFieldDefinitions(definitionsRes?.data || []);
      setFieldOptions(optionsRes?.data || []);
    } catch (err) {
      showError(err, { error });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);
  useAdminAutoRefresh(() => loadAll(), { minIntervalMs: 15000 });

  useEffect(() => {
    if (selectedOrganizerUuid && !organizerByUuid.has(selectedOrganizerUuid)) {
      setSelectedOrganizerUuid('');
    }
    if (selectedProgramUuid && !programByUuid.has(selectedProgramUuid)) {
      setSelectedProgramUuid('');
    }
    if (selectedLevelUuid && !levels.some((item) => item.uuid === selectedLevelUuid)) {
      setSelectedLevelUuid('');
    }
    if (selectedFieldDefinitionUuid && !fieldDefinitions.some((item) => item.uuid === selectedFieldDefinitionUuid)) {
      setSelectedFieldDefinitionUuid('');
      setFieldOptionForm(emptyFieldOptionForm);
    }
  }, [
    fieldDefinitions,
    levels,
    organizerByUuid,
    programByUuid,
    selectedFieldDefinitionUuid,
    selectedLevelUuid,
    selectedOrganizerUuid,
    selectedProgramUuid,
  ]);

  const handleSubmit = async (
    key: string,
    action: () => Promise<any>,
    onDone: () => void,
    successMessage: string
  ) => {
    setSavingKey(key);
    try {
      await action();
      success(successMessage);
      onDone();
      await loadAll();
    } catch (err) {
      showError(err, { error });
    } finally {
      setSavingKey('');
    }
  };

  const goToStep = (stepId: StepId) => setActiveStep(stepId);

  const clearSelectedFieldDefinition = () => {
    setSelectedFieldDefinitionUuid('');
    setFieldOptionForm(emptyFieldOptionForm);
  };

  const clearSelectedLevel = () => {
    setSelectedLevelUuid('');
    clearSelectedFieldDefinition();
  };

  const clearSelectedProgram = () => {
    setSelectedProgramUuid('');
    clearSelectedLevel();
  };

  const clearSelectedOrganizer = () => {
    setSelectedOrganizerUuid('');
    clearSelectedProgram();
  };

  const startNewOrganizer = () => {
    setOrganizerForm(emptyOrganizerForm);
    goToStep('organizer');
  };

  const startEditOrganizer = (item: any) => {
    setSelectedOrganizerUuid(item.uuid);
    setOrganizerForm({
      uuid: item.uuid,
      name: item.name || '',
      code: item.code || '',
      description: item.description || '',
      is_active: isActiveItem(item),
    });
    goToStep('organizer');
  };

  const startNewProgram = () => {
    setProgramForm({
      ...emptyProgramForm,
      organizer_uuid: selectedOrganizerUuid || '',
    });
    goToStep('program');
  };

  const startEditProgram = (item: any) => {
    setSelectedOrganizerUuid(item.organizerUuid || '');
    setSelectedProgramUuid(item.uuid);
    setProgramForm({
      uuid: item.uuid,
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
    goToStep('program');
  };

  const startNewLevel = () => {
    setLevelForm({
      ...emptyLevelForm,
      program_uuid: selectedProgramUuid || '',
    });
    goToStep('level');
  };

  const startEditLevel = (item: any) => {
    setSelectedLevelUuid(item.uuid);
    setSelectedProgramUuid(item.programUuid || '');
    const parentProgram = programByUuid.get(item.programUuid);
    if (parentProgram?.organizerUuid) {
      setSelectedOrganizerUuid(parentProgram.organizerUuid);
    }

    setLevelForm({
      uuid: item.uuid,
      program_uuid: item.programUuid || '',
      name: item.name || '',
      code: item.code || '',
      description: item.description || '',
      sort_order: Number(item.sortOrder || 0),
      is_active: isActiveItem(item),
    });
    goToStep('level');
  };

  const startNewFieldDefinition = () => {
    setFieldDefinitionForm({
      ...emptyFieldDefinitionForm,
      owner_entity_type: fieldOwnerUuid ? fieldOwnerType : suggestedFieldContext.type,
      owner_entity_uuid: fieldOwnerUuid || suggestedFieldContext.uuid,
    });
    setSelectedFieldDefinitionUuid('');
    goToStep('field');
  };

  const startEditFieldDefinition = (field: any) => {
    setSelectedFieldDefinitionUuid(field.uuid);
    setFieldOwnerType((field.ownerEntityType || 'program') as OwnerEntityType);
    setFieldOwnerUuid(field.ownerEntityUuid || '');
    setFieldDefinitionForm({
      uuid: field.uuid,
      field_key: field.fieldKey || '',
      label: field.label || '',
      description: field.description || '',
      field_type: field.fieldType || 'text',
      target_entity_type: field.targetEntityType || 'exam_schedule',
      owner_entity_type: field.ownerEntityType || 'program',
      owner_entity_uuid: field.ownerEntityUuid || '',
      placeholder: field.placeholder || '',
      sort_order: Number(field.sortOrder || 0),
      help_text: field.helpText || '',
      searchable: Boolean(field.searchable),
      filterable: Boolean(field.filterable),
      exportable: Boolean(field.exportable),
      reportable: Boolean(field.reportable),
      visible_on_edu_public: Boolean(field.visibleOnEduPublic),
      visible_on_edu_admin: Boolean(field.visibleOnEduAdmin),
      visible_on_exam_teacher: Boolean(field.visibleOnExamTeacher),
      visible_on_exam_student: Boolean(field.visibleOnExamStudent),
      config_json: typeof field.config === 'string' ? field.config : field.config ? JSON.stringify(field.config, null, 2) : '',
      is_active: isActiveItem(field),
    });
    setFieldOptionForm({
      ...emptyFieldOptionForm,
      field_definition_uuid: field.uuid,
    });
    goToStep('field');
  };

  const startNewFieldOption = () => {
    setFieldOptionForm({
      ...emptyFieldOptionForm,
      field_definition_uuid: selectedFieldDefinitionUuid || fieldOptionForm.field_definition_uuid,
    });
    goToStep('field');
  };

  const startEditFieldOption = (option: any) => {
    setSelectedFieldDefinitionUuid(option.fieldDefinitionUuid || '');
    setFieldOptionForm({
      uuid: option.uuid,
      field_definition_uuid: option.fieldDefinitionUuid || '',
      label: option.label || '',
      value: option.value || '',
      color: option.color || '',
      sort_order: Number(option.sortOrder || 0),
      is_active: isActiveItem(option),
    });
    goToStep('field');
  };

  const useSuggestedFieldContext = () => {
    setFieldOwnerType(suggestedFieldContext.type);
    setFieldOwnerUuid(suggestedFieldContext.uuid);
    setFieldDefinitionForm((current) => ({
      ...current,
      owner_entity_type: suggestedFieldContext.type,
      owner_entity_uuid: suggestedFieldContext.uuid,
    }));
  };

  const currentStepIndex = STEP_ITEMS.findIndex((item) => item.id === activeStep);

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setActiveStep(STEP_ITEMS[currentStepIndex - 1].id);
    }
  };

  const goToNextStep = () => {
    if (currentStepIndex < STEP_ITEMS.length - 1) {
      setActiveStep(STEP_ITEMS[currentStepIndex + 1].id);
    }
  };

  const stepCompletion = {
    organizer: organizers.length > 0,
    program: programs.length > 0,
    level: levels.length > 0,
    field: fieldDefinitions.length > 0,
  };

  if (loading) {
    return (
      <div className="p-6">
        <AdminLoadingState
          title="Đang tải nền tảng chương trình"
          hint="Đơn vị, chương trình, trình độ và field đang được đồng bộ."
          variant="dashboard"
          accent="blue"
        />
      </div>
    );
  }

  const renderOrganizerStep = () => (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Panel
        title="Danh sách đơn vị"
        hint="Bên trái là danh sách để chọn nhanh. Nhấn vào một dòng để nạp lại form và chỉnh sửa."
        actions={
          <>
            <Badge className="border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
              {formatCountLabel(visibleOrganizers.length, 'đơn vị')}
            </Badge>
            <Badge className="border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
              {formatCountLabel(organizers.filter((item) => isActiveItem(item)).length, 'active')}
            </Badge>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            value={organizerSearch}
            onChange={(event) => setOrganizerSearch(event.target.value)}
            placeholder="Tìm theo tên đơn vị hoặc mã"
          />
          <div className="space-y-3">
            {visibleOrganizers.length ? (
              visibleOrganizers.map((item) => (
                <RowButton
                  key={item.uuid}
                  active={selectedOrganizerUuid === item.uuid}
                  onClick={() => startEditOrganizer(item)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{item.name}</span>
                        <Badge className="border border-slate-200 bg-slate-100 text-slate-700">{item.code}</Badge>
                      </div>
                      <div className="mt-2 text-sm text-slate-500">
                        {item.description || 'Chưa có mô tả cho đơn vị này.'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={isActiveItem(item) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}>
                        {isActiveItem(item) ? 'Đang hoạt động' : 'Đã ẩn'}
                      </Badge>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Sửa</span>
                    </div>
                  </div>
                </RowButton>
              ))
            ) : (
              <EmptyState
                title="Chưa có đơn vị phù hợp"
                hint="Thử đổi từ khóa tìm kiếm hoặc tạo đơn vị mới ở khung bên phải."
              />
            )}
          </div>
        </div>
      </Panel>

      <Panel
        title={getModeLabel(Boolean(organizerForm.uuid), 'đơn vị')}
        hint="Sau khi tạo xong bạn vẫn có thể quay lại chọn dòng ở bên trái để chỉnh tiếp."
        actions={
          <Button variant="outline" onClick={startNewOrganizer}>
            Tạo form trống
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="organizer-name">Tên đơn vị</Label>
            <Input
              id="organizer-name"
              value={organizerForm.name}
              onChange={(event) => setOrganizerForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ví dụ: EDUGLOBAL"
            />
          </div>
          <div>
            <Label htmlFor="organizer-code">Mã ngắn</Label>
            <Input
              id="organizer-code"
              value={organizerForm.code}
              onChange={(event) => setOrganizerForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="EDUGLOBAL"
            />
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="organizer-description">Mô tả</Label>
          <Textarea
            id="organizer-description"
            value={organizerForm.description}
            onChange={(event) => setOrganizerForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Ghi chú nội bộ để admin khác biết đơn vị này dùng làm gì."
          />
        </div>
        <div className="mt-4">
          <Toggle
            label="Đơn vị này đang hoạt động"
            checked={organizerForm.is_active}
            onChange={(checked) => setOrganizerForm((current) => ({ ...current, is_active: checked }))}
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            onClick={() =>
              handleSubmit(
                'organizer',
                () =>
                  organizerForm.uuid
                    ? api.updateProgramOrganizer(organizerForm.uuid, organizerForm)
                    : api.createProgramOrganizer(organizerForm),
                () => setOrganizerForm(emptyOrganizerForm),
                organizerForm.uuid ? 'Đã cập nhật đơn vị' : 'Đã tạo đơn vị'
              )
            }
            disabled={!organizerForm.name.trim() || !organizerForm.code.trim() || savingKey === 'organizer'}
          >
            {organizerForm.uuid ? 'Lưu chỉnh sửa' : 'Tạo đơn vị'}
          </Button>
          <Button variant="outline" onClick={goToNextStep}>
            Sang bước chương trình
          </Button>
        </div>
      </Panel>
    </div>
  );

  const renderProgramStep = () => (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Panel
        title="Danh sách chương trình"
        hint="Nếu đã chọn đơn vị ở bước 1 thì danh sách này sẽ tự lọc theo đơn vị đó để dễ kiểm soát."
        actions={
          <>
            {selectedOrganizer ? (
              <Badge className="border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700">
                Đang lọc: {selectedOrganizer.name}
              </Badge>
            ) : null}
            <Button variant="outline" onClick={clearSelectedOrganizer}>
              Bỏ lọc đơn vị
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            value={programSearch}
            onChange={(event) => setProgramSearch(event.target.value)}
            placeholder="Tìm theo tên chương trình, mã hoặc đơn vị"
          />
          <div className="space-y-3">
            {visiblePrograms.length ? (
              visiblePrograms.map((item) => (
                <RowButton
                  key={item.uuid}
                  active={selectedProgramUuid === item.uuid}
                  onClick={() => startEditProgram(item)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{item.name}</span>
                        <Badge className="border border-slate-200 bg-slate-100 text-slate-700">{item.code}</Badge>
                        <Badge className={item.deliveryMode === 'external_redirect' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}>
                          {item.deliveryMode === 'external_redirect' ? 'Link ngoài' : 'Nội bộ'}
                        </Badge>
                        <Badge className="border border-blue-200 bg-blue-50 text-blue-700">
                          {ASSESSMENT_MODE_OPTIONS.find((option) => option.value === item.assessmentMode)?.label || 'Chưa rõ đánh giá'}
                        </Badge>
                        <Badge className={item.hasLevels ? 'border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700' : 'border border-slate-200 bg-slate-50 text-slate-600'}>
                          {item.hasLevels ? 'Có trình độ' : 'Không dùng trình độ'}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-slate-500">
                        {getProgramHierarchyLabel(item) || 'Không rõ đơn vị / chương trình'} • {item.description || 'Chưa có mô tả'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={isActiveItem(item) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}>
                        {isActiveItem(item) ? 'Đang hoạt động' : 'Đã ẩn'}
                      </Badge>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Sửa</span>
                    </div>
                  </div>
                </RowButton>
              ))
            ) : (
              <EmptyState
                title="Chưa có chương trình phù hợp"
                hint="Chọn một đơn vị khác hoặc tạo chương trình mới ở khung bên phải."
                action={<Button onClick={startNewProgram}>Tạo chương trình mới</Button>}
              />
            )}
          </div>
        </div>
      </Panel>

      <Panel
        title={getModeLabel(Boolean(programForm.uuid), 'chương trình')}
        hint="Chương trình ở đây là tên khóa/bồi dưỡng thực tế. Không dùng lại tên đơn vị nếu đó không phải tên chương trình thật."
        actions={
          <Button variant="outline" onClick={startNewProgram}>
            Tạo form trống
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="program-organizer">Đơn vị</Label>
            <select
              id="program-organizer"
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"
              value={programForm.organizer_uuid}
              onChange={(event) => setProgramForm((current) => ({ ...current, organizer_uuid: event.target.value }))}
            >
              <option value="">Chọn đơn vị</option>
              {organizers.map((item) => (
                <option key={item.uuid} value={item.uuid}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="program-name">Tên chương trình</Label>
            <Input
              id="program-name"
              value={programForm.name}
              onChange={(event) => setProgramForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ví dụ: Tiếng Anh, Tin học, Chức danh nghề nghiệp"
            />
          </div>
          <div>
            <Label htmlFor="program-code">Mã chương trình</Label>
            <Input
              id="program-code"
              value={programForm.code}
              onChange={(event) => setProgramForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="Ví dụ: TA, TH, CDNN"
            />
          </div>
          <div>
            <Label htmlFor="program-assessment-mode">Kiểu đánh giá</Label>
            <select
              id="program-assessment-mode"
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"
              value={programForm.assessment_mode}
              onChange={(event) => setProgramForm((current) => ({ ...current, assessment_mode: event.target.value }))}
            >
              {ASSESSMENT_MODE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="program-mode">Hình thức học</Label>
            <select
              id="program-mode"
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"
              value={programForm.delivery_mode}
              onChange={(event) => setProgramForm((current) => ({ ...current, delivery_mode: event.target.value }))}
            >
              {DELIVERY_MODE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Preset nhanh</div>
          <div className="mt-2 text-sm text-slate-500">
            Dùng preset để áp cấu hình mẫu, sau đó bạn vẫn có thể chỉnh tay từng cờ bên dưới.
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setProgramForm((current) => buildProgramInternalPreset(current))}>
              Áp preset nội bộ
            </Button>
            <Button variant="outline" onClick={() => setProgramForm((current) => buildProgramExternalPreset(current))}>
              Áp preset link ngoài
            </Button>
          </div>
        </div>

        {programForm.delivery_mode === 'external_redirect' ? (
          <div className="mt-4">
            <Label htmlFor="program-redirect">Link chuyển hướng</Label>
            <Input
              id="program-redirect"
              value={programForm.redirect_url}
              onChange={(event) => setProgramForm((current) => ({ ...current, redirect_url: event.target.value }))}
              placeholder="Ví dụ: /vept hoặc https://..."
            />
          </div>
        ) : null}

        <div className="mt-4">
          <Label htmlFor="program-description">Mô tả ngắn</Label>
          <Textarea
            id="program-description"
            value={programForm.description}
            onChange={(event) => setProgramForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Mô tả ngắn để admin khác hiểu chương trình này phục vụ mục đích gì."
          />
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="font-semibold text-slate-900">Ghi nhớ nhanh</div>
          <div className="mt-2">
            Bạn có thể bỏ qua bước trình độ nếu chương trình này không chia cấp độ. Kiểu đánh giá hiện tại:
            <span className="ml-1 font-semibold text-slate-900">
              {ASSESSMENT_MODE_OPTIONS.find((item) => item.value === programForm.assessment_mode)?.label || programForm.assessment_mode}
            </span>
          </div>
        </div>

        <details className="mt-4 rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900">
            Chi tiết nâng cao
          </summary>
          <div className="border-t border-slate-100 px-4 py-4">
            <div>
              <Label htmlFor="program-schedule-model">Mô hình lịch</Label>
              <select
                id="program-schedule-model"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"
                value={programForm.schedule_model}
                onChange={(event) => setProgramForm((current) => ({ ...current, schedule_model: event.target.value }))}
              >
                {SCHEDULE_MODEL_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <Toggle label="Có chứng chỉ đầu ra" checked={programForm.certificate_enabled} onChange={(checked) => setProgramForm((current) => ({ ...current, certificate_enabled: checked }))} />
              <Toggle label="Cho phép đào tạo" checked={programForm.training_enabled} onChange={(checked) => setProgramForm((current) => ({ ...current, training_enabled: checked }))} />
              <Toggle label="Cho phép tạo lớp liên kết" checked={programForm.linked_class_enabled} onChange={(checked) => setProgramForm((current) => ({ ...current, linked_class_enabled: checked }))} />
              <Toggle label="Hiện ở trang công khai Edu" checked={programForm.visible_on_edu_public} onChange={(checked) => setProgramForm((current) => ({ ...current, visible_on_edu_public: checked }))} />
              <Toggle label="Hiện trong quản trị Edu" checked={programForm.visible_on_edu_admin} onChange={(checked) => setProgramForm((current) => ({ ...current, visible_on_edu_admin: checked }))} />
              <Toggle label="Hiện cho giáo viên bên Exam" checked={programForm.visible_on_exam_teacher} onChange={(checked) => setProgramForm((current) => ({ ...current, visible_on_exam_teacher: checked }))} />
              <Toggle label="Hiện cho học viên bên Exam" checked={programForm.visible_on_exam_student} onChange={(checked) => setProgramForm((current) => ({ ...current, visible_on_exam_student: checked }))} />
              <Toggle label="Chương trình đang hoạt động" checked={programForm.is_active} onChange={(checked) => setProgramForm((current) => ({ ...current, is_active: checked }))} />
            </div>
          </div>
        </details>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            onClick={() =>
              handleSubmit(
                'program',
                () => (programForm.uuid ? api.updateProgram(programForm.uuid, programForm) : api.createProgram(programForm)),
                () => setProgramForm({ ...emptyProgramForm, organizer_uuid: selectedOrganizerUuid || '' }),
                programForm.uuid ? 'Đã cập nhật chương trình' : 'Đã tạo chương trình'
              )
            }
            disabled={!programForm.organizer_uuid || !programForm.name.trim() || !programForm.code.trim() || savingKey === 'program'}
          >
            {programForm.uuid ? 'Lưu chỉnh sửa' : 'Tạo chương trình'}
          </Button>
          <Button variant="outline" onClick={goToPreviousStep}>
            Quay lại bước đơn vị
          </Button>
          <Button variant="outline" onClick={goToNextStep}>
            Sang bước trình độ
          </Button>
        </div>
      </Panel>
    </div>
  );

  const renderLevelStep = () => (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Panel
        title="Danh sách trình độ"
        hint="Chỉ tạo trình độ cho những chương trình thực sự chia cấp độ. Chương trình không có trình độ vẫn là trạng thái hợp lệ."
        actions={
          <>
            {selectedProgram ? (
              <Badge className="border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700">
                Đang lọc: {selectedProgram.name}
              </Badge>
            ) : null}
            <Button variant="outline" onClick={clearSelectedProgram}>
              Bỏ lọc chương trình
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            value={levelSearch}
            onChange={(event) => setLevelSearch(event.target.value)}
            placeholder="Tìm theo tên trình độ, mã hoặc chương trình"
          />
          <div className="space-y-3">
            {visibleLevels.length ? (
              visibleLevels.map((item) => (
                <RowButton
                  key={item.uuid}
                  active={selectedLevelUuid === item.uuid}
                  onClick={() => startEditLevel(item)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{item.name}</span>
                        <Badge className="border border-slate-200 bg-slate-100 text-slate-700">{item.code}</Badge>
                        <Badge className="border border-slate-200 bg-slate-50 text-slate-600">Thứ tự {item.sortOrder ?? 0}</Badge>
                      </div>
                      <div className="mt-2 text-sm text-slate-500">
                        {getLevelHierarchyLabel(item, programByUuid) || 'Không rõ đơn vị / chương trình / trình độ'} • {item.description || 'Chưa có mô tả'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={isActiveItem(item) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}>
                        {isActiveItem(item) ? 'Đang hoạt động' : 'Đã ẩn'}
                      </Badge>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Sửa</span>
                    </div>
                  </div>
                </RowButton>
              ))
            ) : (
              <EmptyState
                title="Chưa có trình độ phù hợp"
                hint="Chọn chương trình khác hoặc tạo level mới ở khung bên phải."
                action={<Button onClick={startNewLevel}>Tạo trình độ mới</Button>}
              />
            )}
          </div>
        </div>
      </Panel>

      <Panel
        title={getModeLabel(Boolean(levelForm.uuid), 'trình độ')}
        hint="Nếu chương trình đang chọn không chia trình độ theo nghiệp vụ, bạn có thể bỏ qua bước này và chuyển sang Field mở rộng."
        actions={
          <Button variant="outline" onClick={startNewLevel}>
            Tạo form trống
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="level-program">Chương trình</Label>
            <select
              id="level-program"
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"
              value={levelForm.program_uuid}
              onChange={(event) => setLevelForm((current) => ({ ...current, program_uuid: event.target.value }))}
            >
              <option value="">Chọn chương trình</option>
              {programs.map((item) => (
                <option key={item.uuid} value={item.uuid}>
                  {getProgramHierarchyLabel(item)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="level-order">Thứ tự sắp xếp</Label>
            <Input
              id="level-order"
              type="number"
              value={levelForm.sort_order}
              onChange={(event) => setLevelForm((current) => ({ ...current, sort_order: Number(event.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label htmlFor="level-name">Tên trình độ</Label>
            <Input
              id="level-name"
              value={levelForm.name}
              onChange={(event) => setLevelForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ví dụ: B1"
            />
          </div>
          <div>
            <Label htmlFor="level-code">Mã trình độ</Label>
            <Input
              id="level-code"
              value={levelForm.code}
              onChange={(event) => setLevelForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="B1"
            />
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="level-description">Mô tả</Label>
          <Textarea
            id="level-description"
            value={levelForm.description}
            onChange={(event) => setLevelForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Ví dụ: Dùng cho kỳ thi chuẩn hóa đầu ra."
          />
        </div>
        <div className="mt-4">
          <Toggle label="Trình độ đang hoạt động" checked={levelForm.is_active} onChange={(checked) => setLevelForm((current) => ({ ...current, is_active: checked }))} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            onClick={() =>
              handleSubmit(
                'level',
                () => (levelForm.uuid ? api.updateProgramLevel(levelForm.uuid, levelForm) : api.createProgramLevel(levelForm)),
                () => setLevelForm({ ...emptyLevelForm, program_uuid: selectedProgramUuid || '' }),
                levelForm.uuid ? 'Đã cập nhật trình độ' : 'Đã tạo trình độ'
              )
            }
            disabled={!levelForm.program_uuid || !levelForm.name.trim() || !levelForm.code.trim() || savingKey === 'level'}
          >
            {levelForm.uuid ? 'Lưu chỉnh sửa' : 'Tạo trình độ'}
          </Button>
          <Button variant="outline" onClick={goToPreviousStep}>
            Quay lại bước chương trình
          </Button>
          <Button variant="outline" onClick={goToNextStep}>
            Sang bước field mở
          </Button>
        </div>
      </Panel>
    </div>
  );

  const renderFieldStep = () => (
    <div className="space-y-6">
      <Panel
        title="Phạm vi áp dụng field mở rộng"
        hint="Field dùng để bổ sung dữ liệu linh hoạt cho biểu mẫu, bộ lọc, báo cáo và file xuất. Chọn phạm vi trước để tránh gắn nhầm đơn vị/chương trình/trình độ."
        actions={
          <Button variant="outline" onClick={useSuggestedFieldContext}>
            Dùng ngữ cảnh hiện tại
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label htmlFor="field-browser-owner-type">Loại phạm vi</Label>
            <select
              id="field-browser-owner-type"
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"
              value={fieldOwnerType}
              onChange={(event) => {
                setFieldOwnerType(event.target.value as OwnerEntityType);
                setFieldOwnerUuid('');
              }}
            >
              {OWNER_ENTITY_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="field-browser-owner-uuid">Phạm vi cụ thể</Label>
            <select
              id="field-browser-owner-uuid"
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"
              value={fieldOwnerUuid}
              onChange={(event) => setFieldOwnerUuid(event.target.value)}
            >
              <option value="">Xem tất cả trong loại phạm vi này</option>
              {visibleOwnerOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="field-search">Tìm field</Label>
            <Input
              id="field-search"
              value={fieldSearch}
              onChange={(event) => setFieldSearch(event.target.value)}
              placeholder="Tên hiển thị, key hoặc loại field"
            />
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Panel
          title="Danh sách field mở rộng"
          hint="Nhấn vào một field để sửa hoặc quản lý các lựa chọn của field đó."
          actions={
            <>
              <Badge className="border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
                {formatCountLabel(visibleFieldDefinitions.length, 'field mở rộng')}
              </Badge>
              <Button variant="outline" onClick={startNewFieldDefinition}>
                Tạo field mở rộng
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            {visibleFieldDefinitions.length ? (
              visibleFieldDefinitions.map((field) => {
                const ownerLabel = ownerOptions.find(
                  (owner) =>
                    owner.scopeType === field.ownerEntityType &&
                    owner.value === field.ownerEntityUuid
                )?.label;
                const optionsCount = fieldOptions.filter((item) => item.fieldDefinitionUuid === field.uuid).length;

                return (
                  <RowButton
                    key={field.uuid}
                    active={selectedFieldDefinitionUuid === field.uuid}
                    onClick={() => startEditFieldDefinition(field)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">{field.label}</span>
                          <Badge className="border border-slate-200 bg-slate-100 text-slate-700">{field.fieldKey}</Badge>
                          <Badge className="border border-blue-200 bg-blue-50 text-blue-700">
                            {getFieldTypeLabel(field.fieldType)}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-slate-500">
                          {ownerLabel || field.ownerEntityUuid || 'Chưa gắn phạm vi'} • {getTargetEntityLabel(field.targetEntityType)} • {optionsCount} lựa chọn
                        </div>
                        {field.description ? <div className="mt-2 text-sm text-slate-500">{field.description}</div> : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={isActiveItem(field) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}>
                          {isActiveItem(field) ? 'Đang hoạt động' : 'Đã ẩn'}
                        </Badge>
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Sửa</span>
                      </div>
                    </div>
                  </RowButton>
                );
              })
            ) : (
              <EmptyState
                title="Chưa có field phù hợp"
                hint="Chọn owner khác hoặc tạo field mới để bắt đầu."
              />
            )}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel
            title={getModeLabel(Boolean(fieldDefinitionForm.uuid), 'field mở rộng')}
            hint="Field mới tự bám phạm vi đang chọn. Bạn vẫn có thể đổi lại trước khi lưu."
            actions={
              <Button variant="outline" onClick={startNewFieldDefinition}>
                Tạo form trống
              </Button>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="field-owner-type">Loại phạm vi</Label>
                <select
                  id="field-owner-type"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"
                  value={fieldDefinitionForm.owner_entity_type}
                  onChange={(event) =>
                    setFieldDefinitionForm((current) => ({
                      ...current,
                      owner_entity_type: event.target.value,
                      owner_entity_uuid: '',
                    }))
                  }
                >
                  {OWNER_ENTITY_TYPE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="field-owner-uuid">Phạm vi cụ thể</Label>
                <select
                  id="field-owner-uuid"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"
                  value={fieldDefinitionForm.owner_entity_uuid}
                  onChange={(event) =>
                    setFieldDefinitionForm((current) => ({
                      ...current,
                      owner_entity_uuid: event.target.value,
                    }))
                  }
                >
                  <option value="">Chọn đơn vị, chương trình hoặc trình độ</option>
                  {ownerOptions
                    .filter((item) => item.scopeType === fieldDefinitionForm.owner_entity_type)
                    .map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label htmlFor="field-target-type">Dữ liệu áp dụng cho</Label>
                <select
                  id="field-target-type"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"
                  value={fieldDefinitionForm.target_entity_type}
                  onChange={(event) => setFieldDefinitionForm((current) => ({ ...current, target_entity_type: event.target.value }))}
                >
                  {TARGET_ENTITY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="field-type">Loại field</Label>
                <select
                  id="field-type"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"
                  value={fieldDefinitionForm.field_type}
                  onChange={(event) => setFieldDefinitionForm((current) => ({ ...current, field_type: event.target.value }))}
                >
                  {FIELD_TYPE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="field-label">Tên hiển thị</Label>
                <Input
                  id="field-label"
                  value={fieldDefinitionForm.label}
                  onChange={(event) => setFieldDefinitionForm((current) => ({ ...current, label: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="field-key">Mã kỹ thuật</Label>
                <Input
                  id="field-key"
                  value={fieldDefinitionForm.field_key}
                  onChange={(event) => setFieldDefinitionForm((current) => ({ ...current, field_key: event.target.value }))}
                  placeholder="Ví dụ: thoi_luong_thi_phut"
                />
              </div>
              <div>
                <Label htmlFor="field-placeholder">Placeholder</Label>
                <Input
                  id="field-placeholder"
                  value={fieldDefinitionForm.placeholder}
                  onChange={(event) => setFieldDefinitionForm((current) => ({ ...current, placeholder: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="field-sort-order">Thứ tự</Label>
                <Input
                  id="field-sort-order"
                  type="number"
                  value={fieldDefinitionForm.sort_order}
                  onChange={(event) => setFieldDefinitionForm((current) => ({ ...current, sort_order: Number(event.target.value) || 0 }))}
                />
              </div>
            </div>
            <details className="mt-4 rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900">
                Chi tiết nâng cao
              </summary>
              <div className="border-t border-slate-100 px-4 py-4">
                <div>
                  <Label htmlFor="field-description">Mô tả</Label>
                  <Textarea
                    id="field-description"
                    value={fieldDefinitionForm.description}
                    onChange={(event) => setFieldDefinitionForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </div>
                <div className="mt-4">
                  <Label htmlFor="field-help">Gợi ý nhập liệu</Label>
                  <Textarea
                    id="field-help"
                    value={fieldDefinitionForm.help_text}
                    onChange={(event) => setFieldDefinitionForm((current) => ({ ...current, help_text: event.target.value }))}
                  />
                </div>
                <div className="mt-4">
                  <Label htmlFor="field-config">Cấu hình JSON</Label>
                  <Textarea
                    id="field-config"
                    value={fieldDefinitionForm.config_json}
                    onChange={(event) => setFieldDefinitionForm((current) => ({ ...current, config_json: event.target.value }))}
                    placeholder='{"optionsSource":"manual"}'
                  />
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  <Toggle label="Cho phép tìm kiếm" checked={fieldDefinitionForm.searchable} onChange={(checked) => setFieldDefinitionForm((current) => ({ ...current, searchable: checked }))} />
                  <Toggle label="Cho phép lọc" checked={fieldDefinitionForm.filterable} onChange={(checked) => setFieldDefinitionForm((current) => ({ ...current, filterable: checked }))} />
                  <Toggle label="Cho phép xuất file" checked={fieldDefinitionForm.exportable} onChange={(checked) => setFieldDefinitionForm((current) => ({ ...current, exportable: checked }))} />
                  <Toggle label="Cho phép báo cáo" checked={fieldDefinitionForm.reportable} onChange={(checked) => setFieldDefinitionForm((current) => ({ ...current, reportable: checked }))} />
                  <Toggle label="Hiện trên edu public" checked={fieldDefinitionForm.visible_on_edu_public} onChange={(checked) => setFieldDefinitionForm((current) => ({ ...current, visible_on_edu_public: checked }))} />
                  <Toggle label="Hiện trên edu admin" checked={fieldDefinitionForm.visible_on_edu_admin} onChange={(checked) => setFieldDefinitionForm((current) => ({ ...current, visible_on_edu_admin: checked }))} />
                  <Toggle label="Hiện trên exam teacher" checked={fieldDefinitionForm.visible_on_exam_teacher} onChange={(checked) => setFieldDefinitionForm((current) => ({ ...current, visible_on_exam_teacher: checked }))} />
                  <Toggle label="Hiện trên exam student" checked={fieldDefinitionForm.visible_on_exam_student} onChange={(checked) => setFieldDefinitionForm((current) => ({ ...current, visible_on_exam_student: checked }))} />
                  <Toggle label="Field đang hoạt động" checked={fieldDefinitionForm.is_active} onChange={(checked) => setFieldDefinitionForm((current) => ({ ...current, is_active: checked }))} />
                </div>
              </div>
            </details>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                onClick={() =>
                  handleSubmit(
                    'field-definition',
                    () => {
                      if (fieldDefinitionForm.config_json.trim()) {
                        JSON.parse(fieldDefinitionForm.config_json);
                      }

                      const payload = {
                        ...fieldDefinitionForm,
                        sort_order: Number(fieldDefinitionForm.sort_order || 0),
                      };

                      return fieldDefinitionForm.uuid
                        ? api.updateFieldDefinition(fieldDefinitionForm.uuid, payload)
                        : api.createFieldDefinition(payload);
                    },
                    () => {
                      setFieldDefinitionForm({
                        ...emptyFieldDefinitionForm,
                        owner_entity_type: fieldOwnerType,
                        owner_entity_uuid: fieldOwnerUuid,
                      });
                      setSelectedFieldDefinitionUuid('');
                    },
                    fieldDefinitionForm.uuid ? 'Đã cập nhật field mở rộng' : 'Đã tạo field mở rộng'
                  )
                }
                disabled={!fieldDefinitionForm.owner_entity_uuid || !fieldDefinitionForm.label.trim() || !fieldDefinitionForm.field_key.trim() || !fieldDefinitionForm.target_entity_type.trim() || savingKey === 'field-definition'}
              >
                {fieldDefinitionForm.uuid ? 'Lưu chỉnh sửa' : 'Tạo field mở rộng'}
              </Button>
              <Button variant="outline" onClick={goToPreviousStep}>
                Quay lại bước trình độ
              </Button>
            </div>
          </Panel>

          <Panel
            title="Lựa chọn của field"
            hint={
              selectedFieldDefinition
                ? `Bạn đang quản lý lựa chọn cho field "${selectedFieldDefinition.label}".`
                : 'Chọn một field ở cột bên trái trước, rồi tạo hoặc sửa lựa chọn tại đây.'
            }
            actions={
              <Button variant="outline" onClick={startNewFieldOption} disabled={!selectedFieldDefinitionUuid}>
                Tạo lựa chọn mới
              </Button>
            }
          >
            {selectedFieldDefinition ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="field-option-label">Nhãn hiển thị</Label>
                    <Input
                      id="field-option-label"
                      value={fieldOptionForm.label}
                      onChange={(event) => setFieldOptionForm((current) => ({ ...current, label: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="field-option-value">Giá trị lưu</Label>
                    <Input
                      id="field-option-value"
                      value={fieldOptionForm.value}
                      onChange={(event) => setFieldOptionForm((current) => ({ ...current, value: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="field-option-color">Màu (tùy chọn)</Label>
                    <Input
                      id="field-option-color"
                      value={fieldOptionForm.color}
                      onChange={(event) => setFieldOptionForm((current) => ({ ...current, color: event.target.value }))}
                      placeholder="#2563eb"
                    />
                  </div>
                  <div>
                    <Label htmlFor="field-option-order">Thứ tự</Label>
                    <Input
                      id="field-option-order"
                      type="number"
                      value={fieldOptionForm.sort_order}
                      onChange={(event) => setFieldOptionForm((current) => ({ ...current, sort_order: Number(event.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div>
                  <Toggle label="Option đang hoạt động" checked={fieldOptionForm.is_active} onChange={(checked) => setFieldOptionForm((current) => ({ ...current, is_active: checked }))} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() =>
                      handleSubmit(
                        'field-option',
                        () => {
                          const payload = {
                            ...fieldOptionForm,
                            field_definition_uuid: selectedFieldDefinitionUuid,
                            sort_order: Number(fieldOptionForm.sort_order || 0),
                          };

                          return fieldOptionForm.uuid
                            ? api.updateFieldOption(fieldOptionForm.uuid, payload)
                            : api.createFieldOption(payload);
                        },
                        () => {
                          setFieldOptionForm({
                            ...emptyFieldOptionForm,
                            field_definition_uuid: selectedFieldDefinitionUuid,
                          });
                        },
                        fieldOptionForm.uuid ? 'Đã cập nhật lựa chọn' : 'Đã tạo lựa chọn'
                      )
                    }
                    disabled={!selectedFieldDefinitionUuid || !fieldOptionForm.label.trim() || !fieldOptionForm.value.trim() || savingKey === 'field-option'}
                  >
                    {fieldOptionForm.uuid ? 'Lưu lựa chọn' : 'Tạo lựa chọn'}
                  </Button>
                  <Button variant="outline" onClick={startNewFieldOption}>
                    Làm mới form lựa chọn
                  </Button>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-5">
                  {visibleFieldOptions.length ? (
                    visibleFieldOptions.map((option) => (
                      <RowButton key={option.uuid} onClick={() => startEditFieldOption(option)}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-900">{option.label}</span>
                              <Badge className="border border-slate-200 bg-slate-100 text-slate-700">{option.value}</Badge>
                              {option.color ? <Badge className="border border-slate-200 bg-slate-50 text-slate-600">{option.color}</Badge> : null}
                            </div>
                            <div className="mt-2 text-sm text-slate-500">Thứ tự {option.sortOrder ?? 0}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={isActiveItem(option) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}>
                              {isActiveItem(option) ? 'Đang hoạt động' : 'Đã ẩn'}
                            </Badge>
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Sửa</span>
                          </div>
                        </div>
                      </RowButton>
                    ))
                  ) : (
                    <EmptyState
                      title="Field này chưa có lựa chọn"
                      hint="Nếu đây là field dạng chọn một hoặc chọn nhiều, hãy tạo lựa chọn đầu tiên ngay bây giờ."
                    />
                  )}
                </div>
              </div>
            ) : (
              <EmptyState
                title="Chưa chọn field"
                hint="Hãy chọn một field bên trái để quản lý option."
              />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-page">
      <LearningWorkspaceHeader
        icon={Database}
        tone="violet"
        title="Chương trình tổng"
        description=""
        pills={<LearningInfoPill>Bước: {STEP_ITEMS.find((step) => step.id === activeStep)?.title || ''}</LearningInfoPill>}
        stats={[
          { label: 'Đơn vị', value: organizers.length, hint: '' },
          { label: 'Chương trình', value: programs.length, hint: '' },
          { label: 'Trình độ', value: levels.length, hint: '' },
          { label: 'Field', value: fieldDefinitions.length, hint: '' },
        ]}
      />

      <div className="space-y-4">
        <Panel title="Quản lý chương trình" hint="Đơn vị → Chương trình → Trình độ → Field">
          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge className="border-blue-200 bg-blue-50 text-blue-700 text-[10px]">Đơn vị: {organizers.length}</Badge>
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">Chương trình: {programs.length}</Badge>
            <Badge className="border-amber-200 bg-amber-50 text-amber-700 text-[10px]">Trình độ: {levels.length}</Badge>
            <Badge className="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 text-[10px]">Field: {fieldDefinitions.length}</Badge>
          </div>
          <div className="grid gap-2 md:grid-cols-4 mb-3">
            {STEP_ITEMS.map((step) => (
              <StepCard key={step.id} number={step.number} title={step.title} description={step.description}
                active={activeStep === step.id} completed={stepCompletion[step.id]} onClick={() => goToStep(step.id)} />
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            <ContextCard label="Đơn vị" value={selectedOrganizer?.name || ''} hint="" active={activeStep === 'organizer'} onFocus={() => goToStep('organizer')} onClear={clearSelectedOrganizer} />
            <ContextCard label="Chương trình" value={selectedProgram ? getProgramHierarchyLabel(selectedProgram) : ''} hint="" active={activeStep === 'program'} onFocus={() => goToStep('program')} onClear={clearSelectedProgram} />
            <ContextCard label="Trình độ" value={selectedLevel ? getLevelHierarchyLabel(selectedLevel, programByUuid) : ''} hint="" active={activeStep === 'level'} onFocus={() => goToStep('level')} onClear={clearSelectedLevel} />
            <ContextCard label="Field" value={selectedFieldDefinition?.label || ''} hint="" active={activeStep === 'field'} onFocus={() => goToStep('field')} onClear={clearSelectedFieldDefinition} />
          </div>
        </Panel>

        <div className="space-y-4">
          {activeStep === 'organizer' ? renderOrganizerStep() : null}
          {activeStep === 'program' ? renderProgramStep() : null}
          {activeStep === 'level' ? renderLevelStep() : null}
          {activeStep === 'field' ? renderFieldStep() : null}
        </div>

        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    </div>
  );
}

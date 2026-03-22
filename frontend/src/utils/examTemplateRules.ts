type TemplateOptionLike = {
  id: number | string;
  name?: string | null;
  display_name?: string | null;
};

type OrganizerOptionLike = {
  uuid: number | string;
  code?: string | null;
  name?: string | null;
};

type ProgramOptionLike = {
  uuid: number | string;
  code?: string | null;
  name?: string | null;
  organizerUuid?: number | string | null;
};

function normalizeUpper(value: unknown) {
  return String(value || '').trim().toUpperCase();
}

function matchesPtitOrganizer(organizer?: OrganizerOptionLike | null) {
  return [organizer?.code, organizer?.name].some((value) => normalizeUpper(value).includes('PTIT'));
}

export function findExamTemplateOption(
  templates: TemplateOptionLike[],
  templateId: string | number | null | undefined,
) {
  if (templateId == null || templateId === '') {
    return null;
  }

  return templates.find((item) => String(item.id) === String(templateId)) || null;
}

export function suggestExamTemplateId(input: {
  selectedOrganizerUuid?: string | number | null;
  selectedProgramUuid?: string | number | null;
  organizers: OrganizerOptionLike[];
  programs: ProgramOptionLike[];
  templates: TemplateOptionLike[];
}) {
  const organizer = input.organizers.find(
    (item) => String(item.uuid) === String(input.selectedOrganizerUuid || '')
  );
  const program = input.programs.find(
    (item) => String(item.uuid) === String(input.selectedProgramUuid || '')
  );

  if (matchesPtitOrganizer(organizer)) {
    const ptitTemplate = input.templates.find((item) => normalizeUpper(item.name) === 'PTIT');
    return ptitTemplate ? String(ptitTemplate.id) : '';
  }

  if (normalizeUpper(program?.code) === 'VEPT') {
    const veptTemplate = input.templates.find((item) => normalizeUpper(item.name) === 'VEPT');
    return veptTemplate ? String(veptTemplate.id) : '';
  }

  return '';
}

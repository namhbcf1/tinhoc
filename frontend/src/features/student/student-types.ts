export interface StudentExamCardVM {
  id: number | string;
  title: string;
  subtitle?: string;
  examDate: string;
  location: string;
  googleMapUrl?: string | null;
  durationMinutes: number | null;
  examType?: string;
  mode: 'online' | 'offline';
  status: 'pending' | 'approved' | 'registered' | 'completed' | 'cancelled' | 'available';
  note?: string;
  zoomLink?: string | null;
  zoomLinkBackup?: string | null;
  className?: string;
  hasTimeConflict?: boolean;
  conflictingExamId?: number | string | null;
  conflictingExamName?: string | null;
  conflictingExamDate?: string | null;
  conflictMessage?: string | null;
  raw: any;
}

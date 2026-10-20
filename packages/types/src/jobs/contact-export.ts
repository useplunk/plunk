export interface ContactExportJobData {
  projectId: string;
  cancelled?: boolean;
}

export interface ContactExportResult {
  key: string;
  filename: string;
  rows: number;
}

export interface ContactExportStatus {
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'cancelled';
  rows: number;
  filename?: string;
  error?: string;
}

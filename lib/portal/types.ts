export type ProfileRole = 'admin' | 'user';

export interface Profile {
  id: string;
  email: string;
  role: ProfileRole;
  disabled_at: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  storage_path: string;
  file_size: number;
  content_type: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface Video {
  id: string;
  title: string;
  storage_path: string;
  thumbnail_path: string | null;
  uploaded_by: string | null;
  created_at: string;
}

// Database types
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Profile {
  id: string;
  email: string;
  created_at: string;
}

export interface VideoBatch {
  id: string;
  user_id: string;
  created_at: string;
}

export interface VideoItem {
  id: string;
  batch_id: string;
  user_id: string;
  source_image_url: string;
  generated_video_url: string | null;
  runway_task_id: string | null;
  status: ProcessingStatus;
  is_email_sent: boolean;
  created_at: string;
  updated_at: string;
}

// API Request/Response types
export interface RunwayGenerateRequest {
  image_url: string;
  duration: number;
}

export interface RunwayTaskResponse {
  id: string;
  status: string;
  output?: {
    video_url: string;
  }[];
}

export interface WebhookPayload {
  task_id: string;
  status: string;
  output_url?: string;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

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
  veo_operation_id: string | null;
  status: ProcessingStatus;
  is_email_sent: boolean;
  created_at: string;
  updated_at: string;
}

// API Request/Response types
export interface VeoGenerateRequest {
  imageUrl: string;
}

export interface VeoOperation {
  name: string;  // "operations/{operation_id}"
  done: boolean;
  response?: {
    generatedVideos: Array<{
      video: {
        uri: string;  // GCS URI
      };
    }>;
  };
  error?: {
    code: number;
    message: string;
    details?: any[];
  };
}

export interface VeoStatusResponse {
  done: boolean;
  videoUrl: string | null;  // GCS URI
  error: any | null;
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

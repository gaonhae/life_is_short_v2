import { createClient } from '@/lib/supabase/server';
import { ImageUploadForm } from '@/components/upload/ImageUploadForm';

export default async function UploadPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // Middleware should handle this
  }

  return <ImageUploadForm user={user} />;
}

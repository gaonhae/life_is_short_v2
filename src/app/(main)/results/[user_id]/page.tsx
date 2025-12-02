import { createClient } from '@/lib/supabase/server';
import { VideoGallery } from '@/components/results/VideoGallery';

export default async function ResultsPage({ params }: { params: Promise<{ user_id: string }> }) {
  // URL 파라미터는 현재 사용하지 않지만 동적 라우트를 위해 필요
  const { user_id: _user_id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return <VideoGallery user={user} />;
}

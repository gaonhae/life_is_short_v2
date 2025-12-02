import { createClient } from '@/lib/supabase/client';
import { VideoItem } from '@/types';

const supabase = createClient();

export async function getUserVideos(userId: string) {
  const { data, error } = await supabase
    .from('video_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch videos: ${error.message}`);
  }

  return data as VideoItem[];
}

export function subscribeToVideos(userId: string, callback: (videos: VideoItem[]) => void) {
  const channel = supabase.channel(`user_videos:${userId}`).on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'video_items',
      filter: `user_id=eq.${userId}`,
    },
    async () => {
      // Refetch all videos when any change occurs
      try {
        const videos = await getUserVideos(userId);
        callback(videos);
      } catch (err) {
        console.error('Error refetching videos:', err);
      }
    }
  );

  channel.subscribe();

  return channel;
}

'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import Image from 'next/image';
import { getUserVideos, subscribeToVideos } from '@/lib/api/results';
import { VideoItem } from '@/types';
import { Play } from 'lucide-react';

export function VideoGallery({ user }: { user: User }) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let channelSubscription: ReturnType<typeof subscribeToVideos> | null = null;

    const initVideos = async () => {
      try {
        const data = await getUserVideos(user.id);
        if (isMounted) {
          setVideos(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : '비디오를 불러오지 못했습니다');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const setupSubscription = async () => {
      await initVideos();

      // Subscribe to realtime changes
      channelSubscription = subscribeToVideos(user.id, (updatedVideos) => {
        if (isMounted) {
          setVideos(updatedVideos);
        }
      });
    };

    setupSubscription();

    return () => {
      isMounted = false;
      // Unsubscribe from the channel when component unmounts
      if (channelSubscription) {
        channelSubscription.unsubscribe();
      }
    };
  }, [user.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-purple-600"></div>
          <p className="mt-4 text-gray-600">비디오를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-lg text-gray-600">아직 생성된 영상이 없습니다.</p>
          <p className="mt-2 text-sm text-gray-500">
            "업로드" 페이지에서 사진을 선택하여 영상을 만들어보세요!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">생성된 영상</h2>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}

function VideoCard({ video }: { video: VideoItem }) {
  const isCompleted = video.status === 'completed' && video.generated_video_url;
  const isPending = video.status === 'pending' || video.status === 'processing';

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100">
        {video.source_image_url && (
          <Image src={video.source_image_url} alt="Source image" fill className="object-cover" />
        )}

        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors">
            <a
              href={video.generated_video_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-full bg-white/90 p-3 hover:bg-white"
            >
              <Play className="h-6 w-6 text-purple-600" />
            </a>
          </div>
        )}

        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <p className="mt-2 text-sm text-white">생성 중...</p>
            </div>
          </div>
        )}

        {video.status === 'failed' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/40">
            <p className="text-sm font-medium text-white">생성 실패</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-sm text-gray-600">
          {new Date(video.created_at).toLocaleDateString('ko-KR')}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              isCompleted
                ? 'bg-green-100 text-green-800'
                : isPending
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            {isCompleted ? '완료' : isPending ? '생성 중...' : '실패'}
          </span>
          {video.is_email_sent && <span className="text-xs text-gray-500">✓ 이메일 발송됨</span>}
        </div>
      </div>
    </div>
  );
}

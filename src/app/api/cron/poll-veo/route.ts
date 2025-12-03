import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { checkOperationStatus } from '@/lib/api/veo';
import { sendVideoCompletionEmail } from '@/lib/api/email';
import { GoogleGenAI } from '@google/genai';

const CRON_SECRET = process.env.CRON_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TIMEOUT_MINUTES = 10;

if (!CRON_SECRET) {
  throw new Error('CRON_SECRET is not configured in environment variables');
}
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not configured in environment variables');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function GET(request: NextRequest) {
  // 1. 인증 확인
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results = {
    checked: 0,
    completed: 0,
    failed: 0,
    timedOut: 0,
    errors: [] as string[],
  };

  try {
    // 2. pending/processing 상태의 video_items 조회
    const { data: pendingItems, error: selectError } = await supabase
      .from('video_items')
      .select('*, video_batches(user_id), profiles(email)')
      .in('status', ['pending', 'processing'])
      .not('veo_operation_id', 'is', null);

    if (selectError) {
      console.error('[Cron] Failed to fetch pending items:', selectError);
      return NextResponse.json({ error: 'Failed to fetch pending items' }, { status: 500 });
    }

    if (!pendingItems || pendingItems.length === 0) {
      return NextResponse.json({ message: 'No pending items', results });
    }

    // 3. 타임아웃 체크 (10분 경과)
    const now = Date.now();
    const timeoutThreshold = TIMEOUT_MINUTES * 60 * 1000;
    const timedOutItems = pendingItems.filter(
      (item) => now - new Date(item.created_at).getTime() > timeoutThreshold
    );

    for (const item of timedOutItems) {
      console.log('[Cron] Timeout detected:', {
        id: item.id,
        createdAt: item.created_at,
        elapsedMinutes: Math.floor((now - new Date(item.created_at).getTime()) / 60000),
      });
      await supabase
        .from('video_items')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', item.id);
      results.timedOut++;
    }

    // 4. 나머지 항목들의 상태 확인 (병렬 처리)
    const activeItems = pendingItems
      .filter((item) => now - new Date(item.created_at).getTime() <= timeoutThreshold)
      .slice(0, 5); // Vercel 타임아웃 방지: 한 번에 최대 5개만 처리

    const statusChecks = activeItems.map(async (item) => {
      try {
        results.checked++;

        // Veo API status 확인
        const status = await checkOperationStatus(item.veo_operation_id);

        if (status.done) {
          if (status.error) {
            // 이미 failed 상태이면 건너뛰기 (Qstash 재시도 시 중복 방지)
            const { data: currentItem } = await supabase
              .from('video_items')
              .select('status')
              .eq('id', item.id)
              .single();

            if (currentItem?.status === 'failed') {
              console.log('[Cron] Already failed, skipping:', item.id);
              return;
            }

            await supabase
              .from('video_items')
              .update({ status: 'failed', updated_at: new Date().toISOString() })
              .eq('id', item.id);
            results.failed++;
          } else if (status.videoUrl) {
            // 이미 completed 상태이면 건너뛰기
            const { data: currentItem } = await supabase
              .from('video_items')
              .select('status')
              .eq('id', item.id)
              .single();

            if (currentItem?.status === 'completed') {
              console.log('[Cron] Already completed, skipping:', item.id);
              return;
            }
            // 완료 - GCS에서 다운로드 후 Supabase에 업로드
            try {
              console.log('[Cron] Downloading video from GCS:', status.videoUrl);

              // 5. GCS에서 비디오 다운로드
              const videoBuffer = await ai.files.download({
                file: { uri: status.videoUrl },
              });

              console.log('[Cron] Video downloaded, size:', videoBuffer.length, 'bytes');

              // 6. Supabase Storage에 업로드
              const videoBatch = item.video_batches as { user_id: string } | null;
              const userId = videoBatch?.user_id;

              if (!userId) {
                console.error('[Cron] Missing user_id for video item:', item.id);
                results.errors.push(`${item.id}: Missing user_id`);
                return;
              }

              const fileName = `${userId}/${Date.now()}-${item.id.slice(0, 8)}.mp4`;

              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('generated-videos')
                .upload(fileName, videoBuffer, {
                  contentType: 'video/mp4',
                  upsert: false,
                });

              if (uploadError) {
                console.error('[Cron] Failed to upload to Supabase:', uploadError);
                throw new Error(`Upload failed: ${uploadError.message}`);
              }

              console.log('[Cron] Video uploaded to Supabase:', uploadData.path);

              // 7. Public URL 생성
              const { data: publicUrlData } = supabase.storage
                .from('generated-videos')
                .getPublicUrl(uploadData.path);

              console.log('[Cron] Public URL:', publicUrlData.publicUrl);

              // 8. DB 업데이트
              const { error: updateError } = await supabase
                .from('video_items')
                .update({
                  status: 'completed',
                  generated_video_url: publicUrlData.publicUrl,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', item.id);

              if (updateError) {
                console.error('[Cron] Failed to update video item:', updateError);
                results.errors.push(`Update failed for ${item.id}`);
                return;
              }

              results.completed++;

              // 9. 이메일 발송
              try {
                const userEmail = (item.profiles as any)?.email;

                if (userEmail && userId) {
                  await sendVideoCompletionEmail(userEmail, userId);
                  await supabase
                    .from('video_items')
                    .update({ is_email_sent: true })
                    .eq('id', item.id);
                  console.log('[Cron] Email sent to:', userEmail);
                }
              } catch (emailError) {
                console.error('[Cron] Failed to send email:', emailError);
                // 이메일 실패는 치명적 에러가 아니므로 계속 진행
              }
            } catch (downloadUploadError) {
              console.error('[Cron] Failed to download/upload video:', downloadUploadError);
              // 다운로드/업로드 실패 시 failed 처리
              await supabase
                .from('video_items')
                .update({ status: 'failed', updated_at: new Date().toISOString() })
                .eq('id', item.id);
              results.failed++;
            }
          }
        } else {
          // 아직 진행 중 - processing으로 업데이트
          await supabase.from('video_items').update({ status: 'processing' }).eq('id', item.id);
        }
      } catch (error) {
        console.error(`[Cron] Failed to check status for ${item.id}:`, error);
        results.errors.push(
          `${item.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    // 모든 상태 확인 완료 대기 (병렬 처리)
    await Promise.all(statusChecks);

    return NextResponse.json({ message: 'Polling completed', results });
  } catch (error) {
    console.error('[Cron] Polling error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

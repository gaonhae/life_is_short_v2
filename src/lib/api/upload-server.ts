import { createAdminClient } from '@/lib/supabase/server';

/**
 * 서버 인스턴스를 사용하여 operation ID를 업데이트 (RLS 우회)
 * 이 함수는 서버 사이드에서만 호출되어야 함
 */
export async function updateVideoItemOperationIdServer(videoItemId: string, operationId: string) {
  console.log('[updateVideoItemOperationIdServer] Attempting to update:', {
    videoItemId,
    operationId,
  });

  const adminSupabase = await createAdminClient();

  const { error } = await adminSupabase
    .from('video_items')
    .update({ veo_operation_id: operationId })
    .eq('id', videoItemId);

  if (error) {
    console.error('[updateVideoItemOperationIdServer] Error details:', {
      code: error.code,
      message: error.message,
      hint: (error as any).hint,
      details: (error as any).details,
    });
    throw new Error(`Operation ID 업데이트 실패: ${error.message}`);
  }

  console.log('[updateVideoItemOperationIdServer] Successfully updated');
}

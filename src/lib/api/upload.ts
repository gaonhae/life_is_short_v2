import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

const supabase = createClient();
const BUCKET_NAME = 'uploads';

export async function uploadImage(file: File, user: User) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('JPG와 PNG 형식만 지원합니다');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file);

  if (uploadError) {
    throw new Error(`업로드 실패: ${uploadError.message}`);
  }

  // Get public URL
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

  return {
    path: fileName,
    publicUrl: data.publicUrl,
  };
}

export async function createVideoBatch(user: User) {
  const { data, error } = await supabase
    .from('video_batches')
    .insert({
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`배치 생성 실패: ${error.message}`);
  }

  return data;
}

export async function createVideoItem(batchId: string, userId: string, sourceImageUrl: string) {
  const { data, error } = await supabase
    .from('video_items')
    .insert({
      batch_id: batchId,
      user_id: userId,
      source_image_url: sourceImageUrl,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`비디오 아이템 생성 실패: ${error.message}`);
  }

  return data;
}

export async function updateVideoItemOperationId(videoItemId: string, operationId: string) {
  const { error } = await supabase
    .from('video_items')
    .update({ veo_operation_id: operationId })
    .eq('id', videoItemId);

  if (error) {
    throw new Error(`Operation ID 업데이트 실패: ${error.message}`);
  }
}

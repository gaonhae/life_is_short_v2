import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendVideoCompletionEmail } from '@/lib/api/email';
import { WebhookPayload } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json();

    // Parse webhook payload
    const { task_id, status, output_url } = payload;

    if (status !== 'SUCCEEDED') {
      // Handle failed tasks
      const supabase = createAdminClient();
      await supabase.from('video_items').update({ status: 'failed' }).eq('runway_task_id', task_id);

      return NextResponse.json({ success: true });
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    // Find the video item with matching task_id
    const { data: videoItems, error: selectError } = await supabase
      .from('video_items')
      .select('*, video_batches(user_id), profiles(email)')
      .eq('runway_task_id', task_id);

    if (selectError || !videoItems || videoItems.length === 0) {
      console.error('Video item not found:', selectError);
      return NextResponse.json({ error: 'Video item not found' }, { status: 404 });
    }

    const videoItem = videoItems[0];
    const userEmail = (videoItem.profiles as any)?.email;
    const userId = (videoItem.video_batches as any)?.user_id;

    // Update video item with generated URL and status
    const { error: updateError } = await supabase
      .from('video_items')
      .update({
        status: 'completed',
        generated_video_url: output_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', videoItem.id);

    if (updateError) {
      console.error('Failed to update video item:', updateError);
      return NextResponse.json({ error: 'Failed to update video item' }, { status: 500 });
    }

    // Send completion email
    try {
      await sendVideoCompletionEmail(userEmail, userId);

      // Mark email as sent
      await supabase.from('video_items').update({ is_email_sent: true }).eq('id', videoItem.id);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the webhook if email fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requestVideoGeneration } from '@/lib/api/veo';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Request video generation from Veo
    console.log('[Route] Calling requestVideoGeneration with imageUrl:', imageUrl);
    const result = await requestVideoGeneration(imageUrl);

    console.log('[Route] Result received from requestVideoGeneration:', JSON.stringify(result));
    console.log('[Route] About to return NextResponse.json');

    return NextResponse.json(result);
  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json({ error: 'Failed to request video generation' }, { status: 500 });
  }
}

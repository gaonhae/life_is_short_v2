import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not configured in environment variables');
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

/**
 * 비디오 생성 요청 (long-running operation 시작)
 * @param imageUrl - Supabase Storage public URL
 * @returns { id, operationName }
 */
export async function requestVideoGeneration(imageUrl: string) {
  try {
    console.log('[Veo] Fetching image from URL:', imageUrl);

    // 1. 이미지 fetch
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    // 2. ArrayBuffer → Buffer 변환 (이후 Base64 문자열로 변환)
    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBytes = Buffer.from(arrayBuffer);

    // 3. 이미지의 실제 MIME type 추출
    const mimeType = imageResponse.headers.get('content-type') || 'image/png';

    console.log('[Veo] Image fetched, size:', imageBytes.length, 'bytes, mimeType:', mimeType);

    // 4. Veo API 호출 (Google GenAI 라이브러리 사용)
    const operation = await ai.models.generateVideos({
      model: 'veo-3.0-generate-001',
      prompt: '', // 이미지만 사용
      image: {
        imageBytes: imageBytes.toString('base64'), // Base64 문자열로 변환
        mimeType: mimeType,
      },
    });

    console.log('[Veo] Video generation started:', operation.name);

    // 5. operation ID 추출
    if (!operation.name) {
      throw new Error('Operation name is missing from the response');
    }

    console.log(
      '[Veo] Operation object full:',
      JSON.stringify(
        {
          name: operation.name,
          done: operation.done,
          hasResponse: !!operation.response,
          hasError: !!operation.error,
          keys: Object.keys(operation),
        },
        null,
        2
      )
    );

    // 전체 operation name을 ID로 사용 (예: "operations/uuid")
    const operationId = operation.name;

    console.log('[Veo] Using full operation name as ID:', operationId);

    const result = {
      id: operationId,
      operationName: operation.name,
    };

    console.log('[Veo] About to return result:', JSON.stringify(result));

    return result;
  } catch (error) {
    console.error('[Veo] Video generation request failed:', error);
    throw new Error(
      `Failed to request video generation: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Operation 상태 확인 (polling용)
 * @param operationName - "operations/{operation_id}" 형식
 * @returns { done, videoUrl, error }
 */
export async function checkOperationStatus(operationName: string) {
  try {
    // GenerateVideosOperation 인스턴스 생성
    const operationObj = new GenerateVideosOperation();
    operationObj.name = operationName;

    const operation = await ai.operations.getVideosOperation({
      operation: operationObj,
    });

    console.log('[Veo] Operation status:', {
      name: operationName,
      done: operation.done,
      hasResponse: !!operation.response,
      hasError: !!operation.error,
    });

    // 에러 확인
    if (operation.error) {
      return {
        done: true,
        videoUrl: null,
        error: operation.error,
      };
    }

    // 완료 확인
    if (operation.done && operation.response?.generatedVideos?.[0]?.video) {
      const videoUri = operation.response.generatedVideos[0].video.uri;
      // API 키를 URL에 추가하여 올바른 프로젝트로 접근
      const videoUrlWithKey = `${videoUri}&key=${GEMINI_API_KEY}`;
      console.log('[Veo] Video generation completed:', videoUrlWithKey);

      return {
        done: true,
        videoUrl: videoUrlWithKey,
        error: null,
      };
    }

    // 아직 진행 중
    return {
      done: false,
      videoUrl: null,
      error: null,
    };
  } catch (error) {
    console.error('[Veo] Failed to check operation status:', error);
    throw error;
  }
}

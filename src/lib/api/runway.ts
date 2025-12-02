const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1';

const IMAGE_DURATION = 3; // seconds per image

export async function requestVideoGeneration(imageUrl: string) {
  if (!RUNWAY_API_KEY) {
    throw new Error('Runway API key is not configured');
  }

  try {
    const response = await fetch(`${RUNWAY_API_URL}/image_to_video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RUNWAY_API_KEY}`,
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify({
        model: 'gen4_turbo',
        promptImage: imageUrl,
        duration: IMAGE_DURATION,
        ratio: '1280:720',
        seed: Math.floor(Math.random() * 100000),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Status ${response.status}: ${response.statusText}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
      } catch {
        errorMessage += ` - Response: ${errorText}`;
      }

      console.error('Runway API error details:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      throw new Error(`Runway API error: ${errorMessage}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Video generation request failed:', error);
    throw new Error(
      `Failed to request video generation: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function checkTaskStatus(taskId: string) {
  if (!RUNWAY_API_KEY) {
    throw new Error('Runway API key is not configured');
  }

  try {
    const response = await fetch(`${RUNWAY_API_URL}/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${RUNWAY_API_KEY}`,
        'X-Runway-Version': '2024-11-06',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch task status');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(`Failed to check task status: ${error}`);
  }
}

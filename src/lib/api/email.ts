import { Resend } from 'resend';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lifeisshort.com';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}

export async function sendVideoCompletionEmail(userEmail: string, userId: string) {
  const resultsUrl = `${APP_URL}/results/${userId}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>영상 제작 완료</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #9333ea; margin: 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
          .button { display: inline-block; background: #9333ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 영상 제작 완료!</h1>
          </div>
          <div class="content">
            <p>안녕하세요!</p>
            <p>요청하신 영상 제작이 완료되었습니다. 아래 버튼을 클릭하여 생성된 영상을 확인해보세요.</p>
            <center>
              <a href="${resultsUrl}" class="button">영상 확인하기</a>
            </center>
            <p style="color: #666; font-size: 14px;">또는 이 링크를 복사하여 브라우저에서 열어주세요: ${resultsUrl}</p>
          </div>
          <div class="footer">
            <p>Life Is Short - 추억을 영상으로 만드는 서비스</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const resend = getResendClient();
    const result = await resend.emails.send({
      from: 'noreply@lifeisshort.com',
      to: userEmail,
      subject: '🎬 Life Is Short - 영상이 완성되었습니다!',
      html: htmlContent,
    });

    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

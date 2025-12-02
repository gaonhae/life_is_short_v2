Runway API에 대해 작업을 할 때는 아래의 url을 통해 반드시 공식 문서를 확인하고 작업을 합니다.
https://docs.dev.runwayml.com/


1. 데이터 저장 및 API 요청 흐름 (순서 준수)
   Step 1 (Upload): 클라이언트에서 이미지를 Supabase Storage(uploads bucket)에 업로드한다.

Step 2 (Public URL): 업로드 직후 getPublicUrl()을 사용하여 외부에서 접근 가능한 완전한 URL을 확보한다. (내부 path user/img.jpg 금지)

Step 3 (Pre-save): Runway API를 호출하기 전에, 확보한 URL을 사용하여 video_batches와 video_items 테이블에 데이터를 먼저 INSERT 한다.

이때 video_items의 status는 'pending', runway_task_id는 null로 저장한다.

이유: API 호출 후 DB 저장이 실패하여 데이터가 유실되는 것을 방지하기 위함.

Step 4 (Async Request): DB 저장 후, Qstash를 통해 Runway API에 영상 생성을 요청한다.

Step 5 (Update Task ID): Runway API 응답으로 받은 task_id를 해당 video_items row에 UPDATE 한다.

2. Webhook 처리 및 이메일 발송 (핵심 로직)
   Endpoint: /api/webhooks/runway (POST)

권한 처리 (중요): Webhook은 인증된 유저가 호출하지 않으므로, RLS(Row Level Security) 에러가 발생한다. 반드시 supabase-admin (Service Role Key) 클라이언트를 생성하여 DB를 업데이트해야 한다.

로직 흐름:

Webhook payload에서 task_id와 status('SUCCEEDED'), output_url을 파싱한다.

video_items 테이블에서 runway_task_id가 일치하는 row를 찾는다.

해당 row의 status를 'completed', generated_video_url을 업데이트한다.

이메일 발송: DB 업데이트가 성공하면, 즉시 Resend API를 사용하여 해당 유저에게 "영상 제작 완료" 이메일을 발송한다.

배치(batch_id) 내 다른 이미지의 완료 여부는 확인하지 않는다. 1개 완료 = 1개 메일 발송.

이메일 내용에는 해당 개별 영상 결과를 확인할 수 있는 URL을 포함한다.

3. 프론트엔드 상태 동기화 (UX)
   결과 페이지 (/results/[user_id]):

단순 useEffect fetch로는 영상 완료 시점을 알 수 없다.

Tanstack Query의 refetchInterval을 사용하거나, Supabase Realtime(onPostgresChanges)을 구독하여 video_items 테이블의 변경 사항(status 변화)을 실시간으로 감지하고 UI에 반영해야 한다.

사용자가 새로고침 하지 않아도 '생성 중...'에서 '영상 재생'으로 바뀌어야 한다.

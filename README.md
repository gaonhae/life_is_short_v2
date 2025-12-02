# Life Is Short - 추억을 영상으로

과거의 사진을 모아 영상화하여 추억을 되살려주는 서비스입니다.

## 기술 스택

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email + Google OAuth)
- **File Storage**: Supabase Storage
- **State Management**: TanStack Query
- **Form**: React Hook Form + Zod
- **Video Generation**: Runway API (Gen4-turbo)
- **Async Jobs**: Qstash
- **Email**: Resend
- **Deployment**: Vercel

## 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/           # 인증 관련 페이지
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/           # 메인 기능 페이지
│   │   ├── upload/       # 이미지 업로드
│   │   └── results/      # 영상 결과
│   ├── api/
│   │   ├── auth/         # OAuth 콜백
│   │   └── webhooks/     # Runway 웹훅
│   ├── layout.tsx        # Root 레이아웃
│   ├── providers.tsx     # React Query 프로바이더
│   └── page.tsx
├── components/
│   ├── auth/             # 인증 컴포넌트
│   ├── upload/           # 업로드 컴포넌트
│   ├── results/          # 결과 표시 컴포넌트
│   ├── layout/           # 레이아웃 컴포넌트
│   └── ui/               # UI 컴포넌트
├── lib/
│   ├── api/              # API 클라이언트
│   │   ├── auth.ts
│   │   ├── upload.ts
│   │   ├── runway.ts
│   │   ├── results.ts
│   │   └── email.ts
│   ├── supabase/         # Supabase 클라이언트
│   ├── hooks/            # Custom hooks
│   ├── utils/            # 유틸리티
│   └── middleware.ts
├── types/                # TypeScript 타입
└── styles/               # CSS
```

## 설정 방법

### 1. 환경 변수 설정

`.env.local` 파일을 프로젝트 루트에 생성하고 다음 값들을 입력합니다:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Runway API
RUNWAY_API_KEY=your_runway_api_key

# Qstash
QSTASH_TOKEN=your_qstash_token
NEXT_PUBLIC_QSTASH_URL=https://qstash.io

# Resend (Email)
RESEND_API_KEY=your_resend_api_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Supabase 설정

#### 데이터베이스 스키마 생성

Supabase 대시보드의 SQL Editor에서 `reference/PRD.md`의 DB schema 부분을 실행합니다.

#### 인증 설정

1. **Google OAuth 설정**
   - Supabase 대시보드 > Authentication > Providers > Google
   - Google Cloud Console에서 OAuth 2.0 credentials 생성
   - Authorized redirect URIs에 `https://your-supabase-project.supabase.co/auth/v1/callback` 추가

2. **Email 인증**
   - Supabase 대시보드에서 Email provider 활성화

#### Storage 버킷

PRD의 DB schema에 포함된 'uploads' 버킷이 자동으로 생성됩니다.

### 3. Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. OAuth 2.0 Client ID (Web application) 생성
3. Authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (개발 환경)
   - `https://your-domain.com/auth/callback` (프로덕션)

### 4. Runway API 설정

1. [Runway ML](https://runwayml.com/)에서 API 키 생성
2. 문서: https://docs.runwayml.com/

### 5. Qstash 설정

1. [Qstash](https://qstash.io/)에서 계정 생성
2. 환경 변수에 토큰 추가

### 6. Resend 설정

1. [Resend](https://resend.com/)에서 계정 생성
2. API 키 생성 및 도메인 검증
3. 이메일 발신자 주소 설정

## 실행 방법

### 개발 서버 시작

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 열기

### 프로덕션 빌드

```bash
npm run build
npm start
```

## 데이터 흐름

### 이미지 업로드 및 영상 생성 (Step 1-5)

1. **Upload**: 클라이언트에서 이미지를 Supabase Storage(uploads bucket)에 업로드
2. **Public URL**: 업로드 직후 getPublicUrl()을 사용하여 외부 접근 가능한 URL 확보
3. **Pre-save**: Runway API 호출 전에 video_batches와 video_items 테이블에 데이터 INSERT
   - status: 'pending', runway_task_id: null
4. **Async Request**: Qstash를 통해 Runway API에 영상 생성 요청
5. **Update Task ID**: Runway API 응답의 task_id를 video_items row에 UPDATE

### Webhook 처리 및 이메일 발송 (Step 2)

1. **Webhook**: `/api/webhooks/runway` 엔드포인트로 Runway 완료 신호 수신
2. **권한**: Supabase admin (Service Role Key) 클라이언트로 RLS 우회
3. **업데이트**:
   - status를 'completed'로 업데이트
   - generated_video_url 저장
4. **이메일**: Resend API로 완료 이메일 발송 (개별 영상당 1개)

### 프론트엔드 상태 동기화 (Step 3)

- Supabase Realtime(onPostgresChanges)을 구독하여 video_items 테이블 변경 감지
- 사용자 새로고침 없이 '생성 중...' → '영상 재생'으로 UI 업데이트

## 주의사항

### 보안

- `.env.local` 파일을 `.gitignore`에 포함 (이미 설정됨)
- Service Role Key는 서버 사이드 코드에만 사용
- Webhook 인증 추가 권장 (필요시 구현)

### 제한사항

- 최소 1장, 최대 12장의 이미지만 지원
- JPG, PNG 형식만 지원
- 각 이미지는 3초의 영상으로 변환
- 초기 단계: 여러 영상을 하나로 합치지 않음 (향후 개발)

## 향후 개발 계획

- [ ] 여러 영상 병합 기능
- [ ] 음악 추가 기능
- [ ] 필터/이펙트 적용
- [ ] 소셜 공유 기능
- [ ] 비밀번호 재설정
- [ ] 계정 삭제
- [ ] 영상 재생성
- [ ] 다국어 지원

## 문제 해결

### 이미지 업로드 실패

- 파일 형식이 JPG 또는 PNG인지 확인
- Supabase Storage 권한 확인
- 네트워크 연결 확인

### 영상 생성 실패

- Runway API 키 확인
- Runway API 사용량 한계 확인
- 이미지 URL이 공개되어 있는지 확인

### 이메일 미수신

- Resend 계정 도메인 검증 확인
- 스팸 폴더 확인
- Resend 대시보드에서 발송 로그 확인

## 라이센스

MIT

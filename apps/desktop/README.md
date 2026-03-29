# Desktop Workspace

`apps/desktop`은 Harness Docs의 데스크톱 클라이언트 패키지입니다.

이 패키지는 사용자가 직접 상호작용하는 제품 UI를 담당합니다. 문서 라이브러리, 편집 화면, AI 진입점, 승인 상태, publish flow 같은 사용자 경험은 여기서 구현합니다.

## 역할

- 워크스페이스와 문서 탐색 UI
- Markdown 기반 문서 작성 및 미리보기
- 댓글, 멘션, 승인, stale 상태 가시화
- publish flow 화면과 사용자 입력
- AI 기반 문서 작성 진입점과 제안 UX
- Tauri 기반 데스크톱 런타임 연동

## 기술 구성

- Tauri v2
- React
- TypeScript
- Vite
- TanStack Query
- TanStack Router

## 주요 디렉터리

- `src/components`: 주요 화면 컴포넌트
- `src/services`: 앱 서비스 계약과 구현
- `src/domain`: 클라이언트 측 도메인 인터페이스
- `src/types/contracts.ts`: `packages/contracts`에서 가져오는 공유 타입 경계
- `src/types/domain-ui.ts`: desktop 전용 UI/입력 타입 경계
- `src/data`: 목 데이터와 세션 샘플
- `src/lib`: UI/도메인 보조 유틸리티
- `src/desktop`: Tauri 런타임 연동

## 실행

저장소 루트에서 실행:

```bash
pnpm dev:desktop
```

빌드:

```bash
pnpm build:desktop
```

Rust 쪽 체크:

```bash
pnpm --filter @harness-docs/desktop check:rust
```

## 인증과 배포 연결

현재 `apps/desktop`은 Tauri 런타임과 browser 런타임 모두 API가 소유하는 GitHub OAuth와 앱 세션을 사용합니다.

클라이언트가 알아야 하는 핵심 환경 변수:

- `VITE_HARNESS_API_BASE_URL`

예시:

- local: `VITE_HARNESS_API_BASE_URL=http://127.0.0.1:4020`
- staging: `VITE_HARNESS_API_BASE_URL=https://api-staging.example.com`
- prod: `VITE_HARNESS_API_BASE_URL=https://api.example.com`

브라우저와 데스크톱 모두 이 값을 기준으로 다음 흐름을 사용합니다.

1. `POST /api/auth/github/authorizations` 호출
2. GitHub authorize 페이지로 이동
3. API callback 완료
4. 앱 세션 토큰 저장
5. `/api/session/bootstrap` 호출

운영 시 capability 차이:

- browser: OAuth 로그인, 세션 bootstrap, 조회 중심 기능
- tauri: 위 기능 + 로컬 publish 실행 + 로컬 AI task 실행

즉 로그인과 세션은 공통이지만, 로컬 명령 실행이 필요한 기능은 Tauri 전용입니다.

## 권장 배포 조합

현재 구조에서 browser 앱은 정적 호스팅에 배포하고, API는 별도 Node 런타임에 배포하는 구성이 가장 단순합니다.

권장 예시:

- browser app: Cloudflare Pages
- API: Render 또는 Fly.io
- DNS/SSL: Cloudflare
- DB: managed PostgreSQL

배포 체크리스트:

1. browser build env에 `VITE_HARNESS_API_BASE_URL` 설정
2. API가 공개 HTTPS origin으로 배포되었는지 확인
3. GitHub OAuth callback URL이 API origin과 일치하는지 확인
4. 로그인 후 `/api/session/bootstrap`이 정상 응답하는지 확인

## 설계 원칙

- 이 패키지는 사용자 경험과 화면 상태를 담당합니다.
- 승인 규칙, stale/current 판정, publish preflight 같은 정책 판단은 장기적으로 API에 둡니다.
- 데스크톱은 API 결과를 표시하고 사용자 입력을 수집하는 역할에 집중합니다.

## 타입 경계

desktop 타입은 두 층으로 나눕니다.

- `src/types/contracts.ts`
  `packages/contracts`의 공유 계약을 그대로 다시 내보내는 경계입니다. `WorkspaceGraph`, `PublishRecord`, `NavigationArea` 같이 API와 같은 의미를 가져야 하는 타입은 여기서만 가져옵니다.
- `src/types/domain-ui.ts`
  desktop 안에서만 의미가 있는 타입입니다. `AITaskEntryPoint`, 댓글 입력 payload, 로컬 id alias처럼 UI 상호작용을 표현하는 타입은 여기에 둡니다.

즉 공유 의미를 가지면 `contracts`, desktop 안에서만 쓰이면 `domain-ui`를 사용합니다.

## Query 경계 규칙

이 패키지의 TanStack Query 키는 데이터 경계를 드러내는 방식으로 관리합니다.

- 모든 `queryKey`와 `mutationKey`는 `src/queries/queryKeys.ts`에서 정의합니다.
- 키는 화면 이름이 아니라 데이터 경계 기준으로 나눕니다.
- 순서는 `boundary -> resource -> action`을 유지합니다.
- 컴포넌트나 훅 내부에 리터럴 배열 키를 직접 쓰지 않습니다.

현재 기준 예시는 다음과 같습니다.

- `desktop/bootstrap`
- `desktop/preferences/write`
- `desktop/authentication/session`
- `desktop/ai/run-entry-point`
- `desktop/publishing/execute`
- `rpc/health`

# Desktop Workspace

`apps/desktop`은 Harness Docs의 사용자-facing 클라이언트 워크스페이스입니다.

문서 탐색, 편집, 검토, 승인 상태 가시화, publish flow, AI 진입점, 로컬 런타임 연동 같은 사용자 경험은 여기서 구현합니다. 정책 판단은 가능한 한 API에 두고, 이 워크스페이스는 표현과 입력 수집에 집중합니다.

## 소유 책임

- 워크스페이스와 문서 탐색 UI
- Markdown 기반 문서 작성과 미리보기
- 댓글, 멘션, 승인, stale 상태 가시화
- publish flow 화면과 사용자 입력
- AI 기반 초안 작성 진입점
- Tauri 런타임과 브라우저 런타임 연동

## 주요 경로

- `src/routes`: TanStack Router 라우트 정의
- `src/pages`: 화면 단위 구성
- `src/services`: API, Tauri, 세션 연동 계층
- `src/queries/queryKeys.ts`: Query key 팩터리
- `src/types/contracts.ts`: 공유 계약 타입 경계
- `src/types/domain-ui.ts`: desktop 전용 UI 타입 경계

## 로컬 실행

저장소 루트에서 실행합니다.

```bash
pnpm dev:desktop
```

자주 쓰는 명령:

```bash
pnpm build:desktop
pnpm --filter @harness-docs/desktop preview
pnpm --filter @harness-docs/desktop typecheck
pnpm --filter @harness-docs/desktop check:rust
pnpm --filter @harness-docs/desktop dev:tauri
```

## 환경 변수

- `VITE_HARNESS_API_BASE_URL`: desktop이 연결할 API base URL

예시:

- local: `VITE_HARNESS_API_BASE_URL=http://127.0.0.1:4020`
- staging: `VITE_HARNESS_API_BASE_URL=https://api-staging.example.com`
- prod: `VITE_HARNESS_API_BASE_URL=https://api.example.com`

## 인증과 런타임 메모

- GitHub OAuth와 앱 세션은 `apps/api`가 소유합니다.
- browser와 Tauri 모두 `VITE_HARNESS_API_BASE_URL`을 기준으로 인증 흐름을 시작합니다.
- browser 런타임은 조회와 세션 중심 흐름에 적합하고, Tauri 런타임은 로컬 publish 실행과 로컬 AI task 실행까지 담당할 수 있습니다.

## 경계 규칙

- 승인 규칙, stale/current 판정, publish preflight 같은 정책 판단은 API에 둡니다.
- 공유 의미를 가지는 타입은 `src/types/contracts.ts`를 통해 `packages/contracts`에서 가져옵니다.
- desktop 내부 상호작용 전용 타입은 `src/types/domain-ui.ts`에 둡니다.
- 모든 `queryKey`와 `mutationKey`는 `src/queries/queryKeys.ts` 팩터리만 사용합니다.
- Query key 순서는 `boundary -> resource -> action`을 유지하고, 컴포넌트 안에 리터럴 배열 키를 직접 쓰지 않습니다.

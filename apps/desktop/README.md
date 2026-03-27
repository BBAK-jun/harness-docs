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

## 설계 원칙

- 이 패키지는 사용자 경험과 화면 상태를 담당합니다.
- 승인 규칙, stale/current 판정, publish preflight 같은 정책 판단은 장기적으로 API에 둡니다.
- 데스크톱은 API 결과를 표시하고 사용자 입력을 수집하는 역할에 집중합니다.

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

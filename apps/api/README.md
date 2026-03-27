# API Workspace

`apps/api`는 Harness Docs의 백엔드 API 패키지입니다.

이 패키지는 데스크톱 앱 뒤에서 동작하는 authoritative한 서버 계층을 담당합니다. 장기적으로는 문서 상태, 워크스페이스 멤버십, 승인 권한, publish preflight, GitHub 발행 자동화 같은 정책 판단을 이 계층이 소유해야 합니다.

## 역할

- 앱 세션과 인증 이후 상태 관리
- 워크스페이스 멤버십과 권한 관리
- 문서, 댓글, 승인, 편집 락 영속화
- stale/current 판정과 publish preflight
- publish record 생성과 GitHub branch/commit/PR 오케스트레이션
- outbound webhook 같은 서버 측 후처리

## 현재 상태

현재는 아래 기반이 잡혀 있습니다.

- Node 어댑터 위의 Hono 서버
- `@harness-docs/contracts`에서 공유하는 typed API surface
- mock/postgres 데이터 소스 전환 구조
- 데스크톱 클라이언트 연결용 기본 엔드포인트

## 주요 파일

- `src/server.ts`: API 서버 진입점
- `src/data/*`: 워크스페이스 세션 데이터 소스 구현

## 실행

저장소 루트에서 실행:

```bash
pnpm dev:api
```

프로덕션 형태 실행:

```bash
pnpm start:api
```

타입 체크:

```bash
pnpm check:api
```

## 환경 변수

주요 환경 변수:

- `PORT`: 기본 포트, 기본값 `4020`
- `HOST`: 바인딩 호스트, 기본값 `127.0.0.1`
- `HARNESS_DOCS_API_DATA_SOURCE`: `postgres` 또는 `mock`
- `DATABASE_URL`: PostgreSQL 연결 문자열

## 설계 원칙

- 정책 판단은 가능한 한 이 패키지에서 수행합니다.
- 데스크톱은 표현과 상호작용을 담당하고, API는 authoritative state를 담당합니다.
- desktop과 API 사이 계약은 `@harness-docs/contracts`를 통해 고정합니다.

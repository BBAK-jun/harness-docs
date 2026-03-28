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
- Postgres 기반 authoritative 데이터 소스
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

OpenAPI/Scalar 확인:

- OpenAPI JSON: `http://127.0.0.1:4020/doc`
- Scalar UI: `http://127.0.0.1:4020/scalar`

타입 체크:

```bash
pnpm check:api
```

## 환경 변수

주요 환경 변수:

- `PORT`: 기본 포트, 기본값 `4020`
- `HOST`: 바인딩 호스트, 기본값 `127.0.0.1`
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `GITHUB_CLIENT_ID`: GitHub OAuth App client id
- `GITHUB_CLIENT_SECRET`: GitHub OAuth App client secret
- `HARNESS_DOCS_API_BASE_URL`: OAuth callback 절대 URL을 강제로 고정해야 할 때 사용. 기본값은 현재 요청 origin
- `GITHUB_OAUTH_SCOPE`: GitHub OAuth scope override. 기본값은 `read:user user:email`

## GitHub OAuth 인프라

GitHub 로그인은 `apps/api`가 OAuth redirect callback과 앱 세션 발급을 담당하는 구조입니다.

운영 전 준비 항목:

- 공개 API origin 준비
- TLS 적용
- GitHub OAuth App 생성
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` 주입
- `HARNESS_DOCS_API_BASE_URL` 설정
- DB migration 적용

현재 구현 기준 callback 경로는 항상 `/api/auth/github/callback` 입니다.

예시:

- local: `http://127.0.0.1:4020/api/auth/github/callback`
- staging: `https://api-staging.example.com/api/auth/github/callback`
- prod: `https://api.example.com/api/auth/github/callback`

권장 방식:

- `dev`, `staging`, `prod`별로 GitHub OAuth App을 분리합니다.
- 각 환경의 `Authorization callback URL`은 해당 환경 API origin과 정확히 일치시킵니다.
- reverse proxy 뒤에서 origin이 바뀔 수 있으면 `HARNESS_DOCS_API_BASE_URL`을 반드시 설정합니다.

GitHub OAuth App 등록 시 확인할 값:

- `Homepage URL`: 사용자 접근 앱 주소
- `Authorization callback URL`: `https://<api-origin>/api/auth/github/callback`

운영 체크리스트:

1. API 도메인과 HTTPS 준비
2. GitHub OAuth App 생성
3. callback URL 등록
4. API 런타임에 GitHub client id/secret 주입
5. `HARNESS_DOCS_API_BASE_URL` 설정
6. `pnpm db:migrate` 실행
7. `/api/auth/github/start`부터 callback까지 end-to-end 검증

주의:

- 현재 OAuth 시도 상태는 서버 메모리에 저장됩니다.
- 단일 인스턴스 개발/초기 운영에는 충분하지만, 다중 인스턴스 운영이나 재시작 내구성이 필요하면 Redis 또는 DB 저장으로 옮겨야 합니다.
- 현재 API는 전체 CORS를 허용합니다. 운영에서는 허용 origin을 staging/prod 웹 도메인으로 제한하는 편이 안전합니다.

참고 문서:

- GitHub OAuth App 생성: https://docs.github.com/en/developers/apps/creating-an-oauth-app
- GitHub OAuth authorization flow: https://docs.github.com/apps/building-oauth-apps/authorizing-oauth-apps

## 배포 전략

현재 구조에서 가장 현실적인 배포 조합은 다음과 같습니다.

- browser app: 정적 호스팅
- API: Node 서버 호스팅
- DB: managed PostgreSQL
- DNS/SSL: Cloudflare

권장 예시:

- Cloudflare Free: DNS, TLS, 프록시
- Cloudflare Pages: browser app 정적 배포
- Render 또는 Fly.io: `apps/api` 배포
- managed Postgres: 운영 DB

이 구성을 권장하는 이유:

- `apps/api`는 현재 Node 프로세스로 실행됩니다.
- GitHub OAuth 시도 상태가 메모리 저장소를 사용합니다.
- 따라서 현재 상태 그대로는 Cloudflare Workers보다 Node 서버 호스팅이 더 자연스럽습니다.

환경별 기본값 예시:

- local API base URL: `http://127.0.0.1:4020`
- staging API base URL: `https://api-staging.example.com`
- prod API base URL: `https://api.example.com`

배포 순서:

1. Postgres 준비
2. API 배포
3. API env 주입
4. DB migration 적용
5. browser app에 API base URL 연결
6. GitHub OAuth callback 검증
7. CORS와 secret rotation 점검

## 설계 원칙

- 정책 판단은 가능한 한 이 패키지에서 수행합니다.
- 데스크톱은 표현과 상호작용을 담당하고, API는 authoritative state를 담당합니다.
- desktop과 API 사이 계약은 `@harness-docs/contracts`를 통해 고정합니다.

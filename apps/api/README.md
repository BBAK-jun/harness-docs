# API Workspace

`apps/api`는 Harness Docs의 authoritative backend layer입니다.

이 워크스페이스는 인증 이후의 앱 세션, 워크스페이스 멤버십, 승인 규칙, stale 판단, publish preflight, GitHub 발행 orchestration 같은 정책을 소유합니다. `apps/desktop`은 이 결과를 표시하고 입력을 수집하며, 최종 판단은 가능한 한 이 계층에 둡니다.

## 소유 책임

- GitHub OAuth callback과 앱 세션 bootstrap
- 워크스페이스 멤버십, 권한, 승인 상태 관리
- 문서, 댓글, 편집 락, publish record 영속화
- stale/current 평가와 publish preflight 계산
- GitHub branch, commit, pull request 생성 orchestration

## 주요 진입점

- `src/server.ts`: Node 서버 진입점
- `src/app.ts`: API app boundary와 공개 surface
- `src/client.ts`: desktop이 참조하는 typed client factory
- `src/domain/publishGovernanceAdapter.ts`: publish 정책 계산 경계
- `src/test/workspaceFlow.test.ts`: 주요 흐름 검증

## 로컬 실행

저장소 루트에서 실행합니다.

```bash
pnpm db:up
pnpm db:migrate
pnpm dev:api
```

자주 쓰는 명령:

```bash
pnpm start:api
pnpm check:api
pnpm test:api
```

문서 확인:

- OpenAPI JSON: `http://127.0.0.1:4020/doc`
- Scalar UI: `http://127.0.0.1:4020/scalar`

## 환경 변수

- `PORT`: 기본 포트. 기본값 `4020`
- `HOST`: 바인딩 호스트. 기본값 `127.0.0.1`
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `GITHUB_CLIENT_ID`: GitHub OAuth App client id
- `GITHUB_CLIENT_SECRET`: GitHub OAuth App client secret
- `HARNESS_DOCS_API_BASE_URL`: callback origin을 고정해야 할 때 사용
- `GITHUB_OAUTH_SCOPE`: GitHub OAuth scope override. 기본값 `read:user user:email`

## GitHub OAuth 메모

- callback 경로는 항상 `/api/auth/github/callback` 입니다.
- 환경별 GitHub OAuth App을 분리하고 callback URL을 API origin과 정확히 맞추는 편이 안전합니다.
- reverse proxy 뒤에서 origin이 바뀌면 `HARNESS_DOCS_API_BASE_URL`을 명시적으로 설정해야 합니다.
- 현재 OAuth 시도 상태는 서버 메모리에 저장됩니다. 다중 인스턴스 운영이 필요하면 Redis나 DB 저장으로 옮겨야 합니다.

## 운영 메모

- 현재 런타임은 Node 서버를 기준으로 설계되어 있습니다.
- 운영에서는 CORS 허용 origin을 배포된 클라이언트 도메인으로 제한하는 편이 안전합니다.
- 배포 전에는 `POST /api/auth/github/authorizations`부터 callback, `/api/session/bootstrap`까지 end-to-end로 확인하는 편이 좋습니다.

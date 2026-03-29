# 구현 현황

_최종 업데이트: 2026-03-28_

## 현재 어디까지 왔나

Harness Docs는 현재 `데스크톱 앱 골격 + authoritative API + PostgreSQL 저장 모델 + 기본 검증 흐름`까지 올라온 상태입니다.

제품 요구사항 수준을 넘어서, 아래 세로 슬라이스가 실제로 동작하는 backend foundation이 준비됐습니다.

- workspace bootstrap
- document create and update
- approval request and decision
- publish record create
- publish execute
- publish governance preflight read

## 사용자 흐름 체크리스트

아래 체크리스트는 2026-03-29 기준으로 코드와 검증 결과를 함께 반영한 현재 상태입니다.

### 지금 확인 가능한 흐름

- [x] GitHub OAuth 시작 endpoint가 존재한다
- [x] 앱 세션 exchange / restore / sign-out 흐름이 동작한다
- [x] 인증된 세션으로 workspace bootstrap을 불러올 수 있다
- [x] 인증된 세션으로 workspace를 생성할 수 있다
- [x] workspace 생성 시 docs repository binding을 함께 저장할 수 있다
- [x] document create / update write path가 API에 존재한다
- [x] approval request / decision write path가 API에 존재한다
- [x] publish record create write path가 API에 존재한다
- [x] document publish preflight를 authoritative API에서 조회할 수 있다
- [x] publish execute 호출 시 publish record와 document publish 메타데이터가 갱신된다
- [x] OpenAPI JSON과 Scalar UI를 확인할 수 있다
- [x] API integration test가 workspace -> document -> approval -> publish 흐름을 검증한다

### 데스크톱에서 현재 확인 가능한 것

- [x] TanStack Router 기반 file route 구조가 연결돼 있다
- [x] sign-in 이후 bootstrap을 API에서 직접 읽는다
- [x] workspace 목록 / workspace graph read는 RPC 기반이다
- [x] publish 화면은 publish preflight를 API에서 직접 읽는다
- [x] Tauri 런타임에서는 GitHub OAuth 브라우저 오픈 흐름이 연결돼 있다
- [x] workspace create 화면은 API create endpoint를 호출한다

### 아직 부분 구현인 흐름

- [ ] approval 화면이 API write flow까지 완전히 연결돼 있지는 않다
- [ ] comments는 authoritative API write가 아니라 desktop local state로 유지된다
- [ ] document editing lock은 authoritative API write가 아니라 desktop local state로 유지된다
- [ ] markdown 편집 draft는 서버 저장이 아니라 desktop local state에 머문다
- [ ] publish execute는 실제 GitHub adapter가 아니라 mock commit / PR 결과를 사용한다
- [ ] webhook delivery outbox는 아직 없다
- [ ] comment write API는 아직 없다
- [ ] document lock write API는 아직 없다
- [ ] workspace / document / approval 권한 정책은 더 강화가 필요하다

### 제품 점검용 수동 확인 체크리스트

- [ ] `pnpm dev:api`로 API를 올린다
- [ ] `pnpm dev:desktop` 또는 `pnpm --filter @harness-docs/desktop dev:tauri`로 desktop을 올린다
- [ ] sign-in 화면에서 GitHub OAuth 시작이 되는지 확인한다
- [ ] 로그인 후 workspace 목록이 bootstrap 데이터로 보이는지 확인한다
- [ ] 새 workspace 생성 후 목록과 active workspace가 갱신되는지 확인한다
- [ ] document 화면에서 문서 목록과 문서 상세가 보이는지 확인한다
- [ ] publish 화면에서 preflight badge와 blocking / rationale 상태가 보이는지 확인한다
- [ ] approval 화면에서 bootstrap된 approval 상태가 보이는지 확인한다
- [ ] comment 추가 시 현재 세션 안에서는 스레드가 보이지만, authoritative 저장은 아니라는 점을 확인한다
- [ ] edit lock 획득/해제도 현재 세션 로컬 상태 기반이라는 점을 확인한다
- [ ] publish 실행 결과의 branch / commit / PR 정보가 실제 GitHub 반영이 아니라 mock 결과인지 확인한다

## 완료된 범위

### 모노레포 기반

- `apps/desktop`, `apps/api`, `packages/contracts`, `packages/db` 구조로 모노레포 정리 완료
- `pnpm workspace` 기준의 루트 스크립트 정리 완료

### 데스크톱 앱 기반

- `Tauri v2 + React + TypeScript + Vite` 기반 프로젝트 생성 완료
- `shadcn 스타일 + Tailwind CSS` 기반 UI foundation 반영 완료
- 문서 라이브러리, 에디터, 승인, publish, AI 화면 골격 반영 완료
- Lovable 기준 dashboard-first 정보구조와 projection/view-model 계층 반영 진행 중

### API 계약과 서버 기반

- `Hono + RPC` 기반 API 구조 반영 완료
- 모든 응답을 표준 envelope로 통일 완료

```ts
{
  ok,
  data,
  error,
  meta
}
```

- `packages/contracts`에 shared DTO와 route contract 정리 완료
- `packages/contracts`에 publish governance 상태 기계와 projection snapshot 타입 정리 완료

### 저장 모델과 DDD 경계

- `PostgreSQL + Drizzle ORM` 기반 스키마 추가 완료
- `users`, `workspaces`, `workspace_memberships`
- `templates`, `documents`, `document_versions`, `document_links`
- `approval_requests`, `approval_events`
- `publish_records`, `publish_record_artifacts`, `publish_notifications`
- `document_locks`, `document_invalidations`, `ai_drafts`

도메인 계산은 API 내부 aggregate로 분리했습니다.

- `apps/api/src/domain/documentAggregate.ts`
- `apps/api/src/domain/publishAggregate.ts`
- `apps/api/src/domain/shared.ts`
- `apps/api/src/domain/publishGovernanceProjection.ts`
- `apps/api/src/domain/publishGovernanceAdapter.ts`

현재 datasource는 persistence adapter 역할만 하도록 정리했습니다.

### Postgres read and write path

`apps/api/src/data/postgresWorkspaceSessionSource.ts` 기준으로 아래가 Postgres에서 동작합니다.

- bootstrap read
- workspace graph read
- workspace update
- document create
- document update
- approval request
- approval decision
- publish record create
- publish execute
- document publish preflight read

### Publish Governance Contracts

publish governance는 현재 contracts 중심으로 문서화되고 있습니다.

- `DocumentStatusView`
- `PublishEligibility`
- `PublishPreflightView`
- `PublishAttemptResult`
- `PublishGovernanceDocumentSnapshot`
- `PublishGovernancePublishRecordSnapshot`

추가로 아래 endpoint가 연결됐습니다.

- `GET /api/workspaces/:workspaceId/documents/:documentId/publish-preflight`

이 endpoint는 authoritative publish preflight를 반환합니다.

### Desktop RPC 연결 현황

desktop은 아직 file-based route 리팩터링 중이므로 화면 연결은 완료되지 않았습니다.

다만 서비스 계층까지는 연결됐습니다.

- `apps/desktop/src/domain/publishing.ts`
- `apps/desktop/src/services/rpcPublishing.ts`
- `apps/desktop/src/services/mockDomainServices.ts`

즉, route 리팩터링이 끝나면 UI에서 바로 `PublishPreflightView`를 읽을 수 있는 상태입니다.

### 로컬 개발 bootstrap

로컬 개발용 Postgres 실행과 demo bootstrap을 추가했습니다.

- `docker compose up -d db`
- `pnpm db:migrate`
- `pnpm db:seed`

demo seed는 아래 fixture를 생성합니다.

- demo users 3명
- workspace 1개
- memberships 3개
- system templates 4개
- sample documents 2개

관련 소스:

- `apps/api/scripts/lib/demoWorkspaceFixture.ts`
- `apps/api/scripts/lib/resetHarnessDocsDatabase.ts`
- `apps/api/scripts/lib/seedDemoWorkspace.ts`
- `apps/api/scripts/seedDemoWorkspace.ts`
- `packages/db/scripts/migrate.mjs`

## 검증된 항목

아래는 2026-03-27 기준으로 실제 통과한 검증입니다.

- `pnpm --filter @harness-docs/api build`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm test:api`

integration test는 아래 시나리오를 검증합니다.

- bootstrap session 조회
- document 생성
- approval 요청
- approval 승인
- publish record 생성
- publish execute

관련 소스:

- `apps/api/src/test/workspaceFlow.test.ts`

## 아직 남아 있는 범위

### API 쪽

- 권한 정책 강화
- comment write API
- document lock write API
- GitHub 실제 publish adapter
- webhook delivery outbox

### 데스크톱 쪽

- mock service를 실제 RPC write flow로 완전 전환
- GitHub OAuth 실제 연결
- publish와 approval 화면의 실데이터 연결
- publish route에서 `PublishPreflightView` 직접 사용
- Codex and Claude adapter 연결

## 현재 추천되는 다음 작업

지금 우선순위는 아래 순서가 맞습니다.

1. 권한 정책을 application layer로 분리
2. comment와 lock write API 추가
3. GitHub publish execute를 outbox 기반 실제 adapter로 교체
4. desktop mock state를 API RPC로 점진 전환
5. publish route를 contracts-driven preflight view로 전환

## 관련 문서

- [패키지 구성](/reference/packages)
- [Publish Governance RPC](/reference/publish-governance-rpc)
- [Lovable UI SSOT](/reference/lovable-ui-ssot)
- [아키텍처](/Users/sondi/Documents/github/projects/packages/contracts/docs/architecture.md)
- [도메인 모델](/Users/sondi/Documents/github/projects/packages/contracts/docs/domain-model.md)
- [원문 사양](/reference/spec-sources)

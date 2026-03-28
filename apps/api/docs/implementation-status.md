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

- `apps/api/src/bootstrap/demoWorkspace.ts`
- `apps/api/src/bootstrap/seedDemoWorkspace.ts`
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

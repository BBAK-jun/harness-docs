# Harness Docs

Harness Docs는 소규모 크로스펑셔널 제품 팀을 위한 데스크톱 중심 문서 워크플로 서비스입니다.

이 서비스의 핵심 아이디어는 하나입니다. 문서 상태, 거버넌스, 승인 권한은 앱이 소유하고, GitHub는 출판 대상이 됩니다. 팀은 앱 안에서 구조화된 제품 문서를 작성하고 관리하며, AI로 초안을 만들고 다듬은 뒤, 전용 GitHub 저장소에 branch, commit, pull request를 자동으로 생성하는 흐름으로 문서를 발행합니다.

## 제품 개요

Harness Docs는 다음 문서를 하나의 시스템에서 관리하려는 팀을 위해 설계됩니다.

- PRD
- UX Flow
- Technical Spec
- Policy / Decision 문서

목표는 Markdown이나 GitHub를 대체하는 것이 아닙니다. PM, 디자인, 엔지니어링이 각자 다른 도구로 흩어지지 않고, 앱이 소유하는 하나의 흐름 안에서 문서를 작성, 검토, 승인, 발행할 수 있게 만드는 것이 목표입니다.

핵심 원칙은 다음과 같습니다.

- 문서 상태, 리뷰 상태, 승인 권한의 소스 오브 트루스는 앱입니다.
- GitHub는 발행 채널이지, 문서가 최신인지 아닌지를 판정하는 권위가 아닙니다.
- 역할별 문서는 각각 독립된 1급 객체로 취급합니다.
- AI는 초안과 구조를 제안하지만, 리뷰와 발행의 통제권은 사람이 가집니다.
- stale 상태는 반드시 보이고 추적 가능해야 하지만, 무조건 하드블록으로 막지는 않습니다.

## 서비스가 하는 일

Harness Docs는 아래 흐름을 지원하는 방향으로 만들어지고 있습니다.

1. GitHub OAuth로 로그인하고 하나 이상의 워크스페이스에 진입합니다.
2. 구조화된 템플릿에서 문서를 생성합니다.
3. Markdown과 미리보기 기반으로 문서를 편집합니다.
4. 문서 간 링크를 연결해 상위 문서 변경이 하위 문서를 stale로 만들 수 있게 합니다.
5. 댓글, 멘션, 승인, stale 상태를 앱 내부에서 관리합니다.
6. AI가 인터뷰, 내부 문서 탐색, 구조화된 초안 제안을 수행합니다.
7. GitHub에 branch, commit, pull request를 자동 생성하여 발행합니다.

## 모노레포 구조

```text
apps/
  api/        앱 세션, 워크스페이스 상태, publish 오케스트레이션, 백엔드 권한을 담당하는 Hono API
  desktop/    Tauri + React 기반 데스크톱 클라이언트

packages/
  contracts/  API 계약과 타입이 정의된 공유 패키지
  db/         데이터베이스 접근, 스키마 도구, 마이그레이션

docs/         제품 문서와 기획 문서
```

## 아키텍처 방향

이 서비스는 책임 기준으로 나뉘어야 합니다.

- `apps/desktop`은 UI 상태, 편집 경험, 로컬 설정, 사용자 인터랙션 흐름을 담당합니다.
- `apps/api`는 승인 규칙, stale/current 판정, publish preflight, publish record, GitHub 자동화처럼 authoritative한 비즈니스 규칙을 담당합니다.
- `packages/contracts`는 desktop과 API 사이의 공유 계약을 정의합니다.
- `packages/db`는 백엔드 영속 계층을 지원합니다.

정리하면 다음 원칙을 따릅니다.

- 정책 판단은 API에 둡니다.
- 표현과 인터랙션은 desktop에 둡니다.
- 공유 DTO와 계약은 contracts에 둡니다.

## 기술 스택

- 데스크톱 셸: Tauri v2
- 프론트엔드: React + TypeScript + Vite
- API: Hono on Node
- 공유 계약: 워크스페이스 패키지 기반 typed exports
- 데이터베이스: PostgreSQL + Drizzle
- 패키지 매니저: pnpm workspaces

## 현재 패키지 구성

### `apps/desktop`

제품 워크플로를 제공하는 데스크톱 앱입니다. 문서 라이브러리, 편집 워크스페이스, AI 작업 진입점, 승인 화면, publish flow UI가 여기 포함됩니다.

자주 쓰는 명령:

- `pnpm dev:desktop`
- `pnpm build:desktop`
- `pnpm --filter @harness-docs/desktop check:rust`

### `apps/api`

앱이 소유하는 권한과 오케스트레이션을 담당하는 백엔드 영역입니다. 데스크톱 셸 수준을 넘어서는 세션 처리, 워크스페이스 멤버십, 문서 영속화, 승인 규칙, publish preflight, GitHub 발행 흐름을 여기서 맡는 것이 목표입니다.

자주 쓰는 명령:

- `pnpm dev:api`
- `pnpm start:api`
- `pnpm check:api`

### `packages/contracts`

API와 데스크톱이 함께 사용하는 공유 계약 패키지입니다.

### `packages/db`

스키마 생성, 마이그레이션, DB 레이어 검증을 담당하는 데이터베이스 패키지입니다.

자주 쓰는 명령:

- `pnpm db:up`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm check:db`

## 시작하기

### 준비물

- Node.js 20 이상
- pnpm 10 이상
- Docker
- Tauri 데스크톱 앱을 빌드하려면 Rust toolchain

### 설치

```bash
pnpm install
```

### 환경 변수

`.env.example`를 `.env`로 복사해서 사용하면 됩니다.

기본 로컬 데이터베이스 설정은 아래와 같습니다.

```env
DATABASE_URL=postgresql://harness_docs:harness_docs@127.0.0.1:5432/harness_docs
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=harness_docs
PGPASSWORD=harness_docs
PGDATABASE=harness_docs
```

### 로컬 의존성 실행

```bash
pnpm db:up
```

### API 실행

```bash
pnpm dev:api
```

### 데스크톱 앱 실행

```bash
pnpm dev:desktop
```

### 검증 실행

```bash
pnpm check:db
pnpm check:api
pnpm build:desktop
```

또는 저장소 전체 검증:

```bash
pnpm build
```

## 도메인을 한 문장으로 요약하면

Harness Docs는 단순한 Markdown 편집기나 GitHub 동기화 도구가 아닙니다. 문서 타입, 링크, 리뷰 상태, 승인 상태, stale/current 상태, publish 이력을 앱이 직접 관리하는 문서 거버넌스 시스템입니다. GitHub 발행은 이 시스템의 결과물이지, 시스템 자체가 아닙니다.

## 단기 개발 방향

백엔드에서 가장 중요한 작업:

- GitHub OAuth 기반 앱 세션
- 워크스페이스 멤버십과 권한 관리
- 문서 영속화
- 댓글, 멘션, 승인 관리
- publish preflight와 stale rationale 강제
- GitHub branch, commit, pull request 오케스트레이션

데스크톱에서 가장 중요한 작업:

- 문서 생성과 편집 UX
- 리뷰와 승인 상태 가시화
- publish flow UX
- AI 기반 초안 작성과 문서 탐색

## 관련 문서

- 제품 요구사항: [`docs/product-doc-harness-prd.md`](./docs/product-doc-harness-prd.md)
- API 메모: [`apps/api/README.md`](./apps/api/README.md)

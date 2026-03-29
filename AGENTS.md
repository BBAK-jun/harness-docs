# Repository Rules

이 저장소는 제품 경계와 책임 분리를 우선합니다.

## System Boundaries

- `apps/desktop`은 사용자 경험, 화면 조합, 로컬 상호작용을 담당합니다.
- `apps/api`는 권한, 승인 규칙, stale 판단, publish orchestration 같은 authoritative한 정책을 담당합니다.
- `apps/api`는 RESTful canonical route, OpenAPI/Scalar, Hono app assembly를 소유합니다.
- `packages/contracts`는 앱 간 공유 계약만 담당합니다.
- `packages/contracts`는 DTO, schema, 상태 전이, 공유 도메인 타입을 소유하지만 서버 runtime이나 Hono app assembly는 소유하지 않습니다.
- `packages/db`는 서버 측 영속 계층과 스키마 지원을 담당합니다.

## Architecture Conventions

- 정책 판단은 가능한 한 API에 둡니다.
- desktop은 표현과 입력 수집에 집중합니다.
- desktop은 `@harness-docs/api`의 공개 client boundary는 직접 참조할 수 있습니다.
- 다만 다른 패키지의 내부 구현 파일을 직접 참조하지 않습니다.
- API는 `application`, `domain`, `infrastructure`, `presentation` 레이어를 유지합니다.
- `packages/contracts`는 shared contract source of truth이며, 공유 의미를 가진 타입은 여기서 먼저 모델링합니다.
- 타입 정의 자체가 문서처럼 읽히도록 상태 이름, union, 전이 모델을 명시적으로 유지합니다.
- `any`는 피합니다.
- `unknown`은 외부 입력 경계에서만 허용하고, 바로 좁혀서 사용합니다.
- README 역할을 분리합니다.
- 루트 `README.md`는 제품 소개만 다룹니다.
- 실행 방법과 개발 절차는 각 패키지 `README.md`에 둡니다.

## API And Contract Rules

- canonical HTTP endpoint는 가능한 한 RESTful resource naming으로 설계합니다.
- route alias는 호환성 유지 목적일 때만 두고, 문서와 client는 canonical route를 기준으로 맞춥니다.
- typed RPC client, OpenAPI, Scalar는 `apps/api`가 소유하는 surface를 기준으로 유지합니다.
- contract shape가 바뀌면 `desktop`, `api`, `docs` 중 관련 경계를 같이 정렬합니다.

## Modeling Rules

- authoritative policy와 UI 편의 projection을 혼합하지 않습니다.
- API에서 authoritative view가 이미 존재하면 desktop이 같은 정책을 별도로 재판단하지 않습니다.
- 공유 타입은 broad record보다 명시적 필드와 명시적 lifecycle을 우선합니다.
- 상태 전이가 중요한 흐름은 enum 나열보다 전이 가능한 상태를 읽을 수 있게 표현합니다.

## Change Scope

- unrelated 변경을 한 커밋이나 PR에 섞지 않습니다.
- 가능하면 `desktop`, `api`, `db`, `contracts`, `repo` 단위로 커밋 범위를 나눕니다.
- 생성 파일은 생성 규칙으로 관리하고 수동 편집을 피합니다.

## UI And State

- 라우팅은 TanStack Router 기준으로 유지합니다.
- 서버/비동기 상태는 TanStack Query 기준으로 유지합니다.
- `useEffect`는 네트워크 패칭보다 부작용 연결에 우선 사용합니다.

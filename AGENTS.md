# Repository Rules

이 저장소는 제품 경계와 책임 분리를 우선합니다.

## System Boundaries

- `apps/desktop`은 사용자 경험, 화면 조합, 로컬 상호작용을 담당합니다.
- `apps/api`는 권한, 승인 규칙, stale 판단, publish orchestration 같은 authoritative한 정책을 담당합니다.
- `packages/contracts`는 앱 간 공유 계약만 담당합니다.
- `packages/db`는 서버 측 영속 계층과 스키마 지원을 담당합니다.

## Architecture Conventions

- 정책 판단은 가능한 한 API에 둡니다.
- desktop은 표현과 입력 수집에 집중합니다.
- 앱 간 내부 구현을 직접 참조하지 말고 `packages/contracts`를 경유합니다.
- README 역할을 분리합니다.
- 루트 `README.md`는 제품 소개만 다룹니다.
- 실행 방법과 개발 절차는 각 패키지 `README.md`에 둡니다.

## Change Scope

- unrelated 변경을 한 커밋이나 PR에 섞지 않습니다.
- 가능하면 `desktop`, `api`, `db`, `contracts`, `repo` 단위로 커밋 범위를 나눕니다.
- 생성 파일은 생성 규칙으로 관리하고 수동 편집을 피합니다.

## UI And State

- 라우팅은 TanStack Router 기준으로 유지합니다.
- 서버/비동기 상태는 TanStack Query 기준으로 유지합니다.
- `useEffect`는 네트워크 패칭보다 부작용 연결에 우선 사용합니다.

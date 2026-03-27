# Contributing

## Principles

- 작은 PR을 선호합니다.
- 하나의 PR은 가능한 한 하나의 책임 경계만 바꿉니다.
- 기능 구현과 무관한 정리 작업은 별도 커밋으로 분리합니다.

## Commit Convention

- `feat(desktop): ...`
- `feat(api): ...`
- `feat(db): ...`
- `fix(desktop): ...`
- `docs(root): ...`
- `chore(repo): ...`

커밋 범위는 실제 변경 경계를 반영해야 합니다.

## Pull Request Rules

- unrelated 파일을 섞지 않습니다.
- 변경 요약, 영향 범위, 검증 방법을 PR에 적습니다.
- CI가 빨간 상태면 merge하지 않습니다.
- shared branch에 force push하지 않습니다.

## Repository Conventions

- 루트 `README.md`는 제품 소개 문서입니다.
- 실행 방법은 각 패키지 `README.md`에 적습니다.
- 라우트는 파일 기반 TanStack Router 규칙을 따릅니다.
- 서버 상태는 TanStack Query 규칙을 따릅니다.
- Query key와 mutation key는 각 패키지의 key factory를 사용합니다.

## Validation

변경한 경계에 맞는 검증을 직접 돌리는 것을 기본으로 합니다.

- desktop 변경: `pnpm build:desktop`
- api 변경: `pnpm check:api`
- db 변경: `pnpm check:db`
- repo formatting 변경: `pnpm format:check`

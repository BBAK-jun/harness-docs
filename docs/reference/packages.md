# 패키지 구성

## 모노레포 패키지

### `apps/desktop`

- 데스크톱 UI
- 문서 편집 경험
- publish flow 표현
- AI 작업 진입점

관련 소스:

- `apps/desktop/README.md`

### `apps/api`

- authoritative backend
- 세션, 권한, publish orchestration
- stale/current 및 preflight 판단

관련 소스:

- `apps/api/README.md`

### `packages/contracts`

- desktop과 API 사이 공유 계약
- DTO, route contract, client factory

관련 소스:

- `packages/contracts/README.md`

### `packages/db`

- PostgreSQL 연결
- Drizzle schema
- migration tooling

관련 소스:

- `packages/db/README.md`

## 문서 사이트 실행

저장소 루트에서:

```bash
pnpm docs:dev
```

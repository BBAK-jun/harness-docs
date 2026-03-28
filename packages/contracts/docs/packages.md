# 패키지 구성

현재 구현 상태와 검증 범위는 [구현 현황](/reference/implementation-status) 문서에서 확인할 수 있습니다.

## 모노레포 패키지

### `apps/desktop`

- 데스크톱 UI
- 문서 편집 경험
- publish flow 표현
- AI 작업 진입점
- publish governance RPC consumer

관련 소스:

- `apps/desktop/README.md`

### `apps/api`

- authoritative backend
- 세션, 권한, publish orchestration
- stale/current 및 preflight 판단
- publish governance preflight projection

관련 소스:

- `apps/api/README.md`

### `packages/contracts`

- desktop과 API 사이 공유 계약
- DTO, route contract, client factory
- publish governance 상태 기계와 projection snapshot

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

추가 문서:

- [Publish Governance RPC](/reference/publish-governance-rpc)

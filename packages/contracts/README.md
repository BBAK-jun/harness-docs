# Contracts Workspace

`packages/contracts`는 Harness Docs의 공유 계약 패키지입니다.

이 워크스페이스는 `apps/api`와 `apps/desktop`이 같은 의미로 해석해야 하는 DTO, schema, enum, discriminated union을 정의합니다. 구현 세부사항이 아니라 앱 사이의 계약 자체를 고정하는 것이 목적입니다.

## 포함 범위

- API request/response DTO
- workspace/session 관련 공유 타입
- publish governance snapshot과 상태 전이 타입
- enum, schema, union 기반의 typed contract

## 두지 않는 것

- Hono app 조립
- runtime client 생성
- API data source 구현
- desktop 전용 UI 상태 타입
- 정책 실행 로직 자체

## 주요 파일

- `src/index.ts`: 외부 공개 진입점
- `src/workspace-graph.ts`: 워크스페이스 그래프 관련 계약
- `src/publish-governance.ts`: publish 도메인 계약과 상태 전이
- `src/enums.ts`: 공유 enum 집합

## 변경 원칙

- 앱 간 통신 형식은 이 패키지에서 먼저 정의합니다.
- desktop과 API가 같은 타입을 중복 정의하지 않도록 유지합니다.
- 타입만 읽어도 상태, 정책, 전이 조건이 이해되도록 작성합니다.
- 정책 판단은 API에 두되, 그 결과 shape는 여기서 고정합니다.

## 변경 후 확인

독립 실행 스크립트는 없으므로 consumer를 함께 확인합니다.

```bash
pnpm --filter @harness-docs/api build
pnpm --filter @harness-docs/desktop typecheck
```

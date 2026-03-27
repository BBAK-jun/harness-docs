# Contracts Workspace

`packages/contracts`는 Harness Docs의 공유 계약 패키지입니다.

이 패키지는 `apps/desktop`, `apps/api`, 그리고 앞으로 추가될 수 있는 워커나 webhook processor 사이에서 공통으로 사용하는 타입과 API 계약을 정의합니다.

## 역할

- API request/response DTO 정의
- Hono route 계약 공유
- 데스크톱에서 사용하는 typed client 기반 제공
- 서버와 클라이언트가 같은 shape를 보도록 계약 고정

## 현재 포함 내용

- Hono route factory
- 외부에서 사용할 수 있는 `AppType`
- 데스크톱 클라이언트를 위한 RPC client factory
- workspace/session 관련 DTO
- publish governance 상태 타입
- 상태 전이 테이블과 discriminated union 결과 타입

## 설계 원칙

- 앱 간 통신 형식은 이 패키지에서 먼저 정의합니다.
- desktop과 API가 각자 타입을 따로 정의하지 않도록 합니다.
- 비즈니스 규칙 자체보다는 계약과 DTO를 중심으로 유지합니다.
- 타입 정의만 읽어도 상태, 정책, 전이 조건이 이해되도록 작성합니다.

## Publish Governance

`src/publish-governance.ts`는 문서 발행 도메인의 타입 문서다.

- `DocumentStatusView`는 API가 계산한 authoritative policy snapshot이다.
- `PublishEligibility`는 즉시 발행 가능, rationale 필요, hard block을 구분한다.
- `publishFlowTransitionMap`은 publish UI가 따라야 하는 합법 상태 전이를 표현한다.
- `PublishAttemptResult`는 결과를 discriminated union으로 고정해 분기 처리를 명확하게 만든다.

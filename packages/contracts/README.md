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

## 설계 원칙

- 앱 간 통신 형식은 이 패키지에서 먼저 정의합니다.
- desktop과 API가 각자 타입을 따로 정의하지 않도록 합니다.
- 비즈니스 규칙 자체보다는 계약과 DTO를 중심으로 유지합니다.

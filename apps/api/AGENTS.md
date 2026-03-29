# API Rules

이 디렉터리는 authoritative server 계층입니다.

## Layering

- `src/application`은 use case와 port를 둡니다.
- `src/domain`은 순수 도메인 모델, projection, 상태 전이를 둡니다.
- `src/infrastructure`는 DB, 외부 API, typed client, framework adapter를 둡니다.
- `src/presentation`은 HTTP route, request parsing, response translation을 둡니다.
- `src/presentation`은 orchestration을 직접 소유하지 않고 `application`을 호출하는 얇은 계층으로 유지합니다.

## HTTP Surface

- canonical route는 RESTful resource naming을 우선합니다.
- 문서화되는 route는 canonical route를 기준으로 유지합니다.
- compatibility alias는 필요할 때만 추가하고, 새 client는 alias를 사용하지 않습니다.
- route registration은 공통 router helper를 사용해 일관된 체이닝 스타일로 유지합니다.

## Client And Contracts

- typed client public boundary는 `@harness-docs/api/client`로 유지합니다.
- desktop은 이 public boundary를 직접 참조할 수 있으므로, 공개 entrypoint의 안정성을 중요하게 다룹니다.
- `packages/contracts`는 shared DTO/schema/state transition만 소유합니다.
- Hono app assembly, handler wiring, middleware, OpenAPI/Scalar registration은 이 패키지에서 소유합니다.

## Modeling And Safety

- 정책 판단은 `application`과 `domain`에서 수행하고, `presentation`에서 새 정책을 만들지 않습니다.
- `any`는 피합니다.
- `unknown`은 transport parsing 같은 외부 입력 경계에서만 사용하고 즉시 좁힙니다.
- 응답 타입은 broad object보다 명시적 schema와 explicit field를 우선합니다.

# Contracts Rules

이 디렉터리는 앱 간 공유 계약의 source of truth 입니다.

## Ownership

- 공유 DTO, schema, 상태 전이, lifecycle 타입은 여기서 소유합니다.
- desktop과 api가 같은 의미로 이해해야 하는 타입은 먼저 여기서 모델링합니다.
- contract는 transport payload일 뿐 아니라 도메인 문서 역할도 해야 합니다.

## Modeling Style

- 타입만 읽어도 상태와 책임이 드러나도록 이름을 명시적으로 짓습니다.
- broad `unknown`, 느슨한 record, 의미 없는 string 집합보다 explicit field와 explicit union을 우선합니다.
- 상태 전이가 중요한 흐름은 가능한 전이 맵이나 discriminated union으로 표현합니다.
- lifecycle, eligibility, preflight, rationale처럼 정책 판단에 필요한 필드는 숨기지 않습니다.

## Boundaries

- Hono app assembly, route wiring, middleware 같은 runtime 코드는 두지 않습니다.
- OpenAPI schema를 위한 zod 모델은 둘 수 있지만, 서버 구현 세부사항은 두지 않습니다.
- `any`는 피합니다.
- `unknown`은 외부 JSON shape를 받아들이는 최소 지점에서만 허용하고 가능한 빨리 구체 타입으로 좁힙니다.

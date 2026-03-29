# Desktop Rules

이 디렉터리에서는 TanStack Query 경계를 명시적으로 유지합니다.

## Query Key Convention

- 모든 `queryKey`와 `mutationKey`는 `src/queries/queryKeys.ts`의 팩터리만 사용합니다.
- 리터럴 배열 키를 훅이나 컴포넌트 안에 직접 작성하지 않습니다.
- 키는 UI 화면 기준이 아니라 데이터 경계 기준으로 나눕니다.
- 우선순서는 `boundary -> resource -> action`입니다.
- 예시:
  `desktop/bootstrap`
  `rpc/health`
  `desktop/preferences/write`
  `desktop/publishing/execute`

## Query Usage

- 서버/비동기 상태는 TanStack Query로 다룹니다.
- `setQueryData`, `getQueryData`, `invalidateQueries`도 동일한 키 팩터리를 사용합니다.
- `useEffect`는 데이터 패칭 용도로 쓰지 않습니다.

## Type Boundaries

- 공유 타입은 `src/types/contracts.ts`에서 가져옵니다.
- desktop 로컬 UI 타입은 `src/types/domain-ui.ts`에서 가져옵니다.
- 공유 타입과 로컬 UI 타입을 다시 섞는 단일 barrel을 만들지 않습니다.
- API와 desktop이 같은 의미로 이해해야 하는 타입은 먼저 `packages/contracts`로 올립니다.

## API Consumption

- API 호출은 가능하면 `@harness-docs/api/client`의 typed client boundary를 기준으로 감쌉니다.
- typed client가 있는데 raw `fetch` 문자열 조합을 새로 만들지 않습니다.
- API가 authoritative policy view나 preflight view를 제공하면 desktop은 그 결과를 렌더링하고, 같은 정책을 조용히 다시 계산하지 않습니다.

## Page Resilience

- 리스트가 비어 있는 페이지는 다음 액션을 제공해야 합니다.
- 페이지 레벨 에러는 가능하면 재시도 가능한 error boundary를 둡니다.
- empty state는 단순 설명보다 사용자가 다음으로 할 수 있는 행동을 우선 보여줍니다.

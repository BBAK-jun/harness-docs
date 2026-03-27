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

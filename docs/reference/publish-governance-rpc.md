# Publish Governance RPC

_최종 업데이트: 2026-03-28_

## 목적

이 문서는 publish governance 관련 RPC 계약과 현재 연결 범위를 정리한다.

현재 기준에서 완료된 범위는 다음과 같다.

- `packages/contracts`에 publish governance 상태 타입 정의
- `apps/api`에 document publish preflight endpoint 추가
- `apps/desktop`에 publish preflight RPC 서비스 추가
- desktop UI route 연결은 별도 리팩터링 완료 후 진행 예정

## 핵심 원칙

- authoritative policy 판단은 `apps/api`가 수행한다.
- `desktop`은 policy를 직접 계산하지 않고, 가능한 한 API가 반환한 policy view를 사용한다.
- `api`와 `desktop`은 서로의 내부 타입을 직접 참조하지 않는다.
- projection 입력/출력 타입은 `packages/contracts`를 경유한다.

## 관련 소스

- `packages/contracts/src/publish-governance.ts`
- `packages/contracts/src/index.ts`
- `apps/api/src/domain/publishGovernanceProjection.ts`
- `apps/api/src/domain/publishGovernanceAdapter.ts`
- `apps/desktop/src/domain/publishing.ts`
- `apps/desktop/src/services/rpcPublishing.ts`
- `apps/desktop/src/services/mockDomainServices.ts`

## API Endpoint

### `GET /api/workspaces/:workspaceId/documents/:documentId/publish-preflight`

이 endpoint는 특정 문서의 publish preflight를 contracts 기준 shape로 반환한다.

성공 응답 envelope:

```ts
{
  ok: true,
  data: {
    preflight: PublishPreflightView
  },
  error: null,
  meta: ApiResponseMeta
}
```

## 반환 타입

핵심 반환 타입은 `PublishPreflightView`다.

```ts
interface PublishPreflightView {
  document: DocumentStatusView;
  currentState: PublishFlowState;
  allowedTransitions: PublishFlowTransition[];
}
```

이 타입은 아래 내용을 한 번에 포함한다.

- 현재 문서의 authoritative policy snapshot
- 현재 publish state machine 위치
- 여기서 허용되는 다음 전이 목록

## 상태 해석

### `DocumentStatusView`

이 타입은 API가 현재 시점에 계산한 publish 관점 문서 상태다.

포함 내용:

- 저장 상태
- freshness 상태
- stale 이유
- validation 결과
- metadata 결과
- publish eligibility
- active pull request

### `PublishEligibility`

publish 가능 상태는 세 가지로 고정한다.

- `allowed`
- `requires_rationale`
- `blocked`

의미:

- `allowed`
  즉시 publish 가능
- `requires_rationale`
  stale publish 허용, 단 rationale 필요
- `blocked`
  rationale만으로는 불가, 다른 blocking issue 해결 필요

### `PublishFlowState`

현재 contracts 상태 기계는 아래 상태를 사용한다.

- `idle`
- `ready_to_publish`
- `stale_requires_rationale`
- `blocked`
- `publishing`
- `published_pr_created`

## API 내부 처리 흐름

`apps/api` 내부에서는 아래 순서로 동작한다.

1. datasource가 `workspaceGraph`와 `documents`를 로드한다.
2. route가 `PublishGovernanceAdapter`를 호출한다.
3. adapter가 로컬 aggregate shape를 `PublishGovernanceDocumentSnapshot`으로 변환한다.
4. `publishGovernanceProjection.ts`가 snapshot을 `PublishPreflightView`로 투영한다.
5. route가 standard API envelope로 감싸 반환한다.

즉, route 자체는 publish 규칙을 직접 계산하지 않는다.

## Desktop 연결 범위

현재 `apps/desktop`은 서비스 계층까지만 연결되어 있다.

### 추가된 서비스 계약

`PublishingService`:

```ts
getDocumentPublishPreflight(
  workspaceId: string,
  documentId: string
): Promise<PublishPreflightView | null>
```

### RPC 서비스

`apps/desktop/src/services/rpcPublishing.ts`

- API endpoint를 fetch로 호출
- 성공 시 `PublishPreflightView` 반환
- 실패 시 fallback service 호출

### fallback 동작

`apps/desktop/src/services/mockDomainServices.ts`

- 기존 local graph에서 `toPublishPreflightView(...)`를 계산
- UI 리팩터링 중에도 contracts 기반 preflight를 테스트 가능

## 현재 상태

완료:

- contracts 타입
- API endpoint
- API adapter/projection
- desktop service 경계
- mock fallback

미완료:

- file-based route에서 실제 preflight query 사용
- publish 화면이 `PublishPreflightView`를 직접 렌더하도록 전환
- 기존 local publish UI와 contracts view의 중복 제거

## 도메인 개발 중 아직 부족한 점

이 문서는 RPC 연결 상태를 다루지만, 현재 구현을 진행하면서 드러난 도메인 공백도 함께 남긴다.

### 1. projection이 aggregate truth를 완전히 대체하지는 않음

- 현재 `PublishPreflightView`는 contracts 중심 read model이다.
- 하지만 aggregate 내부의 모든 세부 판단 근거가 contracts 수준으로 아직 완전히 승격된 것은 아니다.
- 특히 document aggregate의 `invalidations`와 contracts의 `staleReasons`는 개념상 연결되지만 모델이 완전히 동일하지 않다.

### 2. snapshot adapter가 로컬 shape에 의존함

- `api`는 더 이상 `desktop` 타입을 import하지 않지만,
- `publishGovernanceAdapter.ts`는 datasource가 만들어내는 현재 graph shape를 로컬 `ApiDocumentLike`로 가정하고 있다.
- 장기적으로는 datasource 출력도 더 명시적인 API 내부 snapshot 타입으로 정리할 필요가 있다.

### 3. preflight는 read path만 연결됨

- 현재 연결된 것은 `publish-preflight` read endpoint다.
- `publish attempt`, `rationale submit`, `sync completed` 같은 상태 전이 command는 아직 contracts state machine과 직접 결합되어 있지 않다.

### 4. desktop은 아직 화면에서 contracts view를 직접 소비하지 않음

- 서비스 계층은 연결됐지만,
- publish route는 아직 `PublishPreflightView`를 실제 화면 state의 source of truth로 쓰지 않는다.
- 즉 read model은 준비됐지만 UI state ownership 이전은 아직 끝나지 않았다.

### 5. invalidate/refetch 규칙이 아직 없다

- publish execute 이후
- rationale 입력 이후
- sync 이후

어떤 query를 invalidate하고 어떤 state machine을 다시 계산할지 아직 문서화되지 않았다.

### 6. preflight와 execute 사이의 원자성 보장이 없다

- 현재는 preflight를 읽고 그 다음 publish를 실행하는 구조다.
- 실제 운영에서는 그 사이에 문서, approval, invalidation 상태가 바뀔 수 있다.
- 따라서 execute 시점 재검증 또는 optimistic concurrency 규칙이 필요하다.

### 7. rationale 저장과 재사용 규칙이 미완성이다

- rationale이 `PublishRecord`에 남는다는 것은 정리됐지만,
- 문서 단위인지 batch 단위인지,
- 같은 stale 이유에 대해 재사용 가능한지,
- superseded entry와 current entry 전환 규칙이 무엇인지

는 아직 더 명확히 닫아야 한다.

## 권장 다음 단계

desktop route 리팩터링이 끝난 뒤 아래 순서로 붙이는 것이 가장 안전하다.

1. publish route loader 또는 `useQuery`에서 `getDocumentPublishPreflight` 호출
2. route 컴포넌트가 `PublishPreflightView`만 읽도록 정리
3. 기존 로컬 preflight 계산 UI를 점진 제거
4. publish execute 직전 invalidate/refetch 연결

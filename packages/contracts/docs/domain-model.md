# 도메인 모델

## 한 줄 설명

Harness Docs는 문서 편집기가 아니라 앱이 소유하는 문서 거버넌스 시스템입니다.

## 핵심 객체

### Workspace

- 팀 공간
- 하나의 GitHub 문서 저장소와 연결
- 멤버십과 approver candidate 관리

### Document

- 역할별 1급 문서
- PRD
- UX Flow
- Technical Spec
- Policy / Decision

문서는 Markdown 본문, 링크, 리뷰 상태, stale 상태, publish 이력을 가집니다.

### Template

- 문서 생성의 기본 구조
- 팀이 수정 가능
- 일반 문서와 같은 흐름으로 publish 가능

### Approval

- 앱 내부 권한으로 관리되는 승인 상태
- GitHub PR approval만으로 current 상태가 복구되지는 않음

### Publish Record

- stale rationale
- unresolved approvals
- invalidation snapshot
- branch / commit / pull request 결과

## 비즈니스 규칙

- stale/current는 publish 시점에 계산합니다.
- stale publish는 허용되지만 rationale이 필요합니다.
- rationale과 stale reason snapshot은 publish record에 함께 남깁니다.
- unresolved approval은 publish record에 남겨야 합니다.
- downstream 문서를 current로 복구하려면 lead-level 승인이 필요합니다.
- GitHub는 결과물을 받는 출판 채널이지, 문서 상태의 권위가 아닙니다.

## 아직 부족한 점

현재 도메인 개발 관점에서 아래 공백이 남아 있습니다.

### stale 모델의 정밀도

- 지금 contracts와 projection에는 `7일 경과`와 `원본 최신 변경 미반영`이 표현되지만, API aggregate 내부에서는 invalidation 중심 모델과 시간 기준 stale 모델이 완전히 합쳐지지 않았습니다.
- 즉, domain language 상의 `stale`과 구현 내부의 `invalidated/current`가 아직 1:1로 정렬되어 있지 않습니다.

### freshness 회복 절차의 aggregate화 부족

- `최신 원본 재반영`
- `재검증`
- `메타데이터 갱신`

이 세 단계가 정책 문서에는 있지만, 현재는 하나의 명시적 aggregate workflow나 상태 전이로 완전히 모델링되어 있지 않습니다.

### rationale의 도메인 규칙 부족

- rationale이 필요한 조건은 정의되어 있지만,
- rationale의 최소 길이, 구조, 승인 필요 여부, supersede 규칙, 재사용 가능 범위는 아직 도메인 규칙으로 충분히 닫히지 않았습니다.

### publish eligibility의 경계 불명확성

- `requires_rationale`
- `blocked`

의 구분은 contracts에 있지만, 어떤 종류의 issue가 어느 상태를 만드는지는 아직 전면적인 정책 매트릭스로 문서화되지 않았습니다.

### approval와 publish의 결합 규칙 부족

- unresolved approval을 publish record에 남긴다는 규칙은 있으나,
- 어떤 approval 상태가 warning이고 어떤 상태가 hard block인지,
- 어떤 경우에 lead restoration이 publish 가능 상태를 회복하는지

가 aggregate 규칙으로 더 선명하게 정리될 필요가 있습니다.

### publish record의 생명주기 정의 부족

- 현재 `draft`
- `ready_for_publish`
- `publishing`
- `published`

상태는 존재하지만, 취소, 재시도, superseded, rollback 같은 후속 상태가 아직 없습니다.

### bounded context 이름 정리 부족

- 현재 코드에는 `document`, `approval`, `publish governance`, `publish draft`, `prePublication` 개념이 섞여 있습니다.
- 장기적으로는 어떤 타입이 document aggregate 소속인지, 어떤 타입이 publish aggregate 소속인지 이름만 보고도 분리되도록 정리할 필요가 있습니다.

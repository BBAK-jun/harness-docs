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
- unresolved approval은 publish record에 남겨야 합니다.
- downstream 문서를 current로 복구하려면 lead-level 승인이 필요합니다.
- GitHub는 결과물을 받는 출판 채널이지, 문서 상태의 권위가 아닙니다.

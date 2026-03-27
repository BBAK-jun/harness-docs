# 아키텍처

## 전체 구조

Harness Docs는 모노레포 기반으로 구성되며, 데스크톱 클라이언트와 API를 분리합니다.

```text
apps/
  api/
  desktop/

packages/
  contracts/
  db/

docs/
  vitepress site
  product specs
```

## 책임 분리

### `apps/desktop`

사용자 경험을 담당합니다.

- 문서 라이브러리
- Markdown 편집과 미리보기
- 댓글, 멘션, 승인 화면
- publish flow UI
- AI task entry point

### `apps/api`

정책 판단과 authoritative state를 담당합니다.

- 앱 세션
- 워크스페이스 멤버십
- 승인 권한
- stale/current 판정
- publish preflight
- publish record
- GitHub branch/commit/PR orchestration

### `packages/contracts`

desktop과 API가 공유하는 타입과 계약을 제공합니다.

### `packages/db`

DB 연결, 스키마, 마이그레이션을 담당합니다.

## 핵심 원칙

- 정책 판단은 API에 둡니다.
- 표현과 인터랙션은 desktop에 둡니다.
- wire contract는 contracts에 둡니다.
- DB 세부 구현은 db 패키지로 모읍니다.

## publish 경계

desktop이 해야 하는 일:

- 사용자 입력 수집
- preflight 결과 표시
- rationale 입력 UI 제공

API가 해야 하는 일:

- stale/current 계산
- unresolved approval snapshot 생성
- publish 가능 여부 판정
- stale publish 시 rationale 요구 여부 판정
- publish record 저장
- GitHub 자동화 실행

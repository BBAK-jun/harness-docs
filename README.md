# Harness Docs

Harness Docs는 작은 cross-functional product team을 위한 제품 문서 워크스페이스입니다.

PM, 디자인, 엔지니어링이 요구사항, 사용자 흐름, 기술 설계, 정책 문서를 따로 관리하더라도 하나의 워크스페이스 안에서 연결된 운영 흐름으로 다룰 수 있게 만드는 제품을 목표로 합니다. GitHub는 최종 publish 채널로 사용하고, 문서 상태, 검토 맥락, stale 판단, publish 준비 상태는 앱이 관리합니다.

## 공개 문서

- 제품 문서 사이트: [https://bbak-jun.github.io/harness-docs/](https://bbak-jun.github.io/harness-docs/)

## 우리가 만드는 경험

- 역할별 문서를 같은 워크스페이스에서 작성하고 연결합니다.
- 어떤 문서가 최신이고 어떤 문서가 다시 확인이 필요한지 앱에서 드러냅니다.
- 댓글, 멘션, 승인, stale 상태, publish preflight를 한 흐름으로 관리합니다.
- AI는 초안 작성과 구조 제안을 돕고, 최종 판단과 배포 결정은 사람이 유지합니다.
- GitHub branch, commit, pull request 생성은 publish orchestration의 일부로 다룹니다.

## 다루는 문서

- PRD
- UX Flow
- Technical Spec
- Policy / Decision

## 핵심 원칙

- 문서 상태의 source of truth는 앱입니다.
- GitHub는 정책 판단 주체가 아니라 publish 채널입니다.
- stale 상태는 숨기지 않고 드러내되, 팀이 맥락을 남기고 판단할 수 있게 합니다.
- 문서 작성 경험과 정책 판단을 분리합니다.
- cross-functional team이 같은 흐름 안에서 협업할 수 있어야 합니다.

## 저장소 구조

```text
apps/
  api/        authoritative policy, approval, stale 판단, publish orchestration
  desktop/    document workspace UX, editing, review, local interactions

packages/
  contracts/  app 간 공유 schema와 typed contract
  db/         PostgreSQL schema, client, migration support

docs/         공개 제품 문서
```

## 워크스페이스 안내

- 데스크톱 클라이언트: [apps/desktop/README.md](apps/desktop/README.md)
- API 서버: [apps/api/README.md](apps/api/README.md)
- 공유 계약: [packages/contracts/README.md](packages/contracts/README.md)
- DB 패키지: [packages/db/README.md](packages/db/README.md)

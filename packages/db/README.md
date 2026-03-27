# DB Workspace

`packages/db`는 Harness Docs의 데이터베이스 패키지입니다.

이 패키지는 PostgreSQL 연결, 스키마 정의, 마이그레이션, DB 계층 타입 안전성을 담당합니다.

## 역할

- 데이터베이스 연결 설정
- Drizzle 스키마 정의
- 마이그레이션 생성 및 적용
- API에서 사용할 영속 계층 기반 제공

## 주요 파일

- `src/config.ts`: DB 설정
- `src/client.ts`: DB 클라이언트 생성
- `src/schema.ts`: 테이블 및 스키마 정의
- `src/index.ts`: 외부 공개 진입점

## 실행

저장소 루트에서 로컬 DB 실행:

```bash
pnpm db:up
```

스키마 생성:

```bash
pnpm db:generate
```

마이그레이션 적용:

```bash
pnpm db:migrate
```

타입 체크:

```bash
pnpm check:db
```

## 환경 변수

기본적으로 아래 값들을 사용합니다.

```env
DATABASE_URL=postgresql://harness_docs:harness_docs@127.0.0.1:5432/harness_docs
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=harness_docs
PGPASSWORD=harness_docs
PGDATABASE=harness_docs
```

## 설계 원칙

- 스키마와 연결 설정은 이 패키지로 모읍니다.
- API가 DB 세부 구현에 직접 흩어져 의존하지 않도록 합니다.
- 마이그레이션과 타입 체크가 항상 같은 소스에서 나오도록 유지합니다.

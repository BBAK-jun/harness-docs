# DB Workspace

`packages/db`는 Harness Docs의 PostgreSQL 영속 계층 패키지입니다.

이 워크스페이스는 서버 측에서 사용하는 DB 연결, Drizzle 스키마, 마이그레이션, 타입 안전한 진입점을 한곳에 모읍니다. API는 이 패키지를 통해 영속 계층을 사용하고, desktop은 직접 의존하지 않는 것을 전제로 합니다.

## 소유 책임

- 데이터베이스 연결 설정
- Drizzle 스키마 정의
- 마이그레이션 생성과 적용
- API가 사용하는 DB client와 공개 entrypoint 제공

## 주요 파일

- `src/config.ts`: DB 설정
- `src/client.ts`: DB 클라이언트 생성
- `src/schema.ts`: 테이블, enum, relation 스키마
- `src/index.ts`: 외부 공개 진입점
- `migrations/`: 생성된 마이그레이션 산출물

## 로컬 실행

저장소 루트에서 실행합니다.

```bash
pnpm db:up
pnpm db:migrate
```

자주 쓰는 명령:

```bash
pnpm db:generate
pnpm db:test:up
pnpm db:test:prepare
pnpm db:test:down
pnpm db:studio
pnpm check:db
```

Drizzle Studio 기본 주소:

- `http://127.0.0.1:4983`

## 환경 변수

기본적으로 아래 값을 사용합니다.

```env
DATABASE_URL=postgresql://harness_docs:harness_docs@127.0.0.1:5432/harness_docs
TEST_DATABASE_URL=postgresql://harness_docs:harness_docs@127.0.0.1:5433/harness_docs_test
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=harness_docs
PGPASSWORD=harness_docs
PGDATABASE=harness_docs
```

- `TEST_DATABASE_URL`는 필수입니다. dev DB fallback은 허용하지 않습니다.
- `TEST_DATABASE_URL`는 `DATABASE_URL`와 같을 수 없습니다.
- `pnpm db:test:up`은 `db-test` 전용 Postgres container를 띄웁니다.
- `pnpm db:test:prepare`는 `db-test`에 연결해 test DB를 준비하고 마이그레이션을 적용합니다.

## 변경 원칙

- 스키마와 연결 설정은 이 패키지로 모읍니다.
- API 코드에 DB 세부 구현이 흩어지지 않도록 합니다.
- 생성된 마이그레이션은 생성 규칙으로 관리하고 수동 편집을 피합니다.
- 마이그레이션과 타입 체크가 항상 같은 스키마 소스를 기준으로 나오게 유지합니다.

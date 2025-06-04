# DalovaNote Backend API

음성 녹음 및 전사 애플리케이션의 백엔드 API 서버입니다.

## 기술 스택

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **Authentication**: JWT
- **File Upload**: Multer

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 다음 내용을 설정하세요:

```env
PORT=5000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=dalova_note

# JWT Secret
JWT_SECRET=your-secret-key-here

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=50000000
```

### 3. MySQL 데이터베이스 설정
MySQL에 접속하여 다음 스키마를 실행하세요:

```bash
mysql -u root -p < config/schema.sql
```

또는 MySQL 클라이언트에서 `config/schema.sql` 파일의 내용을 실행하세요.

### 4. 서버 실행

#### 개발 모드 (nodemon)
```bash
npm run dev
```

#### 프로덕션 모드
```bash
npm start
```

## API 엔드포인트

### 인증 (Authentication)
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인

### 폴더 관리 (Folders) - 구현 예정
- `GET /api/folders` - 폴더 목록 조회
- `POST /api/folders` - 폴더 생성
- `PUT /api/folders/:id` - 폴더 수정
- `DELETE /api/folders/:id` - 폴더 삭제

### 녹음 관리 (Recordings) - 구현 예정
- `GET /api/recordings` - 녹음 목록 조회
- `POST /api/recordings` - 녹음 생성
- `PUT /api/recordings/:id` - 녹음 수정
- `DELETE /api/recordings/:id` - 녹음 삭제
- `POST /api/recordings/:id/upload` - 오디오 파일 업로드

## 데이터베이스 스키마

### Users
- `id`: Primary Key
- `username`: 사용자명 (unique)
- `email`: 이메일 (unique)
- `password_hash`: 암호화된 비밀번호
- `created_at`, `updated_at`: 타임스탬프

### Folders
- `id`: Primary Key
- `user_id`: 사용자 ID (Foreign Key)
- `name`: 폴더명
- `is_default`: 기본 폴더 여부
- `created_at`, `updated_at`: 타임스탬프

### Recordings
- `id`: Primary Key
- `user_id`: 사용자 ID (Foreign Key)
- `name`: 녹음명
- `transcript`: 전사 텍스트
- `audio_file_path`: 오디오 파일 경로
- `duration`: 재생 시간 (밀리초)
- `chunks`: 청크 데이터 (JSON)
- `created_at`, `updated_at`: 타임스탬프

### Recording_Folders
- `id`: Primary Key
- `recording_id`: 녹음 ID (Foreign Key)
- `folder_id`: 폴더 ID (Foreign Key)
- `created_at`: 타임스탬프

## 개발 진행 상황

- [x] 기본 서버 설정
- [x] 데이터베이스 연결
- [x] 사용자 인증 (회원가입/로그인)
- [ ] 폴더 관리 API
- [ ] 녹음 관리 API
- [ ] 파일 업로드 API
- [ ] 프론트엔드 연동

## 다음 작업

1. MySQL 데이터베이스 생성 및 테이블 설정
2. 폴더 관리 API 구현
3. 녹음 관리 API 구현
4. 파일 업로드 기능 구현
5. 프론트엔드와 API 연동 
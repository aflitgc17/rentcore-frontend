# RentCore Frontend

RentCore Frontend는 선문대학교 영화영상학과를 위한 기자재 및 시설 대여/예약 서비스의 프론트엔드 애플리케이션입니다.  
학생과 교수는 장비를 검색하고 대여를 신청하거나 편집실 및 녹음실 사용을 예약할 수 있으며, 관리자는 장비 데이터와 승인 요청, 운영 캘린더를 웹에서 관리할 수 있습니다.

이 저장소는 사용자용 키오스크/포털 성격의 화면과 관리자용 운영 화면을 함께 포함하고 있으며, Next.js App Router 기반으로 작성되어 있습니다. 프론트엔드는 별도의 백엔드 API 서버와 연동되는 구조를 전제로 하며, 인증이 필요한 요청은 쿠키 기반 세션 방식(`credentials: "include"`)으로 처리합니다.

## Table of Contents

- [Overview](#overview)
- [Who This Project Is For](#who-this-project-is-for)
- [Core User Flows](#core-user-flows)
- [Key Features](#key-features)
- [Business Rules Reflected in the UI](#business-rules-reflected-in-the-ui)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Routes and Screens](#routes-and-screens)
- [State and Interaction Patterns](#state-and-interaction-patterns)
- [API Integration](#api-integration)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Development Notes](#development-notes)
- [Recommended Verification Checklist](#recommended-verification-checklist)
- [License](#license)

## Overview

이 애플리케이션은 학과 단위의 기자재 대여 및 시설 예약 운영을 웹 환경에서 처리하기 위해 만들어졌습니다.  
코드 기준으로 확인되는 핵심 목적은 다음과 같습니다.

- 일반 사용자가 대여 가능한 장비를 쉽게 탐색하고 신청할 수 있도록 지원
- 편집실과 녹음실 같은 공용 시설 예약을 시간대 단위로 관리
- 관리자가 승인 대기 요청을 빠르게 처리하고 운영 현황을 캘린더 중심으로 파악
- 신청 이력, 승인 상태, 반려 사유, 출력 문서를 사용자에게 명확히 제공

루트 경로(`/`)는 별도의 마케팅용 랜딩 페이지 없이 `/dashboard` 로 리다이렉트됩니다. 실제 사용 흐름은 로그인 이후 역할 기반으로 나뉘며, `ADMIN` 사용자는 관리자 화면으로, 일반 사용자는 사용자 대시보드로 이동합니다.

## Who This Project Is For

이 프로젝트는 다음과 같은 사용자를 대상으로 합니다.

- 학과 학생: 장비 대여 신청, 시설 예약, 개인 신청 내역 확인
- 교수: 학생과 유사한 방식으로 계정 생성 및 예약/대여 이용
- 학과 관리자: 장비 등록/수정, 승인/반려 처리, 전체 일정 관리
- 개발자 및 운영자: 백엔드 API 와 연동하여 학과 운영 시스템을 유지보수하는 담당자

## Core User Flows

### 1. 일반 사용자 흐름

1. 회원가입 또는 로그인
2. `/dashboard/equipment` 에서 장비 검색 및 상세 확인
3. 원하는 장비를 장바구니에 추가
4. `/dashboard/cart` 에서 대여 기간과 시간, 교과목명, 사용 목적 입력
5. 충돌 여부 확인 후 대여 요청 제출
6. `/dashboard/requests` 에서 승인 상태, 반려 사유, 신청서 출력 확인

### 2. 시설 예약 흐름

1. `/dashboard/reservations` 에서 시설 선택
2. 날짜, 시작/종료 시간, 팀원 정보 입력
3. 시간대 충돌 여부 확인
4. 예약 제출
5. `/dashboard/requests` 또는 `/dashboard/status` 에서 예약 현황 확인

### 3. 관리자 운영 흐름

1. `/admin` 에서 승인 대기 현황 확인
2. `/admin/requests` 에서 장비 / 시설 요청을 승인 또는 반려
3. `/admin/equipment` 에서 장비 데이터 유지보수
4. `/admin/calendar`, `/admin/facility/calendar` 에서 전체 운영 일정 확인 및 수동 조정

## Key Features

### 사용자 기능

- 선문대학교 이메일 기반 회원가입 및 로그인
- 장비 목록 조회, 검색, 카테고리 필터링
- 장비 상세 정보 및 예약 일정 확인
- 로컬 스토리지 기반 장바구니 기능
- 장비 대여 기간 선택 및 충돌 검사
- 편집실 / 녹음실 예약 신청
- 나의 대출 및 시설 예약 현황 조회
- 신청서 PDF 다운로드
- 읽지 않은 알림 개수 확인

### 관리자 기능

- 관리자 전용 회원가입
- 장비 등록, 수정, 삭제
- 엑셀 파일을 통한 장비 일괄 등록
- 장비 대여 요청 및 시설 예약 요청 승인 / 반려
- 승인 대기 건수 표시
- 장비 대여 캘린더 관리
- 시설 예약 캘린더 관리
- 수동 예약 생성 및 일정 수정

## Business Rules Reflected in the UI

### 회원가입 규칙

- 일반 사용자는 `@sunmoon.ac.kr` 이메일만 사용할 수 있습니다.
- 이메일 아이디 부분에는 영문과 숫자가 모두 포함되어야 합니다.
- 비밀번호는 최소 8자이며 영문과 숫자를 함께 포함해야 합니다.
- 학생과 교수는 학번 자리수 규칙이 다릅니다.
- 전화번호는 `010` 으로 시작하는 11자리 숫자 형식을 사용합니다.

### 장비 대여 규칙

- 장비는 장바구니에 담아 대여 요청하는 흐름으로 구성됩니다.
- 장바구니는 `localStorage` 에 저장됩니다.
- 대여 시작일과 반납일은 유효성 검사를 거칩니다.
- 일요일은 시작일/반납일로 제한됩니다.
- 시작일 요일에 따라 최대 대여 가능 종료일이 계산됩니다.
- 장비 요청 전 충돌 검사 API 를 호출하여 이미 예약된 장비를 확인합니다.
- 교과목명과 사용 목적은 필수 입력입니다.

### 시설 예약 규칙

- 편집실과 녹음실 예약은 시간 단위로 관리됩니다.
- 예약 전 동일 시간대 충돌 여부를 확인합니다.
- 팀원 정보를 함께 입력할 수 있습니다.
- 시설별 사용 수칙이 예약 화면에서 안내됩니다.

### 관리자 처리 규칙

- 관리자 사이드바에는 승인 대기 건수가 배지로 표시됩니다.
- 요청은 장비 / 시설 유형으로 나누어 필터링할 수 있습니다.
- 요청 상태는 승인 대기, 승인 완료, 거절됨으로 관리됩니다.
- 반려 시 사유를 입력하는 흐름이 포함되어 있습니다.

## Architecture

이 프로젝트는 프론트엔드 단독 시스템이 아니라, 외부 API 서버와 결합된 클라이언트 애플리케이션입니다.

### 렌더링 구조

- Next.js App Router 사용
- `src/app` 하위 폴더 기반 라우팅
- 대부분의 주요 화면은 `"use client"` 로 선언된 클라이언트 컴포넌트
- UI 상태와 폼 상호작용이 많은 운영형 화면 중심 구성

### 권한 구조

- `/auth/me` 또는 관리자 전용 레이아웃 API 를 통해 현재 사용자 역할을 확인
- 일반 사용자 영역과 관리자 영역은 별도 레이아웃 사용
- 로그인되지 않은 경우 `/login` 으로 이동
- 관리자 권한이 없는 사용자가 관리자 영역에 접근하면 사용자 대시보드로 되돌림

### 레이아웃 구조

- `src/app/dashboard/layout.tsx`: 일반 사용자용 사이드바 레이아웃
- `src/app/admin/layout.tsx` + `AdminLayoutInner.tsx`: 관리자용 사이드바 및 승인 대기 상태 관리
- 루트 레이아웃에서 전역 토스트 프로바이더를 연결

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- Radix UI
- React Hook Form
- Zod
- FullCalendar
- date-fns
- XLSX

## Project Structure

```text
src/
  app/
    login/                   로그인
    signup/                  일반 사용자 회원가입
    signup/admin/            관리자 회원가입
    dashboard/               일반 사용자 영역
      equipment/             장비 목록 및 상세
      cart/                  장비 대여 신청
      reservations/          시설 예약
      requests/              나의 대출 / 예약 현황
      status/                시설 예약 현황
    admin/                   관리자 영역
      equipment/             장비 관리
      requests/              요청 승인 / 반려
      calendar/              장비 대여 캘린더
      facility/calendar/     시설 예약 캘린더
  components/                공통 UI 및 레이아웃 컴포넌트
  contexts/                  전역 상태 컨텍스트
  hooks/                     커스텀 훅
  lib/                       인증 및 공통 유틸
  utils/                     업로드 등 보조 유틸리티
public/
  rentcore.png               서비스 관련 정적 이미지
```

## Routes and Screens

### Authentication

#### `/`

- 별도 랜딩 페이지 없이 `/dashboard` 로 리다이렉트

#### `/login`

- 이메일 / 비밀번호 로그인
- 성공 시 역할 기반 이동
  - `ADMIN` -> `/admin`
  - `USER` -> `/dashboard`
- 실패 시 토스트로 오류 표시

#### `/signup`

일반 사용자 회원가입 화면입니다.

- 이름, 이메일, 비밀번호, 학년, 학번, 학과, 생년월일, 전화번호 입력
- React Hook Form + Zod 기반 검증
- 성공 시 로그인 페이지로 이동

#### `/signup/admin`

관리자 계정 생성 화면입니다.

- 별도 인증 코드 입력
- 일반 사용자 회원가입과 분리된 플로우
- 생성 후 관리자 로그인 화면으로 이동

### User Dashboard

#### `/dashboard`

일반 사용자 메인 허브 화면입니다.

- 장비 목록
- 시설 예약
- 시설 예약 현황
- 나의 대출/예약 현황

사이드바에서 알림 개수와 관리자 진입 링크(관리자 사용자일 경우)를 함께 제공합니다.

#### `/dashboard/equipment`

장비 탐색 화면입니다.

- 전체 장비 목록 조회
- 장비명 / 관리번호 검색
- 카테고리별 필터링
- 장비 상세 정보 모달
- 장비별 예약 일정 캘린더 조회
- 장바구니 추가

코드상 장비 상태는 `available`, `rented`, `damaged`, `reserved` 로 매핑되어 표시됩니다.

#### `/dashboard/cart`

장비 대여 요청 생성 화면입니다.

- 장바구니 아이템 조회
- 대여 날짜 및 시간 입력
- 유효성 검사 및 대여 가능 기간 제어
- 충돌 장비 확인
- 교과목명 / 사용 목적 입력
- 요청 제출 후 상태 반영

이 화면은 실제로 가장 업무 로직이 많이 들어간 페이지 중 하나입니다.

#### `/dashboard/reservations`

시설 예약 화면입니다.

- 편집실 / 녹음실 예약
- 날짜 및 시간대 선택
- 충돌 조회
- 팀원 추가/삭제
- 시설별 사용 규칙 안내

시설 예약은 시간 범위와 중복 여부가 중요하기 때문에, 입력 중에도 예약 가능 여부를 다시 계산하는 흐름이 포함되어 있습니다.

#### `/dashboard/requests`

개인 신청 내역 화면입니다.

- 장비 대여 요청 상태 조회
- 시설 예약 상태 조회
- 승인 / 반려 / 대출 중 / 반납 완료 등 상태 표시
- 반려 사유 확인
- 장비 신청서 PDF 다운로드
- 시설 신청서 PDF 다운로드
- 진입 시 알림 읽음 처리

#### `/dashboard/status`

시설 예약 공개 현황 화면입니다.

- FullCalendar 기반 월간 캘린더
- 승인된 예약만 표시
- 날짜별 예약 건수 표시
- 특정 날짜 클릭 시 해당 날짜의 예약 목록 모달 표시
- 사용자 이름은 마스킹 처리된 형태로 보여줄 수 있도록 설계

### Admin Dashboard

#### `/admin`

관리자 메인 대시보드입니다.

- 장비 관리
- 요청 관리
- 장비 대여 캘린더
- 시설 예약 캘린더

관리자 운영에 필요한 대표 화면으로 진입시키는 시작점 역할을 합니다.

#### `/admin/equipment`

장비 마스터 데이터 관리 화면입니다.

- 장비 목록 조회
- 검색 및 카테고리 필터
- 장비 추가 / 수정 / 삭제
- 장비 상세 정보 모달
- 장비별 예약 일정 캘린더 확인
- 엑셀 업로드를 통한 일괄 등록

관리번호는 자연 정렬에 가깝게 비교하는 로직이 포함되어 있습니다.

#### `/admin/requests`

요청 승인/반려 처리 화면입니다.

- 요청 상태별 탭
- 장비 / 시설 유형 필터
- 승인 처리
- 반려 처리 및 사유 입력
- 처리 후 승인 대기 건수 감소

#### `/admin/calendar`

장비 예약 운영용 관리자 캘린더입니다.

- 예약 일정 시각화
- 충돌 검사
- 수동 예약 생성
- 기존 예약 수정 / 삭제

#### `/admin/facility/calendar`

시설 예약 운영용 관리자 캘린더입니다.

- 시설 예약 일정 조회
- 수동 예약 생성
- 기존 예약 수정 / 삭제
- 사용자 및 시설 목록을 함께 조회하여 운영 관리

## State and Interaction Patterns

프로젝트 전반에서 반복적으로 보이는 상태 관리 패턴은 다음과 같습니다.

### 로컬 UI 상태

- 대부분의 화면은 `useState`, `useEffect`, `useMemo` 로 구성
- 폼 화면은 React Hook Form 사용
- 모달, 탭, 필터, 선택값은 컴포넌트 로컬 상태로 관리

### 전역 상태

- 관리자 승인 대기 건수는 `PendingRequestContext` 로 공유
- 전역 토스트 프로바이더를 통해 성공/실패 메시지 표시

### 사용자 정보 조회

- 일반적인 사용자 정보 확인은 `/auth/me` 호출 기반
- `useCurrentUser` 훅을 통해 현재 로그인 사용자 조회 가능
- 관리자 영역은 별도 `admin/layout-data` 응답으로 사용자 정보와 대기 건수를 함께 로드

### 알림 처리

- 사용자 대시보드 레이아웃에서 읽지 않은 알림 개수를 주기적으로 폴링
- 내 신청 현황 페이지 진입 시 알림 읽음 처리 요청 전송
- `notificationsUpdated` 커스텀 이벤트를 통해 즉시 동기화

## API Integration

이 프로젝트는 프론트엔드 단독 애플리케이션이 아니라, 별도의 백엔드 서버와 함께 동작하는 클라이언트입니다.

주요 요청 방식은 다음과 같습니다.

- `fetch(`${NEXT_PUBLIC_API_URL}/...`)`
- 인증이 필요한 경우 `credentials: "include"` 사용
- 승인/반려/읽음 처리 등은 `PATCH` 메서드 사용
- 등록/생성 요청은 `POST`, 수정은 `PUT`, 삭제는 `DELETE` 사용

코드 기준으로 확인되는 주요 API 경로는 아래와 같습니다.

### 인증 및 사용자

- `auth/login`
- `auth/logout`
- `auth/me`
- `auth/register`
- `admin/signup`
- `my/profile`
- `users`

### 장비 및 장비 대여

- `equipments`
- `equipments/:id`
- `equipments/:id/reservations`
- `equipments/bulk`
- `rental-requests`
- `rental-requests/conflicts`
- `rental-requests/:id/approve`
- `rental-requests/:id/reject`
- `reservations`
- `reservations/manual`
- `reservations/conflicts`
- `reservations/:id/print`

### 시설 예약

- `facility-reservations`
- `facility-reservations/conflicts`
- `facility-reservations/:id/approve`
- `facility-reservations/:id/reject`
- `facility-reservations/:id/print`
- `facility-reservations/manual`
- `facilities`

### 관리자 운영 및 알림

- `admin/layout-data`
- `admin/requests`
- `notifications/unread-count`
- `my/notifications/read`
- `my/status`

따라서 개발 및 테스트를 위해서는 이 프론트엔드와 호환되는 백엔드 API 서버가 먼저 준비되어 있어야 합니다.

## Environment Variables

프로젝트 실행을 위해 최소한 아래 환경 변수가 필요합니다.

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 참고 사항

- `NEXT_PUBLIC_API_URL` 은 브라우저에서 직접 참조되는 공개 환경 변수입니다.
- 현재 코드에는 `src/lib/auth.ts` 에서 `JWT_SECRET` 을 참조하는 유틸이 존재하지만, 주요 사용자 흐름은 백엔드 API 인증을 중심으로 동작합니다.
- `src/utils/cloudinaryUpload.ts` 는 예시 성격의 업로드 유틸이며, 실제 운영에 사용하려면 Cloudinary 설정값을 프로젝트 환경에 맞게 교체해야 합니다.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a local environment file

```bash
cp .env.local.example .env.local
```

필요한 값으로 `.env.local` 을 수정합니다.

예시:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Start the backend server

이 프론트엔드는 백엔드 API 와 연동되어야 실제 기능이 동작합니다.  
로그인, 장비 조회, 예약, 승인 처리 등을 테스트하려면 백엔드 서버를 먼저 실행해 두어야 합니다.

### 4. Start the development server

```bash
npm run dev
```

브라우저에서 아래 주소를 열어 확인할 수 있습니다.

```text
http://localhost:3000
```

## Available Scripts

```bash
npm run dev     # 개발 서버 실행
npm run build   # 프로덕션 빌드
npm run start   # 빌드 결과 실행
npm run lint    # ESLint 실행
```

## Development Notes

개발 시 참고하면 좋은 코드베이스 특성입니다.

- 사용자 영역과 관리자 영역은 별도의 레이아웃과 사이드바를 사용합니다.
- 주요 화면 대부분이 클라이언트 컴포넌트이므로 브라우저 상태 의존성이 높습니다.
- 장바구니는 서버가 아니라 `localStorage` 에 저장됩니다.
- 승인 대기 수는 컨텍스트로 관리되며, 승인/반려 처리 후 즉시 감소시킵니다.
- 알림 개수는 주기적으로 갱신되며, 내 요청 화면 진입 시 읽음 처리됩니다.
- 장비 및 시설 캘린더는 FullCalendar 기반으로 운영됩니다.
- 신청서 출력은 서버가 생성한 PDF 바이너리를 다운로드하는 방식입니다.

## Recommended Verification Checklist

변경 후에는 아래 흐름을 우선 확인하는 것을 권장합니다.

1. 일반 사용자 회원가입과 로그인
2. 관리자 회원가입과 로그인
3. 장비 목록 조회 및 검색/필터 동작
4. 장바구니 추가 및 유지 여부
5. 장비 대여 요청 생성과 충돌 검사
6. 시설 예약 생성과 시간 충돌 검사
7. 내 신청 현황 페이지의 상태 표시 및 PDF 다운로드
8. 관리자 요청 승인/반려 처리
9. 관리자 장비/시설 캘린더 조회 및 수정 흐름
10. 알림 개수 갱신과 읽음 처리 동작

## License

현재 저장소에는 별도의 라이선스가 명시되어 있지 않습니다. 공개 범위와 배포 방식에 맞는 라이선스를 추후 추가하는 것을 권장합니다.

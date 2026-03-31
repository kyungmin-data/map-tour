
# 🗺 Urban Discovery Map  
Data-driven Location Exploration Platform

---

## 1. Overview

Urban Discovery Map is a service that allows users to save places and structure their preferences using tags, enabling exploration of new areas.

Unlike traditional map services, this project focuses on:

User Behavior → Data Accumulation → Pattern Analysis → Exploration Recommendation

---

## 2. Key Contributions

This project goes beyond UI implementation and focuses on building a data-driven system.

### ✔ Data Modeling
- Designed relational schema based on user behavior
- Implemented many-to-many tagging structure
- Built normalized schema for scalability

### ✔ Event Logging
- Defined user actions as structured events
- Designed logs for analytics and recommendation systems

### ✔ Data Flow Design
- External API → Internal DB → User Actions → Event Logs
- Ensured full traceability of user interactions

### ✔ System Thinking
- Considered cold-start problem
- Designed for future recommendation system expansion

---

## 3. System Architecture

[User Action]  
   ↓  
[Next.js Frontend]  
   ↓  
[API Layer]  
   ↓  
[Supabase (PostgreSQL)]  
   ↓  
[Event Logging]  

---

## 4. Data Model

Core Entities:

users : user data  
spots : place data  
saves : saved locations  
tags : tag taxonomy  
save_tags : mapping table  
events : user behavior logs  

---

### Design Highlights

1. Many-to-Many Tagging  
saves (1) --- (N) save_tags (N) --- (1) tags  

- Flexible tagging system  
- Enables multi-dimensional preference analysis  

2. Decoupled Data Structure  
- spots : global place entity  
- saves : user interaction  

→ Enables popularity aggregation and recommendation  

3. Event-driven Design  

events  
- user_id  
- event_type  
- target_id  
- timestamp  

Tracked events:  
- place_search  
- place_view  
- place_save  
- tag_select  
- map_view  
- region_click  

→ Supports funnel analysis and recommendation signals  

---

## 5. Data Flow

User Flow:  
Search → View → Save → Tag → Explore  

Data Flow:  
place_search → place_view → place_save → tag_select → map_view  

→ All user actions are structured as data  

---

## 6. Core Features (MVP)

- Place search (Naver API)
- Save places with tags
- Map visualization
- Region density analysis (heatmap)
- Tag-based filtering
- Basic recommendation logic

---

## 7. Analytical Potential

- Preference clustering
- Region popularity scoring
- Recommendation system (content-based / collaborative filtering)
- Funnel analysis (conversion tracking)

---

## 8. Tech Stack

Frontend : Next.js  
Backend : Supabase  
Database : PostgreSQL  
API : Naver Map API  
Analytics : Python (planned)

---

## 9. Challenges & Solutions

1. Cold Start  
- Solved using seed data from external API  

2. Flexible Tagging  
- Implemented many-to-many structure  

3. Guest Mode  
- Session-based storage with future migration plan  

---

## 10. What This Project Demonstrates

- Data-centric system design  
- Event-driven architecture  
- Scalable data modeling  
- Analytics-ready system structure  

---

## 11. Summary

This is not just a map service, but  

a system designed to collect, structure, and utilize user behavior data  
to enable exploration experiences.

---

## 12. One-line Positioning

This project is not about building a map UI,  
but about designing a system that collects and leverages data.


# 🗺 Urban Discovery Map  
데이터 기반 도시 탐험 서비스

---

## 1. 프로젝트 개요

Urban Discovery Map은 사용자가 장소를 저장하고, 태그를 기반으로 취향을 구조화하여  
새로운 지역 탐험을 유도하는 데이터 기반 서비스입니다.

기존 지도 서비스와 달리, 이 프로젝트는 단순 위치 탐색이 아닌  
다음 흐름을 만드는 데 초점을 두었습니다.

사용자 행동 → 데이터 축적 → 패턴 분석 → 탐험 추천

---

## 2. 주요 기여 (데이터 중심 관점)

본 프로젝트는 UI 구현을 넘어서  
데이터 구조 설계 및 분석 가능성을 고려한 시스템 구축에 집중했습니다.

### ✔ 데이터 모델링
- 사용자 행동 기반 데이터 구조 설계
- 태그 시스템을 위한 M:N 관계 설계
- 추천/분석 확장을 고려한 정규화 구조 설계

### ✔ 이벤트 로그 설계
- 사용자 행동을 이벤트 단위로 정의
- 분석 및 추천 로직에 활용 가능한 로그 구조 설계

### ✔ 데이터 흐름 설계
- 외부 API → 내부 DB → 사용자 행동 → 이벤트 로그로 이어지는 흐름 구성
- 모든 사용자 행동이 추적 가능한 구조로 설계

### ✔ 시스템 설계 관점
- Cold Start 문제를 고려한 초기 데이터 전략 설계
- 추천 시스템 확장을 고려한 데이터 구조 설계

---

## 3. 시스템 아키텍처

[User Action]
   ↓
[Next.js Frontend]
   ↓
[API Layer]
   ↓
[Supabase (PostgreSQL)]
   ↓
[Event Logging]

---

## 4. 데이터 모델

### 핵심 엔티티

users : 사용자 정보  
spots : 장소 정보  
saves : 사용자 저장 데이터  
tags : 태그 정보  
save_tags : 저장-태그 연결  
events : 사용자 행동 로그  

---

### 설계 핵심 포인트

1. 태그 M:N 구조  
saves (1) --- (N) save_tags (N) --- (1) tags  

- 하나의 장소에 다중 태그 가능  
- 사용자 취향 다차원 분석 가능  

2. 장소와 저장 데이터 분리  
- spots : 장소 자체  
- saves : 사용자 행동  

→ 인기 집계 및 추천 확장 가능  

3. 이벤트 로그 중심 설계  

events  
- user_id  
- event_type  
- target_id  
- timestamp  

수집 이벤트  
- place_search  
- place_view  
- place_save  
- tag_select  
- map_view  
- region_click  

→ 퍼널 분석 / 추천 시스템 활용 가능  

---

## 5. 데이터 흐름

검색 → 조회 → 저장 → 태그 → 지도 탐색  

데이터 흐름  
place_search → place_view → place_save → tag_select → map_view  

→ 모든 사용자 행동을 데이터로 구조화  

---

## 6. 주요 기능 (MVP)

- 장소 검색 (네이버 API)
- 장소 저장 및 태그 설정
- 지도 기반 시각화
- 지역 밀도 분석 (히트맵)
- 태그 기반 필터링
- 간단 추천 기능

---

## 7. 데이터 확장 가능성

- 취향 기반 클러스터링
- 지역 인기 분석
- 추천 시스템 (콘텐츠 기반 / 협업 필터링)
- 퍼널 분석 (검색 → 저장 전환율)

---

## 8. 기술 스택

Frontend : Next.js  
Backend : Supabase  
Database : PostgreSQL  
API : 네이버 지도 API  
Analytics : Python (planned)

---

## 9. 문제 해결

1. Cold Start  
- 초기 데이터 부족 → API 기반 시드 데이터 확보  

2. 태그 구조  
- 유연한 M:N 구조 설계  

3. 비로그인 사용자  
- 세션 기반 저장 → 계정 전환 시 마이그레이션 계획  

---

## 10. 프로젝트 의미

이 프로젝트는 단순한 지도 서비스가 아니라  

사용자 행동 데이터를 축적하고  
이를 기반으로 탐험 경험을 생성하는 시스템입니다.

---

## 11. 한 줄 요약

지도 서비스를 만든 것이 아니라  
데이터를 수집하고 활용할 수 있는 구조를 설계한 프로젝트입니다.


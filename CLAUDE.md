# 대한종합상사 밀워키 매니저

## 파일 구조
- index.html — HTML 구조만 (~1400줄)
- style.css — CSS 스타일만 (~220줄)
- app.js — JS 로직만 (~4400줄)
- daehan-manager_3.html — 원본 백업 (수정 금지)

## 수정 규칙
- 수정 대상 파일만 읽을 것. 관련 없는 파일은 절대 읽지 마.
  - CSS 수정 → style.css만
  - JS 수정 → app.js만
  - HTML 수정 → index.html만
- 수정요청하는것만 수정. 다른 로직 절대 변경 금지
- 하나씩 완료되면 체크리스트로 확인 (누락 방지)
- localStorage 기존 데이터(제품, 재고, 프로모션, 설정, 발주이력 등) 절대 삭제/초기화/변경 금지
- 이해가 안되면 무조건 먼저 질문할것
- 수정 완료 후 GitHub에 push

## 저장 패턴
- 밀워키 제품: save(KEYS.products, DB.products)
- 일반제품: localStorage.setItem('mw_gen_products', JSON.stringify(genProducts))
- saveDB() 함수는 존재하지 않음. 절대 사용 금지

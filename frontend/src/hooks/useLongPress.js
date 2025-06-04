// 햅틱 피드백 함수
const triggerHapticFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(50); // 50ms 진동
  }
};

export const createLongPressHandler = (callback, delay = 500) => {
  let timeoutRef = null;
  let isLongPressTriggered = false;

  const start = (event) => {
    // 모바일 터치 이벤트인지 확인
    const isMobile = 'ontouchstart' in window;
    if (!isMobile) return;

    // 길게 누르기 플래그 초기화
    isLongPressTriggered = false;

    // 기존 타이머 클리어
    if (timeoutRef) {
      clearTimeout(timeoutRef);
    }

    // 새 타이머 시작
    timeoutRef = setTimeout(() => {
      if (callback) {
        isLongPressTriggered = true;
        
        // 햅틱 피드백 실행
        triggerHapticFeedback();
        
        // 터치 이벤트에서 좌표 추출
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        
        // 브라우저 기본 컨텍스트 메뉴 방지
        event.preventDefault();
        
        // 콜백 함수 실행 (이벤트 객체에 좌표 정보 추가)
        const syntheticEvent = {
          ...event,
          clientX,
          clientY,
          preventDefault: () => event.preventDefault(),
          stopPropagation: () => event.stopPropagation()
        };
        
        callback(syntheticEvent);
      }
    }, delay);
  };

  const clear = () => {
    if (timeoutRef) {
      clearTimeout(timeoutRef);
      timeoutRef = null;
    }
  };

  // 터치 종료 시 길게 누르기가 트리거되었으면 클릭 이벤트 방지
  const handleTouchEnd = (event) => {
    clear();
    if (isLongPressTriggered) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return {
    onTouchStart: start,
    onTouchEnd: handleTouchEnd,
    onTouchMove: clear, // 터치 이동 시 취소
    onTouchCancel: clear, // 터치 취소 시 취소
    onContextMenu: callback // 데스크톱 우클릭 지원
  };
}; 
const triggerHapticFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
};

export const createLongPressHandler = (callback, delay = 500) => {
  let timeoutRef = null;
  let isLongPressTriggered = false;

  const start = (event) => {
    const isMobile = 'ontouchstart' in window;
    if (!isMobile) return;

    isLongPressTriggered = false;

    if (timeoutRef) {
      clearTimeout(timeoutRef);
    }

    timeoutRef = setTimeout(() => {
      if (callback) {
        isLongPressTriggered = true;
        
        triggerHapticFeedback();
        
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        
        event.preventDefault();
        
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
    onTouchMove: clear,
    onTouchCancel: clear,
    onContextMenu: callback
  };
};
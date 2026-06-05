import { RefObject } from 'react';

export const tabScrollRefs: { [key: string]: RefObject<any> } = {};

export const scrollToTop = (ref: RefObject<any>) => {
  if (!ref?.current) return;
  if (typeof ref.current.scrollToOffset === 'function') {
    ref.current.scrollToOffset({ offset: 0, animated: true });
  } else if (typeof ref.current.scrollTo === 'function') {
    ref.current.scrollTo({ y: 0, animated: true });
  } else if (typeof ref.current.scrollToLocation === 'function') {
    try {
      ref.current.scrollToLocation({
        sectionIndex: 0,
        itemIndex: 0,
        animated: true,
        viewPosition: 0,
      });
    } catch (e) {
      // safe fallback if list is empty
    }
  }
};

import type { RefOrCallback } from 'lit/directives/ref.js';

export function launchIntoFullscreen(element: Element) {
  if (element.requestFullscreen) {
    element.requestFullscreen();
    // @ts-ignore
  } else if (element.mozRequestFullScreen) {
    // Firefox
    // @ts-ignore
    element.mozRequestFullScreen();
    // @ts-ignore
  } else if (element.webkitRequestFullscreen) {
    // Chrome, Safari and Opera
    // @ts-ignore
    element.webkitRequestFullscreen();
    // @ts-ignore
  } else if (element.msRequestFullscreen) {
    // IE/Edge
    // @ts-ignore
    element.msRequestFullscreen();
  }
}

/**
 * @deprecated Use {@link whenHover} instead.
 */
export const createDelayHoverSignal = (
  abortController: AbortController,
  hoverDelay = 300
) => {
  let hoverState = false;
  let hoverTimeout = 0;

  const onHover = () => {
    if (abortController.signal.aborted) {
      console.warn(
        'AbortSignal has been aborted! Did you forget to remove the listener?'
      );
    }
    if (!hoverState) {
      hoverState = true;
      // abortController.signal.dispatchEvent(new Event('hover'));
    }
    clearTimeout(hoverTimeout);
  };
  const onHoverLeave = () => {
    if (abortController.signal.aborted) {
      console.warn(
        'AbortSignal has been aborted! Did you forget to remove the listener?'
      );
    }
    clearTimeout(hoverTimeout);
    hoverTimeout = window.setTimeout(() => {
      abortController.abort();
      hoverState = false;
      // abortController.signal.dispatchEvent(new Event('hoverleave'));
    }, hoverDelay);
  };
  return {
    onHover,
    onHoverLeave,
  };
};

/**
 * Call the `whenHoverChange` callback when the element is hovered.
 *
 * After the mouse leaves the element, there is a 300ms delay by default.
 *
 * Note: The callback may be called multiple times when the mouse is hovering or hovering out.
 *
 * See also https://floating-ui.com/docs/useHover
 *
 * @example
 * ```ts
 * constructor() {
 *   let hoverTip: HTMLElement | null = null;
 *   const { setReference, setFloating } = whenHover(isHover => {
 *     if (!isHover) {
 *       hoverTips?.remove();
 *       return;
 *     }
 *     hoverTip = document.createElement('div');
 *     document.body.append(hoverTip);
 *     setFloating(hoverTip);
 *   }, { hoverDelay: 500 });
 *   this._setReference = setReference;
 * }
 *
 * render() {
 *   return html`
 *     <div ref=${this._setReference}></div>
 *   `;
 * }
 * ```
 */
export const whenHover = (
  whenHoverChange: (isHover: boolean, event?: Event) => void,
  {
    leaveDelay = 300,
    alwayRunWhenNoFloating = true,
  }: {
    leaveDelay?: number;
    alwayRunWhenNoFloating?: boolean;
  } = {}
) => {
  /**
   * The event listener will be removed when the signal is aborted.
   */
  const abortController = new AbortController();
  let hoverState = false;
  let hoverTimeout = 0;
  let referenceElement: Element | undefined;
  let floatingElement: Element | undefined;

  const onHover = (e: Event) => {
    clearTimeout(hoverTimeout);
    if (!hoverState) {
      hoverState = true;
      whenHoverChange(true, e);
      return;
    }
    // Already hovered
    if (
      alwayRunWhenNoFloating &&
      (!floatingElement || !floatingElement.isConnected)
    ) {
      // But the floating element is not ready
      // so we need to run the callback still
      whenHoverChange(true, e);
    }
  };

  const onHoverLeave = (e: Event) => {
    clearTimeout(hoverTimeout);
    hoverTimeout = window.setTimeout(() => {
      hoverState = false;
      whenHoverChange(false, e);
    }, leaveDelay);
  };

  const addHoverListener = (element?: Element) => {
    if (!element) return;
    element.addEventListener('mouseover', onHover, {
      signal: abortController.signal,
    });
    element.addEventListener('mouseleave', onHoverLeave, {
      signal: abortController.signal,
    });
  };
  const removeHoverListener = (element?: Element) => {
    if (!element) return;
    element.removeEventListener('mouseover', onHover);
    element.removeEventListener('mouseleave', onHoverLeave);
  };

  const setReference: RefOrCallback = element => {
    // Clean previous listeners
    removeHoverListener(referenceElement);
    addHoverListener(element);
    referenceElement = element;
  };

  const setFloating: RefOrCallback = element => {
    // Clean previous listeners
    removeHoverListener(floatingElement);
    addHoverListener(element);
    floatingElement = element;
  };

  return {
    setReference,
    setFloating,
    dispose: () => {
      abortController.abort();
    },
  };
};

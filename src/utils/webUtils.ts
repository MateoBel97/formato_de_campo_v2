import { Platform } from 'react-native';

// Utility functions for web-specific behavior
export class WebUtils {
  // Fix scroll issues on web
  static enableWebScroll() {
    if (Platform.OS === 'web') {
      // Ensure body can scroll
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';

      // Add touch scrolling support
      document.body.style.webkitOverflowScrolling = 'touch';

      // Ensure root element has proper height
      const root = document.getElementById('root');
      if (root) {
        root.style.height = '100%';
        root.style.overflow = 'auto';
      }
    }
  }

  // Configure ScrollView for web compatibility
  static getScrollViewProps() {
    if (Platform.OS === 'web') {
      return {
        style: {
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
        },
        contentContainerStyle: {
          flexGrow: 1,
        },
      };
    }
    return {};
  }

  // Get platform-specific container styles
  static getContainerStyles() {
    return Platform.select({
      web: {
        height: '100vh',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
      },
      default: {
        flex: 1,
      },
    });
  }

  // Get platform-specific modal styles
  static getModalStyles() {
    return Platform.select({
      web: {
        position: 'fixed' as 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        overflow: 'auto',
      },
      default: {
        flex: 1,
      },
    });
  }

  // Initialize web-specific fixes
  static initializeWebFixes() {
    if (Platform.OS === 'web') {
      // Run when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.enableWebScroll();
          this.addScrollPolyfills();
        });
      } else {
        this.enableWebScroll();
        this.addScrollPolyfills();
      }
    }
  }

  // Add polyfills for better scroll behavior
  private static addScrollPolyfills() {
    // Enable smooth scrolling if supported
    if ('scrollBehavior' in document.documentElement.style) {
      document.documentElement.style.scrollBehavior = 'smooth';
    }

    // Add touch event listeners for better mobile web experience
    let touchStartY = 0;

    document.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length > 0) {
        const touchY = e.touches[0].clientY;
        const touchDelta = touchY - touchStartY;

        // Allow native scroll behavior
        const element = e.target as HTMLElement;
        const scrollableParent = this.findScrollableParent(element);

        if (scrollableParent) {
          // Let the browser handle scrolling
          return;
        }
      }
    }, { passive: true });
  }

  // Find the nearest scrollable parent element
  private static findScrollableParent(element: HTMLElement): HTMLElement | null {
    if (!element || element === document.body) {
      return document.body;
    }

    const style = window.getComputedStyle(element);
    const overflowY = style.overflowY;

    if (overflowY === 'auto' || overflowY === 'scroll') {
      return element;
    }

    return this.findScrollableParent(element.parentElement!);
  }

  // Force refresh of scroll containers
  static refreshScrollContainers() {
    if (Platform.OS === 'web') {
      const scrollElements = document.querySelectorAll('[data-scroll-container]');
      scrollElements.forEach((element) => {
        const htmlElement = element as HTMLElement;
        htmlElement.style.overflow = 'auto';
        htmlElement.style.WebkitOverflowScrolling = 'touch';
      });
    }
  }
}

// Auto-initialize when module is imported
WebUtils.initializeWebFixes();

export default WebUtils;
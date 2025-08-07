/**
 * Performance Monitoring Module
 * Tracks Core Web Vitals and other performance metrics
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

class PerformanceMonitor {
  constructor() {
    this.metrics = {}
    this.observers = new Map()
    this.init()
  }

  init() {
    // Track Core Web Vitals
    this.trackWebVitals()
    
    // Track resource loading
    this.trackResourceLoading()
    
    // Track user interactions
    this.trackUserInteractions()
    
    // Track navigation timing
    this.trackNavigationTiming()
  }

  trackWebVitals() {
    const sendToAnalytics = (metric) => {
      this.metrics[metric.name] = metric.value
      console.log(`${metric.name}: ${metric.value}`)
      
      // Send to analytics service
      if (typeof gtag !== 'undefined') {
        gtag('event', metric.name, {
          event_category: 'Web Vitals',
          event_label: metric.id,
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          non_interaction: true,
        })
      }
    }

    // Track each Core Web Vital
    getCLS(sendToAnalytics)
    getFID(sendToAnalytics)
    getFCP(sendToAnalytics)
    getLCP(sendToAnalytics)
    getTTFB(sendToAnalytics)
  }

  trackResourceLoading() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            this.logResourceTiming(entry)
          }
        })
      })

      observer.observe({ entryTypes: ['resource'] })
      this.observers.set('resource', observer)
    }
  }

  trackUserInteractions() {
    // Track first input delay
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'first-input') {
            console.log('First Input Delay:', entry.processingStart - entry.startTime)
          }
        })
      })

      observer.observe({ entryTypes: ['first-input'] })
      this.observers.set('first-input', observer)
    }
  }

  trackNavigationTiming() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0]
        if (navigation) {
          const timings = {
            dns: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcp: navigation.connectEnd - navigation.connectStart,
            request: navigation.responseStart - navigation.requestStart,
            response: navigation.responseEnd - navigation.responseStart,
            dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            load: navigation.loadEventEnd - navigation.loadEventStart,
          }
          
          console.log('Navigation Timings:', timings)
          this.metrics.navigation = timings
        }
      }, 0)
    })
  }

  logResourceTiming(entry) {
    // Log slow resources
    if (entry.duration > 1000) {
      console.warn(`Slow resource: ${entry.name} took ${entry.duration}ms`)
    }
    
    // Track critical resources
    if (entry.name.includes('.css') || entry.name.includes('.js')) {
      console.log(`${entry.name}: ${entry.duration}ms`)
    }
  }

  // Image lazy loading with Intersection Observer
  initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]')
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target
            img.src = img.dataset.src
            img.classList.remove('lazy')
            imageObserver.unobserve(img)
          }
        })
      })

      images.forEach((img) => imageObserver.observe(img))
    } else {
      // Fallback for browsers without IntersectionObserver
      images.forEach((img) => {
        img.src = img.dataset.src
        img.classList.remove('lazy')
      })
    }
  }

  // Preload critical resources
  preloadCriticalResources() {
    const criticalResources = [
      { href: '/css/style.css', as: 'style' },
      { href: '/js/script.js', as: 'script' },
      { href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap', as: 'style' }
    ]

    criticalResources.forEach((resource) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = resource.href
      link.as = resource.as
      if (resource.as === 'style') {
        link.onload = () => {
          link.rel = 'stylesheet'
        }
      }
      document.head.appendChild(link)
    })
  }

  // Memory usage monitoring
  trackMemoryUsage() {
    if ('memory' in performance) {
      const memoryInfo = performance.memory
      console.log('Memory Usage:', {
        used: Math.round(memoryInfo.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(memoryInfo.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(memoryInfo.jsHeapSizeLimit / 1048576) + ' MB'
      })
    }
  }

  // Get performance summary
  getPerformanceSummary() {
    return {
      metrics: this.metrics,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  }

  // Clean up observers
  disconnect() {
    this.observers.forEach((observer) => {
      observer.disconnect()
    })
    this.observers.clear()
  }
}

// Initialize performance monitoring
const performanceMonitor = new PerformanceMonitor()

// Export for use in other modules
export default performanceMonitor

// Auto-initialize lazy loading when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    performanceMonitor.initLazyLoading()
  })
} else {
  performanceMonitor.initLazyLoading()
}
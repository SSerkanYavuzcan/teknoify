/**
 * Analytics and Monitoring Module
 * Privacy-compliant user behavior tracking and performance monitoring
 */

class AnalyticsManager {
  constructor() {
    this.isEnabled = false
    this.sessionId = this.generateSessionId()
    this.userId = this.getUserId()
    this.consentGiven = false
    this.events = []
    this.init()
  }

  async init() {
    // Check for consent
    await this.checkConsent()
    
    // Initialize tracking if consent given
    if (this.consentGiven) {
      this.initializeTracking()
    }
    
    // Set up consent banner
    this.setupConsentBanner()
  }

  // Consent management
  async checkConsent() {
    const consent = localStorage.getItem('analytics-consent')
    this.consentGiven = consent === 'granted'
    
    // Check for DNT header
    if (navigator.doNotTrack === '1') {
      this.consentGiven = false
    }
    
    return this.consentGiven
  }

  grantConsent() {
    this.consentGiven = true
    localStorage.setItem('analytics-consent', 'granted')
    localStorage.setItem('consent-timestamp', new Date().toISOString())
    this.initializeTracking()
    this.hideConsentBanner()
  }

  revokeConsent() {
    this.consentGiven = false
    localStorage.setItem('analytics-consent', 'denied')
    this.disableTracking()
    this.clearStoredData()
  }

  setupConsentBanner() {
    if (!this.consentGiven && !localStorage.getItem('analytics-consent')) {
      this.showConsentBanner()
    }
  }

  showConsentBanner() {
    const banner = document.createElement('div')
    banner.id = 'consent-banner'
    banner.className = 'consent-banner'
    banner.innerHTML = `
      <div class="consent-content">
        <p>Bu web sitesi, deneyiminizi iyileştirmek için çerezler kullanır. Devam ederek çerez kullanımını kabul etmiş olursunuz.</p>
        <div class="consent-buttons">
          <button id="accept-consent" class="btn-accept">Kabul Et</button>
          <button id="decline-consent" class="btn-decline">Reddet</button>
          <a href="/privacy-policy" class="privacy-link">Gizlilik Politikası</a>
        </div>
      </div>
    `
    
    document.body.appendChild(banner)
    
    // Event listeners
    document.getElementById('accept-consent').addEventListener('click', () => {
      this.grantConsent()
    })
    
    document.getElementById('decline-consent').addEventListener('click', () => {
      this.revokeConsent()
      this.hideConsentBanner()
    })
  }

  hideConsentBanner() {
    const banner = document.getElementById('consent-banner')
    if (banner) {
      banner.remove()
    }
  }

  // Tracking initialization
  initializeTracking() {
    this.isEnabled = true
    
    // Initialize Google Analytics if available
    this.initializeGoogleAnalytics()
    
    // Set up event tracking
    this.setupEventTracking()
    
    // Track page view
    this.trackPageView()
    
    // Set up performance monitoring
    this.setupPerformanceTracking()
    
    // Set up error tracking
    this.setupErrorTracking()
  }

  initializeGoogleAnalytics() {
    const trackingId = process.env.VITE_ANALYTICS_ID || 'G-XXXXXXXXXX'
    
    if (trackingId !== 'G-XXXXXXXXXX') {
      // Load Google Analytics
      const script = document.createElement('script')
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`
      document.head.appendChild(script)
      
      window.dataLayer = window.dataLayer || []
      window.gtag = function() {
        dataLayer.push(arguments)
      }
      
      gtag('js', new Date())
      gtag('config', trackingId, {
        anonymize_ip: true,
        respect_dnt: true,
        send_page_view: false // We'll send manually
      })
    }
  }

  setupEventTracking() {
    // Track clicks on important elements
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a, button')
      if (target) {
        this.trackEvent('click', {
          element_type: target.tagName.toLowerCase(),
          element_text: target.textContent.trim().substring(0, 100),
          element_href: target.href || null,
          element_class: target.className || null
        })
      }
    })

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target
      this.trackEvent('form_submit', {
        form_id: form.id || null,
        form_action: form.action || null,
        form_method: form.method || 'GET'
      })
    })

    // Track scroll depth
    this.setupScrollTracking()
    
    // Track time on page
    this.setupTimeTracking()
  }

  setupScrollTracking() {
    let maxScroll = 0
    const scrollMilestones = [25, 50, 75, 90, 100]
    const trackedMilestones = new Set()

    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      )
      
      maxScroll = Math.max(maxScroll, scrollPercent)
      
      scrollMilestones.forEach(milestone => {
        if (scrollPercent >= milestone && !trackedMilestones.has(milestone)) {
          trackedMilestones.add(milestone)
          this.trackEvent('scroll_milestone', {
            milestone: milestone,
            max_scroll: maxScroll
          })
        }
      })
    })
  }

  setupTimeTracking() {
    const startTime = Date.now()
    let isActive = true
    let totalActiveTime = 0
    let lastActiveTime = startTime

    // Track when user becomes inactive
    const inactivityEvents = ['blur', 'beforeunload']
    const activityEvents = ['focus', 'scroll', 'mousemove', 'keypress']

    inactivityEvents.forEach(event => {
      window.addEventListener(event, () => {
        if (isActive) {
          totalActiveTime += Date.now() - lastActiveTime
          isActive = false
        }
      })
    })

    activityEvents.forEach(event => {
      window.addEventListener(event, () => {
        if (!isActive) {
          lastActiveTime = Date.now()
          isActive = true
        }
      })
    })

    // Send time data before page unload
    window.addEventListener('beforeunload', () => {
      if (isActive) {
        totalActiveTime += Date.now() - lastActiveTime
      }
      
      this.trackEvent('time_on_page', {
        total_time: Date.now() - startTime,
        active_time: totalActiveTime,
        engagement_rate: (totalActiveTime / (Date.now() - startTime)) * 100
      })
    })
  }

  setupPerformanceTracking() {
    // Track Core Web Vitals
    if ('web-vitals' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS((metric) => this.trackPerformanceMetric('CLS', metric))
        getFID((metric) => this.trackPerformanceMetric('FID', metric))
        getFCP((metric) => this.trackPerformanceMetric('FCP', metric))
        getLCP((metric) => this.trackPerformanceMetric('LCP', metric))
        getTTFB((metric) => this.trackPerformanceMetric('TTFB', metric))
      })
    }

    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0]
        if (navigation) {
          this.trackEvent('page_performance', {
            dom_content_loaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            load_complete: navigation.loadEventEnd - navigation.loadEventStart,
            dns_lookup: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcp_connect: navigation.connectEnd - navigation.connectStart,
            server_response: navigation.responseEnd - navigation.requestStart
          })
        }
      }, 0)
    })
  }

  setupErrorTracking() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        line_number: event.lineno,
        column_number: event.colno,
        stack: event.error ? event.error.stack : null
      })
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('promise_rejection', {
        reason: event.reason ? event.reason.toString() : 'Unknown',
        stack: event.reason ? event.reason.stack : null
      })
    })

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.trackEvent('resource_error', {
          element_type: event.target.tagName,
          source: event.target.src || event.target.href,
          message: 'Failed to load resource'
        })
      }
    }, true)
  }

  // Event tracking methods
  trackEvent(eventName, parameters = {}) {
    if (!this.consentGiven) return

    const eventData = {
      event_name: eventName,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      user_id: this.userId,
      url: window.location.href,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      ...parameters
    }

    // Store event locally
    this.events.push(eventData)

    // Send to Google Analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        event_category: parameters.category || 'General',
        event_label: parameters.label || null,
        value: parameters.value || null,
        custom_map: parameters
      })
    }

    // Send to custom analytics endpoint if available
    this.sendToCustomAnalytics(eventData)

    console.log('Analytics Event:', eventData)
  }

  trackPageView(page = null) {
    if (!this.consentGiven) return

    const pageData = {
      page_title: document.title,
      page_location: page || window.location.href,
      page_path: window.location.pathname,
      page_search: window.location.search,
      page_hash: window.location.hash
    }

    this.trackEvent('page_view', pageData)

    // Send to Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('config', process.env.VITE_ANALYTICS_ID, {
        page_title: pageData.page_title,
        page_location: pageData.page_location
      })
    }
  }

  trackPerformanceMetric(name, metric) {
    this.trackEvent('web_vital', {
      metric_name: name,
      metric_value: metric.value,
      metric_id: metric.id,
      metric_delta: metric.delta
    })
  }

  trackCustomEvent(eventName, data = {}) {
    this.trackEvent(`custom_${eventName}`, data)
  }

  // User identification
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  getUserId() {
    let userId = localStorage.getItem('user_id')
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('user_id', userId)
    }
    return userId
  }

  // Data management
  async sendToCustomAnalytics(eventData) {
    const endpoint = process.env.VITE_ANALYTICS_ENDPOINT
    if (!endpoint) return

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      })
    } catch (error) {
      console.error('Failed to send analytics data:', error)
    }
  }

  clearStoredData() {
    localStorage.removeItem('user_id')
    this.events = []
    
    // Clear Google Analytics data
    if (typeof gtag !== 'undefined') {
      gtag('config', process.env.VITE_ANALYTICS_ID, {
        client_storage: 'none'
      })
    }
  }

  disableTracking() {
    this.isEnabled = false
    
    // Disable Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('config', process.env.VITE_ANALYTICS_ID, {
        send_page_view: false
      })
    }
  }

  // Utility methods
  getAnalyticsData() {
    return {
      session_id: this.sessionId,
      user_id: this.userId,
      consent_given: this.consentGiven,
      events_count: this.events.length,
      last_event: this.events[this.events.length - 1] || null
    }
  }

  exportData() {
    return {
      user_data: {
        user_id: this.userId,
        session_id: this.sessionId,
        consent_timestamp: localStorage.getItem('consent-timestamp')
      },
      events: this.events,
      preferences: {
        consent_given: this.consentGiven,
        tracking_enabled: this.isEnabled
      }
    }
  }
}

// Initialize analytics manager
const analyticsManager = new AnalyticsManager()

// Export for use in other modules
export default analyticsManager

// Global analytics utilities
window.AnalyticsManager = analyticsManager
window.trackEvent = (name, data) => analyticsManager.trackCustomEvent(name, data)
/**
 * Security Utilities Module
 * Provides input sanitization, XSS protection, and other security features
 */

class SecurityManager {
  constructor() {
    this.cspNonce = this.generateNonce()
    this.init()
  }

  init() {
    // Set up Content Security Policy
    this.setupCSP()
    
    // Set up security headers
    this.setupSecurityHeaders()
    
    // Initialize form security
    this.initFormSecurity()
    
    // Set up click-jacking protection
    this.setupClickjackingProtection()
  }

  // Generate cryptographically secure nonce
  generateNonce() {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  // Content Security Policy setup
  setupCSP() {
    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${this.cspNonce}' https://www.googletagmanager.com https://cdnjs.cloudflare.com https://unpkg.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: https: blob:`,
      `connect-src 'self' https://www.google-analytics.com https://analytics.google.com`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ')

    // Create meta tag for CSP
    const cspMeta = document.createElement('meta')
    cspMeta.httpEquiv = 'Content-Security-Policy'
    cspMeta.content = cspDirectives
    document.head.appendChild(cspMeta)
  }

  // Security headers setup
  setupSecurityHeaders() {
    // X-Frame-Options
    const frameOptions = document.createElement('meta')
    frameOptions.httpEquiv = 'X-Frame-Options'
    frameOptions.content = 'DENY'
    document.head.appendChild(frameOptions)

    // X-Content-Type-Options
    const contentTypeOptions = document.createElement('meta')
    contentTypeOptions.httpEquiv = 'X-Content-Type-Options'
    contentTypeOptions.content = 'nosniff'
    document.head.appendChild(contentTypeOptions)

    // Referrer Policy
    const referrerPolicy = document.createElement('meta')
    referrerPolicy.name = 'referrer'
    referrerPolicy.content = 'strict-origin-when-cross-origin'
    document.head.appendChild(referrerPolicy)

    // Permissions Policy
    const permissionsPolicy = document.createElement('meta')
    permissionsPolicy.httpEquiv = 'Permissions-Policy'
    permissionsPolicy.content = 'geolocation=(), microphone=(), camera=()'
    document.head.appendChild(permissionsPolicy)
  }

  // Input sanitization
  sanitizeInput(input, type = 'text') {
    if (typeof input !== 'string') {
      return ''
    }

    switch (type) {
      case 'html':
        return this.sanitizeHTML(input)
      case 'email':
        return this.sanitizeEmail(input)
      case 'url':
        return this.sanitizeURL(input)
      case 'phone':
        return this.sanitizePhone(input)
      default:
        return this.sanitizeText(input)
    }
  }

  sanitizeText(text) {
    return text
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 1000) // Limit length
  }

  sanitizeHTML(html) {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div')
    tempDiv.textContent = html
    return tempDiv.innerHTML
  }

  sanitizeEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const sanitized = email.toLowerCase().trim()
    return emailRegex.test(sanitized) ? sanitized : ''
  }

  sanitizeURL(url) {
    try {
      const urlObj = new URL(url)
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return ''
      }
      return urlObj.href
    } catch {
      return ''
    }
  }

  sanitizePhone(phone) {
    // Remove all non-digit characters except + at the beginning
    return phone.replace(/(?!^\+)[^\d]/g, '').substring(0, 20)
  }

  // Form security initialization
  initFormSecurity() {
    // Add CSRF token to forms
    document.addEventListener('DOMContentLoaded', () => {
      const forms = document.querySelectorAll('form')
      forms.forEach(form => {
        this.secureForm(form)
      })
    })
  }

  secureForm(form) {
    // Add CSRF token
    const csrfToken = this.generateCSRFToken()
    const csrfInput = document.createElement('input')
    csrfInput.type = 'hidden'
    csrfInput.name = 'csrf_token'
    csrfInput.value = csrfToken
    form.appendChild(csrfInput)

    // Add form validation
    form.addEventListener('submit', (event) => {
      if (!this.validateForm(form)) {
        event.preventDefault()
        return false
      }
    })

    // Sanitize inputs on blur
    const inputs = form.querySelectorAll('input, textarea')
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        const type = input.type === 'email' ? 'email' : 'text'
        input.value = this.sanitizeInput(input.value, type)
      })
    })
  }

  generateCSRFToken() {
    return this.generateNonce()
  }

  validateForm(form) {
    const inputs = form.querySelectorAll('input[required], textarea[required]')
    let isValid = true

    inputs.forEach(input => {
      if (!input.value.trim()) {
        this.showValidationError(input, 'Bu alan zorunludur')
        isValid = false
      } else if (input.type === 'email' && !this.isValidEmail(input.value)) {
        this.showValidationError(input, 'Geçerli bir e-posta adresi giriniz')
        isValid = false
      } else {
        this.clearValidationError(input)
      }
    })

    return isValid
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  showValidationError(input, message) {
    this.clearValidationError(input)
    
    const errorDiv = document.createElement('div')
    errorDiv.className = 'validation-error'
    errorDiv.textContent = message
    errorDiv.setAttribute('role', 'alert')
    
    input.parentNode.appendChild(errorDiv)
    input.classList.add('error')
    input.setAttribute('aria-invalid', 'true')
  }

  clearValidationError(input) {
    const existingError = input.parentNode.querySelector('.validation-error')
    if (existingError) {
      existingError.remove()
    }
    input.classList.remove('error')
    input.removeAttribute('aria-invalid')
  }

  // Click-jacking protection
  setupClickjackingProtection() {
    // Ensure we're not in an iframe
    if (window !== window.top) {
      document.body.style.display = 'none'
      console.warn('Clickjacking attempt detected')
    }
  }

  // Rate limiting for API calls
  createRateLimiter(maxRequests = 10, windowMs = 60000) {
    const requests = new Map()

    return (identifier) => {
      const now = Date.now()
      const userRequests = requests.get(identifier) || []
      
      // Remove old requests
      const validRequests = userRequests.filter(time => now - time < windowMs)
      
      if (validRequests.length >= maxRequests) {
        return false
      }
      
      validRequests.push(now)
      requests.set(identifier, validRequests)
      return true
    }
  }

  // Secure random string generation
  generateSecureRandom(length = 32) {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(36)).join('').substring(0, length)
  }

  // Local storage security
  secureLocalStorage = {
    setItem: (key, value) => {
      try {
        const encryptedValue = btoa(JSON.stringify(value))
        localStorage.setItem(key, encryptedValue)
      } catch (error) {
        console.error('Failed to store item securely:', error)
      }
    },

    getItem: (key) => {
      try {
        const encryptedValue = localStorage.getItem(key)
        if (!encryptedValue) return null
        return JSON.parse(atob(encryptedValue))
      } catch (error) {
        console.error('Failed to retrieve item securely:', error)
        return null
      }
    },

    removeItem: (key) => {
      localStorage.removeItem(key)
    }
  }

  // Log security events
  logSecurityEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    console.warn('Security Event:', logEntry)
    
    // Send to security monitoring service if available
    if (typeof gtag !== 'undefined') {
      gtag('event', 'security_event', {
        event_category: 'Security',
        event_label: event,
        custom_map: { security_details: JSON.stringify(details) }
      })
    }
  }
}

// Initialize security manager
const securityManager = new SecurityManager()

// Export for use in other modules
export default securityManager

// Global security utilities
window.SecurityManager = securityManager
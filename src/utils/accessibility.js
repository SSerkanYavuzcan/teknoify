/**
 * Accessibility Utilities Module
 * Ensures WCAG 2.1 AA compliance and inclusive design
 */

class AccessibilityManager {
  constructor() {
    this.focusVisible = false
    this.reducedMotion = false
    this.highContrast = false
    this.init()
  }

  init() {
    // Set up keyboard navigation
    this.setupKeyboardNavigation()
    
    // Set up focus management
    this.setupFocusManagement()
    
    // Set up ARIA enhancements
    this.setupARIAEnhancements()
    
    // Set up motion preferences
    this.setupMotionPreferences()
    
    // Set up contrast preferences
    this.setupContrastPreferences()
    
    // Set up skip links
    this.setupSkipLinks()
    
    // Validate accessibility
    this.validateAccessibility()
  }

  // Keyboard navigation setup
  setupKeyboardNavigation() {
    // Track focus visibility
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        this.focusVisible = true
        document.body.classList.add('keyboard-navigation')
      }
    })

    document.addEventListener('mousedown', () => {
      this.focusVisible = false
      document.body.classList.remove('keyboard-navigation')
    })

    // Escape key handler for modals and dropdowns
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeActiveModals()
        this.closeActiveDropdowns()
      }
    })

    // Arrow key navigation for menus
    document.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        this.handleArrowNavigation(event)
      }
    })
  }

  // Focus management
  setupFocusManagement() {
    // Focus trap for modals
    this.setupFocusTraps()
    
    // Skip to main content
    this.setupMainContentFocus()
    
    // Focus restoration
    this.setupFocusRestoration()
  }

  setupFocusTraps() {
    const modals = document.querySelectorAll('[role="dialog"]')
    modals.forEach(modal => {
      this.createFocusTrap(modal)
    })
  }

  createFocusTrap(container) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements.length === 0) return

    const firstFocusable = focusableElements[0]
    const lastFocusable = focusableElements[focusableElements.length - 1]

    container.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstFocusable) {
            event.preventDefault()
            lastFocusable.focus()
          }
        } else {
          if (document.activeElement === lastFocusable) {
            event.preventDefault()
            firstFocusable.focus()
          }
        }
      }
    })
  }

  setupMainContentFocus() {
    const skipLink = document.querySelector('.skip-link')
    if (skipLink) {
      skipLink.addEventListener('click', (event) => {
        event.preventDefault()
        const mainContent = document.querySelector('main') || document.querySelector('#main')
        if (mainContent) {
          mainContent.focus()
          mainContent.scrollIntoView()
        }
      })
    }
  }

  setupFocusRestoration() {
    let lastFocusedElement = null

    // Store focus before modal opens
    document.addEventListener('click', (event) => {
      if (event.target.matches('[data-modal-trigger]')) {
        lastFocusedElement = event.target
      }
    })

    // Restore focus when modal closes
    document.addEventListener('modal-closed', () => {
      if (lastFocusedElement) {
        lastFocusedElement.focus()
        lastFocusedElement = null
      }
    })
  }

  // ARIA enhancements
  setupARIAEnhancements() {
    // Auto-generate ARIA labels for buttons without text
    this.generateARIALabels()
    
    // Set up live regions
    this.setupLiveRegions()
    
    // Enhance form accessibility
    this.enhanceFormAccessibility()
    
    // Set up landmark roles
    this.setupLandmarkRoles()
  }

  generateARIALabels() {
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])')
    buttons.forEach(button => {
      if (!button.textContent.trim()) {
        const icon = button.querySelector('i, svg')
        if (icon) {
          const iconClass = icon.className || icon.tagName
          button.setAttribute('aria-label', this.getIconDescription(iconClass))
        }
      }
    })
  }

  getIconDescription(iconClass) {
    const iconMap = {
      'fa-home': 'Ana sayfa',
      'fa-menu': 'Menü',
      'fa-close': 'Kapat',
      'fa-search': 'Ara',
      'fa-user': 'Kullanıcı',
      'fa-envelope': 'E-posta',
      'fa-phone': 'Telefon',
      'fa-linkedin': 'LinkedIn',
      'fa-arrow-right': 'İleri',
      'fa-arrow-left': 'Geri'
    }
    
    for (const [key, value] of Object.entries(iconMap)) {
      if (iconClass.includes(key)) {
        return value
      }
    }
    
    return 'Düğme'
  }

  setupLiveRegions() {
    // Create live region for announcements
    if (!document.getElementById('live-region')) {
      const liveRegion = document.createElement('div')
      liveRegion.id = 'live-region'
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.className = 'sr-only'
      document.body.appendChild(liveRegion)
    }
  }

  announceToScreenReader(message) {
    const liveRegion = document.getElementById('live-region')
    if (liveRegion) {
      liveRegion.textContent = message
      setTimeout(() => {
        liveRegion.textContent = ''
      }, 1000)
    }
  }

  enhanceFormAccessibility() {
    // Associate labels with inputs
    const inputs = document.querySelectorAll('input:not([aria-labelledby]):not([aria-label])')
    inputs.forEach(input => {
      const label = document.querySelector(`label[for="${input.id}"]`)
      if (!label && input.placeholder) {
        input.setAttribute('aria-label', input.placeholder)
      }
    })

    // Add required field indicators
    const requiredFields = document.querySelectorAll('input[required], textarea[required]')
    requiredFields.forEach(field => {
      if (!field.getAttribute('aria-required')) {
        field.setAttribute('aria-required', 'true')
      }
    })

    // Enhance error messages
    const forms = document.querySelectorAll('form')
    forms.forEach(form => {
      form.addEventListener('invalid', (event) => {
        const input = event.target
        const errorMessage = input.validationMessage
        this.showAccessibleError(input, errorMessage)
      }, true)
    })
  }

  showAccessibleError(input, message) {
    let errorId = input.getAttribute('aria-describedby')
    let errorElement = errorId ? document.getElementById(errorId) : null

    if (!errorElement) {
      errorId = `${input.id || 'input'}-error-${Date.now()}`
      errorElement = document.createElement('div')
      errorElement.id = errorId
      errorElement.className = 'error-message'
      errorElement.setAttribute('role', 'alert')
      input.parentNode.appendChild(errorElement)
      input.setAttribute('aria-describedby', errorId)
    }

    errorElement.textContent = message
    input.setAttribute('aria-invalid', 'true')
  }

  setupLandmarkRoles() {
    // Ensure main landmark exists
    if (!document.querySelector('main') && !document.querySelector('[role="main"]')) {
      const mainContent = document.querySelector('#main, .main-content, .content')
      if (mainContent && mainContent.tagName !== 'MAIN') {
        mainContent.setAttribute('role', 'main')
      }
    }

    // Ensure navigation landmark
    const navElements = document.querySelectorAll('nav:not([role])')
    navElements.forEach((nav, index) => {
      if (index === 0) {
        nav.setAttribute('aria-label', 'Ana navigasyon')
      } else {
        nav.setAttribute('aria-label', `Navigasyon ${index + 1}`)
      }
    })
  }

  // Motion preferences
  setupMotionPreferences() {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.reducedMotion = mediaQuery.matches

    mediaQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches
      this.updateMotionSettings()
    })

    this.updateMotionSettings()
  }

  updateMotionSettings() {
    if (this.reducedMotion) {
      document.body.classList.add('reduce-motion')
      // Disable or reduce animations
      const style = document.createElement('style')
      style.textContent = `
        .reduce-motion * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `
      document.head.appendChild(style)
    }
  }

  // Contrast preferences
  setupContrastPreferences() {
    const contrastQuery = window.matchMedia('(prefers-contrast: high)')
    this.highContrast = contrastQuery.matches

    contrastQuery.addEventListener('change', (e) => {
      this.highContrast = e.matches
      this.updateContrastSettings()
    })

    this.updateContrastSettings()
  }

  updateContrastSettings() {
    if (this.highContrast) {
      document.body.classList.add('high-contrast')
    } else {
      document.body.classList.remove('high-contrast')
    }
  }

  // Skip links
  setupSkipLinks() {
    if (!document.querySelector('.skip-link')) {
      const skipLink = document.createElement('a')
      skipLink.href = '#main'
      skipLink.className = 'skip-link'
      skipLink.textContent = 'Ana içeriğe geç'
      document.body.insertBefore(skipLink, document.body.firstChild)
    }
  }

  // Utility methods
  closeActiveModals() {
    const modals = document.querySelectorAll('[role="dialog"][aria-hidden="false"]')
    modals.forEach(modal => {
      modal.setAttribute('aria-hidden', 'true')
      const event = new CustomEvent('modal-closed')
      document.dispatchEvent(event)
    })
  }

  closeActiveDropdowns() {
    const dropdowns = document.querySelectorAll('[aria-expanded="true"]')
    dropdowns.forEach(dropdown => {
      dropdown.setAttribute('aria-expanded', 'false')
    })
  }

  handleArrowNavigation(event) {
    const activeElement = document.activeElement
    const menu = activeElement.closest('[role="menu"], [role="menubar"]')
    
    if (menu) {
      event.preventDefault()
      const items = menu.querySelectorAll('[role="menuitem"]')
      const currentIndex = Array.from(items).indexOf(activeElement)
      
      let nextIndex
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % items.length
      } else {
        nextIndex = (currentIndex - 1 + items.length) % items.length
      }
      
      items[nextIndex].focus()
    }
  }

  // Accessibility validation
  validateAccessibility() {
    const issues = []

    // Check for images without alt text
    const images = document.querySelectorAll('img:not([alt])')
    if (images.length > 0) {
      issues.push(`${images.length} images missing alt text`)
    }

    // Check for buttons without accessible names
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])')
    const buttonsWithoutText = Array.from(buttons).filter(btn => !btn.textContent.trim())
    if (buttonsWithoutText.length > 0) {
      issues.push(`${buttonsWithoutText.length} buttons without accessible names`)
    }

    // Check for form inputs without labels
    const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])')
    const inputsWithoutLabels = Array.from(inputs).filter(input => {
      return !document.querySelector(`label[for="${input.id}"]`)
    })
    if (inputsWithoutLabels.length > 0) {
      issues.push(`${inputsWithoutLabels.length} form inputs without labels`)
    }

    if (issues.length > 0) {
      console.warn('Accessibility issues found:', issues)
    } else {
      console.log('No accessibility issues found')
    }

    return issues
  }

  // Color contrast checker
  checkColorContrast(foreground, background) {
    // Simple contrast ratio calculation
    const getLuminance = (color) => {
      const rgb = color.match(/\d+/g).map(Number)
      return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
    }

    const fgLuminance = getLuminance(foreground)
    const bgLuminance = getLuminance(background)
    
    const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) / 
                  (Math.min(fgLuminance, bgLuminance) + 0.05)

    return {
      ratio: ratio.toFixed(2),
      passAA: ratio >= 4.5,
      passAAA: ratio >= 7
    }
  }
}

// Initialize accessibility manager
const accessibilityManager = new AccessibilityManager()

// Export for use in other modules
export default accessibilityManager

// Global accessibility utilities
window.AccessibilityManager = accessibilityManager
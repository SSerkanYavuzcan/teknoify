/**
 * Progressive Web App (PWA) Module
 * Handles service worker registration, app install prompts, and offline functionality
 */

class PWAManager {
  constructor() {
    this.deferredPrompt = null
    this.isInstalled = false
    this.init()
  }

  async init() {
    // Register service worker
    await this.registerServiceWorker()
    
    // Setup install prompt
    this.setupInstallPrompt()
    
    // Check if app is already installed
    this.checkInstallStatus()
    
    // Handle app updates
    this.handleAppUpdates()
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })
        
        console.log('Service Worker registered successfully:', registration.scope)
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateAvailable()
              }
            })
          }
        })
        
        return registration
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }
  }

  setupInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (event) => {
      console.log('PWA install prompt triggered')
      
      // Prevent the default install prompt
      event.preventDefault()
      
      // Store the event for later use
      this.deferredPrompt = event
      
      // Show custom install button
      this.showInstallButton()
    })

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed')
      this.isInstalled = true
      this.hideInstallButton()
      this.deferredPrompt = null
      
      // Track installation
      if (typeof gtag !== 'undefined') {
        gtag('event', 'pwa_installed', {
          event_category: 'PWA',
          event_label: 'App Installed'
        })
      }
    })
  }

  async showInstallPrompt() {
    if (!this.deferredPrompt) {
      console.log('Install prompt not available')
      return false
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt()
      
      // Wait for user response
      const choiceResult = await this.deferredPrompt.userChoice
      
      console.log('User choice:', choiceResult.outcome)
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      // Clear the deferred prompt
      this.deferredPrompt = null
      
      return choiceResult.outcome === 'accepted'
    } catch (error) {
      console.error('Error showing install prompt:', error)
      return false
    }
  }

  showInstallButton() {
    // Create install button if it doesn't exist
    let installButton = document.getElementById('pwa-install-button')
    
    if (!installButton) {
      installButton = document.createElement('button')
      installButton.id = 'pwa-install-button'
      installButton.className = 'pwa-install-btn'
      installButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        <span>Uygulamayı Yükle</span>
      `
      
      installButton.addEventListener('click', () => {
        this.showInstallPrompt()
      })
      
      // Add to page (you might want to customize the location)
      const header = document.querySelector('header')
      if (header) {
        header.appendChild(installButton)
      }
    }
    
    installButton.style.display = 'flex'
  }

  hideInstallButton() {
    const installButton = document.getElementById('pwa-install-button')
    if (installButton) {
      installButton.style.display = 'none'
    }
  }

  checkInstallStatus() {
    // Check if running as standalone app
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true
      console.log('App is running in standalone mode')
    }
    
    // Check if running in browser tab on mobile
    if (window.navigator.standalone === true) {
      this.isInstalled = true
      console.log('App is running in iOS standalone mode')
    }
  }

  showUpdateAvailable() {
    // Create update notification
    const updateNotification = document.createElement('div')
    updateNotification.id = 'pwa-update-notification'
    updateNotification.className = 'pwa-update-notification'
    updateNotification.innerHTML = `
      <div class="update-content">
        <p>Yeni bir sürüm mevcut!</p>
        <button id="pwa-update-button" class="update-btn">Güncelle</button>
        <button id="pwa-dismiss-button" class="dismiss-btn">×</button>
      </div>
    `
    
    document.body.appendChild(updateNotification)
    
    // Handle update button click
    document.getElementById('pwa-update-button').addEventListener('click', () => {
      this.applyUpdate()
    })
    
    // Handle dismiss button click
    document.getElementById('pwa-dismiss-button').addEventListener('click', () => {
      updateNotification.remove()
    })
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (document.getElementById('pwa-update-notification')) {
        updateNotification.remove()
      }
    }, 10000)
  }

  async applyUpdate() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration && registration.waiting) {
        // Tell the waiting service worker to skip waiting
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        
        // Reload the page to use the new service worker
        window.location.reload()
      }
    }
  }

  handleAppUpdates() {
    // Listen for service worker controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('New service worker activated')
      // Optionally reload the page or show a notification
    })
  }

  // Offline status handling
  setupOfflineHandling() {
    window.addEventListener('online', () => {
      console.log('App is online')
      this.hideOfflineNotification()
    })

    window.addEventListener('offline', () => {
      console.log('App is offline')
      this.showOfflineNotification()
    })
  }

  showOfflineNotification() {
    let offlineNotification = document.getElementById('offline-notification')
    
    if (!offlineNotification) {
      offlineNotification = document.createElement('div')
      offlineNotification.id = 'offline-notification'
      offlineNotification.className = 'offline-notification'
      offlineNotification.innerHTML = `
        <div class="offline-content">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.64 7c-.45-.34-4.93-4-11.64-4-1.5 0-2.89.19-4.15.48L18.18 13.8 23.64 7zm-6.6 8.22L3.27 1.44 2 2.72l2.05 2.06C1.91 5.76.59 6.82.36 7l11.63 14.49.01.01.01-.01L18.09 7.5l3.19 3.19 1.27-1.27-5.51-5.2z"/>
          </svg>
          <span>Çevrimdışı - Bazı özellikler kullanılamayabilir</span>
        </div>
      `
      
      document.body.appendChild(offlineNotification)
    }
    
    offlineNotification.style.display = 'block'
  }

  hideOfflineNotification() {
    const offlineNotification = document.getElementById('offline-notification')
    if (offlineNotification) {
      offlineNotification.style.display = 'none'
    }
  }

  // Get PWA status
  getStatus() {
    return {
      isInstalled: this.isInstalled,
      hasInstallPrompt: !!this.deferredPrompt,
      isOnline: navigator.onLine,
      hasServiceWorker: 'serviceWorker' in navigator
    }
  }
}

// Initialize PWA manager
const pwaManager = new PWAManager()

// Setup offline handling
pwaManager.setupOfflineHandling()

export default pwaManager
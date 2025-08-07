/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock the script functionality
const mockNavigationScript = () => {
  // Sticky Navbar functionality
  window.addEventListener('scroll', function() {
    const header = document.getElementById('header')
    if (header) {
      header.classList.toggle('sticky', window.scrollY > 50)
    }
  })
  
  // Loader functionality
  window.addEventListener('load', function() {
    const loader = document.getElementById('loader')
    if (loader) {
      loader.classList.add('fade-out')
      setTimeout(function() {
        loader.style.display = 'none'
      }, 1500)
    }
  })
}

describe('Navigation Functionality', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <header id="header" class="navbar">
        <div class="logo">
          <a href="#home">Teknoify</a>
        </div>
        <ul class="nav-links">
          <li><a href="#home">Ana Sayfa</a></li>
          <li><a href="#products">Ürünler</a></li>
          <li><a href="#about">Hakkımızda</a></li>
          <li><a href="#contact">İletişim</a></li>
        </ul>
      </header>
      <div id="loader"></div>
    `
    
    // Reset scroll position
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 0
    })
    
    // Initialize script
    mockNavigationScript()
  })

  describe('Sticky Navigation', () => {
    it('should add sticky class when scrolled past threshold', () => {
      const header = document.getElementById('header')
      expect(header.classList.contains('sticky')).toBe(false)
      
      // Simulate scroll past threshold
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        value: 100
      })
      
      // Trigger scroll event
      const scrollEvent = new Event('scroll')
      window.dispatchEvent(scrollEvent)
      
      expect(header.classList.contains('sticky')).toBe(true)
    })
    
    it('should remove sticky class when scrolled back to top', () => {
      const header = document.getElementById('header')
      header.classList.add('sticky')
      
      // Simulate scroll back to top
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        value: 0
      })
      
      // Trigger scroll event
      const scrollEvent = new Event('scroll')
      window.dispatchEvent(scrollEvent)
      
      expect(header.classList.contains('sticky')).toBe(false)
    })
  })

  describe('Page Loader', () => {
    it('should add fade-out class on window load', () => {
      const loader = document.getElementById('loader')
      expect(loader.classList.contains('fade-out')).toBe(false)
      
      // Trigger load event
      const loadEvent = new Event('load')
      window.dispatchEvent(loadEvent)
      
      expect(loader.classList.contains('fade-out')).toBe(true)
    })
    
    it('should hide loader after animation delay', (done) => {
      const loader = document.getElementById('loader')
      
      // Trigger load event
      const loadEvent = new Event('load')
      window.dispatchEvent(loadEvent)
      
      // Check that loader is hidden after delay
      setTimeout(() => {
        expect(loader.style.display).toBe('none')
        done()
      }, 1600) // Slightly longer than the 1500ms delay
    })
  })

  describe('Navigation Links', () => {
    it('should have correct href attributes', () => {
      const links = document.querySelectorAll('.nav-links a')
      const expectedHrefs = ['#home', '#products', '#about', '#contact']
      
      links.forEach((link, index) => {
        expect(link.getAttribute('href')).toBe(expectedHrefs[index])
      })
    })
    
    it('should have accessible text content', () => {
      const links = document.querySelectorAll('.nav-links a')
      const expectedTexts = ['Ana Sayfa', 'Ürünler', 'Hakkımızda', 'İletişim']
      
      links.forEach((link, index) => {
        expect(link.textContent.trim()).toBe(expectedTexts[index])
      })
    })
  })
})
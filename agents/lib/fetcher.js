/**
 * Page Fetcher Library
 * Lấy nội dung trang web để phân tích
 */

import puppeteer from 'puppeteer';

const DEFAULT_OPTIONS = {
  waitUntil: 'networkidle2',
  timeout: 30000,
  viewport: {
    width: 1920,
    height: 1080
  }
};

const MOBILE_VIEWPORT = {
  width: 375,
  height: 812,
  isMobile: true,
  hasTouch: true
};

export async function fetchPage(url, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport(config.viewport);
    
    // Ghi log request
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });
    
    const response = await page.goto(url, {
      waitUntil: config.waitUntil,
      timeout: config.timeout
    });
    
    if (!response || !response.ok()) {
      throw new Error(`HTTP ${response?.status() || 'No response'}`);
    }
    
    // Lấy HTML
    const html = await page.content();
    
    // Lấy metrics
    const metrics = await page.metrics();
    
    // Evaluate page content
    const content = await page.evaluate(() => {
      // Lấy meta information
      const meta = {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        keywords: document.querySelector('meta[name="keywords"]')?.content || '',
        ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
        ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
        ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
        canonical: document.querySelector('link[rel="canonical"]')?.href || ''
      };
      
      // Lấy headings
      const headings = {
        h1: Array.from(document.querySelectorAll('h1')).map(el => el.textContent.trim()),
        h2: Array.from(document.querySelectorAll('h2')).map(el => el.textContent.trim()),
        h3: Array.from(document.querySelectorAll('h3')).map(el => el.textContent.trim())
      };
      
      // Lấy links
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
        href: a.href,
        text: a.textContent.trim(),
        isExternal: a.hostname !== window.location.hostname
      }));
      
      // Lấy images
      const images = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt || '',
        width: img.width,
        height: img.height,
        loading: img.loading
      }));
      
      // Lấy forms
      const forms = Array.from(document.querySelectorAll('form')).map(form => ({
        action: form.action,
        method: form.method,
        inputs: Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
          name: input.name,
          type: input.type,
          required: input.required
        }))
      }));
      
      // Lấy navigation
      const navLinks = Array.from(document.querySelectorAll('nav a, header a, .nav a, .menu a')).map(a => ({
        href: a.href,
        text: a.textContent.trim()
      }));
      
      // Lighthouse metrics (simplified)
      const performanceMetrics = {
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint')?.startTime || 0
      };
      
      // Colors
      const styles = getComputedStyle(document.body);
      const colors = {
        background: styles.backgroundColor,
        color: styles.color,
        primary: getComputedStyle(document.documentElement).getPropertyValue('--primary') || styles.color
      };
      
      return { meta, headings, links, images, forms, navLinks, performanceMetrics, colors };
    });
    
    return {
      url,
      status: response.status(),
      html,
      requests,
      metrics,
      content,
      error: null
    };
    
  } catch (error) {
    return {
      url,
      status: 0,
      html: null,
      error: error.message
    };
  } finally {
    if (browser) await browser.close();
  }
}

export async function fetchPageMobile(url) {
  return fetchPage(url, { viewport: MOBILE_VIEWPORT });
}

export async function fetchMultiplePages(urls) {
  return Promise.all(urls.map(url => fetchPage(url)));
}

export async function takeScreenshot(url, filename, options = {}) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    if (options.mobile) {
      await page.setViewport(MOBILE_VIEWPORT);
    } else {
      await page.setViewport({ width: options.width || 1920, height: options.height || 1080 });
    }
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.screenshot({ 
      path: filename, 
      fullPage: options.fullPage || false 
    });
    
    return { success: true, filename };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    if (browser) await browser.close();
  }
}

export default { fetchPage, fetchPageMobile, fetchMultiplePages, takeScreenshot };


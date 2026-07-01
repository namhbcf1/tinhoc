// @ts-nocheck
import { useEffect, useRef } from 'react';

const LOCK_COUNT_DATASET = 'adminOverlayLockCount';
const LOCK_CLASS = 'admin-overlay-open';
let nextOverlayLayer = 200000;

function allocateOverlayLayer() {
  nextOverlayLayer += 10;
  return nextOverlayLayer;
}

function getMainScrollElement() {
  return typeof document !== 'undefined'
    ? document.getElementById('main-scroll')
    : null;
}

function getLockCount(body: HTMLBodyElement) {
  return Number.parseInt(body.dataset[LOCK_COUNT_DATASET] || '0', 10) || 0;
}

function applyLock() {
  const body = document.body;
  const html = document.documentElement;
  const mainScroll = getMainScrollElement();

  body.classList.add(LOCK_CLASS);
  body.style.overflow = 'hidden';
  html.style.overflow = 'hidden';

  if (mainScroll) {
    if (!mainScroll.dataset.lockPrevOverflow) {
      mainScroll.dataset.lockPrevOverflow = mainScroll.style.overflow || '';
    }
    if (!mainScroll.dataset.lockPrevOverflowY) {
      mainScroll.dataset.lockPrevOverflowY = mainScroll.style.overflowY || '';
    }
    mainScroll.style.overflow = 'hidden';
    mainScroll.style.overflowY = 'hidden';
  }
}

function clearLock() {
  const body = document.body;
  const html = document.documentElement;
  const mainScroll = getMainScrollElement();

  body.classList.remove(LOCK_CLASS);
  body.style.overflow = '';
  html.style.overflow = '';

  if (mainScroll) {
    mainScroll.style.overflow = mainScroll.dataset.lockPrevOverflow || '';
    mainScroll.style.overflowY = mainScroll.dataset.lockPrevOverflowY || '';
    delete mainScroll.dataset.lockPrevOverflow;
    delete mainScroll.dataset.lockPrevOverflowY;
  }
}

export function acquireOverlayLock() {
  if (typeof document === 'undefined') return;
  const body = document.body;
  const nextCount = getLockCount(body) + 1;
  body.dataset[LOCK_COUNT_DATASET] = String(nextCount);

  if (nextCount === 1) {
    applyLock();
  }
}

export function releaseOverlayLock() {
  if (typeof document === 'undefined') return;
  const body = document.body;
  const nextCount = Math.max(0, getLockCount(body) - 1);

  if (nextCount === 0) {
    delete body.dataset[LOCK_COUNT_DATASET];
    clearLock();
    return;
  }

  body.dataset[LOCK_COUNT_DATASET] = String(nextCount);
}

export function useOverlayLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;

    acquireOverlayLock();
    return () => releaseOverlayLock();
  }, [active]);
}

export function useOverlayLayer(active = true) {
  const layerRef = useRef<number | null>(null);

  if (active) {
    if (layerRef.current == null) {
      layerRef.current = allocateOverlayLayer();
    }
  } else {
    layerRef.current = null;
  }

  return layerRef.current ?? nextOverlayLayer;
}

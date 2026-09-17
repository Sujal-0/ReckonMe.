import posthog from 'posthog-js';

// Setup your posthog tracking ID here (you can replace this with your actual key later)
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || 'phc_mock_key_replace_me';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

export const initAnalytics = () => {
  if (typeof window !== 'undefined') {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: false, // We will manually track key game events
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
    });
  }
};

export const trackEvent = (eventName, properties = {}) => {
  if (typeof window !== 'undefined') {
    try {
      posthog.capture(eventName, properties);
      // Uncomment for local debugging
      // console.log(`[Analytics] ${eventName}`, properties);
    } catch (e) {
      console.warn('Analytics tracking failed', e);
    }
  }
};

export const identifyUser = (userId, properties = {}) => {
  if (typeof window !== 'undefined') {
    try {
      posthog.identify(userId, properties);
    } catch (e) {
      console.warn('Analytics identify failed', e);
    }
  }
};

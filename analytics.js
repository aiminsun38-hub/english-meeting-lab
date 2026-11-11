/* Anonymous funnel events; detailed learning records stay in the browser. */
(() => {
  'use strict';
  const endpoint = 'https://aiminsun38.goatcounter.com/count';
  const params = new URLSearchParams(location.search);
  const sourceKey = 'english-meeting-traffic-source-v1';
  const maxAge = 8 * 60 * 60 * 1000;
  const validPart = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value);
  const validSource = value => value && validPart(value.campaign) && validPart(value.source);
  let current = {campaign:'direct', source:'unknown'};
  try {
    const saved = JSON.parse(sessionStorage.getItem(sourceKey) || 'null');
    if (validSource(saved) && Number.isFinite(saved.at) && Date.now() - saved.at >= 0 && Date.now() - saved.at < maxAge) {
      current = {campaign:saved.campaign, source:saved.source};
    }
  } catch (error) { /* Attribution still works without browser storage. */ }
  if (validPart(params.get('utm_campaign')) || validPart(params.get('utm_source'))) {
    current = {
      campaign:validPart(params.get('utm_campaign')) ? params.get('utm_campaign') : 'unspecified',
      source:validPart(params.get('utm_source')) ? params.get('utm_source') : 'unknown'
    };
    try { sessionStorage.setItem(sourceKey, JSON.stringify({...current, at:Date.now()})); } catch (error) { /* Optional storage. */ }
  }
  const enabled = /^https:\/\/[a-z0-9-]+\.goatcounter\.com\/count$/.test(endpoint)
    && params.get('analytics') !== 'off'
    && location.hostname === 'aiminsun38-hub.github.io'
    && !navigator.webdriver;
  const labels = {open:'打开训练', start:'开始 Day 1', complete:'完成 Day 1'};
  const queue = [];
  const sent = new Set();
  function source(saved) {
    const value = validSource(saved) ? saved : current;
    return {campaign:value.campaign, source:value.source};
  }
  function flush() {
    if (!window.goatcounter?.count || document.visibilityState !== 'visible') return;
    while (queue.length) {
      const event = queue.shift();
      try { window.goatcounter.count(event); } catch (error) { /* Stats must never interrupt training. */ }
    }
  }
  function track(stage, saved) {
    if (!enabled || !Object.hasOwn(labels, stage)) return;
    const attribution = source(saved);
    const path = 'day1-' + stage + '--' + attribution.campaign + '--' + attribution.source;
    if (sent.has(path)) return;
    sent.add(path);
    queue.push({
      path,
      title:labels[stage] + ' | ' + attribution.campaign + ' | ' + attribution.source,
      referrer:attribution.campaign + '/' + attribution.source,
      event:true
    });
    flush();
  }
  window.trainingAnalytics = {source, track};
  if (!enabled) return;
  window.goatcounter = {no_onload:true, endpoint};
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.onload = flush;
  document.head.appendChild(script);
  document.addEventListener('visibilitychange', flush);
  track('open');
})();

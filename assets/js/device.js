/* What a web page can learn about the visitor's device, read locally.
   Nothing here is stored or sent anywhere. Used by the boot screen, the
   fleet demo ("you" tile), the device panel and the terminal. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};
  const nav = navigator;
  let cachedSync = null;
  let cachedFull = null;
  let cachedGpu;

  function withTimeout(p, ms) {
    return Promise.race([p, new Promise((r) => setTimeout(() => r(undefined), ms))]);
  }

  function gpu() {
    if (cachedGpu !== undefined) return cachedGpu;
    cachedGpu = null;
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return cachedGpu;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      let name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      if (name) {
        const angle = /^ANGLE \((.*)\)$/.exec(name);
        if (angle) {
          const parts = angle[1].split(', ');
          name = parts.length > 1 ? parts[1] : parts[0];
        }
        name = name
          .replace(/^ANGLE Metal Renderer: /, '')
          .replace(/ Direct3D.*$/, '')
          .replace(/ \(0x[0-9A-Fa-f]+\)/g, '')
          .replace(/ OpenGL.*$/, '')
          .replace(/, or similar$/, '')
          .trim();
        cachedGpu = name.length > 44 ? name.slice(0, 43) + '…' : name;
      }
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (e) { /* ignore */ }
    return cachedGpu;
  }

  function parse() {
    const ua = nav.userAgent || '';
    const uad = nav.userAgentData;
    const os = { name: 'Unknown', version: '', code: '???', certain: true, eos: false };
    let m;
    if (/Windows NT 10\.0/.test(ua)) { os.name = 'Windows'; os.version = '10 or 11'; os.certain = false; os.code = 'WIN'; }
    else if (/Windows NT 6\.[23]/.test(ua)) { os.name = 'Windows'; os.version = '8.x'; os.code = 'W8'; os.eos = true; }
    else if (/Windows NT 6\.1/.test(ua)) { os.name = 'Windows'; os.version = '7'; os.code = 'W7'; os.eos = true; }
    else if (/iPhone|iPod/.test(ua)) { os.name = 'iOS'; m = /OS (\d+)[_.](\d+)/.exec(ua); os.version = m ? m[1] + '.' + m[2] : ''; os.code = 'iOS'; }
    else if (/iPad/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1)) { os.name = 'iPadOS'; m = /OS (\d+)[_.](\d+)/.exec(ua); os.version = m ? m[1] + '.' + m[2] : ''; os.code = 'IPD'; }
    else if (/Android/.test(ua)) { os.name = 'Android'; m = /Android (\d+(?:\.\d+)?)/.exec(ua); os.version = m ? m[1] : ''; os.code = 'AND'; }
    else if (/CrOS/.test(ua)) { os.name = 'ChromeOS'; os.code = 'CRB'; }
    else if (/Mac OS X/.test(ua)) {
      os.name = 'macOS'; os.code = 'MAC';
      m = /Mac OS X (\d+)[_.](\d+)/.exec(ua);
      // Browsers freeze this at 10.15 for privacy, so it usually says nothing
      os.version = m && !(m[1] === '10' && m[2] === '15') ? m[1] + '.' + m[2] : '';
      os.certain = !!os.version;
    }
    else if (/Linux/.test(ua)) { os.name = 'Linux'; os.code = 'LNX'; }
    if (uad && uad.platform && os.name === 'Unknown') os.name = uad.platform;

    const b = { name: 'Unknown', version: '' };
    if ((m = /Edg(?:A|iOS)?\/(\d+)/.exec(ua))) { b.name = 'Edge'; b.version = m[1]; }
    else if ((m = /OPR\/(\d+)/.exec(ua))) { b.name = 'Opera'; b.version = m[1]; }
    else if ((m = /SamsungBrowser\/(\d+)/.exec(ua))) { b.name = 'Samsung Internet'; b.version = m[1]; }
    else if ((m = /(?:Firefox|FxiOS)\/(\d+)/.exec(ua))) { b.name = 'Firefox'; b.version = m[1]; }
    else if ((m = /CriOS\/(\d+)/.exec(ua))) { b.name = 'Chrome'; b.version = m[1]; }
    else if ((m = /Chrome\/(\d+)/.exec(ua))) { b.name = 'Chrome'; b.version = m[1]; }
    else if (/Safari\//.test(ua)) { b.name = 'Safari'; m = /Version\/(\d+(?:\.\d+)?)/.exec(ua); b.version = m ? m[1] : ''; }
    return { os, browser: b };
  }

  function sync() {
    if (cachedSync) return cachedSync;
    const p = parse();
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    cachedSync = {
      os: p.os,
      browser: p.browser,
      cores: nav.hardwareConcurrency || null,
      memory: nav.deviceMemory || null,
      screen: {
        w: (window.screen && screen.width) || 0,
        h: (window.screen && screen.height) || 0,
        dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
        depth: (window.screen && screen.colorDepth) || 24,
      },
      touch: nav.maxTouchPoints || 0,
      lang: nav.language || '',
      tz,
      online: nav.onLine !== false,
      conn: conn ? { type: conn.effectiveType || '', down: conn.downlink || null } : null,
      secure: !!window.isSecureContext,
      cookies: nav.cookieEnabled !== false,
      gpc: typeof nav.globalPrivacyControl === 'boolean' ? nav.globalPrivacyControl : null,
      arch: '',
      gpu: undefined,
      quota: null,
      battery: null,
      passkey: null,
    };
    return cachedSync;
  }

  async function full() {
    if (cachedFull) return cachedFull;
    const info = sync();
    info.gpu = gpu();
    const uad = nav.userAgentData;
    const tasks = [];
    if (uad && uad.getHighEntropyValues) {
      tasks.push(withTimeout(uad.getHighEntropyValues(['platformVersion', 'architecture', 'bitness']), 900).then((h) => {
        if (!h) return;
        if (uad.platform === 'Windows' && h.platformVersion) {
          const major = parseInt(h.platformVersion.split('.')[0], 10);
          info.os.certain = true;
          info.os.via = 'client hints';
          if (major >= 13) { info.os.version = '11'; info.os.code = 'W11'; }
          else if (major > 0) { info.os.version = '10'; info.os.code = 'W10'; info.os.eos = true; }
          else { info.os.version = '7 or 8'; info.os.code = 'W8'; info.os.eos = true; }
        } else if (uad.platform === 'macOS' && h.platformVersion) {
          info.os.version = h.platformVersion.split('.').slice(0, 2).join('.');
          info.os.certain = true;
          info.os.via = 'client hints';
        }
        if (h.architecture) info.arch = h.architecture + (h.bitness ? ' ' + h.bitness + '-bit' : '');
      }).catch(() => {}));
    }
    if (nav.storage && nav.storage.estimate) {
      tasks.push(withTimeout(nav.storage.estimate(), 900).then((e) => { if (e && e.quota) info.quota = e.quota; }).catch(() => {}));
    }
    if (nav.getBattery) {
      tasks.push(withTimeout(nav.getBattery(), 900).then((bt) => { if (bt) info.battery = { level: bt.level, charging: bt.charging }; }).catch(() => {}));
    }
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      tasks.push(withTimeout(PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(), 900).then((v) => { if (typeof v === 'boolean') info.passkey = v; }).catch(() => {}));
    }
    await Promise.all(tasks);
    cachedFull = info;
    return info;
  }

  function osLabel(d) {
    const o = d.os;
    if (o.name === 'Windows' && !o.certain) return 'Windows 10 or 11';
    return (o.name + ' ' + (o.version || '')).trim();
  }

  function browserLabel(d) {
    return (d.browser.name + ' ' + (d.browser.version || '')).trim();
  }

  function gb(bytes) {
    if (!bytes) return '';
    const g = bytes / 1073741824;
    return g >= 10 ? Math.round(g) + ' GB' : g.toFixed(1) + ' GB';
  }

  // Facts as [label, value] pairs, in display order
  function facts(d) {
    const s = d.screen;
    const rows = [
      ['operating system', osLabel(d) + (d.os.via ? ' (' + d.os.via + ')' : '')],
      ['browser', browserLabel(d)],
      ['architecture', d.arch || 'not reported'],
      ['cpu threads', d.cores ? String(d.cores) : 'not reported'],
      ['memory', d.memory ? (d.memory >= 8 ? '8 GB or more' : d.memory + ' GB') : 'not reported'],
      ['screen', s.w + '×' + s.h + ' @' + s.dpr + 'x · ' + s.depth + '-bit'],
      ['graphics', d.gpu || 'hidden by browser'],
      ['touch', d.touch ? 'yes · ' + d.touch + ' points' : 'no'],
      ['language', d.lang || 'not reported'],
      ['time zone', d.tz || 'not reported'],
      ['connection', d.conn && d.conn.type ? d.conn.type + (d.conn.down ? ' · ~' + d.conn.down + ' Mb/s' : '') : 'not reported'],
      ['secure page', d.secure ? 'yes (https)' : 'no'],
      ['passkeys', d.passkey === true ? 'supported on this device' : d.passkey === false ? 'no built-in authenticator' : 'unknown'],
      ['privacy signal', d.gpc === null ? 'not supported' : d.gpc ? 'GPC on' : 'GPC off'],
      ['site storage', d.quota ? gb(d.quota) + ' available' : 'not reported'],
      ['battery', d.battery ? Math.round(d.battery.level * 100) + '%' + (d.battery.charging ? ', charging' : '') : 'not reported'],
    ];
    return rows;
  }

  LY.device = { sync, full, gpu, facts, osLabel, browserLabel };
})();

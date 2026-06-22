// The fingerprint interstitial.
//
// A bare 302 can't run JavaScript, so it can only ever see HTTP headers. To
// gather device/behaviour signals we instead serve a tiny HTML page that:
//   1. runs a small collector in the visitor's browser,
//   2. POSTs the signals to /api/collect (via sendBeacon, survives navigation),
//   3. forwards to the real destination.
//
// The header-only click row is already in the DB before this page renders, so a
// visitor who never runs the script (headless bots, JS disabled) is still logged
// — their fingerprint just stays null, which is itself a strong signal. This file
// records RAW signals only; deciding whether a click is a genuine human
// (authenticity scoring) happens in a separate service, not here.

// In-app browser detection from the User-Agent. Done server-side so it works
// even when JS doesn't run. Returns true/false (null only if no UA at all).
export function inAppFromUA(ua: string | null): boolean | null {
  if (!ua) return null;
  // FBAN/FBAV = Facebook, Instagram, Twitter/X, TikTok (musical_ly/BytedanceWebview),
  // Snapchat, Line, Pinterest, LinkedIn, WhatsApp, GSA = Google app webview.
  return /\b(FBAN|FBAV|FB_IAB|Instagram|Twitter|musical_ly|Bytedance|TikTok|Snapchat|Line\/|Pinterest|LinkedInApp|WhatsApp|GSA)\b/i.test(
    ua
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// The browser-side collector, as a string injected into the page. Vanilla JS,
// every probe wrapped so one failure never blocks the redirect.
function collectorScript(destination: string, clickId: number): string {
  const DEST = JSON.stringify(destination);
  const ID = JSON.stringify(clickId);
  return `
(function(){
  var DEST=${DEST}, ID=${ID};
  var t0=(window.performance&&performance.now)?performance.now():0;
  function safe(fn){try{return fn();}catch(e){return null;}}
  // cyrb53 — small, fast non-cryptographic hash for stable fingerprints.
  function hash(str){var h1=0xdeadbeef,h2=0x41c6ce57;for(var i=0;i<str.length;i++){var c=str.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677);}h1=Math.imul(h1^(h1>>>16),2246822507);h1^=Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507);h2^=Math.imul(h1^(h1>>>13),3266489909);return (4294967296*(2097151&h2)+(h1>>>0)).toString(16);}
  var nav=navigator;
  var canvas=safe(function(){var c=document.createElement('canvas');var x=c.getContext('2d');x.textBaseline='top';x.font="14px 'Arial'";x.fillStyle='#f60';x.fillRect(125,1,62,20);x.fillStyle='#069';x.fillText('Byz\\u26a1fp',2,15);x.fillStyle='rgba(102,204,0,0.7)';x.fillText('Byz\\u26a1fp',4,17);return hash(c.toDataURL());});
  var webgl=safe(function(){var c=document.createElement('canvas');var gl=c.getContext('webgl')||c.getContext('experimental-webgl');if(!gl)return null;var d=gl.getExtension('WEBGL_debug_renderer_info');return{vendor:d?gl.getParameter(d.UNMASKED_VENDOR_WEBGL):null,renderer:d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):null,ext:(gl.getSupportedExtensions()||[]).length};});
  // Audio-stack fingerprint: entropy + a tell (headless often differs/zeroes).
  var audio=safe(function(){var AC=window.OfflineAudioContext||window.webkitOfflineAudioContext||window.AudioContext||window.webkitAudioContext;if(!AC)return null;var c=new AC(1,44100,44100);var d=c.destination||{};return hash([c.sampleRate,d.maxChannelCount,d.channelCount,c.baseLatency,typeof c.createAnalyser].join(','));});
  // Installed-font probe: how many of a common set render at non-fallback metrics.
  var fonts=safe(function(){var base=['monospace','sans-serif','serif'];var test=['Arial','Helvetica','Times New Roman','Courier New','Verdana','Georgia','Comic Sans MS','Tahoma','Trebuchet MS','Impact','Calibri','Cambria','Consolas','Segoe UI','Roboto','Ubuntu','Menlo','Monaco','Helvetica Neue','Noto Sans'];var sp=document.createElement('span');sp.style.cssText='font-size:72px;position:absolute;left:-9999px;top:-9999px';sp.textContent='mmmmmmmmmmlli';document.body.appendChild(sp);var def={};base.forEach(function(b){sp.style.fontFamily=b;def[b]={w:sp.offsetWidth,h:sp.offsetHeight};});var n=0;test.forEach(function(ff){var hit=false;base.forEach(function(b){sp.style.fontFamily="'"+ff+"',"+b;if(sp.offsetWidth!==def[b].w||sp.offsetHeight!==def[b].h)hit=true;});if(hit)n++;});document.body.removeChild(sp);return n;});
  // Known automation globals injected by Selenium/Puppeteer/Phantom/etc.
  var automation=safe(function(){var keys=['_phantom','callPhantom','__nightmare','_selenium','__selenium_unwrapped','__webdriver_evaluate','__driver_evaluate','__webdriver_script_fn','__fxdriver_evaluate','domAutomation','domAutomationController','__$webdriverAsyncExecutor','__lastWatirAlert','spawn','emit','Buffer'];var found=[];for(var i=0;i<keys.length;i++){try{if(window[keys[i]]!==undefined)found.push(keys[i]);}catch(e){}}try{for(var k in window){if(/cdc_|\\$cdc|selenium|webdriver|driver_evaluate/i.test(k))found.push(k);}}catch(e){}return found.length?found.slice(0,8):null;});
  // Native-function tampering (puppeteer-stealth patches these — toString stops saying [native code]).
  var tampered=safe(function(){function nat(fn){try{return Function.prototype.toString.call(fn).indexOf('[native code]')>-1;}catch(e){return true;}}var ch=[Function.prototype.bind,HTMLCanvasElement.prototype.toDataURL,nav.permissions&&nav.permissions.query,window.WebGLRenderingContext&&WebGLRenderingContext.prototype.getParameter];for(var i=0;i<ch.length;i++){if(ch[i]&&!nat(ch[i]))return true;}return false;});
  var s={
    screen:safe(function(){return{w:screen.width,h:screen.height,aw:screen.availWidth,ah:screen.availHeight,depth:screen.colorDepth,dpr:window.devicePixelRatio};}),
    tz:safe(function(){return Intl.DateTimeFormat().resolvedOptions().timeZone;}),
    tzOffset:safe(function(){return new Date().getTimezoneOffset();}),
    langs:safe(function(){return nav.languages;}),
    lang0:safe(function(){return nav.language;}),
    platform:safe(function(){return nav.platform;}),
    cores:safe(function(){return nav.hardwareConcurrency;}),
    memory:safe(function(){return nav.deviceMemory;}),
    touch:safe(function(){return nav.maxTouchPoints;}),
    canvas:canvas,
    webgl:webgl,
    webdriver:safe(function(){return nav.webdriver;}),
    plugins:safe(function(){return nav.plugins?nav.plugins.length:0;}),
    uaData:safe(function(){return nav.userAgentData?{brands:nav.userAgentData.brands,mobile:nav.userAgentData.mobile,platform:nav.userAgentData.platform}:null;}),
    cookies:safe(function(){return nav.cookieEnabled;}),
    dnt:safe(function(){return nav.doNotTrack;}),
    visible:safe(function(){return document.visibilityState;}),
    outer:safe(function(){return{w:window.outerWidth,h:window.outerHeight};}),
    inner:safe(function(){return{w:window.innerWidth,h:window.innerHeight};}),
    chrome:safe(function(){return typeof window.chrome!=='undefined';}),
    notif:safe(function(){return (window.Notification&&Notification.permission)||null;}),
    connection:safe(function(){return nav.connection?nav.connection.effectiveType:null;}),
    audio:audio,
    fonts:fonts,
    automation:automation,
    tampered:tampered,
    pdfViewer:safe(function(){return nav.pdfViewerEnabled;})
  };
  // Classic automation tell: the Permissions API disagreeing with
  // Notification.permission (headless Chrome reports 'denied' yet query says 'prompt').
  safe(function(){
    if(nav.permissions&&nav.permissions.query){
      nav.permissions.query({name:'notifications'}).then(function(p){
        s.permState=p.state;
        s.permMismatch=(s.notif==='denied'&&p.state!=='denied');
      }).catch(function(){});
    }
  });
  var fp=hash(JSON.stringify([s.screen,s.tz,s.langs,s.platform,s.cores,s.memory,s.touch,s.canvas,s.webgl,audio,fonts,s.uaData&&s.uaData.platform]));
  var interacted=false;
  ['mousemove','touchstart','scroll','keydown','pointerdown'].forEach(function(ev){window.addEventListener(ev,function(){interacted=true;},{once:true,passive:true});});
  var sent=false;
  function go(){
    if(sent)return; sent=true;
    s.ms=Math.round(((window.performance&&performance.now)?performance.now():0)-t0);
    s.interacted=interacted;
    var body=JSON.stringify({id:ID,fingerprint:fp,visitor_id:fp,signals:s});
    try{navigator.sendBeacon('/api/collect',new Blob([body],{type:'application/json'}));}
    catch(e){try{fetch('/api/collect',{method:'POST',body:body,headers:{'content-type':'application/json'},keepalive:true});}catch(e2){}}
    window.location.replace(DEST);
  }
  // Small delay so the beacon is queued and a fast human gesture can register;
  // a hard timeout guarantees we never strand the visitor on this page.
  setTimeout(go,150);
  setTimeout(go,2500);
})();`;
}

// Full interstitial HTML page. Renders a brief "Redirecting…" with a manual
// link, runs the collector, and falls back to a meta-refresh when JS is off.
export function interstitialHTML(destination: string, clickId: number): string {
  const safeDest = escapeHtml(destination);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Redirecting…</title>
<noscript><meta http-equiv="refresh" content="0;url=${safeDest}"></noscript>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;align-items:center;justify-content:center;background:#0b0b0f;color:#e7e7ea;
       font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  .box{text-align:center}
  .dot{width:8px;height:8px;border-radius:50%;background:#7c5cff;display:inline-block;
       animation:p 1s ease-in-out infinite}
  @keyframes p{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
  a{color:#9a86ff}
</style>
</head>
<body>
  <div class="box">
    <div class="dot"></div>
    <p>Redirecting…</p>
    <p><a href="${safeDest}" rel="noreferrer">Continue &rarr;</a></p>
  </div>
  <script>${collectorScript(destination, clickId)}</script>
</body>
</html>`;
}

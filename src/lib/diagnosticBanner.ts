// Plain-DOM diagnostic banner — no React dependency, so it works even if
// React itself crashes before mounting or before any error boundary exists.
// Used to make otherwise-invisible failures (a stuck loading screen with no
// visible error) show up as readable text at the bottom of the screen,
// since remote screenshots are often the only diagnostic signal available.
export function showDiagnosticBanner(message: string) {
  let banner = document.getElementById('__onemed_diag_banner__');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = '__onemed_diag_banner__';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:999999;background:#7f1d1d;color:#fff;font:12px monospace;padding:8px 12px;max-height:40vh;overflow:auto;white-space:pre-wrap;word-break:break-word;';
    document.body.appendChild(banner);
  }
  const line = document.createElement('div');
  line.style.cssText = 'margin-top:4px;border-top:1px solid rgba(255,255,255,0.2);padding-top:4px;';
  line.textContent = message;
  banner.appendChild(line);
}

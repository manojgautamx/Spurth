// Web fallback for react-native-webview. The native WebView isn't
// implemented on react-native-web at all ("does not support this
// platform"); everywhere in this app it's used to host a self-contained
// Leaflet HTML page, which is exactly what a plain <iframe> is for.
import React, { useRef, useEffect } from 'react';

// react-native-webview's native bridge injects `window.ReactNativeWebView`
// into the page so it can call postMessage(...) back to the app. A browser
// iframe has no such global, so we inject an equivalent shim that forwards
// to window.parent — the app then listens for the resulting `message` event.
const BRIDGE_SCRIPT = `
  <script>
    window.ReactNativeWebView = {
      postMessage: function (data) { window.parent.postMessage(data, '*'); }
    };
  </script>
`;

function buildSrcDoc(html, injectedJavaScript) {
  let doc = html.includes('</head>')
    ? html.replace('</head>', `${BRIDGE_SCRIPT}</head>`)
    : BRIDGE_SCRIPT + html;

  if (injectedJavaScript) {
    const script = `<script>${injectedJavaScript}</script>`;
    doc = doc.includes('</body>') ? doc.replace('</body>', `${script}</body>`) : doc + script;
  }
  return doc;
}

export const WebView = React.forwardRef(function WebView(
  { source, onMessage, injectedJavaScript, style },
  ref
) {
  const iframeRef = useRef(null);
  React.useImperativeHandle(ref, () => iframeRef.current);

  useEffect(() => {
    if (!onMessage) return;
    const handler = (event) => {
      if (iframeRef.current && event.source === iframeRef.current.contentWindow) {
        onMessage({ nativeEvent: { data: event.data } });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMessage]);

  const html = source?.html;
  return (
    <iframe
      ref={iframeRef}
      title="webview"
      {...(html != null
        ? { srcDoc: buildSrcDoc(html, injectedJavaScript) }
        : { src: source?.uri })}
      style={{ border: 'none', width: '100%', height: '100%', ...style }}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    />
  );
});

export default WebView;

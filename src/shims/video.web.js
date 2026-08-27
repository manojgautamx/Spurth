// Web fallback for react-native-video. Mirrors the native <Video> prop/ref
// surface (source, paused, muted, repeat, resizeMode, onLoad, onProgress,
// ref.seek()) with a plain HTML5 <video> so VideoPlayer.js can use the same
// JSX on every platform — same pattern as webview.web.js's <iframe> shim.
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const Video = forwardRef(function Video(
  { source, style, paused, muted, repeat, resizeMode = 'cover', onLoad, onProgress },
  ref
) {
  const videoRef = useRef(null);

  useImperativeHandle(ref, () => ({
    seek: (seconds) => {
      if (videoRef.current) videoRef.current.currentTime = seconds;
    },
  }));

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (paused) el.pause();
    else el.play().catch(() => {}); // browsers reject play() on user-gesture-less autoplay — fine, stays paused
  }, [paused]);

  return (
    <video
      ref={videoRef}
      src={source?.uri}
      style={{
        border: 'none',
        width: '100%',
        height: '100%',
        objectFit: resizeMode === 'contain' ? 'contain' : 'cover',
        ...style,
      }}
      loop={!!repeat}
      muted={muted}
      playsInline
      controls={false}
      onLoadedMetadata={(e) => onLoad && onLoad({ duration: e.target.duration })}
      onTimeUpdate={(e) => onProgress && onProgress({ currentTime: e.target.currentTime })}
    />
  );
});

export default Video;

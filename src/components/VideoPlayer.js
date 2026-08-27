import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder, ActivityIndicator } from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';

// A freshly-uploaded video's first playback often has to wait on
// Cloudinary transcoding the requested delivery format on demand — if
// it's still not ready after this long, tell the viewer why it's slow
// rather than leaving them staring at a spinner with no explanation.
const PROCESSING_HINT_DELAY_MS = 3000;

// Inline post-media video player — Instagram-style controls (tap to
// play/pause, bottom scrubber, mute toggle), not a reels feed: starts
// paused, plays only on explicit tap, one video per card, no
// autoplay-on-scroll/snap behavior.
export default function VideoPlayer({ uri, style }) {
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1
  const [showIcon, setShowIcon] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showProcessingHint, setShowProcessingHint] = useState(false);
  const videoRef = useRef(null);
  const iconTimeout = useRef(null);
  const barWidthRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setShowProcessingHint(true), PROCESSING_HINT_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const flashIcon = () => {
    setShowIcon(true);
    clearTimeout(iconTimeout.current);
    iconTimeout.current = setTimeout(() => setShowIcon(false), 500);
  };

  const togglePlay = () => {
    if (!isReady || hasError) return;
    setPaused((p) => !p);
    flashIcon();
  };

  const seekTo = (ratio) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    if (videoRef.current && duration) {
      videoRef.current.seek(clamped * duration);
    }
    setProgress(clamped);
  };

  const scrubResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => seekTo(evt.nativeEvent.locationX / (barWidthRef.current || 1)),
      onPanResponderMove: (evt) => seekTo(evt.nativeEvent.locationX / (barWidthRef.current || 1)),
    })
  ).current;

  return (
    <TouchableOpacity activeOpacity={1} onPress={togglePlay} style={[styles.container, style]}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        paused={paused}
        muted={muted}
        repeat
        onLoad={(data) => {
          setDuration(data.duration);
          setIsReady(true);
        }}
        onError={() => setHasError(true)}
        onProgress={(data) => {
          if (duration) setProgress(data.currentTime / duration);
        }}
      />

      {hasError ? (
        <View style={styles.centerIconWrap}>
          <Ionicons name="alert-circle-outline" size={26} color="#999" />
          <Text style={styles.statusText}>Couldn't load video</Text>
        </View>
      ) : !isReady ? (
        <View style={styles.centerIconWrap} pointerEvents="none">
          <ActivityIndicator color="#fff" size="small" />
          {showProcessingHint && (
            <Text style={styles.statusText}>Processing video…</Text>
          )}
        </View>
      ) : (
        <>
          {(paused || showIcon) && (
            <View style={styles.centerIconWrap} pointerEvents="none">
              <View style={styles.centerIconBg}>
                <Ionicons name={paused ? 'play' : 'pause'} size={26} color="#fff" />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.muteBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              setMuted((m) => !m);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={15} color="#fff" />
          </TouchableOpacity>

          <View
            style={styles.scrubTrack}
            onLayout={(e) => {
              barWidthRef.current = e.nativeEvent.layout.width;
            }}
            {...scrubResponder.panHandlers}
          >
            <View style={[styles.scrubFill, { width: `${progress * 100}%` }]} />
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  centerIconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusText: {
    color: '#ccc',
    fontSize: 12.5,
  },
  centerIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteBtn: {
    position: 'absolute',
    right: 10,
    bottom: 18,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrubTrack: {
    height: 3,
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  scrubFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
});

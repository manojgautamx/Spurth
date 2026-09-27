import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, PanResponder } from 'react-native';

// Simple pan-to-reposition square (1:1) cropper for a freshly-picked cover
// image — the only crop shape Create Activity offers now (see the ratio
// picker this replaces). Fixed cover-fit zoom, pan only: the image is
// scaled so its SHORTER natural dimension exactly fills the square (the
// same illusion resizeMode="cover" already gave, just now repositionable),
// and dragging moves which part of the photo shows inside it. No pinch-
// zoom — a deliberate v1 scope cut, not an oversight; the natural follow-up
// is a second gesture that raises `scale` above this cover-fit baseline
// before the same clamp math below applies.
//
// There's no separate "confirm crop" step: onCropChange fires once on
// mount/layout (a centered default) and again on every drag, so the
// parent's state is always whatever crop is currently showing — submit
// just reads it.
//
// Built on a plain PanResponder — the same primitive already used once in
// this app (VideoPlayer.js's scrub bar) — not react-native-gesture-handler/
// reanimated, which are installed but have zero usage anywhere else in this
// app's own code. No new dependency, no native linking, and it works on web
// via react-native-web's pointer-event-backed implementation of the same API.
export default function CoverImageCropper({ asset, onCropChange }) {
  const { uri, width: naturalW, height: naturalH } = asset;
  const [viewportSize, setViewportSize] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // PanResponder is created once (useRef(...).current never re-runs), so its
  // callbacks close over whatever `pan`/bounds were in scope at creation —
  // reading the `pan`/`viewportSize` state variables directly inside them
  // would silently use stale values after the very first render. These
  // three refs are the fix: mutated every render (bounds) or at specific
  // gesture moments (pan/gestureStart), always read fresh inside the
  // PanResponder callbacks.
  const panRef = useRef(pan);
  const boundsRef = useRef({ overflowX: 0, overflowY: 0, scale: 1 });
  const gestureStartRef = useRef({ x: 0, y: 0 });

  const scale = viewportSize ? viewportSize / Math.min(naturalW, naturalH) : 1;
  const dispW = naturalW * scale;
  const dispH = naturalH * scale;
  const overflowX = Math.max(0, dispW - viewportSize);
  const overflowY = Math.max(0, dispH - viewportSize);
  boundsRef.current = { overflowX, overflowY, scale };

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Converts the current pan (display pixels) back into the ORIGINAL
  // image's own pixel coordinates — see the plan doc for the worked
  // derivation. The clamp on pan already guarantees the whole S×S
  // viewport is always covered by the image, so the on-screen crop is
  // always exactly S×S; dividing by `scale` gives the same rectangle in
  // source pixels. The final clamp here only guards against floating-
  // point rounding nudging it out of bounds by a pixel.
  const emitCrop = useCallback((p) => {
    const { scale: s } = boundsRef.current;
    const size = Math.round(Math.min(naturalW, naturalH));
    const x = clamp(Math.round(-p.x / s), 0, naturalW - size);
    const y = clamp(Math.round(-p.y / s), 0, naturalH - size);
    onCropChange({ x, y, size });
  }, [naturalW, naturalH, onCropChange]);

  // Re-center whenever the viewport gets a real measurement, or a new
  // image is picked (uri changes).
  useEffect(() => {
    if (!viewportSize) return;
    const centered = { x: -overflowX / 2, y: -overflowY / 2 };
    panRef.current = centered;
    setPan(centered);
    emitCrop(centered);
    // overflowX/overflowY are derived synchronously from viewportSize in
    // this same render, so they're already current whenever this effect
    // re-runs from a viewportSize/uri change — no need to also list them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri, viewportSize, emitCrop]);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        gestureStartRef.current = panRef.current;
      },
      onPanResponderMove: (_evt, gestureState) => {
        const { overflowX: ox, overflowY: oy } = boundsRef.current;
        const next = {
          x: clamp(gestureStartRef.current.x + gestureState.dx, -ox, 0),
          y: clamp(gestureStartRef.current.y + gestureState.dy, -oy, 0),
        };
        panRef.current = next;
        setPan(next);
      },
      onPanResponderRelease: () => emitCrop(panRef.current),
      onPanResponderTerminate: () => emitCrop(panRef.current),
    })
  ).current;

  return (
    <View
      style={styles.viewport}
      onLayout={(e) => setViewportSize(e.nativeEvent.layout.width)}
      {...responder.panHandlers}
    >
      {viewportSize > 0 && (
        <Image
          source={{ uri }}
          style={[styles.image, { width: dispW, height: dispH, left: pan.x, top: pan.y }]}
          resizeMode="cover"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
  },
  image: {
    position: 'absolute',
  },
});

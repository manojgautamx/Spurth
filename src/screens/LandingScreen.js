// Marketing landing page — web only (see AppNavigator's Platform.OS-gated
// initialRouteName). Native builds skip straight to WelcomeScreen; a pitch
// page doesn't make sense inside an already-installed app.
//
// Implements the "Spurth Landing.dc.html" design pulled from claude.ai/design
// (project 1abe1348-be64-4b4c-bb5e-36bd5820242e). That file's <image-slot>
// placeholders were never filled with real photos (.image-slots.state.json
// was empty), so images here come from a small pool of verified-working
// Unsplash photo IDs (same CDN host pattern as src/constants/heroImages.js),
// picked per keyword via a deterministic hash — source.unsplash.com's old
// keyword-search redirect now 503s (deprecated in 2023).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import Svg, { Rect, Path, Circle, G } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { Fonts } from '../theme/fonts';
import { useIsWideWeb } from '../utils/responsive';

const LOGO_RATIO = 1862 / 489;
function Logo({ height = 28 }) {
  return (
    <Image
      source={require('../assets/logotext.png')}
      style={{ height, width: height * LOGO_RATIO }}
      resizeMode="contain"
    />
  );
}

const ACCENT = '#6C5CE7';
const BG = '#0A0A0C';
const SURFACE = '#121216';
const RAISE = '#17171D';
const LINE = 'rgba(255,255,255,0.09)';
const MUTE = '#8C8C97';

const UNSPLASH_POOL = [
  '1517649763962-0c623066013b', '1461896836934-ffe607ba8211', '1552674605-db6ffd4facb5',
  '1571019613454-1cb2f99b2d8b', '1600880292203-757bb62b4baf', '1500673922987-e212871fec22',
  '1523240795612-9a054b0db644', '1521737604893-d14cc237f11d', '1552664730-d307ca884978',
  '1517457373958-b7bdd4587205', '1543269865-cbf427effbad', '1470229722913-7c0e2dbbafd3',
  '1591370874773-6702e8f12fd8', '1519501025264-65ba15a82390', '1543007630-9710e4a00a20',
  '1556761175-5973dc0f32e7', '1531482615713-2afd69097998', '1509233725247-49e657c54213',
  '1487956382158-bb926046304a', '1519750783826-e2420f4d687f',
];

const unsplash = (keywords, w = 800, h = 600) => {
  let hash = 0;
  for (let i = 0; i < keywords.length; i++) hash = (hash * 31 + keywords.charCodeAt(i)) | 0;
  const id = UNSPLASH_POOL[Math.abs(hash) % UNSPLASH_POOL.length];
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=80`;
};

const STORY_STEPS = [
  { n: '01', title: 'Find something nearby', body: "Open the app, see what's actually happening within walking distance today.", img: unsplash('walking,city,street', 900, 700) },
  { n: '02', title: 'Find your people', body: "See who's going and what they're into before you commit. No cold rooms.", img: unsplash('friends,group,laughing', 900, 700) },
  { n: '03', title: 'Make it happen', body: 'Show up, do the thing, then post it back so the next person finds it.', img: unsplash('friends,celebrating,activity', 900, 700) },
];

const CATEGORIES = {
  sports: { label: 'Sports', sub: '148 activities · futsal, climbing, laps', img: unsplash('futsal,sports', 900, 800) },
  adventure: { label: 'Adventure', sub: '62 activities', img: unsplash('hiking,mountain', 700, 400) },
  gaming: { label: 'Gaming', img: unsplash('gaming,esports', 500, 400) },
  arts: { label: 'Arts', img: unsplash('pottery,ceramics', 500, 400) },
  lifestyle: { label: 'Lifestyle', img: unsplash('rooftop,dinner', 500, 400) },
  tech: { label: 'Tech', sub: 'Build nights, demo evenings, repair cafés', img: unsplash('hackathon,coding', 900, 400) },
};

const NEARBY_DOTS = [
  { left: '26%', top: '22%', label: 'Pickup futsal · 12 going' },
  { left: '63%', top: '16%', label: 'Study room, open now' },
  { left: '70%', top: '62%', label: 'Sunset bouldering' },
  { left: '18%', top: '70%', label: 'Board games night' },
];

const FAQS = [
  { q: 'Is Spurth free to use?', a: "Discovering, joining and creating activities is free. Some hosts charge for their own costs — venue, gear, entry — and that's shown on the activity before you join." },
  { q: 'Do I have to know someone to join?', a: "No. Most people arrive on their own. You can see who else is going and what they're into before you commit." },
  { q: 'Is my exact location shared?', a: 'No. Spurth uses an approximate area to sort activities by distance. Precise meeting points are only visible to people who have joined.' },
  { q: 'What are Experiences?', a: 'Posts made after an activity — photos and a few words, linked back to the activity they came from, so the next person can find it and join.' },
];

function Section({ children, style }) {
  return <View style={[styles.section, style]}>{children}</View>;
}

function InitialsAvatar({ text, size = 28, bg = '#2A2A33', color = '#ccc', style }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: 99, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ color, fontSize: size * 0.36, fontFamily: Fonts.bold }}>{text}</Text>
    </View>
  );
}

function CategoryCard({ item, style, big, scrollY, scrollOffsetRef, reduced, index = 0, from = 'up', distance = 46, rotateFrom = 0 }) {
  return (
    <Reveal
      scrollY={scrollY}
      scrollOffsetRef={scrollOffsetRef}
      reduced={reduced}
      from={from}
      distance={distance}
      rotateFrom={rotateFrom}
      delay={index * 26}
      style={style}
      innerStyle={[styles.catCard, StyleSheet.absoluteFillObject]}
    >
      <Image source={{ uri: item.img }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(6,6,8,0.05)', 'rgba(6,6,8,0.88)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.catCardLabel}>
        <Text style={[styles.catCardTitle, big && { fontSize: 34 }]}>{item.label}</Text>
        {item.sub ? <Text style={styles.catCardSub}>{item.sub}</Text> : null}
      </View>
    </Reveal>
  );
}

function useViewportHeight() {
  const [h, setH] = useState(() => Dimensions.get('window').height);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setH(window.height));
    return () => sub?.remove?.();
  }, []);
  return h;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
    return () => (mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange));
  }, []);
  return reduced;
}

// Measures an element's absolute document position once, so scroll-tied
// animations can compute "how far until this enters/leaves the viewport"
// purely from the live scrollY value (Animated has no synchronous read,
// hence the scrollOffsetRef mirror kept alongside scrollY).
function useScrollTop(scrollOffsetRef) {
  const ref = useRef(null);
  const [top, setTop] = useState(null);
  useEffect(() => {
    const id = setTimeout(() => {
      if (ref.current && ref.current.measureInWindow) {
        ref.current.measureInWindow((x, y) => setTop(y + (scrollOffsetRef.current || 0)));
      }
    }, 50);
    return () => clearTimeout(id);
  }, []);
  return [ref, top];
}

// Resolves a scroll-progress Animated value (0→1, or null before it's
// measured) to a concrete style value, collapsing to the resting value
// immediately when reduced-motion is on instead of animating to it.
function settle(progress, reduced, from, to) {
  if (reduced) return to;
  if (progress == null) return from;
  return progress.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
}
function settleDeg(progress, reduced, fromDeg, toDeg) {
  if (reduced) return `${toDeg}deg`;
  if (progress == null) return `${fromDeg}deg`;
  return progress.interpolate({ inputRange: [0, 1], outputRange: [`${fromDeg}deg`, `${toDeg}deg`] });
}

// Generic scroll-progress entrance: children ease in (opacity, a slide from
// one direction, a slight scale, an optional rotation settling to its final
// resting angle) as the page scrolls them into view. Tied continuously to
// scrollY rather than firing once, so it reads as physical motion instead
// of a triggered CSS animation. Outer plain View holds the measurement ref
// and the caller's sizing (so flex/height layout is untouched); inner
// Animated.View carries the actual motion.
function Reveal({ children, scrollY, scrollOffsetRef, reduced, style, innerStyle, from = 'up', distance = 46, delay = 0, rotateFrom = 0, rotateTo = 0 }) {
  const viewportH = useViewportHeight();
  const [ref, top] = useScrollTop(scrollOffsetRef);

  // Reveal window is anchored to when the element is actually entering the
  // viewport (top edge ~90% down the screen) and finishes well before it
  // would need to scroll back out the top, so nothing sits blank waiting
  // for a scroll position it'll never comfortably reach. `delay` staggers
  // siblings but is capped relative to viewport height so a long index
  // list can never push the reveal past the visible window.
  const safeDelay = Math.min(delay, viewportH * 0.2);
  const progress = (reduced || top == null) ? null : scrollY.interpolate({
    inputRange: [top - viewportH * 0.92 + safeDelay, top - viewportH * 0.58 + safeDelay],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const axisKey = from === 'left' || from === 'right' ? 'translateX' : 'translateY';
  const fromVal = from === 'left' ? -distance : from === 'right' ? distance : from === 'down' ? -distance : distance;

  return (
    <View ref={ref} style={style}>
      <Animated.View
        style={[innerStyle, {
          opacity: settle(progress, reduced, 0, 1),
          transform: [
            { [axisKey]: settle(progress, reduced, fromVal, 0) },
            { scale: settle(progress, reduced, 0.94, 1) },
            { rotate: settleDeg(progress, reduced, rotateFrom, rotateTo) },
          ],
        }]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

// Ties an image's vertical offset to page scroll position for a subtle
// parallax effect — the image is oversized within an overflow:hidden box so
// the drift never reveals an edge.
function ParallaxPhoto({ uri, height, scrollY, scrollOffsetRef, amount = 36, style }) {
  const [ref, top] = useScrollTop(scrollOffsetRef);

  const translateY = top == null
    ? 0
    : scrollY.interpolate({
        inputRange: [top - 700, top + height + 700],
        outputRange: [-amount, amount],
        extrapolate: 'clamp',
      });

  return (
    <View ref={ref} style={[{ height, borderRadius: 24, overflow: 'hidden', backgroundColor: RAISE }, style]}>
      <Animated.Image
        source={{ uri }}
        resizeMode="cover"
        style={{ position: 'absolute', left: 0, right: 0, top: -amount, height: height + amount * 2, transform: [{ translateY }] }}
      />
    </View>
  );
}

// The character floats free with no background panel: a continuous gentle
// up-down bob (loops forever, like MapPulse below) suggests flight, layered
// on top of the one-time scroll entrance passed in via `style`.
function FlyingCharacter({ style, reduced, imgStyle }) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced]);
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [10, -10] });

  return (
    <Animated.View style={{ opacity: style.opacity, transform: [...style.transform, { translateY: bobY }] }}>
      <Image source={require('../assets/character.png')} style={imgStyle} resizeMode="contain" />
    </Animated.View>
  );
}

function MapPulse() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, { toValue: 2.4, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={[styles.mapPinPulse, { transform: [{ scale }], opacity }]} />
  );
}

function FaqItem({ f, open, onPress, isWide }) {
  const anim = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: open ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [open]);
  return (
    <TouchableOpacity
      style={[styles.faqItem, isWide && { width: '48%' }]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{f.q}</Text>
        <Ionicons name={open ? 'remove' : 'add'} size={20} color={ACCENT} />
      </View>
      {open && (
        <Animated.Text
          style={[styles.faqA, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}
        >
          {f.a}
        </Animated.Text>
      )}
    </TouchableOpacity>
  );
}

export default function LandingScreen({ navigation }) {
  const isWide = useIsWideWeb();
  const [openFaq, setOpenFaq] = useState(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollOffsetRef = useRef(0);
  const reduced = usePrefersReducedMotion();
  const viewportH = useViewportHeight();

  const goJoin = () => navigation.navigate('Welcome');
  const goLogin = () => navigation.navigate('Login');

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true, listener: (e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; } }
  );

  // Hero — headline stays put; everything around it drifts at its own speed
  // as the user leaves the top of the page, so it reads as layered rather
  // than flat. Always defined (no measurement lag) since it's driven off
  // raw scrollY, and the hero is always at the top of the document.
  const heroLeadStyle = reduced ? null : {
    transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 700], outputRange: [0, 22], extrapolate: 'clamp' }) }],
  };
  const heroImgStyle = reduced ? null : {
    opacity: scrollY.interpolate({ inputRange: [0, 500, 750], outputRange: [1, 1, 0.55], extrapolate: 'clamp' }),
    transform: [
      { translateY: scrollY.interpolate({ inputRange: [0, 700], outputRange: [0, -60], extrapolate: 'clamp' }) },
      { scale: scrollY.interpolate({ inputRange: [0, 700], outputRange: [1, 0.92], extrapolate: 'clamp' }) },
    ],
  };
  const heroAvatarStyle = reduced ? null : {
    transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 700], outputRange: [0, 42], extrapolate: 'clamp' }) }],
  };

  // Statement banner — cinematic: the image slowly de-zooms as it crosses
  // the viewport, the overlay lightens, the line settles up slightly.
  const [stmtRef, stmtTop] = useScrollTop(scrollOffsetRef);
  const stmtHeight = isWide ? 460 : 320;
  const stmtProgress = (reduced || stmtTop == null) ? null : scrollY.interpolate({
    inputRange: [stmtTop - viewportH, stmtTop + stmtHeight * 0.6],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const stmtImgScale = settle(stmtProgress, reduced, 1.18, 1);
  const stmtOverlayOpacity = settle(stmtProgress, reduced, 1, 0.78);
  const stmtTextTranslate = settle(stmtProgress, reduced, 26, -6);

  // Nearby map — rises into place, then its ambient "something's
  // happening" dots light up one after another instead of all at once.
  const [mapRef, mapTop] = useScrollTop(scrollOffsetRef);
  const mapProgress = (reduced || mapTop == null) ? null : scrollY.interpolate({
    inputRange: [mapTop - viewportH * 0.75, mapTop - viewportH * 0.3],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const mapRiseStyle = { opacity: settle(mapProgress, reduced, 0, 1), transform: [{ translateY: settle(mapProgress, reduced, 46, 0) }] };
  const mapDotStyle = (i) => {
    const d = i * 0.18;
    if (reduced) return { opacity: 1, transform: [{ scale: 1 }] };
    if (mapProgress == null) return { opacity: 0, transform: [{ scale: 0.4 }] };
    const o = mapProgress.interpolate({ inputRange: [d, Math.min(1, d + 0.35)], outputRange: [0, 1], extrapolate: 'clamp' });
    return { opacity: o, transform: [{ scale: o.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] };
  };

  // Create — one-time entrance the first time the character scrolls into
  // view (flies in from the left with a little cape-flutter rotation);
  // FlyingCharacter layers its own continuous bob on top of this. The
  // headline and CTA rise in underneath it.
  const [createRef, createTop] = useScrollTop(scrollOffsetRef);
  const createProgress = (reduced || createTop == null) ? null : scrollY.interpolate({
    inputRange: [createTop - viewportH * 0.8, createTop - viewportH * 0.35],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const charStyle = {
    opacity: settle(createProgress, reduced, 0, 1),
    transform: [
      { translateX: settle(createProgress, reduced, -90, 0) },
      { rotate: settleDeg(createProgress, reduced, -5, 0) },
      { scale: settle(createProgress, reduced, 0.9, 1) },
    ],
  };
  const bodyStyle = {
    opacity: settle(createProgress, reduced, 0, 1),
    transform: [{ translateY: settle(createProgress, reduced, 24, 0) }],
  };
  const fieldStyle = (d) => {
    if (reduced) return { opacity: 1 };
    if (createProgress == null) return { opacity: 0, transform: [{ translateY: 14 }] };
    const o = createProgress.interpolate({ inputRange: [d, Math.min(1, d + 0.3)], outputRange: [0, 1], extrapolate: 'clamp' });
    return { opacity: o, transform: [{ translateY: o.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] };
  };

  // Final CTA — the closing shot: image settles from a slight zoom, the
  // overlay eases back, the line and button land last.
  const [finalRef, finalTop] = useScrollTop(scrollOffsetRef);
  const finalHeight = isWide ? 600 : 340;
  const finalProgress = (reduced || finalTop == null) ? null : scrollY.interpolate({
    inputRange: [finalTop - viewportH * 0.7, finalTop + finalHeight * 0.25],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const finalImgScale = settle(finalProgress, reduced, 1.12, 1);
  const finalOverlayOpacity = settle(finalProgress, reduced, 1, 0.85);
  const finalTextOpacity = settle(finalProgress, reduced, 0, 1);
  const finalTextTranslate = settle(finalProgress, reduced, 22, 0);
  const finalBtnOpacity = reduced ? 1 : (finalProgress == null ? 0 : finalProgress.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp' }));
  const finalBtnTranslate = reduced ? 0 : (finalProgress == null ? 14 : finalProgress.interpolate({ inputRange: [0.4, 1], outputRange: [14, 0], extrapolate: 'clamp' }));

  return (
    <Animated.ScrollView
      style={styles.root}
      contentContainerStyle={styles.rootContent}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {/* NAV */}
      <View style={styles.nav}>
        <Section style={styles.navInner}>
          <View style={styles.navBrand}>
            <Logo height={26} />
          </View>
          {isWide && (
            <View style={styles.navLinks}>
              <Text style={styles.navLink}>Activities</Text>
              <Text style={styles.navLink}>How it works</Text>
              <Text style={styles.navLink}>Experiences</Text>
              <Text style={styles.navLink}>Nearby</Text>
            </View>
          )}
          <View style={styles.navActions}>
            <TouchableOpacity onPress={goLogin} style={styles.navLoginBtn} activeOpacity={0.8}>
              <Text style={styles.navLoginText}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goJoin} style={styles.navJoinBtn} activeOpacity={0.85}>
              <Text style={styles.navJoinText}>Get the app</Text>
            </TouchableOpacity>
          </View>
        </Section>
      </View>

      {/* HERO */}
      <Section style={{ marginTop: isWide ? 72 : 40 }}>
        <View style={[styles.heroTopRow, !isWide && { flexDirection: 'column' }]}>
          <View style={{ flex: 1, maxWidth: isWide ? 660 : undefined }}>
            <Text style={[styles.h1, { fontSize: isWide ? 72 : 42 }]}>Find something{'\n'}worth doing.</Text>
            <Animated.Text style={[styles.lead, heroLeadStyle]}>
              Discover activities around you, meet people who are into the same things, and make experiences worth sharing.
            </Animated.Text>
            <View style={styles.heroCtaRow}>
              <TouchableOpacity onPress={goJoin} style={styles.ctaFilled} activeOpacity={0.85}>
                <Text style={styles.ctaFilledText}>Explore Activities</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goJoin} style={styles.ctaOutline} activeOpacity={0.85}>
                <Text style={styles.ctaOutlineText}>Create an Activity</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isWide && (
            <View style={styles.heroSideCol}>
              <Animated.View style={[styles.heroSideImg, heroImgStyle]}>
                <Image source={{ uri: unsplash('friends,bouldering,film', 580, 420) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </Animated.View>
              <Animated.View style={[styles.heroAvatarRow, heroAvatarStyle]}>
                <View style={styles.avatarStack}>
                  <InitialsAvatar text="AR" size={28} bg="#2A2A33" style={{ borderWidth: 2, borderColor: BG }} />
                  <InitialsAvatar text="NK" size={28} bg="#33323F" style={{ borderWidth: 2, borderColor: BG, marginLeft: -9 }} />
                  <InitialsAvatar text="+9" size={28} bg={ACCENT} color="#fff" style={{ borderWidth: 2, borderColor: BG, marginLeft: -9 }} />
                </View>
                <Text style={styles.heroAvatarCaption}>joined something{'\n'}in the last hour</Text>
              </Animated.View>
            </View>
          )}
        </View>
      </Section>

      {/* ACTIVITIES */}
      <Section id="activities" style={{ marginTop: isWide ? 120 : 80 }}>
        <View style={[styles.rowBetween, !isWide && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Text style={[styles.h2, { fontSize: isWide ? 62 : 34 }]}>Whatever you're into.</Text>
          <Text style={[styles.leadSmall, { maxWidth: 330, marginTop: isWide ? 0 : 12 }]}>
            Seven worlds, one feed. Follow the ones you care about and Spurth keeps them close.
          </Text>
        </View>

        {isWide ? (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <CategoryCard item={CATEGORIES.sports} big style={{ flex: 1, height: 414 }} scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} index={0} from="up" distance={60} />
              <View style={{ flex: 1, gap: 14 }}>
                <CategoryCard item={CATEGORIES.adventure} style={{ height: 200 }} scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} index={1} from="right" distance={50} rotateFrom={-2} />
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <CategoryCard item={CATEGORIES.gaming} style={{ flex: 1, height: 200 }} scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} index={2} from="down" distance={40} rotateFrom={2} />
                  <CategoryCard item={CATEGORIES.arts} style={{ flex: 1, height: 200 }} scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} index={3} from="down" distance={40} rotateFrom={-2} />
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <Reveal scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} from="left" distance={40} rotateFrom={1.4} delay={104} style={{ flex: 1, height: 200 }} innerStyle={[styles.educationCard, { flex: 1 }]}>
                <Text style={styles.educationTitle}>Education</Text>
                <Text style={styles.educationBody}>Study rooms, language swaps, weekend workshops.</Text>
              </Reveal>
              <CategoryCard item={CATEGORIES.lifestyle} style={{ flex: 1, height: 200 }} scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} index={5} from="up" distance={36} rotateFrom={-1.5} />
              <CategoryCard item={CATEGORIES.tech} style={{ flex: 2, height: 200 }} scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} index={6} from="right" distance={46} rotateFrom={1} />
            </View>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <CategoryCard item={CATEGORIES.sports} big style={{ width: '100%', height: 220 }} scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} index={0} from="up" distance={40} />
            <CategoryCard item={CATEGORIES.adventure} style={{ width: '100%', height: 190 }} scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} index={1} from="up" distance={36} />
            <CategoryCard item={CATEGORIES.gaming} style={{ width: '100%', height: 190 }} scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} index={2} from="up" distance={36} />
            <CategoryCard item={CATEGORIES.arts} style={{ width: '100%', height: 190 }} scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} index={3} from="up" distance={36} />
            <Reveal scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} from="up" distance={36} delay={104} style={{ width: '100%', height: 150 }} innerStyle={[styles.educationCard, { flex: 1 }]}>
              <Text style={styles.educationTitle}>Education</Text>
              <Text style={styles.educationBody}>Study rooms, language swaps, weekend workshops.</Text>
            </Reveal>
            <CategoryCard item={CATEGORIES.lifestyle} style={{ width: '100%', height: 190 }} scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} index={5} from="up" distance={36} />
            <CategoryCard item={CATEGORIES.tech} style={{ width: '100%', height: 190 }} scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} index={6} from="up" distance={36} />
          </View>
        )}
      </Section>

      {/* STORY — three scroll-parallax photo sections, no fake UI */}
      <Section id="story" style={{ marginTop: isWide ? 140 : 80 }}>
        <View style={{ gap: isWide ? 60 : 44 }}>
          {STORY_STEPS.map((s) => (
            <View key={s.n} style={[styles.parallaxRow, !isWide && { flexDirection: 'column' }]}>
              <Reveal
                scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced}
                from="up" distance={22} delay={0}
                style={isWide ? { flex: 0.9 } : { width: '100%' }}
                innerStyle={styles.parallaxCopy}
              >
                <Text style={styles.storyNum}>{s.n}</Text>
                <Text style={styles.storyTitle}>{s.title}</Text>
                <Text style={styles.storyBody}>{s.body}</Text>
              </Reveal>
              <Reveal
                scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced}
                from={!isWide ? 'up' : 'right'}
                distance={isWide ? 70 : 40}
                delay={60}
                style={isWide ? { flex: 1.1, height: 360 } : { width: '100%', height: 240 }}
                innerStyle={{ flex: 1 }}
              >
                <ParallaxPhoto
                  uri={s.img}
                  height={isWide ? 360 : 240}
                  scrollY={scrollY}
                  scrollOffsetRef={scrollOffsetRef}
                  style={{ flex: 1 }}
                />
              </Reveal>
            </View>
          ))}
        </View>
      </Section>

      {/* EXPERIENCES */}
      <View id="experiences" style={[styles.expBand, { marginTop: isWide ? 140 : 80 }]}>
        <Section>
          <View style={[styles.rowBetween, !isWide && { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={[styles.h2, { fontSize: isWide ? 46 : 30, maxWidth: 640 }]}>
              Every experience starts{isWide ? '\n' : ' '}with an activity.
            </Text>
            <TouchableOpacity onPress={goJoin} style={styles.ctaOutlineLight}>
              <Text style={styles.ctaOutlineLightText}>See the feed</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.expGrid, !isWide && { flexDirection: 'column' }]}>
            {/* Column 1 */}
            <View style={[styles.expCol, isWide && { width: '24%' }]}>
              <Reveal scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} from="left" rotateFrom={8} rotateTo={1.2} delay={0} innerStyle={styles.expCard}>
                <View style={styles.expImageWrap}>
                  <Image source={{ uri: unsplash('sweaty,group,futsal', 500, 460) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                </View>
                <View style={{ padding: 15 }}>
                  <View style={styles.expHeader}>
                    <InitialsAvatar text="AR" size={28} bg="#33323F" />
                    <Text style={styles.expUser}>Aarav R. <Text style={styles.expUserTime}>· 2h</Text></Text>
                  </View>
                  <Text style={styles.expQuote}>"Turned up alone to a 6 a-side and left with a WhatsApp group of nine."</Text>
                  <View style={styles.expFooter}>
                    <Ionicons name="heart" size={12} color={ACCENT} />
                    <Text style={styles.expFooterText}>214 · linked to <Text style={{ color: '#DEDEE4', fontFamily: Fonts.semibold }}>Sunday 6 a-side</Text></Text>
                  </View>
                </View>
              </Reveal>
              <Reveal scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} from="left" rotateFrom={-10} rotateTo={-1.6} delay={54} style={{ height: 180 }} innerStyle={[styles.expPhotoOnly, { height: 180 }]}>
                <Image source={{ uri: unsplash('bus,window,travel', 500, 380) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </Reveal>
            </View>

            {/* Column 2 */}
            <View style={[styles.expCol, isWide && { width: '24%', marginTop: 34 }]}>
              <Reveal scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} from="up" rotateFrom={-9} rotateTo={-1.4} delay={17} innerStyle={styles.expHighlightCard}>
                <View style={styles.expHeader}>
                  <InitialsAvatar text="PL" size={28} bg="rgba(20,20,25,0.1)" color="#141419" />
                  <Text style={[styles.expUser, { color: '#141419' }]}>Prisha L. <Text style={[styles.expUserTime, { color: 'rgba(20,20,25,0.55)' }]}>· yesterday</Text></Text>
                </View>
                <Text style={styles.expHighlightQuote}>"I moved here in March and knew nobody. Fourteen activities later my weekends are full."</Text>
                <View style={[styles.expFooter, { borderTopWidth: 0, marginTop: 16, paddingTop: 0 }]}>
                  <Text style={[styles.expFooterText, { color: ACCENT, fontFamily: Fonts.semibold }]}>♥ 512 · Pottery, beginners</Text>
                </View>
              </Reveal>
              <Reveal scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} from="up" rotateFrom={8} rotateTo={1.1} delay={70} style={{ height: 300 }} innerStyle={[styles.expPhotoOnly, { height: 300 }]}>
                <Image source={{ uri: unsplash('pottery,hands,clay', 500, 620) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </Reveal>
              <Reveal scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} from="up" rotateFrom={-7} rotateTo={-0.9} delay={125} innerStyle={[styles.expCard, { padding: 18 }]}>
                <View style={styles.expHeader}>
                  <InitialsAvatar text="KT" size={28} bg="#2E2E38" />
                  <Text style={styles.expUser}>Kiran T. <Text style={styles.expUserTime}>· 3d</Text></Text>
                </View>
                <Text style={styles.expQuote}>"Hosted a chess table in the park expecting two people. Sixteen showed up."</Text>
                <Text style={[styles.expFooterText, { marginTop: 12 }]}>♥ 189 · Chess in the park</Text>
              </Reveal>
            </View>

            {/* Column 3 */}
            <View style={[styles.expCol, isWide && { width: '24%' }]}>
              <Reveal scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} from="right" rotateFrom={-9} rotateTo={-1.2} delay={33} style={{ height: 320 }} innerStyle={[styles.expPhotoOnly, { height: 320 }]}>
                <Image source={{ uri: unsplash('hike,summit,backlit', 500, 660) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <View style={styles.expPhotoOverlay}>
                  <Text style={styles.expPhotoOverlayTitle}>Sunrise hike to Shivapuri</Text>
                  <Text style={styles.expPhotoOverlaySub}>23 went · 41 photos shared</Text>
                </View>
              </Reveal>
              <Reveal scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} from="right" rotateFrom={9} rotateTo={1.3} delay={87} innerStyle={[styles.expCard, { padding: 18 }]}>
                <View style={styles.expHeader}>
                  <InitialsAvatar text="SM" size={28} bg="#46445A" />
                  <Text style={styles.expUser}>Sneha M. <Text style={styles.expUserTime}>· 5d</Text></Text>
                </View>
                <Text style={styles.expQuote}>"Left the house at 4 a.m. with five strangers. Watched the valley wake up."</Text>
                <Text style={[styles.expFooterText, { marginTop: 12 }]}>♥ 331 · Sunrise hike to Shivapuri</Text>
              </Reveal>
              <Reveal scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} from="right" rotateFrom={10} rotateTo={1.5} delay={140} style={{ height: 170 }} innerStyle={[styles.expPhotoOnly, { height: 170 }]}>
                <Image source={{ uri: unsplash('tea,break,conversation', 500, 340) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </Reveal>
            </View>

            {/* Column 4 */}
            <View style={[styles.expCol, isWide && { width: '24%', marginTop: 52 }]}>
              <Reveal scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} from="down" rotateFrom={-8} rotateTo={-1.1} delay={50} style={{ height: 260 }} innerStyle={[styles.expPhotoOnly, { height: 260 }]}>
                <Image source={{ uri: unsplash('screen,lit,gaming,night', 500, 520) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </Reveal>
              <Reveal scrollY={scrollY} scrollOffsetRef={scrollOffsetRef} reduced={reduced} from="down" rotateFrom={-9} rotateTo={-1.4} delay={104} innerStyle={[styles.expCard, { padding: 18 }]}>
                <View style={styles.expHeader}>
                  <InitialsAvatar text="DJ" size={28} bg="#3A3947" />
                  <Text style={styles.expUser}>Dev J. <Text style={styles.expUserTime}>· 1w</Text></Text>
                </View>
                <Text style={styles.expQuote}>"Found a 5-stack that actually communicates. We've played every Friday since."</Text>
                <Text style={[styles.expFooterText, { marginTop: 12 }]}>♥ 96 · Valorant 5-stack</Text>
              </Reveal>
            </View>
          </View>
        </Section>
      </View>

      {/* BRAND STATEMENT — cinematic: image de-zooms as it crosses the
          viewport rather than just fading in. */}
      <View ref={stmtRef} style={[styles.statement, { marginTop: isWide ? 140 : 80, height: stmtHeight }]}>
        <Animated.Image
          source={{ uri: unsplash('group,walking,dusk', 1400, 700) }}
          style={[StyleSheet.absoluteFillObject, { transform: [{ scale: stmtImgScale }] }]}
          resizeMode="cover"
        />
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: stmtOverlayOpacity }]}>
          <LinearGradient
            colors={['rgba(8,8,10,0.92)', 'rgba(8,8,10,0.3)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
        <Animated.View style={[styles.statementInner, { transform: [{ translateY: stmtTextTranslate }] }]}>
          <Text style={[styles.statementText, { fontSize: isWide ? 64 : 34 }]}>
            Less scrolling.{'\n'}<Text style={{ color: ACCENT }}>More doing.</Text>
          </Text>
        </Animated.View>
      </View>

      {/* NEARBY */}
      <Section id="nearby" style={{ marginTop: isWide ? 140 : 80 }}>
        <View style={[styles.rowBetween, !isWide && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <View style={{ maxWidth: 520 }}>
            <Text style={[styles.h2, { fontSize: isWide ? 58 : 30 }]}>Something is happening near you.</Text>
          </View>
          <TouchableOpacity onPress={goJoin} style={[styles.ctaFilled, !isWide && { marginTop: 18 }]}>
            <Text style={styles.ctaFilledText}>Explore Nearby</Text>
          </TouchableOpacity>
        </View>

        <View ref={mapRef} style={[styles.mapBox, { height: isWide ? 560 : 340 }]}>
          <Animated.View style={[StyleSheet.absoluteFillObject, mapRiseStyle]}>
            <Svg width="100%" height="100%" viewBox="0 0 1200 560" preserveAspectRatio="none" style={StyleSheet.absoluteFillObject}>
              <Rect width="1200" height="560" fill="#0C0C10" />
              <G stroke="#1B1B22" strokeWidth="1">
                <Path d="M0 90H1200M0 210H1200M0 330H1200M0 450H1200" />
                <Path d="M120 0V560M300 0V560M480 0V560M660 0V560M840 0V560M1020 0V560" />
              </G>
              <G stroke="#23232C" strokeWidth="7" strokeLinecap="round" fill="none">
                <Path d="M-20 300 Q 280 250 520 320 T 1220 260" />
                <Path d="M400 -20 Q 460 200 380 380 T 460 580" />
                <Path d="M760 -20 L 820 560" />
                <Path d="M0 470 L 1200 430" />
              </G>
              <Path d="M60 60 L 260 40 L 300 170 L 90 200 Z" fill="#12131A" stroke="#1F2029" />
              <Path d="M900 340 L 1140 320 L 1180 500 L 940 520 Z" fill="#101519" stroke="#1B2228" />
              <Circle cx="600" cy="280" r="150" fill={ACCENT} fillOpacity={0.07} />
              <Circle cx="600" cy="280" r="150" fill="none" stroke={ACCENT} strokeOpacity={0.22} strokeDasharray="6 8" />
            </Svg>

            <View style={styles.mapPin} pointerEvents="none">
              <MapPulse />
              <View style={styles.mapPinDot} />
            </View>

            {/* A few glowing dots with a short made-up activity name each —
                "what's happening around", light-touch, not a full card —
                that light up one after another. */}
            {NEARBY_DOTS.map((p, i) => (
              <React.Fragment key={i}>
                <Animated.View pointerEvents="none" style={[styles.mapDot, p, mapDotStyle(i)]} />
                <Animated.View pointerEvents="none" style={[styles.mapLabel, { left: p.left, top: p.top }, mapDotStyle(i)]}>
                  <Text style={styles.mapLabelText}>{p.label}</Text>
                </Animated.View>
              </React.Fragment>
            ))}
          </Animated.View>
        </View>
      </Section>

      {/* CREATE — the character floats free (no panel/box), with a
          continuous gentle bob suggesting flight, plus a one-time
          horizontal entrance the first time it scrolls into view. */}
      <Section id="create" style={{ marginTop: isWide ? 140 : 80 }}>
        <View ref={createRef}>
          <FlyingCharacter
            reduced={reduced}
            style={charStyle}
            imgStyle={{ width: isWide ? 480 : 300, aspectRatio: 3168 / 1344, alignSelf: 'center' }}
          />

          <Animated.View style={[styles.heroCharCopy, bodyStyle]}>
            <Text style={[styles.h2, styles.heroCharHeadline, { fontSize: isWide ? 46 : 28 }]}>
              Can't find your thing?{'\n'}
              <Text style={{ color: ACCENT }}>Start now. Be the hero the world needs.</Text>
            </Text>

            <Animated.View style={[{ marginTop: 30, alignSelf: 'center' }, fieldStyle(0.4)]}>
              <TouchableOpacity onPress={goJoin} style={styles.ctaFilled} activeOpacity={0.85}>
                <Text style={styles.ctaFilledText}>Create an Activity</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      </Section>

      {/* FAQ */}
      <Section style={{ marginTop: isWide ? 140 : 80 }}>
        <Text style={[styles.h2, { fontSize: isWide ? 54 : 30, marginBottom: 32 }]}>Questions</Text>
        <View style={[styles.faqGrid, !isWide && { flexDirection: 'column' }]}>
          {FAQS.map((f, i) => (
            <FaqItem key={f.q} f={f} isWide={isWide} open={openFaq === i} onPress={() => setOpenFaq(openFaq === i ? null : i)} />
          ))}
        </View>
      </Section>

      {/* FINAL CTA */}
      <Section style={{ marginTop: isWide ? 140 : 80 }}>
        <View ref={finalRef} style={[styles.finalBox, { height: finalHeight }]}>
          <Animated.Image
            source={{ uri: unsplash('faces,mid,laugh,group', 1200, 700) }}
            style={[StyleSheet.absoluteFillObject, { transform: [{ scale: finalImgScale }] }]}
            resizeMode="cover"
          />
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: finalOverlayOpacity }]}>
            <LinearGradient
              colors={['rgba(8,8,10,0.25)', 'rgba(8,8,10,0.95)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
          <View style={styles.finalInner}>
            <Animated.Text style={[styles.finalText, { fontSize: isWide ? 56 : 34 }, { opacity: finalTextOpacity, transform: [{ translateY: finalTextTranslate }] }]}>
              You can't scroll{'\n'}anymore. Better{'\n'}go out.
            </Animated.Text>
            <Animated.View style={{ marginTop: 26, alignSelf: 'flex-start', opacity: finalBtnOpacity, transform: [{ translateY: finalBtnTranslate }] }}>
              <TouchableOpacity onPress={goJoin} style={styles.ctaFilled} activeOpacity={0.85}>
                <Text style={styles.ctaFilledText}>Explore Spurth</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Section>

      {/* FOOTER */}
      <Section style={{ marginTop: 100, paddingTop: 40, paddingBottom: 44, borderTopWidth: 1, borderTopColor: LINE }}>
        <View style={[styles.footerRow, !isWide && { flexDirection: 'column', gap: 28 }]}>
          <View style={{ maxWidth: 260 }}>
            <View style={styles.navBrand}>
              <Logo height={22} />
            </View>
            <Text style={styles.footerTagline}>Find something worth doing.</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.footerHeading}>Discover</Text>
            <Text style={styles.footerLink}>Activities</Text>
            <Text style={styles.footerLink}>Nearby</Text>
            <Text style={styles.footerLink}>Experiences</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.footerHeading}>Spurth</Text>
            <Text style={styles.footerLink}>Create an activity</Text>
            <Text style={styles.footerLink}>Safety</Text>
            <Text style={styles.footerLink}>Privacy</Text>
          </View>
        </View>
        <Text style={styles.copyright}>© {new Date().getFullYear()} Spurth</Text>
      </Section>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  rootContent: { paddingBottom: 20 },
  section: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 20 },

  // Nav
  nav: { borderBottomWidth: 1, borderBottomColor: LINE, position: 'sticky', top: 0, zIndex: 40, backgroundColor: 'rgba(10,10,12,0.9)' },
  navInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 32 },
  navBrand: { flexDirection: 'row', alignItems: 'center', marginRight: 'auto' },
  navLinks: { flexDirection: 'row', gap: 26 },
  navLink: { color: MUTE, fontSize: 14, fontFamily: Fonts.medium },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navLoginBtn: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 999, borderWidth: 1, borderColor: LINE },
  navLoginText: { color: '#fff', fontSize: 13.5, fontFamily: Fonts.semibold },
  navJoinBtn: { paddingVertical: 9, paddingHorizontal: 17, borderRadius: 999, backgroundColor: ACCENT },
  navJoinText: { color: '#fff', fontSize: 13.5, fontFamily: Fonts.bold },

  // Typography
  h1: { color: '#fff', fontFamily: Fonts.extrabold, letterSpacing: -1 },
  h2: { color: '#fff', fontFamily: Fonts.extrabold, letterSpacing: -0.5 },
  lead: { color: MUTE, fontSize: 17, lineHeight: 26, fontFamily: Fonts.regular, marginTop: 22, maxWidth: 460 },
  leadSmall: { color: MUTE, fontSize: 15, lineHeight: 23, fontFamily: Fonts.regular },

  rowBetween: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 36 },

  // CTAs
  heroCtaRow: { flexDirection: 'row', gap: 12, marginTop: 30, flexWrap: 'wrap' },
  ctaFilled: { backgroundColor: ACCENT, paddingVertical: 15, paddingHorizontal: 24, borderRadius: 999 },
  ctaFilledText: { color: '#fff', fontSize: 15, fontFamily: Fonts.bold },
  ctaOutline: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', paddingVertical: 15, paddingHorizontal: 24, borderRadius: 999 },
  ctaOutlineText: { color: '#fff', fontSize: 15, fontFamily: Fonts.semibold },
  ctaOutlineLight: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999 },
  ctaOutlineLightText: { color: '#fff', fontSize: 14, fontFamily: Fonts.bold },

  // Hero layout
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 56, marginBottom: 56 },
  heroSideCol: { width: 290, gap: 14, paddingBottom: 8 },
  heroSideImg: { height: 210, borderRadius: 20, overflow: 'hidden', backgroundColor: RAISE },
  heroAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarStack: { flexDirection: 'row' },
  heroAvatarCaption: { color: MUTE, fontSize: 13, lineHeight: 17, fontFamily: Fonts.regular },
  // Categories
  catCard: { borderRadius: 20, overflow: 'hidden', backgroundColor: RAISE },
  catCardLabel: { position: 'absolute', left: 22, bottom: 20 },
  catCardTitle: { color: '#fff', fontSize: 22, fontFamily: Fonts.extrabold, letterSpacing: -0.5 },
  catCardSub: { color: 'rgba(244,244,246,0.6)', fontSize: 12.5, marginTop: 4, fontFamily: Fonts.medium },
  educationCard: { borderRadius: 20, borderWidth: 1, borderColor: LINE, backgroundColor: SURFACE, padding: 22, justifyContent: 'space-between' },
  educationTitle: { color: '#fff', fontSize: 22, fontFamily: Fonts.extrabold, letterSpacing: -0.5 },
  educationBody: { color: MUTE, fontSize: 13.5, lineHeight: 20, fontFamily: Fonts.regular },

  // Story — minimal scroll-parallax photo sections
  parallaxRow: { flexDirection: 'row', alignItems: 'center', gap: 40 },
  parallaxCopy: { gap: 4 },
  storyNum: { color: ACCENT, fontSize: 13, fontFamily: Fonts.extrabold, letterSpacing: 0.5 },
  storyTitle: { color: '#fff', fontSize: 24, fontFamily: Fonts.extrabold, letterSpacing: -0.4, marginTop: 8 },
  storyBody: { color: MUTE, fontSize: 15, lineHeight: 23, fontFamily: Fonts.regular, marginTop: 8, maxWidth: 380 },

  // Experiences
  expBand: { backgroundColor: ACCENT, paddingVertical: 90 },
  expGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8, alignItems: 'flex-start' },
  expCol: { gap: 14 },
  expCard: { backgroundColor: '#0A0A0C', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  expHighlightCard: { backgroundColor: '#F4F4F6', borderRadius: 18, padding: 22 },
  expImageWrap: { height: 230, backgroundColor: RAISE },
  expPhotoOnly: { borderRadius: 18, overflow: 'hidden', backgroundColor: RAISE },
  expPhotoOverlay: { position: 'absolute', left: 14, right: 14, bottom: 14, padding: 12, borderRadius: 16, backgroundColor: 'rgba(10,10,12,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  expPhotoOverlayTitle: { color: '#fff', fontSize: 13, fontFamily: Fonts.bold },
  expPhotoOverlaySub: { color: 'rgba(244,244,246,0.62)', fontSize: 11.5, fontFamily: Fonts.regular, marginTop: 4 },
  expHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  expUser: { color: '#fff', fontSize: 12.5, fontFamily: Fonts.bold },
  expUserTime: { color: MUTE, fontFamily: Fonts.regular },
  expQuote: { color: '#DEDEE4', fontSize: 14, lineHeight: 20, fontFamily: Fonts.regular },
  expHighlightQuote: { color: '#141419', fontSize: 18, lineHeight: 25, fontFamily: Fonts.bold, letterSpacing: -0.3 },
  expFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  expFooterText: { color: MUTE, fontSize: 11.5, fontFamily: Fonts.semibold },

  // Statement
  statement: { overflow: 'hidden', justifyContent: 'center' },
  statementInner: { paddingHorizontal: 20, maxWidth: 1240, width: '100%', alignSelf: 'center' },
  statementText: { color: '#fff', fontFamily: Fonts.extrabold, letterSpacing: -1 },

  // Nearby
  mapBox: { borderRadius: 28, overflow: 'hidden', marginTop: 4, borderWidth: 1, borderColor: LINE, backgroundColor: '#0C0C10' },
  mapPin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -8, marginTop: -8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  mapPinPulse: { position: 'absolute', width: 16, height: 16, borderRadius: 99, backgroundColor: ACCENT },
  mapPinDot: { width: 16, height: 16, borderRadius: 99, backgroundColor: ACCENT, borderWidth: 3, borderColor: '#0C0C10' },
  mapDot: { position: 'absolute', width: 8, height: 8, borderRadius: 99, backgroundColor: 'rgba(183,173,255,0.8)' },
  mapLabel: { position: 'absolute', marginLeft: 14, marginTop: -10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(12,12,16,0.8)', borderWidth: 1, borderColor: LINE, maxWidth: 170 },
  mapLabelText: { color: '#DEDEE4', fontSize: 11, fontFamily: Fonts.semibold },

  // Create — free-floating character
  heroCharCopy: { marginTop: 20, alignItems: 'center' },
  heroCharHeadline: { textAlign: 'center', maxWidth: 760, alignSelf: 'center' },
  heroCharSub: { textAlign: 'center', marginTop: 16, maxWidth: 480, alignSelf: 'center' },

  // FAQ
  faqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  faqItem: { borderWidth: 1, borderColor: LINE, borderRadius: 18, backgroundColor: SURFACE, padding: 18 },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  faqQ: { color: '#fff', fontSize: 15, fontFamily: Fonts.bold, letterSpacing: -0.2, flex: 1 },
  faqA: { color: MUTE, fontSize: 13.5, lineHeight: 21, fontFamily: Fonts.regular, marginTop: 12 },

  // Final CTA
  finalBox: { borderRadius: 26, overflow: 'hidden', justifyContent: 'flex-end' },
  finalInner: { padding: 40 },
  finalText: { color: '#fff', fontFamily: Fonts.extrabold, letterSpacing: -1 },

  // Footer
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerCol: { gap: 10 },
  footerHeading: { color: '#5E5E68', fontSize: 10.5, fontFamily: Fonts.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
  footerLink: { color: MUTE, fontSize: 13.5, fontFamily: Fonts.medium },
  footerTagline: { color: MUTE, fontSize: 13.5, lineHeight: 20, fontFamily: Fonts.regular, marginTop: 12 },
  copyright: { color: '#5E5E68', fontSize: 12, fontFamily: Fonts.regular, marginTop: 36 },
});

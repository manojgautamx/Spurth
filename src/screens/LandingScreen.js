// Marketing landing page — web only (see AppNavigator's Platform.OS-gated
// initialRouteName). Native builds skip straight to WelcomeScreen; a pitch
// page doesn't make sense inside an already-installed app.
//
// Implements "Spurth Landing v2.dc.html" from the claude.ai/design project
// (1abe1348-be64-4b4c-bb5e-36bd5820242e) — a full redesign over the previous
// version (radial-gradient hero with a floating mockup cluster, alternating
// "feature band" panels replacing the old 3-step section, a Find/Join/Do/
// Share marquee, and a centered "scroll end" CTA). Two deliberate deviations
// from the source: the giant faded "Spurth" wordmark behind the footer is
// dropped per explicit request, and <image-slot> placeholders (never filled
// with real photos in the design project — .image-slots.state.json was
// empty) are backed by a small pool of verified-working Unsplash photo IDs.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import Svg, { Rect, Path, Circle, G } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { Fonts } from '../theme/fonts';
import { useIsWideWeb } from '../utils/responsive';

// Web-only display font used for every h1/h2/h3-scoped title in the design
// source (font-family: 'Jeffesta','Manrope'; text-transform: uppercase),
// registered in web/fonts.js since it's only linked for the web build.
const TITLE_FONT = 'Jeffesta';

const ACCENT = '#6C5CE7';
const DEEP = '#13102B';
const BG = '#08080B';
const PANEL = '#121218';
const RAISE = '#191922';
const BAND = '#14122E';
const BAND_CARD = '#0C0A1C';
const BAND_ROW = '#15132B';
const LINE = 'rgba(255,255,255,0.09)';
const MUTE = '#8C8C97';
const LAVENDER = '#B7ADFF';

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

const HERO_MOCK = [
  { cat: 'Sports', dist: '1.2 km', title: 'Sunset bouldering session', going: '6 going · Today 5:30 PM', img: unsplash('climbing,gym', 300, 260) },
  { cat: 'Sports', dist: '3.4 km', title: 'Futsal, 2 spots left', going: '8 going · Tomorrow 8 PM', img: unsplash('night,football', 300, 260) },
  { cat: 'Arts', dist: '0.8 km', title: 'Film photo walk, old town', going: '11 going · Sat 7 AM', img: unsplash('street,photography', 300, 260) },
];

const CATEGORIES = {
  sports: { label: 'Sports', sub: '148 activities · futsal, climbing, laps', img: unsplash('futsal,sports', 900, 800) },
  adventure: { label: 'Adventure', sub: '62 activities', img: unsplash('hiking,mountain', 700, 400) },
  gaming: { label: 'Gaming', img: unsplash('gaming,esports', 500, 400) },
  arts: { label: 'Arts', img: unsplash('pottery,ceramics', 500, 400) },
  lifestyle: { label: 'Lifestyle', img: unsplash('rooftop,dinner', 500, 400) },
  tech: { label: 'Tech', sub: 'Build nights, demo evenings, repair cafés', img: unsplash('hackathon,coding', 900, 400) },
};

const MARQUEE_ITEMS = ['Find', 'Join', 'Do', 'Share'];

const FAQS = [
  { q: 'Is Spurth free to use?', a: "Discovering, joining and creating activities is free. Some hosts charge for their own costs — venue, gear, entry — and that's shown before you join." },
  { q: 'Do I have to know someone to join?', a: "No. Most people arrive on their own. You can see who else is going and what they're into before you commit." },
  { q: 'Is my exact location shared?', a: 'No. Spurth uses an approximate area to sort by distance. Precise meeting points are only visible to people who have joined.' },
  { q: 'What are Experiences?', a: 'Posts made after an activity — photos and a few words, linked back to the activity they came from, so the next person can find it and join.' },
];

function Section({ children, style }) {
  return <View style={[styles.section, style]}>{children}</View>;
}

function InitialsAvatar({ text, size = 28, bg = '#2A2A33', color = '#ccc', style }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: 99, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ color, fontSize: size * 0.36, fontFamily: Fonts.extrabold }}>{text}</Text>
    </View>
  );
}

function Float({ children, amount = 10, duration = 9000, style }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -amount, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[style, { transform: [{ translateY: y }] }]}>{children}</Animated.View>;
}

function CategoryCard({ item, style, big }) {
  return (
    <View style={[styles.catCard, style]}>
      <Image source={{ uri: item.img }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(6,6,9,0.05)', 'rgba(6,6,9,0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.catCardLabel}>
        <Text style={[styles.catCardTitle, big && { fontSize: 38 }]}>{item.label}</Text>
        {item.sub ? <Text style={styles.catCardSub}>{item.sub}</Text> : null}
      </View>
    </View>
  );
}

function Marquee() {
  const anim = useRef(new Animated.Value(0)).current;
  const [setW, setSetW] = useState(0);

  useEffect(() => {
    if (!setW) return;
    anim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: -setW, duration: 30000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [setW]);

  const row = (measure) => (
    <View style={styles.marqueeRow} onLayout={measure ? (e) => setSetW(e.nativeEvent.layout.width) : undefined}>
      {MARQUEE_ITEMS.map((t, i) => (
        <React.Fragment key={i}>
          <Text style={styles.marqueeText}>{t}</Text>
          <View style={styles.marqueeDot} />
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <View style={styles.marqueeWrap}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: anim }] }}>
        {row(true)}
        {row(false)}
      </Animated.View>
    </View>
  );
}

function MapPulse() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;
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
  return <Animated.View style={[styles.mapPinPulse, { transform: [{ scale }], opacity }]} />;
}

function FaqItem({ item, open, onPress }) {
  return (
    <TouchableOpacity style={styles.faqItem} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{item.q}</Text>
        <Text style={styles.faqPlus}>{open ? '−' : '+'}</Text>
      </View>
      {open && <Text style={styles.faqA}>{item.a}</Text>}
    </TouchableOpacity>
  );
}

export default function LandingScreen({ navigation }) {
  const isWide = useIsWideWeb();
  const [openFaq, setOpenFaq] = useState(null);

  const goJoin = () => navigation.navigate('Welcome');

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.rootContent} showsVerticalScrollIndicator={false}>
      {/* NAV */}
      <View style={styles.nav}>
        <Section style={styles.navInner}>
          <View style={styles.navBrand}>
            <View style={styles.navMark}><View style={styles.navMarkDot} /></View>
            <Text style={styles.navBrandText}>Spurth</Text>
          </View>
          {isWide && (
            <View style={styles.navLinks}>
              <Text style={styles.navLink}>How it works</Text>
              <Text style={styles.navLink}>Activities</Text>
              <Text style={styles.navLink}>Experiences</Text>
              <Text style={styles.navLink}>Nearby</Text>
              <Text style={styles.navLink}>FAQ</Text>
            </View>
          )}
          <TouchableOpacity onPress={goJoin} style={styles.navCta} activeOpacity={0.85}>
            <Text style={styles.navCtaText}>Open Spurth</Text>
          </TouchableOpacity>
        </Section>
      </View>

      {/* HERO */}
      <View style={styles.heroBg}>
        <LinearGradient
          colors={[DEEP, '#100D26', BG]}
          locations={[0, 0.46, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {isWide && (
          <>
            <Float amount={16} duration={9000} style={styles.heroBlobLeft} />
            <Float amount={14} duration={11000} style={styles.heroBlobRight} />
          </>
        )}

        <Section style={{ alignItems: 'center', paddingTop: isWide ? 88 : 56 }}>
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>412 activities happening this week</Text>
          </View>
          <Text style={[styles.h1, { fontSize: isWide ? 88 : 44, textAlign: 'center' }]}>Find something{'\n'}worth doing.</Text>
          <Text style={[styles.lead, { textAlign: 'center', maxWidth: 600 }]}>
            Discover activities around you, meet people who are into the same things, and make experiences worth sharing.
          </Text>
          <View style={[styles.heroCtaRow, { justifyContent: 'center' }]}>
            <TouchableOpacity onPress={goJoin} style={styles.ctaFilled} activeOpacity={0.85}>
              <Text style={styles.ctaFilledText}>Explore Activities</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goJoin} style={styles.ctaOutline} activeOpacity={0.85}>
              <Text style={styles.ctaOutlineText}>Create an Activity</Text>
            </TouchableOpacity>
          </View>
        </Section>

        {/* hero mockup cluster */}
        <View style={[styles.heroCluster, { height: isWide ? 460 : undefined, marginTop: isWide ? 64 : 40 }]}>
          {isWide && (
            <Float amount={12} duration={10000} style={styles.heroClusterLeft}>
              <Image source={{ uri: unsplash('friends,bouldering,film', 460, 600) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            </Float>
          )}
          {isWide && (
            <Float amount={14} duration={12000} style={styles.heroClusterRight}>
              <Image source={{ uri: unsplash('laughing,mid,activity', 420, 540) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            </Float>
          )}

          <View style={[styles.heroCard, !isWide && { position: 'relative', width: '100%', left: 0, transform: [] }]}>
            <View style={styles.heroCardTopRow}>
              <View style={styles.trafficDots}>
                <View style={styles.trafficDot} /><View style={styles.trafficDot} /><View style={styles.trafficDot} />
              </View>
              <View style={styles.exploreSearchBar}>
                <Ionicons name="search" size={13} color={MUTE} />
                <Text style={styles.exploreSearchText}>Bouldering near me, tonight</Text>
              </View>
              <View style={styles.exploreBadge}><Text style={styles.exploreBadgeText}>Explore</Text></View>
            </View>

            <View style={styles.exploreFilterRow}>
              {['All', 'Today', 'This weekend', 'Free', 'Under 2 km'].map((f, i) => (
                <View key={f} style={[styles.explorePill, i === 0 && styles.explorePillActive]}>
                  <Text style={[styles.explorePillText, i === 0 && styles.explorePillTextActive]}>{f}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.exploreCardsRow, !isWide && { flexDirection: 'column' }]}>
              {HERO_MOCK.map((c) => (
                <View key={c.title} style={styles.exploreCard}>
                  <View style={styles.exploreCardImg}>
                    <Image source={{ uri: c.img }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  </View>
                  <View style={styles.exploreCardBody}>
                    <Text style={styles.exploreCardCat}>{c.cat.toUpperCase()} · {c.dist.toUpperCase()}</Text>
                    <Text style={styles.exploreCardTitle}>{c.title}</Text>
                    <Text style={styles.exploreCardMetaText}>{c.going}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {isWide && (
            <Float amount={8} duration={7000} style={styles.heroJoinedPill}>
              <View style={styles.heroJoinedDot} />
              <Text style={styles.heroJoinedText}>Nisha joined · 2 min ago</Text>
            </Float>
          )}
        </View>
      </View>

      {/* FEATURE BANDS */}
      <View style={styles.bandsWrap}>
        <Section style={{ gap: isWide ? 60 : 40 }}>

          {/* band 1 */}
          <View style={[styles.band, !isWide && { flexDirection: 'column' }]}>
            <View style={[styles.bandMockWrap, isWide && { flex: 1.1 }]}>
              <View style={styles.bandCard}>
                <View style={styles.bandCardHeader}>
                  <Text style={styles.bandCardHeaderMute}>Within 2 km of you</Text>
                  <Text style={styles.bandCardHeaderAccent}>Today</Text>
                </View>
                <View style={{ gap: 10 }}>
                  <View style={styles.bandRow}>
                    <View style={styles.bandRowThumb}><Image source={{ uri: unsplash('swimming,laps', 140, 140) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" /></View>
                    <View><Text style={styles.bandRowTitle}>Morning laps, Satdobato</Text><Text style={styles.bandRowMeta}>0.6 km · 6:30 AM · 4 going</Text></View>
                  </View>
                  <View style={styles.bandRow}>
                    <View style={styles.bandRowThumb}><Image source={{ uri: unsplash('board,game,night', 140, 140) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" /></View>
                    <View><Text style={styles.bandRowTitle}>Board game night</Text><Text style={styles.bandRowMeta}>1.1 km · 7 PM · 9 going</Text></View>
                  </View>
                  <View style={[styles.bandRow, { opacity: 0.55 }]}>
                    <View style={styles.bandRowThumb}><Image source={{ uri: unsplash('sketch,riverside', 140, 140) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" /></View>
                    <View><Text style={styles.bandRowTitle}>Sketch club, riverside</Text><Text style={styles.bandRowMeta}>1.8 km · Sun 4 PM</Text></View>
                  </View>
                </View>
              </View>
              {isWide && (
                <Float amount={10} duration={8000} style={styles.bandFloatImg}>
                  <Image source={{ uri: unsplash('walking,out,door', 300, 300) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                </Float>
              )}
            </View>
            <View style={[styles.bandCopy, isWide && { flex: 0.9 }]}>
              <Text style={[styles.h2, { fontSize: isWide ? 46 : 30 }]}>Something's on{'\n'}within walking{'\n'}distance</Text>
              <Text style={styles.bandBody}>Spurth sorts by how far you'd actually have to go. Open it on a dead evening and there are nine things inside a twenty-minute walk.</Text>
            </View>
          </View>

          {/* band 2 */}
          <View style={[styles.band, !isWide && { flexDirection: 'column' }]}>
            <View style={[styles.bandCopy, isWide && { flex: 0.9 }]}>
              <Text style={[styles.h2, { fontSize: isWide ? 46 : 30 }]}>See who's{'\n'}going first</Text>
              <Text style={styles.bandBody}>Faces, not usernames. Check who's turning up and what they're into before you commit — nobody walks into a cold room.</Text>
            </View>
            <View style={[styles.bandMockWrap, isWide && { flex: 1.1 }]}>
              <View style={styles.bandCard}>
                <View style={styles.bandHeroImg}><Image source={{ uri: unsplash('bouldering,group,photo', 500, 260) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" /></View>
                <View style={styles.bandJoinRow}>
                  <View>
                    <Text style={styles.bandEventTitle}>Sunset bouldering session</Text>
                    <Text style={styles.bandRowMeta}>Hosted by Aayush · Sports · 1.2 km</Text>
                  </View>
                  <View style={styles.bandJoinBtn}><Text style={styles.bandJoinBtnText}>Join</Text></View>
                </View>
                <View style={styles.bandDivider} />
                <Text style={styles.bandGoingLabel}>6 GOING</Text>
                <View style={[styles.bandAttendeeGrid, !isWide && { flexDirection: 'column' }]}>
                  <View style={styles.attendeeCell}><InitialsAvatar text="NK" size={32} bg="#2E2C42" /><View><Text style={styles.attendeeName}>Nisha K.</Text><Text style={styles.attendeeSub}>Climbs 3× a week</Text></View></View>
                  <View style={styles.attendeeCell}><InitialsAvatar text="RB" size={32} bg="#3A3750" /><View><Text style={styles.attendeeName}>Rohit B.</Text><Text style={styles.attendeeSub}>New to bouldering</Text></View></View>
                  <View style={styles.attendeeCell}><InitialsAvatar text="SM" size={32} bg="#46425F" /><View><Text style={styles.attendeeName}>Sneha M.</Text><Text style={styles.attendeeSub}>Also into trail runs</Text></View></View>
                  <View style={styles.attendeeCell}><InitialsAvatar text="+3" size={32} bg={ACCENT} color="#fff" /><Text style={[styles.attendeeSub, { fontFamily: Fonts.semibold }]}>more going</Text></View>
                </View>
              </View>
              {isWide && (
                <Float amount={9} duration={9000} style={styles.bandFloatPill}>
                  <Text style={styles.bandFloatPillText}>2 spots left</Text>
                </Float>
              )}
            </View>
          </View>

          {/* band 3 */}
          <View style={[styles.band, !isWide && { flexDirection: 'column' }]}>
            <View style={[styles.bandMockWrap, isWide && { flex: 1.1 }]}>
              <View style={styles.bandTallImg}>
                <Image source={{ uri: unsplash('chalky,hands,climb,dusk', 640, 500) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </View>
              {isWide && (
                <Float amount={8} duration={8500} style={styles.bandGoingCard}>
                  <Text style={styles.bandGoingCardLabel}>YOU'RE GOING</Text>
                  <Text style={styles.bandGoingCardTitle}>Today, 5:30 PM</Text>
                  <Text style={styles.bandGoingCardSub}>Astro Wall, Jhamsikhel{'\n'}18 min walk</Text>
                  <View style={styles.bandGoingCardBtnRow}>
                    <View style={styles.bandGoingCardBtn}><Text style={styles.bandGoingCardBtnText}>Directions</Text></View>
                    <View style={styles.bandGoingCardBtn}><Text style={styles.bandGoingCardBtnText}>Group chat</Text></View>
                  </View>
                </Float>
              )}
            </View>
            <View style={[styles.bandCopy, isWide && { flex: 0.9 }]}>
              <Text style={[styles.h2, { fontSize: isWide ? 46 : 30 }]}>Then you{'\n'}actually go</Text>
              <Text style={styles.bandBody}>Directions, a group chat and a nudge before it starts. Everything you need between saying yes and turning up.</Text>
            </View>
          </View>

        </Section>
      </View>

      <Marquee />

      {/* ACTIVITIES */}
      <Section id="activities" style={{ marginTop: isWide ? 120 : 80 }}>
        <View style={[styles.rowBetween, !isWide && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Text style={[styles.h2, { fontSize: isWide ? 56 : 34 }]}>Whatever{'\n'}you're into</Text>
          <Text style={[styles.leadSmall, { maxWidth: 340, marginTop: isWide ? 0 : 12 }]}>
            Seven worlds, one feed. Follow the ones you care about and Spurth keeps them close.
          </Text>
        </View>

        {isWide ? (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <CategoryCard item={CATEGORIES.sports} big style={{ flex: 1, height: 406 }} />
              <View style={{ flex: 1, gap: 14 }}>
                <CategoryCard item={CATEGORIES.adventure} style={{ height: 196 }} />
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <CategoryCard item={CATEGORIES.gaming} style={{ flex: 1, height: 196 }} />
                  <CategoryCard item={CATEGORIES.arts} style={{ flex: 1, height: 196 }} />
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <View style={[styles.educationCard, { flex: 1, height: 196 }]}>
                <Text style={styles.educationTitle}>Education</Text>
                <Text style={styles.educationBody}>Study rooms, language swaps, weekend workshops.</Text>
              </View>
              <CategoryCard item={CATEGORIES.lifestyle} style={{ flex: 1, height: 196 }} />
              <CategoryCard item={CATEGORIES.tech} style={{ flex: 2, height: 196 }} />
            </View>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <CategoryCard item={CATEGORIES.sports} big style={{ width: '100%', height: 220 }} />
            <CategoryCard item={CATEGORIES.adventure} style={{ width: '100%', height: 190 }} />
            <CategoryCard item={CATEGORIES.gaming} style={{ width: '100%', height: 190 }} />
            <CategoryCard item={CATEGORIES.arts} style={{ width: '100%', height: 190 }} />
            <View style={[styles.educationCard, { width: '100%', height: 150 }]}>
              <Text style={styles.educationTitle}>Education</Text>
              <Text style={styles.educationBody}>Study rooms, language swaps, weekend workshops.</Text>
            </View>
            <CategoryCard item={CATEGORIES.lifestyle} style={{ width: '100%', height: 190 }} />
            <CategoryCard item={CATEGORIES.tech} style={{ width: '100%', height: 190 }} />
          </View>
        )}
      </Section>

      {/* EXPERIENCES */}
      <View id="experiences" style={[styles.expBand, { marginTop: isWide ? 130 : 80 }]}>
        <Section>
          <View style={[styles.rowBetween, !isWide && { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={[styles.h2, { fontSize: isWide ? 50 : 30, maxWidth: 700 }]}>Every experience starts with an activity</Text>
            <TouchableOpacity onPress={goJoin} style={styles.ctaOutlineLight}>
              <Text style={styles.ctaOutlineLightText}>See the feed</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.expGrid, !isWide && { flexDirection: 'column' }]}>
            {/* Column 1 */}
            <View style={[styles.expCol, isWide && { width: '24%' }]}>
              <View style={[styles.expCard, { transform: [{ rotate: '1.2deg' }] }]}>
                <View style={[styles.expImageWrap, { height: 224 }]}>
                  <Image source={{ uri: unsplash('sweaty,group,futsal', 500, 460) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                </View>
                <View style={{ padding: 16 }}>
                  <View style={styles.expHeader}>
                    <InitialsAvatar text="AR" size={28} bg="#33323F" />
                    <Text style={styles.expUser}>Aarav R. <Text style={styles.expUserTime}>· 2h</Text></Text>
                  </View>
                  <Text style={styles.expQuote}>"Turned up alone to a 6 a-side and left with a WhatsApp group of nine."</Text>
                  <Text style={styles.expFooterText}><Text style={{ color: LAVENDER, fontFamily: Fonts.extrabold }}>♥ 214</Text> · Sunday 6 a-side</Text>
                </View>
              </View>
              <View style={[styles.expPhotoOnly, { height: 176, transform: [{ rotate: '-1.6deg' }] }]}>
                <Image source={{ uri: unsplash('bus,window,travel', 500, 380) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </View>
            </View>

            {/* Column 2 */}
            <View style={[styles.expCol, isWide && { width: '24%', marginTop: 34 }]}>
              <View style={[styles.expHighlightCard, { transform: [{ rotate: '-1.4deg' }] }]}>
                <View style={styles.expHeader}>
                  <InitialsAvatar text="PL" size={28} bg="rgba(20,20,25,0.1)" color="#141419" />
                  <Text style={[styles.expUser, { color: '#141419' }]}>Prisha L. <Text style={[styles.expUserTime, { color: '#75757F' }]}>· yesterday</Text></Text>
                </View>
                <Text style={styles.expHighlightQuote}>"I moved here in March and knew nobody. Fourteen activities later my weekends are full."</Text>
                <Text style={[styles.expFooterText, { color: ACCENT, fontFamily: Fonts.extrabold, marginTop: 16 }]}>♥ 512 · Pottery, beginners</Text>
              </View>
              <View style={[styles.expPhotoOnly, { height: 290, transform: [{ rotate: '1.1deg' }] }]}>
                <Image source={{ uri: unsplash('pottery,hands,clay', 500, 620) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </View>
              <View style={[styles.expCard, { transform: [{ rotate: '-0.9deg' }], padding: 18 }]}>
                <View style={styles.expHeader}>
                  <InitialsAvatar text="KT" size={28} bg="#2E2E38" />
                  <Text style={styles.expUser}>Kiran T. <Text style={styles.expUserTime}>· 3d</Text></Text>
                </View>
                <Text style={styles.expQuote}>"Hosted a chess table in the park expecting two people. Sixteen showed up."</Text>
                <Text style={[styles.expFooterText, { marginTop: 12 }]}><Text style={{ color: LAVENDER, fontFamily: Fonts.extrabold }}>♥ 189</Text> · Chess in the park</Text>
              </View>
            </View>

            {/* Column 3 */}
            <View style={[styles.expCol, isWide && { width: '24%' }]}>
              <View style={[styles.expPhotoOnly, { height: 310, transform: [{ rotate: '-1.2deg' }] }]}>
                <Image source={{ uri: unsplash('hike,summit,backlit', 500, 660) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <View style={styles.expPhotoOverlay}>
                  <Text style={styles.expPhotoOverlayTitle}>Sunrise hike to Shivapuri</Text>
                  <Text style={styles.expPhotoOverlaySub}>23 went · 41 photos shared</Text>
                </View>
              </View>
              <View style={[styles.expCard, { transform: [{ rotate: '1.3deg' }], padding: 18 }]}>
                <View style={styles.expHeader}>
                  <InitialsAvatar text="SM" size={28} bg="#46445A" />
                  <Text style={styles.expUser}>Sneha M. <Text style={styles.expUserTime}>· 5d</Text></Text>
                </View>
                <Text style={styles.expQuote}>"Left the house at 4 a.m. with five strangers. Watched the valley wake up."</Text>
                <Text style={[styles.expFooterText, { marginTop: 12 }]}><Text style={{ color: LAVENDER, fontFamily: Fonts.extrabold }}>♥ 331</Text> · Sunrise hike to Shivapuri</Text>
              </View>
              <View style={[styles.expPhotoOnly, { height: 166, transform: [{ rotate: '1.5deg' }] }]}>
                <Image source={{ uri: unsplash('tea,break,conversation', 500, 340) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </View>
            </View>

            {/* Column 4 */}
            <View style={[styles.expCol, isWide && { width: '24%', marginTop: 52 }]}>
              <View style={[styles.expPhotoOnly, { height: 252, transform: [{ rotate: '1.5deg' }] }]}>
                <Image source={{ uri: unsplash('screen,lit,gaming,night', 500, 520) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </View>
              <View style={[styles.expCard, { transform: [{ rotate: '-1.4deg' }], padding: 18 }]}>
                <View style={styles.expHeader}>
                  <InitialsAvatar text="DJ" size={28} bg="#3A3947" />
                  <Text style={styles.expUser}>Dev J. <Text style={styles.expUserTime}>· 1w</Text></Text>
                </View>
                <Text style={styles.expQuote}>"Found a 5-stack that actually communicates. We've played every Friday since."</Text>
                <Text style={[styles.expFooterText, { marginTop: 12 }]}><Text style={{ color: LAVENDER, fontFamily: Fonts.extrabold }}>♥ 96</Text> · Valorant 5-stack</Text>
              </View>
            </View>
          </View>
        </Section>
      </View>

      {/* STATEMENT */}
      <View style={[styles.statement, { marginTop: isWide ? 0 : 0, height: isWide ? 520 : 320 }]}>
        <Image source={{ uri: unsplash('group,walking,dusk', 1400, 700) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(8,8,11,0.92)', 'rgba(8,8,11,0.3)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.statementInner}>
          <Text style={[styles.statementText, { fontSize: isWide ? 78 : 36 }]}>
            Less scrolling.{'\n'}<Text style={{ color: LAVENDER }}>More doing.</Text>
          </Text>
        </View>
      </View>

      {/* NEARBY */}
      <Section id="nearby" style={{ marginTop: isWide ? 120 : 80 }}>
        <View style={[styles.rowBetween, !isWide && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <View style={{ maxWidth: 520 }}>
            <Text style={[styles.h2, { fontSize: isWide ? 50 : 30 }]}>Something's probably happening near you</Text>
            <Text style={[styles.leadSmall, { marginTop: 14 }]}>Nine activities inside a twenty-minute walk, right now.</Text>
          </View>
          <TouchableOpacity onPress={goJoin} style={[styles.ctaFilled, !isWide && { marginTop: 18 }]}>
            <Text style={styles.ctaFilledText}>Explore Nearby</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.mapBox, { height: isWide ? 560 : 340 }]}>
          <Svg width="100%" height="100%" viewBox="0 0 1200 560" preserveAspectRatio="none" style={StyleSheet.absoluteFillObject}>
            <Rect width="1200" height="560" fill="#0B0B14" />
            <G stroke="#1A1A26" strokeWidth="1">
              <Path d="M0 90H1200M0 210H1200M0 330H1200M0 450H1200" />
              <Path d="M120 0V560M300 0V560M480 0V560M660 0V560M840 0V560M1020 0V560" />
            </G>
            <G stroke="#242433" strokeWidth="8" strokeLinecap="round" fill="none">
              <Path d="M-20 300 Q 280 250 520 320 T 1220 260" />
              <Path d="M400 -20 Q 460 200 380 380 T 460 580" />
              <Path d="M760 -20 L 820 560" />
              <Path d="M0 470 L 1200 430" />
            </G>
            <Path d="M60 60 L 260 40 L 300 170 L 90 200 Z" fill="#13131F" stroke="#1F1F2C" />
            <Path d="M900 340 L 1140 320 L 1180 500 L 940 520 Z" fill="#101520" stroke="#1B2230" />
            <Circle cx="600" cy="280" r="152" fill={ACCENT} fillOpacity={0.08} />
            <Circle cx="600" cy="280" r="152" fill="none" stroke={ACCENT} strokeOpacity={0.25} strokeDasharray="6 9" />
          </Svg>

          <View style={styles.mapPin} pointerEvents="none">
            <MapPulse />
            <View style={styles.mapPinDot} />
          </View>

          {isWide && (
            <>
              <View style={[styles.mapChip, styles.mapChipLight, { left: '25%', top: '21%' }]}>
                <Text style={styles.mapChipTextDark}>Futsal · 0.4 km</Text>
              </View>
              <View style={[styles.mapChip, { left: '48%', top: '12%' }]}>
                <Text style={styles.mapChipText}>Open mic · 1.7 km</Text>
              </View>
              <View style={[styles.mapChip, { left: '69%', top: '63%' }]}>
                <Text style={styles.mapChipText}>Sketch club · 2.1 km</Text>
              </View>
              <View style={[styles.mapChip, { left: '17%', top: '71%' }]}>
                <Text style={styles.mapChipText}>Swim laps · 0.9 km</Text>
              </View>

              <View style={styles.mapCards}>
                {[
                  { dist: '0.4 KM AWAY', title: 'Floodlit futsal, 2 spots', going: '8 going · 8 PM', img: unsplash('futsal,night', 200, 200) },
                  { dist: '0.9 KM AWAY', title: 'Beginner swim laps', going: '5 going · 6:30 AM', img: unsplash('swimming,pool', 200, 200) },
                  { dist: '1.7 KM AWAY', title: 'Open mic, Thursday', going: '17 going · 7 PM', img: unsplash('concert,mic', 200, 200) },
                ].map((c) => (
                  <View key={c.title} style={styles.mapCard}>
                    <View style={styles.mapCardThumb}>
                      <Image source={{ uri: c.img }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mapCardDist}>{c.dist}</Text>
                      <Text style={styles.mapCardTitle}>{c.title}</Text>
                      <Text style={styles.mapCardGoing}>{c.going}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={styles.mapFilters}>
            <View style={[styles.mapFilterPill, { backgroundColor: ACCENT }]}><Text style={styles.mapFilterTextActive}>Today</Text></View>
            <View style={styles.mapFilterPill}><Text style={styles.mapFilterText}>This week</Text></View>
            <View style={styles.mapFilterPill}><Text style={styles.mapFilterText}>Free only</Text></View>
          </View>
        </View>
      </Section>

      {/* CREATE */}
      <Section id="create" style={{ marginTop: isWide ? 120 : 80 }}>
        <View style={[styles.createPanel, !isWide && { flexDirection: 'column' }]}>
          <View style={[styles.createCollageWrap, isWide && { flex: 1 }]}>
            <View style={styles.createGrid}>
              <View style={styles.createImgWide}>
                <Image source={{ uri: unsplash('rallying,friends,phone', 900, 400) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </View>
              <View style={styles.createImgRow}>
                <View style={styles.createImgHalf}>
                  <Image source={{ uri: unsplash('chalk,board,plans', 450, 400) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                </View>
                <View style={styles.createImgHalf}>
                  <Image source={{ uri: unsplash('small,group,arriving', 450, 400) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                </View>
              </View>
            </View>
            {isWide && (
              <Float amount={8} duration={8000} style={styles.createFloatPill}>
                <Text style={styles.createFloatPillText}>Live in 40 seconds</Text>
              </Float>
            )}
          </View>

          <View style={[styles.createCopy, isWide && { flex: 1 }]}>
            <Text style={[styles.h2, { fontSize: isWide ? 46 : 30 }]}>Can't find your{'\n'}thing? Start it.</Text>
            <Text style={[styles.leadSmall, { marginTop: 14, marginBottom: 26, maxWidth: 420 }]}>
              Four fields and it's live. Spurth puts it in front of people nearby who are into the same thing.
            </Text>

            <View style={styles.mockForm}>
              <Text style={styles.mockFormLabel}>New activity</Text>
              <View style={styles.mockField}>
                <Text style={styles.mockFieldLabel}>What</Text>
                <Text style={styles.mockFieldValue}>Sunset bouldering session</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <View style={[styles.mockField, { flex: 1 }]}>
                  <Text style={styles.mockFieldLabel}>When</Text>
                  <Text style={styles.mockFieldValue}>Today · 5:30 PM</Text>
                </View>
                <View style={[styles.mockField, { flex: 1 }]}>
                  <Text style={styles.mockFieldLabel}>Where</Text>
                  <Text style={styles.mockFieldValue}>Astro Wall</Text>
                </View>
              </View>
              <View style={{ marginTop: 12 }}>
                <Text style={styles.mockFieldLabel}>Category</Text>
                <View style={styles.mockPillsRow}>
                  <View style={[styles.mockPill, { backgroundColor: ACCENT }]}><Text style={styles.mockPillTextActive}>Sports</Text></View>
                  <View style={styles.mockPill}><Text style={styles.mockPillText}>Adventure</Text></View>
                  <View style={styles.mockPill}><Text style={styles.mockPillText}>Gaming</Text></View>
                  <View style={styles.mockPill}><Text style={styles.mockPillText}>Arts</Text></View>
                  <View style={styles.mockPill}><Text style={styles.mockPillText}>Tech</Text></View>
                </View>
              </View>
              <View style={styles.mockSliderRow}>
                <Text style={styles.mockFieldValue}>Group size</Text>
                <View style={styles.mockSliderTrackRow}>
                  <View style={styles.mockSliderTrack}>
                    <View style={styles.mockSliderFill} />
                    <View style={styles.mockSliderThumb} />
                  </View>
                  <Text style={[styles.mockFieldValue, { fontSize: 13.5 }]}>8</Text>
                </View>
              </View>
              <TouchableOpacity onPress={goJoin} style={styles.mockCreateBtn} activeOpacity={0.85}>
                <Text style={styles.ctaFilledText}>Create an Activity</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Section>

      {/* FAQ */}
      <Section id="faq" style={{ marginTop: isWide ? 120 : 80 }}>
        <Text style={[styles.h2, { fontSize: isWide ? 48 : 30, marginBottom: 32 }]}>Questions</Text>
        <View style={[styles.faqGrid, !isWide && { flexDirection: 'column' }]}>
          {FAQS.map((f, i) => (
            <View key={f.q} style={[isWide && { width: '48%' }]}>
              <FaqItem item={f} open={openFaq === i} onPress={() => setOpenFaq(openFaq === i ? null : i)} />
            </View>
          ))}
        </View>
      </Section>

      {/* SCROLL END */}
      <Section id="end" style={{ marginTop: isWide ? 150 : 90, alignItems: 'center' }}>
        <Text style={[styles.h2, { fontSize: isWide ? 76 : 38, textAlign: 'center', maxWidth: 900 }]}>Nothing left to scroll.{'\n'}Go do something.</Text>
        <Text style={[styles.lead, { textAlign: 'center', marginTop: 22 }]}>Find something. Find your people. Make it happen.</Text>
        <TouchableOpacity onPress={goJoin} style={[styles.ctaFilled, { marginTop: 28 }]} activeOpacity={0.85}>
          <Text style={styles.ctaFilledText}>Explore Spurth</Text>
        </TouchableOpacity>
        <View style={[styles.endImg, { height: isWide ? 420 : 260, marginTop: isWide ? 64 : 40 }]}>
          <Image source={{ uri: unsplash('faces,mid,laugh,group', 1000, 700) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        </View>
      </Section>

      {/* FOOTER — the design's giant faded "Spurth" wordmark behind this
          block is intentionally omitted per request. */}
      <Section style={{ marginTop: 100, paddingTop: 56, borderTopWidth: 1, borderTopColor: LINE }}>
        <View style={[styles.footerRow, !isWide && { flexDirection: 'column', gap: 28 }]}>
          <View style={{ maxWidth: 260 }}>
            <View style={styles.navBrand}>
              <View style={styles.navMark}><View style={styles.navMarkDot} /></View>
              <Text style={[styles.navBrandText, { fontSize: 20 }]}>Spurth</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  rootContent: { paddingBottom: 20 },
  section: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 20 },

  // Nav
  nav: { position: 'sticky', top: 0, zIndex: 80, backgroundColor: 'rgba(8,8,11,0.86)' },
  navInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 30 },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 'auto' },
  navMark: { width: 28, height: 28, borderRadius: 10, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  navMarkDot: { width: 10, height: 10, borderRadius: 4, backgroundColor: '#fff' },
  navBrandText: { color: '#fff', fontSize: 23, fontFamily: TITLE_FONT, textTransform: 'uppercase', letterSpacing: 0.5 },
  navLinks: { flexDirection: 'row', gap: 24 },
  navLink: { color: '#C9C9D2', fontSize: 14, fontFamily: Fonts.semibold },
  navCta: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999, backgroundColor: '#F4F4F6' },
  navCtaText: { color: '#111116', fontSize: 14, fontFamily: Fonts.extrabold },

  // Typography
  h1: { color: '#fff', fontFamily: TITLE_FONT, textTransform: 'uppercase', letterSpacing: 0.5 },
  h2: { color: '#fff', fontFamily: TITLE_FONT, textTransform: 'uppercase', letterSpacing: 0.5 },
  lead: { color: '#C2C0D6', fontSize: 17, lineHeight: 27, fontFamily: Fonts.regular, marginTop: 22, maxWidth: 460 },
  leadSmall: { color: MUTE, fontSize: 15, lineHeight: 23, fontFamily: Fonts.regular },

  rowBetween: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 32 },

  // CTAs
  heroCtaRow: { flexDirection: 'row', gap: 12, marginTop: 30, flexWrap: 'wrap' },
  ctaFilled: { backgroundColor: '#F4F4F6', paddingVertical: 16, paddingHorizontal: 26, borderRadius: 999 },
  ctaFilledText: { color: '#111116', fontSize: 15, fontFamily: Fonts.extrabold },
  ctaOutline: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 16, paddingHorizontal: 26, borderRadius: 999 },
  ctaOutlineText: { color: '#fff', fontSize: 15, fontFamily: Fonts.extrabold },
  ctaOutlineLight: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999 },
  ctaOutlineLightText: { color: '#111116', fontSize: 13.5, fontFamily: Fonts.extrabold },

  // Hero
  heroBg: { position: 'relative', overflow: 'hidden', paddingBottom: 40 },
  heroBlobLeft: { position: 'absolute', left: -90, top: 220, width: 220, height: 220, borderRadius: 999, backgroundColor: 'rgba(108,92,231,0.16)' },
  heroBlobRight: { position: 'absolute', right: -70, top: 120, width: 150, height: 150, borderRadius: 999, backgroundColor: 'rgba(183,173,255,0.1)' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7, paddingHorizontal: 15, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 24 },
  heroBadgeDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: '#7BE3A8' },
  heroBadgeText: { color: '#DCD9F5', fontSize: 13, fontFamily: Fonts.bold },

  heroCluster: { width: '100%', maxWidth: 1180, alignSelf: 'center', position: 'relative' },
  heroClusterLeft: { position: 'absolute', left: 0, top: 24, width: 230, height: 300, borderRadius: 24, overflow: 'hidden', backgroundColor: RAISE },
  heroClusterRight: { position: 'absolute', right: 0, top: 80, width: 210, height: 270, borderRadius: 24, overflow: 'hidden', backgroundColor: RAISE },
  heroCard: { position: 'absolute', left: '50%', top: 0, transform: [{ translateX: -380 }], width: 760, maxWidth: '100%', borderRadius: 24, backgroundColor: '#101015', borderWidth: 1, borderColor: LINE, padding: 16 },
  heroCardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  trafficDots: { flexDirection: 'row', gap: 6 },
  trafficDot: { width: 9, height: 9, borderRadius: 99, backgroundColor: '#2C2C34' },
  exploreSearchBar: { flex: 1, minWidth: 160, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: RAISE, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 15 },
  exploreSearchText: { color: MUTE, fontSize: 13, fontFamily: Fonts.regular },
  exploreBadge: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, backgroundColor: ACCENT },
  exploreBadgeText: { color: '#fff', fontSize: 12.5, fontFamily: Fonts.extrabold },
  exploreFilterRow: { flexDirection: 'row', gap: 7, marginBottom: 14, flexWrap: 'wrap' },
  explorePill: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, backgroundColor: RAISE },
  explorePillActive: { backgroundColor: 'rgba(108,92,231,0.2)' },
  explorePillText: { color: MUTE, fontSize: 12, fontFamily: Fonts.bold },
  explorePillTextActive: { color: '#C3BAFF' },
  exploreCardsRow: { flexDirection: 'row', gap: 12 },
  exploreCard: { flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: RAISE },
  exploreCardImg: { height: 100, backgroundColor: '#0E0E15' },
  exploreCardBody: { padding: 12 },
  exploreCardCat: { color: LAVENDER, fontSize: 10, fontFamily: Fonts.extrabold, letterSpacing: 0.6 },
  exploreCardTitle: { color: '#fff', fontSize: 13.5, fontFamily: Fonts.bold, lineHeight: 18, marginTop: 6 },
  exploreCardMetaText: { color: MUTE, fontSize: 11, fontFamily: Fonts.regular, marginTop: 8 },
  heroJoinedPill: { position: 'absolute', left: '50%', marginLeft: 130, top: 366, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#F4F4F6' },
  heroJoinedDot: { width: 20, height: 20, borderRadius: 99, backgroundColor: ACCENT },
  heroJoinedText: { color: '#111116', fontSize: 13, fontFamily: Fonts.extrabold },

  // Feature bands
  bandsWrap: { backgroundColor: '#0E0B22', paddingTop: 40, paddingBottom: 100, marginTop: -1 },
  band: { flexDirection: 'row', borderRadius: 32, backgroundColor: BAND, padding: 40, gap: 40, alignItems: 'center' },
  bandMockWrap: { position: 'relative' },
  bandCopy: {},
  bandBody: { color: '#B9B7CE', fontSize: 16, lineHeight: 26, fontFamily: Fonts.regular, marginTop: 18 },
  bandCard: { borderRadius: 24, backgroundColor: BAND_CARD, padding: 16 },
  bandCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  bandCardHeaderMute: { color: MUTE, fontSize: 11.5, fontFamily: Fonts.extrabold },
  bandCardHeaderAccent: { color: LAVENDER, fontSize: 11.5, fontFamily: Fonts.extrabold },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: BAND_ROW, borderRadius: 18, padding: 11 },
  bandRowThumb: { width: 62, height: 62, borderRadius: 16, overflow: 'hidden', backgroundColor: RAISE },
  bandRowTitle: { color: '#fff', fontSize: 14, fontFamily: Fonts.bold },
  bandRowMeta: { color: MUTE, fontSize: 12, fontFamily: Fonts.regular, marginTop: 6 },
  bandFloatImg: { position: 'absolute', right: -30, bottom: -24, width: 130, height: 130, borderRadius: 22, overflow: 'hidden' },
  bandHeroImg: { height: 150, borderRadius: 18, overflow: 'hidden', marginBottom: 14, backgroundColor: RAISE },
  bandJoinRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  bandEventTitle: { color: '#fff', fontSize: 16, fontFamily: Fonts.extrabold },
  bandJoinBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999, backgroundColor: ACCENT },
  bandJoinBtnText: { color: '#fff', fontSize: 13, fontFamily: Fonts.extrabold },
  bandDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 16 },
  bandGoingLabel: { color: MUTE, fontSize: 11, fontFamily: Fonts.extrabold, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 12 },
  bandAttendeeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  attendeeCell: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: BAND_ROW, borderRadius: 16, padding: 10, width: '48%' },
  attendeeName: { color: '#fff', fontSize: 12.5, fontFamily: Fonts.bold },
  attendeeSub: { color: MUTE, fontSize: 10.5, fontFamily: Fonts.regular },
  bandFloatPill: { position: 'absolute', left: -28, top: -22, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#F4F4F6' },
  bandFloatPillText: { color: '#111116', fontSize: 12.5, fontFamily: Fonts.extrabold },
  bandTallImg: { borderRadius: 24, overflow: 'hidden', height: 310, backgroundColor: RAISE },
  bandGoingCard: { position: 'absolute', right: -26, bottom: -22, width: 230, borderRadius: 20, backgroundColor: '#F4F4F6', padding: 16 },
  bandGoingCardLabel: { color: ACCENT, fontSize: 10.5, fontFamily: Fonts.extrabold, letterSpacing: 0.6 },
  bandGoingCardTitle: { color: '#111116', fontSize: 15, fontFamily: Fonts.extrabold, marginTop: 7 },
  bandGoingCardSub: { color: '#5A5A66', fontSize: 12, fontFamily: Fonts.regular, marginTop: 5, lineHeight: 17 },
  bandGoingCardBtnRow: { flexDirection: 'row', gap: 7, marginTop: 12 },
  bandGoingCardBtn: { flex: 1, paddingVertical: 8, borderRadius: 999, backgroundColor: '#EAEAEF', alignItems: 'center' },
  bandGoingCardBtnText: { color: '#111116', fontSize: 11, fontFamily: Fonts.extrabold },

  // Marquee
  marqueeWrap: { backgroundColor: ACCENT, paddingVertical: 20, overflow: 'hidden' },
  marqueeRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  marqueeText: { color: '#fff', fontSize: 30, fontFamily: TITLE_FONT, textTransform: 'uppercase', letterSpacing: 0.5 },
  marqueeDot: { width: 8, height: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.6)' },

  // Categories
  catCard: { borderRadius: 28, overflow: 'hidden', backgroundColor: RAISE },
  catCardLabel: { position: 'absolute', left: 24, bottom: 20 },
  catCardTitle: { color: '#fff', fontSize: 24, fontFamily: TITLE_FONT, textTransform: 'uppercase', letterSpacing: 0.5 },
  catCardSub: { color: 'rgba(244,244,246,0.6)', fontSize: 12.5, marginTop: 6, fontFamily: Fonts.semibold },
  educationCard: { borderRadius: 28, backgroundColor: ACCENT, padding: 22, justifyContent: 'space-between' },
  educationTitle: { color: '#fff', fontSize: 24, fontFamily: TITLE_FONT, textTransform: 'uppercase', letterSpacing: 0.5 },
  educationBody: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 20, fontFamily: Fonts.regular },

  // Experiences
  expBand: { backgroundColor: ACCENT, paddingVertical: 90 },
  expGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 8, alignItems: 'flex-start' },
  expCol: { gap: 16 },
  expCard: { backgroundColor: '#0A0A0C', borderRadius: 22, overflow: 'hidden' },
  expHighlightCard: { backgroundColor: '#F4F4F6', borderRadius: 22, padding: 24 },
  expImageWrap: { backgroundColor: RAISE },
  expPhotoOnly: { borderRadius: 22, overflow: 'hidden', backgroundColor: RAISE },
  expPhotoOverlay: { position: 'absolute', left: 14, right: 14, bottom: 14, padding: 13, borderRadius: 18, backgroundColor: 'rgba(10,10,12,0.74)' },
  expPhotoOverlayTitle: { color: '#fff', fontSize: 13, fontFamily: Fonts.extrabold },
  expPhotoOverlaySub: { color: 'rgba(244,244,246,0.62)', fontSize: 11.5, fontFamily: Fonts.regular, marginTop: 4 },
  expHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  expUser: { color: '#fff', fontSize: 12.5, fontFamily: Fonts.extrabold },
  expUserTime: { color: MUTE, fontFamily: Fonts.semibold },
  expQuote: { color: '#DEDEE4', fontSize: 14, lineHeight: 21.5, fontFamily: Fonts.regular },
  expHighlightQuote: { color: '#141419', fontSize: 19, lineHeight: 26, fontFamily: Fonts.extrabold, letterSpacing: -0.3 },
  expFooterText: { color: MUTE, fontSize: 11.5, fontFamily: Fonts.semibold, marginTop: 12 },

  // Statement
  statement: { overflow: 'hidden', justifyContent: 'center' },
  statementInner: { paddingHorizontal: 20, maxWidth: 1240, width: '100%', alignSelf: 'center' },
  statementText: { color: '#fff', fontFamily: TITLE_FONT, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Nearby
  mapBox: { borderRadius: 32, overflow: 'hidden', marginTop: 4, backgroundColor: '#0B0B14' },
  mapPin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -8, marginTop: -8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  mapPinPulse: { position: 'absolute', width: 16, height: 16, borderRadius: 99, backgroundColor: ACCENT },
  mapPinDot: { width: 16, height: 16, borderRadius: 99, backgroundColor: ACCENT, borderWidth: 3, borderColor: '#0B0B14' },
  mapChip: { position: 'absolute', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 999, backgroundColor: 'rgba(20,20,28,0.94)' },
  mapChipLight: { backgroundColor: '#F4F4F6' },
  mapChipText: { color: '#fff', fontSize: 12.5, fontFamily: Fonts.extrabold },
  mapChipTextDark: { color: '#111116', fontSize: 12.5, fontFamily: Fonts.extrabold },
  mapCards: { position: 'absolute', right: 28, top: 28, width: 308, gap: 12 },
  mapCard: { flexDirection: 'row', gap: 13, backgroundColor: 'rgba(18,18,26,0.96)', borderRadius: 22, padding: 13 },
  mapCardThumb: { width: 66, height: 66, borderRadius: 16, overflow: 'hidden', backgroundColor: RAISE },
  mapCardDist: { color: LAVENDER, fontSize: 10.5, fontFamily: Fonts.extrabold, letterSpacing: 0.5 },
  mapCardTitle: { color: '#fff', fontSize: 14, fontFamily: Fonts.extrabold, marginTop: 6 },
  mapCardGoing: { color: MUTE, fontSize: 11.5, marginTop: 7, fontFamily: Fonts.regular },
  mapFilters: { position: 'absolute', left: 26, bottom: 26, flexDirection: 'row', gap: 8 },
  mapFilterPill: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(20,20,28,0.94)' },
  mapFilterText: { color: MUTE, fontSize: 12.5, fontFamily: Fonts.semibold },
  mapFilterTextActive: { color: '#fff', fontSize: 12.5, fontFamily: Fonts.semibold },

  // Create
  createPanel: { flexDirection: 'row', borderRadius: 32, backgroundColor: BAND, padding: 40, gap: 40, alignItems: 'center' },
  createCollageWrap: { position: 'relative' },
  createGrid: { gap: 12 },
  createImgWide: { height: 180, borderRadius: 22, overflow: 'hidden', backgroundColor: RAISE },
  createImgRow: { flexDirection: 'row', gap: 12 },
  createImgHalf: { flex: 1, height: 180, borderRadius: 22, overflow: 'hidden', backgroundColor: RAISE },
  createFloatPill: { position: 'absolute', right: -22, top: -20, paddingVertical: 11, paddingHorizontal: 17, borderRadius: 999, backgroundColor: '#F4F4F6' },
  createFloatPillText: { color: '#111116', fontSize: 12.5, fontFamily: Fonts.extrabold },
  createCopy: {},
  mockForm: { borderRadius: 24, backgroundColor: BAND_CARD, padding: 20 },
  mockFormLabel: { color: MUTE, fontSize: 10.5, fontFamily: Fonts.extrabold, letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 14 },
  mockField: { borderRadius: 14, backgroundColor: BAND_ROW, padding: 12, marginTop: 10 },
  mockFieldLabel: { color: MUTE, fontSize: 10, fontFamily: Fonts.extrabold, letterSpacing: 0.6, textTransform: 'uppercase' },
  mockFieldValue: { color: '#fff', fontSize: 14, fontFamily: Fonts.semibold, marginTop: 4 },
  mockPillsRow: { flexDirection: 'row', gap: 7, marginTop: 9, flexWrap: 'wrap' },
  mockPill: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, backgroundColor: BAND_ROW },
  mockPillText: { color: MUTE, fontSize: 12.5, fontFamily: Fonts.semibold },
  mockPillTextActive: { color: '#fff', fontSize: 12.5, fontFamily: Fonts.semibold },
  mockSliderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, backgroundColor: BAND_ROW, padding: 13, marginTop: 12 },
  mockSliderTrackRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mockSliderTrack: { width: 120, height: 4, borderRadius: 99, backgroundColor: '#2A2745' },
  mockSliderFill: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '58%', backgroundColor: ACCENT, borderRadius: 99 },
  mockSliderThumb: { position: 'absolute', left: '58%', top: -5, width: 14, height: 14, borderRadius: 99, backgroundColor: '#fff', marginLeft: -7 },
  mockCreateBtn: { marginTop: 18, backgroundColor: ACCENT, borderRadius: 999, paddingVertical: 15, alignItems: 'center' },

  // FAQ
  faqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  faqItem: { borderRadius: 22, backgroundColor: PANEL, padding: 20 },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  faqQ: { color: '#fff', fontSize: 15.5, fontFamily: Fonts.extrabold, flex: 1 },
  faqPlus: { color: LAVENDER, fontSize: 20, fontFamily: Fonts.regular },
  faqA: { color: MUTE, fontSize: 14, lineHeight: 22, fontFamily: Fonts.regular, marginTop: 12 },

  // Scroll end
  endImg: { width: '100%', maxWidth: 1000, borderRadius: 32, overflow: 'hidden', backgroundColor: RAISE },

  // Footer
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerCol: { gap: 10 },
  footerHeading: { color: '#5E5E68', fontSize: 10.5, fontFamily: Fonts.extrabold, letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 2 },
  footerLink: { color: MUTE, fontSize: 13.5, fontFamily: Fonts.medium },
  footerTagline: { color: MUTE, fontSize: 13.5, lineHeight: 20, fontFamily: Fonts.regular, marginTop: 12 },
  copyright: { color: '#5E5E68', fontSize: 12.5, fontFamily: Fonts.regular, marginTop: 40, paddingTop: 20, borderTopWidth: 1, borderTopColor: LINE },
});

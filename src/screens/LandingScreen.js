// Marketing landing page — web only (see AppNavigator's Platform.OS-gated
// initialRouteName). Native builds skip straight to WelcomeScreen; a pitch
// page doesn't make sense inside an already-installed app.
//
// Images come from a small pool of verified-working Unsplash photo IDs (same
// CDN host pattern as src/constants/heroImages.js), picked per keyword via a
// deterministic hash — source.unsplash.com's old keyword-search redirect was
// tried first per the "random from Unsplash" request but now 503s (the
// service was deprecated in 2023), so this is the closest live equivalent.
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { Fonts } from '../theme/fonts';
import { useIsWideWeb } from '../utils/responsive';

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

const CATEGORIES = [
  { key: 'sports', label: 'Sports', sub: '148 activities · futsal, climbing, laps', img: unsplash('futsal,sports', 900, 600), size: 'wide' },
  { key: 'adventure', label: 'Adventure', sub: '62 activities', img: unsplash('hiking,mountain', 700, 600), size: 'wide' },
  { key: 'gaming', label: 'Gaming', img: unsplash('gaming,esports', 500, 420), size: 'third' },
  { key: 'arts', label: 'Arts', img: unsplash('pottery,ceramics', 500, 420), size: 'third' },
  { key: 'lifestyle', label: 'Lifestyle', img: unsplash('rooftop,dinner', 500, 420), size: 'third' },
  { key: 'tech', label: 'Tech', sub: 'Build nights, demo evenings, repair cafés', img: unsplash('hackathon,coding', 900, 480), size: 'wide' },
];

const STEPS = [
  { n: '01', title: 'Find something nearby', body: "Open the app, see what's actually happening within walking distance today.", img: unsplash('friends,running', 700, 500) },
  { n: '02', title: 'Find your people', body: "See who's going and what they're into before you commit. No cold rooms.", img: unsplash('boardgame,friends', 700, 500) },
  { n: '03', title: 'Make it happen', body: 'Show up, do the thing, then post it back so the next person finds it.', img: unsplash('climbing,chalk', 700, 500) },
];

const EXPERIENCES = [
  { user: 'Aarav R.', time: '2h', quote: '"Turned up alone to a 6 a-side and left with a WhatsApp group of nine."', likes: 214, tag: 'Sunday 6 a-side', img: unsplash('football,friends', 600, 500) },
  { user: 'Prisha L.', time: 'yesterday', quote: '"I moved here in March and knew nobody. Fourteen activities later my weekends are full."', likes: 512, tag: 'Pottery, beginners', highlight: true },
  { user: 'Kiran T.', time: '3d', quote: '"Hosted a chess table in the park expecting two people. Sixteen showed up."', likes: 189, tag: 'Chess in the park', img: unsplash('chess,park', 600, 420) },
  { user: 'Sneha M.', time: '5d', quote: '"Left the house at 4 a.m. with five strangers. Watched the valley wake up."', likes: 331, tag: 'Sunrise hike to Shivapuri', img: unsplash('hiking,sunrise', 600, 620) },
  { user: 'Dev J.', time: '1w', quote: '"Found a 5-stack that actually communicates. We\'ve played every Friday since."', likes: 96, tag: 'Valorant 5-stack', img: unsplash('gaming,night', 600, 500) },
];

const NEARBY_CARDS = [
  { dist: '0.4 km away', title: 'Floodlit futsal, 2 spots', going: '8 going', img: unsplash('futsal,night', 200, 200) },
  { dist: '0.9 km away', title: 'Beginner swim laps', going: '5 going', img: unsplash('swimming,pool', 200, 200) },
  { dist: '1.7 km away', title: 'Open mic, Thursday', going: '17 going', img: unsplash('concert,mic', 200, 200) },
];

const FAQS = [
  { q: 'Is Spurth free to use?', a: "Discovering, joining and creating activities is free. Some hosts charge for their own costs — venue, gear, entry — and that's shown on the activity before you join." },
  { q: 'Do I have to know someone to join?', a: 'No. Most people arrive on their own. You can see who else is going and what they\'re into before you commit.' },
  { q: 'Is my exact location shared?', a: 'No. Spurth uses an approximate area to sort activities by distance. Precise meeting points are only visible to people who have joined.' },
  { q: 'What are Experiences?', a: 'Posts made after an activity — photos and a few words, linked back to the activity they came from, so the next person can find it and join.' },
];

function Section({ children, style }) {
  return <View style={[styles.section, style]}>{children}</View>;
}

function CategoryCard({ item, isWide }) {
  const wide = item.size === 'wide';
  return (
    <View
      style={[
        styles.catCard,
        { width: isWide ? (wide ? '48%' : '31%') : '100%', height: wide ? 240 : 190 },
      ]}
    >
      <Image source={{ uri: item.img }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(6,6,8,0.05)', 'rgba(6,6,8,0.88)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.catCardLabel}>
        <Text style={[styles.catCardTitle, wide && { fontSize: 26 }]}>{item.label}</Text>
        {item.sub ? <Text style={styles.catCardSub}>{item.sub}</Text> : null}
      </View>
    </View>
  );
}

function StoryCard({ step }) {
  return (
    <View style={styles.storyCard}>
      <View style={styles.storyImageWrap}>
        <Image source={{ uri: step.img }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(6,6,8,0)', 'rgba(6,6,8,0.55)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View style={styles.storyTextRow}>
        <Text style={styles.storyNum}>{step.n}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.storyTitle}>{step.title}</Text>
          <Text style={styles.storyBody}>{step.body}</Text>
        </View>
      </View>
    </View>
  );
}

function ExperienceCard({ item }) {
  if (item.highlight) {
    return (
      <View style={[styles.expCard, { backgroundColor: '#F4F4F6' }]}>
        <View style={styles.expHeader}>
          <View style={[styles.expAvatar, { backgroundColor: 'rgba(20,20,25,0.1)' }]}>
            <Text style={[styles.expAvatarText, { color: '#141419' }]}>
              {item.user.split(' ').map(w => w[0]).join('')}
            </Text>
          </View>
          <Text style={[styles.expUser, { color: '#141419' }]}>
            {item.user} <Text style={{ color: 'rgba(20,20,25,0.55)', fontFamily: Fonts.regular }}>· {item.time}</Text>
          </Text>
        </View>
        <Text style={[styles.expQuote, { color: '#141419', fontSize: 17, fontFamily: Fonts.bold }]}>{item.quote}</Text>
        <View style={styles.expFooter}>
          <Ionicons name="flame" size={13} color={ACCENT} />
          <Text style={[styles.expFooterText, { color: ACCENT }]}>{item.likes} · {item.tag}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.expCard}>
      {item.img ? (
        <View style={styles.expImageWrap}>
          <Image source={{ uri: item.img }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        </View>
      ) : null}
      <View style={styles.expHeader}>
        <View style={styles.expAvatar}>
          <Text style={styles.expAvatarText}>{item.user.split(' ').map(w => w[0]).join('')}</Text>
        </View>
        <Text style={styles.expUser}>
          {item.user} <Text style={{ color: MUTE, fontFamily: Fonts.regular }}>· {item.time}</Text>
        </Text>
      </View>
      <Text style={styles.expQuote}>{item.quote}</Text>
      <View style={styles.expFooter}>
        <Ionicons name="flame" size={13} color={ACCENT} />
        <Text style={styles.expFooterText}>{item.likes} · {item.tag}</Text>
      </View>
    </View>
  );
}

export default function LandingScreen({ navigation }) {
  const isWide = useIsWideWeb();
  const [openFaq, setOpenFaq] = useState(null);

  const goJoin = () => navigation.navigate('Welcome');
  const goLogin = () => navigation.navigate('Login');

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.rootContent} showsVerticalScrollIndicator={false}>
      {/* NAV */}
      <View style={styles.nav}>
        <Section style={styles.navInner}>
          <View style={styles.navBrand}>
            <View style={styles.navMark} />
            <Text style={styles.navBrandText}>Spurth</Text>
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
        <View style={{ maxWidth: 680 }}>
          <Text style={[styles.h1, { fontSize: isWide ? 72 : 42 }]}>Find something{'\n'}worth doing.</Text>
          <Text style={styles.lead}>
            Discover activities around you, meet people who are into the same things, and make experiences worth sharing.
          </Text>
          <View style={styles.heroCtaRow}>
            <TouchableOpacity onPress={goJoin} style={styles.ctaFilled} activeOpacity={0.85}>
              <Text style={styles.ctaFilledText}>Explore Activities</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goJoin} style={styles.ctaOutline} activeOpacity={0.85}>
              <Text style={styles.ctaOutlineText}>Create an Activity</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.heroImgRow, !isWide && { flexDirection: 'column' }]}>
          <View style={[styles.heroImgBig, !isWide && { width: '100%', height: 260 }]}>
            <Image source={{ uri: unsplash('adventure,friends,outdoors', 1000, 700) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          </View>
          <View style={[styles.heroImgSmallWrap, !isWide && { width: '100%' }]}>
            <View style={styles.heroImgSmall}>
              <Image source={{ uri: unsplash('friends,hangout', 500, 500) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            </View>
            <View style={styles.heroAvatarRow}>
              <View style={styles.avatarStack}>
                <View style={[styles.miniAvatar, { backgroundColor: '#2A2A33' }]}><Text style={styles.miniAvatarText}>AR</Text></View>
                <View style={[styles.miniAvatar, { backgroundColor: '#33323F', marginLeft: -9 }]}><Text style={styles.miniAvatarText}>NK</Text></View>
                <View style={[styles.miniAvatar, { backgroundColor: ACCENT, marginLeft: -9 }]}><Text style={[styles.miniAvatarText, { color: '#fff' }]}>+9</Text></View>
              </View>
              <Text style={styles.heroAvatarCaption}>joined something{'\n'}in the last hour</Text>
            </View>
          </View>
        </View>
      </Section>

      {/* ACTIVITIES */}
      <Section id="activities" style={{ marginTop: isWide ? 140 : 80 }}>
        <View style={[styles.rowBetween, !isWide && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Text style={[styles.h2, { fontSize: isWide ? 52 : 34 }]}>Whatever you're into.</Text>
          <Text style={[styles.leadSmall, { maxWidth: 320, marginTop: isWide ? 0 : 12 }]}>
            Seven worlds, one feed. Follow the ones you care about and Spurth keeps them close.
          </Text>
        </View>
        <View style={styles.catGrid}>
          {CATEGORIES.map(c => <CategoryCard key={c.key} item={c} isWide={isWide} />)}
        </View>
      </Section>

      {/* STORY */}
      <Section id="story" style={{ marginTop: isWide ? 140 : 80 }}>
        <View style={{ alignItems: 'center', marginBottom: 44 }}>
          <Text style={[styles.h2, { fontSize: isWide ? 52 : 32, textAlign: 'center' }]}>Find. Join. Experience.</Text>
          <Text style={[styles.leadSmall, { textAlign: 'center', marginTop: 14, maxWidth: 380 }]}>
            Three taps between an empty evening and a story worth telling.
          </Text>
        </View>
        <View style={[styles.storyRow, !isWide && { flexDirection: 'column' }]}>
          {STEPS.map(s => (
            <View key={s.n} style={[styles.storyCol, isWide && { width: '31.5%' }]}>
              <StoryCard step={s} />
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
            {EXPERIENCES.map((e, i) => (
              <View key={e.user} style={[styles.expCol, isWide && { width: '19%' }]}>
                <ExperienceCard item={e} />
              </View>
            ))}
          </View>
        </Section>
      </View>

      {/* BRAND STATEMENT */}
      <View style={[styles.statement, { marginTop: isWide ? 140 : 80, height: isWide ? 460 : 320 }]}>
        <Image source={{ uri: unsplash('friends,walking,sunset', 1400, 700) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(8,8,10,0.92)', 'rgba(8,8,10,0.3)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.statementInner}>
          <Text style={[styles.statementText, { fontSize: isWide ? 64 : 34 }]}>
            Less scrolling.{'\n'}<Text style={{ color: ACCENT }}>More doing.</Text>
          </Text>
        </View>
      </View>

      {/* NEARBY */}
      <Section id="nearby" style={{ marginTop: isWide ? 140 : 80 }}>
        <View style={[styles.rowBetween, !isWide && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <View style={{ maxWidth: 520 }}>
            <Text style={[styles.h2, { fontSize: isWide ? 44 : 30 }]}>Something's probably happening near you.</Text>
            <Text style={[styles.leadSmall, { marginTop: 14 }]}>Nine activities inside a twenty-minute walk, right now.</Text>
          </View>
          <TouchableOpacity onPress={goJoin} style={[styles.ctaFilled, !isWide && { marginTop: 18 }]}>
            <Text style={styles.ctaFilledText}>Explore Nearby</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.mapBox, { height: isWide ? 420 : 300 }]}>
          <Image source={{ uri: unsplash('city,aerial,night', 1200, 700) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(12,12,16,0.35)', 'rgba(12,12,16,0.85)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.mapPin}>
            <View style={styles.mapPinDot} />
          </View>

          {isWide && (
            <View style={styles.mapCards}>
              {NEARBY_CARDS.map(c => (
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
          )}

          <View style={styles.mapFilters}>
            <View style={[styles.mapFilterPill, { backgroundColor: ACCENT }]}><Text style={styles.mapFilterTextActive}>Today</Text></View>
            <View style={styles.mapFilterPill}><Text style={styles.mapFilterText}>This week</Text></View>
            <View style={styles.mapFilterPill}><Text style={styles.mapFilterText}>Free only</Text></View>
          </View>
        </View>
      </Section>

      {/* CREATE */}
      <Section id="create" style={{ marginTop: isWide ? 140 : 80 }}>
        <View style={[styles.createRow, !isWide && { flexDirection: 'column' }]}>
          <View style={[styles.createCollage, isWide && { width: '46%' }]}>
            <View style={styles.createImgWide}>
              <Image source={{ uri: unsplash('friends,planning', 900, 400) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            </View>
            <View style={styles.createImgRow}>
              <View style={styles.createImgHalf}>
                <Image source={{ uri: unsplash('whiteboard,plan', 450, 400) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </View>
              <View style={styles.createImgHalf}>
                <Image source={{ uri: unsplash('group,arrival', 450, 400) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </View>
            </View>
          </View>

          <View style={[styles.createCopy, isWide && { width: '46%' }]}>
            <Text style={[styles.h2, { fontSize: isWide ? 42 : 30 }]}>Can't find your thing? Start it.</Text>
            <Text style={[styles.leadSmall, { marginTop: 14, marginBottom: 26 }]}>
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
              <View style={styles.mockPillsRow}>
                <View style={[styles.mockPill, { backgroundColor: ACCENT }]}><Text style={styles.mockPillTextActive}>Sports</Text></View>
                <View style={styles.mockPill}><Text style={styles.mockPillText}>Adventure</Text></View>
                <View style={styles.mockPill}><Text style={styles.mockPillText}>Gaming</Text></View>
              </View>
              <TouchableOpacity onPress={goJoin} style={styles.mockCreateBtn} activeOpacity={0.85}>
                <Text style={styles.ctaFilledText}>Create an Activity</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Section>

      {/* FAQ */}
      <Section style={{ marginTop: isWide ? 140 : 80 }}>
        <Text style={[styles.h2, { fontSize: isWide ? 44 : 30, marginBottom: 32 }]}>Questions</Text>
        <View style={[styles.faqGrid, !isWide && { flexDirection: 'column' }]}>
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <TouchableOpacity
                key={f.q}
                style={[styles.faqItem, isWide && { width: '48%' }]}
                activeOpacity={0.8}
                onPress={() => setOpenFaq(open ? null : i)}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQ}>{f.q}</Text>
                  <Ionicons name={open ? 'remove' : 'add'} size={20} color={ACCENT} />
                </View>
                {open && <Text style={styles.faqA}>{f.a}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </Section>

      {/* FINAL CTA */}
      <Section style={{ marginTop: isWide ? 140 : 80 }}>
        <View style={[styles.finalBox, { height: isWide ? 500 : 340 }]}>
          <Image source={{ uri: unsplash('friends,laughing,group', 1200, 700) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(8,8,10,0.25)', 'rgba(8,8,10,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.finalInner}>
            <Text style={[styles.finalText, { fontSize: isWide ? 56 : 32 }]}>What are you{'\n'}doing next?</Text>
            <Text style={styles.finalSub}>Find something. Find your people. Make it happen.</Text>
            <TouchableOpacity onPress={goJoin} style={[styles.ctaFilled, { marginTop: 22, alignSelf: 'flex-start' }]} activeOpacity={0.85}>
              <Text style={styles.ctaFilledText}>Explore Spurth</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Section>

      {/* FOOTER */}
      <Section style={{ marginTop: 100, paddingTop: 40, paddingBottom: 44, borderTopWidth: 1, borderTopColor: LINE }}>
        <View style={[styles.footerRow, !isWide && { flexDirection: 'column', gap: 28 }]}>
          <View style={{ maxWidth: 260 }}>
            <View style={styles.navBrand}>
              <View style={styles.navMark} />
              <Text style={styles.navBrandText}>Spurth</Text>
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
  nav: { borderBottomWidth: 1, borderBottomColor: LINE, position: 'sticky', top: 0, zIndex: 40, backgroundColor: 'rgba(10,10,12,0.9)' },
  navInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 32 },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 9, marginRight: 'auto' },
  navMark: { width: 24, height: 24, borderRadius: 7, backgroundColor: ACCENT },
  navBrandText: { color: '#fff', fontSize: 18, fontFamily: Fonts.extrabold, letterSpacing: -0.5 },
  navLinks: { flexDirection: 'row', gap: 26 },
  navLink: { color: MUTE, fontSize: 14, fontFamily: Fonts.medium },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navLoginBtn: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 999, borderWidth: 1, borderColor: LINE },
  navLoginText: { color: '#fff', fontSize: 13.5, fontFamily: Fonts.semibold },
  navJoinBtn: { paddingVertical: 9, paddingHorizontal: 17, borderRadius: 999, backgroundColor: ACCENT },
  navJoinText: { color: '#fff', fontSize: 13.5, fontFamily: Fonts.bold },

  // Typography
  h1: { color: '#fff', fontFamily: Fonts.extrabold, lineHeight: undefined, letterSpacing: -1 },
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

  // Hero images
  heroImgRow: { flexDirection: 'row', gap: 16, marginTop: 44 },
  heroImgBig: { flex: 1.6, height: 340, borderRadius: 26, overflow: 'hidden', backgroundColor: RAISE },
  heroImgSmallWrap: { flex: 1 },
  heroImgSmall: { height: 260, borderRadius: 26, overflow: 'hidden', backgroundColor: RAISE },
  heroAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  avatarStack: { flexDirection: 'row' },
  miniAvatar: { width: 28, height: 28, borderRadius: 99, borderWidth: 2, borderColor: BG, alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { color: '#ccc', fontSize: 10, fontFamily: Fonts.bold },
  heroAvatarCaption: { color: MUTE, fontSize: 12.5, lineHeight: 17, fontFamily: Fonts.regular },

  // Categories
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  catCard: { borderRadius: 20, overflow: 'hidden', backgroundColor: RAISE },
  catCardLabel: { position: 'absolute', left: 20, bottom: 18 },
  catCardTitle: { color: '#fff', fontSize: 20, fontFamily: Fonts.extrabold, letterSpacing: -0.5 },
  catCardSub: { color: 'rgba(244,244,246,0.6)', fontSize: 12, marginTop: 4, fontFamily: Fonts.medium },

  // Story
  storyRow: { flexDirection: 'row', gap: 26, justifyContent: 'space-between' },
  storyCol: { marginBottom: 26 },
  storyCard: { flex: 1 },
  storyImageWrap: { height: 200, borderRadius: 22, overflow: 'hidden', backgroundColor: RAISE },
  storyTextRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  storyNum: { color: ACCENT, fontSize: 13, fontFamily: Fonts.extrabold, letterSpacing: 0.5 },
  storyTitle: { color: '#fff', fontSize: 19, fontFamily: Fonts.bold, letterSpacing: -0.3 },
  storyBody: { color: MUTE, fontSize: 14, lineHeight: 21, fontFamily: Fonts.regular, marginTop: 6 },

  // Experiences
  expBand: { backgroundColor: ACCENT, paddingVertical: 90 },
  expGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 },
  expCol: { marginBottom: 14 },
  expCard: { backgroundColor: '#0A0A0C', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 14, overflow: 'hidden' },
  expImageWrap: { height: 130, borderRadius: 12, overflow: 'hidden', marginBottom: 12, backgroundColor: RAISE },
  expHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  expAvatar: { width: 26, height: 26, borderRadius: 99, backgroundColor: '#2E2E38', alignItems: 'center', justifyContent: 'center' },
  expAvatarText: { color: '#ccc', fontSize: 9.5, fontFamily: Fonts.bold },
  expUser: { color: '#fff', fontSize: 12, fontFamily: Fonts.bold },
  expQuote: { color: '#DEDEE4', fontSize: 13, lineHeight: 19, fontFamily: Fonts.regular },
  expFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  expFooterText: { color: MUTE, fontSize: 11, fontFamily: Fonts.semibold },

  // Statement
  statement: { borderRadius: 0, overflow: 'hidden', justifyContent: 'center' },
  statementInner: { paddingHorizontal: 20, maxWidth: 1240, width: '100%', alignSelf: 'center' },
  statementText: { color: '#fff', fontFamily: Fonts.extrabold, letterSpacing: -1, lineHeight: undefined },

  // Nearby
  mapBox: { borderRadius: 26, overflow: 'hidden', marginTop: 4 },
  mapPin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -8, marginTop: -8, width: 16, height: 16, borderRadius: 99, backgroundColor: ACCENT, borderWidth: 3, borderColor: '#0C0C10' },
  mapPinDot: { flex: 1 },
  mapCards: { position: 'absolute', right: 20, top: 20, width: 280, gap: 10 },
  mapCard: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(18,18,22,0.95)', borderWidth: 1, borderColor: LINE, borderRadius: 16, padding: 10 },
  mapCardThumb: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden', backgroundColor: RAISE },
  mapCardDist: { color: '#B7ADFF', fontSize: 10.5, fontFamily: Fonts.bold, letterSpacing: 0.4, textTransform: 'uppercase' },
  mapCardTitle: { color: '#fff', fontSize: 13, fontFamily: Fonts.bold, marginTop: 4 },
  mapCardGoing: { color: MUTE, fontSize: 11, marginTop: 6, fontFamily: Fonts.regular },
  mapFilters: { position: 'absolute', left: 20, bottom: 20, flexDirection: 'row', gap: 8 },
  mapFilterPill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(18,18,22,0.92)', borderWidth: 1, borderColor: LINE },
  mapFilterText: { color: MUTE, fontSize: 12, fontFamily: Fonts.semibold },
  mapFilterTextActive: { color: '#fff', fontSize: 12, fontFamily: Fonts.semibold },

  // Create
  createRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 30 },
  createCollage: { gap: 12 },
  createImgWide: { height: 180, borderRadius: 20, overflow: 'hidden', backgroundColor: RAISE },
  createImgRow: { flexDirection: 'row', gap: 12 },
  createImgHalf: { flex: 1, height: 180, borderRadius: 20, overflow: 'hidden', backgroundColor: RAISE },
  createCopy: { marginTop: 24 },
  mockForm: { borderWidth: 1, borderColor: LINE, borderRadius: 24, backgroundColor: SURFACE, padding: 20 },
  mockFormLabel: { color: MUTE, fontSize: 10.5, fontFamily: Fonts.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 },
  mockField: { borderWidth: 1, borderColor: LINE, borderRadius: 14, backgroundColor: RAISE, padding: 12, marginTop: 10 },
  mockFieldLabel: { color: MUTE, fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.5, textTransform: 'uppercase' },
  mockFieldValue: { color: '#fff', fontSize: 14, fontFamily: Fonts.semibold, marginTop: 4 },
  mockPillsRow: { flexDirection: 'row', gap: 7, marginTop: 14, flexWrap: 'wrap' },
  mockPill: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: LINE },
  mockPillText: { color: MUTE, fontSize: 12, fontFamily: Fonts.semibold },
  mockPillTextActive: { color: '#fff', fontSize: 12, fontFamily: Fonts.semibold },
  mockCreateBtn: { marginTop: 18, backgroundColor: ACCENT, borderRadius: 999, paddingVertical: 13, alignItems: 'center' },

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
  finalSub: { color: 'rgba(244,244,246,0.72)', fontSize: 16, fontFamily: Fonts.regular, marginTop: 16 },

  // Footer
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerCol: { gap: 10 },
  footerHeading: { color: '#5E5E68', fontSize: 10.5, fontFamily: Fonts.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
  footerLink: { color: MUTE, fontSize: 13.5, fontFamily: Fonts.medium },
  footerTagline: { color: MUTE, fontSize: 13.5, lineHeight: 20, fontFamily: Fonts.regular, marginTop: 12 },
  copyright: { color: '#5E5E68', fontSize: 12, fontFamily: Fonts.regular, marginTop: 36 },
});

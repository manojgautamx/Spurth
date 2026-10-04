import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  ImageBackground,
  SafeAreaView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import axiosInstance from '../utils/axiosInstance';
import useAxios from '../utils/useAxios';
import { AuthContext } from '../context/AuthContext';
import { Fonts } from '../theme/fonts';
import ActivityCard from '../components/ActivityCard';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';
import { LocationContext, filterActivitiesByDistance } from '../context/LocationContext';
import { BASE_URL } from '../config';
import { useDistance } from '../context/DistanceContext';
import CreateIcon from '../assets/icons/CreateIcon';
import { useIsWideWeb } from '../utils/responsive';
import PostsRail from '../components/web/PostsRail';
import HomeSkeleton from '../components/skeletons/HomeSkeleton';
import { rankByInterest } from '../utils/rankByInterest';
import { fetchAllPages, listFrom } from '../utils/paginated';
import { getErrorMessage } from '../utils/errorMessage';
import ErrorState from '../components/ErrorState';

const NEARBY_MAX = 5;

const HomeScreen = () => {
  const isWideWeb = useIsWideWeb();
  const [myActivities, setMyActivities] = useState([]);
  const [otherActivities, setOtherActivities] = useState([]);
  const [joinedActivities, setJoinedActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Nearby');
  const {
    location,
    locationLoading,
    locationSource,
    locationCity,
    permissionPermanentlyDenied,
    openLocationSettings,
    refreshLocation,
  } = useContext(LocationContext);

  const axios = axiosInstance;
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const { distanceKm } = useDistance();
  const [emailVerified, setEmailVerified] = useState(true); // default true to avoid flash
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyExpanded, setVerifyExpanded] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Location explainer/nudge — expanded (the full card) only on the very
  // first Home visit where there's actually something to explain (GPS
  // didn't resolve); every visit after that gets the collapsed pill.
  // Starts "seen" (true) so the pill/card doesn't flash expanded before
  // AsyncStorage answers, mirroring profileComplete's own null-then-resolve
  // pattern in AppNavigator.js.
  const [locationCardExpanded, setLocationCardExpanded] = useState(false);
  const [locationExplainerSeen, setLocationExplainerSeen] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('locationExplainerSeen').then(val => {
      if (val !== 'true') setLocationExplainerSeen(false);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (locationLoading || locationSource === 'gps' || locationExplainerSeen) return;
    setLocationCardExpanded(true);
    setLocationExplainerSeen(true);
    AsyncStorage.setItem('locationExplainerSeen', 'true').catch(() => {});
  }, [locationLoading, locationSource, locationExplainerSeen]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      // The Created and Going tabs promise the user their own complete
      // list, so those two are walked to the end — bounded by how many
      // activities one person has. The public feed is not bounded by
      // anything, so it takes the first page only; Explore is where you go
      // to browse the rest.
      const [mine, otherRes, joined] = await Promise.all([
        fetchAllPages(axios, 'my-activities/'),
        axios.get('public-activities/'),
        fetchAllPages(axios, 'joined-activities/'),
      ]);

      const joinedIds = new Set(joined.map(a => a.id));
      const filteredOther = listFrom(otherRes.data).filter(a => !joinedIds.has(a.id));

      setMyActivities(mine);
      setJoinedActivities(joined);
      setOtherActivities(filteredOther);
    } catch (e) {
      setError(getErrorMessage(e, "Couldn't load your activities."));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      axiosInstance.get('me/')
        .then(res => {
          setEmailVerified(res.data.email_verified);
          setVerifyEmail(res.data.email);
        })
        .catch(() => {});
    }, [])
  );

  const openVerify = async () => {
    setVerifyExpanded(true);
    setVerifyCode('');
    setVerifyError('');
    setVerifySending(true);
    try {
      await axiosInstance.post('resend-verification/');
    } catch (err) {
      setVerifyError(err.response?.data?.detail || 'Could not send code.');
    } finally {
      setVerifySending(false);
    }
  };

  const closeVerify = () => {
    setVerifyExpanded(false);
    setVerifyCode('');
    setVerifyError('');
  };

  const submitVerify = async () => {
    if (verifyCode.trim().length !== 6) {
      setVerifyError('Enter the 6-digit code from your email.');
      return;
    }
    setVerifyLoading(true);
    setVerifyError('');
    try {
      await axiosInstance.post('verify-email/', { token: verifyCode.trim() });
      setEmailVerified(true);
      setVerifyExpanded(false);
    } catch (err) {
      setVerifyError(err.response?.data?.detail || 'Invalid or expired code.');
    } finally {
      setVerifyLoading(false);
    }
  };


  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchActivities);
    return unsub;
  }, [navigation]);

  const isPastActivity = (a) => {
    if (a.is_concluded !== undefined) return a.is_concluded;
    return new Date(a.date_time) < new Date();
  };

  const isCancelledActivity = (a) => a.is_cancelled === true;

  const getActiveData = () => {

    // Nearby → NEVER show cancelled
    const upcomingNearby = otherActivities.filter(
      a => !isPastActivity(a) && !isCancelledActivity(a)
    );

    // Going → joined + upcoming only (exclude cancelled)
    const upcomingJoined = joinedActivities.filter(
      a => !isPastActivity(a) && !isCancelledActivity(a)
    );

    // Past → joined + (past OR cancelled)
    const pastJoined = joinedActivities.filter(
      a => isPastActivity(a) || isCancelledActivity(a)
    );

    // Created by you → SHOW EVERYTHING you created
    const allCreated = myActivities; // 🔥 no filtering

    switch (activeTab) {

      case 'Nearby':
        const nearbyFiltered = filterActivitiesByDistance(
          upcomingNearby,
          location?.latitude,
          location?.longitude,
          distanceKm
        );
        return rankByInterest(nearbyFiltered, profile?.interests, location).slice(0, NEARBY_MAX);
      
      case 'Going':
        return upcomingJoined;

      case 'Created':
        return allCreated;

      case 'Past':
        return pastJoined;

      default:
        return [];
    }
  };
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axiosInstance.get('profile/');
        setProfile(res.data);
      } catch (err) {
        // Non-fatal: the avatar falls back to its placeholder and the
        // interest-ranking below just doesn't personalize.
      }
    };
    fetchProfile();
  }, []);

  const avatarUri =
    profile?.avatar &&
    (profile.avatar.startsWith('http')
      ? profile.avatar
      : `${BASE_URL}${profile.avatar}`);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <HomeSkeleton />
      </SafeAreaView>
    );
  }

  const activeData = getActiveData();

  // Desktop: guide a new user toward a next action instead of a dead end.
  // Mobile is left exactly as it was.
  // A failed fetch used to fall through to "No Activities here" — the same
  // screen you get when there genuinely are none, and the only one of the
  // two worth offering a retry for.
  const activitiesEmptyState = error ? (
    <ErrorState message={error} onRetry={fetchActivities} />
  ) : isWideWeb ? (
    <View style={styles.activitiesEmptyState}>
      <Text style={styles.activitiesEmptyTitle}>Nothing nearby yet</Text>
      <Text style={styles.activitiesEmptySubtitle}>
        Be the first — create your own and invite others to join.
      </Text>
    </View>
  ) : (
    <Text style={styles.emptyText}>No Activities here. How about you lead the way?</Text>
  );

  // Shared between the mobile and wide-web layouts. Structured as a flat
  // array of direct children (rather than a single fragment) so the outer
  // ScrollView's stickyHeaderIndices can pin the filter pills once scrolled
  // to — everything above (hero, create-activity, "Activities" title) is
  // grouped into aboveTabsContent (index 0) so that block's own conditional
  // children (the verify-email banner) don't shift the pills' index.
  const aboveTabsContent = (
    <View>
      {!emailVerified && !verifyExpanded && (
        <TouchableOpacity
          style={[styles.verifyBanner, isWideWeb && styles.verifyBannerWeb]}
          onPress={openVerify}
          activeOpacity={0.85}
        >
          <Ionicons name="mail-outline" size={isWideWeb ? 14 : 18} color="#fff" style={{ marginRight: isWideWeb ? 8 : 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.verifyBannerTitle, isWideWeb && styles.verifyBannerTitleWeb]}>
              Verify your email
            </Text>
            {!isWideWeb && (
              <Text style={styles.verifyBannerSub}>
                Tap to verify with a code
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={isWideWeb ? 13 : 16} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      )}

      {!emailVerified && verifyExpanded && (
        <View style={[styles.verifyCard, isWideWeb && styles.verifyCardWeb]}>
          <View style={styles.verifyCardHeader}>
            <Ionicons name="mail-outline" size={16} color="#e69c2d" style={{ marginRight: 8 }} />
            <Text style={styles.verifyCardTitle}>Verify your email</Text>
            <TouchableOpacity onPress={closeVerify} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color="#888" />
            </TouchableOpacity>
          </View>

          <Text style={styles.verifyCardSub}>
            {verifySending
              ? 'Sending a 6-digit code…'
              : verifyEmail
                ? `We sent a 6-digit code to ${verifyEmail}.`
                : 'We sent a 6-digit code to your email.'}
          </Text>

          {!!verifyError && <Text style={styles.verifyCardError}>{verifyError}</Text>}

          <View style={styles.verifyCardRow}>
            <TextInput
              style={styles.verifyCardInput}
              value={verifyCode}
              onChangeText={(t) => setVerifyCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              placeholderTextColor="#555"
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.verifyCardBtn, (verifyLoading || verifySending) && styles.verifyCardBtnDisabled]}
              onPress={submitVerify}
              disabled={verifyLoading || verifySending}
            >
              {verifyLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.verifyCardBtnText}>Verify</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={openVerify} disabled={verifySending || verifyLoading} style={{ marginTop: 10 }}>
            <Text style={styles.verifyCardResend}>
              {verifySending ? 'Sending...' : "Didn't receive it? Resend"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Location nudge — never blocking. Hidden entirely once GPS has
          resolved (locationSource === 'gps'); otherwise a collapsed pill
          that expands into this same card on tap. Copy and accent color
          differ between the IP-approximate tier (still useful, just not
          exact) and the fully-off tier (no location at all). */}
      {!locationLoading && locationSource !== 'gps' && !locationCardExpanded && (
        <TouchableOpacity
          style={[
            styles.locationBanner,
            isWideWeb && styles.locationBannerWeb,
            locationSource === null && styles.locationBannerUrgent,
          ]}
          onPress={() => setLocationCardExpanded(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="location-outline" size={isWideWeb ? 14 : 18} color="#fff" style={{ marginRight: isWideWeb ? 8 : 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.locationBannerTitle, isWideWeb && styles.locationBannerTitleWeb]}>
              {locationSource === 'ip'
                ? `Using your approximate location${locationCity ? ` near ${locationCity}` : ''}`
                : 'Location is off'}
            </Text>
            {!isWideWeb && (
              <Text style={styles.locationBannerSub}>
                {locationSource === 'ip' ? 'Tap for precise results' : 'Tap to turn it on'}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={isWideWeb ? 13 : 16} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      )}

      {!locationLoading && locationSource !== 'gps' && locationCardExpanded && (
        <View
          style={[
            styles.locationCard,
            isWideWeb && styles.locationCardWeb,
            locationSource === null && styles.locationCardUrgent,
          ]}
        >
          <View style={styles.locationCardHeader}>
            <Ionicons
              name="location-outline"
              size={16}
              color={locationSource === null ? '#e2574c' : '#5aa9e6'}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.locationCardTitle}>
              {locationSource === 'ip' ? 'Using your approximate location' : 'Location is off'}
            </Text>
            <TouchableOpacity onPress={() => setLocationCardExpanded(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color="#888" />
            </TouchableOpacity>
          </View>

          <Text style={styles.locationCardSub}>
            {locationSource === 'ip'
              ? `We're showing activities near${locationCity ? ` ${locationCity}` : ' your area'}, based on your internet connection — not your exact spot. Enable precise location for better results.`
              : 'Your location is off. Please turn it on to see relevant activities happening in your area.'}
          </Text>

          {permissionPermanentlyDenied ? (
            Platform.OS === 'web' ? (
              <Text style={styles.locationCardTip}>
                Click the location icon in your browser's address bar to allow access, then refresh the page.
              </Text>
            ) : (
              <TouchableOpacity style={styles.locationCardBtn} onPress={openLocationSettings}>
                <Text style={styles.locationCardBtnText}>Open Settings</Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity style={styles.locationCardBtn} onPress={refreshLocation}>
              <Text style={styles.locationCardBtnText}>
                {locationSource === 'ip' ? 'Enable Precise Location' : 'Enable Location'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* HERO */}
      <ImageBackground
        source={{
          uri: 'https://res.cloudinary.com/dppoa51hp/image/upload/v1780374905/ChatGPT_Image_Jun_2_2026_10_19_18_AM_hnh3k7.png',
        }}
        style={styles.heroCard}
        imageStyle={{ borderRadius: 18 }}
      >
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>Jump in. Connect.</Text>
          <Text style={styles.heroDate}>Join or create an activity of your interest.</Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('Explore')}>
            <Text style={styles.exploreText}>Explore</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      {/* CREATE ACTIVITY — kept, but visually secondary to Activities on web */}
      <TouchableOpacity
        style={[styles.createCard, isWideWeb && styles.createCardWeb]}
        onPress={() => navigation.navigate('CreateActivity')}
      >
        <View style={styles.createLeft}>
          <CreateIcon size={isWideWeb ? 26 : 38} color="#c365e2" />
          <View style={{ marginLeft: isWideWeb ? 12 : 18 }}>
            <Text style={[styles.createTitle, isWideWeb && styles.createTitleWeb]}>Create an Activity</Text>
            <Text style={[styles.createSubtitle, isWideWeb && styles.createSubtitleWeb]}>Organize your own Activity</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={isWideWeb ? 16 : 22} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Its own top-level child (index 1, right after aboveTabsContent) so
  // stickyHeaderIndices can pin it once scrolled to. The "Activities" title
  // moved in here (rather than staying in aboveTabsContent) so it sticks
  // alongside the pills instead of scrolling away on its own.
  const tabsPillRow = (
    <View style={styles.tabScrollSticky}>
      <Text style={styles.activitiesTitle}>Activities</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
      >
        {['Nearby', 'Going', 'Past', 'Created'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.pill,
              activeTab === tab && styles.pillActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.pillText,
                activeTab === tab && styles.pillTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // One-line disclosure right above the Nearby tab's own list — the "Tap for
  // precise results" nudge above only explains and offers the fix once; this
  // is the reminder, every time, exactly where the filtering it's describing
  // actually happens.
  const locationNote = activeTab === 'Nearby' && !locationLoading && locationSource !== 'gps' && (
    <Text style={styles.locationInlineNote}>
      {locationSource === 'ip'
        ? 'Showing results near your approximate location'
        : 'Location is off — showing all activities'}
    </Text>
  );

  const exploreMoreButton = isWideWeb && activeData.length > 0 && (
    <TouchableOpacity
      style={styles.exploreMoreBtn}
      onPress={() => navigation.navigate('Explore')}
      activeOpacity={0.85}
    >
      <Text style={styles.exploreMoreText}>Explore more activities</Text>
    </TouchableOpacity>
  );

  // Mobile only — on web this is redundant (the sidebar already shows "Home"
  // as the active item, and has its own Profile entry). It used to be a
  // fixed sibling above the list, which meant it stayed pinned forever
  // instead of scrolling away — now it's just the first scrollable item,
  // so it scrolls off naturally and only the Activities/pills block (the
  // actual sticky index) stays pinned once you've scrolled past it.
  const header = (
    <View style={styles.topHeader}>
      <Text style={styles.headerText}>Home</Text>
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('ProfileView', profile?.username ? { username: profile.username } : undefined)
        }
      >
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.profileImage} />
        ) : (
          <Ionicons name="person-circle-outline" size={36} color="#777" />
        )}
      </TouchableOpacity>
    </View>
  );

  // A FlatList nested inside a ScrollView (even with scrollEnabled={false})
  // doesn't reliably pass touch/wheel scroll gestures up to the parent on
  // web — the list area becomes a dead zone once your gesture starts over
  // it. Folding everything into ONE FlatList sidesteps that class of bug
  // entirely: header/aboveTabsContent/tabsPillRow ride along as regular
  // items at fixed indices, with stickyHeaderIndices pinning header and
  // tabsPillRow — passing multiple indices makes RN's ScrollView "hand
  // off" between them: header stays pinned while the hero/create-activity
  // content scrolls underneath it, and once tabsPillRow's natural position
  // reaches the top, it pushes header off and takes over the pinned spot,
  // instead of both just permanently overlapping at y=0.
  const listData = [
    ...(isWideWeb ? [] : [{ key: 'header', kind: 'header' }]),
    { key: 'above', kind: 'above' },
    { key: 'sticky', kind: 'sticky' },
    // Inserted after the sticky pills (last sticky index), so it never
    // shifts stickyIndices below.
    ...(locationNote ? [{ key: 'location-note', kind: 'location-note' }] : []),
    ...(activeData.length === 0
      ? [{ key: 'empty', kind: 'empty' }]
      : activeData.map(item => ({ key: item.id.toString(), kind: 'card', activity: item }))),
  ];
  const stickyIndices = isWideWeb ? [1] : [0, 2];

  const renderListItem = ({ item }) => {
    if (item.kind === 'header') return header;
    if (item.kind === 'above') return aboveTabsContent;
    if (item.kind === 'sticky') return tabsPillRow;
    if (item.kind === 'location-note') return locationNote;
    if (item.kind === 'empty') return activitiesEmptyState;
    return <ActivityCard activity={item.activity} />;
  };

  const activitiesList = (
    <FlatList
      data={listData}
      keyExtractor={item => item.key}
      renderItem={renderListItem}
      stickyHeaderIndices={stickyIndices}
      style={isWideWeb ? styles.webCenter : undefined}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={exploreMoreButton}
      contentContainerStyle={{ paddingBottom: isWideWeb ? 0 : 100 }}
    />
  );

  if (isWideWeb) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.webRow}>
          <View style={styles.webContent}>
            {activitiesList}
            <PostsRail />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingWrapper scroll={false}>
        {activitiesList}
      </KeyboardAvoidingWrapper>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F0F0F', overflow: 'hidden' },

  /* ───────── HEADER ───────── */
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    // Now a sticky FlatList item (pinned while content scrolls underneath
    // it) rather than a fixed sibling — needs its own opaque background so
    // that content doesn't show through while it's pinned.
    backgroundColor: '#0F0F0F',
  },
  headerText: {
    fontSize: 26,
    color: '#fff',
    fontFamily: Fonts.extrabold, // Manrope-Bold
  },

  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fff',
  },

  /* ───────── HERO (mobile only) ───────── */
  heroCard: {
    height: 200,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    paddingBottom: 40,
    paddingTop: 60,
    paddingLeft: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: Fonts.bold,
  },
  heroDate: {
    color: '#ddd',
    marginTop: 4,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  exploreBtn: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginTop: 18,
    alignSelf: 'flex-start',
  },
  exploreText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },

  /* ───────── WIDE WEB: 3-column layout ─────────
     overflow:'hidden' on both rows keeps the sidebar pinned to the
     viewport — without it, content taller than the available height
     bubbles up and makes the whole page scroll instead of just webCenter. */
  webRow: {
    flex: 1,
    flexDirection: 'row',
    // Centers the content block instead of left-anchoring it and leaving a
    // lopsided gap on the right when the viewport is wider than the columns.
    justifyContent: 'center',
    overflow: 'hidden',
    // Only source of top breathing room on web now that the "Home" header
    // (which used to supply it via its own padding) is skipped there.
    paddingTop: 24,
  },
  webContent: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 680 + 360,
    overflow: 'hidden',
  },
  webCenter: {
    flex: 1,
    maxWidth: 680,
  },
  exploreMoreBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  exploreMoreText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.semibold,
  },

  /* ───────── CREATE ACTIVITY ───────── */
  createCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Kept purple icon / title / subtitle / arrow / dark card — just smaller,
  // so Activities below reads as the primary section, not this.
  createCardWeb: {
    padding: 12,
    marginTop: 12,
    borderRadius: 14,
  },
  createLeft: { flexDirection: 'row', alignItems: 'center' },
  createTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.semibold,
  },
  createTitleWeb: {
    fontSize: 14,
  },
  createSubtitle: {
    color: '#AAA',
    fontSize: 13,
    marginTop: 2,
    fontFamily: Fonts.regular,
  },
  createSubtitleWeb: {
    fontSize: 12,
  },

  /* ───────── ACTIVITIES TITLE ───────── */
  activitiesTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Fonts.bold,
    marginHorizontal: 20,
  },

  /* ───────── TABS ───────── */
  tabScroll: { paddingLeft: 20, marginTop: 16 },
  // Opaque background so activity cards scrolling underneath the pinned
  // (stickyHeaderIndices) pill row don't show through it, plus a little
  // vertical padding so the pills aren't flush against the sticky edge.
  tabScrollSticky: {
    backgroundColor: '#0F0F0F',
    paddingTop: 12,
    paddingBottom: 12,
    marginTop: 0,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1F1F1F',
    marginRight: 10,
  },
  pillActive: { backgroundColor: '#ffffff' },
  pillText: {
    color: '#999',
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  pillTextActive: {
    color: '#000000',
    fontFamily: Fonts.semibold,
  },

  /* ───────── FILTER ROW ───────── */
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
  },
  filterText: {
    color: '#999',
    fontSize: 13,
    marginRight: 6,
    fontFamily: Fonts.regular,
  },

  /* ───────── CARD ───────── */
  card: {
    backgroundColor: '#181818',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardImage: { width: '100%', height: 130 },
  cardContent: { padding: 15 },

  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.semibold,
  },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  infoText: {
    color: '#BDBDBD',
    fontSize: 12,
    marginLeft: 6,
    fontFamily: Fonts.regular,
  },

  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  avatarStack: { flexDirection: 'row' },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#181818',
  },
  joinedText: {
    color: '#9A9A9A',
    fontSize: 12,
    marginLeft: 10,
    fontFamily: Fonts.medium,
  },

  emptyText: {
    color: '#555',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },

  /* ───────── Activities empty state (web) — guides toward a next action ── */
  activitiesEmptyState: {
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 26,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 18,
  },
  activitiesEmptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.semibold,
    marginBottom: 6,
  },
  activitiesEmptySubtitle: {
    color: '#888',
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    maxWidth: 360,
  },
  activitiesEmptyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  activitiesEmptyPrimaryBtn: {
    backgroundColor: '#6C5CE7',
    borderRadius: 20,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  activitiesEmptyPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Fonts.semibold,
  },

  /* ───────── Email verify banner ───────── */
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e69c2d',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
  },
  // Same orange styling/message/resend behavior — just a smaller footprint
  // on desktop so it doesn't read as the page's primary purpose.
  verifyBannerWeb: {
    padding: 9,
    borderRadius: 10,
  },
  verifyBannerTitle: {
    color: '#fff',
    fontFamily: Fonts.semibold,
    fontSize: 14,
    marginBottom: 2,
  },
  verifyBannerTitleWeb: {
    fontSize: 12,
    marginBottom: 0,
  },
  verifyBannerSub: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Fonts.regular,
    fontSize: 12,
  },

  /* ───────── Email verify — expanded inline card ───────── */
  verifyCard: {
    backgroundColor: '#181818',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(230,156,45,0.35)',
  },
  verifyCardWeb: {
    padding: 12,
    borderRadius: 10,
  },
  verifyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  verifyCardTitle: {
    flex: 1,
    color: '#fff',
    fontFamily: Fonts.semibold,
    fontSize: 15,
  },
  verifyCardSub: {
    color: '#999',
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  verifyCardError: {
    color: '#ff6b6b',
    fontFamily: Fonts.regular,
    fontSize: 12,
    marginBottom: 10,
  },
  verifyCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyCardInput: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 14,
    height: 44,
    color: '#fff',
    fontSize: 17,
    letterSpacing: 4,
    fontFamily: Fonts.semibold,
    marginRight: 10,
  },
  verifyCardBtn: {
    backgroundColor: '#e69c2d',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyCardBtnDisabled: {
    opacity: 0.6,
  },
  verifyCardBtnText: {
    color: '#fff',
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  verifyCardResend: {
    color: '#e69c2d',
    fontFamily: Fonts.regular,
    fontSize: 12,
    textAlign: 'center',
  },

  /* ───────── Location nudge banner (collapsed pill) ─────────
     Blue for the IP-approximate tier (still useful, just not exact),
     overridden to a muted red for the fully-off tier — same shape/pattern
     as the email verify banner above, so "collapsed pill ↔ expanded card"
     reads consistently across the app. */
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5aa9e6',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
  },
  locationBannerUrgent: {
    backgroundColor: '#e2574c',
  },
  locationBannerWeb: {
    padding: 9,
    borderRadius: 10,
  },
  locationBannerTitle: {
    color: '#fff',
    fontFamily: Fonts.semibold,
    fontSize: 14,
    marginBottom: 2,
  },
  locationBannerTitleWeb: {
    fontSize: 12,
    marginBottom: 0,
  },
  locationBannerSub: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Fonts.regular,
    fontSize: 12,
  },

  /* ───────── Location nudge — expanded inline card ───────── */
  locationCard: {
    backgroundColor: '#181818',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(90,169,230,0.35)',
  },
  locationCardUrgent: {
    borderColor: 'rgba(226,87,76,0.35)',
  },
  locationCardWeb: {
    padding: 12,
    borderRadius: 10,
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationCardTitle: {
    flex: 1,
    color: '#fff',
    fontFamily: Fonts.semibold,
    fontSize: 15,
  },
  locationCardSub: {
    color: '#999',
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  locationCardTip: {
    color: '#888',
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  locationCardBtn: {
    backgroundColor: '#5aa9e6',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  locationCardBtnText: {
    color: '#fff',
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },

  /* ───────── Location nudge — inline reminder above the Nearby list ───────── */
  locationInlineNote: {
    color: '#888',
    fontFamily: Fonts.regular,
    fontSize: 12,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
  },
});


export default HomeScreen;
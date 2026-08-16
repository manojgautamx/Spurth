import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import React from 'react';

export const getActivityTypeIcon = (activityType, size = 16, color = '#ccc') => {
  if (!activityType) return null;

  const normalized = activityType.toLowerCase().trim();

  const iconMap = {
    // ------------------
    // SPORTS
    // ------------------
    football: <MaterialCommunityIcons name="soccer" size={size} color={color} />,
    soccer: <MaterialCommunityIcons name="soccer" size={size} color={color} />,
    futsal: <MaterialCommunityIcons name="soccer" size={size} color={color} />,
    cricket: <MaterialCommunityIcons name="cricket" size={size} color={color} />,
    basketball: <MaterialCommunityIcons name="basketball" size={size} color={color} />,
    volleyball: <MaterialCommunityIcons name="volleyball" size={size} color={color} />,
    badminton: <MaterialCommunityIcons name="badminton" size={size} color={color} />,
    tennis: <MaterialCommunityIcons name="tennis" size={size} color={color} />,
    tabletennis: <MaterialCommunityIcons name="table-tennis" size={size} color={color} />,
    pingpong: <MaterialCommunityIcons name="table-tennis" size={size} color={color} />,
    baseball: <MaterialCommunityIcons name="baseball" size={size} color={color} />,
    rugby: <MaterialCommunityIcons name="rugby" size={size} color={color} />,
    hockey: <MaterialCommunityIcons name="hockey-puck" size={size} color={color} />,

    // ------------------
    // FITNESS / HEALTH
    // ------------------
    gym: <MaterialCommunityIcons name="dumbbell" size={size} color={color} />,
    fitness: <MaterialCommunityIcons name="arm-flex" size={size} color={color} />,
    workout: <MaterialCommunityIcons name="weight-lifter" size={size} color={color} />,
    yoga: <MaterialCommunityIcons name="yoga" size={size} color={color} />,
    pilates: <MaterialCommunityIcons name="meditation" size={size} color={color} />,
    crossfit: <MaterialCommunityIcons name="weight-lifter" size={size} color={color} />,
    cardio: <Ionicons name="heart-outline" size={size} color={color} />,
    zumba: <MaterialCommunityIcons name="dance-ballroom" size={size} color={color} />,

    // ------------------
    // OUTDOOR / ADVENTURE
    // ------------------
    hiking: <MaterialCommunityIcons name="hiking" size={size} color={color} />,
    trekking: <MaterialCommunityIcons name="hiking" size={size} color={color} />,
    cycling: <MaterialCommunityIcons name="bike" size={size} color={color} />,
    biking: <MaterialCommunityIcons name="bike" size={size} color={color} />,
    running: <Ionicons name="walk-outline" size={size} color={color} />,
    marathon: <MaterialCommunityIcons name="run" size={size} color={color} />,
    climbing: <MaterialCommunityIcons name="climbing" size={size} color={color} />,
    camping: <MaterialCommunityIcons name="tent" size={size} color={color} />,
    rafting: <MaterialCommunityIcons name="kayaking" size={size} color={color} />,

    // ------------------
    // GAMES / E-SPORTS
    // ------------------
    esports: <Ionicons name="game-controller-outline" size={size} color={color} />,
    gaming: <Ionicons name="game-controller-outline" size={size} color={color} />,
    chess: <MaterialCommunityIcons name="chess-king" size={size} color={color} />,
    boardgames: <MaterialCommunityIcons name="dice-multiple" size={size} color={color} />,
    poker: <MaterialCommunityIcons name="cards-playing-outline" size={size} color={color} />,

    // ------------------
    // ARTS / CULTURE
    // ------------------
    music: <Ionicons name="musical-notes-outline" size={size} color={color} />,
    concert: <Ionicons name="mic-outline" size={size} color={color} />,
    dance: <MaterialCommunityIcons name="dance-ballroom" size={size} color={color} />,
    painting: <MaterialCommunityIcons name="palette" size={size} color={color} />,
    photography: <MaterialCommunityIcons name="camera-outline" size={size} color={color} />,
    art: <MaterialCommunityIcons name="palette" size={size} color={color} />,

    // ------------------
    // EDUCATION / SOCIAL
    // ------------------
    meetup: <Ionicons name="people-outline" size={size} color={color} />,
    workshop: <Ionicons name="construct-outline" size={size} color={color} />,
    seminar: <Ionicons name="school-outline" size={size} color={color} />,
    networking: <Ionicons name="chatbubbles-outline" size={size} color={color} />,
    studygroup: <Ionicons name="book-outline" size={size} color={color} />,

    // ------------------
    // FOOD / LIFESTYLE
    // ------------------
    food: <Ionicons name="restaurant-outline" size={size} color={color} />,
    cooking: <Ionicons name="fast-food-outline" size={size} color={color} />,
    coffee: <Ionicons name="cafe-outline" size={size} color={color} />,
    wine: <MaterialCommunityIcons name="glass-wine" size={size} color={color} />,
    bbq: <MaterialCommunityIcons name="grill" size={size} color={color} />,

    // ------------------
    // TECH / BUSINESS
    // ------------------
    startup: <Ionicons name="rocket-outline" size={size} color={color} />,
    tech: <Ionicons name="hardware-chip-outline" size={size} color={color} />,
    coding: <Ionicons name="code-slash-outline" size={size} color={color} />,
    hackathon: <Ionicons name="terminal-outline" size={size} color={color} />,
    business: <Ionicons name="briefcase-outline" size={size} color={color} />,
  };

  return (
    iconMap[normalized] || (
      <Ionicons
        name="apps-outline"
        size={size}
        color={color}
      />
    )
  );
};

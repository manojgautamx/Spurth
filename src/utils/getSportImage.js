// src/utils/getSportImage.js
import { SPORT_IMAGES } from './sportImages';

export const DEFAULT_SPORT_IMAGE =
  'https://res.cloudinary.com/dppoa51hp/image/upload/v1706785271/cld-sample-5.jpg';

export const getSportImage = (sport) =>
  SPORT_IMAGES[sport] || DEFAULT_SPORT_IMAGE;

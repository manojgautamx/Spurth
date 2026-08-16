// src/utils/getActivityTypeImage.js
import { ACTIVITY_TYPE_IMAGES } from './activityTypeImages';

export const DEFAULT_ACTIVITY_TYPE_IMAGE =
  'https://res.cloudinary.com/dppoa51hp/image/upload/v1706785271/cld-sample-5.jpg';

export const getActivityTypeImage = (activityType) =>
  ACTIVITY_TYPE_IMAGES[activityType] || DEFAULT_ACTIVITY_TYPE_IMAGE;

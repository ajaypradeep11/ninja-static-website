// One poster/recording pair per project, reused by every service gallery.
// Add a project here only after its matching MP4 and WebP have been recorded.
const recordings = {
  'design-tour-1': [
    'acidwave', 'axiom', 'bloomfield', 'dreamscape', 'halftone',
    'helios', 'hyperbloom', 'k-design', 'neo-brutalism', 'neo-swiss', 'orbital',
    'outform', 'prism', 'rail', 'ribbon', 'shelf', 'synapse',
    'synthwave', 'totem', 'vector-surrealism', 'y2k-futurism',
  ],
  'theme-names-1': ['akai', 'talia', 'softspot'],
  'detail-30fps-3': ['ajay-portfolio', 'ninja-learn'],
  'others-tour-1': [
    'conversy-app', 'ninja-hr', 'clinic', 'dashboard',
  ],
  'ai-images-1': ['restaurant', 'trades'],
  'northshore-20-1': ['realty'],
  'rideau-images-1': ['dealer'],
  'scroll-30fps-2': ['conversy-site', 'ninja-commerce'],
  '': ['curriculearn', 'irina', 'story'],
};

export const servicePreviewMedia = new Map(
  Object.entries(recordings).flatMap(([version, slugs]) => slugs.map(slug => {
    const suffix = version ? `?v=${version}` : '';
    return [slug, {
      poster: `/work/service-previews/${slug}.webp${suffix}`,
      video: `/work/service-previews/motion/${slug}.mp4${suffix}`,
    }];
  })),
);

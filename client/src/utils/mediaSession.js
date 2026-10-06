/**
 * Media Session API Helper for Lock-Screen Pocket Controls
 * Lets the phone stay in the pocket with the screen turned off.
 */

export function setupMediaSession({
  title,
  artist = 'Sobuj Ghonta (সবুজ ঘণ্টা)',
  album = 'Mindful Trail Walk',
  onPlay,
  onPause,
  onNext,
  onPrevious
}) {
  if (!('mediaSession' in navigator)) {
    return;
  }

  navigator.mediaSession.metadata = new MediaMetadata({
    title: title || 'Green Hour Walk',
    artist,
    album,
    artwork: [
      { src: '/leaf.svg', sizes: '96x96', type: 'image/svg+xml' },
      { src: '/leaf.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/leaf.svg', sizes: '512x512', type: 'image/svg+xml' }
    ]
  });

  const setHandler = (action, handler) => {
    try {
      if (handler) {
        navigator.mediaSession.setActionHandler(action, handler);
      } else {
        navigator.mediaSession.setActionHandler(action, null);
      }
    } catch {
      // Action might not be supported on some devices
    }
  };

  setHandler('play', onPlay);
  setHandler('pause', onPause);
  setHandler('previoustrack', onPrevious);
  setHandler('nexttrack', onNext);
}

export function updateMediaSessionPlaybackState(state) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = state; // 'playing', 'paused', 'none'
  }
}

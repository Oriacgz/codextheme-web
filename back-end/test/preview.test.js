import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewAppearance } from '../../front-end/src/services/preview.js';

test('start screen preview respects exported image, text and surface settings', () => {
  const theme = {
    colors: { text: '#111111' },
    art: { dim: 0.8 },
    settings: {
      imageMode: 'fit',
      imageZoom: 140,
      imageX: 72,
      imageY: 35,
      brightness: 120,
      textColorsEnabled: true,
      primaryTextColor: '#abcdef',
      secondaryTextColor: '#123456',
      accent: '#ff0000',
      sidebarColor: '#ffffff',
      sidebarOpacity: 20,
      sidebarDarkness: 50,
      chatColor: '#112233',
      chatOpacity: 65,
      dialogOpacity: 32,
    },
  };
  const actual = previewAppearance(theme);
  assert.equal(actual.sidebar, 'rgba(136,137,139,0.2)');
  assert.equal(actual.sidebarBlur, '.6cqw');
  assert.equal(actual.composer, 'rgba(17,34,51,0.65)');
  assert.equal(actual.chooser, 'rgba(16,19,22,0.32)');
  assert.equal(actual.position, '72% 35%');
  assert.equal(actual.zoom, 1.4);
  assert.equal(actual.brightness, 1.2);
  assert.equal(actual.opacity, 1);
  assert.equal(actual.backgroundSize, 'contain');
  assert.equal(actual.text, '#abcdef');
  assert.equal(actual.muted, '#123456');
  assert.equal(actual.accent, '#ff0000');
  theme.settings.sidebarOpacity = 0;
  theme.settings.sidebarDarkness = 100;
  assert.equal(previewAppearance(theme).sidebar, 'rgba(16,19,22,0)');
});

test('older themes use their palette and home dim without fabricated overrides', () => {
  const actual = previewAppearance({
    colors: { text: '#123456', panel: 'rgba(1,2,3,.5)' },
    art: { dim: 0.25, focusX: 0.2, focusY: 0.8 },
  });
  assert.equal(actual.text, '#123456');
  assert.equal(actual.sidebar, 'rgba(1,2,3,.5)');
  assert.equal(actual.opacity, 0.75);
  assert.equal(actual.position, '20% 80%');
});

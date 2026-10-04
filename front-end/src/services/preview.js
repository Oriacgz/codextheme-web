// Keep the desktop surface math: darkness changes the sidebar tint, not its opacity.
export function previewAppearance(theme = {}) {
  const colors = theme.colors || {},
    settings = theme.settings || {},
    art = theme.art || {};
  const rgba = (hex, opacity) =>
    `rgba(${[1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(',')},${opacity / 100})`;
  const sidebarColor = settings.sidebarColor || '#191e22';
  const darkness = (settings.sidebarDarkness ?? 0) / 100;
  const tint = [1, 3, 5].map((offset, index) =>
    Math.round(
      parseInt(sidebarColor.slice(offset, offset + 2), 16) * (1 - darkness) +
        [16, 19, 22][index] * darkness,
    ),
  );
  const x = settings.imageX ?? (art.focusX ?? 0.5) * 100,
    y = settings.imageY ?? (art.focusY ?? 0.5) * 100;
  return {
    text: settings.textColorsEnabled ? settings.primaryTextColor : colors.text || '#eef4f1',
    muted: settings.textColorsEnabled ? settings.secondaryTextColor : colors.muted || '#a1a8b0',
    accent: settings.accent || colors.accent || '#b7f0ce',
    sidebar: settings.sidebarColor
      ? `rgba(${tint.join(',')},${(settings.sidebarOpacity ?? 80) / 100})`
      : colors.panel || 'rgba(25,30,34,.8)',
    sidebarBlur: settings.sidebarOpacity < 100 && darkness < 1 ? '.6cqw' : '0px',
    composer: settings.chatColor
      ? rgba(settings.chatColor, settings.chatOpacity ?? 80)
      : colors.panelAlt || colors.panel || 'rgba(25,30,34,.8)',
    composerBlur: settings.chatOpacity < 100 ? '.6cqw' : '0px',
    chooser: rgba('#101316', settings.dialogOpacity ?? 65),
    backgroundSize: settings.imageMode === 'fit' ? 'contain' : 'cover',
    position: `${x}% ${y}%`,
    zoom: (settings.imageZoom ?? 100) / 100,
    brightness: (settings.brightness ?? 100) / 100,
    opacity: theme.settings ? 1 : 1 - (art.dim ?? 0.55),
    blur: `${(art.blur ?? 0) / 20}cqw`,
  };
}

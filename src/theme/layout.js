// Shared layout constants — currently just the one spacing value every
// bottom-tab screen's header needs to agree on. Each screen used to pick
// its own (50, 44, StatusBar.currentHeight + 8, 8 — four different values
// for what's meant to be the same gap), which is exactly how they drifted
// out of sync. One named constant, imported everywhere, is what keeps
// them matching instead of relying on everyone copying the same number.
export const TAB_HEADER_TOP_PADDING = 50;

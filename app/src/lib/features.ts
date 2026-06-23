

// Feature flags. Flip a value here to toggle a feature on/off across the app.

// Controls whether the public-facing login/registration UI is shown.
// When false, the Sign in / Join entry points (header, footer, comment
// prompt, like button) are hidden. The auth routes, API, components and
// NextAuth config all remain intact — this only hides the entry points,
// so an existing session still works and the feature can be re-enabled by
// flipping this back to true.
export const AUTH_UI_ENABLED = false;
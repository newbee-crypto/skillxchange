export const LIVE_UPDATE_EVENTS = {
  bookingChanged: 'app:booking-changed',
};

export const emitBookingChanged = (booking) => {
  window.dispatchEvent(new CustomEvent(LIVE_UPDATE_EVENTS.bookingChanged, {
    detail: { booking },
  }));
};

export const subscribeToBookingChanges = (handler) => {
  const listener = (event) => handler(event.detail?.booking || null);
  window.addEventListener(LIVE_UPDATE_EVENTS.bookingChanged, listener);

  return () => {
    window.removeEventListener(LIVE_UPDATE_EVENTS.bookingChanged, listener);
  };
};

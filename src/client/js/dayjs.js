import "./libs/dayjs.min.js";
import "./libs/dayjs-relativeTime.js";

dayjs.extend(window.dayjs_plugin_relativeTime);

/**
 * Format a time in the format "YYYY-MM-DD HH:mm".
 * @param time dayjs resolvable
 * @returns {string}
 */
export const formatTime = (time) => dayjs(time).format("YYYY-MM-DD HH:mm");

/**
 * Format a time in the format "MMMM D, YYYY at h:mm A" - e.g. "January 1, 2022 at 12:00 PM".
 * @param time dayjs resolvable
 * @returns {string}
 */
export const formatTimeVerbose = (time) =>
  dayjs(time).format("MMMM D, YYYY [at] h:mm A");

/**
 * Get how long ago a time was ("2 hours ago") or how far in the future ("in 2 hours")
 * @param time dayjs resolvable
 * @returns {string}
 */
export const formatRelative = (time) => dayjs(time).fromNow();

/**
 * The dayjs library, also available in the window scope.
 * Extended with the relativeTime plugin.
 */
export default dayjs;

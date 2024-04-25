import "./libs/dayjs.min.js";
import "./libs/dayjs-relativeTime.js";

dayjs.extend(window.dayjs_plugin_relativeTime);

export const formatTime = (time) => dayjs(time).format("YYYY-MM-DD HH:mm");

export const formatTimeVerbose = (time) =>
  dayjs(time).format("MMMM D, YYYY [at] h:mm A");

export const formatRelative = (time) => dayjs(time).fromNow();

export default dayjs;

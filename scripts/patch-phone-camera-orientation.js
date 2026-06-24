// Kept as a compatibility entry point for older notes.
// Rotation now belongs to the desktop webcam frame, not the phone web page.
require("./patch-desktop-webcam-rotation.js");
require("./patch-phone-camera-smooth-stream.js");
require("./patch-phone-camera-recording-live-stream.js");
require("./patch-webcam-recording-editor-consistency.js");
require("./patch-webcam-recorded-rect-consistency.js");
require("./patch-disable-editor-webcam-segment-zoom.js");
require("./patch-webcam-react-zoom-no-editor-rot.js");
require("./patch-auto-zoom-and-webcam-settings-preview.js");
require("./patch-phone-camera-contain-preview-export.js");
require("./patch-phone-camera-aspect-ratio-root.js");
require("./patch-webcam-crop-aspect-layout.js");
require("./patch-phone-camera-session-ux.js");
require("./patch-phone-camera-no-record-dialog.js");
require("./patch-webcam-free-crop.js");
require("./patch-phone-camera-secure-capture.js");

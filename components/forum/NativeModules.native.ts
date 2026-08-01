// components/forum/NativeModules.native.ts
// This file is ONLY loaded on iOS and Android.

export const getNativeModules = () => {
  try {
    const Video = require("react-native-video").default;
    const RNFS = require("react-native-fs").default;
    const FileViewer = require("react-native-file-viewer").default;
    const Pdf = require("react-native-pdf").default;
    return { Video, RNFS, FileViewer, Pdf };
  } catch (error) {
    console.warn("Native modules not available:", error);
    return { Video: null, RNFS: null, FileViewer: null, Pdf: null };
  }
};
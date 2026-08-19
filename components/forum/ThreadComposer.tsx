// components/forum/ThreadComposer.tsx
// FINAL FIXED: Android video recording, document handling, Emoji Picker, Edit Mode, and CROSS-PLATFORM Date Picker

import { Ionicons } from '@expo/vector-icons';
import { Audio, ResizeMode, Video } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// ✅ Import DateTimePicker for native mobile date selection
import DateTimePicker from '@react-native-community/datetimepicker';

// ✅ Import Emoji Picker Library
// @ts-ignore
import EmojiSelector, { Categories } from 'react-native-emoji-selector';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ========== TYPES ==========
interface Attachment {
  fileName: string;
  fileType: string;
  fileSize: number;
  attachmentType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'LOCATION' | 'EVENT';
  file?: any;
  fileData?: string;
  locationUrl?: string;
  eventData?: any;
  uri?: string;
  _processed?: boolean;
}

interface ThreadComposerProps {
  groupId: string | number;
  onThreadCreated: (data: any) => void;
  onInputStart?: () => void;
  onInputEnd?: () => void;
  username?: string;
  editingPost?: any;
  onCancelEdit?: () => void;
}

// ========== HELPER FUNCTIONS ==========
const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

const getMimeTypeFromExtension = (extension: string): string => {
  const mimeTypes: {[key: string]: string} = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'json': 'application/json',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'webm': 'video/webm',
  };
  return mimeTypes[extension] || 'application/octet-stream';
};

// ========== MAIN COMPONENT ==========
export default function ThreadComposer({
  groupId,
  onThreadCreated,
  onInputStart,
  onInputEnd,
  username,
  editingPost,
  onCancelEdit
}: ThreadComposerProps) {
  // ---- State ----
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [audioRecordingTime, setAudioRecordingTime] = useState(0);
  const [micError, setMicError] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Camera states
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back');
  const [cameraMode, setCameraMode] = useState<'picture' | 'video'>('picture');
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const [previewMedia, setPreviewMedia] = useState<any>(null);
  const [eventForm, setEventForm] = useState({ open: false, title: '', datetime: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Document preview state
  const [documentPreview, setDocumentPreview] = useState<{uri: string, type: string, text?: string} | null>(null);

  // ✅ Event states with Date Picker support
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // ---- Refs ----
  const cameraRef = useRef<any>(null);
  const voiceRecorderRef = useRef<Audio.Recording | null>(null);
  const isStoppingRef = useRef(false);
  
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const isMounted = useRef(true);

  // ========== LIFECYCLE ==========
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
      if (voiceRecorderRef.current) {
        try {
          voiceRecorderRef.current.stopAndUnloadAsync().catch(() => {});
        } catch (e) {}
        voiceRecorderRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editingPost) {
      setContent(editingPost.content || "");
    }
  }, [editingPost]);

  // ========== READ FILE AS BASE64 ==========
  const readFileAsBase64 = async (uri: string): Promise<string> => {
    if (!uri) return "";

    try {
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        if (!response.ok) return "";
        const blob = await response.blob();

        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        console.error('File does not exist:', uri);
        return "";
      }

      return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (e) {
      console.error('Error reading file:', e);
      return "";
    }
  };

  const readTextFile = async (uri: string): Promise<string> => {
    try {
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        return await response.text();
      } else {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          return '';
        }
        return await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }
    } catch (e) {
      console.error('Error reading text file:', e);
      return '';
    }
  };

  // ========== OPEN CAMERA ==========
  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission Denied', 'Camera access is required to take photos and videos.');
        return;
      }
    }
    
    const { status: audioStatus } = await Audio.requestPermissionsAsync();
    if (audioStatus !== 'granted') {
      console.warn('Microphone permission not granted');
    }
    
    setCameraModalOpen(true);
    setCameraMode('picture');
    setError('');
  };

  const closeCamera = () => {
    if (isRecordingVideo) {
      stopVideoRecording();
    }
    setCameraModalOpen(false);
    setIsRecordingVideo(false);
    setRecordingTime(0);
    setCameraMode('picture');
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // ========== TAKE PHOTO ==========
  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: Platform.OS !== "web",
        skipProcessing: Platform.OS === "web",
      });

      if (!photo?.uri) {
        Alert.alert('Error', 'Failed to capture photo');
        return;
      }

      let base64 = "";

      if (Platform.OS === "web") {
        const response = await fetch(photo.uri);
        const blob = await response.blob();

        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        base64 =
          photo.base64 ??
          (await readFileAsBase64(photo.uri));
      }

      if (!base64) {
        Alert.alert('Error', 'Failed to process photo');
        return;
      }

      setPreviewMedia({
        type: "image",
        uri: photo.uri,
        fileData: base64,
        base64,
        fileName: `photo-${Date.now()}.jpg`,
        fileType: "image/jpeg",
        fileSize: base64.length,
      });

      closeCamera();
    } catch (e) {
      console.error('Photo capture error:', e);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  // ========== RECORD VIDEO (ANDROID FIX) ==========
  const startVideoRecording = async () => {
    if (!cameraRef.current) return;

    if (cameraMode !== "video") {
      setCameraMode("video");
      await new Promise(resolve => setTimeout(resolve, Platform.OS === 'android' ? 1000 : 500));
    }

    try {
      if (Platform.OS === "web") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9,opus'
          });
          
          const chunks: Blob[] = [];
          
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };
          
          mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(",")[1]);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            
            setPreviewMedia({
              type: "video",
              uri: url,
              fileData: base64,
              base64,
              fileName: `video-${Date.now()}.webm`,
              fileType: "video/webm",
              fileSize: blob.size,
            });
            
            closeCamera();
            stream.getTracks().forEach(track => track.stop());
          };
          
          mediaRecorder.start(1000);
          setIsRecordingVideo(true);
          setRecordingTime(0);

          const startTime = Date.now();
          recordingTimerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setRecordingTime(elapsed);
            
            if (elapsed >= 30) {
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
              }
              if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
              }
            }
          }, 1000);
          
          (cameraRef.current as any)._mediaRecorder = mediaRecorder;
          (cameraRef.current as any)._stream = stream;
          
          return;
        } catch (webErr) {
          console.error('Web recording error:', webErr);
          Alert.alert("Error", "Failed to start web recording");
          setIsRecordingVideo(false);
          return;
        }
      }

      console.log('Starting video recording on', Platform.OS);
      
      setIsRecordingVideo(true);
      setRecordingTime(0);

      const startTime = Date.now();
      
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingTime(elapsed);

        if (elapsed >= 30) {
          console.log('Max recording time reached');
          stopVideoRecording();
        }
      }, 1000);

      const recordOptions = Platform.OS === 'android' 
        ? {
            maxDuration: 30,
            quality: '480p',
            mute: false,
          }
        : {
            maxDuration: 30,
            quality: '720p',
            mute: false,
          };

      console.log('Record options:', recordOptions);
      
      const video = await cameraRef.current.recordAsync(recordOptions);

      console.log('Recording completed:', video);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (!video?.uri) {
        console.error('No video URI returned');
        setIsRecordingVideo(false);
        Alert.alert('Error', 'Recording failed - no video was produced');
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(video.uri);
      console.log('Video file info:', fileInfo);

      if (!fileInfo.exists) {
        console.error('Video file does not exist');
        setIsRecordingVideo(false);
        Alert.alert('Error', 'Video file was not saved');
        return;
      }

      let base64 = "";
      try {
        base64 = await readFileAsBase64(video.uri);
        console.log('Base64 length:', base64.length);
      } catch (readError) {
        console.error('Error reading video file:', readError);
      }

      if (!base64) {
        Alert.alert('Warning', 'Video was recorded but could not be processed. It will be attached as a file.');
      }

      const fileExtension = Platform.OS === 'android' ? 'mp4' : 'mov';
      const mimeType = Platform.OS === 'android' ? 'video/mp4' : 'video/quicktime';

      const previewData = {
        type: "video",
        uri: video.uri,
        fileData: base64,
        base64,
        fileName: `video-${Date.now()}.${fileExtension}`,
        fileType: mimeType,
        fileSize: fileInfo.size ?? Math.floor(base64.length * 0.75),
      };

      console.log('Preview data:', { ...previewData, base64: '...' });
      
      setPreviewMedia(previewData);
      setIsRecordingVideo(false);
      closeCamera();

    } catch (err) {
      console.error('Video recording error details:', err);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      setIsRecordingVideo(false);
      
      const errorMessage = Platform.OS === 'android' 
        ? 'Failed to record video. Please ensure camera and microphone permissions are granted.'
        : 'Failed to record video. Please try again.';
      
      Alert.alert('Recording Failed', errorMessage);
    }
  };

  const stopVideoRecording = async () => {
    try {
      if (Platform.OS === "web") {
        const mediaRecorder = (cameraRef.current as any)?._mediaRecorder;
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      } else if (cameraRef.current) {
        console.log('Stopping recording...');
        await cameraRef.current.stopRecording();
        console.log('Recording stopped');
      }
    } catch (err) {
      console.error('Error stopping recording:', err);
    }
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingVideo(false);
  };

  const toggleCamera = () => {
    setCameraType(cameraType === 'front' ? 'back' : 'front');
  };

  const handleFileUpload = async (type?: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: type || '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      let files: any[] = [];
      let isSuccess = false;

      if ((result as any).assets) {
        isSuccess = !(result as any).canceled;
        files = (result as any).assets || [];
      } else if ((result as any).type === 'success') {
        isSuccess = true;
        files = [result];
      } else if (Array.isArray(result) && result.length > 0) {
        isSuccess = true;
        files = result;
      }

      if (isSuccess && files.length > 0) {
        const newAttachments: Attachment[] = [];

        for (const file of files) {
          let attachmentType: Attachment['attachmentType'] = 'FILE';
          
          const mimeType = file.mimeType || file.type || '';
          const fileName = file.name || 'file';
          const fileExtension = getFileExtension(fileName);
          
          if (mimeType.startsWith('image/')) {
            attachmentType = 'IMAGE';
          } else if (mimeType.startsWith('video/')) {
            attachmentType = 'VIDEO';
          } else if (mimeType.startsWith('audio/')) {
            attachmentType = 'AUDIO';
          }

          let correctMimeType = mimeType;
          if (!mimeType || mimeType === 'application/octet-stream') {
            correctMimeType = getMimeTypeFromExtension(fileExtension);
          }

          let fileData = '';
          try {
            fileData = await readFileAsBase64(file.uri);
          } catch (e) {
            console.warn('Could not read file data:', e);
          }

          newAttachments.push({
            fileName: fileName,
            fileType: correctMimeType,
            fileSize: file.size || 0,
            attachmentType,
            uri: file.uri || file.assets?.[0]?.uri,
            file: file,
            fileData: fileData,
            _processed: true,
          });
        }

        setAttachments((prev) => [...prev, ...newAttachments]);
        setShowAttachmentMenu(false);
      }
    } catch (err) {
      if ((err as any)?.code !== 'USER_CANCELED') {
        console.error('File picker error:', err);
      }
    }
  };

  const previewAttachment = async (attachment: Attachment) => {
    if (!attachment.uri) {
      Alert.alert('Error', 'No preview available');
      return;
    }

    const { fileType, uri, attachmentType, fileName } = attachment;

    if (['IMAGE', 'VIDEO', 'AUDIO'].includes(attachmentType) || 
        fileType.startsWith('image/') || 
        fileType.startsWith('video/') || 
        fileType.startsWith('audio/')) {
      setPreviewMedia({
        type: attachmentType.toLowerCase(),
        uri: uri,
        fileName: fileName,
        fileType: fileType,
        fileSize: attachment.fileSize,
        fileData: attachment.fileData,
      });
      return;
    }

    if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      try {
        if (Platform.OS === 'web') {
          window.open(uri, '_blank');
        } else {
          const supported = await Linking.canOpenURL(uri);
          if (supported) {
            await Linking.openURL(uri);
          } else {
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Open PDF with...'
              });
            } else {
              Alert.alert('PDF Preview', 'Opening PDF...');
              await Linking.openURL(uri);
            }
          }
        }
      } catch (e) {
        console.error('Error opening PDF:', e);
        Alert.alert(
          'Preview',
          'Unable to preview PDF directly. The file is attached and will be sent with your message.',
          [{ text: 'OK' }]
        );
      }
      return;
    }

    if (fileType.includes('text/') || fileType === 'application/json' || 
        fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.json')) {
      try {
        const textContent = await readTextFile(uri);
        if (textContent) {
          setDocumentPreview({
            uri,
            type: 'text',
            text: textContent,
          });
          return;
        }
      } catch (e) {
        console.error('Error reading text file:', e);
      }
    }

    try {
      if (Platform.OS === 'web') {
        window.open(uri, '_blank');
      } else {
        const supported = await Linking.canOpenURL(uri);
        if (supported) {
          await Linking.openURL(uri);
        } else {
          Alert.alert(
            'File Attached',
            `${fileName}\n\nThis file type cannot be previewed but has been attached and will be sent.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (e) {
      Alert.alert(
        'File Attached',
        `${fileName} has been attached and will be sent with your message.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const url = `https://www.google.com/maps?q=${latitude},${longitude}`;

      setContent('📍 Shared location');
      setAttachments((prev) => [
        ...prev,
        {
          fileName: 'location.json',
          fileType: 'application/json',
          fileSize: 0,
          attachmentType: 'LOCATION',
          locationUrl: url,
        },
      ]);
      setShowAttachmentMenu(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to get location');
    }
  };

  const startVoiceRecording = async () => {
    try {
      if (isRecordingVoice) {
        await stopVoiceRecording();
        return;
      }

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone access is required.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      
      const recordingOptions = Platform.select({
        ios: Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
          },
        },
        web: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        },
      });

      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();
      voiceRecorderRef.current = recording;
      setIsRecordingVoice(true);
      setMicError(false);

      setAudioRecordingTime(0);
      const startTime = Date.now();
      audioTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setAudioRecordingTime(elapsed);
        if (elapsed >= 30) {
          stopVoiceRecording();
        }
      }, 1000);

    } catch (err) {
      console.error('Voice recording error:', err);
      setMicError(true);
      setError('Microphone access denied');
    }
  };

  const stopVoiceRecording = async () => {
    if (isStoppingRef.current) return;

    try {
      isStoppingRef.current = true;

      if (!voiceRecorderRef.current) {
        isStoppingRef.current = false;
        return;
      }

      if (audioTimerRef.current) {
        clearInterval(audioTimerRef.current);
        audioTimerRef.current = null;
      }

      const recording = voiceRecorderRef.current;
      
      try {
        await recording.stopAndUnloadAsync();
      } catch (unloadError) {
        console.log('Recording already unloaded:', unloadError);
      }

      const uri = recording.getURI();
      voiceRecorderRef.current = null;
      setIsRecordingVoice(false);
      setAudioRecordingTime(0);

      if (uri) {
        try {
          const base64 = await readFileAsBase64(uri);
          
          const audioFormat = Platform.select({
            ios: { extension: 'm4a', mimeType: 'audio/mp4' },
            android: { extension: 'm4a', mimeType: 'audio/mp4' },
            web: { extension: 'webm', mimeType: 'audio/webm' },
            default: { extension: 'm4a', mimeType: 'audio/mp4' },
          });

          setPreviewMedia({
            type: 'audio',
            uri: uri,
            base64: base64,
            fileData: base64,
            fileName: `voice-${Date.now()}.${audioFormat.extension}`,
            fileType: audioFormat.mimeType,
            fileSize: Math.floor(base64.length * 0.75),
          });
        } catch (readError) {
          console.warn('Could not read audio file:', readError);
        }
      }
    } catch (err) {
      console.error('Stop recording error:', err);
    } finally {
      isStoppingRef.current = false;
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ========== EMOJI HANDLER ==========
  const handleEmojiSelect = (emoji: string) => {
    setContent(prev => prev + emoji);
    onInputStart?.();
  };

  // ========== SUBMIT ==========
  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!content.trim() && attachments.length === 0 && !editingPost) return;

    setIsSubmitting(true);

    try {
      let messageType = 'TEXT';
      if (attachments.length > 0) {
        const firstAtt = attachments[0];
        if (firstAtt.attachmentType === 'IMAGE') messageType = 'IMAGE';
        else if (firstAtt.attachmentType === 'VIDEO') messageType = 'VIDEO';
        else if (firstAtt.attachmentType === 'AUDIO') messageType = 'AUDIO';
        else if (firstAtt.attachmentType === 'LOCATION') messageType = 'LOCATION';
        else if (firstAtt.attachmentType === 'EVENT') messageType = 'EVENT';
      }

      const resolvedAttachments = await Promise.all(
        attachments.map(async (att) => {
          if (att.fileData) {
            return {
              fileName: att.fileName,
              fileType: att.fileType,
              fileSize: att.fileSize,
              attachmentType: att.attachmentType,
              fileData: att.fileData,
            };
          }
          
          if (att.uri && !att.fileData) {
            const base64 = await readFileAsBase64(att.uri);
            return {
              fileName: att.fileName,
              fileType: att.fileType,
              fileSize: att.fileSize,
              attachmentType: att.attachmentType,
              fileData: base64,
            };
          }
          
          if (att.attachmentType === 'LOCATION') {
            return {
              fileName: 'location.json',
              fileType: 'application/json',
              fileSize: 0,
              attachmentType: 'LOCATION',
              fileData: btoa(JSON.stringify({ url: att.locationUrl })),
            };
          }
          
          if (att.attachmentType === 'EVENT') {
            return {
              fileName: 'event.json',
              fileType: 'application/json',
              fileSize: JSON.stringify(att.eventData).length,
              attachmentType: 'EVENT',
              fileData: btoa(JSON.stringify(att.eventData)),
            };
          }
          
          return att;
        })
      );

      const userEmail = username || 'anonymous@jws.com';
      const payload: any = {
        content: content.trim() || ' ',
        createdBy: userEmail,
        messageType,
        attachments: resolvedAttachments,
      };

      if (editingPost) {
        payload.id = editingPost.id;
        payload.isEdit = true;
      }

      onThreadCreated(payload);
      
      setContent('');
      setAttachments([]);
      setError('');
      setShowAttachmentMenu(false);
      setShowEmojiPicker(false);
      
      if (editingPost) {
        onCancelEdit?.();
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (text: string) => {
    setContent(text);
    if (text.trim()) onInputStart?.();
    else onInputEnd?.();
  };

  // ========== RENDER ==========
  return (
    <View style={styles.container}>
      {/* Error */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Attachments with preview */}
      {attachments.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentContainer}>
          {attachments.map((att, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.attachmentBadge}
              onPress={() => previewAttachment(att)}
            >
              <Text style={styles.attachmentText}>
                {att.attachmentType === 'IMAGE' && '📷 Image'}
                {att.attachmentType === 'VIDEO' && '🎥 Video'}
                {att.attachmentType === 'AUDIO' && '🎤 Voice'}
                {att.attachmentType === 'LOCATION' && '📍 Location'}
                {att.attachmentType === 'EVENT' && `📅 ${att.eventData?.title || 'Event'}`}
                {att.attachmentType === 'FILE' && `📄 ${att.fileName}`}
              </Text>
              <TouchableOpacity onPress={(e) => {
                e.stopPropagation();
                removeAttachment(i);
              }} style={styles.removeAttachment}>
                <Ionicons name="close" size={12} color="white" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {/* Audio Recording Indicator */}
      {isRecordingVoice ? (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording Audio...</Text>
          <View style={styles.recordingTimer}>
            <Text style={styles.recordingTimerText}>
              00:{String(audioRecordingTime % 60).padStart(2, '0')}
            </Text>
          </View>
          <TouchableOpacity onPress={stopVoiceRecording} style={styles.stopRecordingBtn}>
            <Ionicons name="stop-circle" size={16} color="white" />
            <Text style={styles.stopRecordingText}>Stop</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Edit Mode Banner */}
      {editingPost && (
        <View style={styles.editBanner}>
          <View style={styles.editBannerIndicator} />
          <View style={styles.editBannerContent}>
            <Text style={styles.editBannerTitle}>Editing Message</Text>
            <Text style={styles.editBannerText} numberOfLines={1}>{editingPost.content}</Text>
          </View>
          <TouchableOpacity onPress={() => { onCancelEdit?.(); setContent(''); }} style={styles.editBannerClose}>
            <Ionicons name="close-circle" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
      )}

      {/* ✅ FIXED: Emoji Picker with Library */}
      {showEmojiPicker && (
        <View style={styles.emojiPickerContainer}>
          <View style={styles.emojiPickerHeader}>
            <Text style={styles.emojiPickerTitle}>😊 Emojis</Text>
            <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView 
            style={{ height: 280 }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {Platform.OS === 'android' ? (
              <EmojiSelector
                onEmojiSelected={handleEmojiSelect}
                showSearchBar={false} 
                showTabs={false}
                showHistory={false}
                showSectionTitles={false}
                category={Categories.all}
              />
            ) : (
              <EmojiSelector
                onEmojiSelected={handleEmojiSelect}
                columns={8}
                showSearchBar={true}
                showTabs={true}
                showHistory={false}
                showSectionTitles={false}
                category={Categories.all}
              />
            )}
          </ScrollView>
        </View>
      )}

      {/* Preview Media Modal */}
      <Modal visible={!!previewMedia} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Preview {previewMedia?.type?.toUpperCase()}</Text>
            
            {previewMedia?.type === 'image' ? (
              <Image source={{ uri: previewMedia.uri }} style={styles.previewImage} />
            ) : previewMedia?.type === 'video' ? (
              <Video 
                source={{ uri: previewMedia.uri }} 
                style={styles.previewVideo} 
                useNativeControls 
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                isLooping={false}
              />
            ) : previewMedia?.type === 'audio' ? (
              <View style={styles.audioPreview}>
                <Ionicons name="musical-notes" size={48} color="#6b7280" />
                <Text style={styles.audioPreviewText}>{previewMedia.fileName}</Text>
                {previewMedia.uri && (
                  <Video
                    source={{ uri: previewMedia.uri }}
                    style={{ width: '100%', height: 40 }}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                  />
                )}
              </View>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  const newAttachment = {
                    fileName: previewMedia.fileName,
                    fileType: previewMedia.fileType,
                    fileSize: previewMedia.fileSize || Math.floor((previewMedia.fileData?.length || 0) * 0.75),
                    attachmentType: previewMedia.type.toUpperCase(),
                    fileData: previewMedia.fileData ?? previewMedia.base64 ?? "",
                    uri: previewMedia.uri,
                    _processed: true,
                  };
                  
                  setAttachments((prev) => [...prev, newAttachment]);
                  setPreviewMedia(null);
                }}
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmBtnText}>Confirm</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => setPreviewMedia(null)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Document Preview Modal */}
      <Modal visible={!!documentPreview} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.documentPreviewHeader}>
              <Text style={styles.modalTitle}>Document Preview</Text>
              <TouchableOpacity onPress={() => setDocumentPreview(null)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            {documentPreview?.type === 'text' && documentPreview?.text ? (
              <ScrollView style={styles.textPreview}>
                <Text style={styles.textPreviewContent}>{documentPreview.text}</Text>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Camera Modal */}
      <Modal visible={cameraModalOpen} transparent animationType="slide">
        <View style={styles.cameraModalContainer}>
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraHeaderText}>Capture Media</Text>
            <TouchableOpacity onPress={closeCamera} style={styles.cameraCloseBtn}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        <View style={{ flex: 1 }}>
          <CameraView
            ref={cameraRef}
            style={styles.cameraPreview}
            facing={cameraType}
            mode={cameraMode}
            videoQuality="720p"
          />
            <View style={styles.cameraControls}>
              <TouchableOpacity
                onPress={toggleCamera}
                style={styles.flipBtn}
              >
                <Ionicons name="camera-reverse" size={28} color="white" />
              </TouchableOpacity>
              
              {!isRecordingVideo ? (
                <View style={styles.cameraActionRow}>
                  <TouchableOpacity onPress={takePhoto} style={styles.photoBtn}>
                    <Ionicons name="camera" size={24} color="white" />
                    <Text style={styles.btnLabel}>Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={startVideoRecording} style={styles.videoBtn}>
                    <Ionicons name="videocam" size={24} color="white" />
                    <Text style={styles.btnLabel}>Video</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.recordingControls}>
                  <View style={styles.recordingTimerDisplay}>
                    <Text style={styles.recordingTimerDisplayText}>
                      {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:
                      {String(recordingTime % 60).padStart(2, '0')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={stopVideoRecording} style={styles.stopRecordingBtn}>
                    <Ionicons name="stop-circle" size={28} color="white" />
                    <Text style={styles.btnLabel}>Stop</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ FIX: Event Form Modal with bulletproof Cross-Platform Date Picker */}
      <Modal visible={eventForm.open} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.eventModalContent}>
            <Text style={styles.eventModalTitle}>Create Event</Text>
            
            <TextInput
              style={styles.eventInput}
              placeholder="Event title"
              value={eventForm.title}
              onChangeText={(text) => setEventForm({ ...eventForm, title: text })}
            />
            
            {/* ✅ Web: Use native HTML5 datetime-local input */}
            {Platform.OS === 'web' ? (
              <input
                type="datetime-local"
                value={eventForm.datetime ? new Date(eventForm.datetime).toISOString().slice(0, 16) : ''}
                onChange={(e: any) => {
                  const date = new Date(e.target.value);
                  if (!isNaN(date.getTime())) {
                    setSelectedDate(date);
                    setEventForm({ ...eventForm, datetime: date.toISOString() });
                  }
                }}
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  fontSize: 14,
                  width: '100%',
                  boxSizing: 'border-box',
                  color: eventForm.datetime ? '#111827' : '#9ca3af',
                  fontFamily: 'inherit',
                }}
              />
            ) : (
              /* ✅ Native Mobile: Use @react-native-community/datetimepicker */
              <>
                <TouchableOpacity 
                  style={styles.eventInput} 
                  onPress={() => {
                    if (eventForm.datetime) {
                      setSelectedDate(new Date(eventForm.datetime));
                    } else {
                      setSelectedDate(new Date());
                    }
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={eventForm.datetime ? styles.eventInputText : styles.eventInputPlaceholder}>
                    {eventForm.datetime ? new Date(eventForm.datetime).toLocaleString() : "Select Date & Time"}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="datetime"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      if (date) {
                        setSelectedDate(date);
                        setEventForm({ ...eventForm, datetime: date.toISOString() });
                      }
                      // Auto-close on Android after selection
                      if (Platform.OS === 'android' && event.type === 'set') {
                        setShowDatePicker(false);
                      }
                    }}
                  />
                )}
                
                {/* ✅ iOS: Add a "Done" button to close the inline spinner */}
                {showDatePicker && Platform.OS === 'ios' && (
                  <TouchableOpacity 
                    style={{ alignSelf: 'flex-end', marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8 }}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={{ color: '#3b82f6', fontWeight: '600', fontSize: 16 }}>Done</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <View style={styles.eventModalButtons}>
              <TouchableOpacity
                onPress={() => {
                  if (!eventForm.title || !eventForm.datetime) {
                    Alert.alert('Error', 'Please fill in both title and date/time');
                    return;
                  }
                  const eventData = {
                    title: eventForm.title,
                    datetime: eventForm.datetime,
                  };
                  setContent(`📅 ${eventForm.title} @ ${new Date(eventForm.datetime).toLocaleString()}`);
                  setAttachments((prev) => [
                    ...prev,
                    {
                      fileName: 'event.json',
                      fileType: 'application/json',
                      fileSize: JSON.stringify(eventData).length,
                      attachmentType: 'EVENT',
                      eventData,
                    },
                  ]);
                  setEventForm({ open: false, title: '', datetime: '' });
                  setSelectedDate(new Date());
                  setShowDatePicker(false);
                }}
                style={styles.eventSubmitBtn}
              >
                <Text style={styles.eventSubmitBtnText}>Add Event</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { 
                  setEventForm({ open: false, title: '', datetime: '' }); 
                  setShowDatePicker(false); 
                }}
                style={styles.eventCancelBtn}
              >
                <Text style={styles.eventCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Attachment Menu */}
      <Modal visible={showAttachmentMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachmentMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity onPress={() => handleFileUpload('image/*')} style={styles.menuItem}>
              <Ionicons name="image" size={20} color="#6b7280" />
              <Text style={styles.menuItemText}>Image</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleFileUpload('video/*')} style={styles.menuItem}>
              <Ionicons name="videocam" size={20} color="#6b7280" />
              <Text style={styles.menuItemText}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleFileUpload('*/*')} style={styles.menuItem}>
              <Ionicons name="document-text" size={20} color="#6b7280" />
              <Text style={styles.menuItemText}>Document</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLocation} style={styles.menuItem}>
              <Ionicons name="location" size={20} color="#6b7280" />
              <Text style={styles.menuItemText}>Location</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setEventForm({ open: true, title: '', datetime: '' }); setShowAttachmentMenu(false); }} style={styles.menuItem}>
              <Ionicons name="calendar" size={20} color="#6b7280" />
              <Text style={styles.menuItemText}>Event</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Main Composer */}
      <View style={styles.composerContainer}>
        <TouchableOpacity onPress={openCamera} style={styles.iconBtn}>
          <Ionicons name="camera" size={22} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={startVoiceRecording}
          style={[styles.iconBtn, isRecordingVoice && styles.recordingIconBtn]}
          disabled={micError}
        >
          <Ionicons
            name={isRecordingVoice ? 'stop-circle' : 'mic'}
            size={22}
            color={isRecordingVoice ? 'white' : '#6b7280'}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowAttachmentMenu(true)} style={styles.iconBtn}>
          <Ionicons name="attach" size={22} color="#6b7280" />
        </TouchableOpacity>

        {/* ✅ FIXED: Emoji Button with Library */}
        <TouchableOpacity onPress={() => setShowEmojiPicker(!showEmojiPicker)} style={styles.iconBtn}>
          <Ionicons name="happy-outline" size={22} color={showEmojiPicker ? "#3b82f6" : "#6b7280"} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={content}
          onChangeText={handleInputChange}
          placeholder="Type a message..."
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={(!content.trim() && attachments.length === 0 && !editingPost) || isSubmitting}
          style={[
            styles.sendBtn,
            (content.trim() || attachments.length > 0 || editingPost) && !isSubmitting
              ? styles.sendBtnActive
              : styles.sendBtnDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name={editingPost ? "checkmark-done" : "send"} size={18} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ========== STYLES ==========
const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
  },
  attachmentContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
    maxHeight: 50,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    position: 'relative',
  },
  attachmentText: {
    fontSize: 12,
    color: '#374151',
  },
  removeAttachment: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderColor: '#f87171',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  recordingText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#dc2626',
  },
  recordingTimer: {
    backgroundColor: '#fca5a5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recordingTimerText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  stopRecordingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  stopRecordingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#bfdbfe',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 10,
    marginBottom: 0,
  },
  editBannerIndicator: {
    width: 4,
    height: 30,
    backgroundColor: '#2563eb',
    borderRadius: 2,
    marginRight: 10,
  },
  editBannerContent: {
    flex: 1,
  },
  editBannerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  editBannerText: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 2,
  },
  editBannerClose: {
    padding: 4,
  },
  emojiPickerContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    height: 320,
    overflow: 'hidden',
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  emojiPickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  emojiPicker: {
    height: 260,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: SCREEN_WIDTH - 40,
    maxHeight: '80%',
  },
  modalTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  previewVideo: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  audioPreview: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 12,
  },
  audioPreviewText: {
    marginTop: 8,
    fontSize: 14,
    color: '#374151',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: 'white',
    fontWeight: '600',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#374151',
  },
  documentPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  textPreview: {
    maxHeight: 400,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  textPreviewContent: {
    fontSize: 14,
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cameraModalContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cameraHeaderText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  cameraCloseBtn: {
    padding: 8,
  },
  cameraPreview: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  flipBtn: {
    position: 'absolute',
    top: -120,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 30,
  },
  cameraActionRow: {
    flexDirection: 'row',
    gap: 40,
  },
  photoBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
    borderRadius: 40,
  },
  videoBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
    borderRadius: 40,
  },
  recordingControls: {
    alignItems: 'center',
    gap: 12,
  },
  recordingTimerDisplay: {
    backgroundColor: 'rgba(239,68,68,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recordingTimerDisplayText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  btnLabel: {
    color: 'white',
    fontSize: 10,
    marginTop: 4,
  },
  eventModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: SCREEN_WIDTH - 40,
  },
  eventModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  eventInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    justifyContent: 'center',
  },
  eventInputText: { fontSize: 14, color: '#111827' },
  eventInputPlaceholder: { fontSize: 14, color: '#9ca3af' },
  eventModalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  eventSubmitBtn: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  eventSubmitBtnText: {
    color: 'white',
    fontWeight: '600',
  },
  eventCancelBtn: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  eventCancelBtnText: {
    color: '#374151',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: '#374151',
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  iconBtn: {
    padding: 8,
  },
  recordingIconBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 20,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
    maxHeight: 100,
  },
  sendBtn: {
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#22c55e',
  },
  sendBtnDisabled: {
    backgroundColor: '#e5e7eb',
  },
});
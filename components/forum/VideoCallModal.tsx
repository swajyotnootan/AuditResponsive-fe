// src/Components/forum/VideoCallModal.tsx
import { Audio } from 'expo-av';
import { Maximize2, Mic, MicOff, Minimize2, Phone, User, Users, Video, VideoOff, Volume2, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image, Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { RTCView } from 'react-native-webrtc';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ========== TYPES ==========
interface VideoCallModalProps {
  callState: 'idle' | 'ringing' | 'calling' | 'connected' | 'ended';
  callerName?: string;
  isAdmin?: boolean;
  currentUserId: string;
  localStream?: any;
  remoteStreams?: Record<string, any>;
  participants?: string[];
  allUsers?: any[];
  currentUser?: any;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onEndCall: () => void;
  onClose: () => void;
  callType?: 'video' | 'audio';
}

// ========== HELPER ==========
const getStreamURL = (stream: any) => {
  if (!stream) return '';
  return stream.toURL ? stream.toURL() : '';
};

// ========== MAIN COMPONENT ==========
export default function VideoCallModal({
  callState, callerName, isAdmin, currentUserId, localStream, remoteStreams = {},
  participants = [], allUsers = [], currentUser, onAccept, onDecline, onCancel, onEndCall, onClose, callType = 'video'
}: VideoCallModalProps) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [fullscreenParticipant, setFullscreenParticipant] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [showParticipantsSidebar, setShowParticipantsSidebar] = useState(false);
  
  const [cameraStatus, setCameraStatus] = useState<Record<string, boolean>>({});
  const [micStatus, setMicStatus] = useState<Record<string, boolean>>({});
  const [activeSpeakers, setActiveSpeakers] = useState<Set<string>>(new Set());

  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringtoneSound = useRef<Audio.Sound | null>(null);

  const totalParticipants = participants.length + 1;

  // Helper functions
  const getUserDisplayName = (userId: string) => {
    if (userId === currentUserId) return 'You';
    const user = allUsers?.find(u => u.username === userId || u.email === userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : userId;
  };

  const getUserProfileImage = (userId: string) => {
    if (userId === currentUserId) return currentUser?.profileImage || null;
    const user = allUsers?.find(u => u.username === userId || u.email === userId);
    return user?.profileImage || null;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. RINGTONE PLAYBACK (Using expo-av)
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
        if (callState === 'ringing' || (callState === 'calling' && participants.length === 0)) {
          if (!ringtoneSound.current) {
            // ⚠️ Ensure 'callertune.mp3' exists in your assets folder
            const { sound } = await Audio.Sound.createAsync(
              require('../../assets/callertune.mp3'), 
              { shouldPlay: true, isLooping: true }
            );
            ringtoneSound.current = sound;
          }
        } else {
          if (ringtoneSound.current) {
            await ringtoneSound.current.stopAsync();
            await ringtoneSound.current.unloadAsync();
            ringtoneSound.current = null;
          }
        }
      } catch (err) {
        console.error('Audio setup error:', err);
      }
    };
    setupAudio();
    return () => { ringtoneSound.current?.unloadAsync(); };
  }, [callState, participants.length]);

  // 2. STREAM MONITORING
  useEffect(() => {
    const newCameraStatus: Record<string, boolean> = {};
    const newMicStatus: Record<string, boolean> = {};
    
    // Local
    const localVideoTrack = localStream?.getVideoTracks()[0];
    const localAudioTrack = localStream?.getAudioTracks()[0];
    newCameraStatus[currentUserId] = camOn && !!localVideoTrack && localVideoTrack.enabled;
    newMicStatus[currentUserId] = micOn && !!localAudioTrack && localAudioTrack.enabled;

    // Remote
    Object.entries(remoteStreams).forEach(([userId, stream]) => {
      if (stream) {
        const vTrack = stream.getVideoTracks()[0];
        const aTrack = stream.getAudioTracks()[0];
        newCameraStatus[userId] = !!vTrack && vTrack.enabled && vTrack.readyState === 'live';
        newMicStatus[userId] = !!aTrack && aTrack.enabled && aTrack.readyState === 'live';
      } else {
        newCameraStatus[userId] = false;
        newMicStatus[userId] = false;
      }
    });

    setCameraStatus(newCameraStatus);
    setMicStatus(newMicStatus);
  }, [localStream, remoteStreams, camOn, micOn, currentUserId]);

  // 3. CALL TIMER
  useEffect(() => {
    if (callState === 'connected' && !callTimerRef.current) {
      callTimerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    } else if ((callState === 'idle' || callState === 'ended') && callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, [callState]);

  // 4. HANDLERS
  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track: any) => track.enabled = !micOn);
      setMicOn(!micOn);
    }
  };

  const toggleCam = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track: any) => track.enabled = !camOn);
      setCamOn(!camOn);
    }
  };

  const handleAccept = () => {
    ringtoneSound.current?.stopAsync();
    onAccept();
  };

  const handleDecline = () => {
    ringtoneSound.current?.stopAsync();
    onDecline();
  };

  const handleEndCall = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    ringtoneSound.current?.unloadAsync();
    setCallDuration(0);
    setFullscreenParticipant(null);
    onEndCall();
  };

  // Grid sizing logic
  const getItemWidth = () => {
    if (totalParticipants <= 1) return '100%';
    if (totalParticipants <= 2) return '100%'; // Stack vertically for 1-2
    if (totalParticipants <= 4) return '50%';
    if (totalParticipants <= 9) return '33.33%';
    return '25%';
  };
  const itemWidth = getItemWidth();

  // ========== VIDEO TILE COMPONENT ==========
  const VideoTile = ({ userId, stream, isLocal, isSpeaking, hasVideo, hasAudio, name, image, onMaximize }: any) => (
    <View style={[styles.tileContainer, { width: itemWidth }]}>
      {hasVideo && stream ? (
        <RTCView 
          streamURL={getStreamURL(stream)} 
          style={styles.video} 
          mirror={isLocal} 
          objectFit="cover" 
        />
      ) : (
        <View style={styles.videoFallback}>
          {image ? (
            <Image source={{ uri: image }} style={styles.fallbackImage} />
          ) : (
            <View style={[styles.fallbackAvatar, isLocal ? styles.avatarBlue : styles.avatarPurple]}>
              <User size={32} color="white" />
            </View>
          )}
          <Text style={styles.fallbackName}>{name}</Text>
          <Text style={styles.fallbackStatus}>Camera is off</Text>
        </View>
      )}
      
      {/* Overlay Info */}
      <View style={styles.tileOverlay}>
        <View style={[styles.statusDot, hasVideo ? styles.dotGreen : styles.dotRed]} />
        <Text style={styles.tileName} numberOfLines={1}>
          {name} {!hasVideo && '(Cam Off)'}
        </Text>
        {isSpeaking && <Volume2 size={12} color="#4ade80" />}
      </View>

      {/* Maximize Button */}
      <TouchableOpacity style={styles.maximizeBtn} onPress={() => onMaximize(userId)}>
        <Maximize2 size={16} color="white" />
      </TouchableOpacity>
    </View>
  );

  // ========== FULLSCREEN VIEW ==========
  if (fullscreenParticipant) {
    const isLocal = fullscreenParticipant === currentUserId;
    const stream = isLocal ? localStream : remoteStreams[fullscreenParticipant];
    const name = getUserDisplayName(fullscreenParticipant);
    const image = getUserProfileImage(fullscreenParticipant);
    const hasVideo = cameraStatus[fullscreenParticipant];
    const isSpeaking = activeSpeakers.has(fullscreenParticipant);

    return (
      <View style={styles.fullScreenOverlay}>
        <View style={styles.fullscreenHeader}>
          <TouchableOpacity style={styles.minimizeBtn} onPress={() => setFullscreenParticipant(null)}>
            <Minimize2 size={16} color="white" />
            <Text style={styles.minimizeText}>Back to Grid</Text>
          </TouchableOpacity>
          <Text style={styles.fullscreenName}>{name} {isSpeaking && '🎤'}</Text>
        </View>

        <View style={styles.fullscreenVideoContainer}>
          {hasVideo && stream ? (
            <RTCView 
              streamURL={getStreamURL(stream)} 
              style={StyleSheet.absoluteFill} 
              mirror={isLocal} 
              objectFit="contain" 
            />
          ) : (
            <View style={styles.fullscreenFallback}>
              {image ? (
                <Image source={{ uri: image }} style={styles.fullscreenImage} />
              ) : (
                <View style={styles.fullscreenAvatar}>
                  <User size={64} color="white" />
                </View>
              )}
              <Text style={styles.fullscreenName}>{name}</Text>
              <Text style={styles.fullscreenStatus}>Camera is off</Text>
            </View>
          )}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={[styles.controlBtn, micOn ? styles.controlBtnWhite : styles.controlBtnRed]} onPress={toggleMic}>
            {micOn ? <Mic size={24} color="#1f2937" /> : <MicOff size={24} color="white" />}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, styles.controlBtnRed]} onPress={handleEndCall}>
            <Phone size={24} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          {callType === 'video' && (
            <TouchableOpacity style={[styles.controlBtn, camOn ? styles.controlBtnWhite : styles.controlBtnRed]} onPress={toggleCam}>
              {camOn ? <Video size={24} color="#1f2937" /> : <VideoOff size={24} color="white" />}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ========== CALLING STATE (Waiting) ==========
  if (callState === 'calling' && participants.length === 0) {
    return (
      <View style={styles.fullScreenOverlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, styles.iconCircleBlue]}>
            {callType === 'video' ? <Video size={32} color="#2563eb" /> : <Volume2 size={32} color="#2563eb" />}
          </View>
          <Text style={styles.title}>Starting {callType === 'video' ? 'Video' : 'Audio'} Call...</Text>
          <Text style={styles.subtitle}>Waiting for participants to answer</Text>
          <TouchableOpacity style={[styles.btn, styles.btnRed]} onPress={onCancel}>
            <Phone size={20} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
            <Text style={styles.btnText}>Cancel Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ========== RINGING STATE (Incoming) ==========
  if (callState === 'ringing') {
    return (
      <View style={styles.fullScreenOverlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, styles.iconCircleGreen]}>
            {callType === 'video' ? <Video size={32} color="#16a34a" /> : <Volume2 size={32} color="#16a34a" />}
          </View>
          <Text style={styles.title}>Incoming {callType === 'video' ? 'Video' : 'Audio'} Call</Text>
          <Text style={styles.subtitle}>from <Text style={styles.bold}>{callerName}</Text></Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.btnRed]} onPress={handleDecline}>
              <Phone size={20} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
              <Text style={styles.btnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={handleAccept}>
              {callType === 'video' ? <Video size={20} color="white" /> : <Volume2 size={20} color="white" />}
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ========== ACTIVE CALL (Grid View) ==========
  return (
    <View style={styles.fullScreenOverlay}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{callType === 'video' ? 'Video' : 'Audio'} Call • {totalParticipants}</Text>
          {callDuration > 0 && <Text style={styles.timerText}>⏱️ {formatTime(callDuration)}</Text>}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.participantsBtn} onPress={() => setShowParticipantsSidebar(true)}>
            <Users size={14} color="white" />
            <Text style={styles.participantsBtnText}>{participants.length} joined</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.endCallBtnSmall} onPress={handleEndCall}>
            <Phone size={16} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Video Grid */}
      <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          <VideoTile 
            userId={currentUserId} 
            stream={localStream} 
            isLocal 
            isSpeaking={activeSpeakers.has(currentUserId)}
            hasVideo={cameraStatus[currentUserId]} 
            hasAudio={micStatus[currentUserId]} 
            name="You" 
            image={currentUser?.profileImage} 
            onMaximize={setFullscreenParticipant}
          />
          {participants.map(pid => (
            <VideoTile 
              key={pid}
              userId={pid} 
              stream={remoteStreams[pid]} 
              isSpeaking={activeSpeakers.has(pid)}
              hasVideo={cameraStatus[pid]} 
              hasAudio={micStatus[pid]} 
              name={getUserDisplayName(pid)} 
              image={getUserProfileImage(pid)} 
              onMaximize={setFullscreenParticipant}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bottom Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlBtn, micOn ? styles.controlBtnWhite : styles.controlBtnRed]} onPress={toggleMic}>
          {micOn ? <Mic size={24} color="#1f2937" /> : <MicOff size={24} color="white" />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, styles.controlBtnRed]} onPress={handleEndCall}>
          <Phone size={24} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
        {callType === 'video' && (
          <TouchableOpacity style={[styles.controlBtn, camOn ? styles.controlBtnWhite : styles.controlBtnRed]} onPress={toggleCam}>
            {camOn ? <Video size={24} color="#1f2937" /> : <VideoOff size={24} color="white" />}
          </TouchableOpacity>
        )}
      </View>

      {/* Participants Sidebar Modal */}
      <Modal visible={showParticipantsSidebar} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.sidebarOverlay} 
          activeOpacity={1} 
          onPress={() => setShowParticipantsSidebar(false)}
        >
          <View style={styles.sidebar} onStartShouldSetResponder={() => true}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Participants ({totalParticipants})</Text>
              <TouchableOpacity onPress={() => setShowParticipantsSidebar(false)}>
                <X size={24} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sidebarContent}>
              {/* Local User */}
              <View style={styles.sidebarItem}>
                <View style={styles.sidebarAvatar}><User size={20} color="white" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sidebarName}>{getUserDisplayName(currentUserId)}</Text>
                  <View style={styles.sidebarStatus}>
                    {cameraStatus[currentUserId] ? <Video size={12} color="#9ca3af" /> : <VideoOff size={12} color="#9ca3af" />}
                    {micStatus[currentUserId] ? <Mic size={12} color="#9ca3af" /> : <MicOff size={12} color="#9ca3af" />}
                  </View>
                </View>
                <View style={styles.youBadge}><Text style={styles.youBadgeText}>You</Text></View>
              </View>
              {/* Remote Users */}
              {participants.map(pid => (
                <View key={pid} style={styles.sidebarItem}>
                  <View style={styles.sidebarAvatar}><User size={20} color="white" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sidebarName}>{getUserDisplayName(pid)}</Text>
                    <View style={styles.sidebarStatus}>
                      {cameraStatus[pid] ? <Video size={12} color="#9ca3af" /> : <VideoOff size={12} color="#9ca3af" />}
                      {micStatus[pid] ? <Mic size={12} color="#9ca3af" /> : <MicOff size={12} color="#9ca3af" />}
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ========== STYLES ==========
const styles = StyleSheet.create({
  fullScreenOverlay: { flex: 1, backgroundColor: '#000000' },
  
  // Cards (Calling/Ringing)
  card: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  iconCircleGreen: { backgroundColor: '#dcfce7' },
  iconCircleBlue: { backgroundColor: '#dbeafe' },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#9ca3af', marginBottom: 32 },
  bold: { fontWeight: '600', color: 'white' },
  row: { flexDirection: 'row', gap: 16 },
  btn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  btnRed: { backgroundColor: '#ef4444' },
  btnGreen: { backgroundColor: '#22c55e' },
  btnText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  
  // Header
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 16, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)' },
  headerTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
  timerText: { color: '#4ade80', fontSize: 14, fontWeight: '500', marginTop: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  participantsBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, gap: 6 },
  participantsBtnText: { color: 'white', fontSize: 14, fontWeight: '500' },
  endCallBtnSmall: { backgroundColor: '#ef4444', padding: 8, borderRadius: 999 },
  
  // Grid
  gridContainer: { flexGrow: 1, paddingTop: 100, paddingBottom: 120, paddingHorizontal: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  
  // Video Tile
  tileContainer: { aspectRatio: 1, padding: 4, position: 'relative' },
  video: { flex: 1, borderRadius: 12, backgroundColor: '#1f2937' },
  videoFallback: { flex: 1, borderRadius: 12, backgroundColor: '#1f2937', alignItems: 'center', justifyContent: 'center' },
  fallbackImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: 'white' },
  fallbackAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarBlue: { backgroundColor: '#2563eb' },
  avatarPurple: { backgroundColor: '#9333ea' },
  fallbackName: { color: 'white', fontSize: 14, fontWeight: '600', marginTop: 8 },
  fallbackStatus: { color: '#9ca3af', fontSize: 12 },
  tileOverlay: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: '#4ade80' },
  dotRed: { backgroundColor: '#f87171' },
  tileName: { color: 'white', fontSize: 12, fontWeight: '500', maxWidth: 100 },
  maximizeBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 999 },
  
  // Fullscreen
  fullscreenHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 16, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)' },
  minimizeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, gap: 6 },
  minimizeText: { color: 'white', fontSize: 14 },
  fullscreenName: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 16 },
  fullscreenVideoContainer: { flex: 1, backgroundColor: '#000' },
  fullscreenFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fullscreenImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: 'white' },
  fullscreenAvatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#4b5563', alignItems: 'center', justifyContent: 'center' },
  fullscreenStatus: { color: '#9ca3af', fontSize: 14, marginTop: 8 },
  
  // Controls
  controls: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
  controlBtn: { padding: 16, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  controlBtnWhite: { backgroundColor: 'white' },
  controlBtnRed: { backgroundColor: '#ef4444' },
  
  // Sidebar
  sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', justifyContent: 'flex-end' },
  sidebar: { width: '80%', maxWidth: 400, height: '100%', backgroundColor: '#000000', padding: 16 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#374151' },
  sidebarTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
  sidebarContent: { flex: 1, marginTop: 16 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#1f2937', borderRadius: 12, marginBottom: 8 },
  sidebarAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4b5563', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sidebarName: { color: 'white', fontSize: 16, fontWeight: '500' },
  sidebarStatus: { flexDirection: 'row', gap: 8, marginTop: 4 },
  youBadge: { backgroundColor: '#2563eb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginLeft: 'auto' },
  youBadgeText: { color: 'white', fontSize: 12, fontWeight: '600' },
});
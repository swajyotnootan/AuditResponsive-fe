// src/Components/forum/AudioCallModal.tsx
import { Audio } from 'expo-av';
import { Mic, MicOff, Phone, User, Users, Volume2, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image, Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// ========== TYPES ==========
interface AudioCallModalProps {
  callState: 'idle' | 'ringing' | 'calling' | 'connected' | 'ended';
  callerName?: string;
  isAdmin?: boolean;
  currentUserId: string;
  localStream?: any; // MediaStream from react-native-webrtc
  remoteStreams?: Record<string, any>; // { userId: MediaStream }
  participants?: string[]; // [userId1, userId2]
  allUsers?: any[];
  currentUser?: any;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onClose: () => void;
  onEndCall: () => void;
}

// ========== MAIN COMPONENT ==========
export default function AudioCallModal({
  callState, callerName, isAdmin, currentUserId, localStream, remoteStreams = {},
  participants = [], allUsers = [], currentUser, onAccept, onDecline, onCancel, onClose, onEndCall
}: AudioCallModalProps) {
  const [micOn, setMicOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [showParticipantsSidebar, setShowParticipantsSidebar] = useState(false);
  const [participantStatus, setParticipantStatus] = useState<Record<string, any>>({});
  
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringtoneSound = useRef<Audio.Sound | null>(null);
  const callerTuneSound = useRef<Audio.Sound | null>(null);

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

  // 1. RINGTONE & CALLER TUNE PLAYBACK (Using expo-av)
  useEffect(() => {
    const setupAudio = async () => {
      try {
        // Ensure audio plays even if the phone is on silent mode
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });

        if (callState === 'ringing') {
          if (!ringtoneSound.current) {
            // ⚠️ IMPORTANT: Ensure you have 'callertune.mp3' in your assets folder. 
            // If not, replace require() with: { uri: 'https://your-server.com/ringtone.mp3' }
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

        if (callState === 'calling' && participants.length === 0) {
          if (!callerTuneSound.current) {
            const { sound } = await Audio.Sound.createAsync(
              require('../../assets/callertune.mp3'), 
              { shouldPlay: true, isLooping: true }
            );
            callerTuneSound.current = sound;
          }
        } else {
          if (callerTuneSound.current) {
            await callerTuneSound.current.stopAsync();
            await callerTuneSound.current.unloadAsync();
            callerTuneSound.current = null;
          }
        }
      } catch (err) {
        console.error('Audio setup error:', err);
      }
    };
    setupAudio();

    return () => {
      ringtoneSound.current?.unloadAsync();
      callerTuneSound.current?.unloadAsync();
    };
  }, [callState, participants.length]);

  // 2. CALL TIMER
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

  // 3. PARTICIPANT STATUS TRACKING
  useEffect(() => {
    const newStatus: Record<string, any> = {};
    newStatus[currentUserId] = { micOn, isLocal: true };

    Object.keys(remoteStreams).forEach(streamKey => {
      if (participants.includes(streamKey)) {
        const stream = remoteStreams[streamKey];
        const hasAudio = stream?.getAudioTracks?.().length > 0;
        const audioEnabled = hasAudio ? stream.getAudioTracks()[0].enabled : false;
        newStatus[streamKey] = { micOn: audioEnabled, hasAudio, isLocal: false };
      }
    });
    setParticipantStatus(newStatus);
  }, [participants, remoteStreams, micOn, currentUserId]);

  // 4. HANDLERS
  const toggleMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !micOn;
        setMicOn(!micOn);
      }
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
    callerTuneSound.current?.unloadAsync();
    setCallDuration(0);
    onEndCall();
  };

  const participantsToShow = isAdmin ? participants.filter(p => p !== currentUserId) : participants;
  const displayCallerName = callerName || (participants.length > 0 ? getUserDisplayName(participants[0]) : 'Unknown');

  // ========== PARTICIPANT CARD COMPONENT ==========
  const ParticipantCard = ({ name, image, isSpeaking, micEnabled, isLocal }: any) => (
    <View style={[styles.participantCard, isSpeaking && styles.participantCardSpeaking]}>
      {image ? (
        <Image source={{ uri: image }} style={styles.participantImage} />
      ) : (
        <View style={[styles.participantAvatar, isLocal ? styles.participantAvatarBlue : styles.participantAvatarPurple]}>
          <User size={32} color="white" />
        </View>
      )}
      <Text style={styles.participantName}>{name}</Text>
      <View style={styles.participantStatus}>
        {micEnabled ? <Mic size={16} color="#4ade80" /> : <MicOff size={16} color="#f87171" />}
        {isSpeaking && <Volume2 size={16} color="#4ade80" />}
      </View>
    </View>
  );

  // ========== UI RENDERING ==========

  // 1. INCOMING CALL (Ringing)
  if (callState === 'ringing') {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={[styles.iconCircle, styles.iconCircleGreen]}>
              <Phone size={32} color="#16a34a" style={{ transform: [{ rotate: '135deg' }] }} />
            </View>
            <Text style={styles.title}>Incoming Audio Call</Text>
            <Text style={styles.subtitle}>from <Text style={styles.bold}>{displayCallerName}</Text></Text>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, styles.btnRed]} onPress={handleDecline}>
                <Phone size={20} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
                <Text style={styles.btnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={handleAccept}>
                <Phone size={20} color="white" />
                <Text style={styles.btnText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // 2. OUTGOING CALL (Calling)
  if (callState === 'calling' && participantsToShow.length === 0) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={[styles.iconCircle, styles.iconCircleBlue]}>
              <Phone size={32} color="#2563eb" />
            </View>
            <Text style={styles.title}>Calling...</Text>
            <Text style={styles.subtitle}>Calling {displayCallerName}</Text>
            <TouchableOpacity style={[styles.btn, styles.btnRed]} onPress={onCancel}>
              <Phone size={20} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
              <Text style={styles.btnText}>Cancel Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // 3. ACTIVE CALL (Connected)
  return (
    <View style={styles.connectedContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Audio Call - {participants.length + 1} participants</Text>
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

      {/* Participants Grid */}
      <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          <ParticipantCard 
            name="You" 
            image={currentUser?.profileImage} 
            isSpeaking={false} // Mocked: Web Audio API not available in RN
            micEnabled={micOn} 
            isLocal 
          />
          {participants.map(pid => (
            <ParticipantCard 
              key={pid}
              name={getUserDisplayName(pid)} 
              image={getUserProfileImage(pid)} 
              isSpeaking={false} // Mocked
              micEnabled={participantStatus[pid]?.micOn} 
            />
          ))}
        </View>
        {participants.length === 0 && (
          <Text style={styles.waitingText}>Waiting for participants to join...</Text>
        )}
      </ScrollView>

      {/* Bottom Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlBtn, micOn ? styles.controlBtnWhite : styles.controlBtnRed]} onPress={toggleMic}>
          {micOn ? <Mic size={24} color="#1f2937" /> : <MicOff size={24} color="white" />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, styles.controlBtnRed]} onPress={handleEndCall}>
          <Phone size={24} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
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
              <Text style={styles.sidebarTitle}>Participants ({participants.length + 1})</Text>
              <TouchableOpacity onPress={() => setShowParticipantsSidebar(false)}>
                <X size={24} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sidebarContent}>
              <View style={styles.sidebarItem}>
                <View style={styles.sidebarAvatar}><User size={20} color="white" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sidebarName}>{getUserDisplayName(currentUserId)}</Text>
                  <View style={styles.sidebarStatus}>
                    {micOn ? <Mic size={12} color="#9ca3af" /> : <MicOff size={12} color="#9ca3af" />}
                  </View>
                </View>
                <View style={styles.youBadge}><Text style={styles.youBadgeText}>You</Text></View>
              </View>
              {participants.map(pid => (
                <View key={pid} style={styles.sidebarItem}>
                  <View style={styles.sidebarAvatar}><User size={20} color="white" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sidebarName}>{getUserDisplayName(pid)}</Text>
                    <View style={styles.sidebarStatus}>
                      {participantStatus[pid]?.micOn ? <Mic size={12} color="#9ca3af" /> : <MicOff size={12} color="#9ca3af" />}
                    </View>
                  </View>
                </View>
              ))}
              {participants.length === 0 && (
                <Text style={styles.emptySidebarText}>No other participants joined yet.</Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ========== STYLES ==========
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 32, alignItems: 'center', width: '100%', maxWidth: 400 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconCircleGreen: { backgroundColor: '#dcfce7' },
  iconCircleBlue: { backgroundColor: '#dbeafe' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#4b5563', marginBottom: 24 },
  bold: { fontWeight: '600' },
  row: { flexDirection: 'row', gap: 16 },
  btn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  btnRed: { backgroundColor: '#ef4444' },
  btnGreen: { backgroundColor: '#22c55e' },
  btnText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  
  connectedContainer: { flex: 1, backgroundColor: '#0f172a' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 16, zIndex: 10 },
  headerTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
  timerText: { color: '#4ade80', fontSize: 14, fontWeight: '500', marginTop: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  participantsBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, gap: 6 },
  participantsBtnText: { color: 'white', fontSize: 14, fontWeight: '500' },
  endCallBtnSmall: { backgroundColor: '#ef4444', padding: 8, borderRadius: 999 },
  
  gridContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, paddingTop: 80, paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%' },
  participantCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 24, padding: 24, alignItems: 'center', width: '45%', margin: '2.5%', marginBottom: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  participantCardSpeaking: { borderColor: '#4ade80' },
  participantImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'white', marginBottom: 12 },
  participantAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'white', marginBottom: 12 },
  participantAvatarBlue: { backgroundColor: '#2563eb' },
  participantAvatarPurple: { backgroundColor: '#9333ea' },
  participantName: { color: 'white', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  participantStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  waitingText: { color: 'white', fontSize: 18, marginTop: 24 },
  
  controls: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
  controlBtn: { padding: 16, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  controlBtnWhite: { backgroundColor: 'white' },
  controlBtnRed: { backgroundColor: '#ef4444' },
  
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
  emptySidebarText: { color: '#9ca3af', textAlign: 'center', marginTop: 32 },
});
import axios from 'axios';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BAR_COUNT = 5;
const SERVER_TRANSCRIBE_URL = 'http://192.168.0.104:3000/transcribe';
const SERVER_TRANSLATE_URL = 'http://192.168.0.104:3000/translate';

interface TranslateResponse {
  data?: {
    translations?: {
      translatedText: string;
    };
  };
}

export default function SpeechScreen() {
  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(undefined);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [showTranslationOptions, setShowTranslationOptions] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const loadingRotation = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const animations = useRef(Array.from({ length: BAR_COUNT }, () => new Animated.Value(0))).current;

  // === Fixed timers ===
  useEffect(() => {
    let silenceTimer: ReturnType<typeof setInterval> | null = null;
    let amplitudeInterval: ReturnType<typeof setInterval> | null = null;

    if (isRecording) {
      const simulateAmplitude = () => Math.random() * 0.8 + 0.2;

      amplitudeInterval = setInterval(() => {
        const amplitude = simulateAmplitude();
        Animated.timing(pulseAnim, {
          toValue: amplitude,
          duration: 100,
          useNativeDriver: true,
        }).start();
      }, 100);

      silenceTimer = setInterval(() => {
        const amplitude = simulateAmplitude();
        if (amplitude < 0.3) {
          stopRecording();
        }
      }, 2000);
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      if (amplitudeInterval) clearInterval(amplitudeInterval);
      if (silenceTimer) clearInterval(silenceTimer);
    }

    return () => {
      if (amplitudeInterval) clearInterval(amplitudeInterval);
      if (silenceTimer) clearInterval(silenceTimer);
    };
  }, [isRecording]);

  // Loading animation
  useEffect(() => {
    if (isTranscribing) {
      Animated.loop(
        Animated.parallel([
          Animated.timing(loadingRotation, {
            toValue: 1,
            duration: 1200,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(loadingOpacity, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(loadingOpacity, {
              toValue: 0.4,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    } else {
      loadingRotation.stopAnimation();
      loadingRotation.setValue(0);
      loadingOpacity.stopAnimation();
      loadingOpacity.setValue(0);
    }
  }, [isTranscribing]);

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') await requestPermission();
      if (permissionResponse?.status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone permission is needed to record audio.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setShowDropdown(false);
      setShowTranslationOptions(false);
      setTranscribedText('');
      setTranslatedText('');
      setTranscriptionError(null);
      setTranslationError(null);
      setDetectedLanguage('');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  }

  async function stopRecording() {
    if (!recording) return;
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const uri = recording.getURI();
      if (uri) await transcribeRecording(uri);
      setShowDropdown(true);
      setShowTranslationOptions(true);
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Recording Error', 'Failed to stop recording. Please try again.');
    } finally {
      setRecording(undefined);
    }
  }

  async function transcribeRecording(uri: string) {
    try {
      setIsTranscribing(true);
      setTranscriptionError(null);

      const response = await fetch(uri);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);

      const r = await fetch(SERVER_TRANSCRIBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64 }),
      });

      const data = await r.json();
      if (!r.ok || data.error) throw new Error(data.error || 'Transcription failed');

      setTranscribedText(data.text);
      setDetectedLanguage(data.detectedLanguage || 'Auto Detect');
      setShowTranslationOptions(true);
    } catch (error: any) {
      console.error('Transcription error:', error);
      setTranscriptionError(error.message || 'Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  }

  async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function translateText() {
    if (!transcribedText || !selectedLanguage) return;

    try {
      setIsTranslating(true);
      setTranslationError(null);

      const response = await axios.post(
        'https://deep-translate1.p.rapidapi.com/language/translate/v2',
        {
          q: transcribedText,
          source: 'auto',
          target: selectedLanguage,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': 'YOUR_KEY_HERE',
            'X-RapidAPI-Host': 'deep-translate1.p.rapidapi.com',
          },
        }
      );

      const translated = (response.data as TranslateResponse)?.data?.translations?.translatedText;
      setTranslatedText(translated || '');
    } catch (error: any) {
      console.error('Translation error:', error);
      setTranslationError('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  }

  // === ScrollView fix ===
  return (
    <LinearGradient colors={['#1f2937', '#000000']} className="flex-1">
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingVertical: 16 }}>
          {/* Rest of your UI */}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

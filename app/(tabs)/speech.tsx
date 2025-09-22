import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { languages } from '../select-language';

const BAR_COUNT = 5;
const SERVER_TRANSCRIBE_URL = 'http://192.168.1.33:3000/transcribe';
const SERVER_TRANSLATE_URL = 'http://192.168.1.33:3000/translate';

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

	useEffect(() => {
		let silenceTimer: ReturnType<typeof setInterval> | null = null;
		let amplitudeInterval: ReturnType<typeof setInterval> | null = null;

		if (isRecording) {
			// Simulate voice amplitude (0 to 1) for animation
			const simulateAmplitude = () => Math.random() * 0.8 + 0.2; // Random amplitude between 0.2 and 1

			// Animate pulse based on amplitude
			amplitudeInterval = setInterval(() => {
				const amplitude = simulateAmplitude();
				Animated.timing(pulseAnim, {
					toValue: amplitude,
					duration: 100, // Fast updates for voice sync
					useNativeDriver: true,
				}).start();
			}, 100);

			// Silence detection: Stop after 2 seconds of low amplitude
			silenceTimer = setInterval(() => {
				const amplitude = simulateAmplitude();
				if (amplitude < 0.3) { // Threshold for "silence"
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

	useEffect(() => {
		if (isTranscribing) {
			// Start loading ring rotation and opacity animation
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
			if (permissionResponse?.status !== 'granted') {
				await requestPermission();
			}
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
			if (uri) {
				await transcribeRecording(uri);
			}
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
						'X-RapidAPI-Key': '024a57ccf6msh5c52b309cd43b10p175985jsn70b5519fd8b0',
						'X-RapidAPI-Host': 'deep-translate1.p.rapidapi.com',
					},
				}
			);

			const translated = response.data?.data?.translations?.translatedText;
			setTranslatedText(translated);
		} catch (error: any) {
			console.error('Translation error:', error);
			setTranslationError('Translation failed. Please try again.');
		} finally {
			setIsTranslating(false);
		}
	}

	function resetAll(resetUI = true) {
		setTranscribedText('');
		setTranslatedText('');
		if (resetUI) setSelectedLanguage(undefined);
		setTranslationError(null);
	}

	function speakText(text: string) {
		Speech.speak(text, { language: 'en', pitch: 1, rate: 0.8 });
	}

	const letters = [
		{ char: 'C', color: 'text-orange-400' },
		{ char: 'H', color: 'text-white' },
		{ char: 'A', color: 'text-white' },
		{ char: 'T', color: 'text-blue-400' },
		{ char: 'T', color: 'text-blue-400' },
		{ char: 'E', color: 'text-white' },
		{ char: 'R', color: 'text-green-400' },
	];

	const letterAnimations = useRef(letters.map(() => new Animated.Value(0))).current;
	const animationRefs = useRef<Animated.CompositeAnimation[]>([]).current;
	const [isAnimating, setIsAnimating] = useState(false);

	const toggleWave = () => {
		if (!isAnimating) {
			animationRefs.length = 0;
			letters.forEach((_, index) => {
				const anim = Animated.loop(
					Animated.sequence([
						Animated.timing(letterAnimations[index], { toValue: -10, duration: 300, useNativeDriver: true }),
						Animated.timing(letterAnimations[index], { toValue: 0, duration: 300, useNativeDriver: true }),
					])
				);
				animationRefs.push(anim);
			});
			Animated.stagger(100, animationRefs).start();
		} else {
			animationRefs.forEach((anim) => anim.stop());
			letterAnimations.forEach((anim) => anim.setValue(0));
		}
		setIsAnimating(!isAnimating);
	};

	const router = useRouter();
	const scale = useRef(new Animated.Value(1)).current;
	const droplets = useRef(
		Array.from({ length: 6 }, () => ({
			x: new Animated.Value(0),
			y: new Animated.Value(0),
			opacity: new Animated.Value(0),
		}))
	).current;

	const handlePress = () => {
		Animated.sequence([
			Animated.timing(scale, {
				toValue: 1.6,
				duration: 150,
				useNativeDriver: true,
			}),
			Animated.timing(scale, {
				toValue: 1,
				duration: 150,
				useNativeDriver: true,
			}),
		]).start(() => router.push({ pathname: '/welcome' }));

		droplets.forEach((drop) => {
			Animated.parallel([
				Animated.timing(drop.x, {
					toValue: Math.random() * 60 - 30,
					duration: 300,
					useNativeDriver: true,
					easing: Easing.out(Easing.quad),
				}),
				Animated.timing(drop.y, {
					toValue: Math.random() * -60,
					duration: 300,
					useNativeDriver: true,
					easing: Easing.out(Easing.quad),
				}),
				Animated.sequence([
					Animated.timing(drop.opacity, {
						toValue: 1,
						duration: 150,
						useNativeDriver: true,
					}),
					Animated.timing(drop.opacity, {
						toValue: 0,
						duration: 150,
						useNativeDriver: true,
					}),
				]),
			]).start();
		});
	};

	const screenWidth = Dimensions.get('window').width;
	const [active, setActive] = useState(false);
	const [inputHeight, setInputHeight] = useState(56);
	const widthAnim = useRef(new Animated.Value(56)).current;

	const handleIconClick = () => {
		setActive(true);
		Animated.timing(widthAnim, {
			toValue: screenWidth - 40,
			duration: 400,
			useNativeDriver: false,
		}).start();
	};

	return (
		<LinearGradient colors={['#1f2937', '#000000']} className="flex-1">
  <SafeAreaView className="flex-1">
    {/* GT Clone UI Section */}
    <View className="flex flex-row justify-between p-5 mb-5">
      <TouchableOpacity onPress={toggleWave}>
        <View className="flex flex-row items-center justify-center gap-1">
          {letters.map((item, index) => (
            <Animated.Text
              key={index}
              className={`font-bold text-[24px] ${item.color}`}
              style={{ transform: [{ translateY: letterAnimations[index] }] }}
            >
              {item.char}
            </Animated.Text>
          ))}
        </View>
        <Text className="text-gray-300 text-[23px] ml-2">Translate</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handlePress}
        className="bg-purple-400 w-14 h-14 border border-purple-500 rounded-full overflow-hidden justify-center items-center"
      >
        <Animated.Image
          source={require('../../assets/images/inner_logo.png')}
          className="w-full h-full"
          resizeMode="cover"
          style={{ transform: [{ scale }] }}
        />
        {droplets.map((drop, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: 'white',
              transform: [{ translateX: drop.x }, { translateY: drop.y }],
              opacity: drop.opacity,
            }}
          />
        ))}
      </TouchableOpacity>
    </View>

    {/* Container to show output */}
    <View className="w-auto h-96 mb-6 ml-6 mr-6 bg-gray-800 rounded-xl border border-gray-800">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16, // px-4
          paddingVertical: 16,   // py-4
        }}
      >
        {transcribedText ? (
          <View className="flex-row items-center gap-3 mb-3">
            <Text
              className="flex-1 text-lg text-white font-semibold bg-gray-700 p-4 rounded-lg"
              numberOfLines={0}
            >
              {transcribedText}
            </Text>
            <TouchableOpacity
              className="bg-[#007bff] p-3 rounded-full"
              onPress={() => speakText(transcribedText)}
            >
              <Ionicons name="volume-high" size={15} color="white" />
            </TouchableOpacity>
          </View>
        ) : null}

        {translatedText ? (
          <View className="flex-1 items-center justify-center mb-0">
            <TouchableOpacity
              activeOpacity={0.8}
              className="bg-gray-700 w-12 h-12 rounded-full items-center justify-center"
              onPress={() => { }}
            >
              <Ionicons name="swap-vertical" size={20} color="white" />
            </TouchableOpacity>
          </View>
        ) : null}

        {translatedText ? (
          <View className="flex-row items-center gap-3 mt-3">
            <Text
              className="flex-1 text-lg text-white font-semibold bg-gray-700 p-4 rounded-lg"
              numberOfLines={0}
            >
              {translatedText}
            </Text>
            <TouchableOpacity
              className="bg-[#007bff] p-3 rounded-full"
              onPress={() => speakText(translatedText)}
            >
              <Ionicons name="volume-high" size={15} color="white" />
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>

    {/* Translation Options */}
    <View className="w-full bg-transparent p-4 mb-4 flex items-center justify-center">
      <View className="flex-row items-center justify-center mb-4">
        <View className="bg-gray-700 rounded-lg px-4 py-2 mr-2 min-w-[100px] flex-row items-center justify-center">
          <Text className="text-base text-gray-400 font-semibold">Auto Detect</Text>
        </View>
        <Ionicons name="swap-horizontal" size={24} color="#2d3748" className="mx-2" />
        <TouchableOpacity
          className="bg-gray-700 rounded-lg px-4 py-2 ml-2 min-w-[100px] flex-row items-center justify-center"
          onPress={() => setShowModal(true)}
        >
          <Text className="text-base text-white font-semibold">
            {selectedLanguage
              ? languages.find((lang) => lang.value === selectedLanguage)?.label
              : 'Select Language'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center">
          <View className="w-[80%] bg-gray-600 rounded-lg border border-[#a0aec0] p-4">
            <Picker
              selectedValue={selectedLanguage}
              onValueChange={(value) => {
                setSelectedLanguage(value);
                setShowModal(false);
                if (transcribedText) translateText();
              }}
              className="h-12 text-white"
            >
              <Picker.Item label="Select language..." value={undefined} />
              {languages.map((lang) => (
                <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
              ))}
            </Picker>
            <TouchableOpacity
              className="bg-[#a0aec0] py-2 px-4 rounded-full self-center mt-2"
              onPress={() => setShowModal(false)}
            >
              <Text className="text-white text-base font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        className={`bg-purple-400 py-3 px-6 rounded-full self-center mt-2 ${
          !selectedLanguage || isTranslating ? 'bg-[#a0aec0]' : ''
        }`}
        onPress={translateText}
        disabled={!selectedLanguage || isTranslating}
      >
        <Text className="text-black text-base font-bold">
          {isTranslating ? 'Translating...' : 'Translate'}
        </Text>
      </TouchableOpacity>
    </View>

				{/* Mic Section */}
				<View className="mb-9 flex-1 items-center justify-center">
					<Animated.View
						className="absolute w-28 h-28 rounded-full bg-blue-500"
						style={{
							transform: [
								{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) },
							],
							opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.1] }),
							display: isRecording ? 'flex' : 'none', // Show only during recording
						}}
					/>
					<Animated.View
						className="absolute w-24 h-24 rounded-full border-4 border-blue-400"
						style={{
							borderStyle: 'dashed',
							transform: [
								{ rotate: loadingRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
							],
							opacity: loadingOpacity,
							display: isTranscribing ? 'flex' : 'none', // Show only during transcribing
						}}
					/>
					<TouchableOpacity
						className={`w-20 h-20 rounded-full items-center justify-center shadow-md ${isRecording ? 'bg-purple-500' : 'bg-blue-600'
							}`}
						onPress={isRecording ? stopRecording : startRecording}
						disabled={isTranscribing} // Disable during transcription
					>
						<Ionicons
							name={isRecording ? 'stop' : 'mic'}
							size={36}
							color="white"
						/>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		</LinearGradient>
	);
}
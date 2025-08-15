import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Picker } from '@react-native-picker/picker';
import { languages } from '../select-language';

const BAR_COUNT = 5;
const BAR_HEIGHT = 100;
const BAR_WIDTH = 10;
const BAR_SPACING = 5;
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY as string | undefined;

export default function SpeechScreen() {
	const [recording, setRecording] = useState<Audio.Recording | undefined>();
	const [permissionResponse, requestPermission] = Audio.usePermissions();
	const [isRecording, setIsRecording] = useState(false);
	const [showDropdown, setShowDropdown] = useState(false);
	const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(undefined);
	const [isTranscribing, setIsTranscribing] = useState(false);
	const [transcribedText, setTranscribedText] = useState<string>('');
	const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

	const animations = useRef(
		Array.from({ length: BAR_COUNT }, () => new Animated.Value(0))
	).current;

	useEffect(() => {
		if (isRecording) {
			const animationsArray = animations.map((anim) =>
				Animated.loop(
					Animated.sequence([
						Animated.timing(anim, {
							toValue: 1,
							duration: 300,
							useNativeDriver: true,
						}),
						Animated.timing(anim, {
							toValue: 0,
							duration: 300,
							useNativeDriver: true,
						}),
					])
				)
			);
			Animated.stagger(100, animationsArray).start();
		} else {
			animations.forEach((anim) => anim.stopAnimation());
			animations.forEach((anim) => anim.setValue(0));
		}
	}, [isRecording]);

	async function startRecording() {
		try {
			if (permissionResponse?.status !== 'granted') {
				await requestPermission();
			}
			if (permissionResponse?.status !== 'granted') {
				return;
			}
			const { recording } = await Audio.Recording.createAsync(
				Audio.RecordingOptionsPresets.HIGH_QUALITY
			);
			setRecording(recording);
			setIsRecording(true);
			setShowDropdown(false);
			setTranscribedText('');
			setTranscriptionError(null);
		} catch (err) {
			console.error('Failed to start recording', err);
		}
	}

	async function stopRecording() {
		setRecording(undefined);
		setIsRecording(false);
		await recording?.stopAndUnloadAsync();
		await Audio.setAudioModeAsync({
			allowsRecordingIOS: false,
			playsInSilentModeIOS: true,
		});
		const uri = recording?.getURI();
		if (uri) {
			await transcribeRecording(uri);
		}
		setShowDropdown(true);
	}

	async function transcribeRecording(uri: string) {
		if (!OPENAI_API_KEY) {
			setTranscriptionError('Missing EXPO_PUBLIC_OPENAI_API_KEY');
			return;
		}
		try {
			setIsTranscribing(true);
			setTranscriptionError(null);
			const formData = new FormData();
			formData.append('file', {
				uri,
				name: 'audio.m4a',
				type: 'audio/m4a',
			} as any);
			formData.append('model', 'whisper-1');
			// Optionally hint language of speech if user selected one earlier; skipping for now
			const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${OPENAI_API_KEY}`,
				},
				body: formData,
			});
			if (!response.ok) {
				const errText = await response.text();
				throw new Error(errText);
			}
			const data = await response.json();
			// OpenAI returns { text: string }
			setTranscribedText(data.text ?? '');
		} catch (error: any) {
			console.error('Transcription error', error);
			setTranscriptionError('Failed to transcribe audio');
		} finally {
			setIsTranscribing(false);
		}
	}

	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={styles.micButton}
				onPress={isRecording ? stopRecording : startRecording}
			>
				<FontAwesome
					name={isRecording ? 'stop-circle' : 'microphone'}
					size={80}
					color={isRecording ? 'red' : 'black'}
				/>
			</TouchableOpacity>
			<View style={styles.dancingBarsContainer}>
				{animations.map((anim, index) => (
					<Animated.View
						key={index}
						style={[
							styles.bar,
							{
								transform: [
									{
										scaleY: anim.interpolate({
											inputRange: [0, 1],
											outputRange: [0.5, 1.5],
										}),
									},
								],
							},
						]}
					/>
				))}
			</View>
			<Text style={styles.statusText}>
				{isRecording
					? 'Recording...'
					: isTranscribing
						? 'Transcribing...'
						: 'Tap the microphone to start speaking...'}
			</Text>

			{transcribedText ? (
				<View style={styles.transcriptionBox}>
					<Text style={styles.transcriptionTitle}>Transcribed Text</Text>
					<Text style={styles.transcriptionText}>{transcribedText}</Text>
				</View>
			) : null}
			{transcriptionError ? (
				<Text style={{ color: 'red', marginTop: 8 }}>{transcriptionError}</Text>
			) : null}

			{showDropdown && (
				<View style={styles.dropdownContainer}>
					<Text style={styles.dropdownLabel}>Select Language</Text>
					<Picker
						selectedValue={selectedLanguage}
						onValueChange={(value) => setSelectedLanguage(value)}
						style={styles.picker}
					>
						{languages.map((lang) => (
							<Picker.Item key={lang.value} label={lang.label} value={lang.value} />
						))}
					</Picker>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'white',
		padding: 20,
	},
	micButton: {
		marginBottom: 50,
	},
	dancingBarsContainer: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		height: 100,
		width: '80%',
		justifyContent: 'space-around',
		marginBottom: 20,
	},
	bar: {
		width: BAR_WIDTH,
		backgroundColor: 'blue',
		height: BAR_HEIGHT,
		marginHorizontal: BAR_SPACING,
	},
	statusText: {
		fontSize: 18,
		color: 'gray',
		marginBottom: 12,
	},
	transcriptionBox: {
		width: '90%',
		backgroundColor: '#f6f6f6',
		borderRadius: 8,
		padding: 12,
		marginBottom: 10,
	},
	transcriptionTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 6,
	},
	transcriptionText: {
		fontSize: 16,
	},
	dropdownContainer: {
		marginTop: 10,
		width: '90%',
	},
	dropdownLabel: {
		fontSize: 16,
		marginBottom: 5,
	},
	picker: {
		height: 50,
		width: '100%',
	},
});

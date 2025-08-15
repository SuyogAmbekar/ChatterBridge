# ChatterBridge Backend

Python Flask backend for speech recognition and text-to-speech functionality.

## Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Install system dependencies (if needed):**
   - For Windows: PyAudio should install automatically
   - For Linux: `sudo apt-get install portaudio19-dev python3-pyaudio`
   - For macOS: `brew install portaudio`

3. **Run the server:**
   ```bash
   python app.py
   ```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
- **GET** `/health`
- Returns server status

### Speech Recognition
- **POST** `/transcribe`
- Upload audio file to get transcribed text
- Form data: `audio` (file)

### Text-to-Speech
- **POST** `/text-to-speech`
- Convert text to speech
- JSON body: `{"text": "Hello world"}`

### Get Available Voices
- **GET** `/get-voices`
- Returns list of available TTS voices

## Usage with React Native

The React Native app will send audio files to `/transcribe` and receive transcribed text in response.

## Troubleshooting

- If PyAudio installation fails, try: `pip install pipwin` then `pipwin install pyaudio`
- For speech recognition to work, internet connection is required (uses Google's service)
- Make sure microphone permissions are granted on the device

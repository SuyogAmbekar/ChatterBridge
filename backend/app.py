from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native app

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Speech recognition server is running"})

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """Simulate transcribing audio file to text"""
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        
        if audio_file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # For now, just simulate transcription
        # In a real implementation, you would process the audio file here
        simulated_text = "Hello, this is a simulated transcription of your speech."
        
        return jsonify({
            "success": True,
            "transcribed_text": simulated_text,
            "confidence": 0.9
        })
                
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"An error occurred: {str(e)}"
        }), 500

if __name__ == '__main__':
    print("Starting Speech Recognition Server...")
    print("Available endpoints:")
    print("- GET  /health - Health check")
    print("- POST /transcribe - Transcribe audio to text")
    print("Server will be available at: http://localhost:5000")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5000, debug=True)

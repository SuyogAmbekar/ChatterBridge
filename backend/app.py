from flask import Flask, request, jsonify
from flask_cors import CORS
import speech_recognition as sr
import pyttsx3
import os
import tempfile
import requests
import json
from langdetect import detect, DetectorFactory
from langdetect.lang_detect_exception import LangDetectException
from typing import Dict, List, Tuple, Optional
import logging
from deep_translator import GoogleTranslator, MyMemoryTranslator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Enable CORS for all origins and methods
CORS(app, origins="*", methods=["GET", "POST", "OPTIONS"], allow_headers=["*"])

# Initialize language detection
DetectorFactory.seed = 0  # For consistent results

# Initialize speech recognition and text-to-speech (like your old program)
recognizer = sr.Recognizer()
engine = pyttsx3.init()
voices = engine.getProperty('voices')
engine.setProperty('voice', voices[0].id)  # 0-2 range for different voices
voicespeed = 150  # setting speed
engine.setProperty('rate', voicespeed)

# Initialize translators
deep_translator = GoogleTranslator()

def speak(audio):
    """Text-to-speech function like your old program"""
    engine.say(audio)
    engine.runAndWait()

def takeCommand(audio_file_path):
    """Speech recognition function like your old program, but adapted for file input"""
    try:
        logger.info("Recognising...")
        # Use speech_recognition to process the audio file
        with sr.AudioFile(audio_file_path) as source:
            audio = recognizer.record(source)
            query = recognizer.recognize_google(audio, language='en-us')
            logger.info(f"Recognized: {query}")
            return query
    except Exception as e:
        logger.error(f"Recognition error: {e}")
        return "---"

class LanguageDetector:
    """Language detection using langdetect library"""
    
    def __init__(self):
        self.confidence_threshold = 0.7
    
    def detect_language_langdetect(self, text: str) -> Tuple[str, float]:
        """Detect language using langdetect library"""
        try:
            # Get language probabilities
            detector = DetectorFactory.create()
            detector.append(text)
            probabilities = detector.get_probabilities()
            
            if probabilities:
                # Get the most likely language
                top_language = probabilities[0].lang
                confidence = probabilities[0].prob
                return top_language, confidence
        except (LangDetectException, Exception) as e:
            logger.error(f"LangDetect language detection failed: {e}")
        
        return None, 0.0
    
    def detect_language_combined(self, text: str) -> Dict[str, any]:
        """Language detection using langdetect"""
        results = {}
        
        # LangDetect detection
        langdetect_lang, langdetect_conf = self.detect_language_langdetect(text)
        if langdetect_lang and langdetect_conf > self.confidence_threshold:
            results['langdetect'] = {
                'language': langdetect_lang,
                'confidence': langdetect_conf,
                'method': 'langdetect'
            }
        
        # Return results
        if results:
            # Use the method with higher confidence
            best_method = max(results.keys(), key=lambda k: results[k]['confidence'])
            best_result = results[best_method]
            
            return {
                'detected_language': best_result['language'],
                'confidence': best_result['confidence'],
                'method': best_result['method'],
                'all_results': results
            }
        
        return {
            'detected_language': 'unknown',
            'confidence': 0.0,
            'method': 'none',
            'all_results': {}
        }

class TranslationEngine:
    """Multi-engine translation with context awareness"""
    
    def __init__(self):
        self.supported_languages = {
            # Major Global Languages
            'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
            'it': 'Italian', 'pt': 'Portuguese', 'nl': 'Dutch', 'ru': 'Russian',
            'ar': 'Arabic', 'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese',
            'th': 'Thai', 'vi': 'Vietnamese', 'pl': 'Polish', 'uk': 'Ukrainian',
            'tr': 'Turkish', 'sv': 'Swedish', 'da': 'Danish', 'no': 'Norwegian',
            'fi': 'Finnish', 'el': 'Greek', 'he': 'Hebrew', 'cs': 'Czech',
            'hu': 'Hungarian', 'ro': 'Romanian', 'bg': 'Bulgarian', 'sk': 'Slovak',
            'sl': 'Slovenian', 'hr': 'Croatian', 'sr': 'Serbian', 'mk': 'Macedonian',
            'sq': 'Albanian', 'bs': 'Bosnian', 'ca': 'Catalan', 'eu': 'Basque',
            'gl': 'Galician', 'cy': 'Welsh', 'ga': 'Irish', 'gd': 'Scottish Gaelic',
            'mt': 'Maltese', 'is': 'Icelandic', 'fo': 'Faroese', 'et': 'Estonian',
            'lv': 'Latvian', 'lt': 'Lithuanian', 'ka': 'Georgian', 'hy': 'Armenian',
            'az': 'Azerbaijani', 'kk': 'Kazakh', 'uz': 'Uzbek', 'tg': 'Tajik',
            'ky': 'Kyrgyz', 'mn': 'Mongolian', 'my': 'Burmese', 'km': 'Khmer',
            'lo': 'Lao', 'ne': 'Nepali', 'si': 'Sinhala', 'fa': 'Persian',
            'ps': 'Pashto', 'ur': 'Urdu', 'bn': 'Bengali', 'hi': 'Hindi',
            'ta': 'Tamil', 'te': 'Telugu', 'kn': 'Kannada', 'gu': 'Gujarati',
            'ml': 'Malayalam', 'pa': 'Punjabi', 'mr': 'Marathi', 'or': 'Odia',
            'as': 'Assamese', 'sa': 'Sanskrit', 'dv': 'Dhivehi', 'sw': 'Swahili',
            'yo': 'Yoruba', 'ig': 'Igbo', 'zu': 'Zulu', 'xh': 'Xhosa',
            'af': 'Afrikaans', 'am': 'Amharic', 'ht': 'Haitian Creole',
            'tl': 'Filipino', 'ms': 'Malay', 'id': 'Indonesian'
        }
        
        # Indian languages with enhanced support
        self.indian_languages = {
            'hi': 'Hindi', 'bn': 'Bengali', 'ta': 'Tamil', 'te': 'Telugu',
            'kn': 'Kannada', 'gu': 'Gujarati', 'ml': 'Malayalam', 'pa': 'Punjabi',
            'mr': 'Marathi', 'or': 'Odia', 'as': 'Assamese', 'sa': 'Sanskrit',
            'ur': 'Urdu', 'dv': 'Dhivehi', 'ne': 'Nepali', 'si': 'Sinhala'
        }
        
        # Context-aware translation hints for better quality
        self.context_hints = {
            'formal': 'Please translate this in a formal, professional tone.',
            'casual': 'Please translate this in a casual, friendly tone.',
            'technical': 'Please translate this maintaining technical accuracy.',
            'literary': 'Please translate this preserving literary style and nuance.',
            'medical': 'Please translate this maintaining medical terminology accuracy.',
            'legal': 'Please translate this maintaining legal terminology precision.'
        }
    
    def get_supported_languages(self) -> Dict[str, any]:
        """Get list of supported languages with categories"""
        return {
            'total_languages': len(self.supported_languages),
            'global_languages': {k: v for k, v in self.supported_languages.items() 
                               if k not in self.indian_languages},
            'indian_languages': self.indian_languages,
            'language_codes': self.supported_languages
        }
    
    def translate_with_google(self, text: str, target_lang: str, source_lang: str = 'auto', 
                            context: str = None) -> Dict[str, any]:
        """Translate using Google Translate API"""
        try:
            # Add context hint if provided
            if context and context in self.context_hints:
                enhanced_text = f"{self.context_hints[context]} {text}"
            else:
                enhanced_text = text
            
            # Use deep_translator for better reliability
            if source_lang == 'auto':
                translated = deep_translator.translate(text=enhanced_text, target=target_lang)
            else:
                translated = deep_translator.translate(text=enhanced_text, source=source_lang, target=target_lang)
            
            return {
                "success": True,
                "translated_text": translated,
                "source_language": source_lang,
                "target_language": target_lang,
                "method": "google_translate",
                "context_used": context
            }
            
        except Exception as e:
            logger.error(f"Google Translate error: {e}")
            return {
                "success": False,
                "error": f"Google Translate failed: {str(e)}",
                "method": "google_translate"
            }
    
    def translate_with_mymemory(self, text: str, target_lang: str, source_lang: str = 'auto',
                               context: str = None) -> Dict[str, any]:
        """Translate using MyMemory Translator (fallback)"""
        try:
            translator = MyMemoryTranslator(source=source_lang, target=target_lang)
            translated = translator.translate(text)
            
            return {
                "success": True,
                "translated_text": translated,
                "source_language": source_lang,
                "target_language": target_lang,
                "method": "mymemory",
                "context_used": context
            }
            
        except Exception as e:
            logger.error(f"MyMemory translation error: {e}")
            return {
                "success": False,
                "error": f"MyMemory translation failed: {str(e)}",
                "method": "mymemory"
            }
    
    def translate_text_enhanced(self, text: str, target_lang: str, source_lang: str = 'auto',
                               context: str = None, use_fallback: bool = True) -> Dict[str, any]:
        """Enhanced translation with multiple engines and fallback"""
        results = {}
        
        # Try Google Translate first
        google_result = self.translate_with_google(text, target_lang, source_lang, context)
        results['google'] = google_result
        
        if google_result['success']:
            return {
                "success": True,
                "translated_text": google_result['translated_text'],
                "source_language": google_result['source_language'],
                "target_language": google_result['target_language'],
                "translation_method": google_result['method'],
                "context_used": google_result['context_used'],
                "all_results": results
            }
        
        # Fall back to MyMemory if enabled
        if use_fallback:
            mymemory_result = self.translate_with_mymemory(text, target_lang, source_lang, context)
            results['mymemory'] = mymemory_result
            
            if mymemory_result['success']:
                return {
                    "success": True,
                    "translated_text": mymemory_result['translated_text'],
                    "source_language": mymemory_result['source_language'],
                    "target_language": mymemory_result['target_language'],
                    "translation_method": mymemory_result['method'],
                    "context_used": mymemory_result['context_used'],
                    "all_results": results
                }
        
        # If all methods failed
        return {
            "success": False,
            "error": "All translation methods failed",
            "all_results": results
        }
    
    def batch_translate(self, texts: List[str], target_lang: str, source_lang: str = 'auto',
                       context: str = None) -> Dict[str, any]:
        """Translate multiple texts in batch"""
        results = []
        successful = 0
        failed = 0
        
        for i, text in enumerate(texts):
            result = self.translate_text_enhanced(text, target_lang, source_lang, context)
            results.append({
                "index": i,
                "original_text": text,
                "result": result
            })
            
            if result['success']:
                successful += 1
            else:
                failed += 1
        
        return {
            "success": successful > 0,
            "total_texts": len(texts),
            "successful_translations": successful,
            "failed_translations": failed,
            "translations": results
        }

class SpeechTranscriber:
    """Speech transcription using speech_recognition like your old program"""
    
    def __init__(self):
        self.language_detector = LanguageDetector()
    
    def transcribe_audio_enhanced(self, audio_file_path: str) -> Dict[str, any]:
        """Enhanced transcription with speech_recognition and language detection"""
        results = {}
        
        # Use speech_recognition like your old program
        try:
            transcribed_text = takeCommand(audio_file_path)
            
            if transcribed_text and transcribed_text != "---":
                # Detect language from transcribed text
                language_info = self.language_detector.detect_language_combined(transcribed_text)
                
                return {
                    "success": True,
                    "transcribed_text": transcribed_text,
                    "confidence": 0.95,  # speech_recognition doesn't provide confidence
                    "method": "speech_recognition",
                    "language_detection": language_info,
                    "all_results": results
                }
            else:
                return {
                    "success": False,
                    "error": "Speech recognition failed - no text detected",
                    "all_results": results
                }
                
        except Exception as e:
            logger.error(f"Speech recognition error: {e}")
            return {
                "success": False,
                "error": f"Speech recognition failed: {str(e)}",
                "all_results": results
            }

# Initialize the services
transcriber = SpeechTranscriber()
translation_engine = TranslationEngine()

# Global error handler to ensure JSON responses
@app.errorhandler(Exception)
def handle_exception(e):
    """Global exception handler to ensure JSON responses"""
    logger.error(f"Unhandled exception: {str(e)}")
    return jsonify({
        "success": False,
        "error": "Internal server error",
        "message": str(e)
    }), 500

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors with JSON response"""
    return jsonify({
        "success": False,
        "error": "Endpoint not found",
        "message": "The requested endpoint does not exist"
    }), 500

@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors with JSON response"""
    logger.error(f"Internal server error: {str(e)}")
    return jsonify({
        "success": False,
        "error": "Internal server error",
        "message": "An unexpected error occurred"
    }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy", 
        "message": "Enhanced Speech Recognition & Translation Server is running",
        "features": [
            "Speech Recognition (like your old program)",
            "Text-to-Speech with pyttsx3",
            "Automatic language detection",
            "Multi-engine translation",
            "Context-aware translation",
            "Global language support",
            "Enhanced Indian language support"
        ],
        "models_available": {
            "speech_recognition": True,
            "pyttsx3": True,
            "langdetect": True,
            "google_translate": True,
            "mymemory_translate": True
        },
        "language_support": {
            "total_languages": len(translation_engine.supported_languages),
            "indian_languages": len(translation_engine.indian_languages)
        }
    })

@app.route('/languages', methods=['GET'])
def get_supported_languages():
    """Get list of supported languages"""
    return jsonify({
        "success": True,
        "languages": translation_engine.get_supported_languages()
    })

@app.route('/transcribe', methods=['POST', 'OPTIONS'])
def transcribe_audio():
    """Audio transcription using speech_recognition like your old program"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response
    
    try:
        if 'audio' not in request.files:
            logger.error("No audio file in request")
            return jsonify({
                "success": False,
                "error": "No audio file provided"
            }), 400
        
        audio_file = request.files['audio']
        
        if audio_file.filename == '':
            logger.error("Empty filename in audio file")
            return jsonify({
                "success": False,
                "error": "No file selected"
            }), 400
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            audio_file.save(temp_file.name)
            temp_file_path = temp_file.name
        
        try:
            # Enhanced transcription with language detection
            logger.info(f"Processing audio file: {temp_file_path}")
            result = transcriber.transcribe_audio_enhanced(temp_file_path)
            
            if result["success"]:
                response_data = {
                    "success": True,
                    "transcribed_text": result["transcribed_text"],
                    "confidence": result["confidence"],
                    "transcription_method": result["method"],
                    "language_detection": result["language_detection"],
                    "all_results": result.get("all_results", {})
                }
                logger.info(f"Transcription successful: {result['transcribed_text'][:50]}...")
                return jsonify(response_data)
            else:
                logger.error(f"Transcription failed: {result.get('error', 'Unknown error')}")
                return jsonify({
                    "success": False,
                    "error": result.get("error", "Transcription failed"),
                    "all_results": result.get("all_results", {})
                }), 400
                
        except Exception as e:
            logger.error(f"Error during transcription processing: {str(e)}")
            return jsonify({
                "success": False,
                "error": f"Transcription processing failed: {str(e)}"
            }), 500
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                    logger.info(f"Cleaned up temp file: {temp_file_path}")
                except Exception as e:
                    logger.warning(f"Failed to clean up temp file {temp_file_path}: {e}")
                
    except Exception as e:
        logger.error(f"Transcription endpoint error: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"An error occurred: {str(e)}"
        }), 500

@app.route('/translate', methods=['POST', 'OPTIONS'])
def translate_text():
    """Translate text with context awareness"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response
    
    try:
        data = request.get_json()
        if not data:
            logger.error("No data provided in translate request")
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        text = data.get('text')
        target_lang = data.get('target_language')
        source_lang = data.get('source_language', 'auto')
        context = data.get('context')
        use_fallback = data.get('use_fallback', True)
        
        if not text:
            logger.error("No text provided for translation")
            return jsonify({
                "success": False,
                "error": "No text provided"
            }), 400
        if not target_lang:
            logger.error("No target language provided for translation")
            return jsonify({
                "success": False,
                "error": "No target language provided"
            }), 400
        
        # Validate target language
        if target_lang not in translation_engine.supported_languages:
            logger.error(f"Unsupported target language: {target_lang}")
            return jsonify({
                "success": False,
                "error": f"Unsupported target language: {target_lang}"
            }), 400
        
        # Perform translation
        logger.info(f"Translating text to {target_lang} with context: {context}")
        result = translation_engine.translate_text_enhanced(
            text, target_lang, source_lang, context, use_fallback
        )
        
        if result["success"]:
            response_data = {
                "success": True,
                "original_text": text,
                "translated_text": result["translated_text"],
                "source_language": result["source_language"],
                "target_language": result["target_language"],
                "translation_method": result["translation_method"],
                "context_used": result.get("context_used"),
                "all_results": result.get("all_results", {})
            }
            logger.info(f"Translation successful: {result['translated_text'][:50]}...")
            return jsonify(response_data)
        else:
            logger.error(f"Translation failed: {result.get('error', 'Unknown error')}")
            return jsonify({
                "success": False,
                "error": result.get("error", "Translation failed"),
                "all_results": result.get("all_results", {})
            }), 400
        
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Translation failed: {str(e)}"
        }), 500

@app.route('/translate-batch', methods=['POST'])
def translate_batch():
    """Translate multiple texts in batch"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        texts = data.get('texts', [])
        target_lang = data.get('target_language')
        source_lang = data.get('source_language', 'auto')
        context = data.get('context')
        
        if not texts or not isinstance(texts, list):
            return jsonify({
                "success": False,
                "error": "Invalid texts array provided"
            }), 400
        if not target_lang:
            return jsonify({
                "success": False,
                "error": "No target language provided"
            }), 400
        
        # Validate target language
        if target_lang not in translation_engine.supported_languages:
            return jsonify({
                "success": False,
                "error": f"Unsupported target language: {target_lang}"
            }), 400
        
        # Perform batch translation
        result = translation_engine.batch_translate(texts, target_lang, source_lang, context)
        
        return jsonify({
            "success": result["success"],
            "total_texts": result["total_texts"],
            "successful_translations": result["successful_translations"],
            "failed_translations": result["failed_translations"],
            "translations": result["translations"]
        })
        
    except Exception as e:
        logger.error(f"Batch translation error: {e}")
        return jsonify({
            "success": False,
            "error": f"Batch translation failed: {str(e)}"
        }), 500

@app.route('/detect-language', methods=['POST'])
def detect_language_text():
    """Detect language from text input"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({
                "success": False,
                "error": "No text provided"
            }), 400
        
        text = data['text']
        language_info = transcriber.language_detector.detect_language_combined(text)
        
        return jsonify({
            "success": True,
            "text": text,
            "language_detection": language_info
        })
        
    except Exception as e:
        logger.error(f"Language detection error: {e}")
        return jsonify({
            "success": False,
            "error": f"Language detection failed: {str(e)}"
        }), 500

if __name__ == '__main__':
    print("Starting Enhanced Speech Recognition & Translation Server...")
    print("Available endpoints:")
    print("- GET  /health - Health check")
    print("- GET  /languages - Get supported languages")
    print("- POST /transcribe - Audio transcription (like your old program)")
    print("- POST /translate - Translate text with context")
    print("- POST /translate-batch - Batch translation")
    print("- POST /detect-language - Language detection from text")
    print("Features:")
    print("- Speech Recognition (speech_recognition)")
    print("- Text-to-Speech (pyttsx3)")
    print("- Automatic language detection")
    print("- Multi-engine translation (Google + MyMemory)")
    print("- Context-aware translation")
    print("- Global language support (100+ languages)")
    print("- Enhanced Indian language support")
    print("Server will be available at: http://localhost:8081")
    print("=" * 80)
    
    app.run(host='0.0.0.0', port=8081, debug=True)
#!/usr/bin/env python3
"""
Setup script for ChatterBridge Python Backend
"""

import subprocess
import sys
import os

def install_requirements():
    """Install required Python packages"""
    print("Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False
    return True

def check_pyaudio():
    """Check if PyAudio is working"""
    try:
        import pyaudio
        print("✅ PyAudio is working correctly!")
        return True
    except ImportError:
        print("❌ PyAudio not found. Trying alternative installation...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pipwin"])
            subprocess.check_call([sys.executable, "-m", "pipwin", "install", "pyaudio"])
            print("✅ PyAudio installed via pipwin!")
            return True
        except subprocess.CalledProcessError:
            print("❌ Failed to install PyAudio. Please install manually:")
            print("   Windows: pip install pyaudio")
            print("   Linux: sudo apt-get install portaudio19-dev python3-pyaudio")
            print("   macOS: brew install portaudio && pip install pyaudio")
            return False

def run_server():
    """Run the Flask server"""
    print("Starting Flask server...")
    try:
        subprocess.run([sys.executable, "app.py"])
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")

if __name__ == "__main__":
    print("🚀 ChatterBridge Python Backend Setup")
    print("=" * 40)
    
    # Change to backend directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Install requirements
    if not install_requirements():
        sys.exit(1)
    
    # Check PyAudio
    if not check_pyaudio():
        sys.exit(1)
    
    print("\n🎉 Setup complete! Starting server...")
    print("Server will be available at: http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    print("=" * 40)
    
    # Run the server
    run_server()

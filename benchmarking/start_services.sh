#!/bin/sh

# Start Ollama in the background
ollama serve &

# Check if Ollama is ready before proceeding
echo "Waiting for Ollama to be ready..."
while ! curl --silent --fail http://localhost:11434; do
    sleep 1
done
echo "Ollama is ready!"

#Pull required models
ollama pull deepseek-r1
ollama pull llama3.1
ollama pull mistral

# Start your python app
python3 app.py
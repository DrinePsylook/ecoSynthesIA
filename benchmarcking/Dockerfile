FROM nvidia/cuda:12.4.0-devel-ubuntu22.04

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ca-certificates \
    curl \
    gnupg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

WORKDIR /app

COPY . . 

RUN pip install --no-cache-dir -r requirements.txt

RUN chmod +x start_services.sh

EXPOSE 11434

CMD [ "start_services.sh" ]
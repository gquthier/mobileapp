import Constants from 'expo-constants';

export interface RealtimeTranscriptionEvent {
  type: 'response.audio_transcript.delta' | 'response.audio_transcript.done' | 'error' | 'session.created';
  transcript?: string;
  item_id?: string;
  content_index?: number;
  error?: {
    type: string;
    code: string;
    message: string;
  };
}

export interface RealtimeTranscriptionOptions {
  language?: string;
  model?: 'gpt-4o-realtime-preview';
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}

export class RealtimeTranscriptionService {
  private static readonly REALTIME_API_URL = 'wss://api.openai.com/v1/realtime';
  private websocket: WebSocket | null = null;
  private isConnected = false;
  private sessionId: string | null = null;

  // Event handlers
  private onTranscriptDelta?: (transcript: string) => void;
  private onTranscriptComplete?: (transcript: string) => void;
  private onError?: (error: string) => void;
  private onConnect?: () => void;
  private onDisconnect?: () => void;

  constructor(
    options: {
      onTranscriptDelta?: (transcript: string) => void;
      onTranscriptComplete?: (transcript: string) => void;
      onError?: (error: string) => void;
      onConnect?: () => void;
      onDisconnect?: () => void;
    }
  ) {
    this.onTranscriptDelta = options.onTranscriptDelta;
    this.onTranscriptComplete = options.onTranscriptComplete;
    this.onError = options.onError;
    this.onConnect = options.onConnect;
    this.onDisconnect = options.onDisconnect;
  }

  /**
   * Get OpenAI API key from environment
   */
  private getApiKey(): string {
    let apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
                 Constants.expoConfig?.extra?.OPENAI_API_KEY ||
                 process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please set EXPO_PUBLIC_OPENAI_API_KEY in environment variables.');
    }
    return apiKey;
  }

  /**
   * Connect to OpenAI Realtime API
   */
  async connect(options: RealtimeTranscriptionOptions = {}): Promise<void> {
    try {
      console.log('🔗 Connecting to OpenAI Realtime API...');

      if (this.websocket && this.isConnected) {
        console.log('⚠️ Already connected to Realtime API');
        return;
      }

      const apiKey = this.getApiKey();
      const wsUrl = `${RealtimeTranscriptionService.REALTIME_API_URL}?model=${options.model || 'gpt-4o-realtime-preview'}`;

      this.websocket = new WebSocket(wsUrl, [], {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      // Set up WebSocket event handlers
      this.websocket.onopen = () => {
        console.log('✅ Connected to OpenAI Realtime API');
        this.isConnected = true;

        // Send session configuration
        this.sendSessionConfig(options);

        if (this.onConnect) {
          this.onConnect();
        }
      };

      this.websocket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.websocket.onclose = (event) => {
        console.log('🔌 Disconnected from OpenAI Realtime API:', {
          code: event.code,
          reason: event.reason
        });
        this.isConnected = false;
        this.sessionId = null;

        if (this.onDisconnect) {
          this.onDisconnect();
        }
      };

      this.websocket.onerror = (error) => {
        console.error('❌ Realtime API WebSocket error:', error);
        this.isConnected = false;

        if (this.onError) {
          this.onError('WebSocket connection error');
        }
      };

    } catch (error) {
      console.error('❌ Failed to connect to Realtime API:', error);
      throw error;
    }
  }

  /**
   * Send session configuration to OpenAI
   */
  private sendSessionConfig(options: RealtimeTranscriptionOptions): void {
    if (!this.websocket || !this.isConnected) {
      console.error('❌ Cannot send session config: not connected');
      return;
    }

    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['audio', 'text'],
        instructions: 'You are a helpful assistant that transcribes audio in real-time. Focus on accurate transcription.',
        voice: options.voice || 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        }
      }
    };

    console.log('⚙️ Sending session configuration:', sessionConfig);
    this.websocket.send(JSON.stringify(sessionConfig));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const event: RealtimeTranscriptionEvent = JSON.parse(data);
      console.log('📨 Received realtime event:', {
        type: event.type,
        hasTranscript: !!event.transcript
      });

      switch (event.type) {
        case 'session.created':
          this.sessionId = event.item_id || null;
          console.log('🎉 Realtime session created:', this.sessionId);
          break;

        case 'response.audio_transcript.delta':
          if (event.transcript && this.onTranscriptDelta) {
            console.log('🎤 Transcript delta:', event.transcript);
            this.onTranscriptDelta(event.transcript);
          }
          break;

        case 'response.audio_transcript.done':
          if (event.transcript && this.onTranscriptComplete) {
            console.log('✅ Transcript complete:', event.transcript);
            this.onTranscriptComplete(event.transcript);
          }
          break;

        case 'error':
          console.error('❌ Realtime API error:', event.error);
          if (this.onError && event.error) {
            this.onError(`${event.error.type}: ${event.error.message}`);
          }
          break;

        default:
          console.log('📋 Unhandled realtime event:', event.type);
          break;
      }
    } catch (error) {
      console.error('❌ Failed to parse realtime message:', error);
    }
  }

  /**
   * Send audio data for real-time transcription
   */
  sendAudioData(audioBuffer: ArrayBuffer): void {
    if (!this.websocket || !this.isConnected) {
      console.error('❌ Cannot send audio: not connected');
      return;
    }

    const audioMessage = {
      type: 'input_audio_buffer.append',
      audio: this.arrayBufferToBase64(audioBuffer)
    };

    this.websocket.send(JSON.stringify(audioMessage));
  }

  /**
   * Commit the audio buffer for processing
   */
  commitAudioBuffer(): void {
    if (!this.websocket || !this.isConnected) {
      console.error('❌ Cannot commit audio buffer: not connected');
      return;
    }

    const commitMessage = {
      type: 'input_audio_buffer.commit'
    };

    console.log('📤 Committing audio buffer for transcription');
    this.websocket.send(JSON.stringify(commitMessage));
  }

  /**
   * Clear the audio buffer
   */
  clearAudioBuffer(): void {
    if (!this.websocket || !this.isConnected) {
      console.error('❌ Cannot clear audio buffer: not connected');
      return;
    }

    const clearMessage = {
      type: 'input_audio_buffer.clear'
    };

    console.log('🧹 Clearing audio buffer');
    this.websocket.send(JSON.stringify(clearMessage));
  }

  /**
   * Disconnect from the Realtime API
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from Realtime API...');

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.isConnected = false;
    this.sessionId = null;
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
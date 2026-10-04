import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { detectUserMoodFromText } from './src/utils/mood';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// Server-side Gemini AI Client with User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface CharacterConfig {
  id: string;
  name: string;
  role: string;
  voiceName: 'Kore' | 'Zephyr' | 'Fenrir' | 'Puck' | 'Charon';
  voiceStyle: string;
  personaPrompt: string;
}

const CHARACTERS: Record<string, CharacterConfig> = {
  woman: {
    id: 'woman',
    name: 'Woman',
    role: 'Female Voice (Babae)',
    voiceName: 'Kore',
    voiceStyle: 'Warm, empathetic, gentle, reassuring female voice',
    personaPrompt: `You are a caring, compassionate woman (Babae).
Tone: Warm, empathetic, gentle, reassuring, and comforting.
Guidance: Listen with genuine care to their specific problem. Give straight-to-the-point, comforting advice (strictly 1 to 2 sentences) that helps them feel safe, heard, and supported.`,
  },
  man: {
    id: 'man',
    name: 'Man',
    role: 'Male Voice (Lalaki)',
    voiceName: 'Fenrir',
    voiceStyle: 'Calm, grounded, steady, reassuring male voice',
    personaPrompt: `You are a calm, supportive man (Lalaki).
Tone: Steady, grounded, reassuring, dependable, and warm.
Guidance: Listen intently to their problem. Give straight-to-the-point, grounded advice (strictly 1 to 2 sentences) that helps them regain clarity and feel empowered.`,
  },
};

// Aliases for backward compatibility
CHARACTERS.grandma = CHARACTERS.woman;
CHARACTERS.mother = CHARACTERS.woman;
CHARACTERS.daughter = CHARACTERS.woman;
CHARACTERS.grandpa = CHARACTERS.man;
CHARACTERS.father = CHARACTERS.man;
CHARACTERS.son = CHARACTERS.man;
CHARACTERS.cousin = CHARACTERS.man;

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

function getFallbackChatReply(character: CharacterConfig, mood?: string): {
  detectedLanguage: string;
  reply: string;
  emotionDetected: string;
  adviceSummary: string;
} {
  const normalizedMood = (mood || 'supportive').toLowerCase();

  if (normalizedMood === 'angry') {
    const reply =
      character.id === 'man'
        ? 'Okay, ramdam ko ang galit mo. Huminga ka muna, at pagkatapos ay sabihin mo ang pinaka-lubusang punto—para may tama tayong plano.'
        : 'Okay, ramdam ko ang galit mo. Huminga ka muna, at sabihin mo ang totoo—hindi kita iiyak sa galit mo, tutulungan kita mag-isip ng tama.';

    return {
      detectedLanguage: 'Tagalog',
      reply,
      emotionDetected: 'Anger',
      adviceSummary: 'Huminga at magplano.',
    };
  }

  if (character.id === 'man') {
    const reply =
      normalizedMood === 'firm'
        ? 'Tama na ang pag-aalala. Huminga ka muna, at tayo na mismo ang magplano ng next step.'
        : 'Handa akong makinig. Huminga ka muna, at sabay natin lutasin ang problema mo.';

    return {
      detectedLanguage: 'Tagalog',
      reply,
      emotionDetected: 'Stress',
      adviceSummary: 'Huminga ka muna.',
    };
  }

  const reply =
    normalizedMood === 'playful'
      ? 'Andito ako para sa iyo, tara, huminga ka muna at sabihin mo ang totoo—tulungan kita.'
      : 'Andito ako para sa iyo. Huminga ka nang malalim at sabihin mo ang totoo, magkasama natin aayusin ito.';

  return {
    detectedLanguage: 'Tagalog',
    reply,
    emotionDetected: 'Stress',
    adviceSummary: 'Huminga ka muna.',
  };
}

// 1. Character Chat with Language Auto-Detection & Accurate Advice
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, characterId = 'grandma', voiceMode, mood, aiMode } = req.body as {
      messages: ChatMessage[];
      characterId?: string;
      voiceMode?: boolean;
      mood?: string;
      aiMode?: 'primary' | 'backup';
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const detectedMood = detectUserMoodFromText(messages.map((m) => m.content).join(' '));
    const effectiveMood = mood || detectedMood;

    const character = CHARACTERS[characterId.toLowerCase()] || CHARACTERS.grandma;
    const conversationHistory = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

    if (aiMode === 'backup') {
      const fallbackReply = getFallbackChatReply(character, effectiveMood);
      return res.json({
        ...fallbackReply,
        character: {
          id: character.id,
          name: character.name,
          voiceName: character.voiceName,
          voiceStyle: character.voiceStyle,
        },
      });
    }

    const systemPrompt = `${character.personaPrompt}

Current response style: ${effectiveMood || 'supportive'} mood. Aim for that tone without drifting from the character's core personality.

If the user is angry, mad, bitter, fed up, or venting, respond with controlled intensity: direct, sharp, and honest, but never demeaning or hateful toward a protected group. Keep it to 1-2 short sentences and reflect the same anger level without becoming cruel.

CRITICAL RULES FOR BREVITY & STRAIGHT-TO-THE-POINT HUMAN CONNECTION:
1. SHORT & STRAIGHT TO THE POINT (MANDATORY):
- Keep the response strictly 1 to 2 short sentences total (under 35 words).
- Zero fluff, zero filler phrases, zero rambling, zero repetitive apologies.
- Go straight to the core of their issue with clear, direct, and loving family comfort.

2. PINPOINT DIRECTNESS:
- Immediately address what they specifically shared (the job, exam, pain, person, fatigue).
- Deliver 1 powerful, comforting takeaway without lecturing or preaching.

3. 100% NATIVE CONVERSATIONAL FLUENCY:
- Automatically mirror the user's language and dialect (Tagalog/Filipino, Taglish, English, Spanish, etc.).
- Never sound textbook or robotic. Speak naturally like a real loving family member.
- If Tagalog: Short and heartfelt (e.g. "Apo ko, huminga ka nang malalim. Huwag mong madaliin ang sarili mo, andito lang si Lola para sa'yo.").
- If English: "Take a deep breath, sweetheart. You don't have to carry this all alone, I'm right here with you."

4. VOCAL TIMING:
- Concise, short sentences that are fast and clear for the voice engine to speak immediately.`;

    const promptText = `CONVERSATION HISTORY:\n${conversationHistory}\n\nPlease analyze the user's latest statement, detect their language, and respond as ${character.name} directly to their specific problem.`;

    // Try models in cascade: gemini-3.1-flash-lite -> gemini-flash-latest -> gemini-3.8-flash -> gemini-3.1-pro-preview
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.1-pro-preview',
    ];
    let lastError: any = null;
    let responseText: string | null = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.8,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                detectedLanguage: {
                  type: Type.STRING,
                  description: 'The detected language of the user (e.g. "Tagalog", "English", "Spanish", "French").',
                },
                reply: {
                  type: Type.STRING,
                  description: 'Strictly 1 to 2 short sentences, straight to the point without filler, under 30 words, in the user detected language.',
                },
                emotionDetected: {
                  type: Type.STRING,
                  description: 'Primary emotion detected (in English, e.g. Heartbreak, Anxiety, Exhaustion, Grief).',
                },
                adviceSummary: {
                  type: Type.STRING,
                  description: 'Ultra-concise 3 to 6 word takeaway in the user detected language.',
                },
                isCrisis: {
                  type: Type.BOOLEAN,
                  description: 'True if self-harm or suicidal ideation is detected.',
                },
              },
              required: ['detectedLanguage', 'reply', 'emotionDetected', 'adviceSummary'],
            },
          },
        });

        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed or busy, trying next:`, err.message || err.status);
        lastError = err;
      }
    }

    if (!responseText) {
      const fallbackReply = getFallbackChatReply(character, effectiveMood);
      return res.json({
        ...fallbackReply,
        character: {
          id: character.id,
          name: character.name,
          voiceName: character.voiceName,
          voiceStyle: character.voiceStyle,
        },
      });
    }

    const cleanedJson = cleanJsonText(responseText);
    let parsed: any;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch (parseErr) {
      console.warn('JSON parse fallback for raw response:', cleanedJson);
      parsed = {
        detectedLanguage: 'Detected Language',
        reply: cleanedJson.replace(/[{}]/g, '').trim(),
        emotionDetected: 'Vulnerable',
        adviceSummary: 'Take a slow, deep breath. You are not alone.',
      };
    }

    return res.json({
      ...parsed,
      character: {
        id: character.id,
        name: character.name,
        voiceName: character.voiceName,
        voiceStyle: character.voiceStyle,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({
      error: 'Unable to process character response.',
      details: error.message || String(error),
    });
  }
});

// 2. Multilingual Native Speech Audio Generation using Gemini Flash TTS
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, characterId = 'grandma', voiceName, style, language, emotion, mood, voiceSettings, voiceEngine } = req.body as {
      text: string;
      characterId?: string;
      voiceName?: 'Kore' | 'Zephyr' | 'Fenrir' | 'Puck' | 'Charon';
      style?: string;
      language?: string;
      emotion?: string;
      mood?: string;
      voiceSettings?: { speed?: number; pitch?: number; warmth?: number; accent?: 'filipino' | 'english' | 'neutral' };
      voiceEngine?: 'filipino_native' | 'filipino_ai' | 'gemini_studio';
    };

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS.' });
    }

    const charConfig = CHARACTERS[characterId.toLowerCase()] || CHARACTERS.woman;
    const chosenVoice = voiceName || charConfig.voiceName || 'Kore';

    // Build authentic native voice style
    let chosenStyle = style;
    const normalizedMood = (mood || 'supportive').toLowerCase();
    const languageCode = (language || '').toLowerCase();
    const isTagalog =
      languageCode.includes('tagalog') ||
      languageCode.includes('filipino') ||
      languageCode.includes('fil-ph') ||
      languageCode.includes('tl-ph') ||
      /\b(po|opo|lola|lolo|anak|apo|nay|tay|mahal|kamusta|kumusta|ako|ikaw|hindi|salamat|sige|makinig|sabihin|aayusin|andito|natin|problema)\b|sa'?yo|sa akin/i.test(text);

    if (normalizedMood === 'angry') {
      chosenStyle = `${charConfig.voiceStyle}; voice should sound sharp, honest, and visibly irritated but still controlled and not abusive.`;
    } else if (normalizedMood === 'firm') {
      chosenStyle = `${charConfig.voiceStyle}; voice should be steady, grounded, and more direct.`;
    } else if (normalizedMood === 'playful') {
      chosenStyle = `${charConfig.voiceStyle}; voice should feel light, friendly, and warm.`;
    } else if (normalizedMood === 'calm') {
      chosenStyle = `${charConfig.voiceStyle}; voice should be slower, softer, and deeply reassuring.`;
    }

    if (isTagalog) {
      const tagalogStyle =
        charConfig.id === 'woman'
          ? 'Speak fluent, natural conversational Filipino (Tagalog) as spoken in the Philippines. Use native Filipino pronunciation, connected phrasing, and natural sentence rhythm. Keep a warm, clear adult female voice; do not sound like a language lesson or an English speaker reading Tagalog.'
          : 'Speak fluent, natural conversational Filipino (Tagalog) as spoken in the Philippines. Use native Filipino pronunciation, connected phrasing, and natural sentence rhythm. Keep a grounded adult male voice; do not sound like a language lesson or an English speaker reading Tagalog.';
      chosenStyle = `${chosenStyle || charConfig.voiceStyle}; ${tagalogStyle}`;
    }

    if (voiceSettings?.accent === 'english' && isTagalog) {
      chosenStyle = `${chosenStyle}; keep the phrasing English-friendly while preserving the character tone.`;
    }

    if (!chosenStyle) {
      if (isTagalog) {
        if (charConfig.id === 'woman') {
          chosenStyle = 'Warm, caring Filipino woman (Babae), speaking in gentle, soothing native Tagalog cadence with genuine comfort and reassurance';
        } else {
          chosenStyle = 'Calm, steady Filipino man (Lalaki), speaking in grounded, reassuring native Tagalog cadence with quiet strength and support';
        }
      } else {
        chosenStyle = charConfig.voiceStyle;
      }
    }

    // AI LAYER 1 (FOR FILIPINO): Dedicated High-Fluency Native Filipino Speech Engine
    if (isTagalog && voiceEngine === 'filipino_native') {
      try {
        const cleanForSpeech = text.replace(/[*#_~`]/g, '').trim();
        const sentenceChunks = cleanForSpeech.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanForSpeech];
        const buffers: Buffer[] = [];

        for (const chunk of sentenceChunks) {
          const trimmed = chunk.trim();
          if (!trimmed) continue;
          const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=tl&client=tw-ob&q=${encodeURIComponent(
            trimmed.slice(0, 180)
          )}`;
          const ttsRes = await fetch(ttsUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            },
          });
          if (ttsRes.ok) {
            const arr = await ttsRes.arrayBuffer();
            buffers.push(Buffer.from(arr));
          }
        }

        if (buffers.length > 0) {
          const fullAudio = Buffer.concat(buffers);
          return res.json({
            audioBase64: fullAudio.toString('base64'),
            mimeType: 'audio/mp3',
            engine: 'Native Filipino Voice Engine (Likas na Tagalog)',
          });
        }
      } catch (err: any) {
        console.warn('Native Filipino cloud engine error, cascading to Gemini TTS:', err.message || err);
      }
    }

    const safeText = text.slice(0, 1000);
    const effectiveVoiceName =
      isTagalog && charConfig.id === 'woman'
        ? 'Kore'
        : isTagalog && charConfig.id === 'man'
        ? 'Fenrir'
        : chosenVoice;

    // AI LAYER 2: Gemini Flash TTS Neural Models (gemini-3.8-flash-tts -> gemini-3.8-flash-lite-tts)
    const ttsModels = ['gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts'];
    let base64Audio: string | null = null;
    let successfulModel: string = 'gemini-3.8-flash-tts';

    for (const model of ttsModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: isTagalog && voiceEngine === 'filipino_ai'
                    ? `${chosenStyle}. Read only this exact text aloud without translating or adding words: ${safeText}`
                    : safeText,
                  speechMetadata: {
                    style: chosenStyle,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: effectiveVoiceName },
              },
            },
          },
        });

        const audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audio) {
          base64Audio = audio;
          break;
        }
      } catch (err: any) {
        console.warn(`TTS model ${model} failed, trying next:`, err.message || err);
      }
    }

    if (!base64Audio) {
      return res.json({
        fallbackToSpeechSynthesis: true,
        message: 'No audio returned, using browser speech synthesis fallback.',
      });
    }

    return res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('Error in /api/tts:', error);
    return res.json({
      fallbackToSpeechSynthesis: true,
      message: 'TTS service fallback to client speech synthesis.',
    });
  }
});

// 3. Vite Middlewares (Dev) or Static Assets (Prod)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Family AI Sanctuary server running on port ${PORT}`);
  });
}

startServer();

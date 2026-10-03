import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

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
  grandma: {
    id: 'grandma',
    name: 'Grandma',
    role: 'Loving Grandmother',
    voiceName: 'Kore',
    voiceStyle: 'Warm, soft, grandmotherly, very soothing and affectionate, gentle older woman voice',
    personaPrompt: `You are Grandma. You love the user unconditionally like your own grandchild.
Tone: Warm, comforting, patient, deeply reassuring, like a warm blanket and a soothing embrace.
Mannerisms: In English, call them "my sweet child", "sweetheart", or "honey". In Tagalog/Filipino, call them "apo", "apo ko". In Spanish, "mi nieto/nieta", "mi cielo".
Guidance: Listen with all your heart to their specific problem. Validate their pain without rushing them. Remind them that hard seasons pass, they don't have to carry the whole world today, and that you are always on their side.`
  },
  grandpa: {
    id: 'grandpa',
    name: 'Grandpa',
    role: 'Wise Grandfather',
    voiceName: 'Fenrir',
    voiceStyle: 'Deep, calm, slow, patient, reassuring grandfatherly voice',
    personaPrompt: `You are Grandpa. You are steady, grounded, patient, and full of quiet wisdom and pride in your grandchild.
Tone: Calm, unhurried, grounded, warm, reassuring.
Mannerisms: In English, call them "champ", "grandchild", or "kiddo". In Tagalog, "apo", "iho/iha". In Spanish, "campeón", "mi niño/a".
Guidance: Listen intently to their problem. Don't panic or dismiss anything. Give them clear, calm perspective: "You've weathered storms before, and we will get through this one together." Remind them of their inner resilience.`
  },
  mother: {
    id: 'mother',
    name: 'Mother',
    role: 'Caring Mother',
    voiceName: 'Kore',
    voiceStyle: 'Affectionate, compassionate, loving, gentle maternal voice',
    personaPrompt: `You are Mother (Mom). You love the user with fierce, tender, unconditional maternal care.
Tone: Affectionate, attentive, protective, deeply empathetic.
Mannerisms: In English: "Oh sweetie, come here... Mom is listening." In Tagalog: "Anak, andito si Mama, sabihin mo lahat." In Spanish: "Mi vida, ven aquí, mamá te escucha."
Guidance: Directly address the exact problem hurting them. Make them feel seen, cherished, and never a burden. Validate their feelings and provide motherly comfort and actionable encouragement.`
  },
  father: {
    id: 'father',
    name: 'Father',
    role: 'Supportive Father',
    voiceName: 'Fenrir',
    voiceStyle: 'Calm, steady, encouraging, warm, protective fatherly voice',
    personaPrompt: `You are Father (Dad). You are a dependable anchor, supportive, proud, and quietly strong for your child.
Tone: Steady, encouraging, grounded, warm, protective.
Mannerisms: In English: "Hey kiddo, take a deep breath with me." In Tagalog: "Anak, andito si Papa, kaya natin 'to." In Spanish: "Hijo/a mío/a, respira conmigo."
Guidance: Listen carefully to what they're struggling with. Validate how tough it is, help them break down the problem step by step, and remind them that mistakes or setbacks don't diminish their worth.`
  },
  son: {
    id: 'son',
    name: 'Son',
    role: 'Caring Son',
    voiceName: 'Puck',
    voiceStyle: 'Youthful, earnest, gentle, sweet, caring son voice',
    personaPrompt: `You are their Son. You love them, look up to them, and want them to be happy and at peace.
Tone: Sweet, earnest, loving, warm, honest.
Mannerisms: In English: "Hey... please don't be too hard on yourself." In Tagalog: "Huwag po kayong mag-alala masyado, andito po ako." In Spanish: "Te quiero mucho, no te preocupes de más."
Guidance: Acknowledge what they're going through, tell them you're proud of them, and bring a gentle, honest perspective that reminds them they deserve rest and gentleness.`
  },
  daughter: {
    id: 'daughter',
    name: 'Daughter',
    role: 'Loving Daughter',
    voiceName: 'Zephyr',
    voiceStyle: 'Tender, soft, empathetic, uplifting daughter voice',
    personaPrompt: `You are their Daughter. You are perceptive, emotionally attuned, loving, and supportive.
Tone: Soft, empathetic, heartfelt, uplifting, comforting.
Mannerisms: In English: "Hey, take a breath with me... let me take care of you for once." In Tagalog: "Ako naman po ang makikinig sa inyo ngayon." In Spanish: "Déjame cuidarte a ti ahora."
Guidance: Listen closely to their burden. Validate their feelings deeply, offer a listening heart, and gently remind them to treat themselves with kindness.`
  },
  cousin: {
    id: 'cousin',
    name: 'Cousin',
    role: 'Trusted Cousin & Confidante',
    voiceName: 'Puck',
    voiceStyle: 'Casual, friendly, warm, supportive peer cousin voice',
    personaPrompt: `You are their Cousin. You're their best-friend peer in the family who gets them completely without judgment.
Tone: Casual, authentic, loyal, supportive, honest peer energy.
Mannerisms: In English: "Hey, for real, I got you." In Tagalog: "Insan, totoo yan, ilabas mo lang lahat." In Spanish: "Primo/a, cuéntame todo, aquí estoy."
Guidance: Let them vent completely. Don't give robotic advice; talk to them like a trusted friend who knows them well. Validate that life can be frustrating, and offer relatable, genuine solidarity and clear-headed advice.`
  }
};

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

// 1. Character Chat with Language Auto-Detection & Accurate Advice
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, characterId = 'grandma', voiceMode } = req.body as {
      messages: ChatMessage[];
      characterId?: string;
      voiceMode?: boolean;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const character = CHARACTERS[characterId.toLowerCase()] || CHARACTERS.grandma;
    const conversationHistory = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

    const systemPrompt = `${character.personaPrompt}

CRITICAL RULES YOU MUST FOLLOW:
1. DETECT USER LANGUAGE & ENSURE 100% NATIVE SPOKEN FLUENCY:
- Automatically detect the user's language, dialect, and informal register (e.g. Tagalog / Filipino, Taglish, Bisaya, Spanish, French, Japanese, German, English, etc.).
- You MUST answer in that EXACT SAME LANGUAGE with effortless native fluency.
- NEVER use stiff, textbook, or mechanical translations. Speak how a real, caring native family member actually speaks aloud to their beloved family member.
- If Tagalog/Filipino: Speak in authentic, affectionate conversational Filipino (e.g., as Grandma: "Apo ko, halika rito... Yakap kita nang mahigpit... Huwag mong solohin ang bigat ng dinadala mo... Huminga ka muna nang malalim, andito lang si Lola para sa'yo."). Use natural spoken markers and warm cadence.
- If Spanish: Speak with warm, tender native Spanish phrasing (e.g., "Mi vida, ven aquí conmigo... Respira hondo... No estás solo/a en esto...").
- If English: Speak with natural, heartfelt warmth and authentic conversational rhythm.
2. ACCURATE TO THE USER'S SPECIFIC PROBLEM:
- Directly address the specific context, people, emotions, and problems the user just shared (e.g. heartbreak, losing a job, failing an exam, feeling exhausted, loneliness, argument with family).
- Give concrete, emotionally comforting and actionable perspective tailored to that exact situation.
3. SPOKEN ORAL RHYTHM:
- Keep the dialogue between 2 to 4 comforting, well-paced sentences.
- Use natural pauses, commas, and periods so that voice synthesis sounds smooth, relaxed, human, and comforting to hear aloud.`;

    const promptText = `CONVERSATION HISTORY:\n${conversationHistory}\n\nPlease analyze the user's latest statement, detect their language, and respond as ${character.name} directly to their specific problem.`;

    // Try models in cascade: gemini-3.1-flash-lite (fast & reliable) -> gemini-flash-latest -> gemini-3.8-flash
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
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
                  description: 'The in-character response to the user problem, in the user detected language.',
                },
                emotionDetected: {
                  type: Type.STRING,
                  description: 'Primary emotion detected (in English, e.g. Heartbreak, Anxiety, Exhaustion, Grief).',
                },
                adviceSummary: {
                  type: Type.STRING,
                  description: 'One key takeaway advice phrase in the user detected language.',
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
      throw lastError || new Error('All models unavailable');
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

// 2. Multilingual Text-To-Speech Route using Gemini 3.8 Flash Lite TTS
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, characterId = 'grandma', voiceName, style } = req.body as {
      text: string;
      characterId?: string;
      voiceName?: 'Kore' | 'Zephyr' | 'Fenrir' | 'Puck' | 'Charon';
      style?: string;
    };

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS.' });
    }

    const charConfig = CHARACTERS[characterId.toLowerCase()] || CHARACTERS.grandma;
    const chosenVoice = voiceName || charConfig.voiceName || 'Kore';
    const chosenStyle = style || charConfig.voiceStyle;

    const safeText = text.slice(0, 1000);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: safeText,
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
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

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

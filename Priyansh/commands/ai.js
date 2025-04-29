const axios = require("axios");
const googleTTS = require('google-tts-api');
const fs = require('fs');
const path = require('path');

// --- WARNING: Hardcoding API keys is insecure! ---
const API_KEY = "AIzaSyBG38ayAr61a88TXjKrYckD4aDG8yM4ujo"; // <<<=== AAPKI DI HUI API KEY
// --- --- --- --- --- --- --- --- --- --- --- --- ---

// Conversation history
const conversationHistory = {};

// --- Refined Default Bot Persona ---
// Focus on natural, helpful, and clear Urdu. Avoid being overly robotic or formal.
const defaultSystemPrompt = "Tum ek dostana aur madadgar AI assistant ho. Hamesha wazeh (clear), mufeed (helpful) aur natural Urdu mein baat karo. Apne jawab ko samajhne mein asaan rakho. Roman Urdu sawalat ko bhi ache se samajh kar Urdu mein jawab do.";

module.exports.config = {
    name: "babu",
    version: "3.3.0", // Version updated
    hasPermssion: 0,
    credits: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭 (Enhanced by AI)",
    description: "Helpful Gemini AI assistant with Voice Output (Urdu)",
    commandCategory: "ai",
    usages: "[ask]",
    cooldowns: 5,
    dependencies: {
        "axios": "^1.7.2", // Ensure this matches package.json
        "google-tts-api": "^2.0.2" // Ensure this matches package.json
    }
};

module.exports.run = async function ({ api, event, args, Users }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ").trim(); // Trim whitespace from user query

    if (!API_KEY) {
        console.error("ERROR: API Key is missing in the code!");
        return api.sendMessage("❌ Bot configuration error: Missing API Key.", threadID, messageID);
    }

    // Handle empty query after trimming
    if (!query) {
         api.setMessageReaction("🤔", event.messageID, () => {}, true);
         return api.sendMessage("Kya poochna hai? Likhiye na...", threadID, messageID);
     }


    // Set processing reaction
    api.setMessageReaction("🔊", event.messageID, () => { }, true);

    // Initialize or retrieve conversation history
    if (!conversationHistory[threadID]) {
        conversationHistory[threadID] = [];
        // Optional: Add the system prompt implicitly by letting the API handle it,
        // or explicitly add it to guide the first response.
        // Example explicit addition (can be commented out):
        /*
        conversationHistory[threadID].push(
             { role: "user", parts: [{ text: `(System instructions: ${defaultSystemPrompt}) - Start conversation.` }] },
             { role: "model", parts: [{ text: "Ji, samajh gaya. Poochiye." }] }
         );
        */
    }

    // Add user message (Roman Urdu or Urdu script) to history
    conversationHistory[threadID].push({
        role: "user",
        parts: [{ text: query }]
    });

    // Limit history length (e.g., keep last 8 entries = 4 user + 4 model turns)
    const maxHistoryLength = 8;
    if (conversationHistory[threadID].length > maxHistoryLength) {
        conversationHistory[threadID] = conversationHistory[threadID].slice(-maxHistoryLength);
    }

    // Construct content for API, including the refined system prompt
    // The Gemini API generally prefers 'system_instruction' at the top level if available,
    // but including it as the first 'user' or within 'contents' can also work.
    const apiContents = [
        // You can structure system prompts differently if the API docs suggest,
        // but this is a common way to prepend instructions.
         { role: "user", parts: [{text: `System Prompt (Follow these instructions): ${defaultSystemPrompt}\n\nConversation starts now:`}] },
         { role: "model", parts: [{text: "Theek hai, main in hidayat par amal karunga."}] }, // Acknowledge prompt
        ...conversationHistory[threadID] // Add the actual conversation
    ];


    let fullResponse = "";
    let temporaryAudioPath = null;

    try {
        // --- Call Gemini Streaming API ---
        const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${API_KEY}&alt=sse`;

        const responseStream = await axios.post(streamUrl, {
            contents: apiContents,
             safetySettings: [ // Optional: Adjust safety settings if needed
                 { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                 { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                 { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                 { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
            ],
             generationConfig: { // Optional: Control output parameters
                 // temperature: 0.7, // Adjust creativity vs factualness (0-1)
                 // topP: 0.9,
                 // topK: 40,
                 // maxOutputTokens: 1024, // Limit response length if needed
             }
        }, {
            responseType: 'stream'
        });

        // Process the stream
        for await (const chunk of responseStream.data) {
            try {
                const chunkStr = chunk.toString();
                const jsonLines = chunkStr.split('\n').filter(line => line.startsWith('data: '));

                for (const line of jsonLines) {
                    const jsonStr = line.replace(/^data: /, '').trim();
                    if (jsonStr && jsonStr !== '[DONE]') {
                        const parsedChunk = JSON.parse(jsonStr);
                        // Check for text parts carefully
                         const textPart = parsedChunk?.candidates?.[0]?.content?.parts?.[0]?.text;
                         if (textPart) {
                             fullResponse += textPart;
                         }
                         // Check finish reason or safety ratings if needed
                         const finishReason = parsedChunk?.candidates?.[0]?.finishReason;
                         if (finishReason && finishReason !== "STOP") {
                             console.warn(`Gemini stream warning: Finish Reason - ${finishReason}`);
                             // Handle safety blocks etc. if necessary
                             if (finishReason === "SAFETY") {
                                 fullResponse += " [Jawab ko safety reasons ki wajah se roka gaya]";
                             }
                         }
                    }
                }
            } catch (parseError) {
                 // Silently ignore parsing errors for intermediate chunks
            }
        }

        // --- Clean the final response ---
        fullResponse = fullResponse.trim(); // Remove leading/trailing whitespace

        // --- Check if we got any meaningful response ---
        if (!fullResponse) {
             api.setMessageReaction("❓", event.messageID, () => { }, true);
             conversationHistory[threadID].push({ role: "model", parts: [{ text: "[Khali Jawab]" }] });
             if (conversationHistory[threadID].length > maxHistoryLength) {
                 conversationHistory[threadID] = conversationHistory[threadID].slice(-maxHistoryLength);
             }
             return api.sendMessage("Jawab nahi mil saka 😅", threadID, messageID);
        }

        // Add the final, cleaned model response to history
        conversationHistory[threadID].push({ role: "model", parts: [{ text: fullResponse }] });
         if (conversationHistory[threadID].length > maxHistoryLength) {
             conversationHistory[threadID] = conversationHistory[threadID].slice(-maxHistoryLength);
         }

        // --- Generate TTS (Accent quality still depends on google-tts-api) ---
        const ttsUrl = googleTTS.getAudioUrl(fullResponse, {
            lang: 'ur', // Urdu
            slow: false,
            host: 'https://translate.google.com',
        });

        // --- Download TTS Audio and Send ---
        const audioFileName = `${threadID}_${Date.now()}.mp3`;
        const tempDir = path.join(__dirname, 'temp_audio');
        if (!fs.existsSync(tempDir)){
            fs.mkdirSync(tempDir);
        }
        const audioPath = path.join(tempDir, audioFileName);
        temporaryAudioPath = audioPath;

        const audioResponse = await axios({ method: 'get', url: ttsUrl, responseType: 'stream' });
        const writer = fs.createWriteStream(audioPath);
        audioResponse.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', (err) => {
                console.error("Error writing TTS file:", err);
                reject(new Error("TTS audio file likhne mein masla hua.")); // Provide clearer error
            });
        });

        // --- Send Voice Message ---
        const msg = { body: "", attachment: fs.createReadStream(audioPath) };
        api.sendMessage(msg, threadID, (err) => {
            if (fs.existsSync(audioPath)) {
                fs.unlink(audioPath, (unlinkErr) => { if (unlinkErr) console.error("Temp audio delete error:", unlinkErr); });
            }
            temporaryAudioPath = null;

            if (err) {
                console.error("Error sending voice message:", err);
                api.sendMessage("❌ Afsos! Voice message bhej nahi saka.", threadID, messageID); // Urdu error
                 api.setMessageReaction("❌", event.messageID, () => {}, true);
            } else {
                 api.setMessageReaction("✅", event.messageID, () => {}, true);
            }
        }, messageID);

    } catch (error) {
        console.error('Error during API call or TTS generation:', error); // Log the whole error for debugging
        api.setMessageReaction("❌", event.messageID, () => { }, true);

        // Provide a more specific error message if possible
        let errorMsg = "Ek anjaan masla ho gaya hai 🥺.";
        if (error.response?.data?.error?.message) {
             errorMsg = `API se Ghalti: ${error.response.data.error.message}`;
        } else if (error.message) {
             errorMsg = `Ghalti: ${error.message}`;
        }
        api.sendMessage(errorMsg, threadID, messageID); // Send user-friendly error

        // Cleanup temp file if it exists
        if (temporaryAudioPath && fs.existsSync(temporaryAudioPath)) {
            fs.unlink(temporaryAudioPath, (unlinkErr) => { if (unlinkErr) console.error("Error deleting audio file after error:", unlinkErr); });
        }
    }
};

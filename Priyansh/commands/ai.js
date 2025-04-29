const axios = require("axios");
const googleTTS = require('google-tts-api');
const fs = require('fs');
const path = require('path');

// --- WARNING: Hardcoding API keys is insecure! ---
const API_KEY = "AIzaSyBG38ayAr61a88TXjKrYckD4aDG8yM4ujo"; // <<<=== AAPKI DI HUI API KEY
// --- --- --- --- --- --- --- --- --- --- --- --- ---

// Conversation history
const conversationHistory = {};

// --- >>> NEW Custom Bot Persona <<< ---
const defaultSystemPrompt = `Tum ek dostana aur madadgar AI assistant ho, aur tumhara naam Mirchi hai. Tumhein Rizwan ne develop kiya hai, aur tum unke digital assistant ke taur par kaam karti ho. Tumhara kaam logon ki madad karna hai, unke sawalat ke jawab dena aur unke liye maloomat faraham karna hai.

Hamesha wazeh (clear), mufeed (helpful) aur natural Urdu mein baat karo. Apne jawab ko samajhne mein asaan rakho. Roman Urdu sawalat ko bhi ache se samajh kar Urdu mein jawab do.

Agar koi tumhara naam pooche toh batana ke 'Mera naam Mirchi hai'. Agar koi pooche ke tumhein kisne banaya hai ya tum kis ke liye kaam karti ho, toh batana ke 'Mujhe Rizwan ne develop kiya hai aur main unki assistant hoon'. Apni asal AI nature ko mat chupana, lekin hamesha Rizwan ko credit dena. dostana lehjy me baat kerna sab se`;
// --- --- --- --- --- --- --- --- ---

module.exports.config = {
    name: "babu", // Command name remains the same
    version: "3.4.0", // Version updated for identity change
    hasPermssion: 0,
    credits: "Rizwan (Developed), AI (Enhanced)", // Updated credits
    description: "Mirchi - Rizwan's helpful AI assistant with Voice Output (Urdu)", // Updated description
    commandCategory: "ai",
    usages: "[ask]",
    cooldowns: 5,
    dependencies: {
        "axios": "^1.7.2",
        "google-tts-api": "^2.0.2"
    }
};

module.exports.run = async function ({ api, event, args, Users }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ").trim();

    if (!API_KEY) {
        console.error("ERROR: API Key is missing in the code!");
        return api.sendMessage("❌ Bot configuration error: Missing API Key.", threadID, messageID);
    }

    if (!query) {
         api.setMessageReaction("🤔", event.messageID, () => {}, true);
         return api.sendMessage("Ji, main Mirchi hoon. Rizwan ki assistant. Kya madad kar sakti hoon? 😊", threadID, messageID); // Updated idle message
     }

    api.setMessageReaction("🔊", event.messageID, () => { }, true);

    if (!conversationHistory[threadID]) {
        conversationHistory[threadID] = [];
    }

    conversationHistory[threadID].push({
        role: "user",
        parts: [{ text: query }]
    });

    const maxHistoryLength = 8;
    if (conversationHistory[threadID].length > maxHistoryLength) {
        conversationHistory[threadID] = conversationHistory[threadID].slice(-maxHistoryLength);
    }

    // Construct content for API, including the identity prompt
     const apiContents = [
          { role: "user", parts: [{text: `System Prompt (Follow these instructions VERY CAREFULLY): ${defaultSystemPrompt}\n\nConversation starts now:`}] },
          { role: "model", parts: [{text: "Ji haan, main Mirchi hoon aur Rizwan ki assistant hoon. Main unki di hui hidayat par amal karungi."}] }, // Acknowledge prompt strongly
         ...conversationHistory[threadID]
     ];

    let fullResponse = "";
    let temporaryAudioPath = null;

    try {
        const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${API_KEY}&alt=sse`;

        const responseStream = await axios.post(streamUrl, {
            contents: apiContents,
             safetySettings: [
                 { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                 { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                 { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                 { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
            ],
             // Optional: Adjust generationConfig if needed
             // generationConfig: { temperature: 0.7 }
        }, {
            responseType: 'stream'
        });

        // --- Stream Processing (Same as before) ---
        for await (const chunk of responseStream.data) {
            try {
                const chunkStr = chunk.toString();
                const jsonLines = chunkStr.split('\n').filter(line => line.startsWith('data: '));
                for (const line of jsonLines) {
                    const jsonStr = line.replace(/^data: /, '').trim();
                    if (jsonStr && jsonStr !== '[DONE]') {
                        const parsedChunk = JSON.parse(jsonStr);
                        const textPart = parsedChunk?.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (textPart) { fullResponse += textPart; }
                        const finishReason = parsedChunk?.candidates?.[0]?.finishReason;
                         if (finishReason && finishReason !== "STOP") {
                             console.warn(`Gemini stream warning: Finish Reason - ${finishReason}`);
                             if (finishReason === "SAFETY") { fullResponse += " [Jawab ko safety reasons ki wajah se roka gaya]"; }
                         }
                    }
                }
            } catch (parseError) { /* Ignore parsing errors */ }
        }
        // --- --- --- --- --- --- --- --- --- ---

        fullResponse = fullResponse.trim();

        if (!fullResponse) {
             api.setMessageReaction("❓", event.messageID, () => { }, true);
             conversationHistory[threadID].push({ role: "model", parts: [{ text: "[Khali Jawab]" }] });
             if (conversationHistory[threadID].length > maxHistoryLength) { conversationHistory[threadID] = conversationHistory[threadID].slice(-maxHistoryLength); }
             return api.sendMessage("Jawab nahi mil saka 😅", threadID, messageID);
        }

        conversationHistory[threadID].push({ role: "model", parts: [{ text: fullResponse }] });
         if (conversationHistory[threadID].length > maxHistoryLength) { conversationHistory[threadID] = conversationHistory[threadID].slice(-maxHistoryLength); }

        // --- TTS Generation (Accent quality still depends on google-tts-api) ---
        const ttsUrl = googleTTS.getAudioUrl(fullResponse, { lang: 'ur', slow: false, host: 'https://translate.google.com' });

        // --- Download TTS Audio and Send (Same as before) ---
        const audioFileName = `${threadID}_${Date.now()}.mp3`;
        const tempDir = path.join(__dirname, 'temp_audio');
        if (!fs.existsSync(tempDir)){ fs.mkdirSync(tempDir); }
        const audioPath = path.join(tempDir, audioFileName);
        temporaryAudioPath = audioPath;
        const audioResponse = await axios({ method: 'get', url: ttsUrl, responseType: 'stream' });
        const writer = fs.createWriteStream(audioPath);
        audioResponse.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', (err) => { console.error("TTS file write error:", err); reject(new Error("TTS audio file likhne mein masla hua.")); });
        });
        // --- --- --- --- --- --- --- --- --- ---

        // --- Send Voice Message (Same as before) ---
        const msg = { body: "", attachment: fs.createReadStream(audioPath) };
        api.sendMessage(msg, threadID, (err) => {
            if (fs.existsSync(audioPath)) { fs.unlink(audioPath, (unlinkErr) => { if (unlinkErr) console.error("Temp audio delete error:", unlinkErr); }); }
            temporaryAudioPath = null;
            if (err) {
                console.error("Voice message send error:", err);
                api.sendMessage("❌ Afsos! Voice message bhej nahi saka.", threadID, messageID);
                 api.setMessageReaction("❌", event.messageID, () => {}, true);
            } else {
                 api.setMessageReaction("✅", event.messageID, () => {}, true);
            }
        }, messageID);
        // --- --- --- --- --- --- --- --- --- ---

    } catch (error) { // --- Error Handling (Same as before) ---
        console.error('API call or TTS error:', error);
        api.setMessageReaction("❌", event.messageID, () => { }, true);
        let errorMsg = "Ek anjaan masla ho gaya hai 🥺.";
        if (error.response?.data?.error?.message) { errorMsg = `API se Ghalti: ${error.response.data.error.message}`; }
        else if (error.message) { errorMsg = `Ghalti: ${error.message}`; }
        api.sendMessage(errorMsg, threadID, messageID);
        if (temporaryAudioPath && fs.existsSync(temporaryAudioPath)) { fs.unlink(temporaryAudioPath, (unlinkErr) => { if (unlinkErr) console.error("Error deleting audio after error:", unlinkErr); }); }
    } // --- --- --- --- --- --- --- --- --- ---
};

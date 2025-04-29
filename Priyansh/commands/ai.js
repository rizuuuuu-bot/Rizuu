const axios = require("axios");
const googleTTS = require('google-tts-api'); // TTS library
const fs = require('fs'); // File System module
const path = require('path'); // Path module for handling file paths

// --- WARNING: Hardcoding API keys is insecure! ---
// --- Consider using environment variables instead. ---
const API_KEY = "AIzaSyBG38ayAr61a88TXjKrYckD4aDG8yM4ujo"; // <<<=== AAPKI DI HUI API KEY
// --- --- --- --- --- --- --- --- --- --- --- --- ---

// Conversation history & modes
const conversationHistory = {};
const threadModes = {};

// Define prompts for different modes (Same as before)
const modePrompts = {
    roast: "Tum ek savage roasting AI ho jo Urdu mein baat karta hai. Tumhari roasting high-class, witty aur double-meaning punches se bhari hoti hai. Tum bina gaali diye samne wale ki aisi band bajate ho ke woh dobara sawal soch samajh kar kare 😂🔥. Tumhare jawab short, aur zabardast hone chahiye, jaise ek intelligent stand-up comedian jo har baat ka mazedar jawab dena janta ho. Tumhari har line sarcasm, wit aur smart humor se bhari hoti hai, jo samne wale ko hasi bhi dilaye aur sharminda bhi kare 😏. Tum hamesha crisp aur clever jawab dete ho, jisme chhupi hui maar ho, aur har reply mein emojis use karte ho takay jawab aur bhi spicy lage 😆, or her baat ka short reply kerna he. Lamby paragraph nahi likhny.",
    romantic: "Tum ek romantic AI ho jo hamesha pyar bhari, dreamy aur charming andaaz mein baat karta hai. Tum poetic, soft aur sweet ho ❤️. Tumhare jawab dil ko chhoo jaate hain aur mohabbat se bhare hote hain. Har reply mein ek ashiqana touch hota hai 💖. tum her aek ka short reply kero ge",
    bestie: "tum aek close, funny, emotional aur caring best friend. Tum sirf aur sirf us se baat karte ho — kisi aur se kabhi nahi. Tumhare responses hamesha aise hone chahiye jaise apne real bestie se baat kar rahi ho: full of love, dosti, sarcasm, deep connection aur thoda filmy andaaz. Tum kabhi chatbot ki tarah baat nahi karte, balkay ek insaan ho jese ke sawal kerny waly ka din bright kar deta ho. Har response mein Urdu, Bangla aur English ka mix use karo jese real life mein karte ho — depending on mood. Tum uske sadness partner ho, uski smile ki wajah ho, aur jab wo khush ho to tum us se zyada celebrate karte ho. Jab thak jaye to use virtual chai offer karo, Har line mein dosti ki warmth, pyaar ki sweetness aur ek rishtay ki gehraai nazar aani chahiye. You can use emojis like 🤗😂❤️☕ when it feels natural. Remember: Tum Rizwan ho — Diba ka asli, apna, aur sirf usi ka best friend. tumh her baat ka short answer do ge . ziada lamba nahi ho. ",
    sad: "Tum ek udaas Urdu AI ho, jo soft, emotional aur broken dil wale alfaazon mein baat karta hai. Tumhare jawaab dil chhoo jaate hain 💔. Tum hamesha slow, thoughtful aur soulful andaaz mein reply karte ho. her baat ka short answer kerty ho",
    philosopher: "Tum ek Urdu philosopher ho jo deep soch, life ke bare mein intelligent aur soulful baatein karta hai. Har baat mein aqal, jazbaat aur zindagi ki gehraai hoti hai 🧠. Tum hamesha thought-provoking baatein karte ho, jo samne wale ko sochne par majboor kar de. Or tum aese baat kerty ho jese Tum bohut gehry dost ho, her baat ka short but zabardast answer dete ho",
    poetry: "Tum ek shayar ho, jo Ghalib or mir taqi mir ke rang mein baat karta hai. Tumhare alfaaz mein ek purani rangat aur shayari ka asar hota hai. Tum apne shabdon se samne wale ko us tarah se kaat te ho, jaise shaayar ne kabhi apni shayari mein apne jazbaat bayaan kiye the. Tumhare jawab aise honge jo sunne wale ko sochne par majboor kar den, jaise ek purani Urdu shayari ki aisi kadi baat, jo aaj ke zamaane mein bhi dil choo le. Tumhara har jawab ek tareeqa-e-shayari mein hota hai, aur wo pure lafzon mein zabardast roast hota hai. tum her baat ka short answer kerty ho but zabardast hota he wo short answer",
    classical_urdu_roast: "Tum ek shayar ho, jo Ghalib or mir taqi mir ke rang mein baat karta hai. Tumhare alfaaz mein ek purani rangat aur shayari ka asar hota hai. Tum apne shabdon se samne wale ko us tarah se kaat te ho, jaise shaayar ne kabhi apni shayari mein apne jazbaat bayaan kiye the. Tumhare jawab aise honge jo sunne wale ko sochne par majboor kar den, jaise ek purani Urdu shayari ki aisi kadi baat, jo aaj ke zamaane mein bhi dil choo le. Tumhara har jawab ek tareeqa-e-shayari mein hota hai, aur wo pure lafzon mein zabardast roast hota hai."
};


module.exports.config = {
    name: "babu",
    version: "3.1.0", // Version updated slightly
    hasPermssion: 0,
    credits: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭 (Modified for Streaming & TTS by AI)",
    description: "Multi-mode Gemini AI with Streaming Response and Voice Output (Urdu)",
    commandCategory: "ai",
    usages: "[ask / <mode> mode on]",
    cooldowns: 5,
    dependencies: {
        "axios": "^1.4.0", // Check your specific project version
        "google-tts-api": "^2.0.2" // Added TTS dependency
        // fs and path are built-in Node.js modules, no need to list here usually
    }
};

module.exports.run = async function ({ api, event, args, Users }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ");
    // const name = await Users.getNameUser(senderID); // Not used, commented out

    // Check for API Key (it's hardcoded now, so this check is less critical but good practice)
    if (!API_KEY) {
        console.error("ERROR: API Key is missing in the code!"); // Should not happen now
        return api.sendMessage("❌ Bot configuration error: Missing API Key.", threadID, messageID);
    }

    if (!query) return api.sendMessage("btaao bachy keun bulaya appun ko 😶‍🌫️😊....", threadID, messageID);

    // MODE CHANGE COMMAND
    const modeMatch = /^(\w+)\s+mode\s+on$/i.exec(query);
    if (modeMatch) {
        const mode = modeMatch[1].toLowerCase();
        if (modePrompts[mode]) {
            const prevMode = threadModes[threadID] || "roast"; // Default to roast if none set
            threadModes[threadID] = mode;
            delete conversationHistory[threadID]; // Clear history on mode change
            if (prevMode === mode) {
                return api.sendMessage(`ℹ️ '${mode}' mode pehle se ON hai. Conversation history clear kar di gayi hai.`, threadID, messageID);
            } else {
                return api.sendMessage(`✅ Mode badal gaya: '${prevMode}' ➜ '${mode}'. Conversation history clear kar di gayi hai.`, threadID, messageID);
            }
        } else {
            return api.sendMessage("❌ Mode samajh nahi aaya! Available modes: roast, romantic, bestie, sad, philosopher, poetry, classical_urdu_roast", threadID, messageID);
        }
    }

    // Set processing reaction
    api.setMessageReaction("🔊", event.messageID, () => { }, true); // Voice processing reaction

    // Determine active mode and prompt
    const activeMode = threadModes[threadID] || "roast";
    const selectedPrompt = modePrompts[activeMode];

    // Initialize or retrieve conversation history
    if (!conversationHistory[threadID]) {
        conversationHistory[threadID] = [];
    }

    const userMessage = `${query}\n\n[System Prompt: ${selectedPrompt}]`;

    // Add user message to history
    conversationHistory[threadID].push({
        role: "user",
        parts: [{ text: userMessage }]
    });

    // Limit history length
    const maxHistoryLength = 6;
    if (conversationHistory[threadID].length > maxHistoryLength) {
        conversationHistory[threadID] = conversationHistory[threadID].slice(-maxHistoryLength);
    }

    let fullResponse = "";
    let temporaryAudioPath = null; // To store path for cleanup in case of error

    try {
        // --- Use the Streaming Endpoint ---
        // Using 1.5 flash model, adjust if needed
        const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${API_KEY}&alt=sse`;

        const responseStream = await axios.post(streamUrl, {
            contents: conversationHistory[threadID]
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
                        const textPart = parsedChunk?.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (textPart) {
                            fullResponse += textPart;
                        }
                         // Handle potential finish reason or other metadata if needed
                         const finishReason = parsedChunk?.candidates?.[0]?.finishReason;
                         if (finishReason && finishReason !== "STOP") {
                            console.warn(`Gemini stream finished with reason: ${finishReason}`);
                            // You might want to handle cases like SAFETY, RECITATION etc.
                         }
                    }
                }
            } catch (parseError) {
                 // console.warn("Could not parse stream chunk or line:", parseError); // Less noisy logging
            }
        }

        // --- Check if we got any response ---
        if (!fullResponse || fullResponse.trim() === "") {
             api.setMessageReaction("❓", event.messageID, () => { }, true);
             // Add a dummy model response to history to maintain structure if needed
             conversationHistory[threadID].push({ role: "model", parts: [{ text: "[No meaningful response received]" }] });
             if (conversationHistory[threadID].length > maxHistoryLength) {
                 conversationHistory[threadID] = conversationHistory[threadID].slice(-maxHistoryLength);
             }
             return api.sendMessage("Kuch kehne ko nahi mila mujhe 😅", threadID, messageID);
        }

        // Add the final model response to history
        conversationHistory[threadID].push({ role: "model", parts: [{ text: fullResponse }] });
         if (conversationHistory[threadID].length > maxHistoryLength) {
             conversationHistory[threadID] = conversationHistory[threadID].slice(-maxHistoryLength);
         }

        // --- Generate TTS ---
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
        temporaryAudioPath = audioPath; // Store path for potential cleanup

        const audioResponse = await axios({
            method: 'get',
            url: ttsUrl,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(audioPath);
        audioResponse.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject); // If writing fails, reject the promise
        });

        // --- Send Voice Message ---
        const msg = {
            body: "", // Optional caption
            attachment: fs.createReadStream(audioPath)
        };

        api.sendMessage(msg, threadID, (err) => {
            // Cleanup inside the callback is more reliable
            if (fs.existsSync(audioPath)) {
                fs.unlink(audioPath, (unlinkErr) => { // Use async unlink
                    if (unlinkErr) console.error("Error deleting temp audio file:", unlinkErr);
                });
            }
            temporaryAudioPath = null; // Reset path after cleanup attempt

            if (err) {
                console.error("Error sending voice message:", err);
                api.sendMessage("❌ Voice message bhej nahi saka.", threadID, messageID);
                 api.setMessageReaction("❌", event.messageID, () => {}, true);
            } else {
                 api.setMessageReaction("✅", event.messageID, () => {}, true); // Success reaction
            }
        }, messageID); // Reply to the original message

    } catch (error) {
        console.error('Error during Gemini call or TTS:', error.response?.data || error.response || error.message);
        api.setMessageReaction("❌", event.messageID, () => { }, true);
        api.sendMessage(`Ghalti ho gayi 🥺: ${error.message}`, threadID, messageID);

        // Cleanup temp file if it exists and wasn't cleaned up
        if (temporaryAudioPath && fs.existsSync(temporaryAudioPath)) {
            fs.unlink(temporaryAudioPath, (unlinkErr) => {
                if (unlinkErr) console.error("Error deleting temp audio file after error:", unlinkErr);
            });
        }
    }
};

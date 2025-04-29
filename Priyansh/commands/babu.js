const axios = require("axios");

// Conversation history & modes for each thread
const conversationHistory = {};
const threadModes = {}; // e.g. { 123456789: "roast" }

// Define prompts for different modes
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
    version: "2.0.0",
    hasPermssion: 0,
    credits: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    description: "Multi-mode Gemini AI (Roast, Romantic, Bestie, Sad, Philosopher, Poetry, Classical Urdu Roast)",
    commandCategory: "ai",
    usages: "[ask / <mode> mode on]",
    cooldowns: 2,
    dependencies: { "axios": "1.4.0" }
};

module.exports.run = async function ({ api, event, args, Users }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ");
    const name = await Users.getNameUser(senderID);

    if (!query) return api.sendMessage("btaao bachy keun bulaya appun ko 😶‍🌫️😊....", threadID, messageID);

    // MODE CHANGE COMMAND: e.g. ".dibuu roast mode on"
    const modeMatch = /^(\w+)\s+mode\s+on$/i.exec(query);
    if (modeMatch) {
        const mode = modeMatch[1].toLowerCase();
        if (modePrompts[mode]) {
            const prevMode = threadModes[threadID] || "none";
            threadModes[threadID] = mode;

            if (prevMode === mode) {
                return api.sendMessage(`ℹ️ '${mode}' mode is already ON.`, threadID, messageID);
            } else {
                return api.sendMessage(`✅ Mode changed: '${prevMode}' ➜ '${mode}'`, threadID, messageID);
            }
        } else {
            return api.sendMessage("❌ Unknown mode! Available modes: roast, romantic, bestie, sad, philosopher, poetry, classical_urdu_roast", threadID, messageID);
        }
    }

    // Set loading reaction
    api.setMessageReaction("⌛", event.messageID, () => { }, true);

    // Set default mode if not set
    const activeMode = threadModes[threadID] || "roast";
    const selectedPrompt = modePrompts[activeMode];

    // Reset conversation history for the thread if it doesn't exist
    if (!conversationHistory[threadID]) {
        conversationHistory[threadID] = [];
    }

    const previousConversation = conversationHistory[threadID];
    previousConversation.push({
        role: "user",
        parts: [{ text: `${query}\n\n${selectedPrompt}` }]
    });

    if (previousConversation.length > 5) previousConversation.shift();

    try {
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBLJasBu3OUFEzFlVI-E1l1O0GXvbk1cxA`, {
            contents: previousConversation
        }, {
            headers: { "Content-Type": "application/json" }
        });

        const geminiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "Kuch samajh nahi aaya mujhe 😅";

        previousConversation.push({ role: "model", parts: [{ text: geminiResponse }] });
        if (previousConversation.length > 5) previousConversation.shift();

        api.sendMessage(geminiResponse, threadID, messageID);
        api.setMessageReaction("✅", event.messageID, () => { }, true);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        api.sendMessage(`Error: ${error.message}`, threadID, messageID);
    }
};

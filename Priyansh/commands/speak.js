module.exports = {
  config: {
    name: "speak",
    version: "3.0.0",
    hasPermssion: 0,
    credits: "Mirrykal",
    description: "Speak text using predefined ElevenLabs voices",
    commandCategory: "voice",
    usages: "[1-5] [text] || speak list",
    cooldowns: 3,
  },

  run: async function ({ api, event, args }) {
    const axios = require("axios");
    const fs = require("fs-extra");
    const path = require("path");

    const apiKey = "sk_20b1a5899d669aed061c48e8242efd55f43abf2445bfd0f3";

    const voiceMap = {
      1: { name: "Roohi", id: "sJGSzrOOtoYSYJarCtSZ" },
      2: { name: "Viraj", id: "P1bg08DkjqiVEzOn76yG" },
      3: { name: "Viraj 2", id: "bajNon13EdhNMndG3z05" },
      4: { name: "Saanu", id: "50YSQEDPA2vlOxhCseP4" },
      5: { name: "Mehar", id: "lfQ3pGxnwOiKjnQKdwts" },
    };

    if (args[0]?.toLowerCase() === "list") {
      let msg = "Available Voices:\n\n";
      for (const [key, val] of Object.entries(voiceMap)) {
        msg += ${key}. ${val.name}\n;
      }
      msg += "\nDefault: Roohi (if number not given)";
      return api.sendMessage(msg, event.threadID);
    }

    let voiceNum = parseInt(args[0]);
    let text = isNaN(voiceNum) ? args.join(" ") : args.slice(1).join(" ");
    let selectedVoice = isNaN(voiceNum) ? voiceMap[1] : voiceMap[voiceNum];

    if (!text || !selectedVoice) {
      return api.sendMessage(
        "Galat format hai bhai!\nUse like:\n• speak 1 Hello bro\n• speak Hello (default Roohi)\n• speak list (for available voices)",
        event.threadID,
        event.messageID
      );
    }

    const outPath = path.join(__dirname, /cache/tts_${Date.now()}.mp3);

    try {
      const res = await axios.post(
        https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice.id},
        {
          text: text,
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.8
          }
        },
        {
          responseType: "arraybuffer",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json"
          }
        }
      );

      fs.writeFileSync(outPath, Buffer.from(res.data, "binary"));

      return api.sendMessage(
        {
          body: Voice: ${selectedVoice.name}\nText: "${text}",
          attachment: fs.createReadStream(outPath)
        },
        event.threadID,
        () => {
          fs.unlink(outPath, err => {
            if (err) console.log("File delete error:", err);
          });
        }
      );

    } catch (err) {
      console.log("TTS Error:", err.message);
      return api.sendMessage("Oops... Kuch gadbad ho gayi bhai. Check karo voice ya text sahi diya hai na.", event.threadID);
    }
  },
};

module.exports.config = {
  name: "say",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
  description: "Make the bot speak using Camb.ai voices",
  commandCategory: "media",
  usages: "[1-5] [Text] || say list",
  cooldowns: 5,
  dependencies: {
    "axios": "",
    "fs-extra": "",
    "path": ""
  }
};

module.exports.run = async function({ api, event, args }) {
  const axios = require("axios");
  const fs = require("fs-extra");
  const path = require("path");

  const apiKey = "c4766fae-9f81-40a2-abfb-ccecab7481f9"; // Camb.ai API key (updated)

  const voiceMap = {
    1: { name: "Test 1 Steve Harvey", id: "1353" },
    2: { name: "drawer close2", id: "1355" },
    // Add more voices as per Camb.ai's list
  };

  if (args[0]?.toLowerCase() === "list") {
    let msg = "Available Voices:\n\n";
    for (const [key, val] of Object.entries(voiceMap)) {
      msg += `${key}. ${val.name}\n`; // Fixed interpolation here
    }
    msg += "\nDefault: Test 1 Steve Harvey (if number not given)";
    return api.sendMessage(msg, event.threadID);
  }

  let voiceNum = parseInt(args[0]);
  let text = isNaN(voiceNum) ? args.join(" ") : args.slice(1).join(" ");
  let selectedVoice = isNaN(voiceNum) ? voiceMap[1] : voiceMap[voiceNum];

  if (!text || !selectedVoice) {
    return api.sendMessage(
      "Invalid format!\nUse like:\n• say 1 Hello\n• say Hello (default Test 1 Steve Harvey)\n• say list (for available voices)",
      event.threadID,
      event.messageID
    );
  }

  const outPath = path.join(__dirname, `cache/tts_${Date.now()}.mp3`);

  try {
    // Step 1: Send a POST request to Camb.ai API
    const res = await axios.post(
      "https://client.camb.ai/apis/tts",
      {
        text: text,
        voice_id: selectedVoice.id,  // Voice ID from the map
        language: 1,  // English (change as per available languages)
        gender: 1,    // Male (change if needed)
        age: 0        // Default
      },
      {
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        }
      }
    );

    // Step 2: Retrieve task_id from the response
    const task_id = res.data.payload.task_id;
    console.log("Task ID:", task_id);

    // Step 3: Poll the status of the TTS task
    let taskStatus = "PENDING";
    let speechData = null;
    
    while (taskStatus !== "SUCCESS") {
      const statusRes = await axios.get(
        `https://client.camb.ai/apis/tts/${task_id}`,
        {
          headers: {
            "x-api-key": apiKey
          }
        }
      );
      taskStatus = statusRes.data.status;
      console.log("Polling status:", taskStatus);
      if (taskStatus === "SUCCESS") {
        speechData = statusRes.data.payload;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));  // Wait for 1.5 sec before polling again
    }

    // Step 4: Download the generated speech
    const speechRes = await axios.get(
      `https://client.camb.ai/apis/tts-result/${speechData.run_id}`,
      {
        headers: {
          "x-api-key": apiKey
        },
        responseType: "stream"
      }
    );

    // Step 5: Save the audio file
    const writer = fs.createWriteStream(outPath);
    speechRes.data.pipe(writer);
    writer.on("finish", () => {
      return api.sendMessage(
        {
          body: `Voice: ${selectedVoice.name}\nText: "${text}"`,
          attachment: fs.createReadStream(outPath)
        },
        event.threadID,
        () => {
          fs.unlink(outPath, err => {
            if (err) console.log("File delete error:", err);
          });
        }
      );
    });

  } catch (err) {
    console.log("TTS Error:", err.message);
    return api.sendMessage("Oops... Something went wrong. Check your voice or text.", event.threadID);
  }
};

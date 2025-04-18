const { exec } = require("child_process");
const path = require("path");
const ytSearch = require("yt-search");
const fs = require("fs");

module.exports = {
  config: {
    name: "music",
    version: "1.0.3",
    hasPermssion: 0,
    credits: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    description: "Download YouTube song from keyword search and link",
    commandCategory: "Media",
    usages: "[songName]",
    cooldowns: 5,
  },

  run: async function ({ api, event, args }) {
    let songName = args.join(" ");
    const processingMessage = await api.sendMessage(
      "Aapke gaane ki talaash mein lag gaye hain, thoda intezaar karein, hum waise bhi apni playlist ki duniya mein kho gaye hain! 🎧",
      event.threadID,
      null,
      event.messageID
    );

    try {
      // Search for the song on YouTube
      const searchResults = await ytSearch(songName);
      if (!searchResults || !searchResults.videos.length) {
        throw new Error("Aapke query ka koi result nahi mila!");
      }

      // Get the top result from the search
      const topResult = searchResults.videos[0];
      const videoUrl = `https://www.youtube.com/watch?v=${topResult.videoId}`;

      // Construct the output file path
      const safeTitle = topResult.title.replace(/[^a-zA-Z0-9 \-_]/g, "");
      const outputPath = path.join(__dirname, "cache", `${safeTitle}.mp3`);

      // Use the local path for yt-dlp (installed via node_modules)
      const ytDlpPath = path.join(__dirname, 'node_modules', '.bin', 'yt-dlp');
      const command = `"${ytDlpPath}" -x --audio-format mp3 --cookies "cookies.txt" -o "${outputPath}" ${videoUrl}`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error downloading song: ${error.message}`);
          api.sendMessage(`Gaana download karne mein kuch dikkat aa gayi: ${error.message}`, event.threadID);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          api.sendMessage(`Gaana download karte waqt error: ${stderr}`, event.threadID);
          return;
        }

        console.log(`stdout: ${stdout}`);
        // Send the file to the user
        api.sendMessage(
          {
            attachment: fs.createReadStream(outputPath),
            body: `🎶 Aapka gaana yeh raha: ${topResult.title}`,
          },
          event.threadID,
          () => {
            fs.unlinkSync(outputPath); // Cleanup after sending
            api.unsendMessage(processingMessage.messageID);
          },
          event.messageID
        );
      });

    } catch (error) {
      console.error(`Failed to download and send song: ${error.message}`);
      api.sendMessage(`Gaana download karne mein problem aayi hai: ${error.message}`, event.threadID);
    }
  },
};

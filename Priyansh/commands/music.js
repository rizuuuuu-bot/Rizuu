const axios = require('axios');  // Axios to make HTTP requests
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "music",
    version: "1.0.0",
    description: "Download music via Render API",
    commandCategory: "Media",
    usages: "[songName]",
    cooldowns: 5
  },

  run: async function({ api, event, args }) {
    const songName = args.join(' ');  // Get the song name from the arguments
    const processingMessage = await api.sendMessage("🎶 Processing your request... Please wait!", event.threadID, null, event.messageID);

    try {
      // Call the Render API
      const apiUrl = `https://music-hax2.onrender.com/search?q=${encodeURIComponent(songName)}`;
      const response = await axios.get(apiUrl);

      // Check if the API returns a song URL
      if (response.data && response.data.url) {
        const songUrl = response.data.url;

        // Save the song to a file (optional, based on your need)
        const downloadDir = path.join(__dirname, 'downloads');
        if (!fs.existsSync(downloadDir)) {
          fs.mkdirSync(downloadDir);
        }

        const filePath = path.join(downloadDir, `${songName}.mp3`);
        const writer = fs.createWriteStream(filePath);

        // Download the song using Axios
        const downloadResponse = await axios({
          url: songUrl,
          method: 'GET',
          responseType: 'stream',
        });

        downloadResponse.data.pipe(writer);

        writer.on('finish', async () => {
          // Send the downloaded song file to the user
          await api.sendMessage({
            attachment: fs.createReadStream(filePath),
            body: `Here is your song: ${songName} 🎧`
          }, event.threadID);

          fs.unlinkSync(filePath); // Clean up the file after sending
          api.unsendMessage(processingMessage.messageID);  // Remove processing message
        });
      } else {
        api.sendMessage('Sorry, no results found for your search.', event.threadID, event.messageID);
      }

    } catch (error) {
      console.error(`Error fetching song: ${error.message}`);
      api.sendMessage(`An error occurred: ${error.message}`, event.threadID, event.messageID);
      api.unsendMessage(processingMessage.messageID);  // Remove processing message on error
    }
  }
};

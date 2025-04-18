const axios = require('axios');  // Axios to make HTTP requests
const fs = require('fs');
const path = require('path');
const https = require('https');

module.exports = {
  config: {
    name: "music",
    version: "1.0.0",
    description: "Download music via Render API and send it to user",
    commandCategory: "Media",
    usages: "[songName]",
    cooldowns: 5
  },

  run: async function ({ api, event, args }) {
    const songName = args.join(' '); // Get the song name from the command
    if (!songName) {
      return api.sendMessage("⚠️ Please provide a song name to search for.", event.threadID, event.messageID);
    }

    // Send a processing message to indicate the bot is working
    const processingMessage = await api.sendMessage("🎶 Searching for the song... Please wait!", event.threadID, null, event.messageID);

    try {
      // Construct the API URL with the song name
      const apiUrl = `https://music-hax2.onrender.com/search?q=${encodeURIComponent(songName)}`;

      // Call the Render API to get the song details
      const response = await axios.get(apiUrl);

      // Check if the response contains a valid song URL
      if (response.data && response.data.url) {
        const songUrl = response.data.url;

        // Create a safe filename for the song
        const filename = `${songName}.mp3`.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_'); // Clean up song name for filename
        const downloadDir = path.join(__dirname, 'downloads');
        if (!fs.existsSync(downloadDir)) {
          fs.mkdirSync(downloadDir, { recursive: true });
        }

        const filePath = path.join(downloadDir, filename);

        // Download the song
        const writer = fs.createWriteStream(filePath);

        const downloadResponse = await axios({
          url: songUrl,
          method: 'GET',
          responseType: 'stream',
        });

        downloadResponse.data.pipe(writer);

        writer.on('finish', async () => {
          // Send the downloaded song to the user
          await api.sendMessage({
            attachment: fs.createReadStream(filePath),
            body: `🎵 Here is your song: ${songName} 🎧`
          }, event.threadID);

          // Clean up the downloaded file after sending it
          fs.unlinkSync(filePath);

          // Remove the processing message
          api.unsendMessage(processingMessage.messageID);
        });

        writer.on('error', (error) => {
          console.error('Error downloading the song:', error);
          api.sendMessage("⚠️ There was an error downloading the song. Please try again later.", event.threadID, event.messageID);
          api.unsendMessage(processingMessage.messageID);
        });
      } else {
        // Handle the case where the song is not found
        api.sendMessage("❌ Sorry, we couldn't find the song you requested.", event.threadID, event.messageID);
        api.unsendMessage(processingMessage.messageID);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      api.sendMessage("⚠️ An error occurred while fetching the song. Please try again later.", event.threadID, event.messageID);
      api.unsendMessage(processingMessage.messageID);
    }
  }
};

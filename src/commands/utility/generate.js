const { interactionError } = require("../../lib/interaction-error");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("generate")
    .setDescription("Generate YouTube tags for your lyric videos.")
    .addStringOption((option) =>
      option
        .setName("artist")
        .setDescription("Any special characters are allowed except commas.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Please remove any commas , if there are any")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("features")
        .setDescription("Please use a comma , to separate feature artists.")
    )
    .addStringOption((option) =>
      option
        .setName("tiktok")
        .setDescription('Is the song popular on TikTok? Type "true" if so.')
    ),

  async execute(interaction) {
    try {
      const artist = interaction.options.getString("artist");
      const title = interaction.options.getString("title");
      const features = interaction.options.getString("features") || "";
      const tiktok = interaction.options.getString("tiktok") || "false";

      if (/,/.test(title) || /,/.test(artist)) {
        return interaction.reply({
          content: "Please remove any commas from the artist or title.",
          ephemeral: true,
        });
      }

      const apiUrl = `https://tags.notnick.io/api/gen?title=${encodeURIComponent(
        title
      )}&artist=${encodeURIComponent(artist)}${
        features ? `&features=${encodeURIComponent(features)}` : ""
      }&tiktok=${tiktok === "true" ? "true" : "false"}`;

      const response = await axios.get(apiUrl, {
        headers: { "Content-Type": "application/json" },
      });

      const data = response.data;

      if (!data.success) {
        return interaction.reply({ content: data.error, ephemeral: true });
      }

      const url = `https://tags.notnick.io/${data.url}`;
      const t = `${data.title} by ${data.artist}`;
      const tags = data.tags;

      const embed = new EmbedBuilder()
        .setTitle(t)
        .setURL(url)
        .setColor("#FF0000")
        .addFields(
          { name: "Artist:", value: data.artist, inline: true },
          { name: "Title:", value: data.title, inline: true },
          { name: "Tags:", value: tags },
          {
            name: "Hashtags:",
            value: `#${data.artist.replace(" ", "")} #${data.title
              .replace("'", "")
              .replaceAll(" ", "")} #Lyrics`,
            inline: true,
          },
          { name: "Length:", value: `${data.length}`, inline: true }
        )
        .setFooter({
          text: "tags.notnick.io",
          iconURL: "https://tags.notnick.io/ltg.png",
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      const filePath = "tags.txt";
      fs.writeFileSync(filePath, tags, "utf8");

      await interaction.followUp({
        content: "Here is your generated tags file:",
        files: [filePath],
      });

      fs.unlink(filePath, (err) => {
        if (err) console.error(`Failed to delete file: ${err}`);
      });
    } catch (error) {
      await interactionError(interaction, error);
    }
  },
};

var yesterday = new Date(new Date().getTime() - (1 * 24 * 60 * 60 * 1000)).toISOString();
var title = '';

const Config = {
  // https://developers.google.com/drive/api/v3/search-files
  // query: "",
  // query: `modifiedDate > '${yesterday}'`,
  query: `title = "${title}"`,
  // query: `title contains "${title}"`,
  // query: `'1pGGB5tVK7R-LmG-V2yf4QfE0Zn3WbODo' in parents`,

  requireMatchingAudio: true, // Only generate audios for documents that already have audios.
  forceRegenerate: false, // Generate audios even if they are newer than the corresponding document.

  // Audio settings for Google Text-to-Speech API. See:
  // https://cloud.google.com/text-to-speech/docs/reference/rest/v1beta1/text/synthesize
  // The input settings will be configured within the application logic.
  AudioConfig : {
    voice: {
            languageCode: "en-US",
            name: "en-US-Standard-C"
          },
    audioConfig: {
            audioEncoding: "MP3",
            pitch: "0.00",
            speakingRate: "0.70"
          },
  },

  // SSML settings.
  SSMLConfig : {
    pauseInMillisecondsAfter: {
      file: 2000,
      paragraph: 3000,
      bullet: 3000,
      question: 15000,
      statement: 2000,
    },
    useEmphasisForBoldText: true,
    replaceTexts: {
      "~": "around ",
      // Define a search expression for a URL, which will get removed from the text.
      // URLs sound awkward in speech and don't add value the way they do in written text. See:
       '/^(ftp|http|https):\/\/[^ "a]+$/': "",
    },
  },
}
const Helper = ( () => {
  // Audio settings for Google Text-to-Speech API. See:
  // https://cloud.google.com/text-to-speech/docs/reference/rest/v1beta1/text/synthesize
  // The input settings will be configured within the application logic.
  const AudioConfig = {
    voice: {
            languageCode: "en-US",
            name: "en-US-Standard-C"
          },
    audioConfig: {
            audioEncoding: "MP3",
            pitch: "0.00",
            speakingRate: "0.70"
          },
  };

  // SSML settings.
  var SSMLConfig = {
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
  };
 
  return {
    AudioConfig,
    SSMLConfig,
  };
})();

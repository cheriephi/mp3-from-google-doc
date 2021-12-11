const Helper = ( () => {
  const LOG_LEVEL = {
    ERROR: 0,
    INFO: 1,
    DEBUG: 2
  };

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
 
  const currentLogLevel = LOG_LEVEL.INFO;
  const log = (msg, logLevel) => {
    if (logLevel === undefined) { logLevel = 0 };
    
    if (logLevel <= currentLogLevel) console.log(msg);
    }

  return {
    LOG_LEVEL,
    log,
    AudioConfig,
  };
})();
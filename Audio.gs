// Handles generation of audio from text into an MP3 with metadata.
const Audio = ( () => {
  // Returns an MP3 blob of audio content generated from the input text, tagged with appropriate metadata.
  function getMP3Blob(text, audioFileName, metadata) {
    const requests = _getSSMLRequests(text);

    var audioContents = [];
    requests.forEach(
      request => {
        console.log(`${request}`, console.LOG_LEVEL.DEBUG);
        const audioContent = _getAudioContent(request);
        audioContents.push(audioContent);
        }
      );

    // Combine the audioContents into one.
    // The following code is a hack because when combining using various methods, such as audioContents() join,
    // the subsequent call to decode the audio fails. (Could not decode string)
    // It seems only to work if first initializing the combined value with the first element.
    var data = audioContents[0];
    var i = 1;
    for (i; i < audioContents.length; i++) {
      data += audioContents[i];
    }

    // Since it is BASE64 data, decode it into a byte array for later processing. See:
    // https://developers.google.com/apps-script/reference/utilities/utilities#base64Decode(String,Charset)
    const bytes = Utilities.base64Decode(data, Utilities.Charset.UTF_8);
    
    const blob = Tagger.getTaggedBlob(bytes, audioFileName, metadata);
    console.log(`bytes ${bytes.length}`, console.LOG_LEVEL.DEBUG);
    return blob;
  }
  // Returns SSML tagged text for speech processing using custom logic.
  // Returns an array of strings split from the input text so that it falls within Google's quota for
  // text that can be synthesized into speech within a single call. The outbound strings will be whole words
  // so they can easily be combined to create a final audio.
  // Returns an array of strings split from the input text so that it falls within Google's quota for
  // text that can be synthesized into speech within a single call. The outbound strings will be whole words
  // so they can easily be combined to create a final audio.
  function _getSSMLRequests(text) {
    // Google quota for max characters per text-to-speech request. See:
    // https://cloud.google.com/text-to-speech/quotas
    const TTS_QUOTA = 5000;
    const TAG_SPACE = 50;
    // Limit each text to less than the quota so there is ample space to surrounding SSML tags.
    // Define this limit here rather than calculating to simplify program logic.
    const MAX_LENGTH = TTS_QUOTA - TAG_SPACE;

    let texts = [];
    var startIndex = 0;
    var endIndex = 0;
    
    do {
      endIndex = startIndex + MAX_LENGTH;

      var ssml = text;
      // If the text has to be split, work out how to do it elegantly.
      if (text.length + TAG_SPACE > TTS_QUOTA) {
        // Get the largest possible string that includes a whole word and no incomplete SSML tags.
        // Loop back through the string until finding a space character to terminate that
        // string upon.
        let subText = text.substring(startIndex, endIndex);
        console.log(`ssml: '${ssml}'; startIndex: ${startIndex}; endIndex: ${endIndex}; text.length: ${text.length}`);

        // Handle for complete sentences.
        for(var i = subText.length; i > 0; i--) {
          if (subText.charAt(i) === "." || subText.charAt(i) === "?" || subText.charAt(i) === "!") {
              endIndex = i + startIndex + 1;
              break;
          }
        }
        ssml = text.substring(startIndex, endIndex);
      }
      let startTag = (ssml.substring(startIndex, "<speak>".length) === "<speak>") ? "" : "<speak>";
      var endTag = "</speak>"; 
      if (ssml.substring(ssml.length - "</speak>".length, ssml.length) === "</speak>") {
        ssml = ssml.substring(ssml - "</speak>".length)
      }

      console.log(`startTag: ${startTag}; ssml: '${ssml}'; endTag: ${endTag}; endIndex: ${endIndex}; text.length: ${text.length}`);
      texts.push(`${startTag}${ssml}${endTag}`);
      startIndex = endIndex;
    } while (endIndex < text.length)
    
    return texts;
  }

  // Returns the audio content generated from the input text.
  // Logic derived from GitHub example:
  // https://github.com/Tyamamoto1007/GoogleAppsScript_cloudText-to-Speech_template 
  function _getAudioContent(speechText) {  // text or ssml
    // Process the text as SSML or text depending upon if the text starts with the starting SSML tag.
    const inputSource = (speechText.substring(0, 7) === "<speak>") ? "ssml" : "text";

    const Input = {
      input: {
          [inputSource] : speechText
        },
    };

    // Construct the audio configuration from the settings and the input parameters.
    const json = Object.assign({}, Config.AudioConfig, Input);
    const payload = JSON.stringify(json);
    // Call Text-to-Speech API. See
    // https://cloud.google.com/text-to-speech/docs/reference/rest/v1beta1/text/synthesize
    // https://cloud.google.com/text-to-speech/quotas 5,000 Total characters per request
    const url = "https://texttospeech.googleapis.com/v1beta1/text:synthesize";
    const headers = {
      "Content-Type": "application/json; charset=UTF-8",
      "Authorization": "Bearer " + ScriptApp.getOAuthToken(),
    };
    
    // https://stackoverflow.com/questions/11718674/how-to-catch-urlfetchapp-fetch-exception
    const options = {
      "method": "post",
      "headers": headers,
      "payload": payload,
      muteHttpExceptions: true    
    };
    // Exception handling derived from example:
    // https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
    const data = UrlFetchApp.fetch(url, options);
    if (data.getResponseCode() != 200) {
      console.error(`UrlFetchApp code: ${data.getResponseCode()}`);
      console.error(`UrlFetchApp text: ${data.getContentText()}`);
      throw new Error('UrlFetchApp error');
    }
    const speechData = JSON.parse(data);

    return speechData.audioContent;
  }

  // Wrapper handling ID3 logic within file.
  const Tagger = ( () => {
    function getTaggedBlob(bytes, audioFileName, metadata) {
      let buffer = getArrayBuffer(bytes);
      console.log(`Metadata: ${metadata}; Bytes: ${buffer.byteLength}`);
      const writer = new ID3Writer(buffer);
      writer.removeTag();

      if (metadata.title != undefined)     writer.setFrame('TIT2', metadata.title);
      if (metadata.album != undefined)     writer.setFrame('TALB', metadata.album);
      if (metadata.artists != undefined)   writer.setFrame('TPE1', metadata.artists);
      if (metadata.composers != undefined) writer.setFrame('TCOM', metadata.composers);
      if (metadata.genres != undefined)    writer.setFrame('TCON', metadata.genres);
      if (metadata.year != undefined)      writer.setFrame('TYER', metadata.year);

      writer.addTag();

      let taggedBytes = new Uint8Array(writer.arrayBuffer);
      var blob = Utilities.newBlob(taggedBytes, "audio/mpeg", audioFileName);
      return blob;
    }
    // Returns an ArrayBuffer of the input bytes.
    function getArrayBuffer(bytes) {
      let arrayBuffer = new ArrayBuffer(bytes.length);
      const _bytes = new Uint8Array(arrayBuffer);
      // Transfer each of the bytes into the array view (and therefore the underlying buffer)
      bytes.forEach((_byte, indexNumber) => _bytes[indexNumber] = _byte);
      return arrayBuffer;
    }
    return {
        getTaggedBlob
      };
    })();
      return {
      getMP3Blob,
    };
})();

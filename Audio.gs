// Handles generation of audio from text into an MP3 with metadata.
const Audio = ( () => {
  // Returns an MP3 blob of audio content generated from the input text, tagged with appropriate metadata.
  function getMP3Blob(text, audioFileName, title, album, artist) {
    const requests = _getSSMLRequests(text);

    var audioContents = [];
    requests.forEach(
      request => {
        const audioContent = _getAudioContent("ssml", request);
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
    
    const blob = Tagger.getTaggedBlob(bytes, audioFileName, title, album, artist);
    Helper.log(`Tagger.getBlob bytes ${bytes.length}`, Helper.LOG_LEVEL.DEBUG);
    return blob;
  }
  // Returns SSML tagged text for speech processing using custom logic.
  // Returns an array of strings split from the input text so that it falls within Google's quota for
  // text that can be synthesized into speech within a single call. The outbound strings will be whole words
  // so they can easily be combined to create a final audio.
    function _getSSMLRequests(text) {
      let body = _getSSMLBody(text);
      let bodies = _getSSMLRequestBodies(body);
      let requests = [];
      bodies.forEach((requestBody, i) => {
        // Pause at the end of the audio
        let finalBreak = (i === (bodies.length -1)) ? '<break time="5s"/>' : ''; 
        let request = `<speak>${requestBody}${finalBreak}</speak>`;
        requests.push(request);
        Helper.log(`_getSSMLRequests length: ${request.length} request: ${request}`, Helper.LOG_LEVEL.DEBUG);
        });

      return requests;
  }

  // Returns the audio content generated from the input text.
  function _getAudioContent(inputSource, speechText) {  // text or ssml
     // Logic derived from GitHub example:
     // https://github.com/Tyamamoto1007/GoogleAppsScript_cloudText-to-Speech_template 
    const json = {
      "audioConfig": {
        "audioEncoding": "MP3",
        "pitch": "0.00",
        "speakingRate": "0.70"
      },
      "input": {
        [inputSource] : speechText
      },
      "voice": {
        "languageCode": "en-US",
        "name": "en-US-Standard-C"
      } 
    }
    
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
      Helper.log(`UrlFetchApp code: ${data.getResponseCode()}`, Helper.LOG_LEVEL.ERROR);
      Helper.log(`UrlFetchApp text: ${data.getContentText()}`, Helper.LOG_LEVEL.ERROR);
      throw new Error('UrlFetchApp error');
    }
    const speechData = JSON.parse(data);

    return speechData.audioContent;
  }
  // Transform inbound text for audio output via SSML.
  function _getSSMLBody(text) {
    // Manipulate various components of the text with SSML tags. See:
      // https://javascript.info/regexp-lookahead-lookbehind
    var response = text.replace(/(?!\w)\.(?=\s+\w)/g, '. <break time="2s"/>'); // Pause between sentences
      
    return response;
  }

  // Returns an array of strings split from the input text so that it falls within Google's quota for
  // text that can be synthesized into speech within a single call. The outbound strings will be whole words
  // so they can easily be combined to create a final audio.
  function _getSSMLRequestBodies(text) {
    // Google quota for max characters per text-to-speech request. See:
    // https://cloud.google.com/text-to-speech/quotas
    const TTS_QUOTA = 5000;
    // Limit each text to less than the quota so there is ample space to surrounding SSML tags.
    // Define this limit here rather than calculating to simplify program logic.
    const MAX_LENGTH = TTS_QUOTA - 100;

    let texts = [];
    var startIndex = 0;
    var endIndex = 0;
    
    while (endIndex < text.length) {
      endIndex = startIndex + MAX_LENGTH;

      // Get the largest possible string that includes a whole word and no incomplete SSML tags.
      // Loop back through the string until finding a space character to terminate that
      // string upon.
      let subText = text.substring(startIndex, endIndex);
      
      // Handle for complete words or SSML tags
      // TODO: Bug when there is a space within a tag
      for(var i = subText.length; i > 0; i--) {
        if (subText.charAt(i) === ">") {
          endIndex = i + startIndex;
          break;
        }

        if (subText.charAt(i) === " ") {
          let rightAngleIndex = subText.substring(0, i).lastIndexOf(">"); 
          let leftAngleIndex = subText.substring(0, i).lastIndexOf("<");
          if (leftAngleIndex > rightAngleIndex) { continue; } else {
            endIndex = i + startIndex;
            break;
          }
        }
      }
      texts.push(text.substring(startIndex, endIndex));
      startIndex = endIndex;
    }
    
    return texts;
  }

  // Wrapper handling ID3 logic within file.
  const Tagger = ( () => {
    function getTaggedBlob(bytes, audioFileName, title, album, artist) {
      let buffer = getArrayBuffer(bytes);
      Helper.log(`Title: ${title}; Album: ${album}; Bytes: ${buffer.byteLength}`, Helper.LOG_LEVEL.DEBUG);
      const writer = new ID3Writer(buffer);
      writer.removeTag();
      writer.setFrame('TIT2', title)
        .setFrame('TPE1', [artist])
        .setFrame('TALB', album)
        .setFrame('TYER', new Date().getFullYear())
        .setFrame('TCON', ['Spoken']);
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
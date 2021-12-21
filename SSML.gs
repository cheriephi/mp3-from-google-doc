// This class doesn't perform any validations and assumes the inbound text is not SSML.
// NOTE: Google doesn't appear to honor the phoneme directive even though their documentation says they do. 

// Gets the text of the document body (not the header or footer) and applies SSML tags to it.
// https://developers.google.com/docs/api/samples/output-json
// https://developers.google.com/apps-script/reference/document/paragraph
function getGoogleDocSSML(doc, options) { 

  const filePause      = (options.pauseInMillisecondsAfter.file != undefined)      ? `<break time="${options.pauseInMillisecondsAfter.file}ms"/>`      : "" ;
  const paragraphPause = (options.pauseInMillisecondsAfter.paragraph != undefined) ? `<break time="${options.pauseInMillisecondsAfter.paragraph}ms"/>` : "" ;
  const bulletPause    = (options.pauseInMillisecondsAfter.bullet != undefined)    ? `<break time="${options.pauseInMillisecondsAfter.bullet}ms"/>`    : "" ;

  // Convert the set of texts to replace to an array.
  const replaceTexts = (options.replaceTexts != undefined) ? options.replaceTexts : new Object() ;
  
  if (options.pauseInMillisecondsAfter.question != undefined) {
    // Search for a non-space character, followed by a question terminator (?), followed by at least one space character
    // then another non-space character.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Cheatsheet
    // Double escape the characters so the regular expression keeps a single escape character.
    replaceTexts["\\?"] = `?<break time="${options.pauseInMillisecondsAfter.question}ms"/>`;
  };
  if (options.pauseInMillisecondsAfter.statement != undefined) {
    replaceTexts["(?!\\w)[\\.\\!](?=\\s+\\w)"] = `.<break time="${options.pauseInMillisecondsAfter.statement}ms"/>`;
  };
  
  const useEmphasisForBoldText = (options.useEmphasisForBoldText != undefined) ? options.useEmphasisForBoldText : false ;
  

  // Extract the document text and apply markup against formatting elements
  const paragraphs = doc.getBody().getParagraphs();
  var docText = "";
  paragraphs.forEach(paragraph => {
    if (paragraph.getText().length === 0) {return; }

    // Use the appropriate pause if its a bullet or not.
    const paragraphBulletPause = (paragraph.getType() === DocumentApp.ElementType.LIST_ITEM) ? bulletPause : paragraphPause;
      
    var isBold = false;
    const attributes = paragraph.getAttributes();
    for (var attribute in attributes) {
        if (useEmphasisForBoldText && attribute === "BOLD" && attributes[attribute] === true) { isBold = true; };
    }

    const boldStartTag = (isBold) ? '<emphasis level="strong">' : "";
    const boldEndTag   = (isBold) ? '</emphasis>' : "";

    const paragraphText = `${boldStartTag}${paragraph.getText()}${boldEndTag}${paragraphBulletPause}`;

    Helper.log(`getGoogleDocSSML paragraphText: ${paragraphText}`, Helper.LOG_LEVEL.DEBUG);
    docText += paragraphText;
  });

  // Apply markup for text elements
  Object.keys(replaceTexts).forEach(key => {
    docText = docText.replace(new RegExp(key, "g"), replaceTexts[key]);
    Helper.log(`getGoogleDocSSML replaceTexts key: '${key}'; '${replaceTexts[key]}'`, Helper.LOG_LEVEL.DEBUG);
  });

  docText = `<speak>${docText}${filePause}</speak>`;
  Helper.log(`getGoogleDocSSML docText: ${docText}`, Helper.LOG_LEVEL.DEBUG);
  return docText;
}
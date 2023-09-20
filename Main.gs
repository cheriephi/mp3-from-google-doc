// This Google Apps Script project generates an MP3 audio with metadata from the content of a Google Doc file.
// The list of files to generate are based on a Google Drive search query.

// The design follows a Immediately Invoked Function Expression design pattern to encapsulate logic
// and prevent namespace collision, explained here:
// https://ramblings.mcpher.com/gassnippets2/improved-namespace-pattern-for-apps-script/

// This logic has some custom configuration, such as wrapping text in SSML tags with specified wait times between questions,
// but may be useful for any kind of text-to-speech logic, especially from Google Apps Script working with Google Docs.
// Main method. Executes a Google Drive search criteria to find Google Doc files and generates MP3 audio files
// using Text-To-Speech. Will delete the previous MP3 file if it exists.
function generate() {
  var currentLogLevelKey = Object.keys(console.LOG_LEVEL).find(key => console.LOG_LEVEL[key] === currentLogLevel)
  console.info(`query: ${Config.query}; requireMatchingAudio: ${Config.requireMatchingAudio}; forceRegenerate: ${Config.forceRegenerate}; currentLogLevel: ${currentLogLevelKey}`);
  const files = Workspace.getFiles(Config.query, Config.requireMatchingAudio, Config.forceRegenerate);
  var stateManager = new StateManager();
  var startIndex = stateManager.getStartIndex();
  files.forEach((file, index) => {
      // If resuming from incomplete run, continue until coming to current state.
      if (index < startIndex ) {
        console.warn(`skipping file: ${file.getName()}; index: ${index} because the previous run stopped at index ${startIndex}`); 
        return; 
      }
      console.info(`Generating MP3 for ${file.getName()}`);
      Workspace.generateMP3ForDoc(file.getId());
      stateManager.incrementStartIndex();
  });
  stateManager.resetState();
}
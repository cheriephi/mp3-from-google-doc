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
  // https://developers.google.com/drive/api/v3/search-files
  const query = "modifiedDate > '2021-12-10T12:00:00'"; // title contains = not modifiedDate > '2021-12-10T12:00:00'
  const requireMatchingAudio = true; // Only generate audios for documents that already have audios.
  const forceRegenerate = true; // Generate audios even if they are newer than the corresponding document.

  const files = Workspace.getFiles(query, requireMatchingAudio, forceRegenerate);
  var stateManager = new StateManager();
  var startIndex = stateManager.getStartIndex();
  files.forEach((file, index) => {
      // If resuming from incomplete run, continue until coming to current state.
      if (index < startIndex ) { return; }
      Helper.log(`Generating MP3 for ${file.getName()}`);
      Workspace.generateMP3ForDoc(file.getId());
      stateManager.incrementStartIndex();
  });
  stateManager.resetState();
}

const Workspace = ( () => {
  // Returns the list of files to process based on the input criteria.
  function getFiles(query, requireMatchingAudio, forceRegenerate) {
    const typeQuery = "mimeType = 'application/vnd.google-apps.document'";
    const docQuery = (query.length > 0) ? `${typeQuery} and ${query}` : typeQuery;
    Helper.log(`getFiles docQuery ${docQuery}`, Helper.LOG_LEVEL.DEBUG);

    // Execute the search filter the results.
    // Determine if the file matches the additional search criteria:
    //   * a matching audio if required
    //   * the audio be older than the document
    var unSortedFiles = [];
    var queryFiles = DriveApp.searchFiles(docQuery);
    while (queryFiles.hasNext()) { 
      let file = queryFiles.next();

      // Check for files without folders, this might be for shared files. We don't care about those.
      if (_getFolder(file.getId())=== undefined) {
        Helper.log(`generateMP3ForDocs file: ${file.getName()} does not have a folder, skipping`, Helper.LOG_LEVEL.DEBUG);
        continue; 
      }

      if (requireMatchingAudio) {
        let audioFileId = _getAudioFileId(file.getId());
        Helper.log(`generateMP3ForDocs audioFile found: ${!(audioFileId === null)}`, Helper.LOG_LEVEL.DEBUG)
        if (audioFileId == null) continue;

        let fileLastUpdated = file.getLastUpdated();
        let audioFileLastUpdated = DriveApp.getFileById(audioFileId).getLastUpdated();
        Helper.log(`generateMP3ForDocs forceRegenerate: ${forceRegenerate}; fileLastUpdated: ${fileLastUpdated}; audioFileLastUpdated: ${audioFileLastUpdated};`, Helper.LOG_LEVEL.DEBUG)
        if (!forceRegenerate && file.getLastUpdated() < audioFileLastUpdated) break;
      }

      unSortedFiles.push(file); 
    }
    return _getSortedFiles(unSortedFiles);
  }

  // Create an audio file from the input document.
  function generateMP3ForDoc(docFileId) {
    const text = _getDocText(docFileId);
    const docFile = DriveApp.getFileById(docFileId);

    const audioFileName = `${docFile.getName()}.mp3`;
    // Define the audio file metadata
    const metadata = {
      title: docFile.getName(),
      album: _getTopFolder(docFileId).getName(),
      artists: [docFile.getOwner().getName()],
      composers: [docFile.getOwner().getName()],
      genres: ["Spoken"],
      year: docFile.getLastUpdated().getFullYear(),
    };

    const blob = Audio.getMP3Blob(text, audioFileName, metadata);

    // Delete previous audio file if it exists.
    var audioFileId = _getAudioFileId(docFileId);
    if (audioFileId != null) {DriveApp.getFileById(audioFileId).setTrashed(true)};

    // Create new audio file
    DriveApp.getFolderById(_getFolder(docFileId).getId()).createFile(blob);
  }

  function _getFolder(fileId) {
    var folder;
    var folders = DriveApp.getFileById(fileId).getParents();
    if (folders.hasNext()) {
      folder = folders.next();
    }
    return folder;
  }

  // Return an array of files sorted alphabetically by name.
  function _getSortedFiles(unSortedFiles) {
    let sortedFiles = unSortedFiles.sort(function(a, b){
      let aName = a.getName().toUpperCase();
      let bName = b.getName().toUpperCase();
      return aName.localeCompare(bName);
    });
    return sortedFiles;
  }

  // Find associated audio for the document, if it exists.
  function _getAudioFileId(docFileId) {
      var audioFileId = null;
      const docFile = DriveApp.getFileById(docFileId);
      const escapedFileName = docFile.getName().replace(/'/g, "\\'");
      const folder = _getFolder(docFile.getId());
      const folderId = folder.getId();
      const audioQuery = `title = '${escapedFileName}.mp3' and mimeType = 'audio/mpeg' and '${folderId}' in parents`; 
      Helper.log(`generateMP3ForDocs audioQuery: ${audioQuery}`, Helper.LOG_LEVEL.DEBUG)
      var audioFiles = DriveApp.searchFiles(audioQuery);

      while (audioFiles.hasNext()) {
        audioFileId = audioFiles.next().getId();
      }

      return audioFileId;
  }

  // Gets the text of the document body (not the header or footer).
  function _getDocText(docId) { 
    const doc = DocumentApp.openById(docId);
    const paragraphs = doc.getBody().getParagraphs();
    var docText = "";
    paragraphs.forEach(paragraph => {
      docText += ` ${paragraph.getText()}`;
    });

    Helper.log(docText, Helper.LOG_LEVEL.DEBUG);
    return docText;
  }

  // Gets the folder second to the top.
  function _getTopFolder(fileId) {
    let folder = DriveApp.getFileById(fileId).getParents().next();
    // If it's not the root folder or a child of the root folder, recurse up the folder tree
    while (folder.getParents().hasNext() 
        && folder.getParents().next().getParents().hasNext()
        && folder.getParents().next().getParents().next().getParents().hasNext()) {
      Helper.log(`getTopFolder folder name: ${folder.getName()} ; folder id: ${folder.getId()}`, Helper.LOG_LEVEL.DEBUG);
      folder = folder.getParents().next();
    }

    Helper.log(`getTopFolder fileId: ${fileId}; return folder name: ${folder.getName()}; folder id: ${folder.getId()}`, Helper.LOG_LEVEL.DEBUG);
    return folder;
  }

return {
      getFiles,
      generateMP3ForDoc,
  };
})();

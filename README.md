# mp3-from-google-doc
Generates MP3 files based on the content of Google Doc files.

## Requirements
This project runs through Google Apps Script (GAS) through the Google Cloud Platform.
You need a Google Cloud Platform account and project.
The project should have the Text-to-Speech API enabled, which requires a credit card be set up (the free tier covers a lot of executions).
The Google Drive and Google Docs APIs should also be enabled on the project.
An OAuth 2.0 client ID should be set up for Google Apps Script.

You also need a Google Apps Script project which is configured to point to the Google Cloud Project.
Show the appsscript.json manifest in the editor so can replace it.
Enable Google Advanced Services in the Project's services setting.

## Installation
Paste this code into Google Apps Script.

## Usage
Modify Main.gs generate function to specify the Google Drive query you want to identify the documents to generate MP3s for.

If you execute the "generate" function in GAS, the audio file will be saved in Google Drive in the same directory as the document from which it derives.

## License
mp3-from-google-doc is under [MIT license](https://en.wikipedia.org/wiki/MIT_License).

## Known issues
*Reviewed 2026-09-21 with Claude. Background on the ID3 details is in my doc "Reading ID3 Tags in JavaScript". Items marked "not tested" were spotted by reading the code only.*
**ID3 tagging works.** ID3Writer.gs, a port of [browser-id3-writer](https://npmjs.com/package/browser-id3-writer), writes a correct ID3v2.3 tag with UTF-16 text. Accented letters, dashes, and emoji survive, and re-tagging replaces the old tag cleanly without touching the audio. Tested in Node.
**Design choices, not bugs:**
- Tags are ID3v2.3 on purpose, for the widest player support.
- UTF-16 is the right text encoding for ID3v2.3; UTF-8 isn't defined there.
- Any existing tag is replaced wholesale.
**Open items, by priority:**
1. **Audio.gs joins base64 strings before decoding.** A chunk whose byte length isn't a multiple of 3 ends in `=` padding, which lands mid-string once joined. This plausibly explains the "Could not decode string" comment. Fix: decode each chunk with `Utilities.base64Decode`, then join the byte arrays. Not tested.
2. **StateManager.getStartIndex calls `setProperty({startIndex: startIndex})`.** `setProperty` takes a key and a value; `setProperties` takes an object. Likely fails on a first run, when no startIndex is stored yet. Not tested.
3. **ID3Writer.gs `encodeWindows1252` keeps only the low byte of each character.** Characters above U+00FF are silently corrupted; for example, Ś becomes Z. Only TYER uses it today, and digits are safe. It matters if URL frames (W***), PRIV, or non-Unicode APIC descriptions are added.
4. **ID3Writer.gs `getURL` and `revokeURL` are dead code.** They call `getBlob` and `URL`, which don't exist in Apps Script. Delete them.
5. **Audio.gs `getArrayBuffer` can be one line:** `new Uint8Array(bytes).buffer` converts signed bytes the same way. Tested in Node, not in Apps Script.
6. **Console.gs log levels are off.** `info()` logs at level 1, the warn level, and callers pass `console.LOG_LEVEL.DEBUG`, which doesn't exist, so that argument is ignored. Not tested.
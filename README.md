# mp3-from-google-doc
Generates MP3 files based on the content of Google Doc files.

## Requirements
This project runs through Google Apps Script (GAS) through the Google Cloud Platform.
You need a Google Cloud Platform account and project.
The project should have the Text-to-Speech API enabled, which requires a credit card be set up (the free tier covers a lot of executions).
The Google Drive and Google Docs APIs should also be enabled on the project.
An OAuth 2.0 client ID should be set up for Google Apps Script.

You also need a Google Apps Script project which is configured to point to the Google Cloud Project.
Show the appsscript.json manifest in the editor so that you can add the following:
  "oauthScopes": [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/documents"
  ]

## Installation
Paste this code into Google Apps Script.

## Usage
Modify Main.gs generate function to specify the Google Drive query you want to identify the documents to generate MP3s for.

If you execute the "generate" function in GAS, the audio file will be saved in Google Drive in the same directory as the document from which it derives.

## License
mp3-from-google-doc is under [MIT license](https://en.wikipedia.org/wiki/MIT_License).

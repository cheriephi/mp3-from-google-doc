// This logic tweaks the existing console logging for better control.

// Depending upon the log level configured, and the type of logged message, 
// the message may or may not be output.

// Preserve the original object within memory. See:
// https://stackoverflow.com/questions/7042611/override-console-log-for-production
// Enumeration based on https://console.spec.whatwg.org/#printer
var console = ( (oldConsole) => {
  const LOG_LEVEL = {
    error: 0,
    warn: 1,
    info: 2,
    log: 3
  };

  currentLogLevel = LOG_LEVEL.info;

  // Look up the calling function through a hack of parsing the error stack.
  // https://stackoverflow.com/questions/38435450/get-current-function-name-in-strict-mode
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack
  // Non-standard code.
  function fancyLog(logFunction, msg, logLevel, err) {
    if (logLevel > currentLogLevel) { return; }

    // Get the name of the calling object by parsing it out of the error object passed in.
    let callerString = err.stack.split('\n')[2].trim();
    let i = callerString.lastIndexOf(" ");
    let caller = callerString.substring(3, i);
    let prefix = (caller.trim().length > 0) ? `${caller}: ` : "";

    logFunction(`${prefix}${msg}`);
  }
  return {
      LOG_LEVEL,
      log:   (text) => { fancyLog(oldConsole.log,   text, 3, new Error()) },
      info:  (text) => { fancyLog(oldConsole.info,  text, 1, new Error()) },
      warn:  (text) => { fancyLog(oldConsole.warn,  text, 1, new Error()) },
      error: (text) => { fancyLog(oldConsole.error, text, 0, new Error()) },
  };
})(console);
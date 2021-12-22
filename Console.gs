// Overwrite the existing console object to control logging behavior.
// Preserve the original object within memory. See:
// https://stackoverflow.com/questions/7042611/override-console-log-for-production
var console = ( (oldConsole) => {
  const LOG_LEVEL = {
    ERROR: 0,
    INFO: 1,
    DEBUG: 2
  };

  currentLogLevel = LOG_LEVEL.INFO;

   // https://stackoverflow.com/questions/38435450/get-current-function-name-in-strict-mode
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack
  // Non-standard code.
  function fancyLog(logFunction, msg, logLevel, err) {
    if (logLevel === undefined) { logLevel = 0 };
    
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
      log:   (text, logLevel) => { fancyLog(oldConsole.log,   text, logLevel, new Error()) },
      info:  (text, logLevel) => { fancyLog(oldConsole.info,  text, logLevel, new Error()) },
      warn:  (text, logLevel) => { fancyLog(oldConsole.warn,  text, logLevel, new Error()) },
      error: (text, logLevel) => { fancyLog(oldConsole.error, text, logLevel, new Error()) },
  };
})(console);
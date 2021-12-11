const Helper = ( () => {
  const LOG_LEVEL = {
    ERROR: 0,
    INFO: 1,
    DEBUG: 2
  };

  const currentLogLevel = LOG_LEVEL.INFO;
  const log = (msg, logLevel) => {
    if (logLevel === undefined) { logLevel = 0 };
    
    if (logLevel <= currentLogLevel) console.log(msg);
    }

  return {
    LOG_LEVEL,
    log
  };
})();
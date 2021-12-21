 // Store state in case of timeout, can resume.
 // https://developers.google.com/apps-script/guides/services/quotas
 class StateManager {
   constructor() {
     this.scriptProperties = PropertiesService.getScriptProperties();
   }

   getStartIndex() {
    var startIndex = this.scriptProperties.getProperty('startIndex');
    if (startIndex === null ) {
      startIndex = parseInt(0);
      this.scriptProperties.setProperty( {startIndex: startIndex} );
    };
    console.log(`startIndex: ${startIndex}`, console.LOG_LEVEL.DEBUG);
    return startIndex;
  }

  incrementStartIndex() {
    var startIndex = this.scriptProperties.getProperty('startIndex');
    this.scriptProperties.setProperty('startIndex', parseInt(startIndex) + parseInt(1));
    console.log(`startIndex: ${this.scriptProperties.getProperty('startIndex')}`, console.LOG_LEVEL.DEBUG);
  }

  resetState() {
    this.scriptProperties.setProperty('startIndex', parseInt(0));
    console.log(`Resetting.`, console.LOG_LEVEL.DEBUG);
  }
}

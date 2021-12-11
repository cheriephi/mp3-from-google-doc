// Writes ID3 tags to the MP3 buffer. See:
// https://github.com/egoroof/browser-id3-writer
class ID3Writer {
    _setIntegerFrame(name, value) {
        const integer = parseInt(value, 10);

        this.frames.push({
            name,
            value: integer,
            size: Frame.getNumericFrameSize(integer.toString().length),
        });
    }

    _setStringFrame(name, value) {
        const stringValue = value.toString();

        this.frames.push({
            name,
            value: stringValue,
            size: Frame.getStringFrameSize(stringValue.length),
        });
    }

    _setPictureFrame(pictureType, data, description, useUnicodeEncoding) {
        const mimeType = Signature.getMimeType(new Uint8Array(data));
        const descriptionString = description.toString();

        if (!mimeType) {
            throw new Error('Unknown picture MIME type');
        }
        if (!description) {
            useUnicodeEncoding = false;
        }
        this.frames.push({
            name: 'APIC',
            value: data,
            pictureType,
            mimeType,
            useUnicodeEncoding,
            description: descriptionString,
            size: Frame.getPictureFrameSize(data.byteLength, mimeType.length, descriptionString.length, useUnicodeEncoding),
        });
    }

    _setLyricsFrame(language, description, lyrics) {
        const languageCode = language.split('').map(c => c.charCodeAt(0));
        const descriptionString = description.toString();
        const lyricsString = lyrics.toString();

        this.frames.push({
            name: 'USLT',
            value: lyricsString,
            language: languageCode,
            description: descriptionString,
            size: Frame.getLyricsFrameSize(descriptionString.length, lyricsString.length),
        });
    }

    _setCommentFrame(language, description, text) {
        const languageCode = language.split('').map(c => c.charCodeAt(0));
        const descriptionString = description.toString();
        const textString = text.toString();

        this.frames.push({
            name: 'COMM',
            value: textString,
            language: languageCode,
            description: descriptionString,
            size: Frame.getCommentFrameSize(descriptionString.length, textString.length),
        });
    }

    _setPrivateFrame(id, data) {
        const identifier = id.toString();

        this.frames.push({
            name: 'PRIV',
            value: data,
            id: identifier,
            size: Frame.getPrivateFrameSize(identifier.length, data.byteLength),
        });
    }

    _setUserStringFrame(description, value) {
        const descriptionString = description.toString();
        const valueString = value.toString();

        this.frames.push({
            name: 'TXXX',
            description: descriptionString,
            value: valueString,
            size: Frame.getUserStringFrameSize(descriptionString.length, valueString.length),
        });
    }

    _setUrlLinkFrame(name, url) {
        const urlString = url.toString();

        this.frames.push({
            name,
            value: urlString,
            size: Frame.getUrlLinkFrameSize(urlString.length),
        });
    }

    constructor(buffer) {
        if (!buffer || typeof buffer !== 'object' || !('byteLength' in buffer)) {
            throw new Error('First argument should be an instance of ArrayBuffer or Buffer');
        }

        this.arrayBuffer = buffer;
        this.padding = 4096;
        this.frames = [];
        this.url = '';
    }

    setFrame(frameName, frameValue) {
        switch (frameName) {
            case 'TPE1': // song artists
            case 'TCOM': // song composers
            case 'TCON': { // song genres
                if (!Array.isArray(frameValue)) {
                    throw new Error(`${frameName} frame value should be an array of strings`);
                }
                const delimiter = frameName === 'TCON' ? ';' : '/';
                const value = frameValue.join(delimiter);

                this._setStringFrame(frameName, value);
                break;
            }
            case 'TLAN': // language
            case 'TIT1': // content group description
            case 'TIT2': // song title
            case 'TIT3': // song subtitle
            case 'TALB': // album title
            case 'TPE2': // album artist // spec doesn't say anything about separator, so it is a string, not array
            case 'TPE3': // conductor/performer refinement
            case 'TPE4': // interpreted, remixed, or otherwise modified by
            case 'TRCK': // song number in album: 5 or 5/10
            case 'TPOS': // album disc number: 1 or 1/3
            case 'TMED': // media type
            case 'TPUB': // label name
            case 'TCOP': // copyright
            case 'TKEY': // musical key in which the sound starts
            case 'TEXT': // lyricist / text writer
            case 'TSRC': { // isrc
                this._setStringFrame(frameName, frameValue);
                break;
            }
            case 'TBPM': // beats per minute
            case 'TLEN': // song duration
            case 'TDAT': // album release date expressed as DDMM
            case 'TYER': { // album release year
                this._setIntegerFrame(frameName, frameValue);
                break;
            }
            case 'USLT': { // unsychronised lyrics
                frameValue.language = frameValue.language || 'eng';
                if (typeof frameValue !== 'object' || !('description' in frameValue) || !('lyrics' in frameValue)) {
                    throw new Error('USLT frame value should be an object with keys description and lyrics');
                }
                if (frameValue.language && !frameValue.language.match(/[a-z]{3}/i)) {
                    throw new Error('Language must be coded following the ISO 639-2 standards');
                }
                this._setLyricsFrame(frameValue.language, frameValue.description, frameValue.lyrics);
                break;
            }
            case 'APIC': { // song cover
                if (typeof frameValue !== 'object' || !('type' in frameValue) || !('data' in frameValue) || !('description' in frameValue)) {
                    throw new Error('APIC frame value should be an object with keys type, data and description');
                }
                if (frameValue.type < 0 || frameValue.type > 20) {
                    throw new Error('Incorrect APIC frame picture type');
                }
                this._setPictureFrame(frameValue.type, frameValue.data, frameValue.description, !!frameValue.useUnicodeEncoding);
                break;
            }
            case 'TXXX': { // user defined text information
                if (typeof frameValue !== 'object' || !('description' in frameValue) || !('value' in frameValue)) {
                    throw new Error('TXXX frame value should be an object with keys description and value');
                }
                this._setUserStringFrame(frameValue.description, frameValue.value);
                break;
            }
            case 'WCOM': // Commercial information
            case 'WCOP': // Copyright/Legal information
            case 'WOAF': // Official audio file webpage
            case 'WOAR': // Official artist/performer webpage
            case 'WOAS': // Official audio source webpage
            case 'WORS': // Official internet radio station homepage
            case 'WPAY': // Payment
            case 'WPUB': { // Publishers official webpage
                this._setUrlLinkFrame(frameName, frameValue);
                break;
            }
            case 'COMM': { // Comments
                frameValue.language = frameValue.language || 'eng';
                if (typeof frameValue !== 'object' || !('description' in frameValue) || !('text' in frameValue)) {
                    throw new Error('COMM frame value should be an object with keys description and text');
                }
                if (frameValue.language && !frameValue.language.match(/[a-z]{3}/i)) {
                    throw new Error('Language must be coded following the ISO 639-2 standards');
                }
                this._setCommentFrame(frameValue.language, frameValue.description, frameValue.text);
                break;
            }
            case 'PRIV': { // Private frame
                if (typeof frameValue !== 'object' || !('id' in frameValue) || !('data' in frameValue)) {
                    throw new Error('PRIV frame value should be an object with keys id and data');
                }
                this._setPrivateFrame(frameValue.id, frameValue.data);
                break;
            }
            default: {
                throw new Error(`Unsupported frame ${frameName}`);
            }
        }

        return this;
    }

    removeTag() {
        const headerLength = 10;

        if (this.arrayBuffer.byteLength < headerLength) {
            return;
        }
        const bytes = new Uint8Array(this.arrayBuffer);
        const version = bytes[3];
        const tagSize = Transform.uint7ArrayToUint28([bytes[6], bytes[7], bytes[8], bytes[9]]) + headerLength;

        if (!Signature.isId3v2(bytes) || version < 2 || version > 4) {
            return;
        }
        this.arrayBuffer = (new Uint8Array(bytes.subarray(tagSize))).buffer;
    }

    addTag() {
        this.removeTag();

        const BOM = [0xff, 0xfe];
        const headerSize = 10;
        const totalFrameSize = this.frames.reduce((sum, frame) => sum + frame.size, 0);
        const totalTagSize = headerSize + totalFrameSize + this.padding;
        const buffer = new ArrayBuffer(this.arrayBuffer.byteLength + totalTagSize);
        const bufferWriter = new Uint8Array(buffer);

        let offset = 0;
        let writeBytes = [];

        writeBytes = [0x49, 0x44, 0x33, 3]; // ID3 tag and version
        bufferWriter.set(writeBytes, offset);
        offset += writeBytes.length;

        offset++; // version revision
        offset++; // flags

        writeBytes = Transform.uint28ToUint7Array(totalTagSize - headerSize); // tag size (without header)
        bufferWriter.set(writeBytes, offset);
        offset += writeBytes.length;

        this.frames.forEach((frame) => {
            writeBytes = Encoder.encodeWindows1252(frame.name); // frame name
            bufferWriter.set(writeBytes, offset);
            offset += writeBytes.length;

            writeBytes = Transform.uint32ToUint8Array(frame.size - headerSize); // frame size (without header)
            bufferWriter.set(writeBytes, offset);
            offset += writeBytes.length;

            offset += 2; // flags

            switch (frame.name) {
                case 'WCOM':
                case 'WCOP':
                case 'WOAF':
                case 'WOAR':
                case 'WOAS':
                case 'WORS':
                case 'WPAY':
                case 'WPUB': {
                    writeBytes = Encoder.encodeWindows1252(frame.value); // URL
                    bufferWriter.set(writeBytes, offset);
                    offset += writeBytes.length;
                    break;
                }
                case 'TPE1':
                case 'TCOM':
                case 'TCON':
                case 'TLAN':
                case 'TIT1':
                case 'TIT2':
                case 'TIT3':
                case 'TALB':
                case 'TPE2':
                case 'TPE3':
                case 'TPE4':
                case 'TRCK':
                case 'TPOS':
                case 'TKEY':
                case 'TMED':
                case 'TPUB':
                case 'TCOP':
                case 'TEXT':
                case 'TSRC': {
                    writeBytes = [1].concat(BOM); // encoding, BOM
                    bufferWriter.set(writeBytes, offset);
                    offset += writeBytes.length;

                    writeBytes = Encoder.encodeUtf16le(frame.value); // frame value
                    bufferWriter.set(writeBytes, offset);
                    offset += writeBytes.length;
                    break;
                }
                case 'TXXX':
                case 'USLT':
                case 'COMM': {
                    writeBytes = [1]; // encoding
                    if (frame.name === 'USLT' || frame.name === 'COMM') {
                        writeBytes = writeBytes.concat(frame.language); // language
                    }
                    writeBytes = writeBytes.concat(BOM); // BOM for content descriptor
                    bufferWriter.set(writeBytes, offset);
                    offset += writeBytes.length;

                    writeBytes = Encoder.encodeUtf16le(frame.description); // content descriptor
                    bufferWriter.set(writeBytes, offset);
                    offset += writeBytes.length;

                    writeBytes = [0, 0].concat(BOM); // separator, BOM for frame value
                    bufferWriter.set(writeBytes, offset);
                    offset += writeBytes.length;

                    writeBytes = Encoder.encodeUtf16le(frame.value); // frame value
                    bufferWriter.set(writeBytes, offset);
                    offset += writeBytes.length;
                    break;
                }
                case 'TBPM':
                case 'TLEN':
                case 'TDAT':
                case 'TYER': {
                    offset++; // encoding

                    writeBytes = Encoder.encodeWindows1252(frame.value); // frame value
                    bufferWriter.set(writeBytes, offset);
                    offset += writeBytes.length;
                    break;
                }
                case 'PRIV': {
                    writeBytes = Encoder.encodeWindows1252(frame.id); // identifier
                    bufferWriter.set(writeBytes, offset);
                    offset += writeBytes.length;

                    offset++; // separator

                    bufferWriter.set(new Uint8Array(frame.value), offset); // frame data
                    offset += frame.value.byteLength;
                    break;
                }
                case 'APIC': {
                    writeBytes = [frame.useUnicodeEncoding ? 1 : 0]; // encoding
                    bufferWriter.set(writeBytes, offset);
                    offset += writeBytes.length;

                    writeBytes = Encoder.encodeWindows1252(frame.mimeType); // MIME type
                    bufferWriter.set(writeBytes, offset);
                    offset += writeBytes.length;

                    writeBytes = [0, frame.pictureType]; // separator, pic type
                    bufferWriter.set(writeBytes, offset);
                    offset += writeBytes.length;

                    if (frame.useUnicodeEncoding) {
                        writeBytes = [].concat(BOM); // BOM
                        bufferWriter.set(writeBytes, offset);
                        offset += writeBytes.length;

                        writeBytes = Encoder.encodeUtf16le(frame.description); // description
                        bufferWriter.set(writeBytes, offset);
                        offset += writeBytes.length;

                        offset += 2; // separator
                    } else {
                        writeBytes = Encoder.encodeWindows1252(frame.description); // description
                        bufferWriter.set(writeBytes, offset);
                        offset += writeBytes.length;

                        offset++; // separator
                    }

                    bufferWriter.set(new Uint8Array(frame.value), offset); // picture content
                    offset += frame.value.byteLength;
                    break;
                }
            }
        });
        offset += this.padding; // free space for rewriting
        bufferWriter.set(new Uint8Array(this.arrayBuffer), offset);
        this.arrayBuffer = buffer;
          
        return buffer;
    }

    getURL() {
        if (!this.url) {
            this.url = URL.createObjectURL(this.getBlob());
        }
        return this.url;
    }

    revokeURL() {
        URL.revokeObjectURL(this.url);
    }
}

const Encoder = ( () => {
  // https://encoding.spec.whatwg.org/
  function strToCodePoints(str) {
      return String(str).split('').map((c) => c.charCodeAt(0));
  }

  function encodeWindows1252(str) {
      return new Uint8Array(strToCodePoints(str));
  }

  function encodeUtf16le(str) {
      const output = new Uint8Array(str.length * 2);
      new Uint16Array(output.buffer).set(strToCodePoints(str));

      return output;
  }
  return {
        encodeWindows1252
      , encodeUtf16le
    };
  })();

const Signature = ( () => {
    function isId3v2(buf) {
        return buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33;
    }

    function getMimeType(buf) {
        // https://github.com/sindresorhus/file-type
        if (!buf || !buf.length) {
            return null;
        }
        if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
            return 'image/jpeg';
        }
        if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
            return 'image/png';
        }
        if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
            return 'image/gif';
        }
        if (buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
            return 'image/webp';
        }
        const isLeTiff = buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0;
        const isBeTiff = buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0 && buf[3] === 0x2a;

        if (isLeTiff || isBeTiff) {
            return 'image/tiff';
        }
        if (buf[0] === 0x42 && buf[1] === 0x4d) {
            return 'image/bmp';
        }
        if (buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0) {
            return 'image/x-icon';
        }
        return null;
  }
return {
      isId3v2
    , getMimeType
  };
})();

const Frame = ( () => {
  function getNumericFrameSize(frameSize) {
      const headerSize = 10;
      const encodingSize = 1;

      return headerSize +
          encodingSize +
          frameSize;
  }

  function getStringFrameSize(frameSize) {
      const headerSize = 10;
      const encodingSize = 1;
      const bomSize = 2;
      const frameUtf16Size = frameSize * 2;
  
      return headerSize +
          encodingSize +
          bomSize +
          frameUtf16Size;
  }

  function getLyricsFrameSize(descriptionSize, lyricsSize) {
      const headerSize = 10;
      const encodingSize = 1;
      const languageSize = 3;
      const bomSize = 2;
      const descriptionUtf16Size = descriptionSize * 2;
      const separatorSize = 2;
      const lyricsUtf16Size = lyricsSize * 2;

      return headerSize +
          encodingSize +
          languageSize +
          bomSize +
          descriptionUtf16Size +
          separatorSize +
          bomSize +
          lyricsUtf16Size;
  }

  function getPictureFrameSize(pictureSize, mimeTypeSize, descriptionSize, useUnicodeEncoding) {
      const headerSize = 10;
      const encodingSize = 1;
      const separatorSize = 1;
      const pictureTypeSize = 1;
      const bomSize = 2;
      const encodedDescriptionSize = useUnicodeEncoding ?
          bomSize + (descriptionSize + separatorSize) * 2 :
          descriptionSize + separatorSize;

      return headerSize +
          encodingSize +
          mimeTypeSize +
          separatorSize +
          pictureTypeSize +
          encodedDescriptionSize +
          pictureSize;
  }

  function getCommentFrameSize(descriptionSize, textSize) {
      const headerSize = 10;
      const encodingSize = 1;
      const languageSize = 3;
      const bomSize = 2;
      const descriptionUtf16Size = descriptionSize * 2;
      const separatorSize = 2;
      const textUtf16Size = textSize * 2;

      return headerSize +
          encodingSize +
          languageSize +
          bomSize +
          descriptionUtf16Size +
          separatorSize +
          bomSize +
          textUtf16Size;
  }

  function getPrivateFrameSize(idSize, dataSize) {
      const headerSize = 10;
      const separatorSize = 1;

      return headerSize +
          idSize +
          separatorSize +
          dataSize;
  }

  function getUserStringFrameSize(descriptionSize, valueSize) {
      const headerSize = 10;
      const encodingSize = 1;
      const bomSize = 2;
      const descriptionUtf16Size = descriptionSize * 2;
      const separatorSize = 2;
      const valueUtf16Size = valueSize * 2;

      return headerSize +
          encodingSize +
          bomSize +
          descriptionUtf16Size +
          separatorSize +
          bomSize +
          valueUtf16Size;
  }

  function getUrlLinkFrameSize(urlSize) {
      const headerSize = 10;

      return headerSize +
          urlSize;
  }
  return {
        getNumericFrameSize
      , getStringFrameSize
      , getLyricsFrameSize
      , getPictureFrameSize
      , getCommentFrameSize
      , getPrivateFrameSize
      , getUserStringFrameSize
      , getUrlLinkFrameSize
    };
  })();

const Transform = ( () => {
  function uint32ToUint8Array(uint32) {
      const eightBitMask = 0xff;

      return [
          (uint32 >>> 24) & eightBitMask,
          (uint32 >>> 16) & eightBitMask,
          (uint32 >>> 8) & eightBitMask,
          uint32 & eightBitMask,
      ];
  }

  function uint28ToUint7Array(uint28) {
      const sevenBitMask = 0x7f;

      return [
          (uint28 >>> 21) & sevenBitMask,
          (uint28 >>> 14) & sevenBitMask,
          (uint28 >>> 7) & sevenBitMask,
          uint28 & sevenBitMask,
      ];
  }

  function uint7ArrayToUint28(uint7Array) {
      return (uint7Array[0] << 21) + (uint7Array[1] << 14) + (uint7Array[2] << 7) + uint7Array[3];
  }

return {
      uint32ToUint8Array
    , uint28ToUint7Array
    , uint7ArrayToUint28
  };
})();
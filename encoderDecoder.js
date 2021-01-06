var crypto = require('crypto');

const encrypt = (text, key) => {
  var experiment = key.split("");
  experiment.length = 24;
  experiment.fill("z", 0, 24);
  key = experiment.join("")
var encrypt = crypto.createCipheriv('des-ede3', key, "");
var theCipher = encrypt.update(text, 'utf8', 'base64');
theCipher += encrypt.final('base64');
return theCipher;
};

const decrypt = (encrypted, key) => {
    var experiment = key.split("");
  experiment.length = 24;
  experiment.fill("z", 0, 24);
  key = experiment.join("")
var decrypt = crypto.createDecipheriv('des-ede3', key, "");
var s = decrypt.update(encrypted, 'base64', 'utf8');
s += decrypt.final('utf8')
return s;
};

module.exports = {
  encrypt,
  decrypt
};
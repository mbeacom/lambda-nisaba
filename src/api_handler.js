"use strict";
const AWS = require("aws-sdk");
const querystring = require("querystring");
require('ethr-did-resolver')()
require('uport-did-resolver')()
const RecaptchaMgr = require("./lib/recaptchaMgr");
const FuncaptchaMgr = require("./lib/funcaptchaMgr");
const AuthMgr = require("./lib/authMgr");
const FuelTokenMgr = require("./lib/fuelTokenMgr");
const UPortMgr = require("./lib/uPortMgr");
const AttestationMgr = require("./lib/attestationMgr");
const PhoneVerificationMgr = require("./lib/phoneVerificationMgr");
const InstanceVerificationMgr = require("./lib/instanceVerificationMgr");

const RecaptchaHandler = require("./handlers/recaptcha");
const FuncaptchaHandler = require("./handlers/funcaptcha");
const NewDeviceKeyHandler = require("./handlers/newDeviceKey");
const PhoneAttestationHandler = require("./handlers/phone_attestation");
const StartVerificationHandler = require("./handlers/start_verification");
const ContinueVerificationHandler = require("./handlers/continue_verification");
const CheckVerificationHandler = require("./handlers/check_verification");
const InstanceVerificationHandler = require("./handlers/instance_verification");

let recaptchaMgr = new RecaptchaMgr();
let funcaptchaMgr = new FuncaptchaMgr();
let authMgr = new AuthMgr();
let fuelTokenMgr = new FuelTokenMgr();
let uPortMgr = new UPortMgr();
let attestationMgr = new AttestationMgr();
let phoneVerificationMgr = new PhoneVerificationMgr();
let instanceVerificationMgr = new InstanceVerificationMgr();

let recaptchaHandler = new RecaptchaHandler(recaptchaMgr, fuelTokenMgr);
let funcaptchaHandler = new FuncaptchaHandler(funcaptchaMgr, fuelTokenMgr);
let newDeviceKeyHandler = new NewDeviceKeyHandler(
  authMgr,
  uPortMgr,
  fuelTokenMgr
);
let phoneAttestationHandler = new PhoneAttestationHandler(
  attestationMgr,
  fuelTokenMgr
);
let startVerificationHandler = new StartVerificationHandler(
  phoneVerificationMgr
);
let continueVerificationHandler = new ContinueVerificationHandler(
  phoneVerificationMgr
);
let checkVerificationHandler = new CheckVerificationHandler(
  phoneVerificationMgr
);
let instanceFuelHandler = new InstanceVerificationHandler(
  instanceVerificationMgr,
  fuelTokenMgr
);

module.exports.recaptcha = (event, context, callback) => {
  postHandler(recaptchaHandler, event, context, callback);
};
module.exports.funcaptcha = (event, context, callback) => {
  postHandler(funcaptchaHandler, event, context, callback);
};
module.exports.newDeviceKey = (event, context, callback) => {
  postHandler(newDeviceKeyHandler, event, context, callback);
};
module.exports.phone_attestation = (event, context, callback) => {
  postHandler(phoneAttestationHandler, event, context, callback);
};
module.exports.start_verification = (event, context, callback) => {
  postHandler(startVerificationHandler, event, context, callback);
};
module.exports.continue_verification = (event, context, callback) => {
  postHandler(continueVerificationHandler, event, context, callback);
};
module.exports.check_verification = (event, context, callback) => {
  postHandler(checkVerificationHandler, event, context, callback);
};
module.exports.instance_fuel = (event, context, callback) => {
  postHandler(instanceFuelHandler, event, context, callback);
};

const postHandler = (handler, event, context, callback) => {
  if (
    !recaptchaMgr.isSecretsSet() ||
    !funcaptchaMgr.isSecretsSet() ||
    !authMgr.isSecretsSet() ||
    !fuelTokenMgr.isSecretsSet() ||
    !phoneVerificationMgr.isSecretsSet() ||
    !instanceVerificationMgr.isSecretsSet()
  ) {
    const kms = new AWS.KMS();
    kms
      .decrypt({
        CiphertextBlob: Buffer(process.env.SECRETS, "base64")
      })
      .promise()
      .then(data => {
        const decrypted = String(data.Plaintext);
        recaptchaMgr.setSecrets(JSON.parse(decrypted));
        funcaptchaMgr.setSecrets(JSON.parse(decrypted));
        authMgr.setSecrets(JSON.parse(decrypted));
        fuelTokenMgr.setSecrets(JSON.parse(decrypted));
        phoneVerificationMgr.setSecrets(JSON.parse(decrypted));
        instanceVerificationMgr.setSecrets(JSON.parse(decrypted));
        doHandler(handler, event, context, callback);
      });
  } else {
    doHandler(handler, event, context, callback);
  }
};

const doHandler = (handler, event, context, callback) => {
  handler.handle(event, context, (err, resp) => {
    let response;
    if (err == null) {
      response = {
        statusCode: 200,
        body: JSON.stringify({
          status: "success",
          data: resp
        })
      };
    } else {
      //console.log(err);
      let code = 500;
      if (err.code) code = err.code;
      let message = err;
      if (err.message) message = err.message;

      response = {
        statusCode: code,
        body: JSON.stringify({
          status: "error",
          message: message
        })
      };
    }

    callback(null, response);
  });
};

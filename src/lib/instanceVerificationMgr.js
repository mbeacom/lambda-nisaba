import rp from "request-promise"
import resolve from 'did-resolver'

class InstanceVerificationMgr {
    constructor() {
      this.google_api_key = null;
      this.google_project_id = null;
    }

    setSecrets(secrets) {
        this.google_api_key = secrets.GOOGLE_API_KEY;
        this.google_project_id = secrets.GOOGLE_PROJECT_ID;
    }

    isSecretsSet() {
        return (
            this.google_api_key !== null &&
            this.google_project_id !== null
          )
    }

    //an example token detail:
    // {
    //     "applicationVersion": "1",
    //     "connectDate": "2018-04-20",
    //     "attestStatus": "UNKNOWN",
    //     "application": "com.example.iid.test",
    //     "scope": "somedAppMnid",
    //     "authorizedEntity": "856113207441",
    //     "connectionType": "MOBILE",
    //     "appSigner": "81bca393436fb4d743af862779ce7aaaf94696e2",
    //     "platform": "ANDROID"
    // }

    async getInstanceTokenDetails(instanceToken) {
        if (!instanceToken) throw "missing instance token"

        var iid_options = {
            uri: `https://iid.googleapis.com/iid/info/${instanceToken}?details=true`,
            method: 'GET',
            headers: {
                'Authorization': `key=${this.google_api_key}`
            },
            json: true
        }

        let resp = await rp(iid_options);
        return resp;
    }

    async checkInstanceDetails(iid_resp) {
        if (iid_resp.authorizedEntity !== this.google_project_id.toString()) {
            throw "token is generated for a different entity. Only uPort SDK instance tokens accepted."
        }
        var dAppMnid = iid_resp.scope // to be used for rate limiting
        var dAppDDO = this.getDappDetails(dAppMnid)
        // ANDROID or IOS
        var platform = iid_resp.platform

        //this is the applicationId for ANDROID and bundleId for iOS
        // this should be checked against the corresponding field in the dApp doc from IPFS
        var appId = iid_resp.application

        //this is the fingerprint of the android signature.
        // this field should be checked against the list of fingerprints from the dApp doc from IPFS
        var appFingerprint = iid_resp.appSigner

        //TODO: after appmanager fields are added, uncomment the actual checks
        // if (platform.toLowercase() === "android") {
        //     if (dAppDDO.appId !== appId) {
        //         throw "the dApp is not registered for fueling"
        //     }
        //     if (dAppDDO.fingerprints.indexOf(appFingerprint) == -1) {
        //         throw "the dApp signature fingerprint does not match"
        //     }
        // } else if (platform.toLowercase() === "ios") {
        //     if (dAppDDO.bundleId !== appId) {
        //         throw "the dApp is not registered for fueling"
        //     }
        // }
        
        return true
    }

    async getDappDetails(dAppMnid) {
        var ddo = await resolve(`did:uport:${dAppMnid}`)
        //TODO: extract relevant fields from did doc
        //TODO: convert fingerprints to simple form (lowercase, without the colons)
    }

/**
 * example dApp DDO, what's needed is `bundleId` for iOS and `appId` and `fingerprints` for android:
 * 
 * {
 *      '@context': 'https://w3id...',
 *      id: 'did:uport:2p1yWK...',
 *      uPortProfile: {
 *          ...
 * 
 *          appId : "com.uportMobile.iid.test",
 *          bundleId : "me.uport.iid.test",
 *          fingerprints : [
 *               // fingerprint can heve 2 forms
 *              "81bca393436fb4d743af862779ce7aaaf94696e2",
 *              "81:BC:A3:93:43:6F:B4:D7:43:AF:86:27:79:CE:7A:AA:F9:46:96:E2"
 *          ]
 * 
 *      }
 * 
 */

}

module.exports = InstanceVerificationMgr;
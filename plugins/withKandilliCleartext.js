/**
 * Kandilli "son depremler" sayfası yalnızca HTTP üzerinden yayımlanıyor.
 * Genel düz metin trafiğini açmak yerine YALNIZCA bu alan adına istisna tanınır:
 *  - iOS: NSAppTransportSecurity → NSExceptionDomains
 *  - Android: network_security_config.xml (domain-config)
 * Üretimde önerilen: Kandilli verisini sunucu tarafında (ingest-earthquakes) alıp
 * istemciye HTTPS ile sunmak ve bu eklentiyi kaldırmak.
 */
const { withInfoPlist, withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const DOMAIN = 'koeri.boun.edu.tr';

const XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">${DOMAIN}</domain>
  </domain-config>
  <debug-overrides>
    <trust-anchors><certificates src="user" /></trust-anchors>
  </debug-overrides>
</network-security-config>
`;

module.exports = function withKandilliCleartext(config) {
  config = withInfoPlist(config, (c) => {
    const ats = c.modResults.NSAppTransportSecurity ?? {};
    ats.NSExceptionDomains = {
      ...(ats.NSExceptionDomains ?? {}),
      [DOMAIN]: { NSIncludesSubdomains: true, NSExceptionAllowsInsecureHTTPLoads: true },
    };
    c.modResults.NSAppTransportSecurity = ats;
    return c;
  });
  config = withDangerousMod(config, [
    'android',
    async (c) => {
      const dir = path.join(c.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'network_security_config.xml'), XML);
      return c;
    },
  ]);
  config = withAndroidManifest(config, (c) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return c;
  });
  return config;
};

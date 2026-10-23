import { Alert, Linking } from 'react-native';

/** 112'yi telefonun arama ekranında açar; aramanın yapıldığını iddia etmez, açılamazsa söyler. */
export function call112() {
  Linking.openURL('tel:112').catch(() =>
    Alert.alert('Arama ekranı açılamadı', 'Bu cihaz telefon araması yapamıyor olabilir. Telefonunuzun tuş takımından 112’yi arayın.'),
  );
}

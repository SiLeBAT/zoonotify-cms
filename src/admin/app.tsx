//@ts-ignore
import Logo from './extensions/bfr_logo.png';
//@ts-ignore
import favicon from './extensions/favicon.ico';

export default {
  config: {
    locales: [
      // 'ar',
      // 'fr',
      // 'cs',
      // 'de',
      // 'dk',
      // 'es',
      // 'he',
      // 'id',
      // 'it',
      // 'ja',
      // 'ko',
      // 'ms',
      // 'nl',
      // 'no',
      // 'pl',
      // 'pt-BR',
      // 'pt',
      // 'ru',
      // 'sk',
      // 'sv',
      // 'th',
      // 'tr',
      // 'uk',
      // 'vi',
      // 'zh-Hans',
      // 'zh',
    ],
    auth:{
      logo:Logo
    },
    head:{
      favicon:favicon
    },
    menu:{
      logo:Logo
    },
  },
  bootstrap(app) {
    console.log(app);
  },
};

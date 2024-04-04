
export default ({ env }) => ({
  documentation: {
    enabled: true,
    config: {
      info: {
        version: '2.1.0',
        title: 'Zoonotify API Documentation',
        description: '',
        termsOfService: '',
        contact: {
          name: 'Zoonotify Team',
          email: 'zoonotify-supportl@bfr.bund.de',
          url: 'https://zoonotify.bfr.berlin'
        },
        license: {
          name: "CC BY 4.0 license",
          url: "https://www.tldrlegal.com/license/creative-commons-attribution-4-0-international-cc-by-4"
        },
      },
      externalDocs: {
        description: '',
        url: ''
      },
      security: [{ bearerAuth: [] }],
      "x-strapi-config": {
        plugins: [],
      },
    },
  },
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST'),
        port: env('SMTP_PORT'),
        secure: true,
        auth: {
          user: env('SMTP_USER'),
          pass: env('SMTP_PASSWORD'),
        },
      },
      settings: {
        defaultFrom: env('SMTP_FROM'),
        defaultReplyTo: env('SMTP_REPLY_TO')
      },
    }
  },
});
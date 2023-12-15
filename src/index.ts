export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) { },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    const fs = require('fs');
    let path = require('path');
    let filePath = path.join(__dirname, '../../data/data.xlsx');
    let outFilePath = path.join(__dirname, '../../data/import-result.json');

    if (fs.existsSync(filePath) && !fs.existsSync(outFilePath)) {
      let ctx = {
        request: {
          files: {
            file: {
              path: filePath
            }
          }
        }
      };

      const data = await strapi
        .service("api::isolate.isolate")
        .import(ctx);

      fs.unlink(filePath, function (err) {

      });

      let dataLog = {
        "Total Records": data.length,
        "Successfully Saved": 0,
        Failures: []
      }

      if (data) {
        let failures = data.filter((result) => {
          return result.statusCode == 500;
        });

        let success = data.filter((result) => {
          return result.statusCode == 200;
        });

        dataLog["Successfully Saved"] = success.length;
        dataLog.Failures = failures;
      }

      var stream = fs.createWriteStream(outFilePath);
      stream.once('open', function (fd) {
        stream.write(JSON.stringify(dataLog));
        stream.end();
      });

    }
  }
};

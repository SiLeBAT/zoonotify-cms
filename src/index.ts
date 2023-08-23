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
   * 
   * Uncomment below code to add some records to the collection
   * 
   */
  // bootstrap(/*{ strapi }*/) {},
  async bootstrap({ strapi }) {

    // const fs = require('fs');
    // const JSONStream = require("JSONStream");
    // const es = require("event-stream");
    // try {
    //   console.time('Execution Time');

    //   var fileStream = fs.createReadStream("./data/zooData.json", { encoding: "utf8" });
    //   fileStream.pipe(JSONStream.parse("rows.*")).pipe(
    //     es.through(async function (data) {
    //       this.pause();
    //       await processOneRecord(data, this);
    //       return data;
    //     }),
    //     function end() {
    //       console.timeEnd('Execution Time');
    //       console.log("stream reading ended");
    //       this.emit("end");
    //     }
    //   );
    // } catch (err) {
    //   console.log(err);
    //   return;
    // }

    // await strapi.db.query('api::zoonotify.zoonotify').update(
    //   {
    //     where: { published_at: null },
    //     data: {
    //       published_at: new Date().toISOString()
    //     },
    //   });


    async function processOneRecord(data, es) {
      var newRec = {};

      Object.keys(data).forEach((entry) => {
        var key = entry.replace(/\s+/g, '_');
        key = key.replace(/\//g, '_');
        key = key.replace(/\./g, '_');
        key = key.replace(/\-/g, '_');
        newRec[key] = data[entry] ? data[entry].toString() : "";

      });

      await strapi.entityService.create('api::zoonotify.zoonotify', {
        data: newRec
      });
      es.resume();
    }
  }
};

import { importCutOffData } from './data_import/cut-off.import';
import fileLifecycles from './extensions/upload/content-types/file/lifecycles';







export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {

    strapi.contentTypes['plugin::upload.file'].lifecycles = fileLifecycles;
    console.log('[DEBUG] File lifecycles registered.');

  },



  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    console.log('[DEBUG] Running bootstrap logic.');

    // Cut-off (resistance-table) is the only collection still imported on boot.
    // Every other xlsx-managed collection is now owned by the external Import
    // CLI (see ADR 0006). The call is wrapped so a missing or malformed
    // cutoff-data.xlsx logs a warning instead of wedging CMS startup.
    try {
      await importCutOffData(strapi);
    } catch (error) {
      console.warn(
        '[WARN] Cut-off bootstrap import failed; CMS will continue to boot:',
        error?.message ?? error
      );
    }
  }

};
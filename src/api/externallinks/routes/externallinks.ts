//import { Application } from 'express';
//import { factories } from '@strapi/strapi'; // Import factories

//module.exports = (app: Application) => {
  // Define routes for the "external-links" collection
  //app.route('/external-links')
 //   .get('external-links.find' as any) // Specify the type explicitly
 //  .post('external-links.create' as any); // Specify the type explicitly

  //pp.route('/external-links/:id')
   // .get('external-links.findOne' as any) // Specify the type explicitly
   // .put('external-links.update' as any) // Specify the type explicitly
   // .delete('external-links.delete' as any); // Specify the type explicitly

  // Create the core router for "external-links" (add this part)
  //factories.createCoreRouter('api::external-links.external-links')(app);
//};

/**
 * externallinks router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::externallinks.externallinks');
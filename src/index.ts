import { importControlledVocabularyTranslations } from './data_import/controlled-vocab-translations.import';
import { importCutOffData } from './data_import/cut-off.import';
import { importMatrixDetails } from './data_import/matrix-detail.import';
import { importMatrixGroups } from './data_import/matrix-group.import';
import { importMatrix } from './data_import/matrix.import';
import { importMicroorganisms } from './data_import/microorganism.import';
import { importPrevalences } from './data_import/prevalence.import';
import { importResistances } from './data_import/importResistances';
//import { importResistanceData } from './data_import/resistance.import';
import { importSampleOrigins } from './data_import/sample-origin.import';
import { importSampleTypes } from './data_import/sample-type.import';
import { importSamplingStages } from './data_import/sampling-stage.import';
import { importSuperCategorySampleOrigins } from './data_import/super-category-sample-origin.import';
//mport { updateGraphs } from './data_import/updateGraphs';
import { importExternalLinks } from './data_import/importExternalLinks';
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
    if (strapi.plugin('documentation')) {
      const override = {
        info: { version: '2.2.0' },
        paths: {
          "/evaluations": {
            "get": {
              "responses": {
                "200": {
                  "description": "OK",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/EvaluationListResponse"
                      }
                    }
                  }
                },
                "400": {
                  "description": "Bad Request",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "401": {
                  "description": "Unauthorized",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "403": {
                  "description": "Forbidden",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "404": {
                  "description": "Not Found",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "500": {
                  "description": "Internal Server Error",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                }
              },
              "tags": [
                "Evaluation"
              ],
              "parameters": [
                {
                  "name": "sort",
                  "in": "query",
                  "description": "Sort by attributes ascending (asc) or descending (desc)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "pagination[withCount]",
                  "in": "query",
                  "description": "Return page/pageSize (default: true)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "boolean"
                  }
                },
                {
                  "name": "pagination[page]",
                  "in": "query",
                  "description": "Page number (default: 0)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[pageSize]",
                  "in": "query",
                  "description": "Page size (default: 25)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[start]",
                  "in": "query",
                  "description": "Offset value (default: 0)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[limit]",
                  "in": "query",
                  "description": "Number of entities to return (default: 25)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "fields",
                  "in": "query",
                  "description": "Fields to return (ex: title,author)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "populate",
                  "in": "query",
                  "description": "Relations to return",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "filters",
                  "in": "query",
                  "description": "Filters to apply",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "object"
                  },
                  "style": "deepObject"
                },
                {
                  "name": "locale",
                  "in": "query",
                  "description": "Locale to apply",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                }
              ],
              "operationId": "get/evaluations"
            }
          },
          "/evaluations/{id}": {
            "get": {
              "responses": {
                "200": {
                  "description": "OK",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/EvaluationResponse"
                      }
                    }
                  }
                },
                "400": {
                  "description": "Bad Request",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "401": {
                  "description": "Unauthorized",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "403": {
                  "description": "Forbidden",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "404": {
                  "description": "Not Found",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "500": {
                  "description": "Internal Server Error",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                }
              },
              "tags": [
                "Evaluation"
              ],
              "parameters": [
                {
                  "name": "id",
                  "in": "path",
                  "description": "",
                  "deprecated": false,
                  "required": true,
                  "schema": {
                    "type": "number"
                  }
                }
              ],
              "operationId": "get/evaluations/{id}"
            }
          },
          "/evaluations/{id}/localizations": {},
          "/informations": {
            "get": {
              "responses": {
                "200": {
                  "description": "OK",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/InformationListResponse"
                      }
                    }
                  }
                },
                "400": {
                  "description": "Bad Request",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "401": {
                  "description": "Unauthorized",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "403": {
                  "description": "Forbidden",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "404": {
                  "description": "Not Found",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "500": {
                  "description": "Internal Server Error",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                }
              },
              "tags": [
                "Information"
              ],
              "parameters": [
                {
                  "name": "sort",
                  "in": "query",
                  "description": "Sort by attributes ascending (asc) or descending (desc)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "pagination[withCount]",
                  "in": "query",
                  "description": "Return page/pageSize (default: true)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "boolean"
                  }
                },
                {
                  "name": "pagination[page]",
                  "in": "query",
                  "description": "Page number (default: 0)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[pageSize]",
                  "in": "query",
                  "description": "Page size (default: 25)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[start]",
                  "in": "query",
                  "description": "Offset value (default: 0)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[limit]",
                  "in": "query",
                  "description": "Number of entities to return (default: 25)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "fields",
                  "in": "query",
                  "description": "Fields to return (ex: title,author)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "populate",
                  "in": "query",
                  "description": "Relations to return",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "filters",
                  "in": "query",
                  "description": "Filters to apply",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "object"
                  },
                  "style": "deepObject"
                },
                {
                  "name": "locale",
                  "in": "query",
                  "description": "Locale to apply",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                }
              ],
              "operationId": "get/informations"
            }
          },
          "/informations/{id}": {
            "get": {
              "responses": {
                "200": {
                  "description": "OK",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/InformationResponse"
                      }
                    }
                  }
                },
                "400": {
                  "description": "Bad Request",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "401": {
                  "description": "Unauthorized",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "403": {
                  "description": "Forbidden",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "404": {
                  "description": "Not Found",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "500": {
                  "description": "Internal Server Error",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                }
              },
              "tags": [
                "Information"
              ],
              "parameters": [
                {
                  "name": "id",
                  "in": "path",
                  "description": "",
                  "deprecated": false,
                  "required": true,
                  "schema": {
                    "type": "number"
                  }
                }
              ],
              "operationId": "get/informations/{id}"
            }
          },
          "/informations/{id}/localizations": {},
          "/prevalences": {
            "get": {
              "responses": {
                "200": {
                  "description": "OK",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/PrevalenceListResponse"
                      }
                    }
                  }
                },
                "400": {
                  "description": "Bad Request",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "401": {
                  "description": "Unauthorized",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "403": {
                  "description": "Forbidden",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "404": {
                  "description": "Not Found",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "500": {
                  "description": "Internal Server Error",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                }
              },
              "tags": [
                "Prevalence"
              ],
              "parameters": [
                {
                  "name": "sort",
                  "in": "query",
                  "description": "Sort by attributes ascending (asc) or descending (desc)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "pagination[withCount]",
                  "in": "query",
                  "description": "Return page/pageSize (default: true)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "boolean"
                  }
                },
                {
                  "name": "pagination[page]",
                  "in": "query",
                  "description": "Page number (default: 0)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[pageSize]",
                  "in": "query",
                  "description": "Page size (default: 25)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[start]",
                  "in": "query",
                  "description": "Offset value (default: 0)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[limit]",
                  "in": "query",
                  "description": "Number of entities to return (default: 25)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "fields",
                  "in": "query",
                  "description": "Fields to return (ex: title,author)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "populate",
                  "in": "query",
                  "description": "Relations to return",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "filters",
                  "in": "query",
                  "description": "Filters to apply",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "object"
                  },
                  "style": "deepObject"
                },
                {
                  "name": "locale",
                  "in": "query",
                  "description": "Locale to apply",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                }
              ],
              "operationId": "get/prevalences"
            }
          },
          "/prevalences/{id}": {
            "get": {
              "responses": {
                "200": {
                  "description": "OK",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/PrevalenceResponse"
                      }
                    }
                  }
                },
                "400": {
                  "description": "Bad Request",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "401": {
                  "description": "Unauthorized",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "403": {
                  "description": "Forbidden",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "404": {
                  "description": "Not Found",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "500": {
                  "description": "Internal Server Error",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                }
              },
              "tags": [
                "Prevalence"
              ],
              "parameters": [
                {
                  "name": "id",
                  "in": "path",
                  "description": "",
                  "deprecated": false,
                  "required": true,
                  "schema": {
                    "type": "number"
                  }
                }
              ],
              "operationId": "get/prevalences/{id}"
            }
          },
          "/welcome": {
            "get": {
              "responses": {
                "200": {
                  "description": "OK",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/WelcomeResponse"
                      }
                    }
                  }
                },
                "400": {
                  "description": "Bad Request",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "401": {
                  "description": "Unauthorized",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "403": {
                  "description": "Forbidden",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "404": {
                  "description": "Not Found",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "500": {
                  "description": "Internal Server Error",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                }
              },
              "tags": [
                "Welcome"
              ],
              "parameters": [
                {
                  "name": "sort",
                  "in": "query",
                  "description": "Sort by attributes ascending (asc) or descending (desc)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "pagination[withCount]",
                  "in": "query",
                  "description": "Return page/pageSize (default: true)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "boolean"
                  }
                },
                {
                  "name": "pagination[page]",
                  "in": "query",
                  "description": "Page number (default: 0)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[pageSize]",
                  "in": "query",
                  "description": "Page size (default: 25)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[start]",
                  "in": "query",
                  "description": "Offset value (default: 0)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[limit]",
                  "in": "query",
                  "description": "Number of entities to return (default: 25)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "fields",
                  "in": "query",
                  "description": "Fields to return (ex: title,author)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "populate",
                  "in": "query",
                  "description": "Relations to return",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "filters",
                  "in": "query",
                  "description": "Filters to apply",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "object"
                  },
                  "style": "deepObject"
                },
                {
                  "name": "locale",
                  "in": "query",
                  "description": "Locale to apply",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                }
              ],
              "operationId": "get/welcome"
            }
          }
        }
      }

      

      strapi
        .plugin('documentation')
        .service('override')
        .registerOverride(override, {
          excludeFromGeneration: [
            "evaluations",
            "prevalences",
            "informations",
            "super-category-sample-origin",
            "matrix-group",
            "sample-origin",
            "welcome",
            "antibiotic",
            "isolate",
            "matrix",
            "microorganism",
            "salmonella",
            "animal-species-food-category",
            "animal-species-production-type-food",
            "configuration",
            "controlled-vocabulary",
            "data-protection-declaration",
            "evaluation-information",
            "explanation",
            "externallink",
            "matrix-detail",
            "resistance-table",
            "sample-type",
            "sampling-context",
            "sampling-stage",]
        });
    }

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
    // Import data for LD
    //await importResistanceData(strapi);

    // Import data for yearly cutt-off
    await importCutOffData(strapi);

    // Import data for prevalence
    await importPrevalences(strapi);
    await importMatrixGroups(strapi);
    await importSampleTypes(strapi);
    await importSamplingStages(strapi);
    await importMatrixDetails(strapi);
    await importSampleOrigins(strapi);
    await importSuperCategorySampleOrigins(strapi);
    await importMicroorganisms(strapi);
    await importMatrix(strapi);
    //await updateGraphs(strapi);
    await importExternalLinks(strapi); 
  //await importAndCleanupResistances(strapi);
  await importResistances(strapi);



    // Add this line to call your new import function
    await importControlledVocabularyTranslations(strapi);

  }

};
import { importControlledVocabularyTranslations } from './data_import/controlled-vocab-translations.import';
import { importCutOffData } from './data_import/cut-off.import';
import { importPrevalenceData } from './data_import/prevalence.import';
import { importResistanceData } from './data_import/resistance.import';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    if (strapi.plugin('documentation')) {
      const override = {
        info: { version: '2.1.0' },
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
          "/evaluations/{id}/localizations": {
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
            },
          },
          "/welcome/localizations": {
          }
        }
      }

      strapi
        .plugin('documentation')
        .service('override')
        .registerOverride(override, {
          excludeFromGeneration: [
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
            "prevalence",
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
    // Import data for LD
    await importResistanceData(strapi);

    // Import data for yearly cutt-off
    await importCutOffData(strapi);

    // Import data for prevalence
    await importPrevalenceData(strapi);

    // Add this line to call your new import function
    await importControlledVocabularyTranslations(strapi);

  }

};
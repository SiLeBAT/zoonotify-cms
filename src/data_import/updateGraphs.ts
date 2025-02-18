import fs from 'fs';
import path from 'path';
import { Strapi } from '@strapi/strapi';

interface FileEntity {
  id: number;
  name: string;
}

// The Evaluation interface now reflects that 'diagram' is the media field.
// The schema shows 'diagram' as a required single media field with 'images' allowedTypes.
// We assume it returns a structure similar to FileEntity when populated.
interface Evaluation {
  id: number;
  diagram?: FileEntity;
}

interface ImportFailure {
  evaluationId?: number;
  error: string;
}

interface ImportLog {
  totalEntries: number;
  updatedEntries: number;
  unchangedEntries: number;
  failures: ImportFailure[];
}

export async function updateGraphs(strapi: Strapi): Promise<void> {
  const outFilePath = path.join(__dirname, '../../../data/graph-update-result.json');

  const importLog: ImportLog = {
    totalEntries: 0,
    updatedEntries: 0,
    unchangedEntries: 0,
    failures: []
  };

  console.log('Starting updateGraphs...');

  try {
    // 1. Fetch updated diagrams from the "Updated Graphs" folder
    const updatedDiagrams = (await strapi.entityService.findMany('plugin::upload.file', {
      filters: { folder: { name: 'Updated Graphs' } },
      fields: ['id', 'name']
    })) as FileEntity[];

    const updatedDiagramMap: Record<string, number> = {};
    for (const file of updatedDiagrams) {
      // Extract the base name without extension
      const diagramName = path.parse(file.name).name;
      updatedDiagramMap[diagramName] = file.id;
    }

    // 2. Fetch all evaluations with diagram populated
    const evaluations = (await strapi.entityService.findMany('api::evaluation.evaluation', {
      filters: {},
      populate: { diagram: true }
    })) as Evaluation[];

    importLog.totalEntries = evaluations.length;

    // 3. Update evaluations if a matching updated diagram exists
    for (const evaluation of evaluations) {
      try {
        const oldDiagram = evaluation.diagram;
        if (!oldDiagram) {
          // If for some reason it's missing (even though required), skip
          importLog.unchangedEntries++;
          continue;
        }

        const oldDiagramName = path.parse(oldDiagram.name).name;
        const newDiagramId = updatedDiagramMap[oldDiagramName];

        if (newDiagramId) {
          // Update the evaluation with the new diagram file ID
          await strapi.entityService.update('api::evaluation.evaluation', evaluation.id, {
            data: { diagram: newDiagramId } as any // Casting to any, due to TS strictness
          });
          importLog.updatedEntries++;
        } else {
          importLog.unchangedEntries++;
        }
      } catch (error: any) {
        console.error(`Error updating evaluation ${evaluation.id}:`, error);
        importLog.failures.push({ evaluationId: evaluation.id, error: error.message });
      }
    }

    fs.mkdirSync(path.join(__dirname, '../../data'), { recursive: true });
    fs.writeFileSync(outFilePath, JSON.stringify(importLog, null, 2));

    console.log('Finished updateGraphs. Summary:', importLog);
  } catch (error: any) {
    console.error('Error in updateGraphs script:', error);
    importLog.failures.push({ error: error.message });
    fs.mkdirSync(path.join(__dirname, '../../data'), { recursive: true });
    fs.writeFileSync(outFilePath, JSON.stringify(importLog, null, 2));
  }
}

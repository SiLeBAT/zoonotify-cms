
import fs from 'fs';
import path from 'path';
// Import the Strapi type from the core definitions.
import type { Strapi as StrapiType } from '@strapi/types/dist/core';

interface FileEntity {
  id: number;
  name: string;
}

// The Evaluation interface reflects that 'diagram' is the media field.
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

export async function updateGraphs(strapi: StrapiType): Promise<void> {
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
    const updatedDiagrams = (await strapi.documents('plugin::upload.file').findMany({
      filters: { folder: { name: 'Updated Graphs' } },
      fields: ['id', 'name']
    })) as unknown as FileEntity[];

    const updatedDiagramMap: Record<string, number> = {};
    for (const file of updatedDiagrams) {
      // Extract the base name without extension
      const diagramName = path.parse(file.name).name;
      updatedDiagramMap[diagramName] = file.id;
    }

    // 2. Fetch all evaluations with diagram populated
    const evaluations = (await strapi.documents('api::evaluation.evaluation').findMany({
      filters: {},
      populate: { diagram: true }
    })) as unknown as Evaluation[];

    importLog.totalEntries = evaluations.length;

    // 3. Update evaluations if a matching updated diagram exists
    for (const evaluation of evaluations) {
      try {
        const oldDiagram = evaluation.diagram;
        if (!oldDiagram) {
          // If diagram is missing (even though required), skip updating.
          importLog.unchangedEntries++;
          continue;
        }

        const oldDiagramName = path.parse(oldDiagram.name).name;
        const newDiagramId = updatedDiagramMap[oldDiagramName];

        if (newDiagramId) {
          // Update the evaluation with the new diagram file ID.
          // Convert evaluation.id (number) to string for documentId.
          await strapi.documents('api::evaluation.evaluation').update({
            documentId: evaluation.id.toString(),
            data: { diagram: newDiagramId } as any
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

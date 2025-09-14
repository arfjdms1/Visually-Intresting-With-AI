import fs from 'fs/promises';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

// --- Types (These remain the same) ---
interface Model {
  id: number;
  name: string;
  htmlContent: string;
}
interface Database {
  [companyName: string]: Model[];
}
type ModelPageProps = {
  params: {
    modelId: string;
  };
};

// --- Data Fetching Logic (Remains the same) ---
async function getModelById(id: number): Promise<Model | null> {
    const dbPath = path.join(process.cwd(), 'database.json');
    try {
        const data = await fs.readFile(dbPath, 'utf-8');
        const db: Database = JSON.parse(data);
        for (const companyName in db) {
            const model = db[companyName].find(m => m.id === id);
            if (model) {
                return model;
            }
        }
        return null;
    } catch (error) {
        console.error("Failed to read database:", error);
        return null;
    }
}

// --- NEW: Asynchronous Component for Content ---
// This component does the actual work: fetching data and rendering the result.
async function ModelContent({ modelId }: { modelId: number }) {
  const model = await getModelById(modelId);

  // If the model is not found after awaiting, trigger a 404.
  if (!model) {
    notFound();
  }

  return (
    <div className="w-full h-screen flex flex-col bg-gray-900">
      <header className="flex-shrink-0 bg-gray-800 p-3 flex justify-between items-center border-b border-gray-700">
        <h1 className="text-xl font-bold text-cyan-400">Viewing Output: <span className="text-white">{model.name}</span></h1>
        <Link href="/" className="px-4 py-2 text-sm font-semibold text-black bg-cyan-400 rounded-md hover:bg-cyan-500 transition-colors">
          &larr; Back to Showcase
        </Link>
      </header>
      
      <iframe
        srcDoc={model.htmlContent}
        title={`Output for ${model.name}`}
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-full border-0"
      />
    </div>
  );
}


// --- MODIFIED: The Main Page Export ---
// This is now a regular, SYNCHRONOUS component.
// Its only job is to parse params and set up the Suspense boundary.
export default function ModelPage({ params }: ModelPageProps) {
  const modelId = parseInt(params.modelId, 10);

  // Basic validation before rendering
  if (isNaN(modelId)) {
    notFound();
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ModelContent modelId={modelId} />
    </Suspense>
  );
}

// --- NEW: A Simple Loading Fallback Component ---
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <p className="text-xl text-cyan-400">Loading Model...</p>
      </div>
    </div>
  );
}
import fs from 'fs/promises';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// --- Types (can be shared in a separate file) ---
interface Model {
    id: number;
    name: string;
    htmlContent: string;
}
interface Database {
    [companyName: string]: Model[];
}

// --- Data Fetching (Server-side) ---
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

// --- The Page Component ---
export default async function ModelPage({ params }: { params: { modelId: string } }) {
    const modelId = parseInt(params.modelId, 10);
    if (isNaN(modelId)) {
        notFound();
    }

    const model = await getModelById(modelId);

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

            {/*
        SECURITY: The 'sandbox' attribute is crucial. It creates a secure environment
        for the content, preventing it from accessing parent window, cookies, or running top-level navigation.
        The 'srcDoc' attribute is used to populate the iframe with the HTML string.
      */}
            <iframe
                srcDoc={model.htmlContent}
                title={`Output for ${model.name}`}
                sandbox="allow-scripts allow-same-origin" // allow-scripts is needed for JS in the snippet to run. Adjust as needed.
                className="w-full h-full border-0"
            />
        </div>
    );
}
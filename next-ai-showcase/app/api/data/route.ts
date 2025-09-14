import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Define the structure of our data
interface Model {
    id: number;
    name: string;
    htmlContent: string;
}

interface Database {
    [companyName: string]: Model[];
}

const dbPath = path.join(process.cwd(), 'database.json');

// Helper function to read data from the JSON file
async function readData(): Promise<Database> {
    try {
        const data = await fs.readFile(dbPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return an empty object
        return {};
    }
}

// Helper function to write data to the JSON file
async function writeData(data: Database): Promise<void> {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

// --- API Route Handlers ---

// GET /api/data - Fetches all data
export async function GET() {
    const data = await readData();
    return NextResponse.json(data);
}

// POST /api/data - Handles creating companies and models
export async function POST(request: Request) {
    const body = await request.json();
    const { action, companyName, modelName, htmlContent } = body;
    const data = await readData();

    if (action === 'addCompany') {
        if (!companyName || data[companyName]) {
            return NextResponse.json({ message: 'Invalid or existing company name' }, { status: 400 });
        }
        data[companyName] = [];
        await writeData(data);
        return NextResponse.json({ message: 'Company created' }, { status: 201 });
    }

    if (action === 'addModel') {
        if (!companyName || !data[companyName] || !modelName || !htmlContent) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }
        const newModel: Model = {
            id: Date.now(),
            name: modelName,
            htmlContent: htmlContent,
        };
        data[companyName].push(newModel);
        await writeData(data);
        return NextResponse.json(newModel, { status: 201 });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
}

// DELETE /api/data - Handles deleting a model
export async function DELETE(request: Request) {
    const body = await request.json();
    const { companyName, modelId } = body;

    if (!companyName || !modelId) {
        return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const data = await readData();
    if (!data[companyName]) {
        return NextResponse.json({ message: 'Company not found' }, { status: 404 });
    }

    const initialLength = data[companyName].length;
    data[companyName] = data[companyName].filter(model => model.id !== modelId);

    if (data[companyName].length === initialLength) {
        return NextResponse.json({ message: 'Model not found' }, { status: 404 });
    }

    await writeData(data);
    return NextResponse.json({ message: 'Model deleted' }, { status: 200 });
}